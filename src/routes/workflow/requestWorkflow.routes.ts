import { Router } from "express";
import { authenticateToken } from "../../middlewares/auth.middleware";
import {
  advanceWorkflowRequestHandler,
  collegeAdminApproveHandler,
  createWorkflowRequestHandler,
  deanApproveHandler,
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
  registrarVerificationHandler,
  releaseClaimHandler,
  releaseCompleteHandler,
  releaseDispatchHandler,
  releaseEmailHandler,
} from "../../controllers/workflow/requestWorkflow.controller";
import { WorkflowStatus } from "../../constants/workflow";

const router = Router();

router.use(authenticateToken);

router.post("/workflow/requests", createWorkflowRequestHandler);
router.get("/workflow/requests", listWorkflowRequestsHandler);
router.get("/workflow/requests/:workflowRequestId", getWorkflowRequestDetailHandler);
router.get("/workflow/requests/:workflowRequestId/timeline", getWorkflowTimelineHandler);
router.post("/workflow/requests/:workflowRequestId/advance", advanceWorkflowRequestHandler);
router.get(
  "/workflow/requests/:workflowRequestId/latest-document",
  getWorkflowRequestLatestDocumentHandler
);
router.get(
  "/workflow/requests/:workflowRequestId/claim-stub",
  getWorkflowRequestClaimStubHandler
);

router.post("/v1/requests", createWorkflowRequestHandler);
router.get("/v1/requests", listWorkflowRequestsHandler);
router.get("/v1/requests/:workflowRequestId", getWorkflowRequestDetailHandler);
router.get("/v1/requests/:workflowRequestId/timeline", getWorkflowTimelineHandler);
router.post("/v1/requests/:requestId/registrar-verification", registrarVerificationHandler);
router.post("/v1/requests/:requestId/fee-assessments", feeAssessHandler);

router.get(
  "/v1/approvals/dean/queue",
  listWorkflowQueueHandler(["AWAITING_DEAN_APPROVAL"] as WorkflowStatus[])
);
router.post("/v1/approvals/dean/:requestId/approve", deanApproveHandler);

router.get(
  "/v1/approvals/college-admin/queue",
  listWorkflowQueueHandler(["AWAITING_COLLEGE_ADMIN_REVIEW"] as WorkflowStatus[])
);
router.post(
  "/v1/approvals/college-admin/:requestId/approve",
  collegeAdminApproveHandler
);

router.get(
  "/v1/payments/queue",
  listWorkflowQueueHandler(["AWAITING_PAYMENT"] as WorkflowStatus[])
);
router.post("/v1/payments/:requestId/confirm", paymentConfirmHandler);

router.post("/v1/documents/:requestId/prepare", documentPrepareHandler);
router.post("/v1/documents/:requestId/finalize", documentFinalizeHandler);
router.get("/v1/documents/:requestId/generated", getWorkflowRequestLatestDocumentHandler);
router.get("/v1/requests/:requestId/claim-stub", getWorkflowRequestClaimStubHandler);

router.post("/v1/release/:requestId/dispatch", releaseDispatchHandler);
router.post("/v1/release/:requestId/email-send", releaseEmailHandler);
router.post("/v1/release/:requestId/claim", releaseClaimHandler);
router.post("/v1/release/:requestId/complete", releaseCompleteHandler);

export default router;
