import { Request, Response } from "express";
import { sequelize } from "../models";
import { QueryTypes } from "sequelize";
import moment from "moment-timezone";
import { generateReceiptPDF } from "../utils/receiptPdf.service";
import { getUserIdFromRequest } from "../utils/auditlog.service";
import { generateReceiptForBatch } from '../services/receipt.service';

export const generateReceipt = async (req: Request, res: Response) => {
  try {
    const batchId = Number(req.params.batchId);
    const issuedBy = (req as any).user.user_id;
    const userRoles: string[] = (req as any).user?.roles || [];

    if (!Number.isInteger(batchId) || batchId <= 0) {
      return res.status(400).json({
        status: "error",
        message: "Invalid batch ID",
      });
    }

    const [batch]: any = await sequelize.query(
      `
      SELECT 
        pb.batch_id,
        pb.student_id,
        sp.user_id AS student_user_id
      FROM payment_batches pb
      JOIN student_profiles sp ON pb.student_id = sp.student_id
      WHERE pb.batch_id = ?
      `,
      {
        replacements: [batchId],
        type: QueryTypes.SELECT
      }
    );

    if (!batch) {
      return res.status(404).json({
        status: "error",
        message: "Batch not found",
      });
    }

    const isStaff =
      userRoles.includes("admin") || userRoles.includes("registrar");

    if (!isStaff && batch.student_user_id !== issuedBy) {
      return res.status(403).json({
        status: "error",
        message: "You do not have permission to generate a receipt for this batch.",
      });
    }

    const receipt = await generateReceiptForBatch({
      batchId,
      issuedBy
    });

    const docs: any[] = await sequelize.query(
      `
      SELECT dt.document_name
      FROM batch_requests br
      JOIN document_requests dr ON br.request_id = dr.request_id
      JOIN document_types dt ON dr.document_type_id = dt.document_type_id
      WHERE br.batch_id = ?
      `,
      {
        replacements: [batchId],
        type: QueryTypes.SELECT
      }
    );

    const documentNames = docs.map(d => d.document_name).join(", ");


    const [receiptRow]: any = await sequelize.query(
      `
      SELECT 
        receipt_id,
        receipt_reference,
        refundable_amount
      FROM receipts
      WHERE batch_id = ?
      `,
      {
        replacements: [batchId],
        type: QueryTypes.SELECT
      }
    );

    const refundableAmount = Number(receiptRow?.refundable_amount || 0);


    const [issuer]: any = await sequelize.query(
      `
      SELECT
        CONCAT(
          COALESCE(ap.first_name, ''),
          ' ',
          COALESCE(ap.last_name, '')
        ) AS full_name,
        r.role_name
      FROM users u
      LEFT JOIN admin_profiles ap ON ap.user_id = u.user_id
      LEFT JOIN user_roles ur ON ur.user_id = u.user_id
      LEFT JOIN roles r ON r.role_id = ur.role_id
      WHERE u.user_id = ?
      LIMIT 1
      `,
      {
        replacements: [issuedBy],
        type: QueryTypes.SELECT
      }
    );

    const issuerName =
      issuer?.full_name?.trim() || "Registrar";
    const issuerRole =
      issuer?.role_name
        ? issuer.role_name.toUpperCase()
        : "ADMIN";


    let message =
      `Your requested documents (${documentNames}) are now ready for release.\n\n` +
      `Receipt Reference: ${receiptRow.receipt_reference}\n` +
      `Receipt ID: ${receiptRow.receipt_id}\n` +
      `Issued By: ${issuerName} (${issuerRole})\n\n` +
      `Please proceed to the Registrar’s Office to claim your documents.`;

    if (refundableAmount > 0) {
      message +=
        `\n\nRefundable Amount: ₱${refundableAmount
          .toFixed(2)
          .replace(/\B(?=(\d{3})+(?!\d))/g, ",")}\n` +
        `Kindly coordinate with the Registrar for the refund process.`;
    }

    await sequelize.query(
      `
      INSERT INTO notifications (
        user_id,
        title,
        message,
        type,
        status
      ) VALUES (?, ?, ?, ?, ?)
      `,
      {
        replacements: [
          batch.student_user_id,
          "Documents Ready for Release",
          message,
          "request_update",
          refundableAmount > 0 ? "with_refund" : "completed"
        ],
        type: QueryTypes.INSERT
      }
    );

    return res.status(201).json({
      status: "success",
      message: "Receipt generated successfully and student notified",
      data: receipt
    });

  } catch (err: any) {
    console.error("RECEIPT GENERATION ERROR:", err.message);

    return res.status(400).json({
      status: "error",
      message: err.message
    });
  }
};


