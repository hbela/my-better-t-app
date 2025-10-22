-- Update password for owner@test.com
-- Database: C:/sqlite/db/express.db
-- Generated with better-auth (scrypt)

UPDATE Account
SET password = '0ab62678a30889cff9aceff08aa5d61e:31aace6965819678b38da53641b61ea4e80c01b24d6822c001956a641d6716154cbcb7ab1d4939964ef3234bde4b88c5aedc0ace4c6c38c677488516fbd126b0',
    updatedAt = datetime('now')
WHERE userId = (SELECT id FROM User WHERE email = 'owner@test.com')
AND providerId = 'credential';

-- Verify update
SELECT 
  u.email,
  u.name,
  u.role,
  a.password
FROM User u
JOIN Account a ON u.id = a.userId
WHERE u.email = 'owner@test.com'
AND a.providerId = 'credential';

