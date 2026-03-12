import { Request, Response } from "express";
import { sequelize } from "../models";
import { QueryTypes } from "sequelize";

export const getSystemSettings = async (req: Request, res: Response) => {
  try {
    const settings: any[] = await sequelize.query(
      `
      SELECT
        ss.id,
        ss.school_name,
        ss.school_short_name,
        ss.school_email,
        ss.school_contact_number,
        ss.school_address,
        ss.school_website,
        ss.school_logo,
        ss.school_seal,
        ss.school_icon,
        ss.updated_at,
        u.email AS updated_by
      FROM system_settings ss
      LEFT JOIN users u ON ss.updated_by = u.user_id
      WHERE ss.id = 1
      LIMIT 1
      `,
      { type: QueryTypes.SELECT }
    );

    return res.status(200).json({
      status: "success",
      data: settings[0] || null,
    });
  } catch (error) {
    console.error("GET SYSTEM SETTINGS ERROR:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

export const updateSystemSettings = async (req: Request, res: Response) => {
  try {
    const updated_by = (req as any).user.user_id;

    const {
      school_name,
      school_short_name,
      school_email,
      school_contact_number,
      school_address,
      school_website,
    } = req.body;

    const updateFields: string[] = [];
    const replacements: any = { updated_by };

    if (school_name) {
      updateFields.push("school_name = :school_name");
      replacements.school_name = school_name;
    }

    if (school_short_name) {
      updateFields.push("school_short_name = :school_short_name");
      replacements.school_short_name = school_short_name;
    }

    if (school_email) {
      updateFields.push("school_email = :school_email");
      replacements.school_email = school_email;
    }

    if (school_contact_number) {
      updateFields.push("school_contact_number = :school_contact_number");
      replacements.school_contact_number = school_contact_number;
    }

    if (school_address) {
      updateFields.push("school_address = :school_address");
      replacements.school_address = school_address;
    }

    if (school_website) {
      updateFields.push("school_website = :school_website");
      replacements.school_website = school_website;
    }

    if (req.files) {
      const files = req.files as any;

      if (files.school_logo?.[0]) {
        updateFields.push("school_logo = :school_logo");
        replacements.school_logo = `/uploads/system/${files.school_logo[0].filename}`;
      }

      if (files.school_seal?.[0]) {
        updateFields.push("school_seal = :school_seal");
        replacements.school_seal = `/uploads/system/${files.school_seal[0].filename}`;
      }

      if (files.school_icon?.[0]) {
        updateFields.push("school_icon = :school_icon");
        replacements.school_icon = `/uploads/system/${files.school_icon[0].filename}`;
      }
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "No data provided to update",
      });
    }

    await sequelize.query(
      `
      UPDATE system_settings
      SET
        ${updateFields.join(", ")},
        updated_by = :updated_by,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
      `,
      {
        replacements,
        type: QueryTypes.UPDATE,
      }
    );

    return res.status(200).json({
      status: "success",
      message: "System settings updated successfully",
    });

  } catch (error) {
    console.error("UPDATE SYSTEM SETTINGS ERROR:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};