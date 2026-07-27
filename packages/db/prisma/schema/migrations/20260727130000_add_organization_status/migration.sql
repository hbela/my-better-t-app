-- Adds the OrganizationStatus enum and organization.status, plus the two
-- subscription cancellation fields. These were introduced into schema.prisma
-- via `prisma db push` and never captured as a migration, so any database
-- built from migrations alone is missing them (P2022 on organization.status).

-- CreateEnum
CREATE TYPE "OrganizationStatus" AS ENUM (
  'PENDING',
  'SUBSCRIBED',
  'SUBSCRIPTION_DELETED',
  'PAYMENT_FAILED',
  'SUSPENDED',
  'REFUND_REQUESTED'
);

-- AlterTable
ALTER TABLE "organization" ADD COLUMN     "status" "OrganizationStatus" NOT NULL DEFAULT 'PENDING';

-- `enabled` was the pre-status signal for a paid organization, so carry it
-- across instead of resetting existing paying orgs to PENDING.
UPDATE "organization" SET "status" = 'SUBSCRIBED' WHERE "enabled" = true;

-- AlterTable
ALTER TABLE "subscription" ADD COLUMN     "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "cancelAt" TIMESTAMP(3);