const formatIssuedAt = (value: any) =>
  moment(value).tz("Asia/Manila").format("YYYY-MM-DD HH:mm:ss");

export const reprintReceipt = async (req: Request, res: Response) => {
  try {
    const receiptId = Number(req.params.receiptId);
    const userId = getUserIdFromRequest(req);
    const userRoles: string[] = (req as any).user?.roles || [];

    if (!Number.isInteger(receiptId) || receiptId <= 0) {
      return res.status(400).json({
        status: "error",
        message: "Invalid receipt ID",
      });
    }

    const receiptRows: any[] = await sequelize.query(
      `SELECT * FROM receipts WHERE receipt_id = ?`,
      { replacements: [receiptId], type: QueryTypes.SELECT }
    );

    if (!receiptRows.length) {
      return res.status(404).json({
        status: "error",
        message: "Receipt not found",
      });
    }

    const receipt = receiptRows[0];
    const isStaff =
      userRoles.includes("admin") || userRoles.includes("registrar");

    if (!isStaff) {
      const [studentProfile]: any = await sequelize.query(
        `
        SELECT student_id
        FROM student_profiles
        WHERE user_id = ?
        `,
        {
          replacements: [userId],
          type: QueryTypes.SELECT,
        }
      );

      if (!studentProfile || studentProfile.student_id !== receipt.student_id) {
        return res.status(403).json({
          status: "error",
          message: "You do not have permission to reprint this receipt.",
        });
      }
    }

    const [school]: any = await sequelize.query(
      `SELECT * FROM system_settings WHERE id = 1`,
      { type: QueryTypes.SELECT }
    );


    const [student]: any = await sequelize.query(
      `
      SELECT 
        sp.student_id,
        sp.student_number,
        CONCAT(sp.last_name, ', ', sp.first_name) AS full_name,
        c.course_name
      FROM student_profiles sp
      LEFT JOIN courses c ON sp.course_id = c.course_id
      WHERE sp.student_id = ?
      `,
      { replacements: [receipt.student_id], type: QueryTypes.SELECT }
    );

    const items: any[] = await sequelize.query(
      `
      SELECT 
        ri.document_name,
        ri.quantity,
        ri.amount AS total_amount,
        ri.request_status
      FROM receipt_items ri
      WHERE ri.receipt_id = ?
      `,
      { replacements: [receiptId], type: QueryTypes.SELECT }
    );


    const formattedIssuedAt = formatIssuedAt(receipt.issued_at);

    const pdfPath = await generateReceiptPDF({
      receipt: {
        receipt_reference: receipt.receipt_reference,
        issued_at: formattedIssuedAt,
        total_paid: receipt.total_paid,
        completed_amount: receipt.completed_amount,
        rejected_amount: receipt.rejected_amount,
        refundable_amount: receipt.refundable_amount,
      },
      school,
      student,
      items,
    });

    await sequelize.query(
      `UPDATE receipts SET pdf_path = ? WHERE receipt_id = ?`,
      {
        replacements: [pdfPath, receiptId],
        type: QueryTypes.UPDATE,
      }
    );

    return res.json({
      status: "success",
      message: "Receipt reprinted successfully",
      data: {
        receipt: {
          receipt_id: receipt.receipt_id,
          receipt_reference: receipt.receipt_reference,
          batch_id: receipt.batch_id,
          issued_at: formattedIssuedAt,
          total_paid: receipt.total_paid,
          completed_amount: receipt.completed_amount,
          rejected_amount: receipt.rejected_amount,
          refundable_amount: receipt.refundable_amount,
          currency: receipt.currency,
          receipt_status: receipt.receipt_status,
          pdf_path: pdfPath,
        },
        school: {
          school_name: school.school_name,
          school_short_name: school.school_short_name,
          school_email: school.school_email,
          school_contact_number: school.school_contact_number,
          school_address: school.school_address,
          school_website: school.school_website,
        },
        student: {
          student_id: student.student_id,
          student_number: student.student_number,
          full_name: student.full_name,
          course_name: student.course_name,
        },
        items: items.map(i => ({
          document_name: i.document_name,
          quantity: Number(i.quantity),
          amount: Number(i.total_amount),
          request_status: i.request_status,
        })),
      },
    });
  } catch (err) {
    console.error("REPRINT ERROR:", err);
    return res.status(500).json({
      status: "error",
      message: "Failed to reprint receipt",
    });
  }
};

