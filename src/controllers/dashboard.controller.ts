import { Request, Response } from "express";
import { sequelize } from "../models";
import { QueryTypes } from "sequelize";

interface CountResult {
  total: number;
}

interface StatusCountResult {
  request_status: string;
  total: number;
}

export const getDashboardSummary = async (req: Request, res: Response) => {
  try {
    const [totalRequests] = await sequelize.query<any>(
      `SELECT COUNT(*) AS total FROM document_requests`,
      { type: QueryTypes.SELECT }
    );

    const [totalStudents] = await sequelize.query<any>(
      `SELECT COUNT(*) AS total FROM student_profiles`,
      { type: QueryTypes.SELECT }
    );

    const statusCounts = await sequelize.query<any>(
      `
      SELECT 
        request_status,
        COUNT(DISTINCT student_id) AS total
      FROM document_requests
      GROUP BY request_status
      `,
      { type: QueryTypes.SELECT }
    );

    const statusMap: Record<string, number> = {};
    statusCounts.forEach(row => {
      statusMap[row.request_status] = Number(row.total);
    });

    const [totalRevenue] = await sequelize.query<any>(
      `
      SELECT IFNULL(SUM(total_amount), 0) AS total
      FROM document_requests
      WHERE request_status = 'completed'
      `,
      { type: QueryTypes.SELECT }
    );

    return res.status(200).json({
      status: "success",
      data: {
        totalRequests: Number(totalRequests.total),
        totalStudents: Number(totalStudents.total),
        totalCompleted: statusMap["completed"] || 0,

        pendingRequests: statusMap["pending"] || 0,
        processingRequests: statusMap["processing"] || 0,
        forRelease: statusMap["releasing"] || 0,
        readyForPickup: statusMap["releasing"] || 0, 

        totalRevenue: Number(totalRevenue.total),

        requestsByStatus: {
          pending_payment: statusMap["pending"] || 0,
          pending_verification: statusMap["pending"] || 0,
          processing: statusMap["processing"] || 0,
          for_release: statusMap["releasing"] || 0,
          ready_for_pickup: statusMap["releasing"] || 0,
          completed: statusMap["completed"] || 0,
          rejected: statusMap["rejected"] || 0
        }
      }
    });

  } catch (error) {
    console.error("DASHBOARD ERROR:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to load dashboard data"
    });
  }
};





export const getStudentDashboardSummary = async (
  req: Request,
  res: Response
) => {
  try {
    const user = (req as any).user;
    const user_id = user.user_id;


    const student: any = await sequelize.query(
      `
      SELECT sp.student_id
      FROM student_profiles sp
      WHERE sp.user_id = ?
      `,
      {
        replacements: [user_id],
        type: QueryTypes.SELECT,
      }
    );

    if (!student || student.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Student profile not found",
      });
    }

    const student_id = student[0].student_id;

    const [documentCounts]: any = await sequelize.query(
      `
      SELECT
        COUNT(*) AS total_requests,
        SUM(request_status = 'pending') AS pending_requests,
        SUM(request_status = 'processing') AS processing_requests,
        SUM(request_status = 'releasing') AS releasing_requests,
        SUM(request_status = 'completed') AS completed_requests
      FROM document_requests
      WHERE student_id = ?
      `,
      {
        replacements: [student_id],
        type: QueryTypes.SELECT,
      }
    );

 
    const [paymentSummary]: any = await sequelize.query(
      `
      SELECT
        COUNT(*) AS total_payments,
        SUM(payment_status = 'pending') AS pending_payments,
        SUM(payment_status = 'submitted') AS submitted_payments,
        SUM(payment_status = 'verified') AS verified_payments
      FROM payments
      WHERE student_id = ?
      `,
      {
        replacements: [student_id],
        type: QueryTypes.SELECT,
      }
    );


    const [outstanding]: any = await sequelize.query(
      `
      SELECT
        IFNULL(SUM(total_amount), 0) AS outstanding_balance
      FROM payment_batches
      WHERE student_id = ?
        AND status = 'pending'
      `,
      {
        replacements: [student_id],
        type: QueryTypes.SELECT,
      }
    );


    const [notifications]: any = await sequelize.query(
      `
      SELECT COUNT(*) AS unread_notifications
      FROM notifications
      WHERE user_id = ?
        AND is_read = FALSE
      `,
      {
        replacements: [user_id],
        type: QueryTypes.SELECT,
      }
    );

    return res.status(200).json({
      status: "success",
      data: {
        documents: {
          total: Number(documentCounts.total_requests),
          pending: Number(documentCounts.pending_requests),
          processing: Number(documentCounts.processing_requests),
          releasing: Number(documentCounts.releasing_requests),
          completed: Number(documentCounts.completed_requests),
        },
        payments: {
          total: Number(paymentSummary.total_payments),
          pending: Number(paymentSummary.pending_payments),
          submitted: Number(paymentSummary.submitted_payments),
          verified: Number(paymentSummary.verified_payments),
          outstanding_balance: Number(outstanding.outstanding_balance),
        },
        notifications: {
          unread: Number(notifications.unread_notifications),
        },
      },
    });
  } catch (error: any) {
    console.error("STUDENT DASHBOARD ERROR:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};
