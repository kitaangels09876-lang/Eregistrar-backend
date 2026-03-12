import { Router } from "express";
import { getAllCourses, updateCourse, createCourse } from "../controllers/course.controller";
import { authenticateToken, requireRole } from "../middlewares/auth.middleware";

const router = Router();

router.get(
  "/courses",
  getAllCourses
);

router.post(
  "/courses",
  authenticateToken,
  requireRole("admin", "registrar"),
  createCourse
);


router.put(
  "/courses/:courseId",
  authenticateToken,
  requireRole("admin", "registrar"),
  updateCourse
);
export default router;
