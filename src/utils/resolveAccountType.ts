const normalizeRole = (value: unknown) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

export const resolveEffectiveAccountType = (
  accountType: unknown,
  roles: unknown[] = []
) => {
  const normalizedAccountType = normalizeRole(accountType);
  const normalizedRoles = Array.isArray(roles)
    ? roles.map((role) => normalizeRole(role)).filter(Boolean)
    : [];

  if (normalizedRoles.includes("registrar")) {
    return "registrar";
  }

  if (normalizedRoles.includes("admin")) {
    return normalizedAccountType === "student" ? "student" : "admin";
  }

  if (normalizedRoles.includes("student")) {
    return "student";
  }

  return normalizedAccountType;
};
