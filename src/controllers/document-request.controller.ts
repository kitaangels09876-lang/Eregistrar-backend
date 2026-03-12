import { Request, Response } from "express";
import { QueryTypes } from "sequelize";
import {
  sequelize,
  DocumentType,
  DocumentRequest,
  StudentProfile,
  Payment,
  PaymentMethod
} from "../models";
import { logActivity, getUserIdFromRequest } from "../utils/auditlog.service";



interface DocumentItem {
  document_type_id: number;
  quantity?: number;
}

interface CreatedRequestResponse {
  request_id: number;
  document_type_id: number;
  document_name: string;
  quantity: number;
  total_amount: number;
  status: string;
}

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: "Not paid yet",
  submitted: "Payment under review",
  verified: "Payment verified",
  rejected: "Payment rejected",
  refunded: "Payment refunded",
  paid: "Paid",
  cancelled: "Cancelled",
};


export const createDocumentRequest = async (req: Request, res: Response) => {
  const transaction = await sequelize.transaction();

  try {
    const {
      purpose,
      delivery_method,
      delivery_address,
      documents,
    }: {
      purpose: string;
      delivery_method: "pickup" | "delivery" | "email";
      delivery_address?: string;
      documents: {
        document_type_id: number;
        quantity?: number;
      }[];
    } = req.body;

    const userId = getUserIdFromRequest(req);

    if (!userId) {
      await transaction.rollback();
      return res.status(401).json({
        status: "error",
        message: "Unauthorized",
      });
    }

    if (!purpose || !delivery_method) {
      await transaction.rollback();
      return res.status(400).json({
        status: "error",
        message: "purpose and delivery_method are required",
      });
    }

    if (!Array.isArray(documents) || documents.length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        status: "error",
        message: "documents must be a non-empty array",
      });
    }

    if (
      delivery_method === "delivery" &&
      (!delivery_address || delivery_address.trim() === "")
    ) {
      await transaction.rollback();
      return res.status(400).json({
        status: "error",
        message:
          "delivery_address is required when delivery_method is delivery",
      });
    }

    const student = await StudentProfile.findOne({
      where: { user_id: userId },
      transaction,
    });

    if (!student) {
      await transaction.rollback();
      return res.status(404).json({
        status: "error",
        message: "Student profile not found",
      });
    }

    // =============================
    // DUPLICATE ACTIVE REQUEST CHECK
    // =============================
    for (const item of documents) {
      const existingRequest: any[] = await sequelize.query(
        `
        SELECT dr.request_id, dt.document_name, dr.request_status
        FROM document_requests dr
        JOIN document_types dt
          ON dt.document_type_id = dr.document_type_id
        WHERE dr.student_id = :student_id
          AND dr.document_type_id = :document_type_id
          AND dr.request_status IN ('pending','processing','releasing')
        LIMIT 1
        `,
        {
          replacements: {
            student_id: student.student_id,
            document_type_id: item.document_type_id,
          },
          type: QueryTypes.SELECT,
          transaction,
        }
      );

      if (existingRequest.length > 0) {
        await transaction.rollback();
        return res.status(409).json({
          status: "error",
          message: `You already have an active request for "${existingRequest[0].document_name}". Please wait until it is completed.`,
          data: {
            request_id: existingRequest[0].request_id,
            status: existingRequest[0].request_status,
          },
        });
      }
    }

    const [batchId]: any = await sequelize.query(
      `
      INSERT INTO payment_batches (student_id, total_amount, status)
      VALUES (:student_id, 0, 'pending')
      `,
      {
        replacements: { student_id: student.student_id },
        type: QueryTypes.INSERT,
        transaction,
      }
    );

    let grandTotal = 0;
    const createdRequests: any[] = [];

    for (const item of documents) {
      const qty = item.quantity && item.quantity > 0 ? item.quantity : 1;

      const documentType = await DocumentType.findOne({
        where: { document_type_id: item.document_type_id },
        transaction,
      });

      if (!documentType) {
        await transaction.rollback();
        return res.status(404).json({
          status: "error",
          message: "Invalid document type",
        });
      }

      const totalAmount = Number(documentType.base_price) * qty;

      const request = await DocumentRequest.create(
        {
          student_id: student.student_id,
          document_type_id: item.document_type_id,
          purpose,
          delivery_method,
          delivery_address:
            delivery_method === "delivery" ? delivery_address : null,
          quantity: qty,
          total_amount: totalAmount,
          request_status: "pending",
        },
        { transaction }
      );

      await sequelize.query(
        `
        INSERT INTO batch_requests (batch_id, request_id)
        VALUES (:batch_id, :request_id)
        `,
        {
          replacements: {
            batch_id: batchId,
            request_id: request.request_id,
          },
          transaction,
        }
      );

      createdRequests.push({
        request_id: request.request_id,
        document_type_id: item.document_type_id,
        document_name: documentType.document_name,
        quantity: qty,
        total_amount: totalAmount,
        status: request.request_status,
      });

      grandTotal += totalAmount;
    }

    await sequelize.query(
      `
      UPDATE payment_batches
      SET total_amount = :total_amount
      WHERE batch_id = :batch_id
      `,
      {
        replacements: {
          total_amount: grandTotal,
          batch_id: batchId,
        },
        transaction,
      }
    );

    await transaction.commit();

    return res.status(201).json({
      status: "success",
      message: "Document requests submitted successfully",
      data: {
        batch_id: batchId,
        total_requests: createdRequests.length,
        grand_total: grandTotal,
        requests: createdRequests,
      },
    });
  } catch (error) {
    await transaction.rollback();
    console.error("CREATE DOCUMENT REQUEST ERROR:", error);

    return res.status(500).json({
      status: "error",
      message: "Failed to create document request",
    });
  }
};






