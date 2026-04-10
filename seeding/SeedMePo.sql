USE eRegistrar;

-- ===========================================================
-- DEFAULT RBAC + MASTER DATA SEED
-- This seed intentionally avoids legacy request/payment batch data.
-- It only seeds:
-- - one default user account per role
-- - one role per user
-- - permissions and role permissions
-- - academic routing defaults
-- - default document types
-- - default payment methods
-- - school settings
--
-- Default passwords:
-- admin@tmc.edu.ph           / Admin@123!
-- registrar@tmc.edu.ph       / Registrar@123!
-- dean@tmc.edu.ph            / Dean@123!
-- collegeadmin@tmc.edu.ph    / CollegeAdmin@123!
-- treasurer@tmc.edu.ph       / Treasurer@123!
-- student@tmc.edu.ph         / Student@123!
-- alumni@tmc.edu.ph          / Alumni@123!
-- clark.villamor@tmc.edu.ph  / Dean@123!
-- marina.polestico@tmc.edu.ph / Dean@123!
-- elmira.negro@tmc.edu.ph    / Dean@123!
-- judith.austria@tmc.edu.ph  / Dean@123!
-- antonette.nugal@tmc.edu.ph / Dean@123!
-- julie.maestrado@tmc.edu.ph / CollegeAdmin@123!
-- iris.lloren@tmc.edu.ph     / Registrar@123!
-- ===========================================================

-- ===========================================================
-- 1. ROLES
-- ===========================================================
INSERT IGNORE INTO roles (role_name, role_description) VALUES
('admin', 'Full system administrator with all privileges'),
('student', 'Registered student portal user'),
('alumni', 'Alumni portal user'),
('registrar', 'Registrar operations staff'),
('dean', 'Academic dean approver'),
('college_admin', 'College administration reviewer'),
('treasurer', 'Treasurer staff for payment confirmation');

-- ===========================================================
-- 2. PERMISSIONS
-- ===========================================================
INSERT IGNORE INTO permissions (permission_key, permission_description) VALUES
('request.create', 'Create registrar workflow requests'),
('request.view.own', 'View own registrar workflow requests'),
('request.view.all', 'View all registrar workflow requests'),
('request.cancel.own', 'Cancel own registrar workflow request before terminal completion'),
('request.cancel.any', 'Cancel any registrar workflow request when policy allows'),
('request.verify', 'Perform registrar verification'),
('approval.dean.view', 'View dean approval queue'),
('approval.dean.approve', 'Approve dean-scoped requests'),
('approval.college_admin.view', 'View college administration review queue'),
('approval.college_admin.approve', 'Approve college administration scoped requests'),
('payment.assess', 'Assess fees before payment confirmation'),
('payment.submit.own', 'Submit own payment proof'),
('payment.confirm', 'Confirm payment as treasurer'),
('document.prepare', 'Prepare generated registrar output'),
('document.generate', 'Generate final registrar output'),
('document.view.own.allowed', 'View own generated document when policy allows'),
('document.release', 'Release generated registrar documents'),
('document.claim', 'Confirm claimed pickup release'),
('claim_stub.verify', 'Verify claim stubs during pickup release'),
('claim_stub.view.own', 'View own claim stub'),
('claim_stub.download.own', 'Download own claim stub'),
('notification.view.own', 'View own notifications'),
('admin.manage.users', 'Manage user accounts'),
('admin.manage.roles', 'Manage roles'),
('admin.manage.permissions', 'Manage permissions'),
('admin.manage.document_types', 'Manage document types'),
('admin.manage.templates', 'Manage document templates'),
('admin.manage.academic_structure', 'Manage academic routing structure'),
('audit.view', 'View audit logs'),
('reports.view', 'View reports');

-- ===========================================================
-- 3. ROLE PERMISSIONS
-- ===========================================================
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM roles r
JOIN permissions p ON p.permission_key IN (
  'request.create',
  'request.view.own',
  'request.cancel.own',
  'payment.submit.own',
  'document.view.own.allowed',
  'claim_stub.view.own',
  'claim_stub.download.own',
  'notification.view.own'
)
WHERE r.role_name = 'student';

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM roles r
JOIN permissions p ON p.permission_key IN (
  'request.create',
  'request.view.own',
  'request.cancel.own',
  'payment.submit.own',
  'document.view.own.allowed',
  'claim_stub.view.own',
  'claim_stub.download.own',
  'notification.view.own'
)
WHERE r.role_name = 'alumni';

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM roles r
JOIN permissions p ON p.permission_key IN (
  'request.view.all',
  'request.verify',
  'request.cancel.any',
  'payment.assess',
  'document.prepare',
  'document.generate',
  'document.release',
  'document.claim',
  'claim_stub.verify',
  'notification.view.own'
)
WHERE r.role_name = 'registrar';

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM roles r
JOIN permissions p ON p.permission_key IN (
  'approval.dean.view',
  'approval.dean.approve',
  'notification.view.own'
)
WHERE r.role_name = 'dean';

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM roles r
JOIN permissions p ON p.permission_key IN (
  'approval.college_admin.view',
  'approval.college_admin.approve',
  'notification.view.own'
)
WHERE r.role_name = 'college_admin';

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM roles r
JOIN permissions p ON p.permission_key IN (
  'payment.confirm',
  'reports.view',
  'notification.view.own'
)
WHERE r.role_name = 'treasurer';

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM roles r
JOIN permissions p ON p.permission_key IN (
  'request.view.all',
  'request.verify',
  'request.cancel.any',
  'approval.dean.view',
  'approval.dean.approve',
  'approval.college_admin.view',
  'approval.college_admin.approve',
  'payment.assess',
  'payment.confirm',
  'document.prepare',
  'document.generate',
  'document.release',
  'document.claim',
  'claim_stub.verify',
  'admin.manage.users',
  'admin.manage.roles',
  'admin.manage.permissions',
  'admin.manage.document_types',
  'admin.manage.templates',
  'admin.manage.academic_structure',
  'audit.view',
  'reports.view',
  'notification.view.own'
)
WHERE r.role_name = 'admin';

