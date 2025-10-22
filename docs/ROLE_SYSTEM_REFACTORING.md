# Role System Refactoring - Single Role Column

## 🎯 Overview

Simplifying the role management system from a complex multi-column approach to a single `role` column in the User table.

### OLD System (Redundant):
- ❌ `User.systemRole` (ADMIN/USER)
- ❌ `User.role` (user/admin)
- ❌ `Member.role` (owner/provider/member)
- ❌ Complex logic to determine actual user role

### NEW System (Simplified):
- ✅ `User.role` ENUM (ADMIN/OWNER/PROVIDER/CLIENT) - **UPPERCASE**
- ✅ Single source of truth
- ✅ Simple and clear role assignment

---

## 📋 Migration Steps

### Step 1: Update Prisma Schema ✅ DONE

**File:** `packages/db/prisma/schema/auth.prisma`

**Changes:**
1. Added `UserRole` enum
2. Updated `User.role` to use enum
3. Removed `User.systemRole`
4. Removed `Member.role`
5. Removed `Invitation.role`

### Step 2: Data Migration Logic

#### Role Assignment Priority:

```
1. ADMIN    ← User.systemRole === "ADMIN"
2. PROVIDER ← User has record in Provider table
3. OWNER    ← User has Member record with role="owner"
4. CLIENT   ← Default (all other users)
```

#### SQL Migration Commands:

```sql
-- Create backup first
CREATE TABLE User_backup AS SELECT * FROM User;
CREATE TABLE Member_backup AS SELECT * FROM Member;

-- Step 1: Add temporary column for new role
ALTER TABLE User ADD COLUMN role_new TEXT;

-- Step 2: Migrate ADMIN users
UPDATE User 
SET role_new = 'ADMIN' 
WHERE systemRole = 'ADMIN';

-- Step 3: Migrate PROVIDER users
UPDATE User 
SET role_new = 'PROVIDER' 
WHERE id IN (SELECT DISTINCT userId FROM Provider)
AND role_new IS NULL;

-- Step 4: Migrate OWNER users
UPDATE User 
SET role_new = 'OWNER' 
WHERE id IN (
  SELECT DISTINCT userId 
  FROM Member 
  WHERE role = 'owner'
)
AND role_new IS NULL;

-- Step 5: Set remaining users to CLIENT
UPDATE User 
SET role_new = 'CLIENT' 
WHERE role_new IS NULL;

-- Step 6: Drop old columns and rename new one
-- (This will be handled by Prisma migrate)
-- ALTER TABLE User DROP COLUMN systemRole;
-- ALTER TABLE User DROP COLUMN role;
-- ALTER TABLE User RENAME COLUMN role_new TO role;

-- Step 7: Drop role from Member table
-- (Handled by Prisma migrate)
-- ALTER TABLE Member DROP COLUMN role;

-- Step 8: Drop role from Invitation table
-- (Handled by Prisma migrate)
-- ALTER TABLE Invitation DROP COLUMN role;
```

### Step 3: Generate Prisma Migration

```bash
cd packages/db
pnpm prisma migrate dev --name simplify-role-management
```

This will:
- Create migration SQL
- Apply schema changes
- Regenerate Prisma Client with new types

### Step 4: Update Backend Code

#### Files to Update:

**A. Middleware (`apps/server/src/index.ts`):**

```javascript
// OLD
if (user.systemRole !== "ADMIN")

// NEW
if (user.role !== "ADMIN")
```

**B. User Creation:**

```javascript
// OLD
await prisma.user.create({
  data: {
    systemRole: "USER",
    // ...
  },
});

// NEW
await prisma.user.create({
  data: {
    role: "CLIENT", // or "PROVIDER", "OWNER", "ADMIN"
    // ...
  },
});
```

**C. Role Checks:**

```javascript
// OLD
if (user.systemRole === "ADMIN")
if (member.role === "owner")

// NEW
if (user.role === "ADMIN")
if (user.role === "OWNER")
```

### Step 5: Update Frontend Code

#### Files to Update:

**A. `apps/web/src/components/header.tsx`:**

```typescript
// OLD
const systemRole = session.user.systemRole;
if (systemRole === "ADMIN")

// NEW
const role = session.user.role; // Already UserRole enum
if (role === "ADMIN")
```

**B. `apps/web/src/components/user-menu.tsx`:**

```typescript
// OLD
const systemRole = session.user.systemRole;
fetch('/api/providers?userId=...')
fetch('/api/organizations/my-organizations')

// NEW
const role = session.user.role; // Direct from user
// No need for additional API calls!
```

**C. `apps/web/src/components/sign-in-form.tsx`:**

```typescript
// OLD
const systemRole = context.data?.user?.systemRole;
if (systemRole === "ADMIN")

// NEW
const role = context.data?.user?.role;
if (role === "ADMIN")
if (role === "PROVIDER") navigate({ to: "/provider/calendar" })
if (role === "OWNER") navigate({ to: "/owner/" })
// else CLIENT → default routing
```

