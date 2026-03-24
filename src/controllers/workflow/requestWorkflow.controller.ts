import { Request, Response } from "express";
import {
  advanceWorkflowRequest,
  createWorkflowRequest,
  getWorkflowRequestDetail,
  getWorkflowRequestClaimStub,
  getWorkflowRequestLatestDocument,
  getWorkflowRequestTimeline,
  listWorkflowQueueByStatuses,
  listWorkflowRequests,
  processWorkflowAction,
} from "../../services/workflow/requestWorkflow.service";
import { WorkflowStatus } from "../../constants/workflow";

const getAuthUser = (req: Request) => {
  const user = req.user;

  if (!user?.user_id) {
    throw new Error("Unauthorized");
  }

  return {
    user_id: user.user_id,
    account_type: user.account_type,
    roles: user.roles || [],
  };
};

export const createWorkflowRequestHandler = async (req: Request, res: Response) => {
  try {
    const data = await createWorkflowRequest(getAuthUser(req), req.body);
    return res.status(201).json({
      status: "success",
      message: "Printed workflow request created successfully",
      data,
    });
  } catch (error: any) {
    return res.status(400).json({
      status: "error",
      message: error.message || "Failed to create workflow request",
    });
  }
};

export const listWorkflowRequestsHandler = async (req: Request, res: Response) => {
  try {
    const data = await listWorkflowRequests(getAuthUser(req));
    return res.json({
      status: "success",
      data,
    });
  } catch (error: any) {
    return res.status(400).json({
      status: "error",
      message: error.message || "Failed to list workflow requests",
    });
  }
};

export const getWorkflowRequestDetailHandler = async (req: Request, res: Response) => {
  try {
    const data = await getWorkflowRequestDetail(
      Number(req.params.workflowRequestId),
      getAuthUser(req)
    );

    return res.json({
      status: "success",
      data,
    });
  } catch (error: any) {
    return res.status(400).json({
      status: "error",
      message: error.message || "Failed to load workflow request",
    });
  }
};

export const advanceWorkflowRequestHandler = async (req: Request, res: Response) => {
  try {
    const requestId = Number(req.params.workflowRequestId);
    const user = getAuthUser(req);

    const data = req.body?.action
      ? await processWorkflowAction(requestId, user, req.body.action, req.body)
      : await advanceWorkflowRequest(requestId, user, req.body);

    return res.json({
      status: "success",
      message: "Workflow request advanced successfully",
      data,
    });
  } catch (error: any) {
    return res.status(400).json({
      status: "error",
      message: error.message || "Failed to advance workflow request",
    });
  }
};

export const getWorkflowTimelineHandler = async (req: Request, res: Response) => {
  try {
    const data = await getWorkflowRequestTimeline(
      Number(req.params.workflowRequestId),
      getAuthUser(req)
    );

    return res.json({
      status: "success",
      data,
    });
  } catch (error: any) {
    return res.status(400).json({
      status: "error",
      message: error.message || "Failed to load workflow timeline",
    });
  }
};

export const listWorkflowQueueHandler = (statuses: WorkflowStatus[]) => {
  return async (req: Request, res: Response) => {
    try {
      const data = await listWorkflowQueueByStatuses(getAuthUser(req), statuses);
      return res.json({
        status: "success",
        data,
      });
    } catch (error: any) {
      return res.status(400).json({
        status: "error",
        message: error.message || "Failed to load workflow queue",
      });
    }
  };
};

const act = (action: string) => {
  return async (req: Request, res: Response) => {
    try {
      const data = await processWorkflowAction(
        Number(req.params.workflowRequestId || req.params.requestId),
        getAuthUser(req),
        action,
        req.body || {}
      );

      return res.json({
        status: "success",
        message: "Workflow action processed successfully",
        data,
      });
    } catch (error: any) {
      return res.status(400).json({
        status: "error",
        message: error.message || "Failed to process workflow action",
      });
    }
  };
};

export const registrarVerificationHandler = act("registrar_verification");
export const deanApproveHandler = act("dean_approve");
export const collegeAdminApproveHandler = act("college_admin_approve");
export const feeAssessHandler = act("fee_assess");
export const paymentConfirmHandler = act("payment_confirm");
export const documentPrepareHandler = act("document_prepare");
export const documentFinalizeHandler = act("document_finalize");
export const releaseDispatchHandler = act("release_dispatch");
export const releaseEmailHandler = act("release_email");
export const releaseClaimHandler = act("release_claim");
export const releaseCompleteHandler = act("release_complete");

export const getWorkflowRequestLatestDocumentHandler = async (
  req: Request,
  res: Response
) => {
  try {
    const data = await getWorkflowRequestLatestDocument(
      Number(req.params.workflowRequestId || req.params.requestId),
      getAuthUser(req)
    );

    return res.json({
      status: "success",
      data,
    });
  } catch (error: any) {
    return res.status(404).json({
      status: "error",
      message: error.message || "Generated request form not found",
    });
  }
};

export const getWorkflowRequestClaimStubHandler = async (
  req: Request,
  res: Response
) => {
  try {
    const data = await getWorkflowRequestClaimStub(
      Number(req.params.workflowRequestId || req.params.requestId),
      getAuthUser(req)
    );

    return res.json({
      status: "success",
      data,
    });
  } catch (error: any) {
    return res.status(404).json({
      status: "error",
      message: error.message || "Claim stub not found",
    });
  }
};
