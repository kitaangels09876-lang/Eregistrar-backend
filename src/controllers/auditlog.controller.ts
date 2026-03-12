import { Request, Response } from 'express';
import { sequelize } from '../models';
import { QueryTypes } from 'sequelize';
import { getUserIdFromRequest } from '../utils/auditlog.service';


export const getActivityLogs = async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 50,
      userId,
      action,
      tableName,
      startDate,
      endDate
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);

    let whereConditions = [];
    const replacements: any = {
      limit: Number(limit),
      offset: offset
    };

    if (userId) {
      whereConditions.push("al.user_id = :userId");
      replacements.userId = Number(userId);
    }

    if (action) {
      whereConditions.push("al.action = :action");
      replacements.action = action;
    }

    if (tableName) {
      whereConditions.push("al.table_name = :tableName");
      replacements.tableName = tableName;
    }

    if (startDate) {
      whereConditions.push("al.timestamp >= :startDate");
      replacements.startDate = new Date(startDate as string);
    }

    if (endDate) {
      whereConditions.push("al.timestamp <= :endDate");
      replacements.endDate = new Date(endDate as string);
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}` 
      : '';

    const logs = await sequelize.query(
      `SELECT 
        al.log_id,
        al.user_id,
        al.action,
        al.table_name,
        al.record_id,
        al.old_value,
        al.new_value,
        al.timestamp,
        al.ip_address,
        al.user_agent,
        u.email,
        u.account_type,
        CASE 
          WHEN u.account_type = 'student' THEN CONCAT(sp.first_name, ' ', sp.last_name)
          WHEN u.account_type = 'admin' THEN CONCAT(ap.first_name, ' ', ap.last_name)
          ELSE 'Unknown User'
        END as user_name
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.user_id
       LEFT JOIN student_profiles sp ON u.user_id = sp.user_id AND u.account_type = 'student'
       LEFT JOIN admin_profiles ap ON u.user_id = ap.user_id AND u.account_type = 'admin'
       ${whereClause}
       ORDER BY al.timestamp DESC
       LIMIT :limit OFFSET :offset`,
      {
        replacements,
        type: QueryTypes.SELECT
      }
    );

    const countResult = await sequelize.query<{ total: number }>(
      `SELECT COUNT(*) as total
       FROM audit_logs al
       ${whereClause}`,
      {
        replacements,
        type: QueryTypes.SELECT
      }
    );

    const total = countResult[0]?.total || 0;

    res.json({
      status: 'success',
      data: {
        logs,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    console.error('GET ACTIVITY LOGS ERROR:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch activity logs',
    });
  }
};

export const getActivityLogById = async (req: Request, res: Response) => {
  try {
    const { logId } = req.params;

    const log = await sequelize.query(
      `SELECT 
        al.log_id,
        al.user_id,
        al.action,
        al.table_name,
        al.record_id,
        al.old_value,
        al.new_value,
        al.timestamp,
        al.ip_address,
        al.user_agent,
        u.email,
        u.account_type,
        CASE 
          WHEN u.account_type = 'student' THEN CONCAT(sp.first_name, ' ', sp.last_name)
          WHEN u.account_type = 'admin' THEN CONCAT(ap.first_name, ' ', ap.last_name)
          ELSE 'Unknown User'
        END as user_name
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.user_id
       LEFT JOIN student_profiles sp ON u.user_id = sp.user_id AND u.account_type = 'student'
       LEFT JOIN admin_profiles ap ON u.user_id = ap.user_id AND u.account_type = 'admin'
       WHERE al.log_id = :logId`,
      {
        replacements: { logId: Number(logId) },
        type: QueryTypes.SELECT
      }
    );

    if (!log || log.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Activity log not found',
      });
    }

    res.json({
      status: 'success',
      data: log[0],
    });
  } catch (error) {
    console.error('GET ACTIVITY LOG ERROR:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch activity log',
    });
  }
};


export const getActivityLogsByUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const offset = (Number(page) - 1) * Number(limit);

    const logs = await sequelize.query(
      `SELECT 
        al.log_id,
        al.user_id,
        al.action,
        al.table_name,
        al.record_id,
        al.old_value,
        al.new_value,
        al.timestamp,
        al.ip_address,
        al.user_agent,
        u.email,
        u.account_type
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.user_id
       WHERE al.user_id = :userId
       ORDER BY al.timestamp DESC
       LIMIT :limit OFFSET :offset`,
      {
        replacements: { 
          userId: Number(userId),
          limit: Number(limit),
          offset: offset
        },
        type: QueryTypes.SELECT
      }
    );

    const countResult = await sequelize.query<{ total: number }>(
      `SELECT COUNT(*) as total
       FROM audit_logs
       WHERE user_id = :userId`,
      {
        replacements: { userId: Number(userId) },
        type: QueryTypes.SELECT
      }
    );

    const total = countResult[0]?.total || 0;

    res.json({
      status: 'success',
      data: {
        logs,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    console.error('GET USER ACTIVITY LOGS ERROR:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch user activity logs',
    });
  }
};


export const getActivityLogsByTable = async (req: Request, res: Response) => {
  try {
    const { tableName } = req.params;
    const { page = 1, limit = 50, recordId } = req.query;

    const offset = (Number(page) - 1) * Number(limit);

    let whereClause = 'WHERE al.table_name = :tableName';
    const replacements: any = { 
      tableName,
      limit: Number(limit),
      offset: offset
    };

    if (recordId) {
      whereClause += ' AND al.record_id = :recordId';
      replacements.recordId = Number(recordId);
    }

    const logs = await sequelize.query(
      `SELECT 
        al.log_id,
        al.user_id,
        al.action,
        al.table_name,
        al.record_id,
        al.old_value,
        al.new_value,
        al.timestamp,
        al.ip_address,
        u.email,
        CASE 
          WHEN u.account_type = 'student' THEN CONCAT(sp.first_name, ' ', sp.last_name)
          WHEN u.account_type = 'admin' THEN CONCAT(ap.first_name, ' ', ap.last_name)
          ELSE 'Unknown User'
        END as user_name
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.user_id
       LEFT JOIN student_profiles sp ON u.user_id = sp.user_id AND u.account_type = 'student'
       LEFT JOIN admin_profiles ap ON u.user_id = ap.user_id AND u.account_type = 'admin'
       ${whereClause}
       ORDER BY al.timestamp DESC
       LIMIT :limit OFFSET :offset`,
      {
        replacements,
        type: QueryTypes.SELECT
      }
    );

    const countResult = await sequelize.query<{ total: number }>(
      `SELECT COUNT(*) as total
       FROM audit_logs al
       ${whereClause}`,
      {
        replacements,
        type: QueryTypes.SELECT
      }
    );

    const total = countResult[0]?.total || 0;

    res.json({
      status: 'success',
      data: {
        logs,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    console.error('GET TABLE ACTIVITY LOGS ERROR:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch table activity logs',
    });
  }
};


export const getActivityLogStatistics = async (req: Request, res: Response) => {
  try {
    const stats = await sequelize.query(
      `SELECT 
        COUNT(*) as total_logs,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(DISTINCT table_name) as tables_affected,
        COUNT(DISTINCT DATE(timestamp)) as days_with_activity
       FROM audit_logs`,
      { type: QueryTypes.SELECT }
    );

    const actionStats = await sequelize.query(
      `SELECT 
        action,
        COUNT(*) as count
       FROM audit_logs
       GROUP BY action
       ORDER BY count DESC
       LIMIT 10`,
      { type: QueryTypes.SELECT }
    );

    const recentActivity = await sequelize.query(
      `SELECT 
        DATE(timestamp) as date,
        COUNT(*) as activity_count
       FROM audit_logs
       WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 30 DAY)
       GROUP BY DATE(timestamp)
       ORDER BY date DESC`,
      { type: QueryTypes.SELECT }
    );

    res.json({
      status: 'success',
      data: {
        overview: stats[0],
        topActions: actionStats,
        recentActivity: recentActivity
      },
    });
  } catch (error) {
    console.error('GET STATISTICS ERROR:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch activity log statistics',
    });
  }
};


export const deleteOldActivityLogs = async (req: Request, res: Response) => {
  try {
    const { daysOld = 90 } = req.query;
    const adminId = getUserIdFromRequest(req);

    if (!adminId) {
      return res.status(401).json({
        status: 'error',
        message: 'Unauthorized',
      });
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - Number(daysOld));

    const result = await sequelize.query(
      `DELETE FROM audit_logs
       WHERE timestamp < :cutoffDate`,
      {
        replacements: { cutoffDate },
        type: QueryTypes.DELETE
      }
    );

    res.json({
      status: 'success',
      message: `Deleted activity logs older than ${daysOld} days`,
      data: { 
        daysOld: Number(daysOld),
        cutoffDate 
      },
    });
  } catch (error) {
    console.error('DELETE OLD LOGS ERROR:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete old activity logs',
    });
  }
};