import { Router } from "express";
import { authenticateToken , requireRole} from "../middlewares/auth.middleware";
import { getMyNotifications, openNotification, markNotificationAsRead } from "../controllers/notification.controller";

const router = Router();
const NOTIFICATION_ALLOWED_ROLES = [
  "admin",
  "registrar",
  "student",
  "alumni",
  "dean",
  "college_admin",
  "treasurer",
] as const;

router.get(
  "/my-notifications",
  authenticateToken,
  requireRole(...NOTIFICATION_ALLOWED_ROLES),
  getMyNotifications
);


router.get(
  "/my-notifications/:notificationId",
  authenticateToken,
  requireRole(...NOTIFICATION_ALLOWED_ROLES),
  openNotification
);


router.patch(
  "/my-notifications/:notificationId/read",
  authenticateToken,
  requireRole(...NOTIFICATION_ALLOWED_ROLES),
  markNotificationAsRead
);

export default router;
