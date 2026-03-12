import { Request, Response, NextFunction } from "express";

export const validateStudentRegister = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const {
    email,
    password,
    student_number,
    first_name,
    middle_name,
    last_name,
    extension_name,
    birthdate,
    gender,
    contact_number,
    course_id,
    year_level,
  } = req.body;

 
  if (!email || !password || !student_number || !first_name || !last_name) {
    return res.status(400).json({
      status: "error",
      message:
        "Email, password, student number, first name, and last name are required",
    });
  }


  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      status: "error",
      message: "Invalid email format",
    });
  }


  if (typeof password !== "string" || password.length < 8) {
    return res.status(400).json({
      status: "error",
      message: "Password must be at least 8 characters long",
    });
  }

  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).+$/;
  if (!passwordRegex.test(password)) {
    return res.status(400).json({
      status: "error",
      message: "Password must contain at least one letter and one number",
    });
  }


  if (typeof student_number !== "string" || student_number.trim().length < 5) {
    return res.status(400).json({
      status: "error",
      message: "Invalid student number",
    });
  }


  const nameRegex = /^[A-Za-z\s.'-]+$/;

  if (!nameRegex.test(first_name)) {
    return res.status(400).json({
      status: "error",
      message: "Invalid first name",
    });
  }

  if (middle_name && !nameRegex.test(middle_name)) {
    return res.status(400).json({
      status: "error",
      message: "Invalid middle name",
    });
  }

  if (!nameRegex.test(last_name)) {
    return res.status(400).json({
      status: "error",
      message: "Invalid last name",
    });
  }

  if (extension_name && !nameRegex.test(extension_name)) {
    return res.status(400).json({
      status: "error",
      message: "Invalid extension name",
    });
  }

  if (birthdate) {
    const date = new Date(birthdate);
    if (isNaN(date.getTime())) {
      return res.status(400).json({
        status: "error",
        message: "Invalid birthdate",
      });
    }
  }


  const allowedGenders = ["male", "female", "other"];
  if (gender && !allowedGenders.includes(gender)) {
    return res.status(400).json({
      status: "error",
      message: "Invalid gender value",
    });
  }


  if (contact_number) {
    const phoneRegex = /^09\d{9}$/;
    if (!phoneRegex.test(contact_number)) {
      return res.status(400).json({
        status: "error",
        message:
          "Contact number must be a valid 11-digit Philippine mobile number (e.g. 09171234567)",
      });
    }
  }


  if (course_id && (!Number.isInteger(course_id) || course_id <= 0)) {
    return res.status(400).json({
      status: "error",
      message: "Invalid course ID",
    });
  }


  const allowedYearLevels = [
    "1st",
    "2nd",
    "3rd",
    "4th",
    "graduate",
  ];

  if (year_level && !allowedYearLevels.includes(year_level)) {
    return res.status(400).json({
      status: "error",
      message: "Invalid year level",
    });
  }


  next();
};
