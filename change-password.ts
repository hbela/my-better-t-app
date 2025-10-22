import "dotenv/config";
import prisma from "../../packages/db/src/index.js";
import { hashPassword } from "better-auth/crypto";

async function changePassword() {
  const email = "owner@test.com";
  const newPassword = "TempPass2025!"; // Temporary password for owner@test.com

  try {
    // Find the user
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        accounts: {
          where: {
            providerId: "credential", // better-auth uses "credential" for email/password
          },
        },
      },
    });

    if (!user) {
      console.error(`❌ User with email ${email} not found`);
      process.exit(1);
    }

    console.log(`✅ Found user: ${user.name} (${user.email})`);

    if (user.accounts.length === 0) {
      console.error(`❌ No credential account found for ${email}`);
      process.exit(1);
    }

    // Hash the new password using better-auth's hashPassword (scrypt)
    const hashedPassword = await hashPassword(newPassword);

    // Update the password
    await prisma.account.update({
      where: {
        id: user.accounts[0].id,
      },
      data: {
        password: hashedPassword,
        updatedAt: new Date(),
      },
    });

    console.log(`✅ Password changed successfully for ${email}`);
    console.log(`   New password: ${newPassword}`);
    console.log(`   Hashed: ${hashedPassword.substring(0, 20)}...`);
    console.log(`   Hash method: better-auth (scrypt)`);
  } catch (error) {
    console.error("❌ Error changing password:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

changePassword();
