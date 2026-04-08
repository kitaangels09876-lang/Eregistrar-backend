import { Request, Response } from "express";
import {
  advanceWorkflowRequest,
  confirmWorkflowClaimStub,
  createWorkflowRequest,
  getWorkflowRequestDetail,
  getWorkflowRequestClaimStub,
  getWorkflowRequestClaimStubDownload,
  getWorkflowRequestLatestDocument,
  getWorkflowRequestLatestDocumentDownload,
  getWorkflowRequestTimeline,
  listWorkflowQueueByStatuses,
  listWorkflowRequests,
  lookupWorkflowClaimStub,
  processWorkflowAction,
} from "../../services/workflow/requestWorkflow.service";
import { WorkflowStatus } from "../../constants/workflow";
import { WorkflowRequestPayload } from "../../types/workflow";
import {
  removeLocalFileIfExists,
  uploadLocalFileToCloudinary,
} from "../../utils/cloudinaryStorage";

const resolveWorkflowErrorStatus = (error: unknown) => {
  const message =
    error instanceof Error ? error.message.toLowerCase() : String(error || "").toLowerCase();

  if (
    message.includes("unauthorized") ||
    message.includes("authentication required") ||
    message.includes("missing or invalid authorization")
  ) {
    return 401;
  }

  if (
    message.includes("missing permission") ||
    message.includes("do not have access") ||
    message.includes("not allowed") ||
    message.includes("forbidden")
  ) {
    return 403;
  }

  if (message.includes("not found")) {
    return 404;
  }

  return 400;
};

const getAuthUser = (req: Request) => {
  const user = req.user;

  if (!user?.user_id) {
    throw new Error("Unauthorized");
  }

  return {
    user_id: user.user_id,
    account_type: user.account_type,
    roles: user.roles || [],
    permissions: user.permissions || [],
  };
};

const parseJsonObject = (value: unknown) => {
  if (!value) {
    return {};
  }

  if (typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, any>;
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return typeof parsed === "object" && parsed && !Array.isArray(parsed)
        ? (parsed as Record<string, any>)
        : {};
    } catch {
      return {};
    }
  }

  return {};
};

const uploadStoredFile = async (
  file: Express.Multer.File | undefined,
  options: {
    folder: string;
    publicId?: string;
    resourceType?: "auto" | "image" | "raw";
  }
) => {
  if (!file?.path) {
    return null;
  }

  const uploaded = await uploadLocalFileToCloudinary({
    filePath: file.path,
    fileName: file.originalname || file.filename,
    folder: options.folder,
    publicId: options.publicId,
    resourceType: options.resourceType,
  });

  if (uploaded.usedCloudinary) {
    await removeLocalFileIfExists(file.path);
  }

  return uploaded;
};

const getWorkflowActionPayload = async (req: Request) => {
  const body = req.body || {};
  const updates = parseJsonObject(body.updates);
  const file = (req as Request & { file?: Express.Multer.File }).file;

  if (file) {
    const uploaded = await uploadStoredFile(file, {
      folder: "eregistrar/workflow/approval-signatures",
      publicId: file.filename,
      resourceType: "auto",
    });

    updates.signature_file_name = file.originalname || file.filename;
    updates.signature_file_path = uploaded?.url;
  }

  return {
    remarks: typeof body.remarks === "string" ? body.remarks : undefined,
    updates,
  };
};

