import { Router } from "express";
import { getSystemSettings, updateSystemSettings } from "../controllers/systemSettings.controller";
import { authenticateToken, requireRole } from "../middlewares/auth.middleware";
import upload from "../middlewares/multerConfig";

const router = Router();

router.get(
  "/system-settings",
  getSystemSettings
);


router.put(
  "/system-settings",
  authenticateToken,
  requireRole("admin","registrar"),
  upload.fields([
    { name: "school_logo", maxCount: 1 },
    { name: "school_seal", maxCount: 1 },
    { name: "school_icon", maxCount: 1 },
  ]),
  updateSystemSettings
);
export default router;