-- ===========================================================
-- 4. USERS
-- ===========================================================
INSERT INTO users (email, password, account_type, status)
VALUES
('admin@tmc.edu.ph', '$2b$10$ISlPEXvkErg85asxOf2g/.F0nkdKV9oRGk5deaACd104WOB3hMP66', 'admin', 'active'),
('registrar@tmc.edu.ph', '$2b$10$NaE8QRn699wic3nr7AQVl.91UOWoI.jd7L5swX1zst4mUCnzqB4VS', 'registrar', 'active'),
('dean@tmc.edu.ph', '$2b$10$d4ChO75V9KKS5T35bsC4au3b5DS18NEQV2PSgQP9w8XrdiWJH.RSK', 'dean', 'active'),
('collegeadmin@tmc.edu.ph', '$2b$10$LKHRJIYDfAsbXI5Zol2FDumhg4xyx.5f4Ql0/P37a6a4T/OnLpvv2', 'college_admin', 'active'),
('treasurer@tmc.edu.ph', '$2b$10$rs89aL.8RjQu86ycypCEvuMPCGzrFz9O0AjvCXQDYCRSXmYYhJIKu', 'treasurer', 'active'),
('student@tmc.edu.ph', '$2b$10$w38ZrRYzw0UkpcHzPtVbLu9CM1kW5cHG5d.kdXnL9qpV8heAGPK1e', 'student', 'active'),
('alumni@tmc.edu.ph', '$2b$10$c5ocrXofbiCovGmvIxtjFuLEqBiFlU..ycByvqhXyS3t6Rvn7osOa', 'alumni', 'active'),
('clark.villamor@tmc.edu.ph', '$2b$10$d4ChO75V9KKS5T35bsC4au3b5DS18NEQV2PSgQP9w8XrdiWJH.RSK', 'dean', 'active'),
('marina.polestico@tmc.edu.ph', '$2b$10$d4ChO75V9KKS5T35bsC4au3b5DS18NEQV2PSgQP9w8XrdiWJH.RSK', 'dean', 'active'),
('elmira.negro@tmc.edu.ph', '$2b$10$d4ChO75V9KKS5T35bsC4au3b5DS18NEQV2PSgQP9w8XrdiWJH.RSK', 'dean', 'active'),
('judith.austria@tmc.edu.ph', '$2b$10$d4ChO75V9KKS5T35bsC4au3b5DS18NEQV2PSgQP9w8XrdiWJH.RSK', 'dean', 'active'),
('antonette.nugal@tmc.edu.ph', '$2b$10$d4ChO75V9KKS5T35bsC4au3b5DS18NEQV2PSgQP9w8XrdiWJH.RSK', 'dean', 'active'),
('julie.maestrado@tmc.edu.ph', '$2b$10$LKHRJIYDfAsbXI5Zol2FDumhg4xyx.5f4Ql0/P37a6a4T/OnLpvv2', 'college_admin', 'active'),
('iris.lloren@tmc.edu.ph', '$2b$10$NaE8QRn699wic3nr7AQVl.91UOWoI.jd7L5swX1zst4mUCnzqB4VS', 'registrar', 'active')
ON DUPLICATE KEY UPDATE
password = VALUES(password),
account_type = VALUES(account_type),
status = VALUES(status);

-- ===========================================================
-- 5. USER ROLE ASSIGNMENTS (1 USER : 1 ROLE)
-- ===========================================================
INSERT IGNORE INTO user_roles (user_id, role_id, assigned_by)
SELECT u.user_id, r.role_id, NULL
FROM users u
JOIN roles r ON r.role_name = 'admin'
WHERE u.email = 'admin@tmc.edu.ph';

INSERT IGNORE INTO user_roles (user_id, role_id, assigned_by)
SELECT u.user_id, r.role_id, admin_user.user_id
FROM users u
JOIN roles r ON r.role_name = 'registrar'
JOIN users admin_user ON admin_user.email = 'admin@tmc.edu.ph'
WHERE u.email = 'registrar@tmc.edu.ph';

INSERT IGNORE INTO user_roles (user_id, role_id, assigned_by)
SELECT u.user_id, r.role_id, admin_user.user_id
FROM users u
JOIN roles r ON r.role_name = 'dean'
JOIN users admin_user ON admin_user.email = 'admin@tmc.edu.ph'
WHERE u.email = 'dean@tmc.edu.ph';

INSERT IGNORE INTO user_roles (user_id, role_id, assigned_by)
SELECT u.user_id, r.role_id, admin_user.user_id
FROM users u
JOIN roles r ON r.role_name = 'college_admin'
JOIN users admin_user ON admin_user.email = 'admin@tmc.edu.ph'
WHERE u.email = 'collegeadmin@tmc.edu.ph';

