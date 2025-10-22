# Testing Guide - Medisched API

## 🎯 Overview

This guide covers both **manual testing with Postman** and **automated testing with Vitest**.

---

## 📮 Option 1: Postman Testing (Recommended for Quick Start)

### Setup

1. **Import the Collection**
   - Open Postman
   - Click "Import"
   - Select `docs/POSTMAN_COLLECTION.json`
   - Collection will be imported with all endpoints

2. **Set Environment Variables**
   - Create new environment "Medisched Local"
   - Add variables:
     ```
     baseUrl: http://localhost:3000
     adminToken: (will get after login)
     ownerToken: (will get after login)
     organizationId: (will get after creation)
     userId: (will get after user creation)
     departmentId: (will get after department creation)
     ```

3. **Start the Server**
   ```bash
   pnpm --filter server dev
   ```

---

### Step-by-Step Testing Flow

#### **Step 1: Create Admin User**

```bash
# In your terminal, create an admin user in the database
sqlite3 C:/sqlite/db/booking.db

# SQL commands:
-- First, sign up a user via Better Auth (or create manually)
-- Then make them admin:
UPDATE user SET systemRole = 'ADMIN' WHERE email = 'admin@test.com';

-- Verify:
SELECT id, email, systemRole FROM user WHERE systemRole = 'ADMIN';

.quit
```

#### **Step 2: Login as Admin (via Better Auth)**

Since Better Auth handles authentication, you'll need to:
1. Use Better Auth's login endpoint
2. Extract the session token from cookies
3. Add to Postman environment as `adminToken`

**Quick way:**
```bash
# Login via curl and extract cookie
curl -X POST http://localhost:3000/api/auth/sign-in/email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "your-password"
  }' \
  -v 2>&1 | grep "Set-Cookie"

# Copy the better-auth.session_token value
```

#### **Step 3: Test Health Check**

In Postman:
- Click "Health Check" request
- Click "Send"
- Should return: `{ "status": "healthy", ... }`

✅ **Expected:** 200 OK

---

#### **Step 4: Create User with Temporary Password**

In Postman:
- Open "Admin Endpoints" → "1. Create User with Temp Password"
- Make sure `adminToken` is set in environment
- Click "Send"

**Response:**
```json
{
  "user": {
    "id": "user_abc123",
    "name": "Test Owner",
    "email": "owner@test.com",
    "needsPasswordChange": true
  },
  "tempPassword": "x9k2mf7pqhAa1!"
}
```

✅ **Expected:** 201 Created  
📝 **Save:** Copy `user.id` to `userId` variable  
📧 **Check:** Email should be sent to owner

---

#### **Step 5: Create Organization**

In Postman:
- Open "Admin Endpoints" → "2. Create Organization"
- Update body with `userId` from Step 4
- Click "Send"

**Response:**
```json
{
  "organization": {
    "id": "org_xyz789",
    "name": "Test Hospital",
    "slug": "test-hospital",
    "enabled": false
  },
  "message": "Organization created. Owner notified to complete subscription."
}
```

✅ **Expected:** 201 Created  
📝 **Save:** Copy `organization.id` to `organizationId` variable  
📧 **Check:** Email should be sent to owner

---

#### **Step 6: Owner Logs In**

The owner needs to:
1. Login with email and temporary password
2. System will detect `needsPasswordChange: true`
3. Must change password before proceeding

**Test password change needed:**
- Open "Authentication" → "Check Password Change Needed"
- Use owner's session token
- Should return: `{ "needsPasswordChange": true }`

**Update password:**
- Open "Authentication" → "Update Password"
- Send with new password
- Should return: `{ "success": true }`

---

#### **Step 7: Check Subscription Status**

In Postman:
- Open "Subscription" → "Get Subscription Status"
- Use `ownerToken` and `organizationId`
- Click "Send"

**Response:**
```json
{
  "enabled": false,
  "subscriptionActive": false,
  "needsSubscription": true
}
```

✅ **Expected:** Organization is disabled

---

#### **Step 8: Simulate Polar Webhook (Enable Organization)**

In Postman:
- Open "Webhooks" → "Simulate Polar Webhook - Enable Org"
- Update `organizationId` in body
- Click "Send"

**Response:**
```json
{
  "received": true
}
```

✅ **Expected:** 200 OK  
📧 **Check:** Activation email sent to owner  
🔓 **Result:** Organization is now enabled

---

#### **Step 9: Verify Organization Enabled**

In Postman:
- Run "Get Subscription Status" again
- Should now return:

```json
{
  "enabled": true,
  "subscriptionActive": true,
  "needsSubscription": false
}
```

✅ **Expected:** Organization is enabled

---

#### **Step 10: Create Department**

In Postman:
- Open "Departments" → "Create Department"
- Use `ownerToken` and `organizationId`
- Click "Send"

**Response:**
```json
{
  "id": "dept_123",
  "name": "Cardiology",
  "organizationId": "org_xyz789"
}
```

✅ **Expected:** 201 Created  
📝 **Save:** Copy `id` to `departmentId` variable

---

