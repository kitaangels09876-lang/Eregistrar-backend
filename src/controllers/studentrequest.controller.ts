import { Request, Response } from "express";
import { sequelize } from "../models";
import { QueryTypes } from "sequelize";
import { getUserIdFromRequest, logActivity } from "../utils/auditlog.service";
import {
  createNotification,
  getStudentBatchNotificationContext,
} from "../services/notification.service";

export const getAllStudentRequests = async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      search,
      startDate,
      endDate,
      deliveryMethod,
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);
    const userId = getUserIdFromRequest(req);

    const whereConditions: string[] = [];
    const replacements: any = {
      limit: Number(limit),
      offset,
    };

    if (status) {
      whereConditions.push("dr.request_status = :status");
      replacements.status = status;
    }

    if (deliveryMethod) {
      whereConditions.push("dr.delivery_method = :deliveryMethod");
      replacements.deliveryMethod = deliveryMethod;
    }

    if (search) {
      whereConditions.push(`(
        sp.student_number LIKE :search OR
        CONCAT(sp.first_name, ' ', sp.last_name) LIKE :search OR
        dt.document_name LIKE :search
      )`);
      replacements.search = `%${search}%`;
    }

    if (startDate) {
      whereConditions.push("dr.created_at >= :startDate");
      replacements.startDate = new Date(startDate as string);
    }

    if (endDate) {
      whereConditions.push("dr.created_at <= :endDate");
      replacements.endDate = new Date(endDate as string);
    }
    whereConditions.push(`
      EXISTS (
        SELECT 1
        FROM payments p2
        WHERE p2.batch_id = pb.batch_id
          AND p2.payment_status = 'verified'
      )
    `);

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";

    const requests = await sequelize.query<any>(
      `
      SELECT
        dr.request_id,
        dr.student_id,
        sp.student_number,
        CONCAT(
          sp.first_name, ' ',
          COALESCE(CONCAT(sp.middle_name, ' '), ''),
          sp.last_name,
          COALESCE(CONCAT(' ', sp.extension_name), '')
        ) AS full_name,
        u.email,

        dt.document_name,
        dr.purpose,
        dr.quantity,
        dr.delivery_method,
        dr.total_amount,
        dr.request_status,

        pb.batch_id,
        pb.status AS batch_status,
        pb.total_amount AS batch_total,

        p.payment_status,
        p.payment_id,
        p.payment_proof,

        dr.created_at,
        dr.updated_at

      FROM document_requests dr
      INNER JOIN student_profiles sp ON dr.student_id = sp.student_id
      INNER JOIN users u ON sp.user_id = u.user_id
      INNER JOIN document_types dt ON dr.document_type_id = dt.document_type_id

      LEFT JOIN batch_requests br ON dr.request_id = br.request_id
      LEFT JOIN payment_batches pb ON br.batch_id = pb.batch_id
      LEFT JOIN payments p ON pb.batch_id = p.batch_id

      ${whereClause}
      ORDER BY dr.created_at DESC
      LIMIT :limit OFFSET :offset
      `,
      {
        replacements,
        type: QueryTypes.SELECT,
      },
    );

    const countResult = await sequelize.query<{ total: number }>(
      `
      SELECT COUNT(DISTINCT dr.request_id) AS total
      FROM document_requests dr
      INNER JOIN student_profiles sp ON dr.student_id = sp.student_id
      INNER JOIN users u ON sp.user_id = u.user_id
      INNER JOIN document_types dt ON dr.document_type_id = dt.document_type_id
      LEFT JOIN batch_requests br ON dr.request_id = br.request_id
      LEFT JOIN payment_batches pb ON br.batch_id = pb.batch_id
      ${whereClause}
      `,
      {
        replacements,
        type: QueryTypes.SELECT,
      },
    );

    const total = countResult[0]?.total || 0;

    const batchIds = [
      ...new Set(requests.map((r) => r.batch_id).filter(Boolean)),
    ];

    let batchDocuments: Record<number, string> = {};

    if (batchIds.length > 0) {
      const docs = await sequelize.query<any>(
        `
        SELECT
          br.batch_id,
          GROUP_CONCAT(
            CONCAT(dt.document_name, ' (', dr.quantity, ')')
            SEPARATOR ', '
          ) AS documents
        FROM batch_requests br
        INNER JOIN document_requests dr ON br.request_id = dr.request_id
        INNER JOIN document_types dt ON dr.document_type_id = dt.document_type_id
        WHERE br.batch_id IN (:batchIds)
        GROUP BY br.batch_id
        `,
        {
          replacements: { batchIds },
          type: QueryTypes.SELECT,
        },
      );

      docs.forEach((d) => {
        batchDocuments[d.batch_id] = d.documents;
      });
    }

    const formattedRequests = requests.map((r) => ({
      request_id: r.request_id,
      batch_id: r.batch_id,
      student: {
        student_id: r.student_id,
        student_number: r.student_number,
        full_name: r.full_name,
        email: r.email,
      },
      document_requested: r.document_name,
      all_documents_requested:
        r.batch_id && batchDocuments[r.batch_id]
          ? batchDocuments[r.batch_id]
          : r.document_name,

      purpose: r.purpose,
      quantity: r.quantity,
      delivery_method: r.delivery_method,

      amount: {
        request_total: r.total_amount,
        batch_total: r.batch_total || r.total_amount,
      },

      status: r.request_status,
      payment_id: r.payment_id,
      payment_status: r.payment_status,
      batch_status: r.batch_status,

      payment_proof: r.payment_proof,

      dates: {
        created_at: r.created_at,
        updated_at: r.updated_at,
      },
    }));

    return res.status(200).json({
      status: "success",
      data: {
        requests: formattedRequests,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    console.error("GET STUDENT REQUESTS ERROR:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to fetch student requests",
    });
  }
};

