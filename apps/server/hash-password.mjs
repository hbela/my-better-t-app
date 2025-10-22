import { hashPassword } from "better-auth/crypto";

const password = "TempPass2025!";

console.log("\n🔐 Generating password hash for owner@test.com");
console.log("📝 Password:", password);
console.log("\n⏳ Hashing...\n");

hashPassword(password)
  .then((hash) => {
    console.log("✅ Hash Generated!");
    console.log("=".repeat(100));
    console.log(hash);
    console.log("=".repeat(100));

    console.log("\n💾 SQL Command:\n");
    console.log("UPDATE Account");
    console.log("SET password = '" + hash + "',");
    console.log("    updatedAt = datetime('now')");
    console.log(
      "WHERE userId = (SELECT id FROM User WHERE email = 'owner@test.com')"
    );
    console.log("AND providerId = 'credential';");

    console.log("\n✅ TEMPORARY CREDENTIALS:");
    console.log("   📧 Email: owner@test.com");
    console.log("   🔑 Password: TempPass2025!");
    console.log("\n");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Error:", err);
    process.exit(1);
  });
