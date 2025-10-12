# API Updates - New Onboarding Flow

## 🎯 Overview

The API has been updated to support an admin-driven subscription-based onboarding flow where organizations must subscribe before becoming active.

---

## 📦 New Database Fields

### Organization Model
```prisma
model Organization {
  // ... existing fields
  enabled Boolean @default(false) // ✨ NEW - Organization activation status
}
```

### User Model
```prisma
model User {
  // ... existing fields
  needsPasswordChange Boolean? @default(false) // ✨ NEW - Forces password change on first login
}
```

---

## 🆕 New API Endpoints

### Admin Endpoints

#### 1. Create User with Temporary Password
```http
POST /api/admin/users
Authorization: Admin only
```

**Features:**
- Creates user with auto-generated temporary password
- Sets `needsPasswordChange: true`
- Sends welcome email with credentials
- Returns temp password for admin to communicate

---

#### 2. Create Organization with Owner
```http
POST /api/admin/organizations/create
Authorization: Admin only
```

**Features:**
- Creates organization with `enabled: false`
- Assigns owner to organization
- Sends notification email to owner
- Owner must subscribe to activate

---

#### 3. Enable/Disable Organization
```http
PATCH /api/admin/organizations/:id/toggle
Authorization: Admin only
```

**Features:**
- Manually toggle organization status
- Useful for admin management

---

### Subscription Endpoints

#### 4. Create Checkout Session
```http
POST /api/subscriptions/create-checkout
Authorization: Owner only
```

**Features:**
- Creates Polar checkout URL
- Includes organization metadata
- Returns checkout URL for frontend redirect

---

#### 5. Check Organization Subscription Status
```http
GET /api/organizations/:id/subscription
Authorization: Member of organization
```

**Features:**
- Returns subscription and enabled status
- Shows if subscription is needed

---

### Authentication Endpoints

#### 6. Check Password Change Required
```http
GET /api/auth/check-password-change
Authorization: Authenticated user
```

**Features:**
- Checks if user needs to change password
- Returns `needsPasswordChange` flag

---

#### 7. Update Password
```http
POST /api/auth/update-password
Authorization: Authenticated user
```

**Features:**
- Updates user password
- Clears `needsPasswordChange` flag
- Uses bcrypt for secure hashing

---

## 🔄 Updated Endpoints

### Modified: Department Creation
```http
POST /api/departments
Authorization: Owner + Organization must be enabled
```

**Changes:**
- Added `requireEnabledOrganization` middleware
- Now checks if organization is active before allowing

---

### Modified: Polar Webhook
```http
POST /api/webhooks/polar
```

**New Features:**
- Handles `subscription.created` event
- Enables organization on successful payment
- Sends activation email to owner
- Handles `subscription.canceled` event
- Stores subscription metadata

---

## 🛡️ New Middleware

### requireEnabledOrganization
```javascript
const requireEnabledOrganization = async (req, res, next) => {
  // Checks if organization exists and is enabled
  // Returns 403 if organization is disabled
}
```

**Applied to:**
- ✅ Department creation
- ✅ Provider management
- ✅ Event management (indirectly via department check)

---

## 📧 New Email Templates

### 1. Welcome Email (User Created)
- Sent when admin creates user
- Includes temporary password
- Instructions for first login

### 2. Organization Created Email
- Sent when admin creates organization
- Instructions for subscription process
- Next steps outlined

### 3. Subscription Activated Email
- Sent when Polar webhook processes payment
- Confirms organization is now active
- What to do next

---

## 🔐 Security Enhancements

### Password Hashing
- Using `bcrypt` with salt rounds of 10
- Secure temp password generation
- Force password change on first login

### Organization Isolation
- Organizations are disabled by default
- Cannot be used until subscription is active
- All operations check enabled status

---

## 📊 Complete Endpoint List

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/admin/users` | POST | Admin | Create user with temp password |
| `/api/admin/organizations/create` | POST | Admin | Create disabled organization |
| `/api/admin/organizations/:id/toggle` | PATCH | Admin | Toggle organization status |
| `/api/subscriptions/create-checkout` | POST | Owner | Create Polar checkout |
| `/api/organizations/:id/subscription` | GET | Member | Check subscription status |
| `/api/auth/check-password-change` | GET | Auth | Check password change needed |
| `/api/auth/update-password` | POST | Auth | Update user password |
| `/api/webhooks/polar` | POST | Public | Process Polar events |

---

## 🔄 Migration Guide

### For Existing Organizations

If you have existing organizations in your database, you need to enable them:

```sql
-- Enable all existing organizations
UPDATE organization SET enabled = true;

-- Or enable specific organizations
UPDATE organization SET enabled = true WHERE id = 'org_specific_id';
```

### For Existing Users

Existing users don't need password changes:

```sql
-- Verify all existing users have needsPasswordChange = false
UPDATE user SET needsPasswordChange = false WHERE needsPasswordChange IS NULL;
```

---

## 🧪 Testing Checklist

- [ ] Admin can create users with temp passwords
- [ ] Users receive welcome email
- [ ] Admin can create organizations
- [ ] Organizations are disabled by default
- [ ] Owners receive organization created email
- [ ] Owner must change password on first login
- [ ] Owner can see subscription status
- [ ] Owner can create checkout session
- [ ] Polar webhook enables organization
- [ ] Owner receives activation email
- [ ] Disabled organizations cannot create departments
- [ ] Enabled organizations work normally

---

## 📝 Frontend Changes Needed

### 1. Login Flow
- Check `needsPasswordChange` after login
- Redirect to password change page if needed
- Update password via `/api/auth/update-password`

### 2. Subscription Flow
- Check organization status on dashboard
- Show subscription required message if disabled
- Create checkout session button
- Redirect to Polar checkout URL
- Handle success redirect from Polar

### 3. Admin Panel
- Form to create users
- Display temporary passwords
- Form to create organizations
- List organizations with enabled status
- Toggle organization enabled/disabled

---

## 🚀 Next Steps

1. ✅ Backend API updated
2. ⏳ Frontend implementation needed:
   - Password change UI
   - Subscription flow UI
   - Admin panel UI
3. ⏳ Polar integration:
   - Create products in Polar dashboard
   - Configure webhook URL
   - Test payment flow
4. ⏳ Email templates:
   - Customize email designs
   - Add branding
   - Test email delivery

---

## 📞 API Support

All endpoints return standard error responses:

```json
{
  "error": "Error message describing what went wrong"
}
```

HTTP Status Codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden (includes disabled organization)
- `404` - Not Found
- `500` - Internal Server Error

---

## 🎉 Summary

Your API is now ready with:
- ✅ Admin-driven onboarding
- ✅ Temporary password system
- ✅ Subscription-based activation
- ✅ Organization enabled checks
- ✅ Automated email notifications
- ✅ Polar webhook integration
- ✅ Complete security measures

**Ready for frontend development!** 🚀