export const getStudentRequestById = async (req: Request, res: Response) => {
  try {
    const { requestId } = req.params;
    const userId = getUserIdFromRequest(req);

    const request = await sequelize.query<any>(
      `
      SELECT
        dr.request_id,
        dr.student_id,
        dr.document_type_id,
        dr.purpose,
        dr.quantity,
        dr.delivery_method,
        dr.delivery_address,
        dr.total_amount,
        dr.request_status,
        dr.rejection_reason,
        dr.created_at,
        dr.updated_at,

        sp.student_number,
        CONCAT(
          sp.first_name, ' ',
          COALESCE(CONCAT(sp.middle_name, ' '), ''),
          sp.last_name,
          COALESCE(CONCAT(' ', sp.extension_name), '')
        ) AS student_full_name,
        sp.contact_number AS student_contact,
        u.email AS student_email,

        dt.document_name,
        dt.base_price,
        dt.requirements,
        dt.estimated_processing_days,

        br.batch_id,
        pb.status AS batch_status,
        pb.total_amount AS batch_total_amount,

        COALESCE(p.payment_status, 'pending') AS payment_status,
        p.amount AS payment_amount,
        p.payment_proof,
        p.verified_at,

        pm.method_name AS payment_method,

        CONCAT(ap.first_name, ' ', ap.last_name) AS processed_by

      FROM document_requests dr
      INNER JOIN student_profiles sp ON dr.student_id = sp.student_id
      INNER JOIN users u ON sp.user_id = u.user_id
      INNER JOIN document_types dt ON dr.document_type_id = dt.document_type_id

      LEFT JOIN batch_requests br ON dr.request_id = br.request_id
      LEFT JOIN payment_batches pb ON br.batch_id = pb.batch_id
      LEFT JOIN payments p ON pb.batch_id = p.batch_id
      LEFT JOIN payment_methods pm ON p.method_id = pm.method_id
      LEFT JOIN admin_profiles ap ON dr.admin_id = ap.admin_id

      WHERE dr.request_id = :requestId
      LIMIT 1
      `,
      {
        replacements: { requestId },
        type: QueryTypes.SELECT,
      },
    );

    if (!request || request.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Request not found",
      });
    }

    await logActivity({
      userId,
      action: "VIEW_STUDENT_REQUEST_DETAILS",
      tableName: "document_requests",
      recordId: Number(requestId),
      req,
    });

    return res.status(200).json({
      status: "success",
      data: request[0],
    });
  } catch (error) {
    console.error("GET REQUEST BY ID ERROR:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to fetch request details",
    });
  }
};

