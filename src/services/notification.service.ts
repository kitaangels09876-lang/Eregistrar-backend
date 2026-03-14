import { QueryTypes, Transaction } from "sequelize";
import { sequelize } from "../models";

export type NotificationType = "request_update" | "payment_update" | "system";

interface CreateNotificationParams {
  userId: number;
  title: string;
  message: string;
  type: NotificationType;
  status?: string | null;
  transaction?: Transaction;
}

interface StudentRequestNotificationContext {
  studentUserId: number;
  documentName: string;
}

interface StudentBatchNotificationContext {
  studentUserId: number;
  documentNames: string;
}

interface StudentPaymentNotificationContext {
  studentUserId: number;
  documentNames: string;
}

export const createNotification = async ({
  userId,
  title,
  message,
  type,
  status = null,
  transaction,
}: CreateNotificationParams) => {
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
      replacements: [userId, title, message, type, status],
      type: QueryTypes.INSERT,
      transaction,
    }
  );
};

export const getStudentRequestNotificationContext = async (
  requestId: number,
  transaction?: Transaction
): Promise<StudentRequestNotificationContext | null> => {
  const [result]: any = await sequelize.query(
    `
    SELECT
      sp.user_id AS student_user_id,
      dt.document_name
    FROM document_requests dr
    JOIN student_profiles sp ON sp.student_id = dr.student_id
    JOIN document_types dt ON dt.document_type_id = dr.document_type_id
    WHERE dr.request_id = :requestId
    LIMIT 1
    `,
    {
      replacements: { requestId },
      type: QueryTypes.SELECT,
      transaction,
    }
  );

  if (!result) {
    return null;
  }

  return {
    studentUserId: Number(result.student_user_id),
    documentName: result.document_name || "document request",
  };
};

export const getStudentBatchNotificationContext = async (
  batchId: number,
  transaction?: Transaction
): Promise<StudentBatchNotificationContext | null> => {
  const [result]: any = await sequelize.query(
    `
    SELECT
      sp.user_id AS student_user_id,
      COALESCE(
        GROUP_CONCAT(DISTINCT dt.document_name ORDER BY dt.document_name SEPARATOR ', '),
        'document request'
      ) AS document_names
    FROM payment_batches pb
    JOIN student_profiles sp ON sp.student_id = pb.student_id
    LEFT JOIN batch_requests br ON br.batch_id = pb.batch_id
    LEFT JOIN document_requests dr ON dr.request_id = br.request_id
    LEFT JOIN document_types dt ON dt.document_type_id = dr.document_type_id
    WHERE pb.batch_id = :batchId
    GROUP BY sp.user_id
    LIMIT 1
    `,
    {
      replacements: { batchId },
      type: QueryTypes.SELECT,
      transaction,
    }
  );

  if (!result) {
    return null;
  }

  return {
    studentUserId: Number(result.student_user_id),
    documentNames: result.document_names || "document request",
  };
};

export const getStudentPaymentNotificationContext = async (
  paymentId: number,
  transaction?: Transaction
): Promise<StudentPaymentNotificationContext | null> => {
  const [result]: any = await sequelize.query(
    `
    SELECT
      sp.user_id AS student_user_id,
      COALESCE(
        GROUP_CONCAT(DISTINCT dt.document_name ORDER BY dt.document_name SEPARATOR ', '),
        'document request'
      ) AS document_names
    FROM payments p
    JOIN student_profiles sp ON sp.student_id = p.student_id
    LEFT JOIN batch_requests br ON br.batch_id = p.batch_id
    LEFT JOIN document_requests dr
      ON dr.request_id = COALESCE(p.request_id, br.request_id)
    LEFT JOIN document_types dt ON dt.document_type_id = dr.document_type_id
    WHERE p.payment_id = :paymentId
    GROUP BY sp.user_id
    LIMIT 1
    `,
    {
      replacements: { paymentId },
      type: QueryTypes.SELECT,
      transaction,
    }
  );

  if (!result) {
    return null;
  }

  return {
    studentUserId: Number(result.student_user_id),
    documentNames: result.document_names || "document request",
  };
};
