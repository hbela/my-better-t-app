import "dotenv/config";
import prisma from "./packages/db/src/index.js";

async function checkAndFixUserRole() {
  const email = "elysprovider1@gmail.com";

  try {
    // Find the user with all their relationships
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        members: {
          include: {
            organization: true,
          },
        },
        providerProfile: {
          include: {
            department: {
              include: {
                organization: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      console.error(`❌ User with email ${email} not found`);
      process.exit(1);
    }

    console.log("\n📋 Current User Information:");
    console.log("═".repeat(50));
    console.log(`Name: ${user.name}`);
    console.log(`Email: ${user.email}`);
    console.log(`System Role: ${user.systemRole}`);
    console.log(`Email Verified: ${user.emailVerified}`);
    console.log(`Created: ${user.createdAt}`);

    console.log("\n📊 Organization Memberships:");
    console.log("═".repeat(50));
    if (user.members.length === 0) {
      console.log("No organization memberships found");
    } else {
      user.members.forEach((member, index) => {
        console.log(
          `\n${index + 1}. Organization: ${member.organization.name}`
        );
        console.log(`   Role: ${member.role}`);
        console.log(`   Organization ID: ${member.organizationId}`);
        console.log(`   Member Since: ${member.createdAt}`);
      });
    }

    console.log("\n👨‍⚕️ Provider Profile:");
    console.log("═".repeat(50));
    if (user.providerProfile.length === 0) {
      console.log("Not a provider");
    } else {
      user.providerProfile.forEach((provider, index) => {
        console.log(`\n${index + 1}. Provider ID: ${provider.id}`);
        console.log(`   Department: ${provider.department.name}`);
        console.log(
          `   Organization: ${provider.department.organization.name}`
        );
      });
    }

    // Check what needs to be fixed
    console.log("\n\n🔧 Issues Found:");
    console.log("═".repeat(50));

    let needsFix = false;

    if (user.systemRole !== "USER") {
      console.log(`❌ System Role is ${user.systemRole} (should be USER)`);
      needsFix = true;
    } else {
      console.log(`✅ System Role is correct: USER`);
    }

    const ownerMemberships = user.members.filter((m) => m.role === "owner");
    if (ownerMemberships.length > 0) {
      console.log(
        `⚠️  User has ${ownerMemberships.length} owner role(s) in organizations:`
      );
      ownerMemberships.forEach((m) => {
        console.log(`   - ${m.organization.name}`);
      });
      needsFix = true;
    }

    if (!needsFix) {
      console.log("\n✅ No issues found! User roles are correct.");
      return;
    }

    // Offer to fix
    console.log("\n\n🛠️  Would you like to fix these issues?");
    console.log("This script will:");
    if (user.systemRole !== "USER") {
      console.log("1. Change systemRole to USER");
    }
    if (ownerMemberships.length > 0) {
      console.log("2. Change organization role(s) from 'owner' to 'provider'");
    }

    // Uncomment the following to auto-fix:
    const autoFix = true; // Set to true to automatically fix

    if (autoFix) {
      console.log("\n🔄 Applying fixes...\n");

      // Fix system role
      if (user.systemRole !== "USER") {
        await prisma.user.update({
          where: { id: user.id },
          data: { systemRole: "USER" },
        });
        console.log("✅ Updated systemRole to USER");
      }

      // Fix organization roles
      for (const member of ownerMemberships) {
        await prisma.member.update({
          where: { id: member.id },
          data: { role: "provider" },
        });
        console.log(
          `✅ Updated role to 'provider' in ${member.organization.name}`
        );
      }

      console.log("\n✅ All fixes applied successfully!");
      console.log("\nUser can now:");
      console.log("- Access provider calendar");
      console.log("- Create availability slots");
      console.log("- View their bookings");
    } else {
      console.log(
        "\n⚠️  Auto-fix is disabled. Set autoFix = true to apply changes."
      );
    }
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

checkAndFixUserRole();
