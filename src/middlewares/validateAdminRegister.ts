import { Request, Response, NextFunction } from "express";

export const validateAdminRegister = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let {
    email,
    password,
    role,
    first_name,
    middle_name,
    last_name,
    contact_number,
  } = req.body;

  const errors: { field: string; message: string }[] = [];

  if (email !== undefined) email = String(email);
  if (password !== undefined) password = String(password);
  if (role !== undefined) role = String(role);
  if (first_name !== undefined) first_name = String(first_name);
  if (middle_name !== undefined) middle_name = String(middle_name);
  if (last_name !== undefined) last_name = String(last_name);
  if (contact_number !== undefined) contact_number = String(contact_number);

  if (!email?.trim()) {
    errors.push({ field: "email", message: "Email is required" });
  } else if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
    errors.push({ field: "email", message: "Invalid email format" });
  } else if (email.length > 255) {
    errors.push({ field: "email", message: "Email too long" });
  }


  if (!password) {
    errors.push({ field: "password", message: "Password is required" });
  } else {
    if (password.length < 8)
      errors.push({ field: "password", message: "Minimum 8 characters" });
    if (password.length > 100)
      errors.push({ field: "password", message: "Password too long" });
    if (!/[A-Z]/.test(password))
      errors.push({ field: "password", message: "Must contain uppercase letter" });
    if (!/[a-z]/.test(password))
      errors.push({ field: "password", message: "Must contain lowercase letter" });
    if (!/[0-9]/.test(password))
      errors.push({ field: "password", message: "Must contain number" });
    if (!/[^A-Za-z0-9]/.test(password))
      errors.push({ field: "password", message: "Must contain special character" });
  }

  if (!role?.trim()) {
    errors.push({ field: "role", message: "Role is required" });
  } else if (!["admin", "registrar"].includes(role.trim().toLowerCase())) {
    errors.push({
      field: "role",
      message: "Role must be admin or registrar",
    });
  }


  if (!first_name?.trim()) {
    errors.push({ field: "first_name", message: "First name is required" });
  } else if (!/^[A-Za-z\s-]+$/.test(first_name)) {
    errors.push({
      field: "first_name",
      message: "Only letters, spaces, hyphens allowed",
    });
  }

  if (middle_name && !/^[A-Za-z\s-]*$/.test(middle_name)) {
    errors.push({
      field: "middle_name",
      message: "Only letters, spaces, hyphens allowed",
    });
  }

  if (!last_name?.trim()) {
    errors.push({ field: "last_name", message: "Last name is required" });
  } else if (!/^[A-Za-z\s-]+$/.test(last_name)) {
    errors.push({
      field: "last_name",
      message: "Only letters, spaces, hyphens allowed",
    });
  }

  if (!contact_number) {
    errors.push({
      field: "contact_number",
      message: "Contact number is required",
    });
  } else {
    const digits = contact_number.replace(/\D/g, "");
    if (digits.length !== 11) {
      errors.push({
        field: "contact_number",
        message: "Contact number must be exactly 11 digits",
      });
    }
  }


  if (errors.length > 0) {
    return res.status(400).json({
      status: "error",
      message: "Validation failed",
      errors,
    });
  }

  req.body.email = email.trim();
  req.body.role = role.trim().toLowerCase();
  req.body.first_name = first_name.trim();
  req.body.middle_name = middle_name?.trim() || null;
  req.body.last_name = last_name.trim();
  req.body.contact_number = contact_number.trim();

  next();
};
