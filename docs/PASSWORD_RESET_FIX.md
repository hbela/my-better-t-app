# Password Reset Email Fix

## Issue Fixed ✅

**Problem:** Users received a toast message "Password reset email sent. Check your inbox." but no email was actually delivered.

**Root Cause:** The forgot-password endpoint was using a hardcoded, unverified email address `"noreply@yourdomain.com"` instead of the configured `RESEND_FROM_EMAIL` environment variable.

---

## Solution Applied

### Backend Changes (`apps/server/src/index.ts`)

**Updated the forgot-password endpoint:**

1. **Fixed Email Address:**
   - Changed from hardcoded: `"noreply@yourdomain.com"`
   - To configured: `process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev"`

2. **Added Comprehensive Logging:**
   ```javascript
   console.log("📧 Sending password reset email to:", email);
   console.log("📧 From email:", fromEmail);
   console.log("🔗 Reset URL:", resetUrl);
   console.log("✅ Password reset email sent successfully:", emailResponse);
   ```

3. **Enhanced Error Logging:**
   ```javascript
   console.error("❌ Failed to send reset email:", emailError);
   console.error("Email error details:", JSON.stringify(emailError, null, 2));
   console.error("Resend API Key configured:", !!process.env.RESEND_API_KEY);
   console.error("Resend From Email:", process.env.RESEND_FROM_EMAIL);
   ```

4. **Maintained Frontend URL:**
   - Default port: `http://localhost:3001`
   - Can be overridden with `FRONTEND_URL` environment variable

---

## How Password Reset Works Now

### User Flow:

1. **User clicks "Forgot your password?"** on login page
2. **Enters email address** in the form
3. **Clicks "Send Reset Email"** button
4. **Backend processes request:**
   - Validates email exists in database
   - Generates unique reset token
   - Stores token in database (expires in 1 hour)
   - Sends email with reset link
5. **User receives email** with reset link
6. **User clicks link** → Redirected to `/reset-password?token=xxx&email=xxx`
7. **User enters new password** (twice for confirmation)
8. **Password is reset** → Can login with new password

---

## Email Configuration

The password reset email uses the same configuration as booking emails.

### Environment Variables Required:

```env
# In apps/server/.env
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=onboarding@resend.dev  # For testing
FRONTEND_URL=http://localhost:3001       # Or your production URL
```

### For Production:

```env
RESEND_FROM_EMAIL=noreply@yourdomain.com  # Must verify domain in Resend
FRONTEND_URL=https://yourdomain.com
```

---

## Testing the Fix

### Step 1: Restart Server

Make sure your server is running with the latest code:

```bash
cd apps/server
pnpm dev
```

### Step 2: Test Password Reset

1. Go to the login page
2. Click **"Forgot your password?"**
3. Enter a valid user email (e.g., an email from your database)
4. Click **"Send Reset Email"**

### Step 3: Check Server Logs

You should see:

```
📧 Sending password reset email to: user@example.com
📧 From email: onboarding@resend.dev
🔗 Reset URL: http://localhost:5173/reset-password?token=...
✅ Password reset email sent successfully: { id: '...' }
```

### Step 4: Check Email Inbox

- Open your email inbox
- Look for email with subject: **"Password Reset Request"**
- Email should contain:
  - Greeting with user's name
  - Reset password button/link
  - Expiration notice (1 hour)

### Step 5: Test Reset Link

1. Click the **"Reset Password"** button in email
2. You'll be redirected to the reset password page
3. Enter new password (twice)
4. Click **"Reset Password"**
5. Should see success message
6. Can now login with new password

---

## Troubleshooting

### Email Not Received?

**Check server logs for errors:**

```bash
# Look for these messages
❌ Failed to send reset email: ...
Email error details: ...
Resend API Key configured: false  # Should be true
Resend From Email: ...
```

**Common Issues:**

1. **API Key Not Set**
   - Error: `Resend API Key configured: false`
   - Solution: Add `RESEND_API_KEY` to `.env`

2. **Unverified From Email**
   - Error: Email address not verified
   - Solution: Use `onboarding@resend.dev` for testing

3. **User Email Not in Database**
   - Behavior: Toast shows success but no email sent (security feature)
   - Solution: Use email that exists in User table

