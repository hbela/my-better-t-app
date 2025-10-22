# Fix Email Delivery - Gmail Blocking tanarock.hu

## 🎯 **Problem Identified:**
Gmail has flagged `tanarock.hu` domain and is blocking emails from `support@tanarock.hu` to `hausermaximilien@gmail.com`.

## ⚡ **Quick Fix - Switch to Test Domain:**

### **Step 1: Update .env File**

**Edit `apps/server/.env`:**
```env
RESEND_FROM_EMAIL=onboarding@resend.dev
```

**Keep everything else the same:**
```env
RESEND_API_KEY=re_eqVZ9QxX...your_key_here
CORS_ORIGIN=http://localhost:3001
FRONTEND_URL=http://localhost:3001
```

### **Step 2: Restart Server**
```bash
cd apps/server
pnpm dev
```

### **Step 3: Test Email Delivery**

**Send a test email:**
```bash
$body = @{ to = "hausermaximilien@gmail.com"; subject = "Test Email"; message = "This is a test email to verify delivery." } | ConvertTo-Json; Invoke-RestMethod -Uri "http://localhost:3000/api/test-email" -Method POST -ContentType "application/json" -Body $body
```

**Or test password reset:**
- Go to your app
- Try password reset for `hausermaximilien@gmail.com`
- Check if email is received

---

## 📧 **Important Notes for Test Domain:**

### **With `onboarding@resend.dev`:**
- ✅ **Works immediately** - No domain verification needed
- ⚠️ **Recipient must be verified** in Resend dashboard
- ⚠️ **Limited to 100 emails/day** for free accounts

### **To Verify Recipient Email:**
1. Go to: https://resend.com/settings/emails
2. Add `hausermaximilien@gmail.com`
3. Verify it (check email for verification link)
4. Then test email delivery

---

## 🔧 **Long-term Solutions:**

### **Option 1: Fix Domain Reputation**
1. **Check domain reputation:**
   - https://mxtoolbox.com/blacklists.aspx
   - Enter `tanarock.hu`
   - See if it's blacklisted

2. **Improve domain reputation:**
   - Send emails to engaged users only
   - Avoid spam triggers
   - Use proper SPF/DKIM records

### **Option 2: Use Different Domain**
- Set up a new domain for email
- Verify it in Resend
- Use that for email sending

### **Option 3: Use Email Service Provider**
- Switch to SendGrid, Mailgun, or similar
- They handle deliverability better

---

## 🎯 **Immediate Action:**

**Update your `.env` file to use test domain:**

```env
RESEND_FROM_EMAIL=onboarding@resend.dev
```

**Restart server and test!**

This should immediately fix the email delivery issue.

---

## 📋 **Testing Checklist:**

- [ ] Update `.env` file
- [ ] Restart server
- [ ] Send test email
- [ ] Check inbox (should work now!)
- [ ] Test password reset
- [ ] Verify recipient email in Resend dashboard

**The test domain should work immediately!**
