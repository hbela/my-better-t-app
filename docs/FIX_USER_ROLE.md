# Fix User Role Issue

## Problem
User `elysprovider1@gmail.com` has **OWNER** role but should have **USER** role.

---

## Understanding Roles in the System

### System Role (in User table):
- **ADMIN** - Full system access, can manage everything
- **USER** - Regular user (can be provider, client, or owner of organizations)

### Organization Role (in Member table):
- **owner** - Owner of the organization
- **provider** - Healthcare provider (can create availability)
- **member** - Regular member/client (can book appointments)

---

## What Needs to be Fixed

For `elysprovider1@gmail.com`:
1. **systemRole** should be `USER` (in User table)
2. **role** in Member table should be `provider` (not `owner`)

---

## Solution 1: Using SQL (Quickest)

### Step 1: Access Your Database

**Option A: Using SQLite CLI**
```bash
# Navigate to your database location
cd C:/sqlite/db

# Open the database
sqlite3 express.db
```

**Option B: Using DB Browser for SQLite**
- Download: https://sqlitebrowser.org/
- Open: `C:/sqlite/db/express.db`
- Go to "Execute SQL" tab

### Step 2: Check Current Status

```sql
SELECT 
  u.id as user_id,
  u.name,
  u.email,
  u.systemRole,
  m.role as org_role,
  o.name as organization
FROM User u
LEFT JOIN Member m ON u.id = m.userId
LEFT JOIN Organization o ON m.organizationId = o.id
WHERE u.email = 'elysprovider1@gmail.com';
```

### Step 3: Fix the Roles

```sql
-- Fix System Role to USER
UPDATE User 
SET systemRole = 'USER'
WHERE email = 'elysprovider1@gmail.com';

-- Fix Organization Role to provider
UPDATE Member
SET role = 'provider'
WHERE userId = (SELECT id FROM User WHERE email = 'elysprovider1@gmail.com')
AND role = 'owner';
```

### Step 4: Verify the Fix

```sql
SELECT 
  u.name,
  u.email,
  u.systemRole,
  m.role as org_role,
  o.name as organization
FROM User u
LEFT JOIN Member m ON u.id = m.userId
LEFT JOIN Organization o ON m.organizationId = o.id
WHERE u.email = 'elysprovider1@gmail.com';
```

**Expected Result:**
```
name: [name]
email: elysprovider1@gmail.com
systemRole: USER
org_role: provider
organization: [organization name]
```

---

## Solution 2: Using Prisma Studio (Visual)

### Step 1: Open Prisma Studio

```bash
cd packages/db
pnpm prisma studio
```

This will open a web interface at `http://localhost:5555`

### Step 2: Find the User

1. Click on **"User"** table
2. Find user with email `elysprovider1@gmail.com`
3. Click to edit
4. Change **systemRole** to `USER`
5. Click **Save**

### Step 3: Fix Member Role

1. Click on **"Member"** table
2. Find member record for this user
3. Check the **role** field
4. If it's `owner`, change it to `provider`
5. Click **Save**

---

## Solution 3: Create an API Endpoint (For Future)

Add this endpoint to `apps/server/src/index.ts`:

```javascript
// Fix user role (admin only)
app.post("/api/admin/fix-user-role", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { userId, systemRole, organizationRole } = req.body;

    // Update system role
    if (systemRole) {
      await prisma.user.update({
        where: { id: userId },
        data: { systemRole },
      });
    }

    // Update organization role
    if (organizationRole) {
      await prisma.member.updateMany({
        where: { userId },
        data: { role: organizationRole },
      });
    }

    res.json({ success: true, message: "User role updated successfully" });
  } catch (error) {
    console.error("Error fixing user role:", error);
    res.status(500).json({ error: "Failed to update user role" });
  }
});
```

---

## After Fixing

### 1. Restart the Server

```bash
cd apps/server
pnpm dev
```

### 2. Clear Browser Cache / Logout and Login

The user should:
1. Logout completely
2. Clear browser cache (or use Ctrl+Shift+R to hard refresh)
3. Login again

### 3. Test Provider Features

After logging in as `elysprovider1@gmail.com`, the user should be able to:
- ✅ Access provider calendar at `/provider/calendar`
- ✅ Create availability slots
- ✅ View bookings from clients
- ✅ See booked events in RED on calendar

### 4. Verify Navigation

User should NOT see:
- ❌ Owner dashboard
- ❌ Admin features
- ❌ Organization management (unless explicitly granted)

User SHOULD see:
- ✅ Provider Calendar menu item
- ✅ Create availability option
- ✅ View bookings

---

## Prevention: How to Create Providers Correctly

### When creating a provider user, ensure:

```javascript
// 1. Create user with USER systemRole
const user = await prisma.user.create({
  data: {
    name: "Provider Name",
    email: "provider@example.com",
    systemRole: "USER", // ← Important!
    emailVerified: true,
  },
});

// 2. Add as provider member (not owner)
await prisma.member.create({
  data: {
    organizationId: orgId,
    userId: user.id,
    email: user.email,
    role: "provider", // ← Important! Not "owner"
  },
});

// 3. Create provider profile
await prisma.provider.create({
  data: {
    userId: user.id,
    departmentId: deptId,
  },
});
```

---

## Common Mistakes

### ❌ Mistake 1: Setting systemRole to ADMIN
```javascript
systemRole: "ADMIN" // Wrong for providers
```
**Should be:**
```javascript
systemRole: "USER" // Correct for providers
```

### ❌ Mistake 2: Setting member role to owner
```javascript
role: "owner" // Wrong for providers
```
**Should be:**
```javascript
role: "provider" // Correct for providers
```

### ❌ Mistake 3: Not creating Provider profile
A user needs:
1. User record (with systemRole: "USER")
2. Member record (with role: "provider")
3. Provider record (linking to department)

---

## Quick Reference

| What | Should Be | Wrong Values |
|------|-----------|--------------|
| User.systemRole | `USER` | `ADMIN`, `OWNER` |
| Member.role | `provider` | `owner`, `admin` |
| Provider table | Record exists | No record |

---

## Troubleshooting

### After fix, still seeing owner dashboard?

1. **Clear browser cache**:
   ```
   Ctrl + Shift + Delete (Chrome/Edge)
   Ctrl + Shift + R (Hard refresh)
   ```

2. **Logout and login again**

3. **Check session**:
   - Open browser DevTools (F12)
   - Go to Application → Cookies
   - Delete all cookies for your domain
   - Refresh and login

### Still not working?

Check the routing logic in your frontend. The redirect logic is in:
```
apps/web/src/components/sign-in-form.tsx
```

Make sure it checks:
```javascript
// Check if user is a provider
const response = await fetch(
  `${import.meta.env.VITE_SERVER_URL}/api/providers?userId=${userId}`,
  { credentials: "include" }
);
const providers = await response.json();

if (providers.length > 0) {
  // User is a provider, redirect to calendar
  navigate({ to: "/provider/calendar" });
  return;
}
```

---

## Need Help?

If SQL commands don't work or you need assistance:

1. **Check database path**: Ensure you're editing the correct database file
2. **Backup first**: Copy `booking.db` before making changes
3. **Use transactions**: Wrap updates in BEGIN/COMMIT if using CLI

---

**Status:** Ready to apply  
**Risk:** Low (only affects one user)  
**Time:** 2-5 minutes  
**Requires:** Database access

