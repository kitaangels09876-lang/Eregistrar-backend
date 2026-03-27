INSERT IGNORE INTO permissions (permission_key, description) VALUES
('request.create', 'Create document requests'),
('request.view.own', 'View own document requests'),
('request.view.all', 'View all document requests'),
('request.verify', 'Registrar verification'),
('approval.dean.view', 'View dean queue'),
('approval.dean.approve', 'Approve as dean'),
('approval.college_admin.view', 'View college administration queue'),
('approval.college_admin.approve', 'Approve as college administration'),
('payment.assess', 'Assess fees'),
('payment.confirm', 'Confirm payments'),
('document.prepare', 'Prepare documents'),
('document.generate', 'Generate final documents'),
('document.release', 'Release documents'),
('document.claim', 'Confirm claims'),
('admin.manage.users', 'Manage users'),
('admin.manage.roles', 'Manage roles'),
('admin.manage.permissions', 'Manage permissions'),
('admin.manage.document_types', 'Manage document types'),
('admin.manage.templates', 'Manage document templates'),
('admin.manage.academic_structure', 'Manage academic structure'),
('audit.view', 'View audit logs'),
('reports.view', 'View reports');

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM roles r
JOIN permissions p
WHERE
  (r.role_name = 'student' AND p.permission_key IN ('request.create', 'request.view.own')) OR
  (r.role_name = 'alumni' AND p.permission_key IN ('request.create', 'request.view.own')) OR
  (r.role_name = 'registrar' AND p.permission_key IN ('request.view.all', 'request.verify', 'payment.assess', 'document.prepare', 'document.generate', 'document.release', 'document.claim')) OR
  (r.role_name = 'dean' AND p.permission_key IN ('approval.dean.view', 'approval.dean.approve')) OR
  (r.role_name = 'college_admin' AND p.permission_key IN ('approval.college_admin.view', 'approval.college_admin.approve')) OR
  (r.role_name = 'treasurer' AND p.permission_key IN ('payment.confirm', 'reports.view')) OR
  (r.role_name = 'admin' AND p.permission_key IN (
    'request.view.all',
    'request.verify',
    'payment.assess',
    'payment.confirm',
    'document.prepare',
    'document.generate',
    'document.release',
    'document.claim',
    'approval.dean.view',
    'approval.dean.approve',
    'approval.college_admin.view',
    'approval.college_admin.approve',
    'admin.manage.users',
    'admin.manage.roles',
    'admin.manage.permissions',
    'admin.manage.document_types',
    'admin.manage.templates',
    'admin.manage.academic_structure',
    'audit.view',
    'reports.view'
  ));
