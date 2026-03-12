import { Router } from "express";
import {
  registerStaff,
  login,
  logout,
  checkAuth,
  registerStudent
} from "../controllers/auth.controller";

import { authenticateToken,requireRole } from "../middlewares/auth.middleware";
import { validateAdminRegister } from "../middlewares/validateAdminRegister";
import { validateLogin } from "../middlewares/validateLogin";
import { validateStudentRegister } from "../middlewares/validateStudentRegister";

const router = Router();


router.post(
  "/register-staff",
  authenticateToken,
  requireRole("admin", "registrar"),
  validateAdminRegister,
  registerStaff
);

router.post(
  "/login",
  validateLogin,
  login
);


router.get(
  "/me",
  authenticateToken,
  checkAuth
);

router.post(
  "/logout",
  authenticateToken,
  logout
);


router.post(
  "/register-student",
  validateStudentRegister,
  registerStudent
);


export default router;
