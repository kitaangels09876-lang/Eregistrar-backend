import { Request, Response } from "express";
import { sequelize } from "../models";
import { QueryTypes } from "sequelize";
import { timeAgo } from "../utils/timeAgo";

export const getMyNotifications = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    if (!user?.user_id) {
      return res.status(401).json({
        status: "error",
        message: "Unauthorized",
      });
    }

    const {
      page = "1",
      limit = "10",
      is_read,
      type,
    } = req.query as {
      page?: string;
      limit?: string;
      is_read?: string;
      type?: string;
    };

    const pageNumber = Math.max(Number(page), 1);
    const pageSize = Math.max(Number(limit), 1);
    const offset = (pageNumber - 1) * pageSize;

    const whereConditions: string[] = ["n.user_id = :userId"];
    const replacements: any = {
      userId: user.user_id,
      limit: pageSize,
      offset,
    };

    if (is_read !== undefined) {
      if (is_read !== "true" && is_read !== "false") {
        return res.status(400).json({
          status: "error",
          message: "is_read must be true or false",
        });
      }

      whereConditions.push("n.is_read = :is_read");
      replacements.is_read = is_read === "true";
    }

    if (type) {
      whereConditions.push("n.type = :type");
      replacements.type = type;
    }

    const whereClause = `WHERE ${whereConditions.join(" AND ")}`;

    const notifications = await sequelize.query(
      `
      SELECT
        n.notification_id,
        n.title,
        n.message,
        n.type,
        n.is_read,
        n.created_at
      FROM notifications n
      ${whereClause}
      ORDER BY n.created_at DESC
      LIMIT :limit OFFSET :offset
      `,
      {
        replacements,
        type: QueryTypes.SELECT,
      }
    );

    const formattedNotifications = (notifications as any[]).map(n => ({
      notification_id: n.notification_id,
      title: n.title,
      message: n.message,
      type: n.type,
      is_read: Boolean(n.is_read),
      created_at: n.created_at,
      time_ago: timeAgo(n.created_at),
    }));

    const totalResult = await sequelize.query(
      `
      SELECT COUNT(*) as total
      FROM notifications n
      ${whereClause}
      `,
      {
        replacements,
        type: QueryTypes.SELECT,
      }
    );

    const unreadResult = await sequelize.query(
      `
      SELECT COUNT(*) as unread
      FROM notifications
      WHERE user_id = :userId
        AND is_read = false
      `,
      {
        replacements: { userId: user.user_id },
        type: QueryTypes.SELECT,
      }
    );

    return res.status(200).json({
      status: "success",
      data: formattedNotifications,
      meta: {
        page: pageNumber,
        limit: pageSize,
        total: Number((totalResult as any)[0].total),
        totalPages: Math.ceil(
          Number((totalResult as any)[0].total) / pageSize
        ),
        unread_count: Number((unreadResult as any)[0].unread),
      },
    });
  } catch (err: any) {
    console.error("GET NOTIFICATIONS ERROR:", err);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

export const openNotification = async (req: Request, res: Response) => {
  const transaction = await sequelize.transaction();

  try {
    const user = (req as any).user;
    const { notificationId } = req.params;

    if (!user?.user_id) {
      await transaction.rollback();
      return res.status(401).json({
        status: "error",
        message: "Unauthorized",
      });
    }

    if (!notificationId || isNaN(Number(notificationId))) {
      await transaction.rollback();
      return res.status(400).json({
        status: "error",
        message: "Invalid notification ID",
      });
    }

    const notifications = await sequelize.query(
      `
      SELECT
        notification_id,
        title,
        message,
        type,
        is_read,
        created_at
      FROM notifications
      WHERE notification_id = :notificationId
        AND user_id = :userId
      LIMIT 1
      `,
      {
        replacements: {
          notificationId,
          userId: user.user_id,
        },
        type: QueryTypes.SELECT,
        transaction,
      }
    );

    if (!notifications.length) {
      await transaction.rollback();
      return res.status(404).json({
        status: "error",
        message: "Notification not found",
      });
    }

    const notification: any = notifications[0];

    if (!notification.is_read) {
      await sequelize.query(
        `
        UPDATE notifications
        SET is_read = true
        WHERE notification_id = :notificationId
          AND user_id = :userId
        `,
        {
          replacements: {
            notificationId,
            userId: user.user_id,
          },
          type: QueryTypes.UPDATE,
          transaction,
        }
      );
    }

    await transaction.commit();

    return res.status(200).json({
      status: "success",
      data: {
        notification_id: notification.notification_id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        is_read: true,
        created_at: notification.created_at,
        time_ago: timeAgo(notification.created_at), 
      },
    });
  } catch (err: any) {
    await transaction.rollback();
    console.error("OPEN NOTIFICATION ERROR:", err);

    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

export const markNotificationAsRead = async (
  req: Request,
  res: Response
) => {
  const transaction = await sequelize.transaction();

  try {
    const user = (req as any).user;
    const { notificationId } = req.params;

    if (!user?.user_id) {
      await transaction.rollback();
      return res.status(401).json({
        status: "error",
        message: "Unauthorized",
      });
    }

    if (!notificationId || isNaN(Number(notificationId))) {
      await transaction.rollback();
      return res.status(400).json({
        status: "error",
        message: "Invalid notification ID",
      });
    }

    const result: any[] = await sequelize.query(
      `
      SELECT is_read
      FROM notifications
      WHERE notification_id = :notificationId
        AND user_id = :userId
      LIMIT 1
      `,
      {
        replacements: {
          notificationId,
          userId: user.user_id,
        },
        type: QueryTypes.SELECT,
        transaction,
      }
    );

    if (!result.length) {
      await transaction.rollback();
      return res.status(404).json({
        status: "error",
        message: "Notification not found",
      });
    }

    if (!result[0].is_read) {
      await sequelize.query(
        `
        UPDATE notifications
        SET is_read = true
        WHERE notification_id = :notificationId
          AND user_id = :userId
        `,
        {
          replacements: {
            notificationId,
            userId: user.user_id,
          },
          type: QueryTypes.UPDATE,
          transaction,
        }
      );
    }

    await transaction.commit();

    return res.status(200).json({
      status: "success",
      message: "Notification marked as read",
      data: {
        notification_id: Number(notificationId),
        is_read: true,
      },
    });
  } catch (err: any) {
    await transaction.rollback();
    console.error("MARK NOTIFICATION READ ERROR:", err);

    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};