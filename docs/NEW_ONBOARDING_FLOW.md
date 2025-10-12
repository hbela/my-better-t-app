# New Onboarding Flow - Medisched

## Overview

The new onboarding flow follows an admin-driven subscription model where organizations are created by the platform admin and activated upon subscription payment.

---

## 📋 Complete Flow

### 1. **Initial Contact** 📞
- Organization contacts admin (phone/email) requesting access to Medisched
- Example: "CityCare Hospital" wants to use the booking platform

### 2. **Admin Creates Owner Account** 👤
**Admin Action:**
```http
POST /api/admin/users
Authorization: Admin token
```

**Request:**
```json
{
  "name": "John Smith",
  "email": "john@citycare.com",
  "role": "USER"
}
```

**Response:**
```json
{
  "user": {
    "id": "user_abc123",
    "name": "John Smith",
    "email": "john@citycare.com",
    "systemRole": "USER",
    "needsPasswordChange": true
  },
  "tempPassword": "x9k2mf7pqh Aa1!"
}
```

**What Happens:**
- User created with temporary password
- `needsPasswordChange` flag set to `true`
- Email sent to user with login credentials
- Admin receives temporary password to communicate

---

### 3. **Admin Creates Organization** 🏥
**Admin Action:**
```http
POST /api/admin/organizations/create
Authorization: Admin token
```

**Request:**
```json
{
  "name": "CityCare Hospital",
  "slug": "citycare-hospital",
  "ownerId": "user_abc123",
  "logo": "https://citycare.com/logo.png" // optional
}
```

**Response:**
```json
{
  "organization": {
    "id": "org_xyz789",
    "name": "CityCare Hospital",
    "slug": "citycare-hospital",
    "enabled": false,
    "createdAt": "2025-10-12T10:00:00Z"
  },
  "message": "Organization created. Owner notified to complete subscription."
}
```

**What Happens:**
- Organization created with `enabled: false`
- Owner assigned to organization with role `owner`
- Email sent to owner with next steps
- Organization cannot be used until subscription is active

---

### 4. **Owner Logs In** 🔐
**Owner Action:**
- Goes to login page
- Enters email and temporary password
- System detects `needsPasswordChange: true`

**Check Password Change Required:**
```http
GET /api/auth/check-password-change
Authorization: User token
```

**Response:**
```json
{
  "needsPasswordChange": true,
  "user": {
    "email": "john@citycare.com",
    "name": "John Smith"
  }
}
```

---

### 5. **Owner Changes Password** 🔑
**Owner Action:**
```http
POST /api/auth/update-password
Authorization: User token
```

**Request:**
```json
{
  "newPassword": "newSecurePassword123!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password updated successfully"
}
```

**What Happens:**
- Password updated
- `needsPasswordChange` flag set to `false`
- Owner can now proceed

---

### 6. **Owner Checks Subscription Status** 📊
**Owner Action:**
```http
GET /api/organizations/org_xyz789/subscription
Authorization: User token
```

**Response:**
```json
{
  "enabled": false,
  "subscriptionActive": false,
  "needsSubscription": true,
  "metadata": {}
}
```

---

### 7. **Owner Initiates Subscription** 💳
**Owner Action:**
```http
POST /api/subscriptions/create-checkout
Authorization: User token
```

**Request:**
```json
{
  "organizationId": "org_xyz789"
}
```

**Response:**
```json
{
  "checkoutUrl": "https://polar.sh/checkout?org=citycare-hospital&product=prod_medisched_monthly",
  "organizationId": "org_xyz789",
  "organizationName": "CityCare Hospital",
  "amount": "$10.00/month",
  "message": "Complete payment to activate your organization"
}
```

**What Happens:**
- Frontend redirects to Polar checkout URL
- Owner completes payment ($10/month)
- Polar processes payment

---

### 8. **Polar Webhook - Organization Activated** ✅
**Polar → Server:**
```http
POST /api/webhooks/polar
```