export const getRequestStatistics = async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromRequest(req);

    const stats = await sequelize.query<any>(
      `SELECT 
        COUNT(*) as total_requests,
        COUNT(DISTINCT dr.student_id) as total_students,
        SUM(CASE WHEN dr.request_status = 'pending_payment' THEN 1 ELSE 0 END) as pending_payment,
        SUM(CASE WHEN dr.request_status = 'pending_verification' THEN 1 ELSE 0 END) as pending_verification,
        SUM(CASE WHEN dr.request_status = 'processing' THEN 1 ELSE 0 END) as processing,
        SUM(CASE WHEN dr.request_status = 'for_release' THEN 1 ELSE 0 END) as for_release,
        SUM(CASE WHEN dr.request_status = 'ready_for_pickup' THEN 1 ELSE 0 END) as ready_for_pickup,
        SUM(CASE WHEN dr.request_status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN dr.request_status = 'rejected' THEN 1 ELSE 0 END) as rejected,
        SUM(CASE WHEN p.payment_status = 'pending' THEN 1 ELSE 0 END) as payment_pending,
        SUM(CASE WHEN p.payment_status = 'submitted' THEN 1 ELSE 0 END) as payment_submitted,
        SUM(CASE WHEN p.payment_status = 'verified' THEN 1 ELSE 0 END) as payment_verified,
        SUM(CASE WHEN p.payment_status = 'rejected' THEN 1 ELSE 0 END) as payment_rejected,
        SUM(dr.total_amount) as total_revenue
       FROM document_requests dr
       LEFT JOIN payments p ON dr.request_id = p.request_id`,
      { type: QueryTypes.SELECT },
    );

    await logActivity({
      userId,
      action: "VIEW_REQUEST_STATISTICS",
      tableName: "document_requests",
      req,
    });

    return res.status(200).json({
      status: "success",
      data: stats[0],
    });
  } catch (error) {
    console.error("GET STATISTICS ERROR:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to fetch statistics",
    });
  }
};

