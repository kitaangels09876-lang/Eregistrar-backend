import { Router } from "express";
import { authenticateToken , requireRole} from "../middlewares/auth.middleware";
import { getMyNotifications, openNotification, markNotificationAsRead } from "../controllers/notification.controller";

const router = Router();

router.get(
  "/my-notifications",
  authenticateToken,
  requireRole("admin", "registrar", "student", "alumni", "dean", "college_admin", "treasurer"),
  getMyNotifications
);


router.get(
  "/my-notifications/:notificationId",
  authenticateToken,
  openNotification
);


router.patch(
  "/my-notifications/:notificationId/read",
  authenticateToken,
  markNotificationAsRead
);

export default router;