INSERT IGNORE INTO user_roles (user_id, role_id, assigned_by)
SELECT u.user_id, r.role_id, admin_user.user_id
FROM users u
JOIN roles r ON r.role_name = 'treasurer'
JOIN users admin_user ON admin_user.email = 'admin@tmc.edu.ph'
WHERE u.email = 'treasurer@tmc.edu.ph';

INSERT IGNORE INTO user_roles (user_id, role_id, assigned_by)
SELECT u.user_id, r.role_id, NULL
FROM users u
JOIN roles r ON r.role_name = 'student'
WHERE u.email = 'student@tmc.edu.ph';

INSERT IGNORE INTO user_roles (user_id, role_id, assigned_by)
SELECT u.user_id, r.role_id, admin_user.user_id
FROM users u
JOIN roles r ON r.role_name = 'alumni'
JOIN users admin_user ON admin_user.email = 'admin@tmc.edu.ph'
WHERE u.email = 'alumni@tmc.edu.ph';

INSERT IGNORE INTO user_roles (user_id, role_id, assigned_by)
SELECT u.user_id, r.role_id, admin_user.user_id
FROM users u
JOIN roles r ON r.role_name = 'dean'
JOIN users admin_user ON admin_user.email = 'admin@tmc.edu.ph'
WHERE u.email IN (
  'clark.villamor@tmc.edu.ph',
  'marina.polestico@tmc.edu.ph',
  'elmira.negro@tmc.edu.ph',
  'judith.austria@tmc.edu.ph',
  'antonette.nugal@tmc.edu.ph'
);

INSERT IGNORE INTO user_roles (user_id, role_id, assigned_by)
SELECT u.user_id, r.role_id, admin_user.user_id
FROM users u
JOIN roles r ON r.role_name = 'college_admin'
JOIN users admin_user ON admin_user.email = 'admin@tmc.edu.ph'
WHERE u.email = 'julie.maestrado@tmc.edu.ph';

INSERT IGNORE INTO user_roles (user_id, role_id, assigned_by)
SELECT u.user_id, r.role_id, admin_user.user_id
FROM users u
JOIN roles r ON r.role_name = 'registrar'
JOIN users admin_user ON admin_user.email = 'admin@tmc.edu.ph'
WHERE u.email = 'iris.lloren@tmc.edu.ph';

-- ===========================================================
-- 6. COURSES
-- ===========================================================
INSERT INTO courses (course_code, course_name, course_description, department)
VALUES
('BSIT', 'Bachelor of Science in Information Technology', 'Default seeded BSIT program for registrar workflow routing.', 'Department of Information Technology'),
('BSBA', 'Bachelor of Science in Business Administration', 'Default seeded BSBA program for registrar workflow routing.', 'Department of Business Administration'),
('ABPOLSCI', 'Bachelor of Arts in Political Science', 'Default seeded AB Political Science program for College of Arts and Sciences routing.', 'College of Arts and Sciences'),
('BSCRIM', 'Bachelor of Science in Criminology', 'Default seeded BS Criminology program for College of Criminal Justice Education routing.', 'College of Criminal Justice Education'),
('BSOA', 'Bachelor of Science in Office Administration', 'Default seeded BSOA program for College of Office Administration routing.', 'College of Office Administration'),
('BSED', 'Bachelor of Secondary Education', 'Default seeded BSED program for College of Education routing.', 'College of Education'),
('BEED', 'Bachelor of Elementary Education', 'Default seeded BEED program for College of Education routing.', 'College of Education')
ON DUPLICATE KEY UPDATE
course_name = VALUES(course_name),
course_description = VALUES(course_description),
department = VALUES(department);

-- ===========================================================
-- 7. STAFF PROFILES
-- ===========================================================
INSERT INTO admin_profiles (user_id, first_name, middle_name, last_name, contact_number)
SELECT u.user_id, 'System', NULL, 'Administrator', '09170000001'
FROM users u
WHERE u.email = 'admin@tmc.edu.ph'
ON DUPLICATE KEY UPDATE
first_name = VALUES(first_name),
middle_name = VALUES(middle_name),
last_name = VALUES(last_name),
contact_number = VALUES(contact_number);

INSERT INTO admin_profiles (user_id, first_name, middle_name, last_name, contact_number)
SELECT u.user_id, 'Rina', NULL, 'Registrar', '09170000002'
FROM users u
WHERE u.email = 'registrar@tmc.edu.ph'
ON DUPLICATE KEY UPDATE
first_name = VALUES(first_name),
middle_name = VALUES(middle_name),
last_name = VALUES(last_name),
contact_number = VALUES(contact_number);

INSERT INTO admin_profiles (user_id, first_name, middle_name, last_name, contact_number)
SELECT u.user_id, 'Dario', NULL, 'Dean', '09170000003'
FROM users u
WHERE u.email = 'dean@tmc.edu.ph'
ON DUPLICATE KEY UPDATE
first_name = VALUES(first_name),
middle_name = VALUES(middle_name),
last_name = VALUES(last_name),
contact_number = VALUES(contact_number);

INSERT INTO admin_profiles (user_id, first_name, middle_name, last_name, contact_number)
SELECT u.user_id, 'Celia', NULL, 'Administrator', '09170000004'
FROM users u
WHERE u.email = 'collegeadmin@tmc.edu.ph'
ON DUPLICATE KEY UPDATE
first_name = VALUES(first_name),
middle_name = VALUES(middle_name),
last_name = VALUES(last_name),
contact_number = VALUES(contact_number);

