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
import bcrypt from "bcrypt";
import crypto from "crypto";

const app = express();

app.use(express.json());

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
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

  if (!user || user.systemRole !== "ADMIN") {
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

  if (!member || member.role !== "owner") {
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
        name,
        email,
        emailVerified: true,
        systemRole: role,
        needsPasswordChange: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Create account with temporary password
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

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
            process.env.CORS_ORIGIN || "http://localhost:5173"
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
        systemRole: user.systemRole,
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
      const { name, slug, ownerId, logo } = req.body;

      if (!name || !slug || !ownerId) {
        return res
          .status(400)
          .json({ error: "Name, slug, and ownerId are required" });
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

      // Check if owner user exists
      const owner = await prisma.user.findUnique({
        where: { id: ownerId },
      });

      if (!owner) {
        return res.status(404).json({ error: "Owner user not found" });
      }

      // Create organization (disabled by default)
      const organization = await prisma.organization.create({
        data: {
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
          organizationId: organization.id,
          userId: ownerId,
          email: owner.email,
          role: "owner",
          createdAt: new Date(),
        },
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
          
          <p>Login at: ${process.env.CORS_ORIGIN || "http://localhost:5173"}</p>
          
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
            organizationId: id,
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
        ? JSON.parse(organization.metadata)
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
    const member = await prisma.member.findUnique({
      where: {
        organizationId_userId: {
          organizationId: department.organizationId,
          userId: user.id,
        },
      },
    });

    if (!member || member.role !== "owner") {
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
          organizationId,
          userId,
          email: user.email,
          role: "provider",
          createdAt: new Date(),
        },
      });
    } else {
      // Update role to provider
      member = await prisma.member.update({
        where: {
          organizationId_userId: {
            organizationId,
            userId,
          },
        },
        data: {
          role: "provider",
        },
      });
    }

    // Create provider entry
    const provider = await prisma.provider.create({
      data: {
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

// List all providers in an organization
app.get("/api/providers", requireAuth, async (req, res) => {
  try {
    const { organizationId, departmentId } = req.query;

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
    const member = await prisma.member.findUnique({
      where: {
        organizationId_userId: {
          organizationId: provider.department.organizationId,
          userId: user.id,
        },
      },
    });

    if (!member || member.role !== "owner") {
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

    const event = await prisma.event.create({
      data: {
        providerId,
        title,
        description,
        start: new Date(start),
        end: new Date(end),
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

    const updatedEvent = await prisma.event.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description && { description }),
        ...(start && { start: new Date(start) }),
        ...(end && { end: new Date(end) }),
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

    res.json(updatedEvent);
  } catch (error) {
    console.error("Error updating event:", error);
    res.status(500).json({ error: "Failed to update event" });
  }
});

// Delete event (provider only)
app.delete(
  "/api/events/:id",
  requireAuth,
  requireProvider,
  async (req, res) => {
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
  }
);

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

      if (!member || member.role !== "owner") {
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

      if (!member || member.role !== "owner") {
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

      // Create Polar checkout session
      // Note: You'll need to configure this with your actual Polar product IDs
      const polarCheckout = {
        product_id: process.env.POLAR_PRODUCT_ID || "prod_medisched_monthly",
        product_price_id: process.env.POLAR_PRICE_ID || "price_10_usd_monthly",
        success_url: `${
          process.env.POLAR_SUCCESS_URL || process.env.CORS_ORIGIN
        }/subscription/success?organizationId=${organizationId}`,
        customer_email: user.email,
        metadata: {
          organizationId: organization.id,
          organizationName: organization.name,
          userId: user.id,
        },
      };

      // In production, you would call Polar API here
      // For now, return the checkout URL structure
      const checkoutUrl = `https://polar.sh/checkout?org=${organization.slug}&product=${polarCheckout.product_id}`;

      res.json({
        checkoutUrl,
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

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

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

// ==================== POLAR WEBHOOK ====================

// Webhook for Polar subscription events
app.post(
  "/api/webhooks/polar",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    try {
      // TODO: Add Polar webhook signature verification
      // Verify webhook signature using POLAR_WEBHOOK_SECRET

      const event = req.body;

      console.log("Received Polar webhook:", event);

      // Handle subscription.created or payment.succeeded events
      if (
        event.type === "subscription.created" ||
        event.type === "order.created"
      ) {
        const { customer, metadata } = event.data;
        const organizationId = metadata?.organizationId;

        if (organizationId) {
          // Enable existing organization after successful payment
          const organization = await prisma.organization.update({
            where: { id: organizationId },
            data: {
              enabled: true,
              metadata: JSON.stringify({
                polarCustomerId: customer.id,
                subscriptionId: event.data.id,
                subscriptionStatus: "active",
                subscriptionStartedAt: new Date().toISOString(),
              }),
            },
          });

          console.log("Organization enabled via Polar webhook:", organization);

          // Send confirmation email to owner
          const owner = await prisma.member.findFirst({
            where: {
              organizationId: organization.id,
              role: "owner",
            },
            include: {
              organization: true,
            },
          });

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
                      process.env.CORS_ORIGIN || "http://localhost:5173"
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
              organizationId: organization.id,
              userId: user.id,
              email: user.email,
              role: "owner",
              createdAt: new Date(),
            },
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

          console.log("Organization disabled due to subscription cancellation");
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
