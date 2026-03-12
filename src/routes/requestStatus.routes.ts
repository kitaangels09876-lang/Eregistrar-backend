import { Router } from "express";
import {
  getAllRequestStatusLogs,
  addStatusMessage,
  updateRequestStatus,
} from "../controllers/requestStatus.controller";
import { generateReceipt, getAllReceipts, getMyReceipts, reprintReceipt } from "../controllers/receipt.controller";
import {
  authenticateToken,
  requireRole
} from "../middlewares/auth.middleware";

const router = Router();

router.get(
  "/requests/:requestId/status-logs",
  authenticateToken,
  requireRole("admin","registrar"),
  getAllRequestStatusLogs
);

router.post(
  "/requests/:requestId/status-messages",
  authenticateToken,
  requireRole("admin","registrar"),
  addStatusMessage
);

router.put(
  "/requests/:requestId/status/update",
  authenticateToken,
  requireRole("admin","registrar"),
  updateRequestStatus
);

router.post(
  "/receipts/batch/:batchId/generate",
  authenticateToken,
  requireRole("admin", "registrar"),
  generateReceipt
);

router.post(
  "/receipts/:receiptId/reprint",
  authenticateToken,
  requireRole("admin", "registrar","student"),
  reprintReceipt
);

router.get(
  "/receipts/my",
  authenticateToken,   
   requireRole("student"),    
  getMyReceipts
);

router.get(
  "/receipts/list",
  authenticateToken,
  requireRole("admin", "registrar"),
  getAllReceipts
);

export default router;