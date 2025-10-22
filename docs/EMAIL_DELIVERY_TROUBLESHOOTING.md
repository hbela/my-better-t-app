# Email Delivery Troubleshooting Guide

## ✅ API Success But Email Not Received

### Your Situation:
```
✅ Password reset email sent successfully: { 
  data: { id: '594c8c9d-bddc-4434-a24d-37fddb842943' }, 
  error: null 
}
```

**This means:** Resend accepted the email. The issue is with **delivery**, not sending.

---

## 🔍 Immediate Checks

### 1. **Check Spam/Junk Folder** ⭐ MOST COMMON
   - Open Gmail
   - Go to **Spam** or **Junk** folder
   - Search for: "Password Reset Request"
   - Search for: "support@tanarock.hu"

### 2. **Check All Mail Folder**
   - Sometimes Gmail filters to other tabs (Promotions, Social)
   - Click **All Mail** to see everything

### 3. **Gmail Search**
   - Search: `from:support@tanarock.hu`
   - Search: `subject:"Password Reset Request"`

---

## 🚨 Main Issue: Custom Domain Verification

**You're using:** `support@tanarock.hu`  
**Status:** Likely **NOT verified** in Resend

### Why This Matters:
- Custom domains (like `tanarock.hu`) **MUST** be verified in Resend
- Unverified domains = emails may be rejected or marked as spam
- Gmail is particularly strict about unverified senders

---

## ✅ Solution 1: Switch to Test Email (Quick Fix)

### Use Resend's Pre-Verified Email:

**Update your `.env` file:**
```env
RESEND_FROM_EMAIL=onboarding@resend.dev
```

**Restart server:**
```bash
cd apps/server
pnpm dev
```

**Test again:**
- Request password reset
- Email should arrive within seconds
- Check spam if not in inbox

### ⚠️ Limitation:
`onboarding@resend.dev` only delivers to **verified recipient emails** in your Resend account during testing.

**To receive emails:**
1. Go to Resend dashboard: https://resend.com/emails
2. Add `elysprovider1@gmail.com` as a verified recipient
3. Check your email for verification link
4. Click to verify
5. Try password reset again

---

## ✅ Solution 2: Verify Your Domain (Production Ready)

### Step 1: Access Resend Dashboard
1. Go to https://resend.com
2. Login to your account
3. Click **"Domains"** in sidebar

### Step 2: Check Domain Status

**Look for:** `tanarock.hu`

**Status indicators:**
- ✅ **Verified** = Ready to send
- ⚠️ **Pending** = DNS records not propagated yet
- ❌ **Not Added** = Need to add domain

### Step 3: Verify Domain (if not already)

**If domain is not added:**
1. Click **"Add Domain"**
2. Enter: `tanarock.hu`
3. Click **"Add"**

**Resend will provide DNS records:**
```
TXT record:
Name: _resend
Value: resend-verify=abc123...

MX records:
Priority: 10
Value: mx1.resend.com

DKIM records:
Name: resend._domainkey
Value: v=DKIM1; k=rsa; p=...
```

### Step 4: Add DNS Records

**In your domain registrar (e.g., GoDaddy, Namecheap, Cloudflare):**

1. Go to DNS settings for `tanarock.hu`
2. Add each record exactly as shown in Resend
3. Save changes
4. Wait 5-30 minutes for DNS propagation

### Step 5: Verify in Resend

1. Back in Resend dashboard
2. Click **"Verify"** on your domain
3. Resend will check DNS records
4. Status should change to ✅ **Verified**

### Step 6: Test Email Delivery

```bash
# Server should already be using support@tanarock.hu
cd apps/server
pnpm dev
```

Request password reset - email should now be delivered!

---

## 🔍 Check Resend Logs

### View Email Delivery Status:

1. Go to https://resend.com/emails
2. Find recent emails
3. Look for email with ID: `594c8c9d-bddc-4434-a24d-37fddb842943`

**Status meanings:**
- ✅ **Delivered** = Email reached inbox
- ⏳ **Queued** = Still processing
- 📧 **Sent** = Left Resend, may be in spam
- ❌ **Bounced** = Rejected by recipient server
- 🚫 **Complained** = Marked as spam by recipient

**Click on the email to see:**
- Delivery status
- Bounce reason (if bounced)
- Timeline of delivery attempts
- Raw SMTP logs

---

## 🎯 Quick Comparison: Test vs Production Email

