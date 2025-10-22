-- Verify the password update was applied
-- Database: C:/sqlite/db/express.db

-- Check current password hash for owner@test.com
SELECT 
  u.email,
  u.name,
  u.role,
  a.password,
  a.updatedAt,
  length(a.password) as hash_length
FROM User u
JOIN Account a ON u.id = a.userId
WHERE u.email = 'owner@test.com'
AND a.providerId = 'credential';

-- Expected:
-- hash_length should be around 160 characters (for scrypt)
-- password should start with hex characters (not $2b$ for bcrypt)

