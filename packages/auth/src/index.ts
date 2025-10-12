import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import prisma from "@my-better-t-app/db";
import { organization, admin } from "better-auth/plugins";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "sqlite",
  }),
  trustedOrigins: [process.env.CORS_ORIGIN || ""],
  emailAndPassword: {
    enabled: true,
  },
  advanced: {
    defaultCookieAttributes: {
      sameSite: "none",
      secure: true,
      httpOnly: true,
    },
  },
  user: {
    additionalFields: {
      systemRole: {
        type: "string",
        defaultValue: "USER",
        required: false,
      },
    },
  },
  plugins: [
    admin({
      roleField: "systemRole",
    }),
    organization({
      roles: {
        owner: {
          name: "owner",
          description: "Organization owner with full access",
        },
        provider: {
          name: "provider",
          description: "Service provider (doctor) who can manage events",
        },
        member: {
          name: "member",
          description: "Patient who can book appointments",
        },
      },
    }),
  ],
});