export const getStudentRequestsByStudentId = async (
  req: Request,
  res: Response,
) => {
  try {
    const { studentId } = req.params;

    const requests = await sequelize.query<any>(
      `
      SELECT
        dr.request_id,
        dr.student_id,
        dr.purpose,
        dr.delivery_method,
        dr.quantity,
        dr.total_amount,
        dr.request_status,
        dr.created_at,

        dt.document_name,
        dt.base_price,
        dt.estimated_processing_days,

        sp.student_number,
        CONCAT(
          sp.first_name, ' ',
          COALESCE(CONCAT(sp.middle_name, ' '), ''),
          sp.last_name
        ) AS student_name,

        br.batch_id,
        pb.status AS batch_status,
        COALESCE(p.payment_status, 'pending') AS payment_status

      FROM document_requests dr
      INNER JOIN document_types dt
        ON dr.document_type_id = dt.document_type_id
      INNER JOIN student_profiles sp
        ON dr.student_id = sp.student_id

      LEFT JOIN batch_requests br
        ON dr.request_id = br.request_id
      LEFT JOIN payment_batches pb
        ON br.batch_id = pb.batch_id
      LEFT JOIN payments p
        ON pb.batch_id = p.batch_id

      WHERE dr.student_id = :studentId
      ORDER BY dr.created_at DESC
      `,
      {
        replacements: { studentId },
        type: QueryTypes.SELECT,
      },
    );

    return res.status(200).json({
      status: "success",
      total: requests.length,
      data: requests.map((r) => ({
        request_id: r.request_id,
        batch_id: r.batch_id,
        student_id: r.student_id,
        student_number: r.student_number,
        student_name: r.student_name,

        document_name: r.document_name,
        purpose: r.purpose,
        quantity: r.quantity,
        delivery_method: r.delivery_method,

        amount: r.total_amount,
        status: r.request_status,

        batch_status: r.batch_status,
        payment_status: r.payment_status,

        created_at: r.created_at,
      })),
    });
  } catch (err: any) {
    console.error("GET STUDENT REQUESTS ERROR:", err);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

export const getStudentRequestTracking = async (
  req: Request,
  res: Response,
) => {
  try {
    const { requestId } = req.params;
    const authUser = (req as any).user;

    const requestResult: any[] = await sequelize.query(
      `
      SELECT
        dr.request_id,
        dr.student_id,
        dr.request_status,
        dr.created_at,

        dt.document_name,
        dt.estimated_processing_days,

        sp.user_id,
        sp.student_number,
        CONCAT(sp.first_name, ' ', sp.last_name) AS student_name
      FROM document_requests dr
      JOIN document_types dt
        ON dr.document_type_id = dt.document_type_id
      JOIN student_profiles sp
        ON dr.student_id = sp.student_id
      WHERE dr.request_id = ?
      `,
      {
        replacements: [requestId],
        type: QueryTypes.SELECT,
      },
    );

    if (!requestResult.length) {
      return res.status(404).json({
        status: "error",
        message: "Document request not found",
      });
    }

    const request = requestResult[0];
    if (
      authUser.account_type === "student" &&
      authUser.user_id !== request.user_id
    ) {
      return res.status(403).json({
        status: "error",
        message: "Access denied to this document request",
      });
    }

    const trackingLogs = await sequelize.query(
      `
      SELECT
        rsl.status,
        rsl.message,
        rsl.created_at,
        CONCAT(ap.first_name, ' ', ap.last_name) AS updated_by
      FROM request_status_logs rsl
      LEFT JOIN admin_profiles ap
        ON rsl.created_by = ap.admin_id
      WHERE rsl.request_id = ?
      ORDER BY rsl.created_at ASC
      `,
      {
        replacements: [requestId],
        type: QueryTypes.SELECT,
      },
    );

    return res.status(200).json({
      status: "success",
      message: "Document request tracking retrieved successfully",
      data: {
        request: {
          request_id: request.request_id,
          student_id: request.student_id,
          student_number: request.student_number,
          student_name: request.student_name,
          document_name: request.document_name,
          current_status: request.request_status,
          estimated_processing_days: request.estimated_processing_days,
          created_at: request.created_at,
        },
        timeline: trackingLogs,
      },
    });
  } catch (error: any) {
    console.error("GET DOCUMENT TRACKING ERROR:", error);

    return res.status(500).json({
      status: "error",
      message: "Failed to retrieve document tracking information",
    });
  }
};

export const cancelBatchRequest = async (req: Request, res: Response) => {
  const transaction = await sequelize.transaction();

  try {
    const batchId = Number(req.params.batchId);
    const { cancel_reason } = req.body;
    const user = (req as any).user;

    if (!cancel_reason || !cancel_reason.trim()) {
      await transaction.rollback();
      return res.status(400).json({
        status: 'error',
        message: 'Cancel reason is required'
      });
    }

    const batch: any[] = await sequelize.query(
      `SELECT * FROM payment_batches WHERE batch_id = ? FOR UPDATE`,
      { replacements: [batchId], type: QueryTypes.SELECT, transaction }
    );

    if (!batch.length) {
      await transaction.rollback();
      return res.status(404).json({
        status: 'error',
        message: 'Batch not found'
      });
    }

    if (batch[0].status !== 'pending') {
      await transaction.rollback();
      return res.status(400).json({
        status: 'error',
        message: 'Only pending batches can be cancelled'
      });
    }

    const receipt: any[] = await sequelize.query(
      `SELECT receipt_id FROM receipts WHERE batch_id = ?`,
      { replacements: [batchId], type: QueryTypes.SELECT, transaction }
    );

    if (receipt.length > 0) {
      await transaction.rollback();
      return res.status(409).json({
        status: 'error',
        message: 'Batch cannot be cancelled because a receipt already exists'
      });
    }

    const completed: any[] = await sequelize.query(
      `SELECT 1
       FROM batch_requests br
       JOIN document_requests dr ON dr.request_id = br.request_id
       WHERE br.batch_id = ?
       AND dr.request_status = 'completed'
       LIMIT 1`,
      { replacements: [batchId], type: QueryTypes.SELECT, transaction }
    );

    if (completed.length > 0) {
      await transaction.rollback();
      return res.status(409).json({
        status: 'error',
        message: 'Cannot cancel batch with completed requests'
      });
    }

    if (
      user.account_type === 'student' &&
      batch[0].student_id !== user.student_id
    ) {
      await transaction.rollback();
      return res.status(403).json({
        status: 'error',
        message: 'Unauthorized to cancel this batch'
      });
    }

    await sequelize.query(
      `UPDATE payment_batches
       SET status = 'cancelled'
       WHERE batch_id = ?`,
      { replacements: [batchId], transaction }
    );

    const requests: any[] = await sequelize.query(
      `SELECT dr.request_id
       FROM batch_requests br
       JOIN document_requests dr ON dr.request_id = br.request_id
       WHERE br.batch_id = ?
       AND dr.request_status IN ('pending','processing','releasing')`,
      { replacements: [batchId], type: QueryTypes.SELECT, transaction }
    );

    for (const r of requests) {
      await sequelize.query(
        `UPDATE document_requests
         SET request_status = 'rejected',
             rejection_reason = ?,
             rejected_by = ?,
             rejected_at = NOW()
         WHERE request_id = ?`,
        {
          replacements: [
            cancel_reason,
            user.account_type !== 'student' ? user.admin_id : null,
            r.request_id
          ],
          transaction
        }
      );

      await sequelize.query(
        `INSERT INTO request_status_logs
         (request_id, status, message, created_by)
         VALUES (?, 'rejected', ?, ?)`,
        {
          replacements: [
            r.request_id,
            `Batch cancelled: ${cancel_reason}`,
            user.account_type !== 'student' ? user.admin_id : null
          ],
          transaction
        }
      );
    }

    const batchNotificationContext = await getStudentBatchNotificationContext(
      batchId,
      transaction
    );

    if (batchNotificationContext) {
      await createNotification({
        userId: batchNotificationContext.studentUserId,
        title: "Batch cancelled",
        message: `Your batch for ${batchNotificationContext.documentNames} has been cancelled. Reason: ${cancel_reason}`,
        type: "request_update",
        status: "cancelled",
        transaction,
      });
    }

    await sequelize.query(
      `INSERT INTO audit_logs
       (user_id, action, table_name, record_id, new_value)
       VALUES (?, 'CANCEL_BATCH', 'payment_batches', ?, ?)`,
      {
        replacements: [
          user.user_id,
          batchId,
          JSON.stringify({ cancel_reason })
        ],
        transaction
      }
    );

    await transaction.commit();

    return res.status(200).json({
      status: 'success',
      message: 'Batch cancelled successfully'
    });

  } catch (error: any) {
    await transaction.rollback();
    console.error('CANCEL BATCH ERROR:', error);

    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};
