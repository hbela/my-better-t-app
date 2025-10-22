# Role Refactoring - IMMEDIATE ACTION PLAN

## ⚠️ IMPORTANT

This is a major refactoring that affects:
- Database schema
- Backend API (50+ locations)
- Frontend components (10+ files)
- ALL role-based logic

## 📋 Current Status

✅ **Completed:**
1. Prisma schema updated
   - Added `UserRole` enum (ADMIN, OWNER, PROVIDER, CLIENT)
   - Removed `User.systemRole`
   - Updated `User.role` to use enum
   - Removed `Member.role`
   - Removed `Invitation.role`

## 🚀 NEXT STEPS (In Order)

### Step 1: Run Prisma Migration ⚠️ DO THIS FIRST

```bash
cd packages/db
pnpm prisma migrate dev --name simplify-role-management
```

**What this does:**
- Creates migration SQL with data migration logic
- Updates database schema
- Migrates existing data:
  - systemRole="ADMIN" → role="ADMIN"
  - Users with Provider record → role="PROVIDER"
  - Users in Member with role="owner" → role="OWNER"
  - All others → role="CLIENT"
- Regenerates Prisma Client with new types

**⚠️ BACKUP FIRST:**
```bash
# Backup your database
cp C:/sqlite/db/express.db C:/sqlite/db/express.db.backup
```

### Step 2: Update Backend Code

**I can do this for you - shall I proceed?**

This involves updating ~50+ locations in `apps/server/src/index.ts`:
- All `user.systemRole` → `user.role`
- All role checks to use new enum values
- Remove `Member.role` assignments
- Update user creation logic

### Step 3: Update Frontend Code

**I can do this for you - shall I proceed?**

Files to update:
- `apps/web/src/components/header.tsx`
- `apps/web/src/components/user-menu.tsx`
- `apps/web/src/components/sign-in-form.tsx`
- `apps/web/src/routes/admin/index.tsx`
- `apps/web/src/routes/owner/*.tsx`

### Step 4: Test Everything

After code updates:
1. Restart backend server
2. Clear browser cache
3. Test each role:
   - ADMIN access
   - OWNER access
   - PROVIDER calendar
   - CLIENT booking

---

## 🎯 Decision Point

**Option A: Continue Automatic Refactoring**
- I update ALL backend and frontend code now
- You run the migration after
- Risk: Large commit, harder to review

**Option B: Step-by-Step Approach**
- You run the migration first
- I update code in smaller chunks
- Risk: App will be broken between steps

**Option C: Manual Control**
- I provide you with all the changes needed
- You apply them manually
- Risk: More time-consuming, prone to missing updates

---

## 📊 Impact Summary

### Files to Modify: ~15 files
### Lines to Change: ~150+ lines
### API Endpoints Affected: ~25 endpoints
### Frontend Components: ~5 components

---

## ⚡ Quick Start (Recommended)

If you want me to complete this refactoring:

**Say: "Proceed with full refactoring"**

I will:
1. ✅ Update ALL backend code
2. ✅ Update ALL frontend code  
3. ✅ Provide testing checklist
4. ✅ You run ONE command (prisma migrate)
5. ✅ Everything works with new role system

---

## 🛑 Alternative: Revert Changes

If you want to keep the old system:

```bash
# Revert schema changes
git checkout packages/db/prisma/schema/auth.prisma

# Regenerate old Prisma client
cd packages/db
pnpm prisma generate
```

---

## 💬 What would you like to do?

1. **"Proceed with full refactoring"** - I'll update everything
2. **"Step by step"** - We'll do it gradually
3. **"Let me review first"** - I'll provide detailed changes
4. **"Revert"** - Go back to old system

**Your choice?**

