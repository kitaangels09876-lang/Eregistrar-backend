import { Request, Response } from "express";
import { DocumentType } from "../models";
import { Op } from "sequelize";
import { logActivity, getUserIdFromRequest } from "../utils/auditlog.service";

export const getAllDocuments = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || "";
    const isActive = req.query.is_active;

    const offset = (page - 1) * limit;

    const whereCondition: any = {};

    if (search) {
      whereCondition[Op.or] = [
        { document_name: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }

    if (isActive !== undefined) {
      whereCondition.is_active = isActive;
    }

    const { rows, count } = await DocumentType.findAndCountAll({
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
    console.error("GET ALL DOCUMENTS ERROR:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch document list"
    });
  }
};

export const createDocument = async (req: Request, res: Response) => {
  try {
    const {
      document_name,
      description,
      base_price,
      requirements,
      estimated_processing_days
    } = req.body;

    const userId = getUserIdFromRequest(req);

    if (!userId) {
      return res.status(401).json({
        status: "error",
        message: "Unauthorized"
      });
    }

    if (!document_name) {
      return res.status(400).json({
        status: "error",
        message: "Document name is required"
      });
    }

    const existing = await DocumentType.findOne({
      where: { document_name }
    });

    if (existing) {
      return res.status(409).json({
        status: "error",
        message: "Document already exists"
      });
    }

    const document = await DocumentType.create({
      document_name,
      description,
      base_price: base_price ?? 0,
      requirements,
      estimated_processing_days: estimated_processing_days ?? 1
    });

    await logActivity({
      userId,
      action: "CREATE_DOCUMENT_TYPE",
      tableName: "document_types",
      recordId: document.document_type_id,
      newValue: {
        document_name,
        base_price,
        estimated_processing_days
      },
      req
    });

    res.status(201).json({
      status: "success",
      message: "Document created successfully"
    });
  } catch (error) {
    console.error("CREATE DOCUMENT ERROR:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to create document"
    });
  }
};

export const updateDocument = async (req: Request, res: Response) => {
  try {
    const documentTypeId = Number(req.params.documentTypeId);
    const {
      document_name,
      description,
      base_price,
      requirements,
      estimated_processing_days,
      is_active
    } = req.body;

    const userId = getUserIdFromRequest(req);

    if (!userId) {
      return res.status(401).json({
        status: "error",
        message: "Unauthorized"
      });
    }

    const document = await DocumentType.findByPk(documentTypeId);

    if (!document) {
      return res.status(404).json({
        status: "error",
        message: "Document not found"
      });
    }

    const oldValue = {
      document_name: document.document_name,
      description: document.description,
      base_price: document.base_price,
      requirements: document.requirements,
      estimated_processing_days: document.estimated_processing_days,
      is_active: document.is_active
    };

    await document.update({
      document_name: document_name ?? document.document_name,
      description: description ?? document.description,
      base_price: base_price ?? document.base_price,
      requirements: requirements ?? document.requirements,
      estimated_processing_days:
        estimated_processing_days ?? document.estimated_processing_days,
      is_active: is_active ?? document.is_active
    });

    await logActivity({
      userId,
      action: "UPDATE_DOCUMENT_TYPE",
      tableName: "document_types",
      recordId: document.document_type_id,
      oldValue,
      newValue: {
        document_name: document.document_name,
        description: document.description,
        base_price: document.base_price,
        requirements: document.requirements,
        estimated_processing_days: document.estimated_processing_days,
        is_active: document.is_active
      },
      req
    });

    res.json({
      status: "success",
      message: "Document updated successfully"
    });
  } catch (error) {
    console.error("UPDATE DOCUMENT ERROR:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to update document"
    });
  }
};
