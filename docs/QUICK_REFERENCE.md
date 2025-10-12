# Quick Reference - Medisched API

## 🚀 Server Commands

```bash
# Start server
pnpm --filter server dev

# Push database schema
pnpm --filter @my-better-t-app/db exec prisma db push

# View database
pnpm --filter @my-better-t-app/db db:studio
```

---

## 🔑 Admin Endpoints

### Create User
```bash
POST /api/admin/users
{
  "name": "John Doe",
  "email": "john@example.com",
  "role": "USER"
}
# Returns: { user: {...}, tempPassword: "abc123Aa1!" }
```

### Create Organization
```bash
POST /api/admin/organizations/create
{
  "name": "Hospital Name",
  "slug": "hospital-slug",
  "ownerId": "user_id"
}
# Organization created with enabled=false
```

### Toggle Organization
```bash
PATCH /api/admin/organizations/:id/toggle
{
  "enabled": true
}
```

---

## 🔐 Authentication

### Check Password Change Needed
```bash
GET /api/auth/check-password-change
# Returns: { needsPasswordChange: true/false }
```

### Update Password
```bash
POST /api/auth/update-password
{
  "newPassword": "newSecurePassword123!"
}
```

---

## 💳 Subscription

### Create Checkout
```bash
POST /api/subscriptions/create-checkout
{
  "organizationId": "org_id"
}
# Returns: { checkoutUrl: "https://polar.sh/..." }
```

### Check Subscription Status
```bash
GET /api/organizations/:id/subscription
# Returns: {
#   enabled: false,
#   needsSubscription: true
# }
```

---

## 🏥 Core Features

### Create Department (Requires Enabled Org)
```bash
POST /api/departments
{
  "name": "Cardiology",
  "organizationId": "org_id"
}
```

### Assign Provider
```bash
POST /api/providers
{
  "organizationId": "org_id",
  "departmentId": "dept_id",
  "userId": "user_id"
}
```

### Create Event
```bash
POST /api/events
{
  "providerId": "prov_id",
  "title": "Consultation",
  "start": "2025-10-20T10:00:00Z",
  "end": "2025-10-20T10:30:00Z"
}
```

### Book Appointment
```bash
POST /api/bookings
{
  "eventId": "event_id"
}
# Automatically sends email confirmation
```

---

## 🔗 Polar Webhook

```bash
POST /api/webhooks/polar
{
  "type": "subscription.created",
  "data": {
    "customer": {...},
    "metadata": {
      "organizationId": "org_id"
    }
  }
}
# Enables organization automatically
```

---

## 📊 Quick Workflow

```
1. Admin creates user → temp password emailed
2. Admin creates organization → enabled=false
3. Owner logs in → change password
4. Owner creates checkout → redirected to Polar
5. Owner pays → webhook enables organization
6. Owner creates departments
7. Owner assigns providers
8. Providers create events
9. Patients book appointments
```

---

## 🌐 Environment Variables

```env
PORT=3000
DATABASE_URL="file:C:/sqlite/db/booking.db"
AUTH_SECRET="your-secret"
CORS_ORIGIN="http://localhost:5173"
RESEND_API_KEY="re_..."
RESEND_FROM_EMAIL="onboarding@medisched.com"
POLAR_ACCESS_TOKEN="polar_at_..."
POLAR_SUCCESS_URL="http://localhost:5173/subscription/success"
```

---

## 🧪 Testing

```bash
# 1. Create admin
sqlite3 C:/sqlite/db/booking.db
UPDATE user SET systemRole = 'ADMIN' WHERE email = 'admin@example.com';

# 2. Test health
curl http://localhost:3000/health

# 3. Create user (as admin)
curl -X POST http://localhost:3000/api/admin/users \
  -H "Content-Type: application/json" \
  -H "Cookie: better-auth.session_token=TOKEN" \
  -d '{"name":"Test","email":"test@test.com"}'

# 4. Simulate webhook
curl -X POST http://localhost:3000/api/webhooks/polar \
  -H "Content-Type: application/json" \
  -d '{"type":"subscription.created","data":{"customer":{"id":"1"},"metadata":{"organizationId":"org_id"}}}'
```

---

## 📧 Email Templates

- **User Created** → Temp password + login link
- **Organization Created** → Next steps + subscription info
- **Subscription Activated** → Confirmation + what's next
- **Booking Confirmed** → Appointment details

---

## 🎯 Key Concepts

| Concept | Description |
|---------|-------------|
| **enabled** | Organization must be enabled to use features |
| **needsPasswordChange** | User must change temp password |
| **requireEnabledOrganization** | Middleware that blocks disabled orgs |
| **Polar Webhook** | Automatically enables org on payment |

---

## 📱 Frontend Needed

1. Password change page
2. Subscription flow page
3. Admin panel (create users/orgs)
4. Organization status check
5. Subscription button

---

## 🔍 Debugging

```bash
# Check organization status
SELECT id, name, enabled FROM organization;

# Check user password change status
SELECT id, email, needsPasswordChange FROM user;

# Check subscriptions
SELECT id, name, enabled, metadata FROM organization;

# View all members
SELECT * FROM member WHERE organizationId = 'org_id';
```

---

## 📚 Full Documentation

- `NEW_ONBOARDING_FLOW.md` - Complete workflow
- `API_UPDATES.md` - All new endpoints
- `API.md` - Full API reference
- `BACKEND_COMPLETE.md` - Implementation summary

---

**Server ready at:** `http://localhost:3000` 🚀

