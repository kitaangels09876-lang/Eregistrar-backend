import { Router } from "express";
import {
  getAllPaymentMethods,
  createPaymentMethod,
  updatePaymentMethod,
  getPaymentMethodById
} from "../controllers/paymentMethod.controller";
import { authenticateToken, requireRole } from "../middlewares/auth.middleware";
import { validatePaymentMethod,validateUpdatePaymentMethod } from "../middlewares/validatePaymentMethod";

const router = Router();

router.get(
  "/payment-methods",
  authenticateToken,
  requireRole("admin", "registrar","student"),
  getAllPaymentMethods
);

router.get(
  "/payment-methods/:methodId",
  authenticateToken,
  requireRole("admin", "registrar"),
  getPaymentMethodById
);

router.post(
  "/payment-methods",
  authenticateToken,
  requireRole("admin", "registrar"),
  validatePaymentMethod,
  createPaymentMethod
);

router.put(
  "/payment-methods/:methodId",
  authenticateToken,
  requireRole("admin", "registrar"),
  validateUpdatePaymentMethod,
  updatePaymentMethod
);
export default router;