export const createPayment = async (req: Request, res: Response) => {
  const transaction = await sequelize.transaction();

  try {
    const { batch_id, method_id } = req.body;

    const userId = getUserIdFromRequest(req);
    const userRoles: string[] = (req as any).user?.roles || [];

    if (!userId) {
      await transaction.rollback();
      return res.status(401).json({
        status: "error",
        message: "Unauthorized",
      });
    }

    if (!batch_id || !method_id) {
      await transaction.rollback();
      return res.status(400).json({
        status: "error",
        message: "batch_id and method_id are required",
      });
    }


    const batch: any[] = await sequelize.query(
      `
      SELECT pb.batch_id, pb.student_id, pb.total_amount, pb.status
      FROM payment_batches pb
      WHERE pb.batch_id = :batch_id
      `,
      {
        replacements: { batch_id },
        type: QueryTypes.SELECT,
        transaction,
      }
    );

    if (!batch.length) {
      await transaction.rollback();
      return res.status(404).json({
        status: "error",
        message: "Payment batch not found",
      });
    }

    const batchData = batch[0];

    if (
      !userRoles.includes("admin") &&
      !userRoles.includes("registrar")
    ) {
      const student = await StudentProfile.findOne({
        where: { user_id: userId },
        transaction,
      });

      if (!student || student.student_id !== batchData.student_id) {
        await transaction.rollback();
        return res.status(403).json({
          status: "error",
          message: "You are not allowed to pay for this batch",
        });
      }
    }

    const batchRequests: any[] = await sequelize.query(
      `
      SELECT COUNT(*) AS total
      FROM batch_requests
      WHERE batch_id = :batch_id
      `,
      {
        replacements: { batch_id },
        type: QueryTypes.SELECT,
        transaction,
      }
    );

    if (batchRequests[0].total === 0) {
      await transaction.rollback();
      return res.status(400).json({
        status: "error",
        message: "This batch has no document requests",
      });
    }

    const existingPayment = await Payment.findOne({
      where: {
        batch_id,
        payment_status: ["pending", "submitted", "verified"],
      },
      transaction,
    });

    if (existingPayment) {
      await transaction.rollback();
      return res.status(409).json({
        status: "error",
        message: "A payment already exists for this batch",
        data: {
          payment_id: existingPayment.payment_id,
          payment_status: existingPayment.payment_status,
          display_status:
            PAYMENT_STATUS_LABELS[existingPayment.payment_status],
        },
      });
    }


    const method = await PaymentMethod.findOne({
      where: { method_id, is_active: true },
      transaction,
    });

    if (!method) {
      await transaction.rollback();
      return res.status(400).json({
        status: "error",
        message: "Invalid or inactive payment method",
      });
    }

    const isCash = method.method_name.toLowerCase() === "cash";

    if (
      isCash &&
      !userRoles.includes("admin") &&
      !userRoles.includes("registrar")
    ) {
      await transaction.rollback();
      return res.status(403).json({
        status: "error",
        message: "Cash payments must be processed by admin or registrar",
      });
    }

    const payment = await Payment.create(
      {
        batch_id,
        student_id: batchData.student_id,
        amount: batchData.total_amount,
        method_id,
        payment_status: isCash ? "verified" : "pending",
        verified_by: isCash ? userId : null,
        verified_at: isCash ? new Date() : null,
      },
      { transaction }
    );


    await sequelize.query(
      `
      INSERT INTO payment_logs
        (payment_id, old_status, new_status, changed_by, note)
      VALUES
        (:payment_id, NULL, :new_status, :changed_by, :note)
      `,
      {
        replacements: {
          payment_id: payment.payment_id,
          new_status: payment.payment_status,
          changed_by: isCash ? userId : null,
          note: isCash
            ? "Cash payment received and verified"
            : "Payment created (awaiting proof)",
        },
        type: QueryTypes.INSERT,
        transaction,
      }
    );

    await logActivity({
      userId,
      action: "CREATE_PAYMENT",
      tableName: "payments",
      recordId: payment.payment_id,
      newValue: {
        batch_id,
        method_id,
        payment_status: payment.payment_status,
      },
      req,
    });

    await transaction.commit();

    return res.status(201).json({
      status: "success",
      message: isCash
        ? "Cash payment recorded and verified"
        : "Payment created. Please upload proof.",
      data: {
        payment_id: payment.payment_id,
        batch_id,
        payment_status: payment.payment_status,
        display_status:
          PAYMENT_STATUS_LABELS[payment.payment_status],
        payment_method: {
          method_id: method.method_id,
          method_name: method.method_name,
          send_to: method.send_to,
          sender_name: method.sender_name,
        },
      },
    });
  } catch (error) {
    await transaction.rollback();
    console.error("CREATE PAYMENT ERROR:", error);

    return res.status(500).json({
      status: "error",
      message: "Failed to create payment",
    });
  }
};


