# Quick Start: Email Setup for Booking System

## 🚀 5-Minute Email Setup

### Step 1: Get Resend API Key (2 minutes)

1. Go to **https://resend.com**
2. Sign up or log in
3. Click **"API Keys"** in the sidebar
4. Click **"Create API Key"**
5. Give it a name (e.g., "Booking System")
6. Copy the API key (starts with `re_`)

### Step 2: Update Environment Variables (1 minute)

Edit `apps/server/.env`:

```env
# Add these lines:
RESEND_API_KEY=re_paste_your_key_here
RESEND_FROM_EMAIL=onboarding@resend.dev
```

### Step 3: Restart Server (30 seconds)

```bash
cd apps/server
pnpm dev
```

### Step 4: Test Email Features (2 minutes)

**Test 1: Booking Confirmation**
1. Make a booking as a client
2. Check server logs for:
   ```
   📧 Sending confirmation email to: client@example.com
   ✅ Client email sent successfully
   ✅ Provider email sent successfully
   ```

**Test 2: Password Reset**
1. Click "Forgot password?" on login
2. Enter email and submit
3. Check server logs for:
   ```
   📧 Sending password reset email to: user@example.com
   ✅ Password reset email sent successfully
   ```

4. Check your email inbox for both!

---

## 📧 Email Verification Status

### Testing Mode (Current Setup)
- **From:** `onboarding@resend.dev`
- **Limitation:** Only sends to verified emails in your Resend account
- **Perfect for:** Development and testing
- **Setup time:** 5 minutes ✅

### Production Mode (When Ready)
- **From:** `noreply@yourdomain.com` (or any email on your domain)
- **Requirement:** Domain must be verified in Resend
- **Setup time:** 15-30 minutes (DNS propagation)

---

## 🔧 Production Setup (Optional - For Later)

### When you're ready to send emails to real customers:

1. **Add Domain in Resend:**
   - Go to Resend dashboard
   - Click "Domains"
   - Click "Add Domain"
   - Enter your domain (e.g., `yourdomain.com`)

2. **Update DNS Records:**
   - Resend will provide DNS records
   - Add these to your domain's DNS settings
   - Wait for verification (5-30 minutes)

3. **Update Environment Variable:**
   ```env
   RESEND_FROM_EMAIL=noreply@yourdomain.com
   ```

4. **Restart Server:**
   ```bash
   cd apps/server
   pnpm dev
   ```

---

## ✅ Verification Checklist

### Email Working Correctly When:

- [x] Server logs show: `✅ Client email sent successfully`
- [x] Server logs show: `✅ Provider email sent successfully`
- [x] No errors in server logs
- [x] Email received in inbox (or spam folder initially)
- [x] Email shows correct booking details
- [x] Both client and provider receive emails

### Still Not Working?

**Check:**
1. ✅ API key starts with `re_`
2. ✅ No spaces in API key
3. ✅ `.env` file in `apps/server/` directory
4. ✅ Server restarted after adding env vars
5. ✅ Check spam/junk folder

**Debug:**
```bash
# Check if env vars are loaded
cd apps/server
node -e "require('dotenv').config(); console.log('Key:', process.env.RESEND_API_KEY?.substring(0, 10) + '...')"
```

---

## 📝 Environment Variables Reference

### Required:
```env
RESEND_API_KEY=re_your_api_key
RESEND_FROM_EMAIL=onboarding@resend.dev
```

### Complete .env Example:
```env
# Database
DATABASE_URL="file:../../packages/db/prisma/C/sqlite/db/booking.db"

# Server
PORT=3000
CORS_ORIGIN=http://localhost:5173
FRONTEND_URL=http://localhost:5173

# Email (REQUIRED FOR BOOKING EMAILS)
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=onboarding@resend.dev
```

---

## 🎯 What Each Email Contains

### 1. Client Confirmation Email:
**Subject:** Booking Confirmation

**Content:**
- Provider name
- Organization and department
- Service title
- Date: Monday, January 15, 2024
- Time: 2:00 PM - 2:30 PM
- Duration: 30 minutes
- Price (if set)

### 2. Provider Notification Email:
**Subject:** New Booking Received

**Content:**
- Client name and email
- Service title
- Date and time
- Duration

### 3. Password Reset Email:
**Subject:** Password Reset Request

**Content:**
- User's name
- Reset password button/link
- Link expiration notice (1 hour)
- Security reminder

---

## 🆘 Troubleshooting

### Error: "Failed to send confirmation emails"

**Possible causes:**
1. API key not set → Add `RESEND_API_KEY` to `.env`
2. Invalid API key → Copy key again from Resend
3. From email not verified → Use `onboarding@resend.dev` for testing

**Check server logs for:**
```
❌ Failed to send booking confirmation emails
Resend API Key configured: false
```

### Email Goes to Spam

**Normal for first few emails. To fix:**
1. Mark as "Not Spam" in your email client
2. Add sender to contacts
3. For production: Verify domain in Resend (improves deliverability)

### Rate Limits (Free Tier)

**Resend free tier limits:**
- 100 emails/day
- 1 email/second

**If you hit limits:**
- Upgrade Resend plan
- Or wait until next day for free tier reset

---

## 💡 Pro Tips

1. **Test First:** Always test with `onboarding@resend.dev` before production
2. **Monitor Logs:** Keep an eye on server logs when testing
3. **Check Spam:** First emails often go to spam
4. **Verify Domain:** For production, verify your domain for better deliverability
5. **Save API Key:** Store API key securely (don't commit to git)

---

## ⚡ Common Questions

**Q: Do I need to pay for Resend?**
A: Free tier (100 emails/day) is sufficient for testing. Paid plans start at $20/month for production.

**Q: Can I use a different email service?**
A: Yes, but you'll need to modify the code. Resend is recommended for its simplicity.

**Q: Why use onboarding@resend.dev?**
A: It's pre-verified by Resend for testing. No domain setup needed.

**Q: Will bookings fail if email fails?**
A: No! Bookings still succeed. Email failure is logged but doesn't prevent booking.

---

**Ready to test?** Follow Step 1-4 above! ⬆️

**Questions?** Check the comprehensive guide: `docs/BOOKING_FIX_GUIDE.md`

