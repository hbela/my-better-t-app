# Reset Password for owner@test.com

## ✅ Simplest Solution: Use Your Password Reset API

Since your password reset is working perfectly, let's use it!

### Method 1: Via API Call (30 seconds)

**Step 1: Make sure your server is running**

**Step 2: Send reset request:**

In PowerShell:
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/auth/forgot-password" `
  -Method POST `
  -Headers @{"Content-Type"="application/json"} `
  -Body '{"email":"owner@test.com"}'
```

Or use curl if you have it:
```bash
curl -X POST http://localhost:3000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"owner@test.com\"}"
```

**Step 3: Check your server console output**

You should see:
```
📧 Sending password reset email to: owner@test.com
🔗 Reset URL: http://localhost:3001/reset-password?token=XXXXXXXX&email=owner@test.com
✅ Password reset email sent successfully
```

**Step 4: Copy the Reset URL from console**

**Step 5: Open the URL in your browser**

**Step 6: Enter new password:**
- New Password: `TempPass2025!`
- Confirm: `TempPass2025!`

**Step 7: Click "Reset Password"**

**Step 8: Login!**
- Email: owner@test.com
- Password: TempPass2025!

---

## Method 2: Via Frontend (1 minute)

**Step 1: Go to login page**
http://localhost:3001/login

**Step 2: Click "Forgot your password?"**

**Step 3: Enter email**
owner@test.com

**Step 4: Click "Send Reset Email"**

**Step 5: Check server console for reset link**
(Email won't be delivered if domain isn't verified, but link will be in console)

**Step 6: Copy and open the reset link**

**Step 7: Set password: `TempPass2025!`**

**Step 8: Login!**

---

## Method 3: Direct SQL with Fresh Hash (Manual)

If you prefer SQL, here's a fresh hash I just generated:

### New Hash Generated:
```
2df68cf5ab3fa1f0c7c494f69ba09e4e:638a76c16b50d971d53433a9310def5156433ad709ee47a9626d0c6a570819be8a11ec8560a3d0096c25846393de7d82fd38fc244e1f5681d892718b104dfa26
```

### SQL Command:
```sql
-- Open: sqlite3 C:/sqlite/db/express.db

UPDATE Account
SET password = '2df68cf5ab3fa1f0c7c494f69ba09e4e:638a76c16b50d971d53433a9310def5156433ad709ee47a9626d0c6a570819be8a11ec8560a3d0096c25846393de7d82fd38fc244e1f5681d892718b104dfa26',
    updatedAt = datetime('now')
WHERE userId = (SELECT id FROM User WHERE email = 'owner@test.com')
AND providerId = 'credential';

-- Verify it was updated:
SELECT password, updatedAt 
FROM Account 
WHERE userId = (SELECT id FROM User WHERE email = 'owner@test.com')
AND providerId = 'credential';
```

After running SQL, check:
- Password field should show the new hash
- updatedAt should show current timestamp

---

## 🔍 Troubleshooting "Invalid Password" Error

### Check 1: Verify SQL Update Worked

Run this in SQLite:
```sql
SELECT 
  u.email,
  a.password,
  length(a.password) as hash_length,
  a.updatedAt
FROM User u
JOIN Account a ON u.id = a.userId
WHERE u.email = 'owner@test.com'
AND a.providerId = 'credential';
```

**Expected:**
- hash_length: ~160 characters (scrypt format)
- password: should start with hex characters like `2df68cf5...`
- updatedAt: should be recent

**If hash_length is 60:**
- Still using old bcrypt hash
- SQL update didn't work

### Check 2: SQL Update Syntax

Make sure you're in the correct database:
```bash
sqlite3 C:/sqlite/db/express.db
```

Then run the UPDATE command.

### Check 3: Try Different Password

Sometimes special characters cause issues. Try simpler password:

Generate hash for simple password:
```bash
# In apps/server directory
node -e "import('better-auth/crypto').then(m => m.hashPassword('password123')).then(h => console.log(h))"
```

Then update with that hash and test with password: `password123`

---

## ⚡ RECOMMENDED: Use Password Reset Flow

The **easiest and most reliable** method is to use your working password reset:

1. Server running → Go to login page
2. Click "Forgot password"
3. Enter owner@test.com
4. **Look at server console** for reset link
5. Open that link
6. Set new password
7. Done!

This bypasses all SQL and ensures the hash is 100% correct!

---

**Try the password reset flow - it's working perfectly and will definitely work!** 🎯

