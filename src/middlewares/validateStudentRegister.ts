import { Request, Response, NextFunction } from "express";

type ValidationError = {
  field: string;
  message: string;
};

const toTrimmedString = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

export const validateStudentRegister = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const errors: ValidationError[] = [];

  const email = toTrimmedString(req.body.email).toLowerCase();
  const password =
    typeof req.body.password === "string" ? req.body.password : "";
  const student_number = toTrimmedString(req.body.student_number);
  const first_name = toTrimmedString(req.body.first_name);
  const middle_name = toTrimmedString(req.body.middle_name);
  const last_name = toTrimmedString(req.body.last_name);
  const extension_name = toTrimmedString(req.body.extension_name);
  const birthdate = toTrimmedString(req.body.birthdate);
  const gender = toTrimmedString(req.body.gender).toLowerCase();
  const contact_number = toTrimmedString(req.body.contact_number);
  const year_level =
    req.body.year_level === undefined || req.body.year_level === null
      ? ""
      : String(req.body.year_level).trim();

  let normalizedCourseId: number | null = null;

  if (!email) {
    errors.push({ field: "email", message: "Email is required." });
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (email && !emailRegex.test(email)) {
    errors.push({
      field: "email",
      message: "Enter a valid email address.",
    });
  }

  if (!password) {
    errors.push({ field: "password", message: "Password is required." });
  } else if (password.length < 8) {
    errors.push({
      field: "password",
      message: "Password must be at least 8 characters long.",
    });
  }

  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).+$/;
  if (password && !passwordRegex.test(password)) {
    errors.push({
      field: "password",
      message: "Password must contain at least one letter and one number.",
    });
  }

  if (!student_number) {
    errors.push({
      field: "student_number",
      message: "Student number is required.",
    });
  } else if (student_number.length < 5) {
    errors.push({
      field: "student_number",
      message: "Student number must be at least 5 characters long.",
    });
  }

  const nameRegex = /^[A-Za-z\s.'-]+$/;

  if (!first_name) {
    errors.push({
      field: "first_name",
      message: "First name is required.",
    });
  } else if (!nameRegex.test(first_name)) {
    errors.push({
      field: "first_name",
      message:
        "First name can only contain letters, spaces, apostrophes, periods, and hyphens.",
    });
  }

  if (middle_name && !nameRegex.test(middle_name)) {
    errors.push({
      field: "middle_name",
      message:
        "Middle name can only contain letters, spaces, apostrophes, periods, and hyphens.",
    });
  }

  if (!last_name) {
    errors.push({
      field: "last_name",
      message: "Last name is required.",
    });
  } else if (!nameRegex.test(last_name)) {
    errors.push({
      field: "last_name",
      message:
        "Last name can only contain letters, spaces, apostrophes, periods, and hyphens.",
    });
  }

  if (extension_name && !nameRegex.test(extension_name)) {
    errors.push({
      field: "extension_name",
      message:
        "Extension name can only contain letters, spaces, apostrophes, periods, and hyphens.",
    });
  }

  if (birthdate) {
    const date = new Date(birthdate);
    if (isNaN(date.getTime())) {
      errors.push({
        field: "birthdate",
        message: "Birthdate must be a valid date.",
      });
    }
  }

  const allowedGenders = ["male", "female", "other"];
  if (gender && !allowedGenders.includes(gender)) {
    errors.push({
      field: "gender",
      message: "Gender must be one of: male, female, or other.",
    });
  }

  if (contact_number) {
    const normalizedContactNumber = contact_number.replace(/\D/g, "");
    const phoneRegex = /^09\d{9}$/;

    if (!phoneRegex.test(normalizedContactNumber)) {
      errors.push({
        field: "contact_number",
        message:
          "Contact number must be a valid 11-digit Philippine mobile number like 09171234567.",
      });
    } else {
      req.body.contact_number = normalizedContactNumber;
    }
  }

  const course_id = req.body.course_id;
  if (course_id !== undefined && course_id !== null && String(course_id).trim() !== "") {
    const parsedCourseId = Number(course_id);
    if (!Number.isInteger(parsedCourseId) || parsedCourseId <= 0) {
      errors.push({
        field: "course_id",
        message: "Course ID must be a positive whole number.",
      });
    } else {
      normalizedCourseId = parsedCourseId;
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      status: "error",
      message: "Please correct the highlighted fields and try again.",
      errors,
    });
  }

  req.body.email = email;
  req.body.password = password;
  req.body.student_number = student_number;
  req.body.first_name = first_name;
  req.body.middle_name = middle_name || null;
  req.body.last_name = last_name;
  req.body.extension_name = extension_name || null;
  req.body.birthdate = birthdate || null;
  req.body.gender = gender || null;
  req.body.contact_number = req.body.contact_number ?? null;
  req.body.course_id = normalizedCourseId;
  req.body.year_level = year_level || null;

  next();
};
