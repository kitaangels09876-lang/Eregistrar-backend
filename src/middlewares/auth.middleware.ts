import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config({ quiet: true });


export interface JwtPayload {
  user_id: number;
  email: string;
  account_type: string;
  roles: string[];
  permissions?: string[];
  iat?: number;
  exp?: number;
}


declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}


const normalizeAuthScope = (value: unknown) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

const getAuthorizationScopes = (user?: JwtPayload) => {
  const roleScopes = Array.isArray(user?.roles)
    ? user.roles
        .map((role) => normalizeAuthScope(role))
        .filter(Boolean)
    : [];

  // Fallback for accounts whose JWT has no explicit role entries.
  if (roleScopes.length > 0) {
    return roleScopes;
  }

  const accountTypeScope = normalizeAuthScope(user?.account_type);
  return accountTypeScope ? [accountTypeScope] : [];
};


export const authenticateToken = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authorizationHeader = req.headers.authorization;
    const token =
      typeof authorizationHeader === "string" &&
      authorizationHeader.startsWith("Bearer ")
        ? authorizationHeader.slice("Bearer ".length).trim()
        : "";

    if (!token) {
      return res.status(401).json({
        status: "error",
        message: "Authorization token required",
      });
    }

    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      throw new Error("JWT_SECRET not configured");
    }

    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.user = decoded;

    next();
  } catch (error: any) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        status: "error",
        message: "Session expired. Please login again.",
      });
    }

    return res.status(401).json({
      status: "error",
      message: "Invalid authentication token",
    });
  }
};


export const requireRole = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        status: "error",
        message: "Authentication required",
      });
    }

    const allowedScopes = allowedRoles
      .map((role) => normalizeAuthScope(role))
      .filter(Boolean);
    const userScopes = getAuthorizationScopes(req.user);

    const hasRole = userScopes.some((scope) =>
      allowedScopes.includes(scope)
    );

    if (!hasRole) {
      return res.status(403).json({
        status: "error",
        message: "Insufficient permissions",
        required_roles: allowedRoles,
        user_roles: userScopes,
      });
    }

    next();
  };
};


export const requireAccountType = (...allowedTypes: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        status: "error",
        message: "Authentication required",
      });
    }

    if (!allowedTypes.includes(req.user.account_type)) {
      return res.status(403).json({
        status: "error",
        message: "Invalid account type",
        required_types: allowedTypes,
        user_type: req.user.account_type,
      });
    }

    next();
  };
};

export const requirePermission = (...requiredPermissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        status: "error",
        message: "Authentication required",
      });
    }

    const permissions = Array.isArray(req.user.permissions)
      ? req.user.permissions
      : [];

    const missingPermissions = requiredPermissions.filter(
      (permission) => !permissions.includes(permission)
    );

    if (missingPermissions.length > 0) {
      return res.status(403).json({
        status: "error",
        message: "Missing required permissions",
        missing_permissions: missingPermissions,
      });
    }

    next();
  };
};