INSERT INTO admin_profiles (user_id, first_name, middle_name, last_name, contact_number)
SELECT u.user_id, 'Teresa', NULL, 'Treasurer', '09170000006'
FROM users u
WHERE u.email = 'treasurer@tmc.edu.ph'
ON DUPLICATE KEY UPDATE
first_name = VALUES(first_name),
middle_name = VALUES(middle_name),
last_name = VALUES(last_name),
contact_number = VALUES(contact_number);

INSERT INTO admin_profiles (user_id, first_name, middle_name, last_name, contact_number)
SELECT u.user_id, 'Clark', 'Kevin V.', 'Villamor', '09170000007'
FROM users u
WHERE u.email = 'clark.villamor@tmc.edu.ph'
ON DUPLICATE KEY UPDATE
first_name = VALUES(first_name),
middle_name = VALUES(middle_name),
last_name = VALUES(last_name),
contact_number = VALUES(contact_number);

INSERT INTO admin_profiles (user_id, first_name, middle_name, last_name, contact_number)
SELECT u.user_id, 'Marina', 'C.', 'Polestico', '09170000008'
FROM users u
WHERE u.email = 'marina.polestico@tmc.edu.ph'
ON DUPLICATE KEY UPDATE
first_name = VALUES(first_name),
middle_name = VALUES(middle_name),
last_name = VALUES(last_name),
contact_number = VALUES(contact_number);

INSERT INTO admin_profiles (user_id, first_name, middle_name, last_name, contact_number)
SELECT u.user_id, 'Elmira', 'O.', 'Negro', '09170000009'
FROM users u
WHERE u.email = 'elmira.negro@tmc.edu.ph'
ON DUPLICATE KEY UPDATE
first_name = VALUES(first_name),
middle_name = VALUES(middle_name),
last_name = VALUES(last_name),
contact_number = VALUES(contact_number);

INSERT INTO admin_profiles (user_id, first_name, middle_name, last_name, contact_number)
SELECT u.user_id, 'Judith', 'V.', 'Austria', '09170000010'
FROM users u
WHERE u.email = 'judith.austria@tmc.edu.ph'
ON DUPLICATE KEY UPDATE
first_name = VALUES(first_name),
middle_name = VALUES(middle_name),
last_name = VALUES(last_name),
contact_number = VALUES(contact_number);

INSERT INTO admin_profiles (user_id, first_name, middle_name, last_name, contact_number)
SELECT u.user_id, 'Antonette', 'T.', 'Nugal', '09170000011'
FROM users u
WHERE u.email = 'antonette.nugal@tmc.edu.ph'
ON DUPLICATE KEY UPDATE
first_name = VALUES(first_name),
middle_name = VALUES(middle_name),
last_name = VALUES(last_name),
contact_number = VALUES(contact_number);

INSERT INTO admin_profiles (user_id, first_name, middle_name, last_name, contact_number)
SELECT u.user_id, 'Julie', 'T.', 'Maestrado', '09170000012'
FROM users u
WHERE u.email = 'julie.maestrado@tmc.edu.ph'
ON DUPLICATE KEY UPDATE
first_name = VALUES(first_name),
middle_name = VALUES(middle_name),
last_name = VALUES(last_name),
contact_number = VALUES(contact_number);

INSERT INTO admin_profiles (user_id, first_name, middle_name, last_name, contact_number)
SELECT u.user_id, 'Iris Mae', 'C.', 'Lloren', '09170000013'
FROM users u
WHERE u.email = 'iris.lloren@tmc.edu.ph'
ON DUPLICATE KEY UPDATE
first_name = VALUES(first_name),
middle_name = VALUES(middle_name),
last_name = VALUES(last_name),
contact_number = VALUES(contact_number);

-- ===========================================================
-- 8. STUDENT / ALUMNI PROFILES
-- ===========================================================
INSERT INTO student_profiles (
  user_id,
  student_number,
  first_name,
  middle_name,
  last_name,
  extension_name,
  birthdate,
  gender,
  contact_number,
  course_id,
  year_level,
  enrollment_status
)
SELECT
  u.user_id,
  '2026-0001',
  'Juan',
  'Santos',
  'Dela Cruz',
  NULL,
  '2005-02-14',
  'male',
  '09990000001',
  c.course_id,
  '2nd',
  'enrolled'
FROM users u
JOIN courses c ON c.course_code = 'BSIT'
WHERE u.email = 'student@tmc.edu.ph'
ON DUPLICATE KEY UPDATE
first_name = VALUES(first_name),
middle_name = VALUES(middle_name),
last_name = VALUES(last_name),
birthdate = VALUES(birthdate),
gender = VALUES(gender),
contact_number = VALUES(contact_number),
course_id = VALUES(course_id),
year_level = VALUES(year_level),
enrollment_status = VALUES(enrollment_status);

INSERT INTO student_profiles (
  user_id,
  student_number,
  first_name,
  middle_name,
  last_name,
  extension_name,
  birthdate,
  gender,
  contact_number,
  course_id,
  year_level,
  enrollment_status
)
SELECT
  u.user_id,
  '2018-0001',
  'Maria',
  'Lopez',
  'Santos',
  NULL,
  '2000-08-23',
  'female',
  '09990000002',
  c.course_id,
  '4th',
  'alumni'
FROM users u
JOIN courses c ON c.course_code = 'BSBA'
WHERE u.email = 'alumni@tmc.edu.ph'
ON DUPLICATE KEY UPDATE
first_name = VALUES(first_name),
middle_name = VALUES(middle_name),
last_name = VALUES(last_name),
birthdate = VALUES(birthdate),
gender = VALUES(gender),
contact_number = VALUES(contact_number),
course_id = VALUES(course_id),
year_level = VALUES(year_level),
enrollment_status = VALUES(enrollment_status);

