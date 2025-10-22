# Quick Test Commands

## 🚀 Start Server

```bash
pnpm --filter server dev
```

---

## 🧪 Run Tests

```bash
# Run all tests once
pnpm --filter server test:run

# Watch mode (re-runs on file changes)
pnpm --filter server test

# With UI (visual test runner)
pnpm --filter server test:ui
```

---

## 📮 Postman Setup

1. Import: `docs/POSTMAN_COLLECTION.json`
2. Create environment with:
   - `baseUrl`: http://localhost:3000
   - `adminToken`: (get after login)
   - `ownerToken`: (get after login)
   - `organizationId`: (get after creation)

---

## 🔑 Create Admin User

```bash
sqlite3 C:/sqlite/db/booking.db
```

```sql
-- Create or update user to admin
UPDATE user SET systemRole = 'ADMIN' WHERE email = 'your-email@test.com';

-- Verify
SELECT id, email, systemRole FROM user WHERE systemRole = 'ADMIN';

.quit
```

---

## 🧪 Quick Test Flow

### 1. Health Check
```bash
curl http://localhost:3000/health
```

### 2. Create User (Admin)
```bash
curl -X POST http://localhost:3000/api/admin/users \
  -H "Content-Type: application/json" \
  -H "Cookie: better-auth.session_token=ADMIN_TOKEN" \
  -d '{
    "name": "Test Owner",
    "email": "owner@test.com"
  }'
```

### 3. Create Organization (Admin)
```bash
curl -X POST http://localhost:3000/api/admin/organizations/create \
  -H "Content-Type: application/json" \
  -H "Cookie: better-auth.session_token=ADMIN_TOKEN" \
  -d '{
    "name": "Test Hospital",
    "slug": "test-hospital",
    "ownerId": "USER_ID"
  }'
```

### 4. Simulate Webhook (Enable Org)
```bash
curl -X POST http://localhost:3000/api/webhooks/polar \
  -H "Content-Type: application/json" \
  -d '{
    "type": "subscription.created",
    "data": {
      "customer": {"id": "1", "email": "owner@test.com"},
      "metadata": {"organizationId": "ORG_ID"}
    }
  }'
```

### 5. Check Subscription Status
```bash
curl http://localhost:3000/api/organizations/ORG_ID/subscription \
  -H "Cookie: better-auth.session_token=OWNER_TOKEN"
```

### 6. Create Department
```bash
curl -X POST http://localhost:3000/api/departments \
  -H "Content-Type: application/json" \
  -H "Cookie: better-auth.session_token=OWNER_TOKEN" \
  -d '{
    "name": "Cardiology",
    "organizationId": "ORG_ID"
  }'
```

---

## 📊 Database Queries

```bash
sqlite3 C:/sqlite/db/booking.db
```

```sql
-- Check users
SELECT id, email, needsPasswordChange, systemRole FROM user;

-- Check organizations
SELECT id, name, slug, enabled FROM organization;

-- Check members
SELECT * FROM member WHERE organizationId = 'ORG_ID';

-- Check departments
SELECT * FROM department WHERE organizationId = 'ORG_ID';

-- Check providers
SELECT * FROM provider;

-- Check events
SELECT id, title, start, isBooked FROM event;

-- Check bookings
SELECT * FROM booking;
```

---

## 🔍 Debug Server

```bash
# Check server logs
# Server outputs all requests and errors to console

# Check database
pnpm --filter @my-better-t-app/db db:studio
# Opens at http://localhost:5555
```

---

## 📝 Test Checklist

```bash
# 1. Server running
pnpm --filter server dev

# 2. Database accessible
sqlite3 C:/sqlite/db/booking.db "SELECT COUNT(*) FROM user;"

# 3. Admin user exists
sqlite3 C:/sqlite/db/booking.db "SELECT * FROM user WHERE systemRole='ADMIN';"

# 4. Health check works
curl http://localhost:3000/health

# 5. Resend API key set
echo $RESEND_API_KEY  # or check .env file
```

---

## 🎯 Full Test Flow

```bash
# Terminal 1: Start server
pnpm --filter server dev

# Terminal 2: Run tests
pnpm --filter server test:run

# Or use Postman:
# 1. Import collection
# 2. Follow step-by-step in TESTING_GUIDE.md
```

---

## 📚 Documentation

- **Full Guide:** `docs/TESTING_GUIDE.md`
- **API Reference:** `docs/API.md`
- **Onboarding Flow:** `docs/NEW_ONBOARDING_FLOW.md`
- **Quick Reference:** `docs/QUICK_REFERENCE.md`

