import { Router } from "express";
import { createAnnouncement,getAllAnnouncements,updateAnnouncement,deleteAnnouncement } from "../controllers/announcement.controller";
import { authenticateToken, requireRole } from "../middlewares/auth.middleware";

const router = Router();

router.post(
  "/announcements",
  authenticateToken,
  requireRole("admin", "registrar"),
  createAnnouncement
);

router.get(
  "/announcements",
  authenticateToken,
  requireRole("admin", "registrar","student"),
  getAllAnnouncements
);

router.put(
  "/announcements/:announcementId",
  authenticateToken,
  requireRole("admin", "registrar"),
  updateAnnouncement
);

router.delete(
  "/announcements/:announcementId",
  authenticateToken,
  requireRole("admin", "registrar"),
  deleteAnnouncement
);

export default router;