#### **Step 11: List Departments**

In Postman:
- Open "Departments" → "List Departments"
- Should show all departments

✅ **Expected:** Array of departments

---

#### **Step 12: Test Complete Flow**

Continue testing:
- Assign providers
- Create events
- Book appointments
- Verify emails

---

## 🧪 Option 2: Vitest Automated Testing

### Setup

Tests are already configured! Just need to:

1. **Start the server** (in one terminal):
   ```bash
   pnpm --filter server dev
   ```

2. **Update test file** with tokens:
   Edit `apps/server/src/__tests__/api.test.ts`:
   ```typescript
   let adminToken = 'YOUR_ADMIN_SESSION_TOKEN';
   let ownerToken = 'YOUR_OWNER_SESSION_TOKEN';
   ```

3. **Run tests**:
   ```bash
   # Run once
   pnpm --filter server test:run

   # Watch mode
   pnpm --filter server test

   # With UI
   pnpm --filter server test:ui
   ```

---

### Test Output

```
✓ 1. Health Check (50ms)
✓ 2. Admin - Create User (150ms)
✓ 3. Admin - Create Organization (120ms)
✓ 4. Subscription Status (80ms)
✓ 5. Simulate Polar Webhook (100ms)
✓ 6. Create Department (90ms)
✓ 7. List Departments (70ms)
✓ 8. Admin Overview (110ms)

Test Files  1 passed (1)
     Tests  8 passed (8)
```

---

## 📊 Test Coverage

| Category | Endpoint | Status |
|----------|----------|--------|
| **Health** | GET /health | ✅ |
| **Admin** | POST /api/admin/users | ✅ |
| **Admin** | POST /api/admin/organizations/create | ✅ |
| **Admin** | PATCH /api/admin/organizations/:id/toggle | ⏳ |
| **Admin** | GET /api/admin/overview | ✅ |
| **Subscription** | GET /api/organizations/:id/subscription | ✅ |
| **Subscription** | POST /api/subscriptions/create-checkout | ⏳ |
| **Webhooks** | POST /api/webhooks/polar | ✅ |
| **Departments** | POST /api/departments | ✅ |
| **Departments** | GET /api/departments | ✅ |
| **Providers** | POST /api/providers | ⏳ |
| **Events** | POST /api/events | ⏳ |
| **Bookings** | POST /api/bookings | ⏳ |

---

## 🐛 Troubleshooting

### Issue: "Unauthorized" Error

**Solution:**
- Make sure you have a valid session token
- Token might have expired - login again
- Check cookie format: `better-auth.session_token=TOKEN_VALUE`

### Issue: "Organization not enabled"

**Solution:**
- Run the Polar webhook simulation
- Or manually enable: `PATCH /api/admin/organizations/:id/toggle`

### Issue: "User not found"

**Solution:**
- Make sure user was created successfully
- Check `userId` is correct
- Verify in database: `SELECT * FROM user WHERE id = 'user_id';`

### Issue: Email not received

**Solution:**
- Check `RESEND_API_KEY` is set
- Check `RESEND_FROM_EMAIL` is verified
- Check server logs for email errors
- Test with a real email address

---

## 📝 Testing Checklist

### Basic Flow
- [ ] Server starts successfully
- [ ] Health check returns 200
- [ ] Admin can create users
- [ ] Users receive temp password email
- [ ] Admin can create organizations
- [ ] Organizations start disabled
- [ ] Owners receive notification email

### Authentication
- [ ] Users can login with temp password
- [ ] System detects needsPasswordChange
- [ ] Users can update password
- [ ] needsPasswordChange flag cleared

### Subscription
- [ ] Subscription status shows disabled
- [ ] Checkout session created
- [ ] Webhook enables organization
- [ ] Activation email sent

### Core Features
- [ ] Departments can be created (enabled org only)
- [ ] Providers can be assigned
- [ ] Events can be created
- [ ] Bookings can be made
- [ ] Booking confirmation emails sent

### Admin
- [ ] Admin overview shows stats
- [ ] Admin can toggle organization status
- [ ] Admin can view all organizations

---

## 🎯 Next Steps

1. **Test all endpoints** with Postman
2. **Add more Vitest tests** for remaining endpoints
3. **Test error cases** (invalid data, unauthorized access)
4. **Load testing** (multiple users, concurrent requests)
5. **Integration tests** (full user journey)

---

## 📚 Resources

- **Postman Collection:** `docs/POSTMAN_COLLECTION.json`
- **Vitest Tests:** `apps/server/src/__tests__/api.test.ts`
- **API Documentation:** `docs/API.md`
- **Onboarding Flow:** `docs/NEW_ONBOARDING_FLOW.md`

---

## 💡 Pro Tips

1. **Use Postman Tests Tab** - Add assertions to automatically verify responses
2. **Save Responses** - Use Postman's "Save Response" for reference
3. **Environment Variables** - Keep all IDs in environment for easy reuse
4. **Automated Testing** - Add more Vitest tests as you build features
5. **Check Logs** - Always check server logs for detailed errors

---

**Happy Testing!** 🧪✨

