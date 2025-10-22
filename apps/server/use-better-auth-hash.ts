import "dotenv/config";
import prisma from "../../packages/db/src/index.js";

// Try to import better-auth's crypto utilities
async function useBetterAuthHash() {
  try {
    // Import better-auth's crypto module
    const betterAuthCrypto = await import("better-auth/crypto");
    console.log("✅ Found better-auth crypto module");
    console.log("Exported functions:", Object.keys(betterAuthCrypto));

    if (betterAuthCrypto.hashPassword) {
      const password = "newpassword123";
      const hashedPassword = await betterAuthCrypto.hashPassword(password);
      console.log("\n🔐 Hashed password:", hashedPassword);
      console.log("Hash length:", hashedPassword.length);

      // Update the owner password
      const user = await prisma.user.findUnique({
        where: { email: "owner@test.com" },
        include: {
          accounts: {
            where: { providerId: "credential" },
          },
        },
      });

      if (user && user.accounts.length > 0) {
        await prisma.account.update({
          where: { id: user.accounts[0].id },
          data: {
            password: hashedPassword,
            updatedAt: new Date(),
          },
        });
        console.log("✅ Password updated using better-auth's hash function!");
      }
    }
  } catch (error) {
    console.error("❌ Error:", error);
    console.log(
      "\nLet's try checking what's available in better-auth package..."
    );

    try {
      const betterAuth = await import("better-auth");
      console.log("\nbetter-auth exports:", Object.keys(betterAuth));
    } catch (e) {
      console.error("Can't import better-auth:", e);
    }
  } finally {
    await prisma.$disconnect();
  }
}

useBetterAuthHash();
