import { Request, Response } from "express";
import { sequelize, StudentProfile, User } from "../models";
import {
  ForeignKeyConstraintError,
  QueryTypes,
  UniqueConstraintError,
  ValidationError as SequelizeValidationError,
} from "sequelize";
import {
  sendSingleFieldValidationError,
  sendValidationError,
} from "../utils/validationResponse";

export const getAllStudents = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const search = (req.query.search as string) || "";
    const status = req.query.status as string; 
    const enrollmentStatus = req.query.enrollment_status as string;

    let whereClause = `WHERE u.account_type = 'student'`;
    const replacements: any = { limit, offset };

    if (search) {
      whereClause += `
        AND (
          sp.student_number LIKE :search
          OR sp.first_name LIKE :search
          OR sp.last_name LIKE :search
          OR u.email LIKE :search
        )
      `;
      replacements.search = `%${search}%`;
    }

    if (status) {
      whereClause += ` AND u.status = :status`;
      replacements.status = status;
    }

    if (enrollmentStatus) {
      whereClause += ` AND sp.enrollment_status = :enrollmentStatus`;
      replacements.enrollmentStatus = enrollmentStatus;
    }

    const [countResult]: any = await sequelize.query(
      `
      SELECT COUNT(DISTINCT sp.student_id) AS total
      FROM student_profiles sp
      INNER JOIN users u ON sp.user_id = u.user_id
      ${whereClause}
      `,
      {
        replacements,
        type: QueryTypes.SELECT,
      }
    );

    const totalRecords = countResult.total;
    const totalPages = Math.ceil(totalRecords / limit);

    const students = await sequelize.query(
      `
      SELECT
        sp.student_id,
        sp.student_number,
        CONCAT(
          sp.first_name, ' ',
          IFNULL(sp.middle_name, ''), ' ',
          sp.last_name
        ) AS full_name,
        u.email,
        u.status,
        sp.enrollment_status,
        GROUP_CONCAT(r.role_name SEPARATOR ', ') AS roles,
        sp.created_at
      FROM student_profiles sp
      INNER JOIN users u ON sp.user_id = u.user_id
      LEFT JOIN user_roles ur ON u.user_id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.role_id
      ${whereClause}
      GROUP BY sp.student_id
      ORDER BY sp.created_at DESC
      LIMIT :limit OFFSET :offset
      `,
      {
        replacements,
        type: QueryTypes.SELECT,
      }
    );

    res.status(200).json({
      status: "success",
      pagination: {
        totalRecords,
        totalPages,
        currentPage: page,
        limit,
      },
      data: students,
    });
  } catch (error) {
    console.error("GET ALL STUDENTS ERROR:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch students",
    });
  }
};

export const getStudentById = async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;


    const student: any = await sequelize.query(
      `
      SELECT
        sp.student_id,
        sp.student_number,
        CONCAT(
          sp.first_name, ' ',
          IFNULL(sp.middle_name, ''), ' ',
          sp.last_name,
          IFNULL(CONCAT(' ', sp.extension_name), '')
        ) AS full_name,
        sp.first_name,
        sp.middle_name,
        sp.last_name,
        sp.extension_name,
        sp.birthdate,
        sp.gender,
        sp.contact_number,
        sp.profile_picture,
        sp.year_level,
        sp.enrollment_status,

        u.user_id,
        u.email,
        u.status AS account_status,
        u.created_at AS account_created_at,

        c.course_id,
        c.course_code,
        c.course_name,
        c.department,

        GROUP_CONCAT(r.role_name SEPARATOR ', ') AS roles
      FROM student_profiles sp
      INNER JOIN users u ON sp.user_id = u.user_id
      LEFT JOIN courses c ON sp.course_id = c.course_id
      LEFT JOIN user_roles ur ON u.user_id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.role_id
      WHERE sp.student_id = :studentId
      GROUP BY sp.student_id
      `,
      {
        replacements: { studentId: Number(studentId) },
        type: QueryTypes.SELECT,
      }
    );

    if (!student || student.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Student not found",
      });
    }


    const addresses = await sequelize.query(
      `
      SELECT
        sa.address_type,
        p.province_name,
        m.municipality_name,
        b.barangay_name,
        sa.street,
        sa.postal_code
      FROM student_addresses sa
      INNER JOIN provinces p ON sa.province_id = p.province_id
      INNER JOIN municipalities m ON sa.municipality_id = m.municipality_id
      INNER JOIN barangays b ON sa.barangay_id = b.barangay_id
      WHERE sa.student_id = :studentId
      `,
      {
        replacements: { studentId: Number(studentId) },
        type: QueryTypes.SELECT,
      }
    );


    const guardians = await sequelize.query(
      `
      SELECT
        guardian_type,
        first_name,
        last_name,
        contact_number,
        occupation,
        email
      FROM student_guardians
      WHERE student_id = :studentId
      `,
      {
        replacements: { studentId: Number(studentId) },
        type: QueryTypes.SELECT,
      }
    );

    res.status(200).json({
      status: "success",
      data: {
        student: student[0],
        addresses,
        guardians,
      },
    });
  } catch (error) {
    console.error("GET STUDENT BY ID ERROR:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch student information",
    });
  }
};

