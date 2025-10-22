-- Fix Anna Kovacs Provider Account
-- Run this SQL in your SQLite database

-- Step 1: Check current values
SELECT 
    'BEFORE UPDATE:' as status,
    email, 
    role, 
    needsPasswordChange,
    emailVerified,
    createdAt
FROM user 
WHERE email = 'anna.kovacs@tanarock.hu';

-- Step 2: Update to correct values
UPDATE user 
SET 
    role = 'PROVIDER',
    needsPasswordChange = 1,
    emailVerified = 1
WHERE email = 'anna.kovacs@tanarock.hu';

-- Step 3: Verify the update worked
SELECT 
    'AFTER UPDATE:' as status,
    email, 
    role, 
    needsPasswordChange,
    emailVerified,
    createdAt
FROM user 
WHERE email = 'anna.kovacs@tanarock.hu';

-- Step 4: Verify she's linked to provider record
SELECT 
    u.email,
    u.role,
    u.needsPasswordChange,
    p.id as provider_id,
    d.name as department_name,
    o.name as organization_name
FROM user u
INNER JOIN provider p ON u.id = p.userId
INNER JOIN department d ON p.departmentId = d.id
INNER JOIN organization o ON d.organizationId = o.id
WHERE u.email = 'anna.kovacs@tanarock.hu';

-- Expected result:
-- email: anna.kovacs@tanarock.hu
-- role: PROVIDER
-- needsPasswordChange: 1
-- provider_id: (some UUID)
-- department_name: (her department)
-- organization_name: (her organization)

