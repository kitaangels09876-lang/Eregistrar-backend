import { QueryTypes } from "sequelize";
import { sequelize } from "../../models";
import { ROLE_PERMISSIONS } from "../../constants/permissions";

let permissionTablesChecked = false;
let permissionTablesAvailable = false;

const ensurePermissionTablesStatus = async () => {
  if (permissionTablesChecked) {
    return permissionTablesAvailable;
  }

  try {
    const result: any[] = await sequelize.query(
      `
      SELECT COUNT(*) AS total
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
        AND table_name IN ('permissions', 'role_permissions')
      `,
      {
        type: QueryTypes.SELECT,
      }
    );

    permissionTablesAvailable = Number(result[0]?.total || 0) === 2;
  } catch {
    permissionTablesAvailable = false;
  }

  permissionTablesChecked = true;
  return permissionTablesAvailable;
};

export const getPermissionsForRoles = async (roles: string[] = []) => {
  const normalizedRoles = roles
    .map((role) => role.trim().toLowerCase())
    .filter(Boolean);

  if (normalizedRoles.length === 0) {
    return [];
  }

  const hasTables = await ensurePermissionTablesStatus();
  if (!hasTables) {
    const fallback = new Set<string>();
    for (const role of normalizedRoles) {
      for (const permission of ROLE_PERMISSIONS[role] || []) {
        fallback.add(permission);
      }
    }
    return Array.from(fallback).sort();
  }

  const rows: any[] = await sequelize.query(
    `
    SELECT DISTINCT p.permission_key
    FROM roles r
    JOIN role_permissions rp ON rp.role_id = r.role_id
    JOIN permissions p ON p.permission_id = rp.permission_id
    WHERE LOWER(r.role_name) IN (:roles)
    ORDER BY p.permission_key ASC
    `,
    {
      replacements: { roles: normalizedRoles },
      type: QueryTypes.SELECT,
    }
  );

  if (rows.length === 0) {
    const fallback = new Set<string>();
    for (const role of normalizedRoles) {
      for (const permission of ROLE_PERMISSIONS[role] || []) {
        fallback.add(permission);
      }
    }
    return Array.from(fallback).sort();
  }

  return rows.map((row) => row.permission_key);
};
