import { Router } from "express";
import {
  getAllPayments,
  getPaymentById,
  verifyOrRejectPayment,
  checkBatchPaymentStatus
} from "../controllers/payment.controller";
import {
  authenticateToken,
  requireRole
} from "../middlewares/auth.middleware";

const router = Router();

router.get(
  "/payments",
  authenticateToken,
  requireRole("admin", "registrar","student"),
  getAllPayments
);

router.get(
  "/payments/:paymentId",
  authenticateToken,
  requireRole("admin", "registrar","student"),
  getPaymentById
);

router.get(
  "/payments/batch/:batchId/check-payment",
  authenticateToken,
  requireRole("admin", "registrar","student"),
  checkBatchPaymentStatus
);

router.put(
  "/payments/:paymentId/verify",
  authenticateToken,
  requireRole("admin", "registrar"),
  verifyOrRejectPayment
);

export default router;
