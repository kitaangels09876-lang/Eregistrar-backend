export const ROLE_PERMISSIONS: Record<string, string[]> = {
  student: ["request.create", "request.view.own"],
  alumni: ["request.create", "request.view.own"],
  registrar: [
    "request.view.all",
    "request.verify",
    "document.prepare",
    "document.generate",
    "document.release",
    "document.claim",
  ],
  dean: ["approval.dean.view", "approval.dean.approve"],
  college_admin: [
    "approval.college_admin.view",
    "approval.college_admin.approve",
  ],
  accounting: ["payment.confirm", "reports.view"],
  treasurer: ["payment.confirm", "reports.view"],
  admin: [
    "request.view.all",
    "admin.manage.users",
    "admin.manage.roles",
    "admin.manage.permissions",
    "admin.manage.document_types",
    "admin.manage.templates",
    "admin.manage.academic_structure",
    "audit.view",
    "reports.view",
  ],
};

export const getPermissionsForRolesSync = (roles: string[] = []) => {
  const permissions = new Set<string>();

  for (const role of roles) {
    const normalized = role.trim().toLowerCase();
    for (const permission of ROLE_PERMISSIONS[normalized] || []) {
      permissions.add(permission);
    }
  }

  return Array.from(permissions).sort();
};