export const uploadPaymentProof = async (req: Request, res: Response) => {
  const transaction = await sequelize.transaction();

  try {
    const { paymentId } = req.params;
    const userId = getUserIdFromRequest(req);

    if (!userId) {
      await transaction.rollback();
      return res.status(401).json({
        status: "error",
        message: "Unauthorized",
      });
    }

    if (!req.file) {
      await transaction.rollback();
      return res.status(400).json({
        status: "error",
        message: "Payment proof file is required",
      });
    }

    const payment = await Payment.findByPk(paymentId);

    if (!payment) {
      await transaction.rollback();
      return res.status(404).json({
        status: "error",
        message: "Payment not found",
      });
    }

    if (payment.payment_status !== "pending") {
      await transaction.rollback();
      return res.status(400).json({
        status: "error",
        message: "Payment proof can only be uploaded for pending payments",
      });
    }


    const publicPath = `/${req.file.path.replace(/\\/g, "/")}`;


    await payment.update(
      {
        payment_proof: publicPath,
        payment_status: "submitted",
      },
      { transaction }
    );

    await sequelize.query(
      `
      INSERT INTO payment_logs
        (payment_id, old_status, new_status, changed_by, note)
      VALUES
        (:payment_id, 'pending', 'submitted', NULL, 'Payment proof uploaded')
      `,
      {
        replacements: { payment_id: payment.payment_id },
        type: QueryTypes.INSERT,
        transaction,
      }
    );

    await logActivity({
      userId,
      action: "UPLOAD_PAYMENT_PROOF",
      tableName: "payments",
      recordId: payment.payment_id,
      newValue: {
        payment_status: "submitted",
        payment_proof: publicPath,
      },
      req,
    });

    const details: any[] = await sequelize.query(
      `
      SELECT
        p.payment_id,
        p.payment_status,
        p.amount,
        p.payment_proof,
        p.created_at,

        pm.method_id,
        pm.method_name,
        pm.send_to,
        pm.sender_name,

        pb.batch_id,
        pb.total_amount,
        pb.status AS batch_status
      FROM payments p
      JOIN payment_methods pm ON p.method_id = pm.method_id
      LEFT JOIN payment_batches pb ON p.batch_id = pb.batch_id
      WHERE p.payment_id = :payment_id
      `,
      {
        replacements: { payment_id: payment.payment_id },
        type: QueryTypes.SELECT,
        transaction,
      }
    );

    const info = details[0];

    await transaction.commit();

    return res.status(200).json({
      status: "success",
      message: "Payment proof uploaded successfully",
      data: {
        payment: {
          payment_id: info.payment_id,
          payment_status: info.payment_status,
          amount: info.amount,
          created_at: info.created_at,
          payment_proof: info.payment_proof,
          payment_method: {
            method_id: info.method_id,
            method_name: info.method_name,
            send_to: info.send_to,
            sender_name: info.sender_name,
          },
          batch: info.batch_id
            ? {
                batch_id: info.batch_id,
                total_amount: info.total_amount,
                status: info.batch_status,
              }
            : null,
        },
      },
    });
  } catch (error) {
    await transaction.rollback();
    console.error("UPLOAD PAYMENT PROOF ERROR:", error);

    return res.status(500).json({
      status: "error",
      message: "Failed to upload payment proof",
    });
  }
};


