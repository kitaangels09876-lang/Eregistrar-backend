import { Request, Response } from "express";
import {
  softCleanupExpiredRequests,
  hardCleanupArchivedRequests,
} from "../services/requestCleanup.service";
import { logActivity } from "../utils/auditlog.service";

export const runRequestCleanup = async (req: Request, res: Response) => {
  try {
    const softDeleted = await softCleanupExpiredRequests();
    const hardDeleted = await hardCleanupArchivedRequests();

    const result = { softDeleted, hardDeleted };

    await logActivity({
      userId: null,
      action: "AUTO_CLEANUP_EXPIRED_REQUESTS",
      tableName: "document_requests",
      newValue: result,
      req,
    });

    return res.status(200).json({
      status: "success",
      message: "Expired requests cleanup completed",
      data: result,
    });
  } catch (error) {
    console.error("REQUEST CLEANUP ERROR:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to cleanup expired requests",
    });
  }
};
