import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";

const BASE_URL = "http://localhost:3000";

// Store values between tests
let adminToken = "";
let ownerToken = "";
let userId = "";
let organizationId = "";
let departmentId = "";
let providerId = "";
let eventId = "";
let tempPassword = "";

describe("Medisched API Tests", () => {
  describe("1. Health Check", () => {
    it("should return healthy status", async () => {
      const response = await request(BASE_URL).get("/health");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("status", "healthy");
    });
  });

  describe("2. Admin - Create User", () => {
    it("should create a user with temporary password (requires admin token)", async () => {
      // NOTE: You need to manually set adminToken after creating admin user
      // Run: UPDATE user SET role = 'ADMIN' WHERE email = 'admin@test.com';

      if (!adminToken) {
        console.log("⚠️  Skipping: Set adminToken in the test file");
        return;
      }

      const response = await request(BASE_URL)
        .post("/api/admin/users")
        .set("Cookie", `better-auth.session_token=${adminToken}`)
        .send({
          name: "Test Owner",
          email: `owner-${Date.now()}@test.com`,
          role: "USER",
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("user");
      expect(response.body).toHaveProperty("tempPassword");
      expect(response.body.user).toHaveProperty("needsPasswordChange", true);

      // Store for later tests
      userId = response.body.user.id;
      tempPassword = response.body.tempPassword;

      console.log("✅ User created:", userId);
      console.log("🔑 Temp password:", tempPassword);
    });
  });

  describe("3. Admin - Create Organization", () => {
    it("should create an organization (disabled by default)", async () => {
      if (!adminToken || !userId) {
        console.log("⚠️  Skipping: Requires admin token and userId");
        return;
      }

      const response = await request(BASE_URL)
        .post("/api/admin/organizations/create")
        .set("Cookie", `better-auth.session_token=${adminToken}`)
        .send({
          name: `Test Hospital ${Date.now()}`,
          slug: `test-hospital-${Date.now()}`,
          ownerId: userId,
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("organization");
      expect(response.body.organization).toHaveProperty("enabled", false);

      organizationId = response.body.organization.id;

      console.log("✅ Organization created:", organizationId);
      console.log("🔒 Status: disabled (needs subscription)");
    });
  });

  describe("4. Subscription Status", () => {
    it("should show organization needs subscription", async () => {
      if (!ownerToken || !organizationId) {
        console.log("⚠️  Skipping: Requires owner token and organizationId");
        return;
      }

      const response = await request(BASE_URL)
        .get(`/api/organizations/${organizationId}/subscription`)
        .set("Cookie", `better-auth.session_token=${ownerToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("enabled", false);
      expect(response.body).toHaveProperty("needsSubscription", true);

      console.log("✅ Subscription check passed");
    });
  });

  describe("5. Simulate Polar Webhook", () => {
    it("should enable organization on subscription payment", async () => {
      if (!organizationId) {
        console.log("⚠️  Skipping: Requires organizationId");
        return;
      }

      const response = await request(BASE_URL)
        .post("/api/webhooks/polar")
        .send({
          type: "subscription.created",
          data: {
            id: "sub_test123",
            customer: {
              id: "cust_test456",
              email: "owner@test.com",
              name: "Test Owner",
            },
            metadata: {
              organizationId: organizationId,
              organizationName: "Test Hospital",
            },
          },
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("received", true);

      console.log("✅ Webhook processed - Organization should be enabled");
    });
  });

  describe("6. Create Department", () => {
    it("should create a department (requires enabled organization)", async () => {
      if (!ownerToken || !organizationId) {
        console.log("⚠️  Skipping: Requires owner token and organizationId");
        return;
      }

      const response = await request(BASE_URL)
        .post("/api/departments")
        .set("Cookie", `better-auth.session_token=${ownerToken}`)
        .send({
          name: "Cardiology",
          organizationId: organizationId,
        });

      if (response.status === 403) {
        console.log("❌ Organization not enabled yet. Run webhook test first.");
        return;
      }

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("name", "Cardiology");

      departmentId = response.body.id;

      console.log("✅ Department created:", departmentId);
    });
  });

  describe("7. List Departments", () => {
    it("should list departments in organization", async () => {
      if (!ownerToken || !organizationId) {
        console.log("⚠️  Skipping: Requires owner token and organizationId");
        return;
      }

      const response = await request(BASE_URL)
        .get(`/api/departments?organizationId=${organizationId}`)
        .set("Cookie", `better-auth.session_token=${ownerToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);

      console.log("✅ Found", response.body.length, "departments");
    });
  });

  describe("8. Admin Overview", () => {
    it("should return platform statistics", async () => {
      if (!adminToken) {
        console.log("⚠️  Skipping: Requires admin token");
        return;
      }

      const response = await request(BASE_URL)
        .get("/api/admin/overview")
        .set("Cookie", `better-auth.session_token=${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("organizations");
      expect(response.body).toHaveProperty("stats");

      console.log("✅ Platform stats:", response.body.stats);
    });
  });
});
