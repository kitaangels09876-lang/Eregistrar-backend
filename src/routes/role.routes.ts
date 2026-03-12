import { Router } from "express";
import { getAllRoles } from "../controllers/role.controller";
import { authenticateToken, requireRole } from "../middlewares/auth.middleware";

const router = Router();

router.get(
  "/roles",
  authenticateToken,
  requireRole("admin", "registrar"),
  getAllRoles
);

export default router;
