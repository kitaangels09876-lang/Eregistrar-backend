import { Router } from "express";
import { getAllAdminAndRegistrarAccounts,getAdminOrRegistrarById , changeAdminOrRegistrarRole,changeAdminOrRegistrarStatus, softDeleteAdminOrRegistrarAccount, updateAdminAccount} from "../controllers/admin.controller";
import { authenticateToken, requireRole } from "../middlewares/auth.middleware";

const router = Router();

router.get(
  "/admins",
  authenticateToken,
  requireRole("admin"), 
  getAllAdminAndRegistrarAccounts
);

router.get(
  "/admins/:userId",
  authenticateToken,
  requireRole("admin"),
  getAdminOrRegistrarById
);

router.put(
  "/admins/:userId",
  authenticateToken,
  requireRole("admin"),
  updateAdminAccount
);

router.put(
  "/admins/:userId/role",
  authenticateToken,
  requireRole("admin"),
  changeAdminOrRegistrarRole
);

router.put(
  "/admins/:userId/status",
  authenticateToken,
  requireRole("admin"),
  changeAdminOrRegistrarStatus
);

router.delete(
  "/admins/:userId",
  authenticateToken,
  requireRole("admin"),
  softDeleteAdminOrRegistrarAccount
);

router.put(
  "/auth/me",
  authenticateToken,
  requireRole("admin", "registrar"),
  updateAdminAccount
);

export default router;