-- ===========================================================
-- 9. ADDRESS + GUARDIAN DEFAULTS
-- ===========================================================
INSERT IGNORE INTO provinces (province_name) VALUES ('Bohol');

INSERT IGNORE INTO municipalities (province_id, municipality_name)
SELECT p.province_id, 'Trinidad'
FROM provinces p
WHERE p.province_name = 'Bohol';

INSERT IGNORE INTO barangays (municipality_id, barangay_name)
SELECT m.municipality_id, 'Poblacion'
FROM municipalities m
WHERE m.municipality_name = 'Trinidad';

INSERT INTO student_addresses (
  student_id,
  address_type,
  province_id,
  municipality_id,
  barangay_id,
  street,
  postal_code
)
SELECT sp.student_id, 'current', p.province_id, m.municipality_id, b.barangay_id, 'Rizal Street', '6304'
FROM student_profiles sp
JOIN users u ON u.user_id = sp.user_id
JOIN provinces p ON p.province_name = 'Bohol'
JOIN municipalities m ON m.province_id = p.province_id AND m.municipality_name = 'Trinidad'
JOIN barangays b ON b.municipality_id = m.municipality_id AND b.barangay_name = 'Poblacion'
WHERE u.email = 'student@tmc.edu.ph'
  AND NOT EXISTS (
    SELECT 1 FROM student_addresses sa
    WHERE sa.student_id = sp.student_id AND sa.address_type = 'current'
  );

INSERT INTO student_addresses (
  student_id,
  address_type,
  province_id,
  municipality_id,
  barangay_id,
  street,
  postal_code
)
SELECT sp.student_id, 'current', p.province_id, m.municipality_id, b.barangay_id, 'Bonifacio Street', '6304'
FROM student_profiles sp
JOIN users u ON u.user_id = sp.user_id
JOIN provinces p ON p.province_name = 'Bohol'
JOIN municipalities m ON m.province_id = p.province_id AND m.municipality_name = 'Trinidad'
JOIN barangays b ON b.municipality_id = m.municipality_id AND b.barangay_name = 'Poblacion'
WHERE u.email = 'alumni@tmc.edu.ph'
  AND NOT EXISTS (
    SELECT 1 FROM student_addresses sa
    WHERE sa.student_id = sp.student_id AND sa.address_type = 'current'
  );

INSERT INTO student_guardians (
  student_id,
  guardian_type,
  first_name,
  last_name,
  contact_number,
  occupation,
  email
)
SELECT sp.student_id, 'guardian', 'Pedro', 'Dela Cruz', '09171111111', 'Farmer', 'pedro.delacruz@example.com'
FROM student_profiles sp
JOIN users u ON u.user_id = sp.user_id
WHERE u.email = 'student@tmc.edu.ph'
  AND NOT EXISTS (
    SELECT 1 FROM student_guardians sg
    WHERE sg.student_id = sp.student_id
  );

INSERT INTO student_guardians (
  student_id,
  guardian_type,
  first_name,
  last_name,
  contact_number,
  occupation,
  email
)
SELECT sp.student_id, 'guardian', 'Ana', 'Santos', '09172222222', 'Teacher', 'ana.santos@example.com'
FROM student_profiles sp
JOIN users u ON u.user_id = sp.user_id
WHERE u.email = 'alumni@tmc.edu.ph'
  AND NOT EXISTS (
    SELECT 1 FROM student_guardians sg
    WHERE sg.student_id = sp.student_id
  );

-- ===========================================================
-- 10. WORKFLOW ACADEMIC ROUTING DEFAULTS
-- ===========================================================
INSERT INTO workflow_colleges (college_code, college_name)
VALUES ('CHE', 'College of Higher Education')
ON DUPLICATE KEY UPDATE
college_name = VALUES(college_name);

INSERT INTO workflow_colleges (college_code, college_name)
VALUES
('CCS', 'College of Computer Studies'),
('CAS', 'College of Arts and Sciences'),
('CCJE', 'College of Criminal Justice Education'),
('COA', 'College of Office Administration'),
('COE', 'College of Education')
ON DUPLICATE KEY UPDATE
college_name = VALUES(college_name);

INSERT INTO workflow_departments (college_id, department_code, department_name)
SELECT wc.college_id, 'DIT', 'Department of Information Technology'
FROM workflow_colleges wc
WHERE wc.college_code = 'CHE'
  AND NOT EXISTS (
    SELECT 1 FROM workflow_departments wd
    WHERE wd.college_id = wc.college_id AND wd.department_code = 'DIT'
  );

INSERT INTO workflow_departments (college_id, department_code, department_name)
SELECT wc.college_id, 'DBA', 'Department of Business Administration'
FROM workflow_colleges wc
WHERE wc.college_code = 'CHE'
  AND NOT EXISTS (
    SELECT 1 FROM workflow_departments wd
    WHERE wd.college_id = wc.college_id AND wd.department_code = 'DBA'
  );

INSERT INTO workflow_departments (college_id, department_code, department_name)
SELECT wc.college_id, 'DCS', 'Department of Computer Studies'
FROM workflow_colleges wc
WHERE wc.college_code = 'CCS'
  AND NOT EXISTS (
    SELECT 1 FROM workflow_departments wd
    WHERE wd.college_id = wc.college_id AND wd.department_code = 'DCS'
  );

