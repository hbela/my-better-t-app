# Fix Database Connection Script
Write-Host "🔧 Fixing database connection to express.db..." -ForegroundColor Cyan

# Step 1: Stop all Node processes
Write-Host "`n1️⃣  Stopping all Node processes..." -ForegroundColor Yellow
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

# Step 2: Delete generated Prisma client
Write-Host "`n2️⃣  Deleting old Prisma client..." -ForegroundColor Yellow
Remove-Item -Path "packages\db\prisma\generated\*" -Recurse -Force -ErrorAction SilentlyContinue

# Step 3: Set DATABASE_URL environment variable
Write-Host "`n3️⃣  Setting DATABASE_URL..." -ForegroundColor Yellow
$env:DATABASE_URL = "file:C/sqlite/db/express.db"
Write-Host "DATABASE_URL = $env:DATABASE_URL" -ForegroundColor Green

# Step 4: Regenerate Prisma client with correct DATABASE_URL
Write-Host "`n4️⃣  Regenerating Prisma client..." -ForegroundColor Yellow
Set-Location packages\db
$env:DATABASE_URL = "file:C/sqlite/db/express.db"
npx prisma generate
Set-Location ..\..

# Step 5: Verify
Write-Host "`n✅ Done! Now run:" -ForegroundColor Green
Write-Host "   pnpm --filter server dev" -ForegroundColor Cyan
Write-Host "`n📊 Database should now be: C:\sqlite\db\express.db" -ForegroundColor Green

