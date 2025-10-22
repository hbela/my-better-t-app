import "dotenv/config";
import { PrismaClient } from "@my-better-t-app/db/generated/client.js";
import { hashPassword } from "better-auth/crypto";

const prisma = new PrismaClient();

const email = "owner@test.com";
const newPassword = "TempPass2025!";

console.log("\n🔐 Updating password for:", email);
console.log("📝 New password:", newPassword);

async function updatePassword() {
  try {
    // Find the user
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        accounts: {
          where: {
            providerId: "credential",
          },
        },
      },
    });

    if (!user) {
      console.error("❌ User not found:", email);
      process.exit(1);
    }

    console.log("✅ Found user:", user.name);
    console.log("   Role:", user.role);

    if (user.accounts.length === 0) {
      console.error("❌ No credential account found");
      process.exit(1);
    }

    console.log("✅ Found account:", user.accounts[0].id);

    // Hash the password
    console.log("\n⏳ Hashing password with better-auth...");
    const hashedPassword = await hashPassword(newPassword);
    console.log("✅ Password hashed!");
    console.log("   Hash:", hashedPassword);
    console.log("   Length:", hashedPassword.length);

    // Update the password
    console.log("\n⏳ Updating password in database...");
    await prisma.account.update({
      where: {
        id: user.accounts[0].id,
      },
      data: {
        password: hashedPassword,
        updatedAt: new Date(),
      },
    });

    console.log("✅ Password updated successfully!");
    console.log("\n" + "=".repeat(60));
    console.log("📧 Email: owner@test.com");
    console.log("🔑 Password: TempPass2025!");
    console.log("=".repeat(60));
    console.log("\n✅ You can now login with these credentials!\n");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

updatePassword();
