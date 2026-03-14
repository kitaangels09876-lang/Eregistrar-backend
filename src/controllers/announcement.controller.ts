import { Request, Response } from "express";
import { Announcement } from "../models";
import { Op } from "sequelize";
import { logActivity, getUserIdFromRequest } from "../utils/auditlog.service";

const getSingleParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export const createAnnouncement = async (req: Request, res: Response) => {
  try {
    const { title, message } = req.body;

    const userId = getUserIdFromRequest(req);

    if (!userId) {
      return res.status(401).json({
        status: "error",
        message: "Unauthorized"
      });
    }

    if (!title || !message) {
      return res.status(400).json({
        status: "error",
        message: "Title and message are required"
      });
    }

    const postedBy = "System Administrator";

    const announcement = await Announcement.create({
      title,
      message,
      posted_by: postedBy,
      created_by: userId
    });

    await logActivity({
      userId,
      action: "CREATE_ANNOUNCEMENT",
      tableName: "announcements",
      recordId: announcement.announcement_id,
      newValue: {
        title: announcement.title,
        posted_by: postedBy
      },
      req
    });

    res.status(201).json({
      status: "success",
      message: "Announcement posted successfully"
    });
  } catch (error) {
    console.error("CREATE ANNOUNCEMENT ERROR:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to create announcement"
    });
  }
};

export const getAllAnnouncements = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || "";

    const offset = (page - 1) * limit;

    const whereCondition = search
      ? {
          [Op.or]: [
            { title: { [Op.like]: `%${search}%` } },
            { message: { [Op.like]: `%${search}%` } }
          ]
        }
      : undefined;

    const { rows, count } = await Announcement.findAndCountAll({
      where: whereCondition,
      order: [["created_at", "DESC"]],
      limit,
      offset
    });

    const totalPages = Math.ceil(count / limit);

    res.json({
      status: "success",
      pagination: {
        totalRecords: count,
        totalPages,
        currentPage: page,
        limit
      },
      data: rows
    });
  } catch (error) {
    console.error("GET ALL ANNOUNCEMENTS ERROR:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch announcements"
    });
  }
};

export const updateAnnouncement = async (req: Request, res: Response) => {
  try {
    const announcementId = getSingleParam(req.params.announcementId);
    const { title, message } = req.body;

    const userId = getUserIdFromRequest(req);

    if (!userId) {
      return res.status(401).json({
        status: "error",
        message: "Unauthorized"
      });
    }

    if (!announcementId) {
      return res.status(400).json({
        status: "error",
        message: "Announcement ID is required"
      });
    }

    const announcement = await Announcement.findByPk(announcementId);

    if (!announcement) {
      return res.status(404).json({
        status: "error",
        message: "Announcement not found"
      });
    }

    const oldValue = {
      title: announcement.title,
      message: announcement.message
    };

    await announcement.update({
      title: title ?? announcement.title,
      message: message ?? announcement.message
    });

    await logActivity({
      userId,
      action: "UPDATE_ANNOUNCEMENT",
      tableName: "announcements",
      recordId: announcement.announcement_id,
      oldValue,
      newValue: {
        title: announcement.title,
        message: announcement.message,
        updated_at: announcement.updated_at
      },
      req
    });

    res.json({
      status: "success",
      message: "Announcement updated successfully"
    });
  } catch (error) {
    console.error("UPDATE ANNOUNCEMENT ERROR:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to update announcement"
    });
  }
};

export const deleteAnnouncement = async (req: Request, res: Response) => {
  try {
    const announcementId = getSingleParam(req.params.announcementId);

    const userId = getUserIdFromRequest(req);

    if (!userId) {
      return res.status(401).json({
        status: "error",
        message: "Unauthorized"
      });
    }

    if (!announcementId) {
      return res.status(400).json({
        status: "error",
        message: "Announcement ID is required"
      });
    }

    const announcement = await Announcement.findByPk(announcementId);

    if (!announcement) {
      return res.status(404).json({
        status: "error",
        message: "Announcement not found"
      });
    }

    const oldValue = {
      title: announcement.title,
      message: announcement.message,
      posted_by: announcement.posted_by
    };

    await announcement.destroy();

    await logActivity({
      userId,
      action: "DELETE_ANNOUNCEMENT",
      tableName: "announcements",
      recordId: announcement.announcement_id,
      oldValue,
      req
    });

    res.json({
      status: "success",
      message: "Announcement deleted successfully"
    });
  } catch (error) {
    console.error("DELETE ANNOUNCEMENT ERROR:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to delete announcement"
    });
  }
};
