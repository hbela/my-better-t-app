-- Fix User Role for elysprovider1@gmail.com
-- Run these queries in your SQLite database

-- Step 1: Check current status
SELECT 
  u.id as user_id,
  u.name,
  u.email,
  u.systemRole,
  m.id as member_id,
  m.role as org_role,
  o.name as organization_name
FROM User u
LEFT JOIN Member m ON u.id = m.userId
LEFT JOIN Organization o ON m.organizationId = o.id
WHERE u.email = 'elysprovider1@gmail.com';

-- Step 2: Check if user is a provider
SELECT 
  p.id as provider_id,
  p.userId,
  d.name as department_name,
  o.name as organization_name
FROM Provider p
JOIN Department d ON p.departmentId = d.id
JOIN Organization o ON d.organizationId = o.id
WHERE p.userId = (SELECT id FROM User WHERE email = 'elysprovider1@gmail.com');

-- Step 3: Fix systemRole to USER (if it's currently something else)
UPDATE User 
SET systemRole = 'USER'
WHERE email = 'elysprovider1@gmail.com'
AND systemRole != 'USER';

-- Step 4: Fix organization role to 'provider' (if it's currently 'owner')
UPDATE Member
SET role = 'provider'
WHERE userId = (SELECT id FROM User WHERE email = 'elysprovider1@gmail.com')
AND role = 'owner';

-- Step 5: Verify the changes
SELECT 
  u.id,
  u.name,
  u.email,
  u.systemRole,
  m.role as org_role,
  o.name as organization
FROM User u
LEFT JOIN Member m ON u.id = m.userId
LEFT JOIN Organization o ON m.organizationId = o.id
WHERE u.email = 'elysprovider1@gmail.com';

