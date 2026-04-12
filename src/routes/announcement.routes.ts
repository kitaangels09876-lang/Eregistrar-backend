import { Router } from "express";
import { createAnnouncement,getAllAnnouncements,updateAnnouncement,deleteAnnouncement } from "../controllers/announcement.controller";
import { authenticateToken, requireRole } from "../middlewares/auth.middleware";

const router = Router();
const STAFF_ANNOUNCEMENT_ROLES = [
  "admin",
  "registrar",
  "dean",
  "college_admin",
  "treasurer",
] as const;

router.post(
  "/announcements",
  authenticateToken,
  requireRole(...STAFF_ANNOUNCEMENT_ROLES),
  createAnnouncement
);

router.get(
  "/announcements",
  authenticateToken,
  requireRole(...STAFF_ANNOUNCEMENT_ROLES, "student"),
  getAllAnnouncements
);

router.put(
  "/announcements/:announcementId",
  authenticateToken,
  requireRole(...STAFF_ANNOUNCEMENT_ROLES),
  updateAnnouncement
);

router.delete(
  "/announcements/:announcementId",
  authenticateToken,
  requireRole(...STAFF_ANNOUNCEMENT_ROLES),
  deleteAnnouncement
);

export default router;
