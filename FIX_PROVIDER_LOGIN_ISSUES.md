# Fix: Provider Login Issues - Password Change Dialog & Redirect

## Issues Found

1. **Password change dialog not showing:** The `needsPasswordChange` field wasn't being included in the Better Auth session
2. **Wrong redirect:** Provider was being redirected to `/client` instead of `/provider` because the `role` field wasn't properly exposed in the session

## Root Cause

Better Auth needs to explicitly declare custom fields (like `role` and `needsPasswordChange`) in the `additionalFields` configuration to include them in the session data, even if they exist in the Prisma schema.

## Changes Made

### 1. Fixed Better Auth Configuration (`packages/auth/src/index.ts`)

**Added `role` to additionalFields:**
```typescript
user: {
  additionalFields: {
    role: {
      type: "string",
      defaultValue: "CLIENT",
      required: false,
    },
    needsPasswordChange: {
      type: "boolean",
      defaultValue: false,
      required: false,
    },
    // ... other fields
  },
}
```

**Why this matters:**
- Without this, `role` and `needsPasswordChange` are NOT included in the session user object
- This caused the redirect logic to default to CLIENT (line 110 in sign-in-form.tsx)
- This prevented the password change check from seeing `needsPasswordChange: true`

### 2. Enhanced Sign-In Form Debug Logging (`apps/web/src/components/sign-in-form.tsx`)

**Added comprehensive debugging:**
```typescript
console.log("🔍 Sign-in context:", context);
console.log("🔍 User data:", context.data?.user);
console.log("🔍 User role:", role);
console.log("🔍 Needs password change:", needsPasswordChange);
```

**Added direct session check:**
```typescript
const needsPasswordChange = context.data?.user?.needsPasswordChange;

// Check if user needs to change password (from session data or API)
if (needsPasswordChange) {
  console.log("✅ Password change required - showing dialog");
  setPendingRedirectRole(role);
  setShowPasswordChangeDialog(true);
  return; // Don't redirect yet
}
```

**Why this matters:**
- Now checks `needsPasswordChange` directly from session data (faster)
- Still falls back to API check if not in session
- Extensive logging helps debug any future issues

## How It Works Now

### 1. Owner Creates Provider
```
Owner → Creates Provider
  ↓
Backend creates user:
  - role: "PROVIDER" 
  - needsPasswordChange: true
  - password: "password123" (hashed)
```

### 2. Provider First Login
```
Provider logs in
  ↓
Better Auth returns session with:
  - user.role: "PROVIDER" ✅ (now included!)
  - user.needsPasswordChange: true ✅ (now included!)
  ↓
Sign-in form checks needsPasswordChange
  ↓
Shows mandatory password change dialog
```

### 3. After Password Change
```
Provider enters new password
  ↓
Backend updates:
  - password: (new hashed password)
  - needsPasswordChange: false
  ↓
Redirect based on role: "PROVIDER"
  ↓
Navigate to: http://localhost:3001/provider/ ✅
```

### 4. Subsequent Logins
```
Provider logs in with new password
  ↓
Session includes:
  - user.role: "PROVIDER"
  - user.needsPasswordChange: false
  ↓
No dialog shown
  ↓
Direct redirect to /provider/ ✅
```

## Testing Instructions

**⚠️ IMPORTANT: You must restart the server for these changes to take effect!**

### Step 1: Restart the Server

In your server terminal (apps/server):
```bash
# Stop the server (Ctrl+C)
# Then restart it
npm run dev
# or
pnpm dev
```

### Step 2: Test Provider Creation & Login

1. **As Owner:**
   - Login to http://localhost:3001
   - Navigate to provider management
   - Create a NEW provider (important: use a new email)
   - Provider created with:
     - Temporary password: "password123"
     - needsPasswordChange: true
     - role: PROVIDER

2. **As New Provider (First Login):**
   - Logout or open incognito window
   - Go to http://localhost:3001/login
   - Login with provider email and password "password123"
   - **Open browser console (F12) to see debug logs**
   
   **Expected Console Logs:**
   ```
   🔍 Sign-in context: {...}
   🔍 User data: { role: "PROVIDER", needsPasswordChange: true, ... }
   🔍 User role: PROVIDER
   🔍 Needs password change: true
   ✅ Password change required - showing dialog
   ```
   
   **Expected UI:**
   - Mandatory password change dialog appears
   - Cannot close or dismiss it
   
3. **Change Password:**
   - Enter new password (min 8 characters)
   - Confirm password
   - Click "Update Password"
   
   **Expected Console Logs:**
   ```
   🚀 Redirecting based on role: PROVIDER
   ```
   
   **Expected Result:**
   - Redirected to: http://localhost:3001/provider/ ✅
   - Provider dashboard loads
   - Header shows provider email and role "PROVIDER" ✅

4. **Test Subsequent Login:**
   - Logout
   - Login again with NEW password
   
   **Expected Console Logs:**
   ```
   🔍 User role: PROVIDER
   🔍 Needs password change: false
   🔍 Password change check response: { needsPasswordChange: false, ... }
   🚀 Redirecting based on role: PROVIDER
   ```
   
   **Expected Result:**
   - No password dialog (already changed) ✅
   - Direct redirect to /provider/ ✅

### Debugging Tips

If it still doesn't work after restarting:

1. **Check Browser Console:**
   - Look for the 🔍 debug logs
   - Verify `role` is "PROVIDER" (not undefined or "CLIENT")
   - Verify `needsPasswordChange` is true on first login

2. **Check Server Logs:**
   - Look for "🔐 Auth Package" logs on server start
   - Verify DATABASE_URL is correct
   - Check for any Better Auth errors

3. **Check Database:**
   - Verify provider user has:
     ```sql
     SELECT email, role, needsPasswordChange FROM user WHERE role = 'PROVIDER';
     ```
   - Should show: role='PROVIDER', needsPasswordChange=1 (or true)

4. **Clear Browser Cache:**
   - Old session might be cached
   - Try incognito/private window
   - Or clear cookies for localhost:3001

5. **Verify API Response:**
   - Check Network tab (F12)
   - Look for `/api/auth/check-password-change`
   - Should return: `{ needsPasswordChange: true, user: {...} }`

## Files Changed

1. `packages/auth/src/index.ts` - Added `role` to additionalFields
2. `apps/web/src/components/sign-in-form.tsx` - Added debug logging and direct session check

## Why This Is Important

Without these fixes:
- ❌ `role` is not in session → always redirects to /client
- ❌ `needsPasswordChange` is not in session → dialog never shows
- ❌ Provider can't access provider dashboard
- ❌ Temporary password never gets changed

With these fixes:
- ✅ `role` in session → correct redirect to /provider
- ✅ `needsPasswordChange` in session → dialog shows on first login
- ✅ Provider can access provider dashboard
- ✅ Security: Temporary password must be changed

## Next Steps

1. **Restart server** (critical!)
2. **Test with NEW provider** (existing providers may need manual DB update)
3. **Check console logs** to verify role and needsPasswordChange are in session
4. **Verify redirect** goes to /provider not /client
5. **Verify dialog** shows on first login

If issues persist after restart, share the console logs from the browser (F12 → Console) during login.

