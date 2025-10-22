# Email Not Delivered - Diagnostic Checklist

## 🔍 Step 1: Check Email Configuration

**Open this URL in your browser:**
```
http://localhost:3000/debug/email-config
```

**You should see:**
```json
{
  "resendConfigured": true,  ← Should be true
  "apiKeyPreview": "re_xxxxxxx...xxxx",
  "fromEmail": "support@tanarock.hu",
  "corsOrigin": "http://localhost:3001",
  "frontendUrl": "http://localhost:3001"
}
```

**If `resendConfigured: false`:**
- Your `.env` file is NOT being loaded
- Or RESEND_API_KEY is not set in it

---

## 🔍 Step 2: Verify .env File Contents

Your `.env` file should have (at minimum):

```env
RESEND_API_KEY=re_YourActualKeyHere
RESEND_FROM_EMAIL=support@tanarock.hu
```

**Check:**
1. File location: `apps/server/.env` ✅
2. RESEND_API_KEY line exists?
3. API key starts with `re_`?
4. No spaces around the `=` sign?
5. No quotes around the value?

**Correct format:**
```env
RESEND_API_KEY=re_abc123def456
```

**Wrong formats:**
```env
RESEND_API_KEY = re_abc123def456    ← Extra spaces
RESEND_API_KEY="re_abc123def456"    ← Quotes (usually wrong)
RESEND_API_KEY = "re_abc123def456"  ← Both issues
```

---

## 🔍 Step 3: Check Resend Dashboard

Since server logs show:
```
✅ Password reset email sent successfully: { 
  data: { id: 'a0579317-e77d-46bc-9f36-7a58ea29377e' }, 
  error: null 
}
```

The email WAS sent to Resend. Check where it went:

### Go to Resend Dashboard:
1. Visit: https://resend.com/emails
2. **Make sure you're logged into the correct account**
3. Look for email with ID: `a0579317-e77d-46bc-9f36-7a58ea29377e`
4. Click on it to see delivery status

**Possible issues:**
- **Wrong Resend account:** You might have multiple accounts
- **Date filter:** Check "All time" not just "Today"
- **Different API key:** API key might be from different account

---

## 🔍 Step 4: Check Domain Verification

If emails appear in Resend but not delivered:

### Your Domain: `tanarock.hu`

1. Go to: https://resend.com/domains
2. Check if `tanarock.hu` is listed
3. Check status:
   - ✅ **Verified** = Should work
   - ⚠️ **Pending** = Waiting for DNS
   - ❌ **Not Added** = Need to add domain

**If NOT verified:**
- Emails from `support@tanarock.hu` will be rejected by Gmail
- Switch to `onboarding@resend.dev` for testing

---

## ⚡ Quick Test: Switch to Test Email

### Temporary Fix for Testing:

**Edit `apps/server/.env`:**
```env
RESEND_FROM_EMAIL=onboarding@resend.dev
```

**Restart server:**
```bash
cd apps/server
pnpm dev
```

**Test password reset again**

**Important:** With `onboarding@resend.dev`:
- Recipient email must be verified in Resend
- Go to: https://resend.com/settings/emails
- Add `hausermaximilien@gmail.com`
- Verify it
- Then test password reset

---

## 🎯 Most Likely Scenarios

### Scenario 1: Domain Not Verified (Most Common)
- Emails sent to Resend ✅
- Resend tries to deliver ❌
- Gmail/other providers reject (unverified sender)

**Fix:** Verify domain OR switch to `onboarding@resend.dev`

### Scenario 2: Wrong Resend Account
- API key from Account A
- Looking at dashboard of Account B
- Emails are in Account A

**Fix:** Make sure you're logged into correct Resend account

### Scenario 3: Recipient Not Verified (Test Email)
- Using `onboarding@resend.dev`
- Recipient not verified in Resend
- Email silently dropped

**Fix:** Verify recipient email in Resend dashboard

---

## 🛠️ Debug Commands

### Check what your server sees:

Visit in browser:
```
http://localhost:3000/debug/email-config
```

Look for:
- `resendConfigured: true` (API key is set)
- `fromEmail` value
- Compare with what you have in Resend

### Test Resend API directly:

```bash
# Replace YOUR_API_KEY with actual key
curl -X POST https://api.resend.com/emails \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "onboarding@resend.dev",
    "to": "your@email.com",
    "subject": "Test",
    "html": "<p>Test</p>"
  }'
```

If this works → API key is fine  
If this fails → API key issue

---

## 📋 Action Plan

1. **Check:** `http://localhost:3000/debug/email-config`
2. **Verify:** You're on correct Resend account (https://resend.com/emails)
3. **Search:** Email ID `a0579317-e77d-46bc-9f36-7a58ea29377e` in Resend
4. **Check:** Domain status (https://resend.com/domains)
5. **If unverified:** Switch to `onboarding@resend.dev` temporarily

---

**Start with checking the debug endpoint!** This will tell us if the API key is actually loaded.

Visit: **`http://localhost:3000/debug/email-config`**

What does it show?

