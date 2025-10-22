import "dotenv/config";
import cors from "cors";
import express, {
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { auth } from "@my-better-t-app/auth";
import { toNodeHandler } from "better-auth/node";
import prisma from "@my-better-t-app/db";
import { Resend } from "resend";
import crypto from "crypto";
import { hashPassword } from "better-auth/crypto";

const app = express();

// Debug: Log database URL being used
console.log("=".repeat(50));
console.log("🔍 DATABASE_URL:", process.env.DATABASE_URL);
console.log("🔍 Server starting with database:", process.env.DATABASE_URL);
console.log("=".repeat(50));

// Apply JSON parsing to all routes EXCEPT webhooks
app.use((req, res, next) => {
  if (req.path === "/api/webhooks/polar") {
    // Skip JSON parsing for webhook route (needs raw body)
    next();
  } else {
    express.json()(req, res, next);
  }
});

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);
console.log(
  "🔑 RESEND_API_KEY:",
  process.env.RESEND_API_KEY?.slice(0, 10) || "(undefined)"
);

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// ==================== MIDDLEWARE ====================

// Auth middleware - attaches user session to request
const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  const session = await auth.api.getSession({ headers: req.headers });

  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // @ts-ignore - attach session to request
  req.user = session.user;
  // @ts-ignore
  req.session = session.session;
  next();
};

// Admin role middleware
const requireAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // @ts-ignore
  const user = req.user;

  if (!user || user.role !== "ADMIN") {
    return res.status(403).json({ error: "Forbidden - Admin access required" });
  }

  next();
};

// Organization owner middleware
const requireOwner = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // @ts-ignore
  const user = req.user;
  const organizationId =
    req.body.organizationId ||
    req.params.organizationId ||
    req.query.organizationId;

  if (!organizationId) {
    return res.status(400).json({ error: "Organization ID required" });
  }

  const member = await prisma.member.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId: user.id,
      },
    },
  });

  // Check if user has OWNER role
  if (user.role !== "OWNER") {
    return res.status(403).json({ error: "Forbidden - Owner access required" });
  }

  // @ts-ignore
  req.organizationId = organizationId;
  next();
};

// Provider middleware - checks if user is a provider
const requireProvider = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // @ts-ignore
  const user = req.user;
  const providerId = req.body.providerId || req.params.providerId;

  if (providerId) {
    const provider = await prisma.provider.findUnique({
      where: { id: providerId },
      include: { user: true },
    });

    if (!provider || provider.userId !== user.id) {
      return res.status(403).json({
        error: "Forbidden - Only the provider can perform this action",
      });
    }

    // @ts-ignore
    req.provider = provider;
  }

  next();
};

// Organization enabled middleware
const requireEnabledOrganization = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const organizationId =
    req.body.organizationId ||
    req.params.organizationId ||
    req.query.organizationId;

  if (!organizationId) {
    return res.status(400).json({ error: "Organization ID required" });
  }

  const organization = await prisma.organization.findUnique({
    where: { id: organizationId as string },
  });

  if (!organization) {
    return res.status(404).json({ error: "Organization not found" });
  }

  if (!organization.enabled) {
    return res.status(403).json({
      error:
        "Organization is not enabled. Please complete subscription to activate.",
    });
  }

  next();
};

// ==================== AUTH ROUTES ====================

