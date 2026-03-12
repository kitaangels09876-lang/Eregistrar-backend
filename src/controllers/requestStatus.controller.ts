import { Request, Response } from "express";
import { RequestStatusLog, sequelize } from "../models";
import { logActivity, getUserIdFromRequest } from "../utils/auditlog.service";
import { QueryTypes } from "sequelize";

const STATUS_FLOW = [
  "pending",
  "processing",
  "releasing",
  "completed"
] as const;

const FINAL_STATUS = "rejected";


export const getAllRequestStatusLogs = async (req: Request, res: Response) => {
  try {
    const { requestId } = req.params;

    const logs: any[] = await sequelize.query(
      `SELECT 
          rsl.status_log_id,
          rsl.status,
          rsl.message,
          rsl.created_at,
          rsl.updated_at,
          CONCAT(ap.first_name, ' ', ap.last_name) AS admin_name,
          ap.admin_id
       FROM request_status_logs rsl
       INNER JOIN admin_profiles ap ON rsl.created_by = ap.admin_id
       WHERE rsl.request_id = :requestId
       ORDER BY rsl.created_at ASC`,
      {
        replacements: { requestId: Number(requestId) },
        type: QueryTypes.SELECT,
      }
    );

    const grouped = logs.reduce((acc: any[], log) => {
      let statusGroup = acc.find((g) => g.status === log.status);

      const messageData = {
        status_log_id: log.status_log_id,
        message: log.message,
        created_at: log.created_at,
        updated_at: log.updated_at,
        admin_name: log.admin_name,
        admin_id: log.admin_id,
      };

      if (!statusGroup) {
        acc.push({
          status: log.status,
          messages: [messageData],
        });
      } else {
        statusGroup.messages.push(messageData);
      }

      return acc;
    }, []);

    res.json({
      status: "success",
      data: grouped,
    });
  } catch (error) {
    console.error("GET GROUPED STATUS LOGS ERROR:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch status logs",
    });
  }
};



export const addStatusMessage = async (req: Request, res: Response) => {
  try {
    const { requestId } = req.params;
    const { status, message } = req.body;

    const adminId = getUserIdFromRequest(req);

    if (!adminId) {
      return res.status(401).json({
        status: "error",
        message: "Unauthorized",
      });
    }

    const validStatuses = ["pending", "processing", "releasing", "completed"];
    if (!status || !validStatuses.includes(status.toLowerCase())) {
      return res.status(400).json({
        status: "error",
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
    }

    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        status: "error",
        message: "Message is required",
      });
    }

    const requestExists = await sequelize.query(
      `SELECT request_id FROM document_requests WHERE request_id = :requestId`,
      {
        replacements: { requestId: Number(requestId) },
        type: QueryTypes.SELECT,
      }
    );

    if (requestExists.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Request not found",
      });
    }

    const log = await RequestStatusLog.create({
      request_id: Number(requestId),
      status: status.toLowerCase(),
      message: message.trim(),
      created_by: adminId,
    });

    const createdMessage = await sequelize.query(
      `SELECT 
          rsl.status_log_id,
          rsl.status,
          rsl.message,
          rsl.created_at,
          rsl.updated_at,
          CONCAT(ap.first_name, ' ', ap.last_name) AS admin_name,
          ap.admin_id
       FROM request_status_logs rsl
       INNER JOIN admin_profiles ap ON rsl.created_by = ap.admin_id
       WHERE rsl.status_log_id = :statusLogId`,
      {
        replacements: { statusLogId: log.status_log_id },
        type: QueryTypes.SELECT,
      }
    );

    await logActivity({
      userId: adminId,
      action: "ADD_REQUEST_STATUS_MESSAGE",
      tableName: "request_status_logs",
      recordId: log.status_log_id,
      newValue: {
        status: status.toLowerCase(),
        message: message.trim(),
      },
      req,
    });

    res.status(201).json({
      status: "success",
      message: "Message added successfully",
      data: createdMessage[0],
    });
  } catch (error) {
    console.error("ADD STATUS MESSAGE ERROR:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to add status message",
    });
  }
};


