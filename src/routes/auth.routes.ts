import { Router } from "express";
import {
  registerStaff,
  login,
  logout,
  checkAuth,
  refreshAccessToken,
  registerStudent,
  testSmtpConnection,
  verifyEmail,
  resendVerificationEmail
} from "../controllers/auth.controller";

import { authenticateToken,requireRole } from "../middlewares/auth.middleware";
import { validateAdminRegister } from "../middlewares/validateAdminRegister";
import { validateLogin } from "../middlewares/validateLogin";
import { validateStudentRegister } from "../middlewares/validateStudentRegister";

const router = Router();


router.post(
  "/register-staff",
  authenticateToken,
  requireRole("admin"),
  validateAdminRegister,
  registerStaff
);

router.post(
  "/login",
  validateLogin,
  login
);

router.post("/refresh", refreshAccessToken);


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

router.get("/verify-email", verifyEmail);

router.post("/resend-verification-email", resendVerificationEmail);

router.post(
  "/test-smtp",
  authenticateToken,
  requireRole("admin"),
  testSmtpConnection
);


export default router;