export const getStudentDocumentRequestsByBatch = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = getUserIdFromRequest(req);

    if (!userId) {
      return res.status(401).json({
        status: "error",
        message: "Unauthorized",
      });
    }

    const {
      page = "1",
      limit = "10",
      search,
      payment_status,
      batch_status,
      request_status,
    } = req.query as any;

    const pageNumber = Math.max(Number(page), 1);
    const pageSize = Math.max(Number(limit), 1);
    const offset = (pageNumber - 1) * pageSize;

    const student = await StudentProfile.findOne({
      where: { user_id: userId },
    });

    if (!student) {
      return res.status(404).json({
        status: "error",
        message: "Student profile not found",
      });
    }

    const batchFilters: string[] = [`pb.student_id = :student_id`];
    const replacements: any = {
      student_id: student.student_id,
      limit: pageSize,
      offset,
    };

    if (batch_status) {
      batchFilters.push(`pb.status = :batch_status`);
      replacements.batch_status = batch_status;
    }

    if (payment_status) {
      batchFilters.push(`
        EXISTS (
          SELECT 1 FROM payments px
          WHERE px.batch_id = pb.batch_id
          AND px.payment_status = :payment_status
        )
      `);
      replacements.payment_status = payment_status;
    }

    const whereBatchClause = batchFilters.join(" AND ");

    const batches: any[] = await sequelize.query(
      `
      SELECT
        pb.batch_id,
        pb.total_amount,
        pb.status AS batch_status,
        pb.created_at,

        p.payment_id,
        p.payment_status,
        p.payment_proof,
        p.amount AS payment_amount,
        p.created_at AS payment_created_at,
        pm.method_name AS payment_method

      FROM payment_batches pb

      LEFT JOIN payments p
        ON p.payment_id = (
          SELECT p2.payment_id
          FROM payments p2
          WHERE p2.batch_id = pb.batch_id
          ORDER BY p2.created_at DESC
          LIMIT 1
        )

      LEFT JOIN payment_methods pm
        ON pm.method_id = p.method_id

      WHERE ${whereBatchClause}
      ORDER BY pb.created_at DESC
      LIMIT :limit OFFSET :offset
      `,
      {
        replacements,
        type: QueryTypes.SELECT,
      }
    );

    const countResult: any = await sequelize.query(
      `
      SELECT COUNT(*) AS total
      FROM payment_batches pb
      WHERE ${whereBatchClause}
      `,
      { replacements, type: QueryTypes.SELECT }
    );

    for (const batch of batches) {
      const requestFilters: string[] = [`br.batch_id = :batch_id`];
      const requestReplacements: any = { batch_id: batch.batch_id };

      if (request_status) {
        requestFilters.push(`dr.request_status = :request_status`);
        requestReplacements.request_status = request_status;
      }

      if (search) {
        requestFilters.push(`
          (
            dt.document_name LIKE :search
            OR dr.purpose LIKE :search
          )
        `);
        requestReplacements.search = `%${search}%`;
      }

      const requests = await sequelize.query(
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
        WHERE ${requestFilters.join(" AND ")}
        ORDER BY dr.created_at ASC
        `,
        {
          replacements: requestReplacements,
          type: QueryTypes.SELECT,
        }
      );

      batch.payment = {
        payment_id: batch.payment_id ?? null,
        batch_status: batch.batch_status,
        payment_status: batch.payment_status ?? null,
        method: batch.payment_method ?? null,
        amount: batch.payment_amount ?? null,
        proof: batch.payment_proof ?? null,
        created_at: batch.payment_created_at ?? null,
      };

      delete batch.batch_status;
      delete batch.payment_id;
      delete batch.payment_status;
      delete batch.payment_method;
      delete batch.payment_amount;
      delete batch.payment_proof;
      delete batch.payment_created_at;

      batch.requests = requests;
    }

    return res.status(200).json({
      status: "success",
      data: {
        pagination: {
          page: pageNumber,
          limit: pageSize,
          total_batches: countResult[0].total,
        },
        batches: batches.filter(b => b.requests.length > 0),
      },
    });
  } catch (err) {
    console.error("GET STUDENT BATCHES ERROR:", err);
    return res.status(500).json({
      status: "error",
      message: "Failed to fetch batches",
    });
  }
};




export const trackBatchRequests = async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromRequest(req);
    const userRoles: string[] = (req as any).user?.roles || [];
    const { batch_id } = req.params;

    if (!userId) {
      return res.status(401).json({
        status: "error",
        message: "Unauthorized",
      });
    }

    let studentId: number | null = null;

    if (!userRoles.includes("admin") && !userRoles.includes("registrar")) {
      const student = await StudentProfile.findOne({
        where: { user_id: userId },
      });

      if (!student) {
        return res.status(404).json({
          status: "error",
          message: "Student profile not found",
        });
      }

      studentId = student.student_id;
    }

    const batch: any[] = await sequelize.query(
      `
      SELECT batch_id, student_id
      FROM payment_batches
      WHERE batch_id = :batch_id
      `,
      {
        replacements: { batch_id },
        type: QueryTypes.SELECT,
      }
    );

    if (!batch.length) {
      return res.status(404).json({
        status: "error",
        message: "Batch not found",
      });
    }

    if (studentId && batch[0].student_id !== studentId) {
      return res.status(403).json({
        status: "error",
        message: "Access denied to this batch",
      });
    }

    const requests = await sequelize.query(
      `
      SELECT
        dr.request_id,
        dr.request_status,
        dt.document_name,
        dr.created_at AS requested_at
      FROM batch_requests br
      JOIN document_requests dr ON dr.request_id = br.request_id
      JOIN document_types dt ON dt.document_type_id = dr.document_type_id
      WHERE br.batch_id = :batch_id
      ORDER BY dr.created_at ASC
      `,
      {
        replacements: { batch_id },
        type: QueryTypes.SELECT,
      }
    );

    for (const request of requests as any[]) {
      const logs = await sequelize.query(
        `
        SELECT
          rsl.status,
          rsl.message,
          rsl.created_at,
          CONCAT(ap.first_name, ' ', ap.last_name) AS updated_by
        FROM request_status_logs rsl
        LEFT JOIN admin_profiles ap
          ON ap.admin_id = rsl.created_by
        WHERE rsl.request_id = :request_id
        ORDER BY rsl.created_at DESC
        `,
        {
          replacements: { request_id: request.request_id },
          type: QueryTypes.SELECT,
        }
      );

      request.timeline = logs;
    }

    return res.status(200).json({
      status: "success",
      data: {
        batch_id: Number(batch_id),
        requests,
      },
    });
  } catch (error) {
    console.error("TRACK BATCH REQUEST ERROR:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to fetch request timeline",
    });
  }
};