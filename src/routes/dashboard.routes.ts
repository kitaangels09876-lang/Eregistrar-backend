import { Router } from "express";
import { getDashboardSummary, getStudentDashboardSummary } from "../controllers/dashboard.controller";

import {
  authenticateToken,
  requireRole
} from "../middlewares/auth.middleware";

const router = Router();

router.get(
  "/dashboard/summary",
  authenticateToken,
  requireRole("admin", "registrar"),
  getDashboardSummary
);

router.get(
  "/dashboard/student",
  authenticateToken,
  requireRole("student"),
  getStudentDashboardSummary
);

export default router;
