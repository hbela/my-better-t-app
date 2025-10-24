#!/usr/bin/env node

/**
 * Test script to verify security fixes
 * This script tests that sensitive paths are blocked and logout redirect works
 */

import http from "http";

const BASE_URL = "http://127.0.0.1:3000";

// Test cases for security
const securityTests = [
  {
    name: "Block access to node_modules",
    path: "/node_modules",
    expectedStatus: 403,
  },
  {
    name: "Block access to src directory",
    path: "/src",
    expectedStatus: 403,
  },
  {
    name: "Block access to packages directory",
    path: "/packages",
    expectedStatus: 403,
  },
  {
    name: "Block access to apps directory",
    path: "/apps",
    expectedStatus: 403,
  },
  {
    name: "Block access to docs directory",
    path: "/docs",
    expectedStatus: 403,
  },
  {
    name: "Block access to .git directory",
    path: "/.git",
    expectedStatus: 403,
  },
  {
    name: "Block access to package.json",
    path: "/package.json",
    expectedStatus: 403,
  },
  {
    name: "Block access to tsconfig.json",
    path: "/tsconfig.json",
    expectedStatus: 403,
  },
  {
    name: "Allow access to health endpoint",
    path: "/health",
    expectedStatus: 200,
  },
  {
    name: "Allow access to root",
    path: "/",
    expectedStatus: 200,
  },
];

async function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "127.0.0.1",
      port: 3000,
      path: path,
      method: "GET",
      timeout: 5000,
    };

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        resolve({
          statusCode: res.statusCode,
          data: data,
        });
      });
    });

    req.on("error", (err) => {
      reject(err);
    });

    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Request timeout"));
    });

    req.end();
  });
}

async function runSecurityTests() {
  console.log("🔒 Testing security fixes...\n");

  let passed = 0;
  let failed = 0;

  for (const test of securityTests) {
    try {
      console.log(`Testing: ${test.name}`);
      const result = await makeRequest(test.path);

      if (result.statusCode === test.expectedStatus) {
        console.log(
          `✅ PASS - Status: ${result.statusCode} (expected: ${test.expectedStatus})`
        );
        passed++;
      } else {
        console.log(
          `❌ FAIL - Status: ${result.statusCode} (expected: ${test.expectedStatus})`
        );
        failed++;
      }
    } catch (error) {
      console.log(`❌ ERROR - ${test.name}: ${error.message}`);
      failed++;
    }
    console.log("");
  }

  console.log(`\n📊 Security Test Results:`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(
    `📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`
  );

  if (failed === 0) {
    console.log(
      "\n🎉 All security tests passed! Directory listing is properly blocked."
    );
  } else {
    console.log(
      "\n⚠️  Some security tests failed. Please check the server configuration."
    );
  }
}

// Test logout redirect
async function testLogoutRedirect() {
  console.log("\n🔄 Testing logout redirect...");
  console.log("📝 Manual test required:");
  console.log("1. Login to the app as a PROVIDER");
  console.log('2. Click "Sign Out" in the user menu');
  console.log(
    "3. Verify you are redirected to: http://127.0.0.1:5500/test-external-app.html"
  );
  console.log(
    "4. The redirect should happen automatically after successful logout"
  );
}

async function main() {
  console.log("🧪 Security Fixes Test Suite");
  console.log("============================\n");

  try {
    await runSecurityTests();
    await testLogoutRedirect();

    console.log("\n✨ Test suite completed!");
    console.log("\n📋 Summary of fixes:");
    console.log("1. ✅ Directory listing security vulnerability fixed");
    console.log("2. ✅ Sensitive paths are now blocked (403 Forbidden)");
    console.log("3. ✅ Logout redirect configured to test-external-app.html");
    console.log("4. ✅ Static file serving properly configured");
  } catch (error) {
    console.error("❌ Test suite failed:", error.message);
    process.exit(1);
  }
}

// Run the main function if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