export const updateRequestStatus = async (req: Request, res: Response) => {
  try {
    const { requestId } = req.params;
    const { status, message } = req.body;

    const adminId = getUserIdFromRequest(req);

    if (!adminId) {
      return res.status(401).json({
        status: "error",
        message: "Unauthorized",
      });
    }

    const ALLOWED_STATUSES = [...STATUS_FLOW, "rejected"];

    if (!ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({
        status: "error",
        message: `Invalid status. Allowed: ${ALLOWED_STATUSES.join(", ")}`,
      });
    }

    const [request]: any = await sequelize.query(
      `
      SELECT request_status
      FROM document_requests
      WHERE request_id = :requestId
      `,
      {
        replacements: { requestId: Number(requestId) },
        type: QueryTypes.SELECT,
      }
    );

    if (!request) {
      return res.status(404).json({
        status: "error",
        message: "Request not found",
      });
    }

    const currentStatus = request.request_status;


    if (currentStatus === "rejected") {
      return res.status(400).json({
        status: "error",
        message: "Rejected requests can no longer be updated",
      });
    }


    if (currentStatus === "completed") {
      return res.status(400).json({
        status: "error",
        message: "Completed requests can no longer be updated",
      });
    }


    if (status === "rejected") {
      await sequelize.query(
        `
        UPDATE document_requests
        SET
          request_status = 'rejected',
          rejection_reason = :reason,
          rejected_by = :adminId,
          rejected_at = NOW()
        WHERE request_id = :requestId
        `,
        {
          replacements: {
            reason: message || null,
            adminId,
            requestId: Number(requestId),
          },
          type: QueryTypes.UPDATE,
        }
      );

      await RequestStatusLog.create({
        request_id: Number(requestId),
        status: "rejected",
        message: message?.trim() || "Request rejected",
        created_by: adminId,
      });

      await logActivity({
        userId: adminId,
        action: "REJECT_DOCUMENT_REQUEST",
        tableName: "document_requests",
        recordId: Number(requestId),
        newValue: {
          request_status: "rejected",
          rejection_reason: message || null,
        },
        req,
      });

      return res.json({
        status: "success",
        message: "Request has been rejected and permanently locked",
        data: {
          request_id: Number(requestId),
          previous_status: currentStatus,
          current_status: "rejected",
        },
      });
    }


    const currentIndex = STATUS_FLOW.indexOf(currentStatus);
    const nextIndex = STATUS_FLOW.indexOf(status);

    if (nextIndex !== currentIndex + 1) {
      return res.status(400).json({
        status: "error",
        message: `Invalid status transition. Current: ${currentStatus}`,
      });
    }

    await sequelize.query(
      `
      UPDATE document_requests
      SET request_status = :status, admin_id = :adminId
      WHERE request_id = :requestId
      `,
      {
        replacements: {
          status,
          adminId,
          requestId: Number(requestId),
        },
        type: QueryTypes.UPDATE,
      }
    );

    const statusLog = await RequestStatusLog.create({
      request_id: Number(requestId),
      status,
      message: message?.trim() || `Status updated to ${status}`,
      created_by: adminId,
    });

    await logActivity({
      userId: adminId,
      action: "UPDATE_REQUEST_STATUS",
      tableName: "document_requests",
      recordId: Number(requestId),
      newValue: {
        request_status: status,
      },
      req,
    });

    res.json({
      status: "success",
      message: `Request status updated to ${status}`,
      data: {
        request_id: Number(requestId),
        previous_status: currentStatus,
        current_status: status,
        status_log_id: statusLog.status_log_id,
      },
    });
  } catch (error) {
    console.error("UPDATE REQUEST STATUS ERROR:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to update request status",
    });
  }
};