**Webhook Payload:**
```json
{
  "type": "subscription.created",
  "data": {
    "id": "sub_123",
    "customer": {
      "id": "cust_456",
      "email": "john@citycare.com",
      "name": "John Smith"
    },
    "metadata": {
      "organizationId": "org_xyz789",
      "organizationName": "CityCare Hospital"
    }
  }
}
```

**What Happens:**
- Organization `enabled` set to `true`
- Metadata updated with subscription details
- Confirmation email sent to owner
- Owner can now use the platform

---

### 9. **Owner Creates Departments** 🏥
**Owner Action:**
```http
POST /api/departments
Authorization: User token
```

**Request:**
```json
{
  "name": "Cardiology",
  "organizationId": "org_xyz789"
}
```

**Response:**
```json
{
  "id": "dept_123",
  "name": "Cardiology",
  "organizationId": "org_xyz789"
}
```

**Note:** This endpoint now checks if organization is enabled via `requireEnabledOrganization` middleware.

---

### 10. **Providers Sign Up** 👨‍⚕️
**Provider Action:**
- Doctor signs up via regular signup flow
- Uses Better Auth to create account

**Owner Assigns Provider:**
```http
POST /api/providers
Authorization: Owner token
```

**Request:**
```json
{
  "organizationId": "org_xyz789",
  "departmentId": "dept_123",
  "userId": "user_doctor_456"
}
```

**Response:**
```json
{
  "id": "prov_789",
  "userId": "user_doctor_456",
  "departmentId": "dept_123",
  "user": {
    "name": "Dr. Jane Miller",
    "email": "jane@citycare.com"
  }
}
```

---

### 11. **Providers Create Events** 📅
**Provider Action:**
```http
POST /api/events
Authorization: Provider token
```

**Request:**
```json
{
  "providerId": "prov_789",
  "title": "General Consultation",
  "description": "30-minute consultation",
  "start": "2025-10-20T10:00:00Z",
  "end": "2025-10-20T10:30:00Z"
}
```

---

### 12. **Patients Join & Book** 🩺
**Patient Action:**
- User signs up
- Joins organization as member
- Browses available events
- Books appointment

```http
POST /api/bookings
Authorization: Patient token
```

**Request:**
```json
{
  "eventId": "event_123"
}
```

**What Happens:**
- Booking created
- Event marked as booked
- **Email sent to patient** with confirmation

---

## 🔒 Key Changes

### 1. **Organization Enabled Flag**
- New field: `Organization.enabled` (default: `false`)
- All organization-dependent operations check this flag
- Middleware: `requireEnabledOrganization`

### 2. **Temporary Password Flow**
- New field: `User.needsPasswordChange` (default: `false`)
- Admin creates users with temporary passwords
- Users must change password on first login
- Endpoint: `/api/auth/update-password`

### 3. **Admin Endpoints**
- `POST /api/admin/users` - Create user with temp password
- `POST /api/admin/organizations/create` - Create organization
- `PATCH /api/admin/organizations/:id/toggle` - Enable/disable org

### 4. **Subscription Endpoints**
- `POST /api/subscriptions/create-checkout` - Create Polar checkout
- `GET /api/organizations/:id/subscription` - Check subscription status
- `GET /api/auth/check-password-change` - Check if password change needed

### 5. **Enhanced Polar Webhook**
- Handles `subscription.created` and `order.created`
- Enables organization on successful payment
- Sends activation email to owner
- Handles `subscription.canceled` to disable org

---

## 📧 Email Notifications

### 1. **User Created (to New Owner)**
```
Subject: Welcome to Medisched - Your Account Created

Dear John Smith,

Your account has been created by an administrator.

Login Credentials:
- Email: john@citycare.com
- Temporary Password: x9k2mf7pqhAa1!

Important: You will be required to change your password upon first login.
```

### 2. **Organization Created (to Owner)**
```
Subject: Organization Created: CityCare Hospital

Dear John Smith,

Your organization CityCare Hospital has been created on Medisched.

Next Steps:
1. Login to your account
2. Complete the subscription process ($10/month)
3. Once subscribed, your organization will be activated
4. You can then start creating departments and adding providers
```

