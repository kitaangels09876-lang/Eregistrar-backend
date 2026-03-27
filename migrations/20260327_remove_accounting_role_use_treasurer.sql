USE eRegistrar;

START TRANSACTION;

INSERT IGNORE INTO roles (role_name, role_description)
VALUES ('treasurer', 'Treasurer staff for payment confirmation');

INSERT IGNORE INTO user_roles (user_id, role_id, assigned_by)
SELECT DISTINCT ur.user_id, treasurer.role_id, ur.assigned_by
FROM user_roles ur
INNER JOIN roles accounting ON accounting.role_id = ur.role_id
INNER JOIN roles treasurer ON treasurer.role_name = 'treasurer'
LEFT JOIN user_roles existing_treasurer
  ON existing_treasurer.user_id = ur.user_id
 AND existing_treasurer.role_id = treasurer.role_id
WHERE accounting.role_name = 'accounting'
  AND existing_treasurer.user_role_id IS NULL;

DELETE ur
FROM user_roles ur
INNER JOIN roles accounting ON accounting.role_id = ur.role_id
WHERE accounting.role_name = 'accounting';

UPDATE users
SET account_type = 'admin'
WHERE account_type = 'accounting';

DELETE rp
FROM role_permissions rp
INNER JOIN roles accounting ON accounting.role_id = rp.role_id
WHERE accounting.role_name = 'accounting';

DELETE FROM roles
WHERE role_name = 'accounting';

COMMIT;
