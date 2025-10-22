# Role Detection Logic Fix

## 🐛 Problem Identified

User `elysprovider1@gmail.com` was showing **"OWNER"** role in the navbar, but:
- ✅ Has `systemRole: USER` in User table (correct)
- ❌ NOT in Member table (no organization membership)
- ❓ Unknown if in Provider table

**Root Cause:** Frontend logic was **defaulting to OWNER** for any non-admin user, regardless of actual role.

---

## 🔧 Fix Applied

Updated role detection logic in **two components**:

### 1. `apps/web/src/components/header.tsx`
### 2. `apps/web/src/components/user-menu.tsx`

---

## 📊 Old Logic (Broken)

```javascript
// OLD - WRONG
if (systemRole === "ADMIN") {
  setUserRole("ADMIN");
} else {
  setUserRole("OWNER"); // ❌ Default to OWNER for everyone!
}

// Then check provider
if (isProvider) {
  setUserRole("PROVIDER"); // Override to PROVIDER
}
```

**Problem:** Any non-admin user defaults to OWNER, even if they're not.

---

## ✅ New Logic (Fixed)

```javascript
// NEW - CORRECT
if (systemRole === "ADMIN") {
  setUserRole("ADMIN");
  return;
}

// Check if user is a PROVIDER first
const providers = await fetch('/api/providers?userId=...');
if (providers.length > 0) {
  setUserRole("PROVIDER");
  return;
}

// Not a provider, check if OWNER via organization membership
const orgs = await fetch('/api/organizations/my-organizations');
const ownerOrgs = orgs.filter(org => org.role === "owner");
if (ownerOrgs.length > 0) {
  setUserRole("OWNER");
} else {
  // Regular user/client with no special role
  setUserRole(null); // or "CLIENT" in user-menu
}
```

**Benefits:**
- ✅ Only shows OWNER if actually an owner of an organization
- ✅ Shows PROVIDER if in Provider table
- ✅ Shows ADMIN if systemRole is ADMIN
- ✅ Shows CLIENT (or null) for regular users

---

## 🎯 How Roles Are Now Determined

### Priority Order:

1. **ADMIN** - If `User.systemRole === "ADMIN"`
2. **PROVIDER** - If user has record in `Provider` table
3. **OWNER** - If user has `Member` record with `role === "owner"`
4. **CLIENT/null** - Regular user (can book appointments)

### API Endpoints Used:

1. **Check Provider:**
   ```
   GET /api/providers?userId={userId}
   Returns: Array of provider records
   ```

2. **Check Owner:**
   ```
   GET /api/organizations/my-organizations
   Returns: Array of organizations where user is member
   ```

---

## 📋 What User Sees Now

### For `elysprovider1@gmail.com`:

**If user IS in Provider table:**
- Navbar: "My Calendar" link
- User Menu: Role shows "PROVIDER"
- Can access: `/provider/calendar`

**If user is NOT in Provider table:**
- Navbar: "Book Appointment" link only
- User Menu: Role shows "CLIENT"
- Can access: `/client/` (booking interface)

---

## 🔍 Next Step: Check if User is a Provider

To determine what the user should see, check the database:

### SQL Query:

```sql
-- Check if user is a provider
SELECT 
  u.email,
  u.systemRole,
  p.id as provider_id,
  d.name as department,
  o.name as organization
FROM User u
LEFT JOIN Provider p ON u.id = p.userId
LEFT JOIN Department d ON p.departmentId = d.id
LEFT JOIN Organization o ON d.organizationId = o.id
WHERE u.email = 'elysprovider1@gmail.com';
```

### Expected Results:

**If Provider:**
```
email: elysprovider1@gmail.com
systemRole: USER
provider_id: [some-id]
department: [department-name]
organization: [org-name]
```

**If Not Provider:**
```
email: elysprovider1@gmail.com
systemRole: USER
provider_id: NULL
department: NULL
organization: NULL
```

---

## 🛠️ If User Should Be a Provider

### Add to Provider Table:

```sql
-- 1. Get the user ID
SELECT id FROM User WHERE email = 'elysprovider1@gmail.com';

-- 2. List available departments
SELECT d.id, d.name, o.name as organization
FROM Department d
JOIN Organization o ON d.organizationId = o.id;

-- 3. Create provider record
INSERT INTO Provider (id, userId, departmentId, createdAt, updatedAt)
VALUES (
  'provider-uuid-here',  -- Generate UUID
  '[user-id-from-step-1]',
  '[department-id-from-step-2]',
  datetime('now'),
  datetime('now')
);

-- 4. Add as member to organization (if not already)
INSERT INTO Member (id, organizationId, userId, email, role, createdAt)
SELECT 
  'member-uuid-here',  -- Generate UUID
  d.organizationId,
  '[user-id]',
  'elysprovider1@gmail.com',
  'provider',
  datetime('now')
FROM Department d
WHERE d.id = '[department-id]';
```

