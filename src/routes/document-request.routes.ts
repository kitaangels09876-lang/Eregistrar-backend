import { Router } from "express";
import { createDocumentRequest,createPayment, uploadPaymentProof , getStudentDocumentRequestsByBatch, trackBatchRequests} from "../controllers/document-request.controller";
import { authenticateToken, requireRole } from "../middlewares/auth.middleware";
import uploadPayment from "../middlewares/payment-proof.upload";

const router = Router();

router.post(
  "/document-requests",
  authenticateToken,
  requireRole("student"),
  createDocumentRequest
);

router.get(
  "/document-requests/batches",
  authenticateToken,
  requireRole("student"),
  getStudentDocumentRequestsByBatch
);

router.get(
  "/document-requests/batches/:batch_id/track",
  authenticateToken,
  requireRole("student", "admin", "registrar"),
  trackBatchRequests
);

router.post(
  "/payments",
  authenticateToken,
  requireRole("student", "admin", "registrar"),
  createPayment
);

router.post(
  "/payments/:paymentId/proof",
  authenticateToken,
  requireRole("student"),
  uploadPayment.single("payment_proof"),
  uploadPaymentProof
);

export default router;