### Step 6: Update Member Creation Logic

When adding users to organizations, we DON'T set role in Member table anymore:

```javascript
// OLD
await prisma.member.create({
  data: {
    organizationId,
    userId,
    email,
    role: "owner", // ❌ Remove this
    createdAt: new Date(),
  },
});

// NEW
await prisma.member.create({
  data: {
    organizationId,
    userId,
    email, // Just tracking membership
    createdAt: new Date(),
  },
});

// Set role in User table instead
await prisma.user.update({
  where: { id: userId },
  data: { role: "OWNER" }, // ✅ Role is in User
});
```

---

## 📊 Role Definitions

| Role | Description | Access |
|------|-------------|--------|
| **ADMIN** | System administrator | Full system access |
| **OWNER** | Organization owner | Manage organization, departments, providers |
| **PROVIDER** | Healthcare provider | Create availability, view bookings |
| **CLIENT** | Regular user/patient | Book appointments |

---

## 🔄 Migration Impact

### Backend Changes:

1. ✅ **Middleware**: Update role checks
2. ✅ **User Creation**: Set role directly
3. ✅ **Provider Creation**: Set role to PROVIDER
4. ✅ **Owner Assignment**: Set role to OWNER
5. ✅ **Role Checks**: Use `user.role` everywhere

### Frontend Changes:

1. ✅ **Header**: Simplified role detection
2. ✅ **User Menu**: Direct role display
3. ✅ **Sign-in**: Direct role-based routing
4. ✅ **No more**: Chained API calls to determine role

### Database Changes:

1. ✅ Remove `User.systemRole`
2. ✅ Update `User.role` to enum
3. ✅ Remove `Member.role`
4. ✅ Remove `Invitation.role`

---

## ⚠️ Breaking Changes

### API Responses

**Before:**
```json
{
  "user": {
    "id": "...",
    "email": "...",
    "systemRole": "USER",
    "role": "user"
  }
}
```

**After:**
```json
{
  "user": {
    "id": "...",
    "email": "...",
    "role": "CLIENT"
  }
}
```

### TypeScript Types

**Before:**
```typescript
type SystemRole = "ADMIN" | "USER";
type MemberRole = "owner" | "provider" | "member";
```

**After:**
```typescript
enum UserRole {
  ADMIN = "ADMIN",
  OWNER = "OWNER",
  PROVIDER = "PROVIDER",
  CLIENT = "CLIENT"
}
```

---

## 🧪 Testing Checklist

After migration:

- [ ] Admin can access admin panel
- [ ] Owner can manage organization
- [ ] Provider can access calendar
- [ ] Client can book appointments
- [ ] No user has null/undefined role
- [ ] All existing users have correct roles
- [ ] New user creation sets correct role
- [ ] Provider creation sets PROVIDER role
- [ ] Owner assignment sets OWNER role
- [ ] Login routing works correctly
- [ ] Navbar shows correct links
- [ ] User menu displays correct role

---

## 🎯 Benefits

### Simplicity:
- ✅ Single source of truth for roles
- ✅ No complex logic to determine role
- ✅ Easy to understand and maintain

### Performance:
- ✅ No need for additional API calls
- ✅ Role available immediately in session
- ✅ Faster frontend role detection

### Maintainability:
- ✅ Less code to maintain
- ✅ Fewer places to update
- ✅ Clear and consistent

### Type Safety:
- ✅ Enum ensures valid values
- ✅ TypeScript catches role errors
- ✅ Better IDE autocomplete

---

## 📝 Implementation Order

1. ✅ Update Prisma schema
2. ⏳ Run Prisma migration
3. ⏳ Update backend middleware
4. ⏳ Update backend API endpoints
5. ⏳ Update frontend role detection
6. ⏳ Test all role-based features
7. ⏳ Update documentation

---

## 🚨 Rollback Plan

If issues arise:

1. Restore database from backup:
   ```sql
   DROP TABLE User;
   DROP TABLE Member;
   ALTER TABLE User_backup RENAME TO User;
   ALTER TABLE Member_backup RENAME TO Member;
   ```

2. Revert Prisma schema changes
3. Regenerate Prisma Client:
   ```bash
   cd packages/db
   pnpm prisma generate
   ```

4. Restart services

---

## 📚 Related Files

### Schema:
- `packages/db/prisma/schema/auth.prisma`

### Backend:
- `apps/server/src/index.ts` (all role checks)

### Frontend:
- `apps/web/src/components/header.tsx`
- `apps/web/src/components/user-menu.tsx`
- `apps/web/src/components/sign-in-form.tsx`
- `apps/web/src/routes/admin/index.tsx`
- `apps/web/src/routes/owner/index.tsx`
- `apps/web/src/routes/provider/calendar.tsx`

### Migration:
- `migrate-to-single-role.ts`

---

**Status:** 🔄 In Progress  
**Target:** Simplified single-role system  
**Impact:** High (affects all role-based logic)  
**Risk:** Medium (requires careful testing)


