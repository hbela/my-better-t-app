# Backend Role Refactoring - Complete Checklist

## File: `apps/server/src/index.ts`

### Summary of Required Changes:
- Replace all `user.systemRole` with `user.role`
- Replace all `systemRole` references with `role`
- Remove all `Member.role` assignments
- Update role values: "USER" → "CLIENT"
- Update middleware role checks

---

## Detailed Changes by Section:

### 1. Admin Role Middleware (Line ~62-76)
**Find:**
```javascript
if (!user || user.systemRole !== "ADMIN")
```

**Replace with:**
```javascript
if (!user || user.role !== "ADMIN")
```

### 2. Owner Middleware (Line ~79-112)
**Find:**
```javascript
if (!member || member.role !== "owner")
```

**Replace with:**
```javascript
if (user.role !== "OWNER")
```

**Remove the member check** - no longer needed.

### 3. Admin Create User (Line ~360-455)
**Find:**
```javascript
systemRole: role,
```

**Replace with:**
```javascript
role: role === "USER" ? "CLIENT" : role,
```

**Also update:**
```javascript
systemRole: user.systemRole,
```
to
```javascript
role: user.role,
```

### 4. Admin Create Organization (Line ~458-561)
**Find in member creation:**
```javascript
role: "owner",
```

**Remove this line** - Member table no longer has role.

**Add after user lookup:**
```javascript
// Set user role to OWNER
await prisma.user.update({
  where: { id: ownerId },
  data: { role: "OWNER" },
});
```

### 5. Owner Middleware Check (Multiple locations)
**Pattern to find:**
```javascript
if (!member || member.role !== "owner")
```

**Replace with:**
```javascript
if (user.role !== "OWNER")
```

**Remove member lookup** if only used for role check.

### 6. Department Delete (Line ~770-809)
**Find:**
```javascript
if (!member || member.role !== "owner")
```

**Replace with:**
```javascript
if (user.role !== "OWNER")
```

### 7. Create Provider (Line ~814-894)
**Find in member creation/update:**
```javascript
role: "provider",
```

**Replace with (after member creation):**
```javascript
// Set user role to PROVIDER
await prisma.user.update({
  where: { id: userId },
  data: { role: "PROVIDER" },
});
```

### 8. Provider User Creation (Line ~897-1024)
**Find:**
```javascript
systemRole: "USER",
```

**Replace with:**
```javascript
role: "PROVIDER",
```

**Find in member creation:**
```javascript
role: "provider",
```

**Remove this line**.

### 9. Provider Delete (Line ~1138-1179)
**Find:**
```javascript
if (!member || member.role !== "owner")
```

**Replace with:**
```javascript
if (user.role !== "OWNER")
```

### 10. Get User Organizations (Line ~598-637)
**Find in response mapping:**
```javascript
role: member.role,
```

**Replace with (lookup from User):**
```javascript
// Role is now in User table
```

Remove the role from organization response or fetch from User.

### 11. Get Organization Subscription (Line ~640-695)
No changes needed (no role checks).

### 12. Admin Overview (Line ~2280-2385)
No changes needed (just display).

---

## Pattern-Based Changes:

### Global Replacements Needed:

1. **systemRole → role**
   ```
   Find:    systemRole
   Replace: role
   Context: All user object references
   ```

2. **"USER" → "CLIENT"**
   ```
   Find:    systemRole: "USER"
   Replace: role: "CLIENT"
   ```

3. **"ADMIN" stays "ADMIN"**
   ```
   systemRole: "ADMIN" → role: "ADMIN"
   ```

4. **Remove all Member role assignments**
   ```
   Delete:  role: "owner",
   Delete:  role: "provider",
   Delete:  role: "member",
   ```

5. **Add User role updates when assigning organization roles**
   ```javascript
   // When making someone OWNER
   await prisma.user.update({
     where: { id: userId },
     data: { role: "OWNER" },
   });
   
   // When making someone PROVIDER
   await prisma.user.update({
     where: { id: userId },
     data: { role: "PROVIDER" },
   });
   ```

---

## Member Table Updates:

### Creating Members - OLD:
```javascript
await prisma.member.create({
  data: {
    organizationId,
    userId,
    email,
    role: "owner", // ❌ Remove
    createdAt: new Date(),
  },
});
```

### Creating Members - NEW:
```javascript
await prisma.member.create({
  data: {
    organizationId,
    userId,
    email,
    createdAt: new Date(),
  },
});

// Set role in User table instead
await prisma.user.update({
  where: { id: userId },
  data: { role: "OWNER" }, // or "PROVIDER"
});
```

---

## Response Objects:

### User Response - UPDATE:
```javascript
// OLD
{
  user: {
    id: user.id,
    name: user.name,
    email: user.email,
    systemRole: user.systemRole,
  }
}

// NEW
{
  user: {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  }
}
```

### Organization Response - UPDATE:
```javascript
// OLD
organizations.map((org) => ({
  ...org,
  role: member.role,
}))

// NEW
organizations.map((org) => ({
  ...org,
  // No role from Member table
  // User role is in User table
}))
```

---

## Testing After Changes:

### 1. Admin Functions:
- [ ] Can create users
- [ ] Can create organizations
- [ ] Can access admin panel

### 2. Owner Functions:
- [ ] Can manage departments
- [ ] Can assign providers
- [ ] Can see owner dashboard

### 3. Provider Functions:
- [ ] Can access calendar
- [ ] Can create availability
- [ ] Can view bookings

### 4. Client Functions:
- [ ] Can book appointments
- [ ] Can see bookings

---

## Automated Script (For Reference):

See `update-backend-roles.sh` for automated replacements.

**⚠️ Manual review recommended after running script!**

---

## Estimated Changes:
- ~15 middleware updates
- ~25 API endpoint updates
- ~10 member creation updates
- ~5 response object updates

**Total: ~55 changes in backend file**

---

**Next:** After backend is updated, update frontend files.