export const getMyReceipts = async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromRequest(req);

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const offset = (page - 1) * limit;


    const [studentProfile]: any = await sequelize.query(
      `
      SELECT student_id
      FROM student_profiles
      WHERE user_id = ?
      `,
      { replacements: [userId], type: QueryTypes.SELECT }
    );

    if (!studentProfile) {
      return res.status(403).json({
        status: "error",
        message: "Student profile not found",
      });
    }

    const studentId = studentProfile.student_id;


    const [{ total }]: any = await sequelize.query(
      `
      SELECT COUNT(*) AS total
      FROM receipts
      WHERE student_id = ?
      `,
      { replacements: [studentId], type: QueryTypes.SELECT }
    );


    const receipts: any[] = await sequelize.query(
      `
      SELECT *
      FROM receipts
      WHERE student_id = ?
      ORDER BY issued_at DESC
      LIMIT ? OFFSET ?
      `,
      {
        replacements: [studentId, limit, offset],
        type: QueryTypes.SELECT,
      }
    );

    if (!receipts.length) {
      return res.json({
        status: "success",
        message: "No receipts found",
        meta: {
          page,
          limit,
          total: 0,
          totalPages: 0,
        },
        data: [],
      });
    }


    const [school]: any = await sequelize.query(
      `SELECT * FROM system_settings WHERE id = 1`,
      { type: QueryTypes.SELECT }
    );

    const [student]: any = await sequelize.query(
      `
      SELECT 
        sp.student_id,
        sp.student_number,
        CONCAT(sp.last_name, ', ', sp.first_name) AS full_name,
        c.course_name
      FROM student_profiles sp
      LEFT JOIN courses c ON sp.course_id = c.course_id
      WHERE sp.student_id = ?
      `,
      { replacements: [studentId], type: QueryTypes.SELECT }
    );


    const data = await Promise.all(
      receipts.map(async (receipt) => {
        const items: any[] = await sequelize.query(
          `
          SELECT 
            document_name,
            quantity,
            amount AS total_amount,
            request_status
          FROM receipt_items
          WHERE receipt_id = ?
          `,
          {
            replacements: [receipt.receipt_id],
            type: QueryTypes.SELECT,
          }
        );

        return {
          receipt: {
            receipt_id: receipt.receipt_id,
            receipt_reference: receipt.receipt_reference,
            batch_id: receipt.batch_id,
            issued_at: formatIssuedAt(receipt.issued_at),
            total_paid: receipt.total_paid,
            completed_amount: receipt.completed_amount,
            rejected_amount: receipt.rejected_amount,
            refundable_amount: receipt.refundable_amount,
            currency: receipt.currency,
            receipt_status: receipt.receipt_status,
            pdf_path: receipt.pdf_path,
          },
          school: {
            school_name: school.school_name,
            school_short_name: school.school_short_name,
            school_email: school.school_email,
            school_contact_number: school.school_contact_number,
            school_address: school.school_address,
            school_website: school.school_website,
          },
          student: {
            student_id: student.student_id,
            student_number: student.student_number,
            full_name: student.full_name,
            course_name: student.course_name,
          },
          items: items.map((i) => ({
            document_name: i.document_name,
            quantity: Number(i.quantity),
            amount: Number(i.total_amount),
            request_status: i.request_status,
          })),
        };
      })
    );


    return res.json({
      status: "success",
      message: "Receipts retrieved successfully",
      meta: {
        page,
        limit,
        total: Number(total),
        totalPages: Math.ceil(total / limit),
      },
      data,
    });
  } catch (error) {
    console.error("GET MY RECEIPTS ERROR:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to retrieve receipts",
    });
  }
};


