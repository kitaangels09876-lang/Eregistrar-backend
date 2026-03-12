import { Request, Response } from "express";
import { Role } from "../models";

export const getAllRoles = async (req: Request, res: Response) => {
  try {
    const roles = await Role.findAll({
      attributes: ["role_id", "role_name", "role_description"],
      order: [["role_name", "ASC"]],
    });

    return res.status(200).json({
      status: "success",
      data: roles,
    });
  } catch (error) {
    console.error("GET ROLES ERROR:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};
