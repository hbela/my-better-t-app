import "dotenv/config";
import { hashPassword } from "better-auth/crypto";

const password = "TempPass2025!";

console.log("\n🔐 Generating password hash...");
console.log("Password:", password);
console.log("\nGenerating hash using better-auth (scrypt)...\n");

hashPassword(password)
  .then((hash) => {
    console.log("✅ Password hash generated:");
    console.log("\n" + "=".repeat(80));
    console.log(hash);
    console.log("=".repeat(80));

    console.log("\n📝 SQL to update owner@test.com password:\n");
    console.log("UPDATE Account");
    console.log("SET password = '" + hash + "',");
    console.log("    updatedAt = datetime('now')");
    console.log(
      "WHERE userId = (SELECT id FROM User WHERE email = 'owner@test.com')"
    );
    console.log("AND providerId = 'credential';");

    console.log("\n✅ Temporary Password: TempPass2025!");
    console.log("✅ User: owner@test.com");
    console.log("✅ Hash method: better-auth (scrypt)");
    console.log("\n");
  })
  .catch((err) => {
    console.error("Error:", err);
  });