export const getAllReceipts = async (req: Request, res: Response) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = (req.query.search as string)?.trim() || "";

    const searchWhere = search
      ? `
        AND (
          r.receipt_reference LIKE :search
          OR CONCAT(sp.last_name, ', ', sp.first_name) LIKE :search
          OR CONCAT(sp.first_name, ' ', sp.last_name) LIKE :search
        )
      `
      : "";

    const [{ total }]: any = await sequelize.query(
      `
      SELECT COUNT(*) AS total
      FROM receipts r
      JOIN student_profiles sp ON r.student_id = sp.student_id
      WHERE 1=1
      ${searchWhere}
      `,
      {
        replacements: { search: `%${search}%` },
        type: QueryTypes.SELECT,
      }
    );

    const receipts: any[] = await sequelize.query(
      `
      SELECT 
        r.*,
        sp.student_id,
        sp.student_number,
        CONCAT(sp.last_name, ', ', sp.first_name) AS full_name,
        c.course_name
      FROM receipts r
      JOIN student_profiles sp ON r.student_id = sp.student_id
      LEFT JOIN courses c ON sp.course_id = c.course_id
      WHERE 1=1
      ${searchWhere}
      ORDER BY r.issued_at DESC
      LIMIT :limit OFFSET :offset
      `,
      {
        replacements: {
          search: `%${search}%`,
          limit,
          offset,
        },
        type: QueryTypes.SELECT,
      }
    );

    if (!receipts.length) {
      return res.json({
        status: "success",
        message: "No receipts found",
        meta: {
          page,
          limit,
          total: 0,
          totalPages: 0,
        },
        data: [],
      });
    }

    const [school]: any = await sequelize.query(
      `SELECT * FROM system_settings WHERE id = 1`,
      { type: QueryTypes.SELECT }
    );

    const data = await Promise.all(
      receipts.map(async (r) => {
        const items: any[] = await sequelize.query(
          `
          SELECT 
            document_name,
            quantity,
            amount AS total_amount,
            request_status
          FROM receipt_items
          WHERE receipt_id = ?
          `,
          {
            replacements: [r.receipt_id],
            type: QueryTypes.SELECT,
          }
        );

        return {
          receipt: {
            receipt_id: r.receipt_id,
            receipt_reference: r.receipt_reference,
            batch_id: r.batch_id,
            issued_at: formatIssuedAt(r.issued_at),
            total_paid: r.total_paid,
            completed_amount: r.completed_amount,
            rejected_amount: r.rejected_amount,
            refundable_amount: r.refundable_amount,
            currency: r.currency,
            receipt_status: r.receipt_status,
            pdf_path: r.pdf_path,
          },
          school: {
            school_name: school.school_name,
            school_short_name: school.school_short_name,
            school_email: school.school_email,
            school_contact_number: school.school_contact_number,
            school_address: school.school_address,
            school_website: school.school_website,
          },
          student: {
            student_id: r.student_id,
            student_number: r.student_number,
            full_name: r.full_name,
            course_name: r.course_name,
          },
          items: items.map((i) => ({
            document_name: i.document_name,
            quantity: Number(i.quantity),
            amount: Number(i.total_amount),
            request_status: i.request_status,
          })),
        };
      })
    );

    return res.json({
      status: "success",
      message: "Receipts retrieved successfully",
      meta: {
        page,
        limit,
        total: Number(total),
        totalPages: Math.ceil(total / limit),
      },
      data,
    });
  } catch (error) {
    console.error("GET ALL RECEIPTS ERROR:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to retrieve receipts",
    });
  }
};