INSERT INTO workflow_departments (college_id, department_code, department_name)
SELECT wc.college_id, wc.college_code, wc.college_name
FROM workflow_colleges wc
WHERE wc.college_code IN ('CAS', 'CCJE', 'COA', 'COE')
  AND NOT EXISTS (
    SELECT 1 FROM workflow_departments wd
    WHERE wd.college_id = wc.college_id AND wd.department_code = wc.college_code
  );

INSERT INTO workflow_course_scopes (course_id, college_id, department_id)
SELECT c.course_id, wc.college_id, wd.department_id
FROM courses c
JOIN workflow_colleges wc ON wc.college_code = 'CCS'
JOIN workflow_departments wd ON wd.college_id = wc.college_id AND wd.department_code = 'DCS'
WHERE c.course_code = 'BSIT'
ON DUPLICATE KEY UPDATE
college_id = VALUES(college_id),
department_id = VALUES(department_id);

INSERT INTO workflow_course_scopes (course_id, college_id, department_id)
SELECT c.course_id, wc.college_id, wd.department_id
FROM courses c
JOIN workflow_colleges wc ON wc.college_code = 'CHE'
JOIN workflow_departments wd ON wd.department_code = 'DBA'
WHERE c.course_code = 'BSBA'
ON DUPLICATE KEY UPDATE
college_id = VALUES(college_id),
department_id = VALUES(department_id);

INSERT INTO workflow_course_scopes (course_id, college_id, department_id)
SELECT c.course_id, wc.college_id, wd.department_id
FROM courses c
JOIN workflow_colleges wc ON wc.college_code = 'CAS'
JOIN workflow_departments wd ON wd.college_id = wc.college_id AND wd.department_code = 'CAS'
WHERE c.course_code = 'ABPOLSCI'
ON DUPLICATE KEY UPDATE
college_id = VALUES(college_id),
department_id = VALUES(department_id);

INSERT INTO workflow_course_scopes (course_id, college_id, department_id)
SELECT c.course_id, wc.college_id, wd.department_id
FROM courses c
JOIN workflow_colleges wc ON wc.college_code = 'CCJE'
JOIN workflow_departments wd ON wd.college_id = wc.college_id AND wd.department_code = 'CCJE'
WHERE c.course_code = 'BSCRIM'
ON DUPLICATE KEY UPDATE
college_id = VALUES(college_id),
department_id = VALUES(department_id);

INSERT INTO workflow_course_scopes (course_id, college_id, department_id)
SELECT c.course_id, wc.college_id, wd.department_id
FROM courses c
JOIN workflow_colleges wc ON wc.college_code = 'COA'
JOIN workflow_departments wd ON wd.college_id = wc.college_id AND wd.department_code = 'COA'
WHERE c.course_code = 'BSOA'
ON DUPLICATE KEY UPDATE
college_id = VALUES(college_id),
department_id = VALUES(department_id);

INSERT INTO workflow_course_scopes (course_id, college_id, department_id)
SELECT c.course_id, wc.college_id, wd.department_id
FROM courses c
JOIN workflow_colleges wc ON wc.college_code = 'COE'
JOIN workflow_departments wd ON wd.college_id = wc.college_id AND wd.department_code = 'COE'
WHERE c.course_code = 'BSED'
ON DUPLICATE KEY UPDATE
college_id = VALUES(college_id),
department_id = VALUES(department_id);

INSERT INTO workflow_course_scopes (course_id, college_id, department_id)
SELECT c.course_id, wc.college_id, wd.department_id
FROM courses c
JOIN workflow_colleges wc ON wc.college_code = 'COE'
JOIN workflow_departments wd ON wd.college_id = wc.college_id AND wd.department_code = 'COE'
WHERE c.course_code = 'BEED'
ON DUPLICATE KEY UPDATE
college_id = VALUES(college_id),
department_id = VALUES(department_id);

INSERT INTO workflow_dean_assignments (user_id, course_id, department_id, college_id, is_active)
SELECT u.user_id, c.course_id, wcs.department_id, wcs.college_id, 1
FROM users u
JOIN courses c ON c.course_code = 'BSBA'
JOIN workflow_course_scopes wcs ON wcs.course_id = c.course_id
WHERE u.email = 'dean@tmc.edu.ph'
  AND NOT EXISTS (
    SELECT 1
    FROM workflow_dean_assignments wda
    WHERE wda.user_id = u.user_id
      AND wda.course_id = c.course_id
  );

INSERT INTO workflow_dean_assignments (user_id, course_id, department_id, college_id, is_active)
SELECT u.user_id, c.course_id, wcs.department_id, wcs.college_id, 1
FROM users u
JOIN courses c ON c.course_code = 'BSIT'
JOIN workflow_course_scopes wcs ON wcs.course_id = c.course_id
WHERE u.email = 'clark.villamor@tmc.edu.ph'
  AND NOT EXISTS (
    SELECT 1
    FROM workflow_dean_assignments wda
    WHERE wda.user_id = u.user_id
      AND wda.course_id = c.course_id
  );

INSERT INTO workflow_dean_assignments (user_id, course_id, department_id, college_id, is_active)
SELECT u.user_id, c.course_id, wcs.department_id, wcs.college_id, 1
FROM users u
JOIN courses c ON c.course_code = 'ABPOLSCI'
JOIN workflow_course_scopes wcs ON wcs.course_id = c.course_id
WHERE u.email = 'marina.polestico@tmc.edu.ph'
  AND NOT EXISTS (
    SELECT 1 FROM workflow_dean_assignments wda
    WHERE wda.user_id = u.user_id AND wda.course_id = c.course_id
  );

