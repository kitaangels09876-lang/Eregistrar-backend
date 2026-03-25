import fs from "fs";
import multer from "multer";
import path from "path";

const ensureDirectory = (directoryPath: string) => {
  if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath, { recursive: true });
  }
};

const buildStorage = (folder: string) => {
  const uploadDir = path.join(process.cwd(), "uploads", "workflow", folder);
  ensureDirectory(uploadDir);

  return multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, uploadDir);
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || "");
      const safeBase = path
        .basename(file.originalname || "file", ext)
        .replace(/[^a-zA-Z0-9_-]+/g, "-")
        .slice(0, 60);

      cb(null, `${safeBase || "file"}-${Date.now()}${ext}`);
    },
  });
};

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "application/pdf",
]);

const createUploader = (folder: string) =>
  multer({
    storage: buildStorage(folder),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (!allowedMimeTypes.has(file.mimetype)) {
        const error = new Error("Only JPG, PNG, and PDF files are allowed") as Error & {
          statusCode?: number;
        };
        error.statusCode = 400;
        cb(error);
        return;
      }

      cb(null, true);
    },
  });

export const uploadWorkflowPaymentProof = createUploader("payment-proofs").single(
  "payment_proof"
);

export const uploadWorkflowRequestAttachments = createUploader("request-attachments").array(
  "attachments",
  10
);

export const uploadWorkflowClaimFiles = createUploader("claim-files").fields([
  { name: "authorization_letter", maxCount: 1 },
  { name: "claimant_id_image", maxCount: 1 },
  { name: "signature_capture", maxCount: 1 },
]);

export const uploadWorkflowApprovalSignature = createUploader("approval-signatures").single(
  "signature_file"
);