export const updateStudent = async (req: Request, res: Response) => {
  const transaction = await sequelize.transaction();

  try {
    const normalizedStudentId = Number(req.params.studentId);

    if (!Number.isInteger(normalizedStudentId) || normalizedStudentId <= 0) {
      await transaction.rollback();
      return sendSingleFieldValidationError(
        res,
        "studentId",
        "We could not identify which student to update. Refresh the page and try again."
      );
    }

    const {
      email,
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
      enrollment_status,
    } = req.body;

    const normalizedEmail =
      email === undefined ? undefined : String(email).trim().toLowerCase();
    const normalizedStudentNumber =
      student_number === undefined ? undefined : String(student_number).trim();
    const normalizedFirstName =
      first_name === undefined ? undefined : String(first_name).trim();
    const normalizedMiddleName =
      middle_name === undefined ? undefined : String(middle_name).trim() || null;
    const normalizedLastName =
      last_name === undefined ? undefined : String(last_name).trim();
    const normalizedExtensionName =
      extension_name === undefined
        ? undefined
        : String(extension_name).trim() || null;
    const normalizedBirthdate =
      birthdate === undefined ? undefined : String(birthdate).trim() || null;
    const normalizedGender =
      gender === undefined
        ? undefined
        : ((String(gender).trim().toLowerCase() || null) as
            | "male"
            | "female"
            | "other"
            | null);
    const normalizedContactNumber =
      contact_number === undefined
        ? undefined
        : String(contact_number).trim() || null;
    const normalizedYearLevel =
      year_level === undefined ? undefined : String(year_level).trim();
    const normalizedEnrollmentStatus =
      enrollment_status === undefined
        ? undefined
        : (String(enrollment_status).trim().toLowerCase() as
            | "enrolled"
            | "graduated"
            | "dropped"
            | "transferred"
            | "alumni");
    const normalizedBirthdateValue =
      normalizedBirthdate === undefined
        ? undefined
        : normalizedBirthdate === null
          ? null
          : new Date(normalizedBirthdate);

    let normalizedCourseId: number | null | undefined = undefined;
    if (course_id !== undefined) {
      if (course_id === null || String(course_id).trim() === "") {
        normalizedCourseId = null;
      } else {
        const parsedCourseId = Number(course_id);

        if (!Number.isInteger(parsedCourseId) || parsedCourseId <= 0) {
          await transaction.rollback();
          return sendSingleFieldValidationError(
            res,
            "course_id",
            "Select a valid course before saving."
          );
        }

        normalizedCourseId = parsedCourseId;
      }
    }

    if (
      normalizedEmail === undefined &&
      normalizedStudentNumber === undefined &&
      normalizedFirstName === undefined &&
      normalizedMiddleName === undefined &&
      normalizedLastName === undefined &&
      normalizedExtensionName === undefined &&
      normalizedBirthdate === undefined &&
      normalizedGender === undefined &&
      normalizedContactNumber === undefined &&
      normalizedCourseId === undefined &&
      normalizedYearLevel === undefined &&
      normalizedEnrollmentStatus === undefined
    ) {
      await transaction.rollback();
      return sendSingleFieldValidationError(
        res,
        "body",
        "Make at least one change before saving this student record."
      );
    }

    const nameRegex = /^[A-Za-z\s.'-]+$/;

    if (normalizedEmail !== undefined) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!normalizedEmail) {
        await transaction.rollback();
        return sendSingleFieldValidationError(
          res,
          "email",
          "Enter the student's email address."
        );
      }

      if (!emailRegex.test(normalizedEmail)) {
        await transaction.rollback();
        return sendSingleFieldValidationError(
          res,
          "email",
          "Enter a valid email address, like name@example.com."
        );
      }
    }

    if (normalizedStudentNumber !== undefined) {
      if (!normalizedStudentNumber) {
        await transaction.rollback();
        return sendSingleFieldValidationError(
          res,
          "student_number",
          "Enter the student's student number."
        );
      }

      if (normalizedStudentNumber.length < 5) {
        await transaction.rollback();
        return sendSingleFieldValidationError(
          res,
          "student_number",
          "Student number must be at least 5 characters long."
        );
      }
    }

    if (normalizedFirstName !== undefined) {
      if (!normalizedFirstName || !nameRegex.test(normalizedFirstName)) {
        await transaction.rollback();
        return sendSingleFieldValidationError(
          res,
          "first_name",
          !normalizedFirstName
            ? "Enter the student's first name."
            : "First name can only use letters, spaces, apostrophes, periods, and hyphens."
        );
      }
    }

    if (normalizedMiddleName !== undefined && normalizedMiddleName !== null) {
      if (!nameRegex.test(normalizedMiddleName)) {
        await transaction.rollback();
        return sendSingleFieldValidationError(
          res,
          "middle_name",
          "Middle name can only use letters, spaces, apostrophes, periods, and hyphens."
        );
      }
    }

    if (normalizedLastName !== undefined) {
      if (!normalizedLastName || !nameRegex.test(normalizedLastName)) {
        await transaction.rollback();
        return sendSingleFieldValidationError(
          res,
          "last_name",
          !normalizedLastName
            ? "Enter the student's last name."
            : "Last name can only use letters, spaces, apostrophes, periods, and hyphens."
        );
      }
    }

    if (
      normalizedExtensionName !== undefined &&
      normalizedExtensionName !== null &&
      !nameRegex.test(normalizedExtensionName)
    ) {
      await transaction.rollback();
      return sendSingleFieldValidationError(
        res,
        "extension_name",
        "Extension name can only use letters, spaces, apostrophes, periods, and hyphens."
      );
    }

    if (normalizedBirthdate !== undefined && normalizedBirthdate !== null) {
      const parsedBirthdate = new Date(normalizedBirthdate);

      if (isNaN(parsedBirthdate.getTime())) {
        await transaction.rollback();
        return sendSingleFieldValidationError(
          res,
          "birthdate",
          "Choose a valid birthdate before saving."
        );
      }
    }

    if (normalizedGender !== undefined && normalizedGender !== null) {
      if (!["male", "female", "other"].includes(normalizedGender)) {
        await transaction.rollback();
        return sendSingleFieldValidationError(
          res,
          "gender",
          "Select Male, Female, or Other."
        );
      }
    }

    if (normalizedContactNumber !== undefined && normalizedContactNumber !== null) {
      const digitsOnly = normalizedContactNumber.replace(/\D/g, "");
      const phoneRegex = /^09\d{9}$/;

      if (!phoneRegex.test(digitsOnly)) {
        await transaction.rollback();
        return sendSingleFieldValidationError(
          res,
          "contact_number",
          "Enter an 11-digit Philippine mobile number, for example 09171234567."
        );
      }
    }

    if (normalizedYearLevel !== undefined && !normalizedYearLevel) {
      await transaction.rollback();
      return sendSingleFieldValidationError(
        res,
        "year_level",
        "Select the student's year level before saving."
      );
    }

    if (normalizedEnrollmentStatus !== undefined) {
      const validEnrollmentStatuses = [
        "enrolled",
        "graduated",
        "dropped",
        "transferred",
        "alumni",
      ];

      if (!validEnrollmentStatuses.includes(normalizedEnrollmentStatus)) {
        await transaction.rollback();
        return sendSingleFieldValidationError(
          res,
          "enrollment_status",
          "Choose a valid enrollment status before saving."
        );
      }
    }

    const [existingStudent]: any = await sequelize.query(
      `
      SELECT sp.student_id, sp.user_id
      FROM student_profiles sp
      WHERE sp.student_id = :studentId
      LIMIT 1
      `,
      {
        replacements: { studentId: normalizedStudentId },
        type: QueryTypes.SELECT,
        transaction,
      }
    );

    if (!existingStudent) {
      await transaction.rollback();
      return res.status(404).json({
        status: "error",
        message: "We could not find the selected student record.",
      });
    }

    if (normalizedEmail !== undefined) {
      const duplicateEmailUser = await User.findOne({
        where: { email: normalizedEmail },
        attributes: ["user_id"],
        transaction,
      });

      if (
        duplicateEmailUser &&
        duplicateEmailUser.user_id !== existingStudent.user_id
      ) {
        await transaction.rollback();
        return sendSingleFieldValidationError(
          res,
          "email",
          "This email address is already used by another account.",
          409,
          "Some details are already in use. Review the highlighted field and try again."
        );
      }
    }

    if (normalizedStudentNumber !== undefined) {
      const duplicateStudent = await StudentProfile.findOne({
        where: { student_number: normalizedStudentNumber },
        attributes: ["student_id"],
        transaction,
      });

      if (
        duplicateStudent &&
        duplicateStudent.student_id !== normalizedStudentId
      ) {
        await transaction.rollback();
        return sendSingleFieldValidationError(
          res,
          "student_number",
          "This student number is already assigned to another student.",
          409,
          "Some details are already in use. Review the highlighted field and try again."
        );
      }
    }

    const userUpdates = {
      ...(normalizedEmail !== undefined && { email: normalizedEmail }),
    };

    if (Object.keys(userUpdates).length > 0) {
      await User.update(userUpdates, {
        where: { user_id: existingStudent.user_id },
        transaction,
      });
    }

    const studentUpdates = {
      ...(normalizedStudentNumber !== undefined && {
        student_number: normalizedStudentNumber,
      }),
      ...(normalizedFirstName !== undefined && {
        first_name: normalizedFirstName,
      }),
      ...(normalizedMiddleName !== undefined && {
        middle_name: normalizedMiddleName,
      }),
      ...(normalizedLastName !== undefined && {
        last_name: normalizedLastName,
      }),
      ...(normalizedExtensionName !== undefined && {
        extension_name: normalizedExtensionName,
      }),
      ...(normalizedBirthdate !== undefined && {
        birthdate: normalizedBirthdateValue,
      }),
      ...(normalizedGender !== undefined && { gender: normalizedGender }),
      ...(normalizedContactNumber !== undefined && {
        contact_number:
          normalizedContactNumber === null
            ? null
            : normalizedContactNumber.replace(/\D/g, ""),
      }),
      ...(normalizedCourseId !== undefined && { course_id: normalizedCourseId }),
      ...(normalizedYearLevel !== undefined && { year_level: normalizedYearLevel }),
      ...(normalizedEnrollmentStatus !== undefined && {
        enrollment_status: normalizedEnrollmentStatus,
      }),
    };

    if (Object.keys(studentUpdates).length > 0) {
      await StudentProfile.update(studentUpdates, {
        where: { student_id: normalizedStudentId },
        transaction,
      });
    }

    await transaction.commit();

    return res.status(200).json({
      status: "success",
      message: "Student account updated successfully",
    });
  } catch (error: any) {
    await transaction.rollback();
    console.error("UPDATE STUDENT ERROR:", error);

    if (
      error instanceof UniqueConstraintError ||
      error?.name === "SequelizeUniqueConstraintError"
    ) {
      const duplicateErrors = [
        error?.fields?.email
          ? {
              field: "email",
              message: "This email address is already used by another account.",
            }
          : null,
        error?.fields?.student_number
          ? {
              field: "student_number",
              message: "This student number is already assigned to another student.",
            }
          : null,
      ].filter(Boolean) as Array<{ field: string; message: string }>;

      return sendValidationError(
        res,
        duplicateErrors.length > 0
          ? duplicateErrors
          : [
              {
                field: "form",
                message: "A student account with those details already exists.",
              },
            ],
        409,
        "Some details are already in use. Review the highlighted fields and try again."
      );
    }

    if (
      error instanceof ForeignKeyConstraintError ||
      error?.name === "SequelizeForeignKeyConstraintError"
    ) {
      return sendSingleFieldValidationError(
        res,
        "course_id",
        "The selected course could not be found. Choose another course and try again."
      );
    }

    if (
      error instanceof SequelizeValidationError ||
      error?.name === "SequelizeValidationError"
    ) {
      const validationErrors =
        error?.errors
          ?.map((item: any) => ({
            field: item?.path || "form",
            message: item?.message || "Invalid value.",
          }))
          .filter(
            (item: { field: string; message: string }) =>
              Boolean(item.field) && Boolean(item.message)
          ) ?? [];

      if (validationErrors.length > 0) {
        return sendValidationError(
          res,
          validationErrors,
          400,
          "Some details need attention before this student can be updated."
        );
      }
    }

    return res.status(500).json({
      status: "error",
      message: "Failed to update student account",
    });
  }
};