INSERT INTO workflow_dean_assignments (user_id, course_id, department_id, college_id, is_active)
SELECT u.user_id, c.course_id, wcs.department_id, wcs.college_id, 1
FROM users u
JOIN courses c ON c.course_code = 'BSCRIM'
JOIN workflow_course_scopes wcs ON wcs.course_id = c.course_id
WHERE u.email = 'elmira.negro@tmc.edu.ph'
  AND NOT EXISTS (
    SELECT 1 FROM workflow_dean_assignments wda
    WHERE wda.user_id = u.user_id AND wda.course_id = c.course_id
  );

INSERT INTO workflow_dean_assignments (user_id, course_id, department_id, college_id, is_active)
SELECT u.user_id, c.course_id, wcs.department_id, wcs.college_id, 1
FROM users u
JOIN courses c ON c.course_code = 'BSOA'
JOIN workflow_course_scopes wcs ON wcs.course_id = c.course_id
WHERE u.email = 'judith.austria@tmc.edu.ph'
  AND NOT EXISTS (
    SELECT 1 FROM workflow_dean_assignments wda
    WHERE wda.user_id = u.user_id AND wda.course_id = c.course_id
  );

INSERT INTO workflow_dean_assignments (user_id, course_id, department_id, college_id, is_active)
SELECT u.user_id, c.course_id, wcs.department_id, wcs.college_id, 1
FROM users u
JOIN courses c ON c.course_code = 'BSED'
JOIN workflow_course_scopes wcs ON wcs.course_id = c.course_id
WHERE u.email = 'antonette.nugal@tmc.edu.ph'
  AND NOT EXISTS (
    SELECT 1 FROM workflow_dean_assignments wda
    WHERE wda.user_id = u.user_id AND wda.course_id = c.course_id
  );

INSERT INTO workflow_dean_assignments (user_id, course_id, department_id, college_id, is_active)
SELECT u.user_id, c.course_id, wcs.department_id, wcs.college_id, 1
FROM users u
JOIN courses c ON c.course_code = 'BEED'
JOIN workflow_course_scopes wcs ON wcs.course_id = c.course_id
WHERE u.email = 'antonette.nugal@tmc.edu.ph'
  AND NOT EXISTS (
    SELECT 1 FROM workflow_dean_assignments wda
    WHERE wda.user_id = u.user_id AND wda.course_id = c.course_id
  );

INSERT INTO workflow_college_admin_assignments (user_id, college_id, is_active)
SELECT u.user_id, wc.college_id, 1
FROM users u
JOIN workflow_colleges wc ON wc.college_code IN ('CHE', 'CCS', 'CAS', 'CCJE', 'COA', 'COE')
WHERE u.email = 'collegeadmin@tmc.edu.ph'
  AND NOT EXISTS (
    SELECT 1 FROM workflow_college_admin_assignments wcaa
    WHERE wcaa.user_id = u.user_id AND wcaa.college_id = wc.college_id
  );

INSERT INTO workflow_college_admin_assignments (user_id, college_id, is_active)
SELECT u.user_id, wc.college_id, 1
FROM users u
JOIN workflow_colleges wc ON wc.college_code IN ('CHE', 'CCS', 'CAS', 'CCJE', 'COA', 'COE')
WHERE u.email = 'julie.maestrado@tmc.edu.ph'
  AND NOT EXISTS (
    SELECT 1 FROM workflow_college_admin_assignments wcaa
    WHERE wcaa.user_id = u.user_id AND wcaa.college_id = wc.college_id
  );

