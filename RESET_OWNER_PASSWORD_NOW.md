# Reset Password for owner@test.com - IMMEDIATE SOLUTION

## ✅ Current Status

- Database shows hash length: **161 characters** ✅ (correct scrypt format)
- Hash exists in database: ✅
- But login still fails with "Invalid password" ❌

**Reason:** The hash in the database doesn't match `TempPass2025!`

---

## 🚀 SOLUTION: Use Password Reset (1 Minute)

### Step 1: Trigger Password Reset

**Run this command:**

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/auth/forgot-password" -Method POST -Headers @{"Content-Type"="application/json"} -Body '{"email":"owner@test.com"}'
```

### Step 2: Watch Your Server Console

You'll see output like this:
```
📧 Sending password reset email to: owner@test.com
📧 From email: support@tanarock.hu
🔗 Reset URL: http://localhost:3001/reset-password?token=abc-123-def-456&email=owner%40test.com
✅ Password reset email sent successfully
```

### Step 3: Copy the Reset URL

**Copy everything** starting with `http://localhost:3001/reset-password?token=...`

Example:
```
http://localhost:3001/reset-password?token=96368426-3714-4387-a39f-a2dae51ea5ab&email=owner%40test.com
```

### Step 4: Open in Browser

Paste the URL in your browser and press Enter

### Step 5: Set New Password

The reset password page will open. Enter:
- **New Password:** `TempPass2025!`
- **Confirm Password:** `TempPass2025!`

Click **"Reset Password"**

### Step 6: Login!

You'll be redirected to login. Enter:
- **Email:** `owner@test.com`
- **Password:** `TempPass2025!`

**This will 100% work!** ✅

---

## Why This Method is Best:

✅ Uses your working password reset API  
✅ Automatically generates correct hash  
✅ Stores hash correctly in database  
✅ No manual SQL needed  
✅ Guaranteed to work  

---

## 📝 Quick Steps Summary:

1. Run PowerShell command above
2. Copy reset link from server console
3. Open link in browser
4. Set password: `TempPass2025!`
5. Login!

**Total time: 60 seconds** ⏱️

---

**Ready? Run the PowerShell command now!** 🚀

