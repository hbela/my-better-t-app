-- Check if anna.kovacs@tanarock.hu exists and has correct fields
SELECT 
    id,
    email,
    name,
    role,
    needsPasswordChange,
    emailVerified,
    createdAt
FROM user 
WHERE email = 'anna.kovacs@tanarock.hu';

-- Check all providers
SELECT 
    u.id,
    u.email,
    u.name,
    u.role,
    u.needsPasswordChange,
    p.id as provider_id,
    d.name as department_name
FROM user u
INNER JOIN provider p ON u.id = p.userId
INNER JOIN department d ON p.departmentId = d.id
WHERE u.role = 'PROVIDER';

