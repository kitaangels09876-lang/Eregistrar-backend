import { Request, Response } from "express";
import { PaymentMethod } from "../models";

export const getAllPaymentMethods = async (req: Request, res: Response) => {
  try {
    const { is_active } = req.query;

    const whereCondition: any = {};

    if (is_active !== undefined) {
      whereCondition.is_active =
        is_active === "1" || is_active === "true" ? true : false;
    }

    const methods = await PaymentMethod.findAll({
      where: whereCondition,
      order: [["created_at", "DESC"]],
    });

    return res.status(200).json({
      status: "success",
      data: methods,
    });
  } catch (error) {
    console.error("GET PAYMENT METHODS ERROR:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

export const getPaymentMethodById = async (req: Request, res: Response) => {
  try {
    const methodId = Number(req.params.methodId);

    const method = await PaymentMethod.findOne({
      where: { method_id: methodId },
    });

    if (!method) {
      return res.status(404).json({
        status: "error",
        message: "Payment method not found",
      });
    }

    return res.status(200).json({
      status: "success",
      data: method,
    });
  } catch (error) {
    console.error("GET PAYMENT METHOD BY ID ERROR:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

export const createPaymentMethod = async (req: Request, res: Response) => {
  try {
    const { method_name, send_to, sender_name } = req.body;
    const existingSendTo = await PaymentMethod.findOne({
      where: { send_to },
    });

    if (existingSendTo) {
      return res.status(400).json({
        status: "error",
        message: "send_to already exists. Use a different number/account.",
      });
    }

    const method = await PaymentMethod.create({
      method_name,
      send_to,
      sender_name,
      is_active: true, 
    });

    return res.status(201).json({
      status: "success",
      message: "Payment method created successfully",
      data: method,
    });
  } catch (error) {
    console.error("CREATE PAYMENT METHOD ERROR:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};



export const updatePaymentMethod = async (req: Request, res: Response) => {
  try {
    const methodId = Number(req.params.methodId);
    const { method_name, send_to, sender_name, is_active } = req.body;

    const method = await PaymentMethod.findByPk(methodId);

    if (!method) {
      return res.status(404).json({
        status: "error",
        message: "Payment method not found",
      });
    }

    if (send_to) {
      const existingSendTo = await PaymentMethod.findOne({
        where: { send_to },
      });

      if (existingSendTo && existingSendTo.method_id !== method.method_id) {
        return res.status(400).json({
          status: "error",
          message: "send_to already exists. Use a different number/account.",
        });
      }
    }

    await method.update({
      method_name: method_name ?? method.method_name,
      send_to: send_to ?? method.send_to,
      sender_name: sender_name ?? method.sender_name,
      is_active: is_active ?? method.is_active,
    });

    return res.status(200).json({
      status: "success",
      message: "Payment method updated successfully",
      data: method,
    });
  } catch (error) {
    console.error("UPDATE PAYMENT METHOD ERROR:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};
