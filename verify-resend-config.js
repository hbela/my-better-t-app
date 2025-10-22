import "dotenv/config";

console.log("\n🔍 Checking Resend Configuration\n");
console.log("=".repeat(60));

// Check if API key is set
const apiKey = process.env.RESEND_API_KEY;
console.log("RESEND_API_KEY set:", !!apiKey);

if (apiKey) {
  console.log(
    "API Key preview:",
    apiKey.substring(0, 10) + "..." + apiKey.substring(apiKey.length - 4)
  );
  console.log("API Key length:", apiKey.length);
  console.log("Starts with 're_':", apiKey.startsWith("re_"));
} else {
  console.log("❌ RESEND_API_KEY is NOT set!");
}

console.log("\nRESEND_FROM_EMAIL:", process.env.RESEND_FROM_EMAIL || "Not set");
console.log("CORS_ORIGIN:", process.env.CORS_ORIGIN || "Not set");
console.log("FRONTEND_URL:", process.env.FRONTEND_URL || "Not set");

console.log("=".repeat(60));

// Test Resend API connection
if (apiKey) {
  console.log("\n🧪 Testing Resend API...\n");

  fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
      to: "test@example.com", // This will fail but we can see the error
      subject: "Test Email",
      html: "<p>Test</p>",
    }),
  })
    .then((res) => res.json())
    .then((data) => {
      console.log("Resend API Response:", JSON.stringify(data, null, 2));

      if (data.id) {
        console.log("\n✅ Resend API is working!");
        console.log("Test email ID:", data.id);
        console.log("\n📝 Check this email in your Resend dashboard:");
        console.log("https://resend.com/emails/" + data.id);
      } else if (data.message) {
        console.log("\n⚠️ Resend returned error:", data.message);

        if (data.message.includes("API")) {
          console.log("\n❌ API key might be invalid!");
          console.log("1. Go to https://resend.com/api-keys");
          console.log("2. Check if your key is active");
          console.log("3. Regenerate if needed");
        }

        if (data.message.includes("domain")) {
          console.log("\n⚠️ Domain verification issue");
          console.log("Switch to: RESEND_FROM_EMAIL=onboarding@resend.dev");
        }
      }
    })
    .catch((err) => {
      console.error("\n❌ Failed to connect to Resend:", err.message);
    });
}

console.log("\n");
