import { Router } from "express";
import { authenticateToken } from "../../middlewares/auth.middleware";
import {
  uploadWorkflowApprovalSignature,
  uploadWorkflowClaimFiles,
  uploadWorkflowPaymentProof,
  uploadWorkflowRequestAttachments,
} from "../../middlewares/workflow.upload";
import {
  advanceWorkflowRequestHandler,
  claimVerificationConfirmHandler,
  claimVerificationLookupHandler,
  collegeAdminApproveHandler,
  collegeAdminRejectHandler,
  createWorkflowRequestHandler,
  deanApproveHandler,
  deanRejectHandler,
  downloadWorkflowRequestLatestDocumentHandler,
  downloadWorkflowRequestClaimStubHandler,
  documentFinalizeHandler,
  documentPrepareHandler,
  feeAssessHandler,
  getWorkflowRequestDetailHandler,
  getWorkflowRequestClaimStubHandler,
  getWorkflowRequestLatestDocumentHandler,
  getWorkflowTimelineHandler,
  listWorkflowQueueHandler,
  listWorkflowRequestsHandler,
  paymentConfirmHandler,
  paymentSubmitHandler,
  registrarRejectHandler,
  registrarVerificationHandler,
  requestCancelHandler,
  releaseClaimHandler,
  releaseCompleteHandler,
} from "../../controllers/workflow/requestWorkflow.controller";
import { WorkflowStatus } from "../../constants/workflow";

const router = Router();

router.use(authenticateToken);

router.post("/workflow/requests", uploadWorkflowRequestAttachments, createWorkflowRequestHandler);
router.get("/workflow/requests", listWorkflowRequestsHandler);
router.get("/workflow/requests/:workflowRequestId", getWorkflowRequestDetailHandler);
router.get("/workflow/requests/:workflowRequestId/timeline", getWorkflowTimelineHandler);
router.post("/workflow/requests/:workflowRequestId/advance", advanceWorkflowRequestHandler);
router.get(
  "/workflow/requests/:workflowRequestId/latest-document",
  getWorkflowRequestLatestDocumentHandler
);
router.get(
  "/workflow/requests/:workflowRequestId/latest-document/download",
  downloadWorkflowRequestLatestDocumentHandler
);
router.get(
  "/workflow/requests/:workflowRequestId/claim-stub",
  getWorkflowRequestClaimStubHandler
);
router.get(
  "/workflow/requests/:workflowRequestId/claim-stub/download",
  downloadWorkflowRequestClaimStubHandler
);

router.post("/v1/requests", uploadWorkflowRequestAttachments, createWorkflowRequestHandler);
router.get("/v1/requests", listWorkflowRequestsHandler);
router.get("/v1/requests/:workflowRequestId", getWorkflowRequestDetailHandler);
router.get("/v1/requests/:workflowRequestId/timeline", getWorkflowTimelineHandler);
router.post(
  "/v1/requests/:requestId/registrar-verification",
  uploadWorkflowApprovalSignature,
  registrarVerificationHandler
);
router.post("/v1/requests/:requestId/reject", registrarRejectHandler);
router.post("/v1/requests/:requestId/cancel", requestCancelHandler);
router.post("/v1/requests/:requestId/fee-assessments", feeAssessHandler);

router.get(
  "/v1/approvals/dean/queue",
  listWorkflowQueueHandler(["UNDER_DEAN_APPROVAL"] as WorkflowStatus[])
);
router.post(
  "/v1/approvals/dean/:requestId/approve",
  uploadWorkflowApprovalSignature,
  deanApproveHandler
);
router.post("/v1/approvals/dean/:requestId/reject", deanRejectHandler);

router.get(
  "/v1/approvals/college-admin/queue",
  listWorkflowQueueHandler(["UNDER_COLLEGE_ADMIN_REVIEW"] as WorkflowStatus[])
);
router.post(
  "/v1/approvals/college-admin/:requestId/approve",
  uploadWorkflowApprovalSignature,
  collegeAdminApproveHandler
);
router.post(
  "/v1/approvals/college-admin/:requestId/reject",
  collegeAdminRejectHandler
);

router.get(
  "/v1/payments/queue",
  listWorkflowQueueHandler(["AWAITING_PAYMENT", "PAYMENT_SUBMITTED"] as WorkflowStatus[])
);
router.post("/v1/payments/:requestId/submit", uploadWorkflowPaymentProof, paymentSubmitHandler);
router.post(
  "/v1/payments/:requestId/confirm",
  uploadWorkflowApprovalSignature,
  paymentConfirmHandler
);

router.post("/v1/documents/:requestId/prepare", documentPrepareHandler);
router.post("/v1/documents/:requestId/finalize", documentFinalizeHandler);
router.get("/v1/documents/:requestId/generated", getWorkflowRequestLatestDocumentHandler);
router.get(
  "/v1/documents/:requestId/generated/download",
  downloadWorkflowRequestLatestDocumentHandler
);
router.get("/v1/requests/:requestId/claim-stub", getWorkflowRequestClaimStubHandler);
router.get(
  "/v1/requests/:requestId/claim-stub/download",
  downloadWorkflowRequestClaimStubHandler
);

router.post("/v1/release/:requestId/claim", releaseClaimHandler);
router.post("/v1/release/:requestId/complete", releaseCompleteHandler);

router.get("/v1/registrar/claim-verification/lookup", claimVerificationLookupHandler);
router.post("/v1/registrar/claim-verification/lookup", claimVerificationLookupHandler);
router.post(
  "/v1/registrar/claim-verification/:claimStubId/confirm-claim",
  uploadWorkflowClaimFiles,
  claimVerificationConfirmHandler
);

export default router;
