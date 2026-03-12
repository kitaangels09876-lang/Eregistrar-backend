import { sequelize } from "../models";
import { QueryTypes, Transaction } from "sequelize";
import moment from "moment-timezone";
import { generateReceiptPDF } from "../utils/receiptPdf.service";

interface GenerateReceiptOptions {
  batchId: number;
  issuedBy: number;
  transaction?: Transaction;
  allowRejectedOnly?: boolean;
}

export const generateReceiptForBatch = async ({
  batchId,
  issuedBy,
  transaction,
  allowRejectedOnly = false,
}: GenerateReceiptOptions) => {
  const t = transaction ?? (await sequelize.transaction());
  const useExternalTx = Boolean(transaction);

  try {
    const [batch]: any = await sequelize.query(
      `SELECT * FROM payment_batches WHERE batch_id = ?`,
      { replacements: [batchId], type: QueryTypes.SELECT, transaction: t }
    );

    if (!batch) {
      throw new Error("Batch not found");
    }

    if (!allowRejectedOnly && batch.status !== "paid") {
      throw new Error("Batch is not paid");
    }

    const existing: any[] = await sequelize.query(
      `SELECT receipt_id FROM receipts WHERE batch_id = ?`,
      { replacements: [batchId], type: QueryTypes.SELECT, transaction: t }
    );

    if (existing.length) {
      throw new Error("Receipt already exists for this batch");
    }

    const [school]: any = await sequelize.query(
      `SELECT * FROM system_settings WHERE id = 1`,
      { type: QueryTypes.SELECT, transaction: t }
    );


    const [student]: any = await sequelize.query(
      `
      SELECT 
        sp.student_id,
        sp.student_number,
        CONCAT(sp.last_name, ', ', sp.first_name) AS full_name,
        c.course_name,
        u.user_id
      FROM student_profiles sp
      JOIN users u ON u.user_id = sp.user_id
      LEFT JOIN courses c ON sp.course_id = c.course_id
      WHERE sp.student_id = ?
      `,
      {
        replacements: [batch.student_id],
        type: QueryTypes.SELECT,
        transaction: t,
      }
    );

    const [issuer]: any = await sequelize.query(
      `
      SELECT
        u.user_id,
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
        type: QueryTypes.SELECT,
        transaction: t,
      }
    );

    if (!issuer) {
      throw new Error("Issuer not found");
    }

    const requests: any[] = await sequelize.query(
      `
      SELECT
        dr.request_id,
        dr.request_status,
        dr.total_amount,
        dr.quantity,
        dt.document_name
      FROM batch_requests br
      JOIN document_requests dr ON br.request_id = dr.request_id
      JOIN document_types dt ON dr.document_type_id = dt.document_type_id
      WHERE br.batch_id = ?
      `,
      { replacements: [batchId], type: QueryTypes.SELECT, transaction: t }
    );

    if (!requests.length) {
      throw new Error("No requests found for this batch");
    }

    const invalid = requests.some(
      (r) => !["completed", "rejected"].includes(r.request_status)
    );

    if (invalid) {
      throw new Error("All requests must be completed or rejected");
    }


    let completedAmount = 0;
    let rejectedAmount = 0;

    for (const r of requests) {
      if (r.request_status === "completed") {
        completedAmount += Number(r.total_amount);
      } else {
        rejectedAmount += Number(r.total_amount);
      }
    }

    const totalPaid = Number(batch.total_amount);
    const refundableAmount = rejectedAmount;

    const receiptReference = `OR-${Date.now()}-${batchId}`;
    const issuedAt = moment()
      .tz("Asia/Manila")
      .format("YYYY-MM-DD HH:mm:ss");

    const [receiptId]: any = await sequelize.query(
      `
      INSERT INTO receipts (
        receipt_reference,
        batch_id,
        student_id,
        total_paid,
        completed_amount,
        rejected_amount,
        refundable_amount,
        issued_at,
        issued_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      {
        replacements: [
          receiptReference,
          batchId,
          batch.student_id,
          totalPaid,
          completedAmount,
          rejectedAmount,
          refundableAmount,
          issuedAt,
          issuedBy,
        ],
        type: QueryTypes.INSERT,
        transaction: t,
      }
    );


    for (const r of requests) {
      await sequelize.query(
        `
        INSERT INTO receipt_items (
          receipt_id,
          request_id,
          document_name,
          quantity,
          amount,
          request_status
        ) VALUES (?, ?, ?, ?, ?, ?)
        `,
        {
          replacements: [
            receiptId,
            r.request_id,
            r.document_name,
            r.quantity,
            r.total_amount,
            r.request_status,
          ],
          transaction: t,
        }
      );
    }


    const pdfPath = await generateReceiptPDF({
      receipt: {
        receipt_reference: receiptReference,
        issued_at: issuedAt,
        total_paid: totalPaid,
        completed_amount: completedAmount,
        rejected_amount: rejectedAmount,
        refundable_amount: refundableAmount,
      },
      school,
      student,
      issuer, 
      items: requests,
    });

    await sequelize.query(
      `UPDATE receipts SET pdf_path = ? WHERE receipt_id = ?`,
      { replacements: [pdfPath, receiptId], transaction: t }
    );

    if (!useExternalTx) {
      await t.commit();
    }

    return {
      receipt_id: receiptId,
      receipt_reference: receiptReference,
      pdf_path: pdfPath,
    };
  } catch (err) {
    if (!useExternalTx) {
      await t.rollback();
    }
    throw err;
  }
};
