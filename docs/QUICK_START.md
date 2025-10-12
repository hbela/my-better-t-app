# Medisched - Quick Start Guide

## 🚀 5-Minute Setup

### Step 1: Install Dependencies

```bash
pnpm install
```

### Step 2: Configure Environment

Create `apps/server/.env` file:

```env
# Copy this template
PORT=3000
DATABASE_URL="file:C:/sqlite/db/express.db"
AUTH_SECRET="your-super-secret-key-change-this-in-production"
CORS_ORIGIN="http://localhost:5173"

# Get your Resend API key from https://resend.com
RESEND_API_KEY="re_your_api_key_here"
RESEND_FROM_EMAIL="onboarding@resend.dev"
```

**To get Resend API Key:**
1. Go to https://resend.com
2. Sign up for free (100 emails/day)
3. Create an API key
4. Copy to your `.env` file

### Step 3: Setup Database

```bash
# Generate Prisma Client and push schema
pnpm --filter @my-better-t-app/db exec prisma db push
```

### Step 4: Start the Server

```bash
pnpm --filter server dev
```

Server starts at: `http://localhost:3000`

---

## 🧪 Test the API

### Health Check

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-10-12T..."
}
```

### Get Organizations (Public)

```bash
curl http://localhost:3000/api/organizations
```

---

## 👤 Create Your First Admin User

### Option 1: Via Database (Quick)

1. Start the server
2. Sign up via Better Auth endpoints
3. Update the user in SQLite:

```sql
-- Open the database
cd C:/sqlite/db
sqlite3 express.db

-- Update user to admin
UPDATE user SET systemRole = 'ADMIN' WHERE email = 'your-email@example.com';

-- Verify
SELECT id, email, systemRole FROM user;
```

### Option 2: Via Frontend

1. Use the Better Auth signup flow in your web app
2. Then update via database as above

---

## 🏥 Create Your First Organization

### Manual Creation (for testing)

```bash
curl -X POST http://localhost:3000/api/auth/organization/create \
  -H "Content-Type: application/json" \
  -H "Cookie: better-auth.session_token=YOUR_SESSION_TOKEN" \
  -d '{
    "name": "Test Hospital",
    "slug": "test-hospital"
  }'
```

### Via Polar (Production)

Configure Polar webhook to point to:
```
https://your-domain.com/api/webhooks/polar
```

---

## 📝 Complete User Flow Example

### 1. Owner Creates Department

```bash
curl -X POST http://localhost:3000/api/departments \
  -H "Content-Type: application/json" \
  -H "Cookie: better-auth.session_token=YOUR_SESSION_TOKEN" \
  -d '{
    "name": "Cardiology",
    "organizationId": "org_123"
  }'
```

### 2. Owner Assigns Provider

```bash
curl -X POST http://localhost:3000/api/providers \
  -H "Content-Type: application/json" \
  -H "Cookie: better-auth.session_token=YOUR_SESSION_TOKEN" \
  -d '{
    "organizationId": "org_123",
    "departmentId": "dept_123",
    "userId": "user_doctor_123"
  }'
```

### 3. Provider Creates Time Slot

```bash
curl -X POST http://localhost:3000/api/events \
  -H "Content-Type: application/json" \
  -H "Cookie: better-auth.session_token=PROVIDER_SESSION_TOKEN" \
  -d '{
    "providerId": "prov_123",
    "title": "General Consultation",
    "description": "30-minute consultation",
    "start": "2025-10-20T10:00:00Z",
    "end": "2025-10-20T10:30:00Z"
  }'
```

### 4. Patient Books Appointment

```bash
curl -X POST http://localhost:3000/api/bookings \
  -H "Content-Type: application/json" \
  -H "Cookie: better-auth.session_token=PATIENT_SESSION_TOKEN" \
  -d '{
    "eventId": "event_123"
  }'
```

**✅ Email sent automatically to patient!**

---

## 🔍 View Available Appointments

```bash
curl "http://localhost:3000/api/events?organizationId=org_123&available=true" \
  -H "Cookie: better-auth.session_token=YOUR_SESSION_TOKEN"
```

Returns only future, unbooked events.

---

## 👑 Admin Dashboard

```bash
curl http://localhost:3000/api/admin/overview \
  -H "Cookie: better-auth.session_token=ADMIN_SESSION_TOKEN"
```

Returns:
- All organizations
- All departments
- All providers
- All events and bookings
- Platform statistics

---

## 🛠️ Development Tools

### View Database

```bash
pnpm --filter @my-better-t-app/db db:studio
```

Opens Prisma Studio at `http://localhost:5555`

### Check Logs

Server logs show:
- All API requests
- Email sending status
- Webhook events
- Errors and warnings

### Test Email Sending

After setting up Resend:
1. Create a booking
2. Check server logs for "Confirmation email sent"
3. Check the member's email inbox

---

## 📱 Testing with Postman

### 1. Import Collection

Create a Postman collection with these folders:
- Auth
- Departments
- Providers
- Events
- Bookings
- Admin

### 2. Set Environment Variables

```
base_url: http://localhost:3000
session_token: (get from login response)
organizationId: (get from org creation)
```

### 3. Test Flow

1. Sign up user
2. Create organization
3. Create department
4. Assign provider
5. Create events
6. Book appointment
7. Verify email

---

## 🐛 Troubleshooting

### Issue: "EPERM: operation not permitted"

**Solution:** Stop the server before running `db:push`

```bash
# Stop server (Ctrl+C)
# Then run:
pnpm --filter @my-better-t-app/db exec prisma db push
# Start server again
pnpm --filter server dev
```

### Issue: "Unauthorized" on API calls

**Solution:** Include session cookie from Better Auth

1. Login via Better Auth
2. Get session cookie from response
3. Include in subsequent requests

### Issue: Email not sending

**Checklist:**
- ✅ Resend API key is valid
- ✅ `RESEND_API_KEY` in `.env`
- ✅ `RESEND_FROM_EMAIL` is valid
- ✅ Check server logs for error details
- ✅ Verify Resend account is active

### Issue: "Organization ID required"

**Solution:** You're not a member of the organization

1. Use Better Auth to join organization
2. Or be invited by owner
3. Verify membership in database

---

## 📊 Database Structure

```
Organization (Hospital)
  └── Department (Cardiology)
       └── Provider (Dr. Smith)
            └── Event (Time Slot)
                 └── Booking (Appointment)
                      └── Member (Patient)
```

---

## 🎯 Next Steps

### 1. Frontend Development

Connect your React app:
- Use Better Auth client SDK
- Call API endpoints
- Build calendar UI
- Create admin dashboard

### 2. Production Deployment

- Deploy to Vercel/Railway/Render
- Use production database (PostgreSQL)
- Configure production Resend domain
- Set up Polar webhooks
- Add monitoring (Sentry)

### 3. Advanced Features

- Calendar UI (React Big Calendar)
- SMS notifications
- Payment integration
- Advanced analytics
- Custom branding per org

---

## 💡 Pro Tips

1. **Use Prisma Studio** for quick database inspection
2. **Check server logs** for detailed error messages
3. **Test with cURL first** before building UI
4. **Use Postman collections** for API testing
5. **Set up multiple users** to test different roles

---

## 🎉 You're Ready!

You now have a fully functional healthcare scheduling backend. Time to build the frontend and go live! 🚀

For detailed API documentation, see [docs/API.md](./API.md)