export const createWorkflowRequestHandler = async (req: Request, res: Response) => {
  try {
    const files = (req.files as Express.Multer.File[] | undefined) || [];
    const parseField = <T>(value: unknown, fallback: T): T => {
      if (value === undefined || value === null || value === "") {
        return fallback;
      }

      if (typeof value === "object") {
        return value as T;
      }

      if (typeof value !== "string") {
        return fallback;
      }

      try {
        return JSON.parse(value) as T;
      } catch {
        return fallback;
      }
    };

    const body = req.body || {};
    const payload: WorkflowRequestPayload = {
      civil_status: body.civil_status || "",
      gender: body.gender || "",
      contact_number: body.contact_number || "",
      address_line: body.address_line || "",
      purok: body.purok || "",
      barangay: body.barangay || "",
      municipality: body.municipality || "",
      province: body.province || "",
      academic_year_label: body.academic_year_label || "",
      place_of_birth: body.place_of_birth || "",
      date_of_birth: body.date_of_birth || "",
      guardian_name: body.guardian_name || "",
      course_text: body.course_text || "",
      last_semester_attended: body.last_semester_attended || "",
      purpose: body.purpose || "",
      delivery_method: "pickup",
      requested_document_ids: parseField<number[]>(body.requested_document_ids, []).map(Number),
      educational_background: parseField(body.educational_background, []),
      attachments: files.map((file) => ({
        original_file_name: file.originalname,
        stored_file_name: file.filename,
        file_path: `/uploads/workflow/request-attachments/${file.filename}`,
        mime_type: file.mimetype,
        file_size: file.size,
      })),
    };

    const data = await createWorkflowRequest(getAuthUser(req), payload);
    return res.status(201).json({
      status: "success",
      message: "Printed workflow request created successfully",
      data,
    });
  } catch (error: any) {
    return res.status(resolveWorkflowErrorStatus(error)).json({
      status: "error",
      message: error.message || "Failed to create workflow request",
    });
  }
};

