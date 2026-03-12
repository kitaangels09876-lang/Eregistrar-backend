import { Router } from "express";
import { getAllDocuments,createDocument,updateDocument } from "../controllers/document.controller";
import { authenticateToken, requireRole } from "../middlewares/auth.middleware";

const router = Router();

router.get(
  "/documents",
  authenticateToken,
  requireRole("admin", "registrar","student"),
  getAllDocuments
);

router.post(
  "/documents",
  authenticateToken,
  requireRole("admin", "registrar"),
  createDocument
);

router.put(
  "/documents/:documentTypeId",
  authenticateToken,
  requireRole("admin", "registrar"),
  updateDocument
);

export default router;