-- ===========================================================
-- 11. DEFAULT DOCUMENT TYPES
-- ===========================================================
INSERT INTO document_types (
  document_name,
  description,
  base_price,
  requirements,
  estimated_processing_days,
  is_free_first_time,
  is_active,
  created_at,
  updated_at
) VALUES
  ('Transfer Credentials', 'Official transfer credentials request from the printed registrar form.', 150.00, 'Valid school ID, clearance if required', 5, 0, 1, NOW(), NOW()),
  ('Page of TOR (Transferee Only)', 'Per-page transcript request for transferee processing.', 125.00, 'Valid school ID, transferee reference if applicable', 5, 0, 1, NOW(), NOW()),
  ('Permit to Study', 'Official permit to study document from the registrar request form.', 150.00, 'Valid school ID', 5, 0, 1, NOW(), NOW()),
  ('Transcript of Records (1 yr. only)', 'Transcript of records covering first year only.', 250.00, 'Valid school ID, clearance if required', 5, 0, 1, NOW(), NOW()),
  ('Transcript of Records (2 yrs. only)', 'Transcript of records covering two academic years only.', 350.00, 'Valid school ID, clearance if required', 5, 0, 1, NOW(), NOW()),
  ('Transcript of Records (3 yrs. only)', 'Transcript of records covering three academic years only.', 450.00, 'Valid school ID, clearance if required', 5, 0, 1, NOW(), NOW()),
  ('Transcript of Records (4 yrs. Grad.)', 'Full transcript of records for graduates.', 500.00, 'Valid school ID, clearance if required', 5, 0, 1, NOW(), NOW()),
  ('Diploma', 'Registrar-issued diploma copy request.', 350.00, 'Valid school ID', 7, 0, 1, NOW(), NOW()),
  ('Enrollment Certification', 'Certification of current or prior enrollment.', 150.00, 'Valid school ID', 3, 1, 1, NOW(), NOW()),
  ('Good Moral Certification', 'Certification of good moral character routed through registrar workflow.', 150.00, 'Valid school ID', 3, 0, 1, NOW(), NOW()),
  ('Certification of Units Earned', 'Certification of earned academic units.', 150.00, 'Valid school ID', 3, 0, 1, NOW(), NOW()),
  ('Certification of Graduation', 'Certification confirming graduation status.', 150.00, 'Valid school ID', 3, 0, 1, NOW(), NOW()),
  ('Certification of Indorsement', 'Certification of indorsement from the registrar form.', 150.00, 'Valid school ID', 3, 0, 1, NOW(), NOW()),
  ('Certification of Grades', 'Certification of grades for requested term or record set.', 150.00, 'Valid school ID', 3, 0, 1, NOW(), NOW()),
  ('Certification of Latin Honors', 'Certification of latin honors.', 150.00, 'Valid school ID', 3, 0, 1, NOW(), NOW()),
  ('Certification of List of Honors', 'Certification for list of honors inclusion.', 150.00, 'Valid school ID', 3, 0, 1, NOW(), NOW()),
  ('Certification of General Weighted Average', 'Certification of general weighted average.', 150.00, 'Valid school ID', 3, 0, 1, NOW(), NOW()),
  ('Certified True Copy', 'Certified true copy request from registrar records.', 150.00, 'Original document copy if required', 3, 0, 1, NOW(), NOW()),
  ('Certification of Language as Medium of Instruction', 'Certification of language used as medium of instruction.', 150.00, 'Valid school ID', 3, 0, 1, NOW(), NOW()),
  ('Certificate of Registration (COR)', 'Certificate of registration from registrar records.', 150.00, 'Valid school ID', 2, 1, 1, NOW(), NOW()),
  ('Certification of Special Order Number', 'Certification of special order number.', 150.00, 'Valid school ID', 3, 0, 1, NOW(), NOW()),
  ('Certification NSTP Serial Number', 'Certification of NSTP serial number.', 150.00, 'Valid school ID', 3, 0, 1, NOW(), NOW()),
  ('Adding, Dropping, Changing Subjects (ADC)', 'ADC registrar transaction request.', 150.00, 'Validated ADC form if applicable', 2, 0, 1, NOW(), NOW()),
  ('Filing NG Subjects', 'Registrar filing for NG subjects.', 100.00, 'Validated subject filing form if applicable', 2, 0, 1, NOW(), NOW()),
  ('Printing of Study Load', 'Printed study load service.', 10.00, 'Valid school ID', 1, 1, 1, NOW(), NOW()),
  ('Printing of Billing Statement/Assessment', 'Printed billing statement or assessment service.', 10.00, 'Valid school ID', 1, 1, 1, NOW(), NOW()),
  ('Printing of Grade Slip', 'Printed grade slip service.', 20.00, 'Valid school ID', 1, 1, 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE
  description = VALUES(description),
  base_price = VALUES(base_price),
  requirements = VALUES(requirements),
  estimated_processing_days = VALUES(estimated_processing_days),
  is_free_first_time = VALUES(is_free_first_time),
  is_active = VALUES(is_active),
  updated_at = NOW();

-- ===========================================================
-- 12. PAYMENT METHODS
-- ===========================================================
INSERT INTO payment_methods (method_name, send_to, sender_name, is_active)
SELECT 'Cashier', 'Registrar Cashier Window', 'Trinidad Municipal College Cashier', 1
WHERE NOT EXISTS (
  SELECT 1 FROM payment_methods WHERE method_name = 'Cashier'
);

INSERT INTO payment_methods (method_name, send_to, sender_name, is_active)
SELECT 'GCash', '09171234567', 'Trinidad Municipal College Cashier', 1
WHERE NOT EXISTS (
  SELECT 1 FROM payment_methods WHERE method_name = 'GCash'
);

INSERT INTO payment_methods (method_name, send_to, sender_name, is_active)
SELECT 'Bank Transfer', 'LANDBANK - TMC Registrar Collection Account', 'Trinidad Municipal College', 1
WHERE NOT EXISTS (
  SELECT 1 FROM payment_methods WHERE method_name = 'Bank Transfer'
);

-- ===========================================================
-- 13. SCHOOL SETTINGS
-- ===========================================================
INSERT INTO system_settings (
  id,
  school_name,
  school_short_name,
  school_email,
  school_contact_number,
  school_address,
  school_website,
  school_logo,
  school_seal,
  school_icon,
  updated_by
)
SELECT
  1,
  'Trinidad Municipal College',
  'TMC',
  'registrar@tmc.edu.ph',
  '+63 917 123 4567',
  'Poblacion, Trinidad, Bohol',
  'https://tmc.edu.ph',
  '/uploads/system/logo.png',
  '/uploads/system/seal.png',
  '/uploads/system/icon.png',
  u.user_id
FROM users u
WHERE u.email = 'admin@tmc.edu.ph'
ON DUPLICATE KEY UPDATE
  school_name = VALUES(school_name),
  school_short_name = VALUES(school_short_name),
  school_email = VALUES(school_email),
  school_contact_number = VALUES(school_contact_number),
  school_address = VALUES(school_address),
  school_website = VALUES(school_website),
  school_logo = VALUES(school_logo),
  school_seal = VALUES(school_seal),
  school_icon = VALUES(school_icon),
  updated_by = VALUES(updated_by);
