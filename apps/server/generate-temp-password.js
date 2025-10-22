import "dotenv/config";
import { hashPassword } from "better-auth/crypto";

const email = "owner@test.com";
const tempPassword = "TempPass2025!";

console.log("\n🔐 Generating password for:", email);
console.log("📝 Temporary Password:", tempPassword);
console.log("\n⏳ Hashing with better-auth (scrypt)...\n");

hashPassword(tempPassword)
  .then((hash) => {
    console.log("✅ Password Hash Generated:");
    console.log("=".repeat(100));
    console.log(hash);
    console.log("=".repeat(100));

    console.log("\n💾 SQL Command to Update Database:\n");
    console.log(
      "-- Run this in your SQLite database (C:/sqlite/db/express.db)"
    );
    console.log("");
    console.log("UPDATE Account");
    console.log("SET password = '" + hash + "',");
    console.log("    updatedAt = datetime('now')");
    console.log(
      "WHERE userId = (SELECT id FROM User WHERE email = 'owner@test.com')"
    );
    console.log("AND providerId = 'credential';");
    console.log("");

    console.log("\n✅ CREDENTIALS:");
    console.log("   Email: owner@test.com");
    console.log("   Password: TempPass2025!");
    console.log("   Hash Method: better-auth (scrypt)");
    console.log("\n");
  })
  .catch((err) => {
    console.error("❌ Error generating hash:", err);
  });
