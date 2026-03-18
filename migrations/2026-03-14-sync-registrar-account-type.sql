ALTER TABLE users
MODIFY account_type ENUM('student', 'admin', 'registrar') NOT NULL;

UPDATE users u
INNER JOIN user_roles ur ON ur.user_id = u.user_id
INNER JOIN roles r ON r.role_id = ur.role_id
SET u.account_type = 'registrar',
    u.updated_at = NOW()
WHERE r.role_name = 'registrar'
  AND u.account_type <> 'registrar';
