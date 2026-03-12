import { Request, Response } from "express";
import { sequelize,Payment } from "../models";
import { QueryTypes } from "sequelize";
import { logActivity, getUserIdFromRequest } from "../utils/auditlog.service";

export const getAllPayments = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const { payment_status, request_status, search } = req.query;

    let whereClause = "WHERE 1=1";
    const replacements: any = { limit, offset };

    if (payment_status) {
      whereClause += " AND p.payment_status = :payment_status";
      replacements.payment_status = payment_status;
    }

    if (request_status) {
      whereClause += " AND dr.request_status = :request_status";
      replacements.request_status = request_status;
    }

    if (search) {
      whereClause += `
        AND (
          sp.first_name LIKE :search
          OR sp.middle_name LIKE :search
          OR sp.last_name LIKE :search
        )
      `;
      replacements.search = `%${search}%`;
    }

    const [countResult]: any = await sequelize.query(
      `
      SELECT COUNT(DISTINCT p.payment_id) AS total
      FROM payments p
      INNER JOIN student_profiles sp ON p.student_id = sp.student_id
      LEFT JOIN document_requests dr ON p.request_id = dr.request_id
      ${whereClause}
      `,
      {
        replacements,
        type: QueryTypes.SELECT
      }
    );

    const totalRecords = countResult.total;
    const totalPages = Math.ceil(totalRecords / limit);

const payments = await sequelize.query(
  `
  SELECT
    p.payment_id,
    p.student_id,
    CONCAT(
      sp.first_name, ' ',
      IFNULL(sp.middle_name, ''), ' ',
      sp.last_name
    ) AS student_name,

    p.amount,
    pm.method_name,
    p.payment_status,
    IFNULL(p.payment_proof, 'NO RECEIPT') AS payment_proof,

    COALESCE(dr.total_amount, pb.total_amount) AS total_amount,

    MAX(dr.request_status) AS request_status,

    GROUP_CONCAT(DISTINCT dt.document_name SEPARATOR ', ') AS requested_documents,

    p.created_at
  FROM payments p
  INNER JOIN student_profiles sp ON p.student_id = sp.student_id
  INNER JOIN payment_methods pm ON p.method_id = pm.method_id

  -- 🔑 batch support
  LEFT JOIN payment_batches pb ON p.batch_id = pb.batch_id
  LEFT JOIN batch_requests br ON pb.batch_id = br.batch_id

  -- 🔑 request resolution (single OR batch)
  LEFT JOIN document_requests dr 
    ON dr.request_id = COALESCE(p.request_id, br.request_id)

  LEFT JOIN document_types dt ON dr.document_type_id = dt.document_type_id

  ${whereClause}
  GROUP BY p.payment_id
  ORDER BY p.created_at DESC
  LIMIT :limit OFFSET :offset
  `,
  {
    replacements,
    type: QueryTypes.SELECT
  }
);


    return res.json({
      status: "success",
      pagination: {
        totalRecords,
        totalPages,
        currentPage: page,
        limit
      },
      data: payments
    });
  } catch (error) {
    console.error("GET ALL PAYMENTS ERROR:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to fetch payments"
    });
  }
};



