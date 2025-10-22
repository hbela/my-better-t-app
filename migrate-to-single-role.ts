import "dotenv/config";
import prisma from "./packages/db/src/index.js";

/**
 * Migration Script: Consolidate Role Management
 *
 * This script migrates from the old dual-role system to the new simplified system:
 * OLD: systemRole (ADMIN/USER) + Member.role (owner/provider/member)
 * NEW: User.role (ADMIN/OWNER/PROVIDER/CLIENT)
 *
 * Migration Logic:
 * 1. ADMIN systemRole → ADMIN role
 * 2. USER with Provider record → PROVIDER role
 * 3. USER with Member record (role="owner") → OWNER role
 * 4. USER with no special privileges → CLIENT role
 */

interface MigrationStats {
  total: number;
  admin: number;
  owner: number;
  provider: number;
  client: number;
  errors: number;
}

async function migrateRoles() {
  console.log("\n🚀 Starting Role Migration");
  console.log("=".repeat(60));

  const stats: MigrationStats = {
    total: 0,
    admin: 0,
    owner: 0,
    provider: 0,
    client: 0,
    errors: 0,
  };

  try {
    // Fetch all users with their relationships
    const users = await prisma.user.findMany({
      include: {
        providers: true,
        members: true,
      },
    });

    console.log(`\n📊 Found ${users.length} users to migrate\n`);
    stats.total = users.length;

    for (const user of users) {
      try {
        // @ts-ignore - accessing old fields
        const oldSystemRole = user.systemRole || "USER";
        // @ts-ignore
        const oldRole = user.role || "user";

        let newRole: string;

        // Priority order for role assignment:
        // 1. ADMIN (if systemRole was ADMIN)
        // 2. PROVIDER (if user has Provider record)
        // 3. OWNER (if user has Member record with role="owner")
        // 4. CLIENT (default)

        if (oldSystemRole === "ADMIN") {
          newRole = "ADMIN";
          stats.admin++;
          console.log(`✅ ${user.email} → ADMIN (was admin)`);
        } else if (user.providers && user.providers.length > 0) {
          newRole = "PROVIDER";
          stats.provider++;
          console.log(
            `✅ ${user.email} → PROVIDER (has ${user.providers.length} provider record(s))`
          );
        } else if (
          user.members &&
          user.members.some((m: any) => m.role === "owner")
        ) {
          newRole = "OWNER";
          stats.owner++;
          const ownedOrgs = user.members.filter(
            (m: any) => m.role === "owner"
          ).length;
          console.log(
            `✅ ${user.email} → OWNER (owns ${ownedOrgs} organization(s))`
          );
        } else {
          newRole = "CLIENT";
          stats.client++;
          console.log(`✅ ${user.email} → CLIENT (regular user)`);
        }

        // Note: We can't update yet because schema hasn't been migrated
        // This script will output the mapping that will be applied

        console.log(`   Old: systemRole=${oldSystemRole}, role=${oldRole}`);
        console.log(`   New: role=${newRole}`);
        console.log("");
      } catch (error) {
        console.error(`❌ Error processing user ${user.email}:`, error);
        stats.errors++;
      }
    }

    // Summary
    console.log("\n" + "=".repeat(60));
    console.log("📊 Migration Summary:");
    console.log("=".repeat(60));
    console.log(`Total Users:     ${stats.total}`);
    console.log(`→ ADMIN:         ${stats.admin}`);
    console.log(`→ OWNER:         ${stats.owner}`);
    console.log(`→ PROVIDER:      ${stats.provider}`);
    console.log(`→ CLIENT:        ${stats.client}`);
    console.log(`Errors:          ${stats.errors}`);
    console.log("=".repeat(60));

    // Generate SQL for manual migration
    console.log("\n📝 SQL Commands to Execute:");
    console.log("=".repeat(60));
    console.log("\n-- Step 1: Add role column temporarily");
    console.log("-- (Will be done by Prisma migrate)");

    console.log("\n-- Step 2: Migrate data");
    console.log("-- ADMIN users");
    console.log("UPDATE User SET role = 'ADMIN' WHERE systemRole = 'ADMIN';");

    console.log("\n-- PROVIDER users");
    console.log(
      "UPDATE User SET role = 'PROVIDER' WHERE id IN (SELECT DISTINCT userId FROM Provider);"
    );

    console.log("\n-- OWNER users");
    console.log(
      "UPDATE User SET role = 'OWNER' WHERE id IN (SELECT DISTINCT userId FROM Member WHERE role = 'owner') AND role != 'PROVIDER' AND role != 'ADMIN';"
    );

    console.log("\n-- CLIENT users (everyone else)");
    console.log(
      "UPDATE User SET role = 'CLIENT' WHERE role IS NULL OR role = 'user' OR role = 'USER';"
    );

    console.log("\n-- Step 3: Remove old columns");
    console.log("-- (Will be done by Prisma migrate)");
    console.log("-- ALTER TABLE User DROP COLUMN systemRole;");
    console.log("-- ALTER TABLE Member DROP COLUMN role;");
    console.log("-- ALTER TABLE Invitation DROP COLUMN role;");

    console.log("\n=".repeat(60));
    console.log("\n✅ Migration plan generated successfully!");
    console.log("\n⚠️  NEXT STEPS:");
    console.log("1. Review the migration plan above");
    console.log(
      "2. Run: cd packages/db && pnpm prisma migrate dev --name simplify-role-management"
    );
    console.log("3. The migration will apply these changes automatically");
    console.log("4. Update application code to use new role system");
    console.log("=".repeat(60) + "\n");
  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
migrateRoles();
