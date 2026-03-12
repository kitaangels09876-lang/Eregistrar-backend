import { Request, Response, NextFunction } from "express";

export const validatePaymentMethod = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { method_name, send_to, sender_name, is_active } = req.body;

  if (!method_name || typeof method_name !== "string") {
    return res.status(400).json({
      status: "error",
      message: "method_name is required and must be a string",
    });
  }

  if (!send_to || typeof send_to !== "string") {
    return res.status(400).json({
      status: "error",
      message: "send_to is required and must be a string",
    });
  }

  if (!sender_name || typeof sender_name !== "string") {
    return res.status(400).json({
      status: "error",
      message: "sender_name is required and must be a string",
    });
  }

  if (
    is_active !== undefined &&
    typeof is_active !== "boolean" &&
    is_active !== 0 &&
    is_active !== 1
  ) {
    return res.status(400).json({
      status: "error",
      message: "is_active must be a boolean",
    });
  }

  next();
};

export const validateUpdatePaymentMethod = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { method_name, send_to, sender_name, is_active } = req.body;

  if (method_name !== undefined && typeof method_name !== "string") {
    return res.status(400).json({
      status: "error",
      message: "method_name must be a string",
    });
  }

  if (send_to !== undefined && typeof send_to !== "string") {
    return res.status(400).json({
      status: "error",
      message: "send_to must be a string",
    });
  }

  if (sender_name !== undefined && typeof sender_name !== "string") {
    return res.status(400).json({
      status: "error",
      message: "sender_name must be a string",
    });
  }

  if (
    is_active !== undefined &&
    typeof is_active !== "boolean" &&
    is_active !== 0 &&
    is_active !== 1
  ) {
    return res.status(400).json({
      status: "error",
      message: "is_active must be a boolean",
    });
  }

  next();
};