---

## 🧪 Testing the Fix

### Step 1: Refresh Frontend

```bash
# The frontend should auto-reload
# If not, hard refresh: Ctrl+Shift+R
```

### Step 2: User Logs Out and Logs In

1. Click user menu
2. Click "Sign Out"
3. Clear browser cache (optional but recommended)
4. Login again as `elysprovider1@gmail.com`

### Step 3: Check Role Display

**Check User Menu:**
- Click on user name in top-right
- Look at "Role: [...]" text
- Should show:
  - "PROVIDER" if in Provider table
  - "CLIENT" if not in Provider table
  - NOT "OWNER" (unless actually owner)

**Check Navbar:**
- Should see appropriate links based on role
- PROVIDER: "My Calendar"
- CLIENT: "Book Appointment"
- OWNER: "Dashboard", "Departments", "Providers"

### Step 4: Check Browser Console

Open DevTools (F12) → Console → Look for:
```
👤 Logged in user: {
  name: "...",
  email: "elysprovider1@gmail.com",
  systemRole: "USER",
  detectedRole: "PROVIDER" or "CLIENT"
}
```

---

## 🎯 Expected Behavior After Fix

### If User IS a Provider:
- ✅ Sees "PROVIDER" role in user menu
- ✅ Sees "My Calendar" link in navbar
- ✅ Can access `/provider/calendar`
- ✅ Can create availability slots
- ✅ Can view bookings

### If User is NOT a Provider:
- ✅ Sees "CLIENT" role in user menu
- ✅ Sees "Book Appointment" link in navbar
- ✅ Can access `/client/` pages
- ✅ Can browse providers and book appointments
- ❌ Cannot access provider calendar

---

## 📝 Files Modified

1. **`apps/web/src/components/header.tsx`**
   - Fixed role detection logic
   - No longer defaults to OWNER
   - Checks provider first, then owner membership

2. **`apps/web/src/components/user-menu.tsx`**
   - Fixed role display logic
   - Shows "CLIENT" instead of "OWNER" for regular users
   - Same checking logic as header

---

## 🔐 Role Summary Table

| User Type | systemRole | Member.role | Provider | Display Role | Navbar Access |
|-----------|------------|-------------|----------|--------------|---------------|
| Admin | ADMIN | any | any | ADMIN | Admin panel |
| Provider | USER | provider | ✅ Yes | PROVIDER | My Calendar |
| Owner | USER | owner | ❌ No | OWNER | Dashboard, Depts, Providers |
| Client | USER | member/none | ❌ No | CLIENT | Book Appointment |

---

## ✅ Verification Checklist

After the fix:

- [ ] User logs out and logs back in
- [ ] Browser cache cleared (hard refresh)
- [ ] User menu shows correct role (not OWNER)
- [ ] Navbar shows appropriate links
- [ ] User can access their features
- [ ] No unauthorized access to owner features
- [ ] Console log shows correct detectedRole

---

## 🆘 If Still Showing OWNER

### 1. Check Provider Table:
```sql
SELECT * FROM Provider WHERE userId = (
  SELECT id FROM User WHERE email = 'elysprovider1@gmail.com'
);
```

### 2. Check Member Table:
```sql
SELECT * FROM Member WHERE userId = (
  SELECT id FROM User WHERE email = 'elysprovider1@gmail.com'
);
```

### 3. Clear All Cache:
- Browser cache (Ctrl+Shift+Delete)
- Cookies for the site
- Local storage (DevTools → Application → Storage)
- Hard refresh (Ctrl+Shift+R)

### 4. Check API Responses:
- Open DevTools → Network tab
- Filter: "providers"
- Login and watch the API calls
- Check response for `/api/providers?userId=...`

---

## 📚 Related Documentation

- User and role management: `docs/API.md`
- Frontend routing: `apps/web/src/components/header.tsx`
- Authentication: `packages/auth/`

---

**Status:** ✅ Fixed  
**Date:** January 2025  
**Files Changed:** 2  
**Testing Required:** Yes (logout/login)

