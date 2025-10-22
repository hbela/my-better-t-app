import "dotenv/config";
import crypto from "crypto";
import { promisify } from "util";

const scrypt = promisify(crypto.scrypt);

async function verifyPassword() {
  const password = "newpassword123";
  const storedHash =
    "cf909e3392deaa24b8cc5ed391096681:ff7ebbdce15ef48bbdce6858f88831dbff29eaf0763509c731b9c8d5e68172ed519714dc97d5238f68961128f8455b8d4016564cfd60952e7e7d70379f36d1f7";

  try {
    // Split the stored hash into salt and hash
    const [salt, hash] = storedHash.split(":");

    console.log("🔍 Verifying password...");
    console.log("Password to verify:", password);
    console.log("Salt:", salt);
    console.log("Stored hash:", hash);
    console.log("Salt length:", salt.length);
    console.log("Hash length:", hash.length);

    // Recreate the hash with the same salt
    const buf = (await scrypt(password, salt, 64)) as Buffer;
    const computedHash = buf.toString("hex");

    console.log("\nComputed hash:", computedHash);
    console.log("Computed hash length:", computedHash.length);

    console.log("\nDo they match?", computedHash === hash);

    // Let's also try different buffer sizes
    console.log("\n🔬 Testing different scrypt parameters:");

    for (const keylen of [32, 64, 128]) {
      const testBuf = (await scrypt(password, salt, keylen)) as Buffer;
      const testHash = testBuf.toString("hex");
      console.log(
        `  keylen=${keylen}: ${testHash.substring(0, 40)}... (length: ${
          testHash.length
        })`
      );
      console.log(`    Matches: ${testHash === hash}`);
    }
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

verifyPassword();
