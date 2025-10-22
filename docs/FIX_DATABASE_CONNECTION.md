# Fix Database Connection to express.db

## 🎯 Problem

Users are being created in `booking.db` instead of `express.db` even though `DATABASE_URL=file:C/sqlite/db/express.db` is set in `.env`.

## 🔍 Root Cause

The Prisma client was generated when DATABASE_URL pointed to `booking.db`. Even though we're trying to override it at runtime, Prisma has the old path cached.

## ✅ Solution: Complete Reset

### Step 1: Stop EVERYTHING

```powershell
# Stop the server (Ctrl+C)

# Kill all Node processes to be sure
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
```

### Step 2: Delete Prisma Generated Files

```powershell
Remove-Item -Path "packages\db\prisma\generated" -Recurse -Force
```

### Step 3: Verify DATABASE_URL

```powershell
Get-Content apps\server\.env | Select-String "DATABASE_URL"
```

Should show:
```
DATABASE_URL=file:C/sqlite/db/express.db
```

### Step 4: Regenerate Prisma Client

```powershell
cd packages\db
$env:DATABASE_URL = "file:C/sqlite/db/express.db"
npx prisma generate
cd ..\..
```

### Step 5: Restart Server

```powershell
pnpm --filter server dev
```

Watch for:
```
🔍 DB Package - DATABASE_URL from env: file:C/sqlite/db/express.db
📊 Prisma Client initialized
```

### Step 6: Test Debug Endpoint

```powershell
curl http://localhost:3000/debug/db-info
```

Should return:
```json
{
  "databaseUrl": "file:C/sqlite/db/express.db",
  "tables": {
    "users": 2
  },
  "sampleUsers": [
    {"email": "hajzerbela@gmail.com", "name": "Bela"},
    {"email": "jane@gmail.com", "name": "Jane"}
  ]
}
```

### Step 7: Test Signup

Sign up with:
- Email: `finaltest@test.com`
- Password: `TestPass123!`
- Name: `Final Test`

### Step 8: Verify

```powershell
sqlite3 "C:\sqlite\db\express.db" "SELECT _id, email, name FROM user WHERE email = 'finaltest@test.com';"
```

Should show the new user!

---

## 🚀 Quick Script

Or just run the fix script:

```powershell
.\fix-database.ps1
```

Then start the server:

```powershell
pnpm --filter server dev
```

---

## 🔍 How to Verify Which DB Is Being Used

After server starts, check:

```powershell
curl http://localhost:3000/debug/db-info
```

The `sampleUsers` field will show you which database is actually connected:
- If you see 2 users (Bela, Jane) → express.db ✅
- If you see 25+ users → booking.db ❌

---

## 📊 Current State

| Database | User Count | Contains |
|----------|------------|----------|
| booking.db | 25 | Old test users + your new signups |
| express.db | 2 | Bela, Jane (original users) |
| turbodb.db | 5 | Old data |
| users.db | 43 | Very old data |

**Goal:** All new signups should go to express.db

---

## ⚠️ Important

The runtime `datasources` option in PrismaClient doesn't always work reliably. The **only guaranteed way** is to regenerate the client with the correct DATABASE_URL set in the environment.

