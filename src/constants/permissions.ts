export const ROLE_PERMISSIONS: Record<string, string[]> = {
  student: [
    "request.create",
    "request.view.own",
    "request.cancel.own",
    "payment.submit.own",
    "document.view.own.allowed",
    "claim_stub.view.own",
    "claim_stub.download.own",
    "notification.view.own",
  ],
  alumni: [
    "request.create",
    "request.view.own",
    "request.cancel.own",
    "payment.submit.own",
    "document.view.own.allowed",
    "claim_stub.view.own",
    "claim_stub.download.own",
    "notification.view.own",
  ],
  registrar: [
    "request.view.all",
    "request.verify",
    "request.cancel.any",
    "payment.assess",
    "document.prepare",
    "document.generate",
    "document.release",
    "document.claim",
    "claim_stub.verify",
    "notification.view.own",
  ],
  dean: [
    "approval.dean.view",
    "approval.dean.approve",
    "notification.view.own",
  ],
  college_admin: [
    "approval.college_admin.view",
    "approval.college_admin.approve",
    "notification.view.own",
  ],
  treasurer: ["payment.confirm", "reports.view", "notification.view.own"],
  admin: [
    "request.view.all",
    "request.verify",
    "request.cancel.any",
    "approval.dean.view",
    "approval.dean.approve",
    "approval.college_admin.view",
    "approval.college_admin.approve",
    "payment.assess",
    "payment.confirm",
    "document.prepare",
    "document.generate",
    "document.release",
    "document.claim",
    "claim_stub.verify",
    "admin.manage.users",
    "admin.manage.roles",
    "admin.manage.permissions",
    "admin.manage.document_types",
    "admin.manage.templates",
    "admin.manage.academic_structure",
    "audit.view",
    "reports.view",
    "notification.view.own",
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