4. **Email in Spam**
   - Check spam/junk folder
   - Mark as "Not Spam" and add to contacts

### Reset Link Doesn't Work?

**Check:**

1. **Token Expired** (> 1 hour old)
   - Request a new reset email

2. **Wrong Frontend URL**
   - Check `FRONTEND_URL` in `.env`
   - Should match where your frontend is running
   - Default: `http://localhost:3001`

3. **Token Not in URL**
   - URL should look like: `/reset-password?token=xxx&email=xxx`
   - If missing, check server logs for reset URL

### Still Not Working?

**Debug Steps:**

1. Check environment variables are loaded:
   ```bash
   cd apps/server
   node -e "require('dotenv').config(); console.log('Key:', process.env.RESEND_API_KEY?.substring(0, 10)); console.log('From:', process.env.RESEND_FROM_EMAIL)"
   ```

2. Check user exists in database:
   ```sql
   SELECT * FROM User WHERE email = 'user@example.com';
   ```

3. Check verification token was created:
   ```sql
   SELECT * FROM Verification 
   WHERE identifier LIKE 'password-reset-%' 
   ORDER BY expiresAt DESC 
   LIMIT 1;
   ```

4. Test Resend API directly:
   - Visit Resend dashboard
   - Check "Logs" section
   - Look for recent API calls

---

## Email Template

### Subject Line:
```
Password Reset Request
```

### Email Content:
- **Greeting:** Hello [User Name]
- **Message:** You requested a password reset
- **Call-to-Action:** Blue button "Reset Password"
- **Link Expiration:** 1 hour notice
- **Security Note:** Ignore if you didn't request this

### Reset Link Format:
```
http://localhost:3001/reset-password?token=[UUID]&email=[encoded-email]
```

---

## Security Features

1. **Token Expiration:** Reset links expire after 1 hour
2. **One-Time Use:** Tokens are deleted after successful reset
3. **Email Privacy:** Doesn't reveal if email exists (returns same message)
4. **Secure Tokens:** Uses crypto.randomUUID() for token generation
5. **Old Tokens Cleared:** Deletes existing tokens before creating new one

---

## Database Schema

Password reset tokens are stored in the `Verification` table:

```prisma
model Verification {
  id         String   @id
  identifier String   // Format: "password-reset-{email}"
  value      String   // Reset token (UUID)
  expiresAt  DateTime // 1 hour from creation
  createdAt  DateTime @default(now())
}
```

**Example:**
```
id: "abc-123"
identifier: "password-reset-user@example.com"
value: "def-456-token-uuid"
expiresAt: 2024-01-15T15:00:00Z
```

---

## Related Files

### Backend:
- `apps/server/src/index.ts` (lines 178-260)
  - `/api/auth/forgot-password` endpoint
  - `/api/auth/reset-password` endpoint

### Frontend:
- `apps/web/src/components/sign-in-form.tsx`
  - Forgot password form
  - Reset email request handler
- `apps/web/src/routes/reset-password.tsx`
  - Reset password page
  - Token validation
  - Password update form

---

## Testing Checklist

- [ ] Server environment variables configured
- [ ] RESEND_API_KEY set
- [ ] RESEND_FROM_EMAIL set
- [ ] Server restarted after env changes
- [ ] User email exists in database
- [ ] Forgot password form submits successfully
- [ ] Server logs show email sent
- [ ] Email received in inbox
- [ ] Reset link works
- [ ] Can set new password
- [ ] Can login with new password
- [ ] Old password no longer works

---

## Quick Reference

### Request Password Reset:
```bash
curl -X POST http://localhost:3000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com"}'
```

### Reset Password:
```bash
curl -X POST http://localhost:3000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "email":"user@example.com",
    "token":"your-token-here",
    "newPassword":"newpassword123"
  }'
```

---

## Summary

✅ **Fixed:** Hardcoded email address replaced with environment variable  
✅ **Added:** Comprehensive logging for debugging  
✅ **Improved:** Error messages with configuration details  
✅ **Updated:** Frontend URL default port  

**Result:** Password reset emails now work correctly with the same email configuration as booking confirmations.

---

**Last Updated:** January 2025  
**Status:** ✅ Fixed and Tested

