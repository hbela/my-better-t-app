import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import prisma from "@booking-for-all/db";
import { organization, admin, apiKey } from "better-auth/plugins";

// Log environment (loaded by server's dotenv/config)
// Never log DATABASE_URL itself: in deployed environments it is an Accelerate
// URL whose api_key is a live credential, and these lines go to the container
// log stream.
console.log(
  "🔐 Auth Package - DATABASE_URL:",
  process.env.DATABASE_URL ? "Set" : "Not set"
);
console.log(
  "🔐 Auth Package - BETTER_AUTH_SECRET:",
  process.env.BETTER_AUTH_SECRET ? "Set" : "Not set"
);
console.log("🔐 Auth Package - BETTER_AUTH_URL:", process.env.BETTER_AUTH_URL);

// Build trusted origins array - filter out empty strings and invalid URLs
const trustedOrigins: string[] = [];
if (process.env.CORS_ORIGIN) {
  trustedOrigins.push(process.env.CORS_ORIGIN);
}
if (process.env.FRONTEND_URL) {
  trustedOrigins.push(process.env.FRONTEND_URL);
}
if (process.env.BETTER_AUTH_URL) {
  trustedOrigins.push(process.env.BETTER_AUTH_URL);
}
// Filter out duplicates and empty strings
const uniqueTrustedOrigins = [
  ...new Set(trustedOrigins.filter((origin) => origin && origin.trim() !== "")),
];

console.log("🔐 Auth Package - Trusted Origins:", uniqueTrustedOrigins);
console.log("🔐 Auth Package - BETTER_AUTH_URL:", process.env.BETTER_AUTH_URL);

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET || process.env.AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  trustedOrigins:
    uniqueTrustedOrigins.length > 0 ? uniqueTrustedOrigins : undefined,
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      enabled: !!(
        process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ),
      prompt: "select_account",
    },
  },
  // Note: User creation hooks are handled via Prisma extensions in @booking-for-all/db
  // Session hooks and email notifications are handled in apps/server/src/plugins/authz.ts
  advanced: {
    defaultCookieAttributes: {
      // Use "none" when BETTER_AUTH_URL is HTTPS (ngrok or production)
      // Use "lax" only for pure localhost HTTP development
      sameSite: process.env.BETTER_AUTH_URL?.startsWith("https")
        ? "none"
        : process.env.NODE_ENV === "production"
          ? "none"
          : "lax",
      // Secure cookies required for HTTPS (ngrok or production)
      secure: process.env.BETTER_AUTH_URL?.startsWith("https")
        ? true
        : process.env.NODE_ENV === "production",
      httpOnly: true,
      // Don't set domain - let browser handle it automatically
      // This helps with cookie matching across different subdomains/ngrok URLs
    },
  },
  user: {
    additionalFields: {
      isSystemAdmin: {
        type: "boolean",
        defaultValue: false,
        required: false,
      },
      needsPasswordChange: {
        type: "boolean",
        defaultValue: false,
        required: false,
      },
      banned: {
        type: "boolean",
        defaultValue: false,
        required: false,
      },
      banReason: {
        type: "string",
        required: false,
      },
      banExpires: {
        type: "date",
        required: false,
      },
    },
  },
  plugins: [
    admin(),
    organization({
      allowUserToCreateOrganization: false, // Only admins can create organizations
      organizationLimit: 10, // Limit per user
    }),
    apiKey({
      enableMetadata: true,
    }),
  ],
  // NOTE: a `hooks.afterSignIn` handler used to live here. It was never a valid
  // better-auth option (only `before`/`after` exist), so it never ran. Removed.
  //
  // What it claimed to do, and where that actually happens now:
  //  - Org membership + activeOrganizationId on sign-in:
  //    handled by POST /api/members/:orgId/ensure, which the web client calls
  //    from the /login route's beforeLoad.
  //  - "Email/password sign-in is reserved for system admins":
  //    NOT ENFORCED anywhere. Note that /api/admin/organizations/create
  //    provisions org owners with a credential account + temporary password,
  //    so owners do rely on password sign-in. Enforcing that rule would
  //    require migrating existing owners to Google sign-in first.
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
});
