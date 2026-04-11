import { Router } from "express";
import { getAllStudents,getStudentById,updateStudent,updateStudentStatus, validateEmailAvailability,updateStudentAcademicStatus, softDeleteStudent  } from "../controllers/student.controller";
import { authenticateToken, requireRole } from "../middlewares/auth.middleware";

const router = Router();

router.get(
  "/students",
  authenticateToken,
  requireRole("admin", "registrar"),
  getAllStudents
);

router.get(
  "/students/:studentId",
  authenticateToken,
  requireRole("admin", "registrar"),
  getStudentById
);

router.put(
  "/students/:studentId",
  authenticateToken,
  requireRole("admin", "registrar"),
  updateStudent
);

router.patch(
  "/students/:studentId/status",
  authenticateToken,
  requireRole("admin", "registrar"),
  updateStudentStatus
);

router.patch(
  "/students/:studentId/academic-status",
  authenticateToken,
  requireRole("admin", "registrar","student"),
  updateStudentAcademicStatus
);

router.delete(
  "/students/:studentId",
  authenticateToken,
  requireRole("admin", "registrar"),
  softDeleteStudent
);

router.post("/validate-email", validateEmailAvailability);

export default router;