export const updateStudentStatus = async (req: Request, res: Response) => {
  try {
    const normalizedStudentId = Number(req.params.studentId);
    const status =
      typeof req.body?.status === "string"
        ? req.body.status.trim().toLowerCase()
        : "";

    if (!Number.isInteger(normalizedStudentId) || normalizedStudentId <= 0) {
      return sendSingleFieldValidationError(
        res,
        "studentId",
        "We could not identify which student to update. Refresh the page and try again."
      );
    }

    if (!status) {
      return sendSingleFieldValidationError(
        res,
        "status",
        "Choose whether the student account should be Active or Inactive."
      );
    }

    const allowedStatuses = ["active", "inactive"];
    if (!allowedStatuses.includes(status)) {
      return sendSingleFieldValidationError(
        res,
        "status",
        "Select either Active or Inactive for the student account."
      );
    }

    const student: any = await sequelize.query(
      `
      SELECT u.user_id
      FROM student_profiles sp
      INNER JOIN users u ON sp.user_id = u.user_id
      WHERE sp.student_id = :studentId
      `,
      {
        replacements: { studentId: normalizedStudentId },
        type: QueryTypes.SELECT,
      }
    );

    if (!student || student.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "We could not find the selected student record.",
      });
    }

    await sequelize.query(
      `
      UPDATE users
      SET status = :status,
          updated_at = NOW()
      WHERE user_id = :userId
      `,
      {
        replacements: {
          status,
          userId: student[0].user_id,
        },
        type: QueryTypes.UPDATE,
      }
    );

    return res.status(200).json({
      status: "success",
      message: "Student account status updated successfully",
      data: {
        student_id: normalizedStudentId,
        new_status: status,
      },
    });
  } catch (error) {
    console.error("UPDATE STUDENT STATUS ERROR:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to update student status",
    });
  }
};

