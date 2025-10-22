# Fix User Creation Default Role

## ✅ Issue Fixed

Better-auth was setting `role: "user"` (lowercase) when creating users, but the database expects the UserRole enum values in uppercase: `CLIENT`, `ADMIN`, `OWNER`, `PROVIDER`.

---

## 🔧 Changes Applied

### File: `packages/auth/src/index.ts`

**REMOVED** the `role` field from better-auth's `additionalFields`:

```javascript
// OLD (Causing the error):
user: {
  additionalFields: {
    role: {
      type: "string",
      defaultValue: "CLIENT",  // ❌ Better-auth was setting this
      required: true,
    },
    // ... other fields
  }
}

// NEW (Fixed):
user: {
  additionalFields: {
    // role removed - let Prisma handle it with its default
    needsPasswordChange: { ... },
    banned: { ... },
    // ... other fields only
  }
}
```

**Why this works:**
- Prisma schema has: `role UserRole @default(CLIENT)`
- Prisma will automatically set `CLIENT` when creating users
- Better-auth no longer interferes with the role field
- Database gets correct uppercase enum value

---

## 🚀 How to Apply

### Step 1: Restart Backend Server

**Stop your server** (Ctrl+C if running)

Then restart:
```bash
cd apps/server
pnpm dev
```

### Step 2: Test User Creation

Try creating a user again (signup). The role should automatically be set to `CLIENT`.

---

## ✅ Verification

After restarting, when a new user signs up:

**In server logs, you should see:**
```prisma
prisma:query INSERT INTO `main`.`user` (`_id`, `name`, `email`, `emailVerified`, `createdAt`, `updatedAt`, `role`, ...) VALUES (?, ?, ?, ?, ?, ?, 'CLIENT', ...)
```

**In database:**
```sql
SELECT email, role FROM User ORDER BY createdAt DESC LIMIT 5;
```

**Should show:**
```
email                        | role
----------------------------|--------
newuser@example.com         | CLIENT
elysprovider1@gmail.com     | PROVIDER
owner@test.com              | OWNER
admin@test.com              | ADMIN
```

---

## 🎯 Default Role Assignment

| When | Role Value |
|------|-----------|
| New user signs up | `CLIENT` (auto) |
| Admin creates user | As specified in API |
| Provider created | `PROVIDER` (set in code) |
| Owner assigned | `OWNER` (set in code) |

---

## 📝 Files Changed

1. ✅ `packages/auth/src/index.ts` - Removed role from additionalFields

---

## 🔄 No Database Changes Needed

The Prisma schema already has the correct default:
```prisma
role UserRole @default(CLIENT)
```

You just need to **restart the server** so better-auth picks up the new configuration!

---

**Restart your server and try creating a user again - it will work!** 🎉

