import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();


export interface JwtPayload {
  user_id: number;
  email: string;
  account_type: string;
  roles: string[];
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


export const authenticateToken = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.cookies?.token;

    if (!token) {
      return res.status(401).json({
        status: "error",
        message: "Authentication required",
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

    const hasRole = req.user.roles.some(role =>
      allowedRoles.includes(role)
    );

    if (!hasRole) {
      return res.status(403).json({
        status: "error",
        message: "Insufficient permissions",
        required_roles: allowedRoles,
        user_roles: req.user.roles,
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