export const validateEmailAvailability = async (
  req: Request,
  res: Response
) => {
  try {
    const email =
      typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";

    if (!email) {
      return sendSingleFieldValidationError(
        res,
        "email",
        "Enter an email address to continue."
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return sendSingleFieldValidationError(
        res,
        "email",
        "Enter a valid email address, like name@example.com."
      );
    }

    const user = await User.findOne({
      where: { email },
      attributes: ["status"],
    });

    if (!user) {
      return res.status(200).json({
        status: "success",
        message: "This email address is available.",
        data: {
          exists: false,
          active: false,
        },
      });
    }

    return res.status(200).json({
      status: "success",
      message:
        user.status === "active"
          ? "This email address is already linked to an active account."
          : "This email address is already linked to an inactive account.",
      data: {
        exists: true,
        active: user.status === "active",
      },
    });

  } catch (error) {
    console.error("EMAIL VALIDATION ERROR:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

export const updateStudentAcademicStatus = async (
  req: Request,
  res: Response
) => {
  const transaction = await sequelize.transaction();

  try {
    const normalizedStudentId = Number(req.params.studentId);
    const { year_level, enrollment_status } = req.body;
    const normalizedYearLevel =
      typeof year_level === "string" ? year_level.trim() : year_level;
    const normalizedEnrollmentStatus =
      typeof enrollment_status === "string"
        ? enrollment_status.trim().toLowerCase()
        : enrollment_status;
    const validEnrollmentStatuses = [
      "enrolled",
      "graduated",
      "dropped",
      "transferred",
      "alumni"
    ];

    if (!Number.isInteger(normalizedStudentId) || normalizedStudentId <= 0) {
      await transaction.rollback();
      return sendSingleFieldValidationError(
        res,
        "studentId",
        "We could not identify which student to update. Refresh the page and try again."
      );
    }

    if (year_level !== undefined && !normalizedYearLevel) {
      await transaction.rollback();
      return sendSingleFieldValidationError(
        res,
        "year_level",
        "Select a year level before saving."
      );
    }

    if (enrollment_status !== undefined && !normalizedEnrollmentStatus) {
      await transaction.rollback();
      return sendSingleFieldValidationError(
        res,
        "enrollment_status",
        "Select an enrollment status before saving."
      );
    }

    if (
      normalizedEnrollmentStatus &&
      !validEnrollmentStatuses.includes(normalizedEnrollmentStatus)
    ) {
      await transaction.rollback();
      return sendSingleFieldValidationError(
        res,
        "enrollment_status",
        "Choose a valid enrollment status before saving."
      ); 
    }

    const [student]: any = await sequelize.query(
      `
      SELECT student_id
      FROM student_profiles
      WHERE student_id = :studentId
      `,
      {
        replacements: { studentId: normalizedStudentId },
        type: QueryTypes.SELECT,
        transaction,
      }
    );

    if (!student) {
      await transaction.rollback();
      return res.status(404).json({
        status: "error",
        message: "We could not find the selected student record.",
      });
    }

    const updates: string[] = [];
    const replacements: any = { studentId: normalizedStudentId };

    if (normalizedYearLevel) {
      updates.push("year_level = :year_level");
      replacements.year_level = normalizedYearLevel;
    }

    if (normalizedEnrollmentStatus) {
      updates.push("enrollment_status = :enrollment_status");
      replacements.enrollment_status = normalizedEnrollmentStatus;
    }

    if (updates.length === 0) {
      await transaction.rollback();
      return sendSingleFieldValidationError(
        res,
        "body",
        "Update at least one academic detail before saving."
      );
    }

    await sequelize.query(
      `
      UPDATE student_profiles
      SET ${updates.join(", ")}, updated_at = NOW()
      WHERE student_id = :studentId
      `,
      {
        replacements,
        type: QueryTypes.UPDATE,
        transaction,
      }
    );


    await sequelize.query(
      `
      INSERT INTO audit_logs (user_id, action, table_name, record_id, new_value)
      VALUES (:userId, 'UPDATE', 'student_profiles', :studentId, :newValue)
      `,
      {
        replacements: {
          userId: (req as any).user.user_id,
          studentId: normalizedStudentId,
          newValue: JSON.stringify({
            year_level: normalizedYearLevel,
            enrollment_status: normalizedEnrollmentStatus,
          }),
        },
        type: QueryTypes.INSERT,
        transaction,
      }
    );
    

    await transaction.commit();

    return res.status(200).json({
      status: "success",
      message: "Student academic status updated successfully",
    });
  } catch (error) {
    await transaction.rollback();
    console.error("UPDATE STUDENT ACADEMIC STATUS ERROR:", error);

    return res.status(500).json({
      status: "error",
      message: "Failed to update student academic status",
    });
  }
};