### 3. **Subscription Activated (to Owner)**
```
Subject: CityCare Hospital - Subscription Activated!

Dear John Smith,

Your subscription for CityCare Hospital has been successfully activated.

What's Next?
- Create departments for your organization
- Invite and assign healthcare providers
- Providers can create appointment slots
- Patients can start booking appointments

Subscription Details:
- Plan: $10/month
- Status: Active
- Organization: CityCare Hospital
```

---

## 🔧 Environment Variables Required

```env
# Server
PORT=3000
DATABASE_URL="file:C:/sqlite/db/booking.db"

# Auth
AUTH_SECRET="your-secret-key"
CORS_ORIGIN="http://localhost:5173"

# Email (Resend)
RESEND_API_KEY="re_your_key_here"
RESEND_FROM_EMAIL="onboarding@medisched.com"

# Polar
POLAR_ACCESS_TOKEN="polar_at_..."
POLAR_SUCCESS_URL="http://localhost:5173/subscription/success"
POLAR_PRODUCT_ID="prod_medisched_monthly" # optional
POLAR_PRICE_ID="price_10_usd_monthly" # optional
POLAR_WEBHOOK_SECRET="whsec_..." # for webhook verification
```

---

## 🧪 Testing the Flow

### 1. Create Admin User
```sql
UPDATE user SET systemRole = 'ADMIN' WHERE email = 'admin@medisched.com';
```

### 2. Admin Creates Owner
```bash
curl -X POST http://localhost:3000/api/admin/users \
  -H "Content-Type: application/json" \
  -H "Cookie: better-auth.session_token=ADMIN_TOKEN" \
  -d '{
    "name": "Test Owner",
    "email": "owner@test.com",
    "role": "USER"
  }'
```

### 3. Admin Creates Organization
```bash
curl -X POST http://localhost:3000/api/admin/organizations/create \
  -H "Content-Type: application/json" \
  -H "Cookie: better-auth.session_token=ADMIN_TOKEN" \
  -d '{
    "name": "Test Hospital",
    "slug": "test-hospital",
    "ownerId": "USER_ID_FROM_STEP_2"
  }'
```

### 4. Owner Logs In
- Use temporary password from step 2
- Change password via `/api/auth/update-password`

### 5. Owner Initiates Subscription
```bash
curl -X POST http://localhost:3000/api/subscriptions/create-checkout \
  -H "Content-Type: application/json" \
  -H "Cookie: better-auth.session_token=OWNER_TOKEN" \
  -d '{
    "organizationId": "ORG_ID_FROM_STEP_3"
  }'
```

### 6. Simulate Polar Webhook (For Testing)
```bash
curl -X POST http://localhost:3000/api/webhooks/polar \
  -H "Content-Type: application/json" \
  -d '{
    "type": "subscription.created",
    "data": {
      "id": "sub_test123",
      "customer": {
        "id": "cust_test456",
        "email": "owner@test.com",
        "name": "Test Owner"
      },
      "metadata": {
        "organizationId": "ORG_ID_FROM_STEP_3",
        "organizationName": "Test Hospital"
      }
    }
  }'
```

### 7. Verify Organization Enabled
```bash
curl http://localhost:3000/api/organizations/ORG_ID/subscription \
  -H "Cookie: better-auth.session_token=OWNER_TOKEN"
```

Should return:
```json
{
  "enabled": true,
  "subscriptionActive": true,
  "needsSubscription": false
}
```

---

## 🎯 Summary

The new flow ensures:
- ✅ Admin controls organization creation
- ✅ Owners start with secure temporary passwords
- ✅ Organizations are disabled until paid
- ✅ Automated activation via Polar webhooks
- ✅ Clear email notifications at every step
- ✅ Subscription required before using features
- ✅ Complete audit trail

**Next Step:** Implement the frontend UI for this flow! 🚀