// Forgot Password - Send reset email
app.post("/api/auth/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Don't reveal if user exists or not for security
      return res.json({
        message: "If the email exists, a reset link has been sent",
      });
    }

    // Generate reset token
    const resetToken = crypto.randomUUID();
    const resetExpires = new Date();
    resetExpires.setHours(resetExpires.getHours() + 1); // Expires in 1 hour

    // Store reset token in verification table
    // First, delete any existing reset tokens for this email
    await prisma.verification.deleteMany({
      where: {
        identifier: `password-reset-${email}`,
      },
    });

    // Create new reset token
    await prisma.verification.create({
      data: {
        id: crypto.randomUUID(),
        identifier: `password-reset-${email}`,
        value: resetToken,
        expiresAt: resetExpires,
      },
    });

    // Send reset email
    try {
      const resetUrl = `${
        process.env.FRONTEND_URL || "http://localhost:3001"
      }/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

      const fromEmail =
        process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
      console.log("📧 Sending password reset email to:", email);
      console.log("📧 From email:", fromEmail);
      console.log("🔗 Reset URL:", resetUrl);

      const emailResponse = await resend.emails.send({
        from: fromEmail,
        to: email,
        subject: "Password Reset Request",
        html: `
          <h2>Password Reset Request</h2>
          <p>Hello ${user.name},</p>
          <p>You requested a password reset for your account.</p>
          <p>Click the link below to reset your password:</p>
          <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #4f46e5; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request this reset, please ignore this email.</p>
        `,
      });

      console.log("✅ Password reset email sent successfully:", emailResponse);
      res.json({ message: "If the email exists, a reset link has been sent" });
    } catch (emailError) {
      console.error("❌ Failed to send reset email:", emailError);
      console.error(
        "Email error details:",
        JSON.stringify(emailError, null, 2)
      );
      console.error("Resend API Key configured:", !!process.env.RESEND_API_KEY);
      console.error(
        "Resend From Email:",
        process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev"
      );
      res.status(500).json({ error: "Failed to send reset email" });
    }
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Reset Password - Verify token and update password
app.post("/api/auth/reset-password", async (req, res) => {
  try {
    const { token, email, newPassword } = req.body;

    if (!token || !email || !newPassword) {
      return res
        .status(400)
        .json({ error: "Token, email, and new password are required" });
    }

    // Verify reset token
    const verification = await prisma.verification.findFirst({
      where: {
        identifier: `password-reset-${email}`,
        value: token,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!verification) {
      return res.status(400).json({ error: "Invalid or expired reset token" });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update user password
    await prisma.account.updateMany({
      where: {
        userId: user.id,
        providerId: "credential",
      },
      data: {
        password: hashedPassword,
        updatedAt: new Date(),
      },
    });

    // Delete the used reset token
    await prisma.verification.delete({
      where: { id: verification.id },
    });

    res.json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ==================== CUSTOM AUTH ROUTES (BEFORE BETTER AUTH) ====================

// Check if user needs password change
app.get("/api/auth/check-password-change", requireAuth, async (req, res) => {
  try {
    // @ts-ignore
    const user = req.user;

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        needsPasswordChange: true,
        email: true,
        name: true,
      },
    });

    res.json({
      needsPasswordChange: dbUser?.needsPasswordChange || false,
      user: dbUser,
    });
  } catch (error) {
    console.error("Error checking password change status:", error);
    res.status(500).json({ error: "Failed to check password status" });
  }
});

// Update password and clear needsPasswordChange flag
app.post("/api/auth/update-password", requireAuth, async (req, res) => {
  try {
    const { newPassword } = req.body;
    // @ts-ignore
    const user = req.user;

    if (!newPassword || newPassword.length < 8) {
      return res
        .status(400)
        .json({ error: "New password must be at least 8 characters" });
    }

    // Verify current password
    const account = await prisma.account.findFirst({
      where: {
        userId: user.id,
        providerId: "credential",
      },
    });

    if (!account || !account.password) {
      return res
        .status(400)
        .json({ error: "No password set for this account" });
    }

    // Hash new password using Better Auth hash
    const hashedPassword = await hashPassword(newPassword);

    // Update password
    await prisma.account.update({
      where: { id: account.id },
      data: { password: hashedPassword },
    });

    // Clear needsPasswordChange flag
    await prisma.user.update({
      where: { id: user.id },
      data: { needsPasswordChange: false },
    });

    res.json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    console.error("Error updating password:", error);
    res.status(500).json({ error: "Failed to update password" });
  }
});

// Better Auth routes with detailed logging
app.use("/api/auth", (req, res, next) => {
  console.log("🔐 Auth Request:", req.method, req.url, req.body);

  // Intercept response to log status
  const oldJson = res.json.bind(res);
  res.json = function (data: any) {
    console.log("🔐 Auth Response Status:", res.statusCode);
    if (res.statusCode >= 400) {
      console.log("❌ Auth Error Response:", data);
    }
    return oldJson(data);
  };

  next();
});

app.use("/api/auth", toNodeHandler(auth));

// ==================== PUBLIC ROUTES ====================

// Public endpoint to list organizations for signup
app.get("/api/organizations", async (_req, res) => {
  try {
    const organizations = await prisma.organization.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true,
      },
      orderBy: {
        name: "asc",
      },
    });
    res.json(organizations);
  } catch (error) {
    console.error("Error fetching organizations:", error);
    res.status(500).json({ error: "Failed to fetch organizations" });
  }
});

// ==================== ADMIN USER & ORG MANAGEMENT ====================

// Admin: Create user with temporary password
app.post("/api/admin/users", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, email, role = "USER" } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: "Name and email are required" });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res
        .status(400)
        .json({ error: "User with this email already exists" });
    }

    // Generate temporary password
    const tempPassword = Math.random().toString(36).slice(-10) + "Aa1!";

    // Create user using Better Auth
    const user = await prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        name,
        email,
        emailVerified: true,
        role: role === "USER" ? "CLIENT" : (role as any),
        needsPasswordChange: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Create account with temporary password using Better Auth hash
    const hashedPassword = await hashPassword(tempPassword);

    await prisma.account.create({
      data: {
        id: crypto.randomUUID(),
        userId: user.id,
        accountId: user.id,
        providerId: "credential",
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Send email with temporary password
    try {
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
        to: email,
        subject: "Welcome to Medisched - Your Account Created",
        html: `
          <h2>Welcome to Medisched!</h2>
          <p>Dear ${name},</p>
          <p>Your account has been created by an administrator.</p>
          
          <h3>Login Credentials:</h3>
          <ul>
            <li><strong>Email:</strong> ${email}</li>
            <li><strong>Temporary Password:</strong> ${tempPassword}</li>
          </ul>
          
          <p><strong>Important:</strong> You will be required to change your password upon first login.</p>
          
          <p>Please login at: ${
            process.env.CORS_ORIGIN || "http://localhost:3001"
          }</p>
          
          <p>Best regards,<br>Medisched Team</p>
        `,
      });
    } catch (emailError) {
      console.error("Error sending welcome email:", emailError);
    }

    res.status(201).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        needsPasswordChange: user.needsPasswordChange,
      },
      tempPassword, // Return temp password for admin to communicate
    });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ error: "Failed to create user" });
  }
});

// Admin: Create organization with owner
app.post(
  "/api/admin/organizations/create",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const { name, slug, ownerEmail, logo } = req.body;

      if (!name || !slug || !ownerEmail) {
        return res
          .status(400)
          .json({ error: "Name, slug, and ownerEmail are required" });
      }

      // Check if organization slug already exists
      const existingOrg = await prisma.organization.findUnique({
        where: { slug },
      });

      if (existingOrg) {
        return res
          .status(400)
          .json({ error: "Organization with this slug already exists" });
      }

      // Check if owner user exists by email
      const owner = await prisma.user.findUnique({
        where: { email: ownerEmail },
      });

      if (!owner) {
        return res
          .status(404)
          .json({ error: "Owner user not found with this email" });
      }

      // Create organization (disabled by default)
      const organization = await prisma.organization.create({
        data: {
          id: crypto.randomUUID(),
          name,
          slug,
          logo,
          enabled: false, // Disabled until subscription is complete
          createdAt: new Date(),
        },
      });

      // Add owner as organization member
      await prisma.member.create({
        data: {
          id: crypto.randomUUID(),
          organizationId: organization.id,
          userId: owner.id,
          email: owner.email,
          createdAt: new Date(),
        },
      });

      // Set user role to OWNER
      await prisma.user.update({
        where: { id: owner.id },
        data: { role: "OWNER" },
      });

      // Send email to owner
      try {
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
          to: owner.email,
          subject: `Organization Created: ${name}`,
          html: `
          <h2>Your Organization Has Been Created!</h2>
          <p>Dear ${owner.name},</p>
          <p>Your organization <strong>${name}</strong> has been created on Medisched.</p>
          
          <h3>Next Steps:</h3>
          <ol>
            <li>Login to your account</li>
            <li>Complete the subscription process ($10/month)</li>
            <li>Once subscribed, your organization will be activated</li>
            <li>You can then start creating departments and adding providers</li>
          </ol>
          
          <p><strong>Organization Details:</strong></p>
          <ul>
            <li><strong>Name:</strong> ${name}</li>
            <li><strong>Slug:</strong> ${slug}</li>
            <li><strong>Status:</strong> Pending Subscription</li>
          </ul>
          
          <p>Login at: ${process.env.CORS_ORIGIN || "http://localhost:3001"}</p>
          
          <p>Best regards,<br>Medisched Team</p>
        `,
        });
      } catch (emailError) {
        console.error("Error sending organization creation email:", emailError);
      }

      res.status(201).json({
        organization,
        message:
          "Organization created. Owner notified to complete subscription.",
      });
    } catch (error) {
      console.error("Error creating organization:", error);
      res.status(500).json({ error: "Failed to create organization" });
    }
  }
);

// Admin: Enable/Disable organization
app.patch(
  "/api/admin/organizations/:id/toggle",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { enabled } = req.body;

      if (typeof enabled !== "boolean") {
        return res
          .status(400)
          .json({ error: "enabled field must be a boolean" });
      }

      const organization = await prisma.organization.update({
        where: { id },
        data: { enabled },
      });

      res.json({
        organization,
        message: `Organization ${
          enabled ? "enabled" : "disabled"
        } successfully`,
      });
    } catch (error) {
      console.error("Error toggling organization:", error);
      res.status(500).json({ error: "Failed to toggle organization" });
    }
  }
);

// Get user's organizations
app.get(
  "/api/organizations/my-organizations",
  requireAuth,
  async (req, res) => {
    try {
      // @ts-ignore
      const user = req.user;

      // Find all organizations where user is a member
      const members = await prisma.member.findMany({
        where: {
          userId: user.id,
        },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
              logo: true,
              enabled: true,
              createdAt: true,
            },
          },
        },
      });

      const organizations = members.map((member) => ({
        ...member.organization,
        memberSince: member.createdAt,
      }));

      res.json(organizations);
    } catch (error) {
      console.error("Error fetching user organizations:", error);
      res.status(500).json({ error: "Failed to fetch organizations" });
    }
  }
);

// Get organization subscription status
app.get(
  "/api/organizations/:id/subscription",
  requireAuth,
  async (req, res) => {
    try {
      const { id } = req.params;
      // @ts-ignore
      const user = req.user;

      // Check if user is a member of the organization
      const member = await prisma.member.findUnique({
        where: {
          organizationId_userId: {
            organizationId: id as string,
            userId: user.id,
          },
        },
      });

      if (!member) {
        return res
          .status(403)
          .json({ error: "Forbidden - Not a member of this organization" });
      }

      const organization = await prisma.organization.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          slug: true,
          enabled: true,
          metadata: true,
        },
      });

      if (!organization) {
        return res.status(404).json({ error: "Organization not found" });
      }

      const metadata = organization.metadata
        ? JSON.parse(organization.metadata as string)
        : {};

      res.json({
        enabled: organization.enabled,
        subscriptionActive: organization.enabled,
        metadata,
        needsSubscription: !organization.enabled,
      });
    } catch (error) {
      console.error("Error fetching subscription status:", error);
      res.status(500).json({ error: "Failed to fetch subscription status" });
    }
  }
);

// ==================== DEPARTMENT ROUTES ====================

// Create department (owner only + organization must be enabled)
app.post(
  "/api/departments",
  requireAuth,
  requireOwner,
  requireEnabledOrganization,
  async (req, res) => {
    try {
      const { name, organizationId } = req.body;

      if (!name || !organizationId) {
        return res
          .status(400)
          .json({ error: "Name and organizationId are required" });
      }

      const department = await prisma.department.create({
        data: {
          id: crypto.randomUUID(),
          name,
          organizationId,
        },
      });

      res.status(201).json(department);
    } catch (error) {
      console.error("Error creating department:", error);
      res.status(500).json({ error: "Failed to create department" });
    }
  }
);

// List departments for an organization
app.get("/api/departments", requireAuth, async (req, res) => {
  try {
    const { organizationId } = req.query;

    if (!organizationId) {
      return res.status(400).json({ error: "organizationId is required" });
    }

    const departments = await prisma.department.findMany({
      where: {
        organizationId: organizationId as string,
      },
      include: {
        providers: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    res.json(departments);
  } catch (error) {
    console.error("Error fetching departments:", error);
    res.status(500).json({ error: "Failed to fetch departments" });
  }
});

// Delete department (owner only)
app.delete("/api/departments/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user is owner of the organization
    const department = await prisma.department.findUnique({
      where: { id },
    });

    if (!department) {
      return res.status(404).json({ error: "Department not found" });
    }

    // @ts-ignore
    const user = req.user;
    // Check if user has OWNER role
    if (user.role !== "OWNER") {
      return res
        .status(403)
        .json({ error: "Forbidden - Owner access required" });
    }

    await prisma.department.delete({
      where: { id },
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting department:", error);
    res.status(500).json({ error: "Failed to delete department" });
  }
});

// ==================== PROVIDER ROUTES ====================

// Assign provider role and create provider (owner only)
app.post("/api/providers", requireAuth, requireOwner, async (req, res) => {
  try {
    const { organizationId, departmentId, userId } = req.body;

    if (!organizationId || !departmentId || !userId) {
      return res.status(400).json({
        error: "organizationId, departmentId, and userId are required",
      });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if user is already a member
    let member = await prisma.member.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        },
      },
    });

    // If not a member, create membership
    if (!member) {
      member = await prisma.member.create({
        data: {
          id: crypto.randomUUID(),
          organizationId,
          userId,
          email: user.email,
          createdAt: new Date(),
        },
      });
    }

    // Set user role to PROVIDER
    await prisma.user.update({
      where: { id: userId },
      data: { role: "PROVIDER" },
    });

    // Create provider entry
    const provider = await prisma.provider.create({
      data: {
        id: crypto.randomUUID(),
        userId,
        departmentId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        department: true,
      },
    });

    res.status(201).json(provider);
  } catch (error) {
    console.error("Error creating provider:", error);
    res.status(500).json({ error: "Failed to create provider" });
  }
});

// Owner: Create provider user with temporary password
app.post(
  "/api/providers/create-user",
  requireAuth,
  requireOwner,
  async (req, res) => {
    try {
      const { name, email, organizationId, departmentId } = req.body;

      if (!name || !email || !organizationId || !departmentId) {
        return res.status(400).json({
          error: "Name, email, organizationId, and departmentId are required",
        });
      }

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return res
          .status(400)
          .json({ error: "User with this email already exists" });
      }

      // Use fixed temporary password as requested
      const tempPassword = "password123";

      // Create user with PROVIDER role
      const user = await prisma.user.create({
        data: {
          id: crypto.randomUUID(),
          name,
          email,
          emailVerified: true,
          role: "PROVIDER", // Set as PROVIDER directly
          needsPasswordChange: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Create account with temporary password using Better Auth hash
      const hashedPassword = await hashPassword(tempPassword);

      await prisma.account.create({
        data: {
          id: crypto.randomUUID(),
          userId: user.id,
          accountId: user.id,
          providerId: "credential",
          password: hashedPassword,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Add user as provider member to organization
      const member = await prisma.member.create({
        data: {
          id: crypto.randomUUID(),
          organizationId,
          userId: user.id,
          email: user.email,
          createdAt: new Date(),
        },
      });

      // Role is already set to PROVIDER in user creation above

      // Create provider entry
      const provider = await prisma.provider.create({
        data: {
          id: crypto.randomUUID(),
          userId: user.id,
          departmentId,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          department: true,
        },
      });

      // Send email with temporary password
      try {
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
          to: email,
          subject: "Welcome - Your Provider Account",
          html: `
            <h2>Welcome to the Team!</h2>
            <p>Dear ${name},</p>
            <p>Your provider account has been created.</p>
            
            <h3>Login Credentials:</h3>
            <ul>
              <li><strong>Email:</strong> ${email}</li>
              <li><strong>Temporary Password:</strong> ${tempPassword}</li>
            </ul>
            
            <p><strong>Important:</strong> You will be required to change your password upon first login.</p>
            
            <p>Please login at: ${
              process.env.CORS_ORIGIN || "http://localhost:3001"
            }</p>
            
            <p>Best regards,<br>The Team</p>
          `,
        });
      } catch (emailError) {
        console.error("Error sending provider welcome email:", emailError);
      }

      res.status(201).json({
        provider,
        tempPassword, // Return for owner to communicate if email fails
      });
    } catch (error) {
      console.error("Error creating provider user:", error);
      res.status(500).json({ error: "Failed to create provider user" });
    }
  }
);

// List all providers in an organization
app.get("/api/providers", requireAuth, async (req, res) => {
  try {
    const { organizationId, departmentId, userId } = req.query;

    // If userId is provided, get provider by userId
    if (userId) {
      const providers = await prisma.provider.findMany({
        where: {
          userId: userId as string,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
          department: {
            include: {
              organization: true,
            },
          },
        },
      });
      return res.json(providers);
    }

    if (!organizationId) {
      return res.status(400).json({ error: "organizationId is required" });
    }

    const departments = await prisma.department.findMany({
      where: {
        organizationId: organizationId as string,
        ...(departmentId && { id: departmentId as string }),
      },
      include: {
        providers: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
            department: true,
          },
        },
      },
    });

    // Flatten providers from all departments
    const providers = departments.flatMap((dept) => dept.providers);

    res.json(providers);
  } catch (error) {
    console.error("Error fetching providers:", error);
    res.status(500).json({ error: "Failed to fetch providers" });
  }
});

// Get provider by ID
app.get("/api/providers/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const provider = await prisma.provider.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        department: {
          include: {
            organization: true,
          },
        },
        events: {
          where: {
            start: {
              gte: new Date(),
            },
          },
          orderBy: {
            start: "asc",
          },
        },
      },
    });

    if (!provider) {
      return res.status(404).json({ error: "Provider not found" });
    }

    res.json(provider);
  } catch (error) {
    console.error("Error fetching provider:", error);
    res.status(500).json({ error: "Failed to fetch provider" });
  }
});

// Remove provider (owner only)
app.delete("/api/providers/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const provider = await prisma.provider.findUnique({
      where: { id },
      include: {
        department: true,
      },
    });

    if (!provider) {
      return res.status(404).json({ error: "Provider not found" });
    }

    // @ts-ignore
    const user = req.user;

    // Check if user has OWNER role
    if (user.role !== "OWNER") {
      return res
        .status(403)
        .json({ error: "Forbidden - Owner access required" });
    }

    await prisma.provider.delete({
      where: { id },
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting provider:", error);
    res.status(500).json({ error: "Failed to delete provider" });
  }
});

// ==================== EVENT ROUTES ====================

// Create event (provider only)
app.post("/api/events", requireAuth, requireProvider, async (req, res) => {
  try {
    const { providerId, title, description, start, end } = req.body;

    if (!providerId || !title || !start || !end) {
      return res
        .status(400)
        .json({ error: "providerId, title, start, and end are required" });
    }

    // Validate that event is not in the past
    const startDate = new Date(start);
    const endDate = new Date(end);
    const now = new Date();

    if (startDate < now) {
      return res.status(400).json({
        error: "Cannot create availability in the past",
      });
    }

    // Validate time range (8 AM to 8 PM)
    const startHour = startDate.getHours();
    const endHour = endDate.getHours();

    if (startHour < 8 || startHour >= 20 || endHour > 20) {
      return res.status(400).json({
        error: "Availability must be between 8 AM and 8 PM",
      });
    }

    // @ts-ignore
    const user = req.user;

    // Check if user is the provider
    const provider = await prisma.provider.findUnique({
      where: { id: providerId },
    });

    if (!provider || provider.userId !== user.id) {
      return res.status(403).json({
        error: "Forbidden - Only the provider can create their events",
      });
    }

    const startDateTime = new Date(start);
    const endDateTime = new Date(end);
    const durationMinutes = Math.round(
      (endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60)
    );

    const event = await prisma.event.create({
      data: {
        id: crypto.randomUUID(),
        providerId,
        title,
        description,
        start: startDateTime,
        end: endDateTime,
        duration: durationMinutes,
        price: null, // Can be set later
      },
      include: {
        provider: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    res.status(201).json(event);
  } catch (error) {
    console.error("Error creating event:", error);
    res.status(500).json({ error: "Failed to create event" });
  }
});

// List events (filter by provider, department, or organization)
app.get("/api/events", requireAuth, async (req, res) => {
  try {
    const { providerId, departmentId, organizationId, available } = req.query;

    let whereClause: any = {};

    if (providerId) {
      whereClause.providerId = providerId as string;
    } else if (departmentId) {
      whereClause.provider = {
        departmentId: departmentId as string,
      };
    } else if (organizationId) {
      whereClause.provider = {
        department: {
          organizationId: organizationId as string,
        },
      };
    }

    // Filter for available events (not booked and in the future)
    if (available === "true") {
      whereClause.isBooked = false;
      whereClause.start = {
        gte: new Date(),
      };
    }

    const events = await prisma.event.findMany({
      where: whereClause,
      include: {
        provider: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            department: true,
          },
        },
        booking: {
          include: {
            member: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        start: "asc",
      },
    });

    res.json(events);
  } catch (error) {
    console.error("Error fetching events:", error);
    res.status(500).json({ error: "Failed to fetch events" });
  }
});

// Get event by ID
app.get("/api/events/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        provider: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            department: {
              include: {
                organization: true,
              },
            },
          },
        },
        booking: {
          include: {
            member: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    res.json(event);
  } catch (error) {
    console.error("Error fetching event:", error);
    res.status(500).json({ error: "Failed to fetch event" });
  }
});

// Update event (provider only)
app.put("/api/events/:id", requireAuth, requireProvider, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, start, end } = req.body;

    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        provider: true,
      },
    });

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    // @ts-ignore
    const user = req.user;

    if (event.provider.userId !== user.id) {
      return res.status(403).json({
        error: "Forbidden - Only the provider can update their events",
      });
    }

    // Don't allow updating booked events
    if (event.isBooked) {
      return res.status(400).json({ error: "Cannot update a booked event" });
    }

    // Calculate new duration if times are being updated
    let updateData: any = {
      ...(title && { title }),
      ...(description && { description }),
    };

    if (start && end) {
      const startDateTime = new Date(start);
      const endDateTime = new Date(end);
      const durationMinutes = Math.round(
        (endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60)
      );

      updateData = {
        ...updateData,
        start: startDateTime,
        end: endDateTime,
        duration: durationMinutes,
      };
    } else if (start) {
      const startDateTime = new Date(start);
      updateData.start = startDateTime;
    } else if (end) {
      const endDateTime = new Date(end);
      updateData.end = endDateTime;
    }

    const updatedEvent = await prisma.event.update({
      where: { id },
      data: updateData,
      include: {
        provider: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    res.json(updatedEvent);
  } catch (error) {
    console.error("Error updating event:", error);
    res.status(500).json({ error: "Failed to update event" });
  }
});

// Delete event (provider only)
app.delete("/api/events/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        provider: true,
      },
    });

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    // @ts-ignore
    const user = req.user;

    if (event.provider.userId !== user.id) {
      return res.status(403).json({
        error: "Forbidden - Only the provider can delete their events",
      });
    }

    // Don't allow deleting booked events
    if (event.isBooked) {
      return res.status(400).json({
        error: "Cannot delete a booked event. Cancel the booking first.",
      });
    }

    await prisma.event.delete({
      where: { id },
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting event:", error);
    res.status(500).json({ error: "Failed to delete event" });
  }
});

// ==================== BOOKING ROUTES ====================

// Create booking (member only) and send email confirmation
app.post("/api/bookings", requireAuth, async (req, res) => {
  try {
    const { eventId } = req.body;

    if (!eventId) {
      return res.status(400).json({ error: "eventId is required" });
    }

    // @ts-ignore
    const user = req.user;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        provider: {
          include: {
            user: true,
            department: {
              include: {
                organization: true,
              },
            },
          },
        },
      },
    });

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    if (event.isBooked) {
      return res.status(400).json({ error: "Event is already booked" });
    }

    if (new Date(event.start) < new Date()) {
      return res.status(400).json({ error: "Cannot book past events" });
    }

    // Create booking
    const booking = await prisma.booking.create({
      data: {
        id: crypto.randomUUID(),
        eventId,
        memberId: user.id,
      },
      include: {
        event: {
          include: {
            provider: {
              include: {
                user: true,
                department: {
                  include: {
                    organization: true,
                  },
                },
              },
            },
          },
        },
        member: true,
      },
    });

    // Update event as booked
    await prisma.event.update({
      where: { id: eventId },
      data: { isBooked: true },
    });

    // Send confirmation email using Resend
    try {
      const emailData = {
        from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
        to: user.email,
        subject: `Appointment Confirmation with ${event.provider.user.name}`,
        html: `
          <h2>Appointment Confirmed!</h2>
          <p>Dear ${user.name},</p>
          <p>Your appointment has been successfully booked.</p>
          
          <h3>Appointment Details:</h3>
          <ul>
            <li><strong>Provider:</strong> ${event.provider.user.name}</li>
            <li><strong>Title:</strong> ${event.title}</li>
            <li><strong>Date:</strong> ${new Date(
              event.start
            ).toLocaleDateString()}</li>
            <li><strong>Time:</strong> ${new Date(
              event.start
            ).toLocaleTimeString()} - ${new Date(
          event.end
        ).toLocaleTimeString()}</li>
            <li><strong>Organization:</strong> ${
              event.provider.department.organization.name
            }</li>
            <li><strong>Department:</strong> ${
              event.provider.department.name
            }</li>
          </ul>
          
          ${
            event.description
              ? `<p><strong>Description:</strong> ${event.description}</p>`
              : ""
          }
          
          <p>If you need to cancel or reschedule, please contact us.</p>
          
          <p>Best regards,<br>${event.provider.department.organization.name}</p>
        `,
      };

      await resend.emails.send(emailData);
      console.log("Confirmation email sent to:", user.email);
    } catch (emailError) {
      console.error("Error sending confirmation email:", emailError);
      // Don't fail the booking if email fails
    }

    res.status(201).json(booking);
  } catch (error) {
    console.error("Error creating booking:", error);
    res.status(500).json({ error: "Failed to create booking" });
  }
});

// List bookings (user's own bookings or provider's bookings)
app.get("/api/bookings", requireAuth, async (req, res) => {
  try {
    // @ts-ignore
    const user = req.user;
    const { providerId, organizationId } = req.query;

    let whereClause: any = {};

    if (providerId) {
      // Check if user is the provider
      const provider = await prisma.provider.findUnique({
        where: { id: providerId as string },
      });

      if (!provider || provider.userId !== user.id) {
        return res.status(403).json({ error: "Forbidden" });
      }

      whereClause.event = {
        providerId: providerId as string,
      };
    } else if (organizationId) {
      // Check if user is owner of organization
      const member = await prisma.member.findUnique({
        where: {
          organizationId_userId: {
            organizationId: organizationId as string,
            userId: user.id,
          },
        },
      });

      // Check if user has OWNER role
      if (user.role !== "OWNER") {
        return res.status(403).json({ error: "Forbidden" });
      }

      whereClause.event = {
        provider: {
          department: {
            organizationId: organizationId as string,
          },
        },
      };
    } else {
      // Return user's own bookings
      whereClause.memberId = user.id;
    }

    const bookings = await prisma.booking.findMany({
      where: whereClause,
      include: {
        event: {
          include: {
            provider: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
                department: {
                  include: {
                    organization: true,
                  },
                },
              },
            },
          },
        },
        member: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json(bookings);
  } catch (error) {
    console.error("Error fetching bookings:", error);
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
});

// Get booking by ID
app.get("/api/bookings/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    // @ts-ignore
    const user = req.user;

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        event: {
          include: {
            provider: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
                department: {
                  include: {
                    organization: true,
                  },
                },
              },
            },
          },
        },
        member: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    // Check if user is the member who made the booking or the provider
    if (
      booking.memberId !== user.id &&
      booking.event.provider.userId !== user.id
    ) {
      return res.status(403).json({ error: "Forbidden" });
    }

    res.json(booking);
  } catch (error) {
    console.error("Error fetching booking:", error);
    res.status(500).json({ error: "Failed to fetch booking" });
  }
});

// Cancel booking
app.delete("/api/bookings/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    // @ts-ignore
    const user = req.user;

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        event: true,
      },
    });

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    // Only the member who booked can cancel
    if (booking.memberId !== user.id) {
      return res
        .status(403)
        .json({ error: "Forbidden - Only the booking owner can cancel" });
    }

    // Delete booking and mark event as available
    await prisma.booking.delete({
      where: { id },
    });

    await prisma.event.update({
      where: { id: booking.eventId },
      data: { isBooked: false },
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Error canceling booking:", error);
    res.status(500).json({ error: "Failed to cancel booking" });
  }
});

// ==================== CLIENT ROUTES ====================

// Get all organizations (public for clients)
app.get("/api/client/organizations", requireAuth, async (_req, res) => {
  try {
    const organizations = await prisma.organization.findMany({
      where: {
        enabled: true, // Only show enabled organizations
      },
      select: {
        id: true,
        name: true,
        description: true,
        _count: {
          select: {
            departments: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    res.json(organizations);
  } catch (error) {
    console.error("Error fetching organizations:", error);
    res.status(500).json({ error: "Failed to fetch organizations" });
  }
});

// Get organization details
app.get("/api/client/organizations/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const organization = await prisma.organization.findUnique({
      where: { id, enabled: true },
      select: {
        id: true,
        name: true,
        description: true,
      },
    });

    if (!organization) {
      return res.status(404).json({ error: "Organization not found" });
    }

    res.json(organization);
  } catch (error) {
    console.error("Error fetching organization:", error);
    res.status(500).json({ error: "Failed to fetch organization" });
  }
});

// Get departments for an organization
app.get(
  "/api/client/organizations/:id/departments",
  requireAuth,
  async (req, res) => {
    try {
      const { id } = req.params;

      const departments = await prisma.department.findMany({
        where: {
          organizationId: id,
          organization: {
            enabled: true,
          },
        },
        select: {
          id: true,
          name: true,
          description: true,
          _count: {
            select: {
              providers: true,
            },
          },
        },
        orderBy: {
          name: "asc",
        },
      });

      res.json(departments);
    } catch (error) {
      console.error("Error fetching departments:", error);
      res.status(500).json({ error: "Failed to fetch departments" });
    }
  }
);

// Get department details
app.get("/api/client/departments/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const department = await prisma.department.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!department) {
      return res.status(404).json({ error: "Department not found" });
    }

    res.json(department);
  } catch (error) {
    console.error("Error fetching department:", error);
    res.status(500).json({ error: "Failed to fetch department" });
  }
});

// Get providers for a department
app.get(
  "/api/client/departments/:id/providers",
  requireAuth,
  async (req, res) => {
    try {
      const { id } = req.params;

      const providers = await prisma.provider.findMany({
        where: {
          departmentId: id,
        },
        select: {
          id: true,
          userId: true,
          bio: true,
          specialization: true,
          user: {
            select: {
              name: true,
              email: true,
            },
          },
          _count: {
            select: {
              events: {
                where: {
                  isBooked: false, // Only count available events
                  start: {
                    gte: new Date(), // Future events only
                  },
                },
              },
            },
          },
        },
        orderBy: {
          user: {
            name: "asc",
          },
        },
      });

      res.json(providers);
    } catch (error) {
      console.error("Error fetching providers:", error);
      res.status(500).json({ error: "Failed to fetch providers" });
    }
  }
);

// Get provider details
app.get("/api/client/providers/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const provider = await prisma.provider.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        bio: true,
        specialization: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!provider) {
      return res.status(404).json({ error: "Provider not found" });
    }

    res.json(provider);
  } catch (error) {
    console.error("Error fetching provider:", error);
    res.status(500).json({ error: "Failed to fetch provider" });
  }
});

// Get available events for a provider (not booked)
app.get(
  "/api/client/providers/:id/available-events",
  requireAuth,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { date } = req.query;

      let startDate = new Date(); // Current moment - only show future events
      let endDate = new Date();
      endDate.setFullYear(endDate.getFullYear() + 1); // Next 1 year

      // If specific date provided, filter by that date
      if (date && typeof date === "string") {
        startDate = new Date(date + "T00:00:00");
        endDate = new Date(date + "T23:59:59");
      }

      const events = await prisma.event.findMany({
        where: {
          providerId: id,
          isBooked: false, // Only available events
          start: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: {
          id: true,
          title: true,
          description: true,
          start: true,
          end: true,
          duration: true,
          price: true,
        },
        orderBy: {
          start: "asc",
        },
      });

      console.log(`Found ${events.length} available events for provider ${id}`);
      res.json(events);
    } catch (error) {
      console.error("Error fetching available events:", error);
      res.status(500).json({ error: "Failed to fetch available events" });
    }
  }
);

// Create booking (client) and send email confirmation
app.post("/api/client/bookings", requireAuth, async (req, res) => {
  try {
    const { eventId } = req.body;
    // @ts-ignore
    const user = req.user;

    if (!eventId) {
      return res.status(400).json({ error: "Event ID is required" });
    }

    // Check if event exists and is available
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        provider: {
          include: {
            user: true,
            department: {
              include: {
                organization: true,
              },
            },
          },
        },
      },
    });

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    if (event.isBooked) {
      return res
        .status(400)
        .json({ error: "This time slot is no longer available" });
    }

    // Check if event is in the past
    const eventStartTime = event.start;
    if (new Date(eventStartTime) < new Date()) {
      return res.status(400).json({ error: "Cannot book past events" });
    }

    // Create booking
    const booking = await prisma.booking.create({
      data: {
        id: crypto.randomUUID(),
        eventId,
        memberId: user.id,
        status: "CONFIRMED",
      },
      include: {
        event: {
          include: {
            provider: {
              include: {
                user: true,
                department: {
                  include: {
                    organization: true,
                  },
                },
              },
            },
          },
        },
        member: true,
      },
    });

    // Mark event as booked
    await prisma.event.update({
      where: { id: eventId },
      data: { isBooked: true },
    });

    // Send confirmation email to client
    try {
      const startTime = new Date(event.start);
      const endTime = new Date(event.end);

      const fromEmail =
        process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
      console.log("📧 Sending confirmation email to:", user.email);
      console.log("📧 From email:", fromEmail);

      const emailResponse = await resend.emails.send({
        from: fromEmail,
        to: user.email,
        subject: "Booking Confirmation",
        html: `
          <h2>Your booking has been confirmed!</h2>
          <p>Hello ${user.name},</p>
          <p>Your appointment has been successfully booked.</p>
          
          <h3>Booking Details:</h3>
          <ul>
            <li><strong>Provider:</strong> ${event.provider.user.name}</li>
            <li><strong>Organization:</strong> ${
              event.provider.department.organization.name
            }</li>
            <li><strong>Department:</strong> ${
              event.provider.department.name
            }</li>
            <li><strong>Service:</strong> ${event.title}</li>
            ${
              event.description
                ? `<li><strong>Description:</strong> ${event.description}</li>`
                : ""
            }
            <li><strong>Date:</strong> ${startTime.toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}</li>
            <li><strong>Time:</strong> ${startTime.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            })} - ${endTime.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        })}</li>
            <li><strong>Duration:</strong> ${event.duration} minutes</li>
            ${
              event.price
                ? `<li><strong>Price:</strong> $${event.price}</li>`
                : ""
            }
          </ul>
          
          <p>If you need to cancel or reschedule, please contact us as soon as possible.</p>
          <p>Thank you for choosing our service!</p>
        `,
      });

      console.log("✅ Client email sent successfully:", emailResponse);

      // Also send notification to provider
      console.log(
        "📧 Sending provider notification to:",
        event.provider.user.email
      );
      const providerEmailResponse = await resend.emails.send({
        from: fromEmail,
        to: event.provider.user.email,
        subject: "New Booking Received",
        html: `
          <h2>You have a new booking!</h2>
          <p>Hello ${event.provider.user.name},</p>
          <p>A new appointment has been booked with you.</p>
          
          <h3>Booking Details:</h3>
          <ul>
            <li><strong>Client:</strong> ${user.name}</li>
            <li><strong>Client Email:</strong> ${user.email}</li>
            <li><strong>Service:</strong> ${event.title}</li>
            <li><strong>Date:</strong> ${startTime.toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}</li>
            <li><strong>Time:</strong> ${startTime.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            })} - ${endTime.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        })}</li>
            <li><strong>Duration:</strong> ${event.duration} minutes</li>
          </ul>
          
          <p>Please be prepared for this appointment.</p>
        `,
      });

      console.log(
        "✅ Provider email sent successfully:",
        providerEmailResponse
      );
      console.log("✅ Both booking confirmation emails sent successfully");
    } catch (emailError) {
      console.error(
        "❌ Failed to send booking confirmation emails:",
        emailError
      );
      console.error(
        "Email error details:",
        JSON.stringify(emailError, null, 2)
      );

      // Log Resend configuration status
      console.error("Resend API Key configured:", !!process.env.RESEND_API_KEY);
      console.error(
        "Resend From Email:",
        process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev"
      );

      // Don't fail the booking if email fails, but let user know
      // Email error is already logged on server side
    }

    res.status(201).json(booking);
  } catch (error) {
    console.error("Error creating booking:", error);
    res.status(500).json({ error: "Failed to create booking" });
  }
});

// ==================== ADMIN ROUTES ====================

// Enhanced admin overview with global visibility
app.get("/api/admin/overview", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const data = await prisma.organization.findMany({
      include: {
        members: {
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
        departments: {
          include: {
            providers: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
                events: {
                  include: {
                    booking: {
                      include: {
                        member: {
                          select: {
                            id: true,
                            name: true,
                            email: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Calculate statistics
    const stats = {
      totalOrganizations: data.length,
      totalDepartments: data.reduce(
        (sum, org) => sum + org.departments.length,
        0
      ),
      totalProviders: data.reduce(
        (sum, org) =>
          sum +
          org.departments.reduce(
            (dSum, dept) => dSum + dept.providers.length,
            0
          ),
        0
      ),
      totalMembers: data.reduce((sum, org) => sum + org.members.length, 0),
      totalEvents: data.reduce(
        (sum, org) =>
          sum +
          org.departments.reduce(
            (dSum, dept) =>
              dSum +
              dept.providers.reduce(
                (pSum, provider) => pSum + provider.events.length,
                0
              ),
            0
          ),
        0
      ),
      totalBookings: data.reduce(
        (sum, org) =>
          sum +
          org.departments.reduce(
            (dSum, dept) =>
              dSum +
              dept.providers.reduce(
                (pSum, provider) =>
                  pSum +
                  provider.events.filter((event) => event.booking).length,
                0
              ),
            0
          ),
        0
      ),
    };

    res.json({ organizations: data, stats });
  } catch (error) {
    console.error("Error fetching admin overview:", error);
    res.status(500).json({ error: "Failed to fetch admin overview" });
  }
});

// List all organizations (admin only)
app.get(
  "/api/admin/organizations",
  requireAuth,
  requireAdmin,
  async (_req, res) => {
    try {
      const organizations = await prisma.organization.findMany({
        include: {
          members: true,
          departments: {
            include: {
              providers: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });
      res.json(organizations);
    } catch (error) {
      console.error("Error fetching organizations:", error);
      res.status(500).json({ error: "Failed to fetch organizations" });
    }
  }
);

// Delete organization (admin only)
app.delete(
  "/api/admin/organizations/:id",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      await prisma.organization.delete({
        where: { id },
      });
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting organization:", error);
      res.status(500).json({ error: "Failed to delete organization" });
    }
  }
);

// ==================== HELPER FUNCTIONS ====================

// Ensure product exists in database, create if not
async function ensureProduct(polarProductId: string) {
  let product = await prisma.product.findUnique({
    where: { polarId: polarProductId },
  });

  if (!product) {
    // Create product in our database
    // You can fetch product details from Polar API here if needed
    product = await prisma.product.create({
      data: {
        id: crypto.randomUUID(),
        polarId: polarProductId,
        name: "Monthly Subscription", // Default name
        priceCents: 1000, // $10.00 - update with actual price
        currency: "USD",
        interval: "month",
      },
    });
    console.log("✨ Created product in database:", product);
  }

  return product;
}

// ==================== SUBSCRIPTION MANAGEMENT ====================

// Create Polar checkout session for organization subscription
app.post(
  "/api/subscriptions/create-checkout",
  requireAuth,
  async (req, res) => {
    try {
      const { organizationId } = req.body;
      // @ts-ignore
      const user = req.user;

      if (!organizationId) {
        return res.status(400).json({ error: "Organization ID required" });
      }

      // Verify user is owner of organization
      const member = await prisma.member.findUnique({
        where: {
          organizationId_userId: {
            organizationId,
            userId: user.id,
          },
        },
      });

      // Check if user has OWNER role
      if (user.role !== "OWNER") {
        return res
          .status(403)
          .json({ error: "Forbidden - Owner access required" });
      }

      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
      });

      if (!organization) {
        return res.status(404).json({ error: "Organization not found" });
      }

      if (organization.enabled) {
        return res
          .status(400)
          .json({ error: "Organization is already subscribed" });
      }

      // Create Polar checkout session via API
      const polarAccessToken = process.env.POLAR_ACCESS_TOKEN;
      const polarProductId = process.env.POLAR_PRODUCT_ID;

      if (!polarAccessToken || !polarProductId) {
        console.error("Polar credentials not configured");
        return res.status(500).json({
          error: "Payment system not configured. Please contact support.",
        });
      }

      // Call Polar API to create checkout session
      const baseSuccessUrl =
        process.env.POLAR_SUCCESS_URL ||
        `${process.env.CORS_ORIGIN || "http://localhost:3001"}/owner`;

      // Build success URL properly - check if URL already has query params
      const separator = baseSuccessUrl.includes("?") ? "&" : "?";
      const successUrlWithParams = `${baseSuccessUrl}${separator}subscribed=true&organizationId=${organizationId}`;

      const checkoutData = {
        product_id: polarProductId,
        success_url: successUrlWithParams,
        customer_email: user.email,
        metadata: {
          organizationId: organization.id,
          organizationName: organization.name,
          userId: user.id,
          userEmail: user.email,
        },
      };

      // Determine API base URL (sandbox vs production)
      const useSandbox = process.env.POLAR_SANDBOX === "true";
      const polarApiBase = useSandbox
        ? "https://sandbox-api.polar.sh/v1"
        : "https://api.polar.sh/v1";

      console.log("🔄 Creating Polar checkout:", {
        environment: useSandbox ? "SANDBOX" : "PRODUCTION",
        apiBase: polarApiBase,
        product_id: polarProductId,
        success_url: successUrlWithParams,
      });

      // Try to create checkout via API
      // Polar API endpoint: /checkouts (not /checkouts/custom)
      const polarResponse = await fetch(`${polarApiBase}/checkouts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${polarAccessToken}`,
        },
        body: JSON.stringify(checkoutData),
      });

      console.log("📡 Polar API Response:", polarResponse.status);

      if (!polarResponse.ok) {
        const errorText = await polarResponse.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText };
        }

        console.error("❌ Polar API Error:", {
          status: polarResponse.status,
          error: errorData,
          apiBase: polarApiBase,
        });

        return res.status(500).json({
          error: "Failed to create checkout session",
          polarError: errorData,
          hint: "Check Polar dashboard for correct API endpoint and ensure product is published",
        });
      }

      const checkoutSession = await polarResponse.json();

      console.log("✅ Checkout session created:", {
        id: checkoutSession.id,
        url: checkoutSession.url,
      });

      res.json({
        checkoutUrl: checkoutSession.url,
        organizationId: organization.id,
        organizationName: organization.name,
        amount: "$10.00/month",
        message: "Complete payment to activate your organization",
      });
    } catch (error) {
      console.error("Error creating checkout session:", error);
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  }
);

// Get subscription history for a user
app.get(
  "/api/subscriptions/my-subscriptions",
  requireAuth,
  async (req, res) => {
    try {
      // @ts-ignore
      const user = req.user;

      const subscriptions = await prisma.subscription.findMany({
        where: {
          userId: user.id,
        },
        include: {
          product: true,
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
              logo: true,
            },
          },
          payments: {
            orderBy: {
              createdAt: "desc",
            },
            take: 5, // Last 5 payments
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      res.json(subscriptions);
    } catch (error) {
      console.error("Error fetching subscriptions:", error);
      res.status(500).json({ error: "Failed to fetch subscriptions" });
    }
  }
);

// Get subscription details for an organization
app.get(
  "/api/subscriptions/organization/:organizationId",
  requireAuth,
  async (req, res) => {
    try {
      const { organizationId } = req.params;
      // @ts-ignore
      const user = req.user;

      // Check if user is a member of the organization
      const member = await prisma.member.findUnique({
        where: {
          organizationId_userId: {
            organizationId: organizationId as string,
            userId: user.id,
          },
        },
      });

      if (!member) {
        return res
          .status(403)
          .json({ error: "Forbidden - Not a member of this organization" });
      }

      const subscription = await prisma.subscription.findFirst({
        where: {
          organizationId: organizationId as string,
        },
        include: {
          product: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          payments: {
            orderBy: {
              createdAt: "desc",
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      if (!subscription) {
        return res.status(404).json({ error: "No subscription found" });
      }

      res.json(subscription);
    } catch (error) {
      console.error("Error fetching organization subscription:", error);
      res.status(500).json({ error: "Failed to fetch subscription" });
    }
  }
);

// Get payment history for a subscription
app.get(
  "/api/payments/subscription/:subscriptionId",
  requireAuth,
  async (req, res) => {
    try {
      const { subscriptionId } = req.params;
      // @ts-ignore
      const user = req.user;

      // Verify user owns the subscription
      const subscription = await prisma.subscription.findUnique({
        where: { id: subscriptionId as string },
      });

      if (!subscription || subscription.userId !== user.id) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const payments = await prisma.payment.findMany({
        where: {
          subscriptionId: subscriptionId as string,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      res.json(payments);
    } catch (error) {
      console.error("Error fetching payments:", error);
      res.status(500).json({ error: "Failed to fetch payments" });
    }
  }
);

// ==================== POLAR WEBHOOK ====================

// Webhook for Polar subscription events
app.post(
  "/api/webhooks/polar",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    try {
      // Get raw body as string for signature verification and parsing
      let rawBody: string;
      let event: any;

      // Handle different body formats
      if (Buffer.isBuffer(req.body)) {
        rawBody = req.body.toString("utf8");
      } else if (typeof req.body === "string") {
        rawBody = req.body;
      } else if (typeof req.body === "object") {
        // Body is already parsed - this shouldn't happen with express.raw()
        event = req.body;
        rawBody = JSON.stringify(req.body);
      } else {
        console.error("❌ Unexpected body type:", typeof req.body);
        return res.status(400).json({ error: "Invalid webhook payload" });
      }

      console.log("📥 Webhook received, body type:", typeof req.body);
      console.log("📝 Raw body length:", rawBody.length);

      // Verify webhook signature using POLAR_WEBHOOK_SECRET
      const signature = req.headers["polar-signature"] as string;
      const webhookSecret = process.env.POLAR_WEBHOOK_SECRET;

      if (webhookSecret && signature) {
        // Create HMAC signature
        const hmac = crypto.createHmac("sha256", webhookSecret);
        const digest = hmac.update(rawBody).digest("hex");
        const expectedSignature = `sha256=${digest}`;

        // Verify signature
        if (signature !== expectedSignature) {
          console.error("❌ Invalid webhook signature");
          return res.status(401).json({ error: "Invalid signature" });
        }

        console.log("✅ Webhook signature verified");
      } else if (webhookSecret) {
        console.warn("⚠️ Webhook secret is set but no signature received");
      } else {
        console.warn(
          "⚠️ Webhook signature verification skipped (POLAR_WEBHOOK_SECRET not set)"
        );
      }

      // Parse event if not already parsed
      if (!event) {
        try {
          event = JSON.parse(rawBody);
        } catch (parseError) {
          console.error("❌ Failed to parse webhook JSON:", parseError);
          console.error("Raw body:", rawBody.substring(0, 200));
          return res.status(400).json({ error: "Invalid JSON payload" });
        }
      }

      console.log("📥 Received Polar webhook:", {
        type: event.type,
        timestamp: new Date().toISOString(),
      });

      // Handle subscription.created or payment.succeeded events
      if (
        event.type === "subscription.created" ||
        event.type === "order.created"
      ) {
        const { customer, metadata, product } = event.data;
        const organizationId = metadata?.organizationId;
        const userId = metadata?.userId;

        if (organizationId && userId) {
          // Ensure product exists in our database
          const dbProduct = await ensureProduct(
            product?.id || process.env.POLAR_PRODUCT_ID
          );

          // Create or update subscription record
          const subscription = await prisma.subscription.upsert({
            where: {
              polarCheckoutId: event.data.checkout_id || event.data.id,
            },
            update: {
              status: "active",
              polarSubscriptionId: event.data.subscription_id || event.data.id,
              polarCustomerId: customer.id,
              currentPeriodStart: new Date(),
              currentPeriodEnd: event.data.current_period_end
                ? new Date(event.data.current_period_end)
                : null,
            },
            create: {
              id: crypto.randomUUID(),
              polarCheckoutId: event.data.checkout_id || event.data.id,
              polarSubscriptionId: event.data.subscription_id || event.data.id,
              polarCustomerId: customer.id,
              status: "active",
              userId,
              organizationId,
              productId: dbProduct.id,
              currentPeriodStart: new Date(),
              currentPeriodEnd: event.data.current_period_end
                ? new Date(event.data.current_period_end)
                : null,
            },
          });

          // Create payment record
          await prisma.payment.create({
            data: {
              id: crypto.randomUUID(),
              polarPaymentId: event.data.payment_id || event.data.id,
              amount: event.data.amount || dbProduct.priceCents,
              currency: event.data.currency || dbProduct.currency,
              status: "succeeded",
              subscriptionId: subscription.id,
            },
          });

          // Enable existing organization after successful payment
          const organization = await prisma.organization.update({
            where: { id: organizationId },
            data: {
              enabled: true,
              metadata: JSON.stringify({
                polarCustomerId: customer.id,
                subscriptionId: subscription.id,
                subscriptionStatus: "active",
                subscriptionStartedAt: new Date().toISOString(),
              }),
            },
          });

          console.log(
            "✅ Organization enabled via Polar webhook:",
            organization.name
          );
          console.log("💳 Subscription created:", subscription.id);
          console.log("💰 Payment recorded");

          // Send confirmation email to owner
          // Find owner by checking User.role
          const members = await prisma.member.findMany({
            where: {
              organizationId: organization.id,
            },
            include: {
              organization: true,
            },
          });

          // Find the member who is an OWNER
          const owner = await Promise.all(
            members.map(async (m) => {
              const u = await prisma.user.findUnique({
                where: { id: m.userId },
              });
              return { member: m, user: u };
            })
          ).then(
            (results) => results.find((r) => r.user?.role === "OWNER")?.member
          );

          if (owner) {
            const ownerUser = await prisma.user.findUnique({
              where: { id: owner.userId },
            });

            if (ownerUser) {
              try {
                await resend.emails.send({
                  from:
                    process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
                  to: ownerUser.email,
                  subject: `${organization.name} - Subscription Activated!`,
                  html: `
                    <h2>🎉 Subscription Activated!</h2>
                    <p>Dear ${ownerUser.name},</p>
                    <p>Your subscription for <strong>${
                      organization.name
                    }</strong> has been successfully activated.</p>
                    
                    <h3>What's Next?</h3>
                    <ul>
                      <li>Create departments for your organization</li>
                      <li>Invite and assign healthcare providers</li>
                      <li>Providers can create appointment slots</li>
                      <li>Patients can start booking appointments</li>
                    </ul>
                    
                    <p><strong>Subscription Details:</strong></p>
                    <ul>
                      <li><strong>Plan:</strong> $10/month</li>
                      <li><strong>Status:</strong> Active</li>
                      <li><strong>Organization:</strong> ${
                        organization.name
                      }</li>
                    </ul>
                    
                    <p>Login to get started: ${
                      process.env.CORS_ORIGIN || "http://localhost:3001"
                    }</p>
                    
                    <p>Best regards,<br>Medisched Team</p>
                  `,
                });
              } catch (emailError) {
                console.error(
                  "Error sending subscription activation email:",
                  emailError
                );
              }
            }
          }
        } else {
          // Legacy: Auto-create organization (if no organizationId in metadata)
          const orgName =
            metadata?.organizationName || `${customer.name}'s Organization`;
          const orgSlug = orgName.toLowerCase().replace(/[^a-z0-9]+/g, "-");

          // Create organization (enabled immediately for auto-created)
          const organization = await prisma.organization.create({
            data: {
              id: crypto.randomUUID(),
              name: orgName,
              slug: orgSlug,
              enabled: true,
              createdAt: new Date(),
              metadata: JSON.stringify({
                polarCustomerId: customer.id,
                subscriptionId: event.data.id,
              }),
            },
          });

          // Find or create user
          let user = await prisma.user.findUnique({
            where: { email: customer.email },
          });

          if (!user) {
            user = await prisma.user.create({
              data: {
                id: crypto.randomUUID(),
                email: customer.email,
                name: customer.name,
                emailVerified: true,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            });
          }

          // Add user as owner of organization
          await prisma.member.create({
            data: {
              id: crypto.randomUUID(),
              organizationId: organization.id,
              userId: user.id,
              email: user.email,
              createdAt: new Date(),
            },
          });

          // Set user role to OWNER
          await prisma.user.update({
            where: { id: user.id },
            data: { role: "OWNER" },
          });

          console.log(
            "Organization auto-created via Polar webhook:",
            organization
          );
        }
      }

      // Handle subscription cancellation
      if (event.type === "subscription.canceled") {
        const { metadata } = event.data;
        const organizationId = metadata?.organizationId;

        if (organizationId) {
          // Update subscription status
          const subscription = await prisma.subscription.findFirst({
            where: {
              organizationId,
              status: "active",
            },
          });

          if (subscription) {
            await prisma.subscription.update({
              where: { id: subscription.id },
              data: {
                status: "cancelled",
                cancelledAt: new Date(),
              },
            });
          }

          // Disable organization
          await prisma.organization.update({
            where: { id: organizationId },
            data: {
              enabled: false,
              metadata: JSON.stringify({
                ...JSON.parse(
                  (
                    await prisma.organization.findUnique({
                      where: { id: organizationId },
                    })
                  )?.metadata || "{}"
                ),
                subscriptionStatus: "canceled",
                subscriptionCanceledAt: new Date().toISOString(),
              }),
            },
          });

          console.log("❌ Subscription cancelled, organization disabled");
        }
      }

      res.json({ received: true });
    } catch (error) {
      console.error("Error processing Polar webhook:", error);
      res.status(400).json({ error: "Webhook processing failed" });
    }
  }
);