export const listWorkflowRequestsHandler = async (req: Request, res: Response) => {
  try {
    const parsedPage = Number(req.query.page);
    const parsedLimit = Number(req.query.limit);

    const data = await listWorkflowRequests(getAuthUser(req), {
      search: typeof req.query.search === "string" ? req.query.search : undefined,
      status: typeof req.query.status === "string" ? req.query.status : undefined,
      payment_status:
        typeof req.query.payment_status === "string" ? req.query.payment_status : undefined,
      document_type_id:
        typeof req.query.document_type_id === "string"
          ? req.query.document_type_id
          : undefined,
      from_date: typeof req.query.from_date === "string" ? req.query.from_date : undefined,
      to_date: typeof req.query.to_date === "string" ? req.query.to_date : undefined,
      page: Number.isFinite(parsedPage) ? parsedPage : undefined,
      limit: Number.isFinite(parsedLimit) ? parsedLimit : undefined,
    });
    return res.json({
      status: "success",
      data: data.items,
      meta: data.meta,
    });
  } catch (error: any) {
    return res.status(resolveWorkflowErrorStatus(error)).json({
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
    return res.status(resolveWorkflowErrorStatus(error)).json({
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
    return res.status(resolveWorkflowErrorStatus(error)).json({
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
    return res.status(resolveWorkflowErrorStatus(error)).json({
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
      return res.status(resolveWorkflowErrorStatus(error)).json({
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
          await getWorkflowActionPayload(req)
        );

      return res.json({
        status: "success",
        message: "Workflow action processed successfully",
        data,
      });
    } catch (error: any) {
      return res.status(resolveWorkflowErrorStatus(error)).json({
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
export const paymentSubmitHandler = async (req: Request, res: Response) => {
  try {
    const file = req.file;
    const uploadedProof = await uploadStoredFile(file, {
      folder: "eregistrar/workflow/payment-proofs",
      publicId: file?.filename,
      resourceType: "auto",
    });
    const updates = {
      ...(req.body || {}),
      proof_file_name: file?.originalname || file?.filename || undefined,
      proof_file_path: uploadedProof?.url,
    };

    const data = await processWorkflowAction(
      Number(req.params.requestId),
      getAuthUser(req),
      "payment_submit",
      {
        remarks: req.body?.remarks,
        updates,
      }
    );

    return res.json({
      status: "success",
      message: "Payment submission recorded successfully",
      data,
    });
  } catch (error: any) {
    return res.status(resolveWorkflowErrorStatus(error)).json({
      status: "error",
      message: error.message || "Failed to submit payment proof",
    });
  }
};
export const documentPrepareHandler = act("document_prepare");
export const documentFinalizeHandler = act("document_finalize");
export const releaseClaimHandler = act("release_claim");
export const releaseCompleteHandler = act("release_complete");
export const requestCancelHandler = act("request_cancel");
export const registrarRejectHandler = act("registrar_reject");
export const deanRejectHandler = act("dean_reject");
export const collegeAdminRejectHandler = act("college_admin_reject");

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
    return res.status(resolveWorkflowErrorStatus(error)).json({
      status: "error",
      message: error.message || "Generated request form not found",
    });
  }
};

export const downloadWorkflowRequestLatestDocumentHandler = async (
  req: Request,
  res: Response
) => {
  try {
    const data = await getWorkflowRequestLatestDocumentDownload(
      Number(req.params.workflowRequestId || req.params.requestId),
      getAuthUser(req)
    );

    return res.redirect(data.file_path);
  } catch (error: any) {
    return res.status(resolveWorkflowErrorStatus(error)).json({
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
    return res.status(resolveWorkflowErrorStatus(error)).json({
      status: "error",
      message: error.message || "Claim stub not found",
    });
  }
};

export const downloadWorkflowRequestClaimStubHandler = async (
  req: Request,
  res: Response
) => {
  try {
    const data = await getWorkflowRequestClaimStubDownload(
      Number(req.params.workflowRequestId || req.params.requestId),
      getAuthUser(req)
    );

    return res.redirect(data.file_path);
  } catch (error: any) {
    return res.status(resolveWorkflowErrorStatus(error)).json({
      status: "error",
      message: error.message || "Claim stub not found",
    });
  }
};

export const claimVerificationLookupHandler = async (req: Request, res: Response) => {
  try {
    const data = await lookupWorkflowClaimStub(getAuthUser(req), {
      claim_stub_number:
        typeof req.body?.claim_stub_number === "string"
          ? req.body.claim_stub_number
          : typeof req.query.claim_stub_number === "string"
          ? req.query.claim_stub_number
          : undefined,
      request_reference:
        typeof req.body?.request_reference === "string"
          ? req.body.request_reference
          : typeof req.query.request_reference === "string"
          ? req.query.request_reference
          : undefined,
      lookup_token:
        typeof req.body?.lookup_token === "string"
          ? req.body.lookup_token
          : typeof req.query.lookup_token === "string"
          ? req.query.lookup_token
          : typeof req.query.token === "string"
          ? req.query.token
          : undefined,
    });

    return res.json({
      status: "success",
      data,
    });
  } catch (error: any) {
    return res.status(resolveWorkflowErrorStatus(error)).json({
      status: "error",
      message: error.message || "Claim verification lookup failed",
    });
  }
};

export const claimVerificationConfirmHandler = async (req: Request, res: Response) => {
  try {
    const files = (req.files as Record<string, Express.Multer.File[]>) || {};
    const authorizationLetter = files.authorization_letter?.[0];
    const claimantIdImage = files.claimant_id_image?.[0];
    const signatureCapture = files.signature_capture?.[0];

    const updates = {
      ...(req.body || {}),
      authorization_letter_file_path: authorizationLetter
        ? `/uploads/workflow/claim-files/${authorizationLetter.filename}`
        : undefined,
      claimant_id_file_path: claimantIdImage
        ? `/uploads/workflow/claim-files/${claimantIdImage.filename}`
        : undefined,
      signature_file_path: signatureCapture
        ? `/uploads/workflow/claim-files/${signatureCapture.filename}`
        : undefined,
    };

    const data = await confirmWorkflowClaimStub(
      Number(req.params.claimStubId),
      getAuthUser(req),
      {
        remarks: req.body?.remarks,
        updates,
      }
    );

    return res.json({
      status: "success",
      message: "Claim confirmed successfully",
      data,
    });
  } catch (error: any) {
    return res.status(resolveWorkflowErrorStatus(error)).json({
      status: "error",
      message: error.message || "Failed to confirm claim",
    });
  }
};