| Feature | Test Email | Production Email |
|---------|-----------|------------------|
| Email Address | `onboarding@resend.dev` | `support@tanarock.hu` |
| Verification Required | ❌ No | ✅ Yes (domain) |
| Recipient Limits | Only verified emails | Anyone |
| Setup Time | 0 minutes | 15-30 minutes |
| Professional | ❌ No | ✅ Yes |
| Spam Score | Lower | Higher if unverified |
| Best For | Development | Production |

---

## 🐛 Advanced Debugging

### Check Email Headers (If You Have Access)

If you find the email in spam:
1. Open the email
2. Click **Show Original** or **View Source**
3. Look for:
   ```
   SPF: PASS
   DKIM: PASS
   DMARC: PASS
   ```

If any of these fail, your domain verification is incomplete.

### Test Email Deliverability

**Use Resend Test Mode:**
```bash
curl -X POST "https://api.resend.com/emails" \
  -H "Authorization: Bearer YOUR_RESEND_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "support@tanarock.hu",
    "to": "elysprovider1@gmail.com",
    "subject": "Test Email",
    "html": "<p>This is a test</p>"
  }'
```

Check the response:
- Success = Resend accepted it
- Error = Problem with configuration

### Check Gmail Filtering

1. Gmail Settings (gear icon)
2. **Filters and Blocked Addresses**
3. Check if `support@tanarock.hu` is blocked
4. Check if any filters are catching the email

---

## 📝 Environment Variables Reference

### Current Configuration:
```env
RESEND_API_KEY=re_your_key_here
RESEND_FROM_EMAIL=support@tanarock.hu  # Custom domain - needs verification
FRONTEND_URL=http://localhost:3001
```

### Recommended for Testing:
```env
RESEND_API_KEY=re_your_key_here
RESEND_FROM_EMAIL=onboarding@resend.dev  # Pre-verified, works immediately
FRONTEND_URL=http://localhost:3001
```

### Switch Back to Production After Domain Verified:
```env
RESEND_API_KEY=re_your_key_here
RESEND_FROM_EMAIL=support@tanarock.hu  # Now verified
FRONTEND_URL=http://localhost:3001
```

---

## ✅ Recommended Action Plan

### For Immediate Testing (Next 5 minutes):

1. **Switch to test email:**
   ```env
   RESEND_FROM_EMAIL=onboarding@resend.dev
   ```

2. **Verify recipient in Resend dashboard:**
   - Add `elysprovider1@gmail.com` as verified recipient
   - Check email for verification link
   - Click to verify

3. **Restart server and test:**
   ```bash
   cd apps/server
   pnpm dev
   ```

4. **Request password reset** → Should work!

### For Production (Next 30 minutes):

1. **Verify domain in Resend:**
   - Add `tanarock.hu` domain
   - Copy DNS records
   - Add to domain registrar
   - Wait for propagation
   - Verify in Resend

2. **Switch back to production email:**
   ```env
   RESEND_FROM_EMAIL=support@tanarock.hu
   ```

3. **Test delivery** to any email address

---

## 🆘 Still Not Working?

### Check These:

1. **Resend Account Status**
   - Free tier limit: 100 emails/day
   - Check if you've hit the limit
   - View quota in Resend dashboard

2. **API Key Permissions**
   - Make sure API key has **Sending Access**
   - Regenerate key if unsure

3. **Gmail Blocking**
   - Try sending to a different email address (not Gmail)
   - Try Outlook, Yahoo, or another provider

4. **Resend Support**
   - Contact Resend support: help@resend.com
   - Provide email ID: `594c8c9d-bddc-4434-a24d-37fddb842943`
   - Ask about delivery status

---

## 📊 Summary

| Issue | Solution |
|-------|----------|
| Email in spam | Check spam folder, mark as not spam |
| Domain not verified | Verify domain in Resend + DNS setup |
| Testing quickly | Use `onboarding@resend.dev` |
| Recipient not verified (test email) | Add recipient in Resend dashboard |
| Wrong configuration | Check `.env` file |
| Rate limited | Check Resend quota |

---

## 🎯 Next Step

**RIGHT NOW:** Check your **Gmail Spam folder** for email from `support@tanarock.hu`

If not there → Switch to `onboarding@resend.dev` for immediate testing

If you need production emails → Verify `tanarock.hu` domain in Resend

---

**Need Help?** Drop the Resend email ID (`594c8c9d-bddc-4434-a24d-37fddb842943`) in Resend support!