export const getPaymentById = async (req: Request, res: Response) => {
  try {
    const { paymentId } = req.params;

    const paymentResult: any[] = await sequelize.query(
      `
      SELECT
        p.payment_id,
        p.batch_id,
        p.request_id,
        p.student_id,

        CONCAT(
          sp.first_name, ' ',
          IFNULL(sp.middle_name, ''), ' ',
          sp.last_name
        ) AS student_name,

        p.amount,
        p.payment_status,
        p.payment_proof,
        p.created_at,

        pb.total_amount AS batch_total_amount,
        pb.status AS batch_status

      FROM payments p
      JOIN student_profiles sp ON sp.student_id = p.student_id
      LEFT JOIN payment_batches pb ON pb.batch_id = p.batch_id

      WHERE p.payment_id = :paymentId
      LIMIT 1
      `,
      {
        replacements: { paymentId: Number(paymentId) },
        type: QueryTypes.SELECT,
      }
    );

    if (!paymentResult || paymentResult.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Payment not found",
      });
    }

    const payment = paymentResult[0];
    let requests: any[] = [];

    if (payment.batch_id) {
      requests = await sequelize.query(
        `
        SELECT
          dr.request_id,
          dt.document_name,
          dr.purpose,
          dr.quantity,
          dr.total_amount,
          dr.delivery_method,
          dr.request_status,
          dr.created_at
        FROM batch_requests br
        JOIN document_requests dr ON dr.request_id = br.request_id
        JOIN document_types dt ON dt.document_type_id = dr.document_type_id
        WHERE br.batch_id = :batch_id
        ORDER BY dr.created_at ASC
        `,
        {
          replacements: { batch_id: payment.batch_id },
          type: QueryTypes.SELECT,
        }
      );
    }

    else if (payment.request_id) {
      requests = await sequelize.query(
        `
        SELECT
          dr.request_id,
          dt.document_name,
          dr.purpose,
          dr.quantity,
          dr.total_amount,
          dr.delivery_method,
          dr.request_status,
          dr.created_at
        FROM document_requests dr
        JOIN document_types dt ON dt.document_type_id = dr.document_type_id
        WHERE dr.request_id = :request_id
        `,
        {
          replacements: { request_id: payment.request_id },
          type: QueryTypes.SELECT,
        }
      );
    }

    return res.status(200).json({
      status: "success",
      data: {
        payment_id: payment.payment_id,
        student_id: payment.student_id,
        student_name: payment.student_name,

        payment_status: payment.payment_status,
        payment_proof: payment.payment_proof ?? null,
        amount_paid: payment.amount,
        created_at: payment.created_at,

        batch: payment.batch_id
          ? {
              batch_id: payment.batch_id,
              batch_status: payment.batch_status,
              batch_total_amount: payment.batch_total_amount,
              requests,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("GET PAYMENT BY ID ERROR:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to fetch payment",
    });
  }
};



export const verifyOrRejectPayment = async (req: Request, res: Response) => {
  const transaction = await sequelize.transaction();

  try {
    const { paymentId } = req.params;
    const { action, reason } = req.body;

    const userId = getUserIdFromRequest(req);
    const userRoles: string[] = (req as any).user?.roles || [];

    if (!userId) {
      await transaction.rollback();
      return res.status(401).json({ status: "error", message: "Unauthorized" });
    }

    if (!userRoles.includes("admin") && !userRoles.includes("registrar")) {
      await transaction.rollback();
      return res.status(403).json({
        status: "error",
        message: "Only admin or registrar can verify payments",
      });
    }

    if (!["verify", "reject"].includes(action)) {
      await transaction.rollback();
      return res.status(400).json({
        status: "error",
        message: "action must be 'verify' or 'reject'",
      });
    }

    if (action === "reject" && (!reason || reason.trim() === "")) {
      await transaction.rollback();
      return res.status(400).json({
        status: "error",
        message: "Rejection reason is required",
      });
    }

    const payment = await Payment.findByPk(paymentId, { transaction });

    if (!payment) {
      await transaction.rollback();
      return res.status(404).json({ status: "error", message: "Payment not found" });
    }

    if (payment.payment_status !== "submitted") {
      await transaction.rollback();
      return res.status(400).json({
        status: "error",
        message: "Only submitted payments can be verified or rejected",
      });
    }

    const oldStatus = payment.payment_status;
    const newStatus = action === "verify" ? "verified" : "rejected";

    await payment.update(
      {
        payment_status: newStatus,
        verified_by: userId,
        verified_at: new Date(),
      },
      { transaction }
    );

    if (newStatus === "verified" && payment.batch_id) {
      await sequelize.query(
        `
        UPDATE payment_batches
        SET status = 'paid'
        WHERE batch_id = :batch_id
        `,
        { replacements: { batch_id: payment.batch_id }, transaction }
      );
    }

    if (newStatus === "rejected" && payment.batch_id) {
      await sequelize.query(
        `
        UPDATE document_requests dr
        JOIN batch_requests br ON br.request_id = dr.request_id
        SET
          dr.request_status = 'rejected',
          dr.rejection_reason = :reason,
          dr.rejected_by = :admin_id,
          dr.rejected_at = NOW()
        WHERE br.batch_id = :batch_id
          AND dr.request_status <> 'rejected'
        `,
        {
          replacements: {
            batch_id: payment.batch_id,
            reason,
            admin_id: userId,
          },
          transaction,
        }
      );

      await sequelize.query(
        `
        INSERT INTO request_status_logs (request_id, status, message, created_by)
        SELECT
          dr.request_id,
          'rejected',
          CONCAT('Rejected due to payment rejection: ', :reason),
          :admin_id
        FROM document_requests dr
        JOIN batch_requests br ON br.request_id = dr.request_id
        WHERE br.batch_id = :batch_id
        `,
        {
          replacements: {
            batch_id: payment.batch_id,
            reason,
            admin_id: userId,
          },
          transaction,
        }
      );
    }

    await sequelize.query(
      `
      INSERT INTO payment_logs
        (payment_id, old_status, new_status, changed_by, note)
      VALUES
        (:payment_id, :old_status, :new_status, :changed_by, :note)
      `,
      {
        replacements: {
          payment_id: payment.payment_id,
          old_status: oldStatus,
          new_status: newStatus,
          changed_by: userId,
          note:
            action === "verify"
              ? "Payment verified by admin"
              : `Payment rejected: ${reason}`,
        },
        type: QueryTypes.INSERT,
        transaction,
      }
    );

    await logActivity({
      userId,
      action: action === "verify" ? "VERIFY_PAYMENT" : "REJECT_PAYMENT",
      tableName: "payments",
      recordId: payment.payment_id,
      oldValue: { payment_status: oldStatus },
      newValue: { payment_status: newStatus },
      req,
    });

    await transaction.commit();

    return res.status(200).json({
      status: "success",
      message:
        action === "verify"
          ? "Payment verified successfully"
          : "Payment and all related documents were rejected",
      data: {
        payment_id: payment.payment_id,
        payment_status: newStatus,
        verified_by: userId,
        verified_at: payment.verified_at,
        reason: action === "reject" ? reason : null,
      },
    });
  } catch (error) {
    await transaction.rollback();
    console.error("VERIFY / REJECT PAYMENT ERROR:", error);

    return res.status(500).json({
      status: "error",
      message: "Failed to process payment verification",
    });
  }
};



export const checkBatchPaymentStatus = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = getUserIdFromRequest(req);
    const batchId = Number(req.params.batchId);

    if (!userId) {
      return res.status(401).json({
        status: "error",
        code: "UNAUTHORIZED",
        message: "Authentication required",
      });
    }

    if (!batchId || Number.isNaN(batchId)) {
      return res.status(400).json({
        status: "error",
        code: "INVALID_BATCH_ID",
        message: "Valid batch ID is required",
      });
    }

    const batch = await sequelize.query(
      `
      SELECT batch_id, student_id, status, total_amount
      FROM payment_batches
      WHERE batch_id = ?
      LIMIT 1
      `,
      {
        replacements: [batchId],
        type: QueryTypes.SELECT,
      }
    );

    if (!batch.length) {
      return res.status(404).json({
        status: "error",
        code: "BATCH_NOT_FOUND",
        message: "Payment batch does not exist",
      });
    }


    const payment = await sequelize.query(
      `
      SELECT 
        payment_id,
        amount,
        payment_status,
        payment_proof,
        method_id,
        created_at
      FROM payments
      WHERE batch_id = ?
      ORDER BY created_at DESC
      LIMIT 1
      `,
      {
        replacements: [batchId],
        type: QueryTypes.SELECT,
      }
    );

    if (!payment.length) {
      return res.status(200).json({
        status: "success",
        hasPayment: false,
        canUpload: true,
        data: {
          batch_id: batchId,
          batch_status: (batch as any)[0].status,
          total_amount: (batch as any)[0].total_amount,
        },
      });
    }

    const currentPayment: any = payment[0];

    const blockedStatuses = ["submitted", "verified"];
    const canUpload = !blockedStatuses.includes(
      currentPayment.payment_status
    );

    return res.status(200).json({
      status: "success",
      hasPayment: true,
      canUpload,
      data: {
        batch_id: batchId,
        payment_id: currentPayment.payment_id,
        amount: currentPayment.amount,
        payment_status: currentPayment.payment_status,
        payment_proof: currentPayment.payment_proof,
        created_at: currentPayment.created_at,
      },
    });

  } catch (error: any) {
    console.error("CHECK BATCH PAYMENT STATUS ERROR:", error);

    return res.status(500).json({
      status: "error",
      code: "INTERNAL_SERVER_ERROR",
      message: "Unable to check batch payment status",
    });
  }
};
