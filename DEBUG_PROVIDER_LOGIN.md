# Debug Provider Login Issues - Step by Step

## Current Status

From your console logs, we can see:
- ❌ `role: undefined` - Not in session
- ❌ `needsPasswordChange: undefined` - Not in session  
- ✅ User data is being retrieved (email, name, etc.)
- ❌ Redirecting to `/client` instead of `/provider`

## Changes Made

1. **packages/auth/src/index.ts** - Added:
   - `role` and `needsPasswordChange` to `additionalFields`
   - `databaseHooks` to log when user is read from database
   - `session.created` hook to log session data

2. **apps/web/src/lib/auth-client.ts** - Added:
   - `fetchOptions: { credentials: "include" }` for proper cookie handling

## 🔧 Step-by-Step Fix

### Step 1: Verify Database Has Correct Data

Run this SQL query to check Anna Kovacs's record:

```sql
SELECT 
    id,
    email,
    name,
    role,
    needsPasswordChange,
    emailVerified,
    createdAt
FROM user 
WHERE email = 'anna.kovacs@tanarock.hu';
```

**Expected result:**
```
role: PROVIDER
needsPasswordChange: 1 (or true)
emailVerified: 1 (or true)
```

**If role is NULL or not PROVIDER:**
```sql
UPDATE user 
SET 
    role = 'PROVIDER',
    needsPasswordChange = 1
WHERE email = 'anna.kovacs@tanarock.hu';
```

### Step 2: RESTART BOTH Server and Client

**This is CRITICAL!** The changes to `packages/auth/src/index.ts` won't take effect until restart.

#### Restart Server:
```bash
# Terminal 1: Stop server (Ctrl+C), then:
cd apps/server
npm run dev
# or
pnpm dev
```

#### Restart Client (Web):
```bash
# Terminal 2: Stop client (Ctrl+C), then:
cd apps/web
npm run dev
# or  
pnpm dev
```

### Step 3: Clear Browser Cache & Cookies

**Important:** Old session cookies might be cached!

1. Open DevTools (F12)
2. Go to Application tab (Chrome) or Storage tab (Firefox)
3. Clear all cookies for localhost:3001 and localhost:3000
4. Or just use **Incognito/Private Window**

### Step 4: Test Login with Debug Logs

1. Open browser console (F12 → Console)
2. Go to http://localhost:3001/login
3. Login with:
   - Email: `anna.kovacs@tanarock.hu`
   - Password: `password123`

**Watch the Console for:**

#### Server Logs (Terminal):
```
🔐 Session created for user: anna.kovacs@tanarock.hu
🔐 Session user data: { role: 'PROVIDER', needsPasswordChange: true }
🔍 User read from database: { email: 'anna.kovacs@tanarock.hu', role: 'PROVIDER', needsPasswordChange: true }
```

#### Browser Console:
```
🔍 Sign-in context: ...
🔍 User data: { ..., role: "PROVIDER", needsPasswordChange: true }
🔍 User role: PROVIDER
🔍 Needs password change: true
✅ Password change required - showing dialog
```

### Step 5: Expected Behavior

**If everything works:**
1. ✅ Console shows `role: PROVIDER`
2. ✅ Console shows `needsPasswordChange: true`
3. ✅ Password change dialog appears
4. ✅ After changing password → redirects to `/provider`

**If it still doesn't work:**

Continue to Step 6...

### Step 6: If Role is Still Undefined

If you see `role: undefined` after restart, the issue is that Better Auth Prisma adapter isn't including the role field. We need to verify the Prisma schema.

Run this to regenerate Prisma client:
```bash
cd packages/db
npx prisma generate
```

Then restart both server and client again.

### Step 7: Alternative - Use API Fallback Only

If the session still doesn't include role/needsPasswordChange, we can rely entirely on the API check. The issue is that the API endpoint also needs to exist.

Check if this endpoint works:
```
http://localhost:3000/api/auth/check-password-change
```

If you get 404, the server isn't running on port 3000, or the endpoint doesn't exist.

Check your server logs for what port it's running on:
```
🚀 Server is running on port 3000
```

## 🐛 Debugging Checklist

- [ ] Database has `role = 'PROVIDER'` for anna.kovacs@tanarock.hu
- [ ] Database has `needsPasswordChange = 1` for anna.kovacs@tanarock.hu
- [ ] Server restarted after changes to `packages/auth/src/index.ts`
- [ ] Client (web) restarted
- [ ] Browser cookies cleared (or using incognito)
- [ ] Server logs show user read with role and needsPasswordChange
- [ ] Browser console shows role and needsPasswordChange in user data
- [ ] Prisma client regenerated

## 📊 What Each Log Means

### Server Terminal Logs

| Log | Meaning |
|-----|---------|
| `🔍 User read from database: { role: 'PROVIDER', ... }` | ✅ Database has correct data |
| `🔐 Session created for user:` | ✅ Session being created |
| `🔐 Session user data: { role: 'PROVIDER', ... }` | ✅ Role included in session |

### Browser Console Logs

| Log | Meaning |
|-----|---------|
| `🔍 User role: PROVIDER` | ✅ Role in session |
| `🔍 User role: undefined` | ❌ Role NOT in session |
| `🔍 Needs password change: true` | ✅ Field in session |
| `🔍 Needs password change: undefined` | ❌ Field NOT in session |
| `✅ Password change required - showing dialog` | ✅ Dialog will show |
| `🚀 Redirecting based on role: PROVIDER` | ✅ Correct redirect |
| `⚠️ Defaulting to CLIENT dashboard` | ❌ Role is undefined |

## 🎯 Quick Test Commands

### Check Database:
```sql
-- Check Anna Kovacs
SELECT email, role, needsPasswordChange FROM user WHERE email = 'anna.kovacs@tanarock.hu';

-- Check all providers
SELECT u.email, u.role, u.needsPasswordChange, p.id as provider_id
FROM user u
INNER JOIN provider p ON u.id = p.userId;
```

### Fix Database if Needed:
```sql
UPDATE user 
SET role = 'PROVIDER', needsPasswordChange = 1
WHERE email = 'anna.kovacs@tanarock.hu';
```

### Verify Update:
```sql
SELECT email, role, needsPasswordChange FROM user WHERE email = 'anna.kovacs@tanarock.hu';
```

## 🔍 Next Steps

After completing all steps above:

1. **Share the logs:** Copy the console output (both browser and server) if it still doesn't work
2. **Verify database:** Run the SQL query and share the result
3. **Check ports:** Confirm server is running on the correct port

The debug logs we added will tell us exactly where the problem is! 🎯

