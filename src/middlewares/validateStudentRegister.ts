import { Request, Response, NextFunction } from "express";

import { sendValidationError } from "../utils/validationResponse";

type ValidationError = {
  field: string;
  message: string;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_REGEX = /^[A-Za-z\s.'-]+$/;
const PH_MOBILE_REGEX = /^09\d{9}$/;

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
    errors.push({ field: "email", message: "Enter your email address." });
  } else if (!EMAIL_REGEX.test(email)) {
    errors.push({
      field: "email",
      message: "Enter a valid email address, like name@example.com.",
    });
  }

  if (!password) {
    errors.push({
      field: "password",
      message: "Create a password to secure your account.",
    });
  } else if (password.length < 8) {
    errors.push({
      field: "password",
      message: "Use at least 8 characters for your password.",
    });
  } else if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    errors.push({
      field: "password",
      message: "Add at least 1 letter and 1 number to your password.",
    });
  }

  if (!student_number) {
    errors.push({
      field: "student_number",
      message: "Enter your student number.",
    });
  } else if (student_number.length < 5) {
    errors.push({
      field: "student_number",
      message: "Student number should be at least 5 characters.",
    });
  }

  if (!first_name) {
    errors.push({
      field: "first_name",
      message: "Enter your first name.",
    });
  } else if (!NAME_REGEX.test(first_name)) {
    errors.push({
      field: "first_name",
      message:
        "First name can only use letters, spaces, apostrophes, periods, and hyphens.",
    });
  }

  if (middle_name && !NAME_REGEX.test(middle_name)) {
    errors.push({
      field: "middle_name",
      message:
        "Middle name can only use letters, spaces, apostrophes, periods, and hyphens.",
    });
  }

  if (!last_name) {
    errors.push({
      field: "last_name",
      message: "Enter your last name.",
    });
  } else if (!NAME_REGEX.test(last_name)) {
    errors.push({
      field: "last_name",
      message:
        "Last name can only use letters, spaces, apostrophes, periods, and hyphens.",
    });
  }

  if (extension_name && !NAME_REGEX.test(extension_name)) {
    errors.push({
      field: "extension_name",
      message:
        "Extension name can only use letters, spaces, apostrophes, periods, and hyphens.",
    });
  }

  if (!birthdate) {
    errors.push({
      field: "birthdate",
      message: "Select your birthdate.",
    });
  } else {
    const parsedBirthdate = new Date(birthdate);
    const today = new Date();

    if (Number.isNaN(parsedBirthdate.getTime())) {
      errors.push({
        field: "birthdate",
        message: "Choose a valid birthdate.",
      });
    } else if (parsedBirthdate > today) {
      errors.push({
        field: "birthdate",
        message: "Birthdate cannot be in the future.",
      });
    }
  }

  const allowedGenders = ["male", "female", "other"];
  if (!gender) {
    errors.push({
      field: "gender",
      message: "Select your gender.",
    });
  } else if (!allowedGenders.includes(gender)) {
    errors.push({
      field: "gender",
      message: "Select a valid gender option.",
    });
  }

  if (!contact_number) {
    errors.push({
      field: "contact_number",
      message: "Enter your mobile number.",
    });
  } else {
    const normalizedContactNumber = contact_number.replace(/\D/g, "");

    if (!PH_MOBILE_REGEX.test(normalizedContactNumber)) {
      errors.push({
        field: "contact_number",
        message: "Use an 11-digit mobile number like 09171234567.",
      });
    } else {
      req.body.contact_number = normalizedContactNumber;
    }
  }

  const course_id = req.body.course_id;
  if (course_id === undefined || course_id === null || String(course_id).trim() === "") {
    errors.push({
      field: "course_id",
      message: "Select your course.",
    });
  } else {
    const parsedCourseId = Number(course_id);
    if (!Number.isInteger(parsedCourseId) || parsedCourseId <= 0) {
      errors.push({
        field: "course_id",
        message: "Select a valid course from the list.",
      });
    } else {
      normalizedCourseId = parsedCourseId;
    }
  }

  if (!year_level) {
    errors.push({
      field: "year_level",
      message: "Select your year level.",
    });
  }

  if (errors.length > 0) {
    return sendValidationError(res, errors);
  }

  req.body.email = email;
  req.body.password = password;
  req.body.student_number = student_number;
  req.body.first_name = first_name;
  req.body.middle_name = middle_name || null;
  req.body.last_name = last_name;
  req.body.extension_name = extension_name || null;
  req.body.birthdate = birthdate;
  req.body.gender = gender;
  req.body.contact_number = req.body.contact_number ?? null;
  req.body.course_id = normalizedCourseId;
  req.body.year_level = year_level;

  next();
};