// ==================== HEALTH CHECK ====================

app.get("/", (_req, res) => {
  res.status(200).send("OK");
});

app.get("/health", (_req, res) => {
  res
    .status(200)
    .json({ status: "healthy", timestamp: new Date().toISOString() });
});

// Debug endpoint to check database connection
app.get("/debug/db-info", async (_req, res) => {
  try {
    const userCount = await prisma.user.count();
    const orgCount = await prisma.organization.count();
    const deptCount = await prisma.department.count();

    // Get actual users to verify which DB
    const users = await prisma.user.findMany({
      select: {
        email: true,
        name: true,
      },
      take: 5,
    });

    res.json({
      databaseUrl: process.env.DATABASE_URL,
      tables: {
        users: userCount,
        organizations: orgCount,
        departments: deptCount,
      },
      sampleUsers: users,
      prismaConnected: true,
    });
  } catch (error) {
    res.status(500).json({
      databaseUrl: process.env.DATABASE_URL,
      error: error instanceof Error ? error.message : "Unknown error",
      prismaConnected: false,
    });
  }
});

// Debug endpoint to check email configuration
app.get("/debug/email-config", (_req, res) => {
  const apiKey = process.env.RESEND_API_KEY;
  res.json({
    resendConfigured: !!apiKey,
    apiKeyPreview: apiKey
      ? `${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`
      : "NOT SET",
    fromEmail: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
    corsOrigin: process.env.CORS_ORIGIN,
    frontendUrl: process.env.FRONTEND_URL,
    note: "If resendConfigured is true, check Resend dashboard at https://resend.com/emails for delivery status",
  });
});

// Test email endpoint
app.post("/api/test-email", async (req, res) => {
  try {
    const { to, subject, message } = req.body;

    if (!to || !subject || !message) {
      return res
        .status(400)
        .json({ error: "Missing required fields: to, subject, message" });
    }

    console.log(`🧪 Test Email Request:`, { to, subject, message });

    const emailData = {
      from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
      to: [to],
      subject: subject,
      html: `<p>${message}</p><p><strong>Test sent at:</strong> ${new Date().toISOString()}</p>`,
    };

    console.log(`📧 Sending test email:`, emailData);

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailData),
    });

    const result = await response.json();
    console.log(`📧 Test email result:`, result);

    if (result.id) {
      res.json({
        success: true,
        emailId: result.id,
        message: "Test email sent successfully",
        resendDashboard: `https://resend.com/emails/${result.id}`,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.message || "Failed to send email",
        details: result,
      });
    }
  } catch (error) {
    console.error("Test email error:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// ==================== START SERVER ====================

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`🚀 Server is running on port ${port}`);
  console.log(
    `📧 Email service: ${
      process.env.RESEND_API_KEY ? "Configured" : "Not configured"
    }`
  );
});
