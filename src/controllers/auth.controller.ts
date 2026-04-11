  import { Request, Response } from "express";
  import { User, Admin, Role, sequelize,StudentProfile } from "../models";
  import {
    ForeignKeyConstraintError,
    QueryTypes,
    UniqueConstraintError,
    ValidationError as SequelizeValidationError,
  } from "sequelize"; 
  import bcrypt from "bcryptjs";
import { generateToken } from '../config/jwt.config';
import { logActivity, getUserIdFromRequest } from "../utils/auditlog.service";
import { resolveEffectiveAccountType } from "../utils/resolveAccountType";
import { getPermissionsForRoles } from "../services/auth/permission.service";
  import {
    buildEmailVerificationUrl,
    generateEmailVerificationToken,
    sendEmailVerificationEmail,
    verifyEmailVerificationToken,
  } from "../services/emailVerification.service";
  import {
    getMailDebugSummary,
    getMailErrorDebugDetails,
    sendEmail,
  } from "../services/mail.service";
import {
  sendSingleFieldValidationError,
  sendValidationError,
} from "../utils/validationResponse";
import {
  findRefreshToken,
  issueRefreshToken,
  revokeRefreshToken,
  revokeRefreshTokenById,
} from "../services/auth/refreshToken.service";
import {
  DeanCourseAssignmentConflictError,
  listDeanAssignments,
  listRegistrarAssignments,
  replaceRegistrarAssignments,
} from "../services/auth/staffAssignments.service";
import { ensureUserSoftDeleteSchema } from "../services/auth/userSoftDelete.service";

const isProductionEnvironment = (): boolean =>
  process.env.NODE_ENV === "production";

  const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error) {
      return error.message;
    }

  return "Unknown error";
  };

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const getVerificationUrlForUser = (userId: number, email: string): string =>
  buildEmailVerificationUrl(
    generateEmailVerificationToken({
      user_id: userId,
      email,
    })
  );

const createAuthTraceId = () =>
  `auth_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const onlyActiveUserWhere = (email: string) => ({
  email,
  deleted_at: null,
});

const buildReleasedEmail = (email: string, userId: number): string => {
  const [localPart, ...domainParts] = email.split("@");
  const domain = domainParts.join("@");
  const suffix = `deleted_${userId}_${Date.now()}`;

  return domain
    ? `${localPart}+${suffix}@${domain}`
    : `${email}+${suffix}`;
};

const releaseSoftDeletedUserEmail = async (
  email: string,
  transaction: any
) => {
  const rows: Array<{ user_id: number; email: string }> = await sequelize.query(
    `
    SELECT user_id, email
    FROM users
    WHERE email = :email
      AND deleted_at IS NOT NULL
    `,
    {
      replacements: { email },
      type: QueryTypes.SELECT,
      transaction,
    }
  );

  for (const row of rows) {
    await sequelize.query(
      `
      UPDATE users
      SET email = :email,
          updated_at = NOW()
      WHERE user_id = :userId
      `,
      {
        replacements: {
          email: buildReleasedEmail(row.email, row.user_id),
          userId: row.user_id,
        },
        type: QueryTypes.UPDATE,
        transaction,
      }
    );
  }
};

const releaseSoftDeletedStudentNumber = async (
  studentNumber: string,
  transaction: any
) => {
  const rows: Array<{ student_id: number }> = await sequelize.query(
    `
    SELECT sp.student_id
    FROM student_profiles sp
    INNER JOIN users u ON sp.user_id = u.user_id
    WHERE sp.student_number = :studentNumber
      AND u.deleted_at IS NOT NULL
    `,
    {
      replacements: { studentNumber },
      type: QueryTypes.SELECT,
      transaction,
    }
  );

  for (const row of rows) {
    await sequelize.query(
      `
      UPDATE student_profiles
      SET student_number = :studentNumber,
          updated_at = NOW()
      WHERE student_id = :studentId
      `,
      {
        replacements: {
          studentNumber: `${row.student_id}-deleted_${Date.now()}`,
          studentId: row.student_id,
        },
        type: QueryTypes.UPDATE,
        transaction,
      }
    );
  }
};

const buildAuthScopes = (
  roles: string[],
  profile: any,
  workflowScope: Record<string, unknown> = {}
) => ({
  roles,
  academic: {
    course_id: profile?.course_id ?? null,
    course_name: profile?.course_name ?? null,
    ...workflowScope,
  },
});

const buildStaffAcademicScope = async (roles: string[], userId: number) => {
  const workflowScope: Record<string, unknown> = {};

  if (roles.includes("dean")) {
    const deanCourses = await listDeanAssignments(userId);
    workflowScope.dean_course_ids = deanCourses.map(
      (assignment) => assignment.course_id
    );
    workflowScope.dean_courses = deanCourses;
  }

  if (roles.includes("registrar")) {
    const registrarCourses = await listRegistrarAssignments(userId);
    workflowScope.registrar_course_ids = registrarCourses.map(
      (assignment) => assignment.course_id
    );
    workflowScope.registrar_courses = registrarCourses;
  }

  return workflowScope;
};


export const registerStaff = async (req: Request, res: Response) => {
  const transaction = await sequelize.transaction();
  const allowedRoles = [
    "admin",
    "registrar",
    "dean",
    "college_admin",
    "treasurer",
  ];

  try {
    await ensureUserSoftDeleteSchema();

    const {
      email,
      password,
      role, 
      first_name,
      middle_name,
      last_name,
      contact_number,
      registrar_course_ids,
    } = req.body;

    const creatorUserId = getUserIdFromRequest(req);

    if (!creatorUserId) {
      await transaction.rollback();
      return res.status(401).json({
        status: "error",
        message: "Unauthorized",
      });
    }

    if (!allowedRoles.includes(role)) {
      await transaction.rollback();
      return res.status(400).json({
        status: "error",
        message: `Invalid role. Allowed roles: ${allowedRoles.join(", ")}`,
      });
    }

    const existing = await User.findOne({
      where: onlyActiveUserWhere(email),
      transaction,
    });
    if (existing) {
      await transaction.rollback();
      return res.status(400).json({
        status: "error",
        message: "Email already exists",
      });
    }

    await releaseSoftDeletedUserEmail(email, transaction);

    const hashedPassword = await bcrypt.hash(password, 10);
    const accountType = role === "registrar" ? "registrar" : "admin";

    const user = await User.create({
      email,
      password: hashedPassword,
      account_type: accountType,
    }, { transaction });

    await Admin.create({
      user_id: user.user_id,
      first_name,
      middle_name,
      last_name,
      contact_number,
    }, { transaction });

    const roleRecord = await Role.findOne({
      where: { role_name: role },
      transaction,
    });
    if (!roleRecord) {
      await transaction.rollback();
      return res.status(400).json({
        status: "error",
        message: "Role not found",
      });
    }

    await sequelize.query(
      `INSERT INTO user_roles (user_id, role_id, assigned_by)
       VALUES (?, ?, ?)`,
      {
        replacements: [user.user_id, roleRecord.role_id, creatorUserId],
        type: QueryTypes.INSERT,
        transaction,
      }
    );

    if (role === "registrar") {
      await replaceRegistrarAssignments(
        user.user_id,
        registrar_course_ids,
        transaction
      );
    }

    await transaction.commit();

    await logActivity({
      userId: creatorUserId,
      action: "CREATE_STAFF_ACCOUNT",
      tableName: "users",
      recordId: user.user_id,
      newValue: {
        email: user.email,
        role,
        created_by: creatorUserId,
      },
      req,
    });

    return res.status(201).json({
      status: "success",
      message: `${role} account created successfully`,
      user: {
        user_id: user.user_id,
        email: user.email,
        account_type: accountType,
        roles: [role],
      },
    });
  } catch (error) {
    if (!(transaction as any).finished) {
      await transaction.rollback();
    }
    console.error("REGISTER STAFF ERROR:", error);

    if (error instanceof DeanCourseAssignmentConflictError) {
      return res.status(409).json({
        status: "error",
        message: error.message,
      });
    }

    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

export const registerStudent = async (req: Request, res: Response) => {
  const authTraceId = createAuthTraceId();
  const transaction = await sequelize.transaction();
  const rollbackTransaction = async () => {
    if (!(transaction as any).finished) {
      await transaction.rollback();
    }
  };

  try {
    await ensureUserSoftDeleteSchema();

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
      year_level
    } = req.body;

    console.info("[auth] Student registration started", {
      trace_id: authTraceId,
      email_domain:
        typeof email === "string" && email.includes("@")
          ? email.split("@").pop()
          : null,
      student_number_configured: Boolean(student_number),
      course_id,
      year_level,
    });

    const existingUser = await User.findOne({
      where: onlyActiveUserWhere(email),
      transaction,
    });
    if (existingUser) {
      await rollbackTransaction();
      return sendSingleFieldValidationError(
        res,
        "email",
        "That email is already registered. Try signing in or use a different email address."
      );
    }

    const [existingStudent]: any = await sequelize.query(
      `
      SELECT sp.student_id
      FROM student_profiles sp
      INNER JOIN users u ON sp.user_id = u.user_id
      WHERE sp.student_number = :studentNumber
        AND u.deleted_at IS NULL
      LIMIT 1
      `,
      {
        replacements: { studentNumber: student_number },
        type: QueryTypes.SELECT,
        transaction,
      }
    );
    if (existingStudent) {
      await rollbackTransaction();
      return sendSingleFieldValidationError(
        res,
        "student_number",
        "That student number is already linked to an existing account."
      );
    }

    await releaseSoftDeletedUserEmail(email, transaction);
    await releaseSoftDeletedStudentNumber(student_number, transaction);

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create(
      {
        email,
        password: hashedPassword,
        account_type: "student",
        status: "inactive",
      },
      { transaction }
    );

    const student = await StudentProfile.create(
      {
        user_id: user.user_id,
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
      },
      { transaction }
    );

    const studentRole = await Role.findOne({
      where: { role_name: "student" },
    });

    if (studentRole) {
      await sequelize.query(
        `INSERT INTO user_roles (user_id, role_id, assigned_by)
         VALUES (:user_id, :role_id, NULL)`,
        {
          replacements: {
            user_id: user.user_id,
            role_id: studentRole.role_id,
          },
          type: QueryTypes.INSERT,
          transaction,
        }
      );
    }

    const verificationUrl = getVerificationUrlForUser(user.user_id, user.email);

    await transaction.commit();

    console.info("[auth] Student registration committed; sending verification email", {
      trace_id: authTraceId,
      user_id: user.user_id,
      student_id: student.student_id,
      email_domain: user.email.split("@").pop() || null,
    });

    try {
      await sendEmailVerificationEmail({
        userId: user.user_id,
        email: user.email,
        firstName: student.first_name,
        debugContext: {
          auth_trace_id: authTraceId,
          registration_flow: "student_register",
        },
      });

      console.info("[auth] Student verification email completed", {
        trace_id: authTraceId,
        user_id: user.user_id,
        student_id: student.student_id,
      });
    } catch (mailError) {
      const emailErrorMessage = getErrorMessage(mailError);

      console.error(
        "REGISTER STUDENT EMAIL DELIVERY ERROR:",
        {
          trace_id: authTraceId,
          user_id: user.user_id,
          student_id: student.student_id,
          error: getMailErrorDebugDetails(mailError),
        }
      );

      return res.status(201).json({
        status: "success",
        message:
          "Student account created, but the verification email could not be sent. Retry the verification email flow after the mail service is available.",
        warning: "Verification email delivery failed.",
        user: {
          user_id: user.user_id,
          email: user.email,
          account_type: "student",
          status: user.status,
        },
        student: {
          student_id: student.student_id,
          student_number: student.student_number,
          first_name: student.first_name,
          last_name: student.last_name,
        },
        ...(isProductionEnvironment()
          ? {}
          : {
              verification_url: verificationUrl,
              email_error: emailErrorMessage,
            }),
      });
    }

    return res.status(201).json({
      status: "success",
      message:
        "Student account created successfully. Please check your email to activate it.",
      user: {
        user_id: user.user_id,
        email: user.email,
        account_type: "student",
        status: user.status,
      },
      student: {
        student_id: student.student_id,
        student_number: student.student_number,
        first_name: student.first_name,
        last_name: student.last_name,
      },
    });

  } catch (error: any) {
    await rollbackTransaction();
    console.error("REGISTER STUDENT ERROR:", error);

    if (
      error instanceof UniqueConstraintError ||
      error?.name === "SequelizeUniqueConstraintError"
    ) {
      const duplicateErrors = [
        error?.fields?.email
          ? {
              field: "email",
              message:
                "That email is already registered. Try signing in or use a different email address.",
            }
          : null,
        error?.fields?.student_number
          ? {
              field: "student_number",
              message:
                "That student number is already linked to an existing account.",
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
        409
      );
    }

    if (
      error instanceof ForeignKeyConstraintError ||
      error?.name === "SequelizeForeignKeyConstraintError"
    ) {
      return sendSingleFieldValidationError(
        res,
        "course_id",
        "The selected course could not be found. Please choose your course again."
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
        return sendValidationError(res, validationErrors);
      }
    }

    return res.status(500).json({
      status: "error",
      message:
        error?.message?.includes("Brevo") ||
        error?.message?.includes("verification")
          ? "Failed to send verification email"
          : "Internal server error",
    });
  }
};

  export const login = async (req: Request, res: Response) => {
    try {
      await ensureUserSoftDeleteSchema();

      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({
          status: "error",
          message: "Email and password are required",
        });
      }

      const user = await User.findOne({ where: { email, deleted_at: null } });

      if (!user) {
        return res.status(401).json({
          status: "error",
          message: "Invalid email or password",
        });
      }

      if (user.status === "inactive") {
        return res.status(403).json({
          status: "error",
          message:
            user.account_type === "student"
              ? "Please verify your email before logging in."
              : "Your account is inactive. Contact administrator.",
        });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        return res.status(401).json({
          status: "error",
          message: "Invalid email or password",
        });
      }

      const userRoles = await sequelize.query(
        `SELECT r.role_name 
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.role_id
        WHERE ur.user_id = ?`,
        {
          replacements: [user.user_id],
          type: QueryTypes.SELECT,
        }
      );

      const roles = userRoles.map((r: any) => r.role_name);
      const permissions = await getPermissionsForRoles(roles);
      const effectiveAccountType = resolveEffectiveAccountType(
        user.account_type,
        roles
      );
      let profile = null;

      if (effectiveAccountType === "student") {
        profile = await sequelize.query(
          `SELECT s.*, c.course_code, c.course_name 
          FROM student_profiles s
          LEFT JOIN courses c ON s.course_id = c.course_id
          WHERE s.user_id = ?`,
          {
            replacements: [user.user_id],
            type: QueryTypes.SELECT,
          }
        );
      } else if (
        ["admin", "registrar"].includes(effectiveAccountType) ||
        roles.some((role) =>
          ["dean", "college_admin", "treasurer"].includes(role)
        )
      ) {
        profile = await sequelize.query(
          `SELECT a.* 
          FROM admin_profiles a 
          WHERE a.user_id = ?`,
          {
            replacements: [user.user_id],
            type: QueryTypes.SELECT,
          }
        );
      }

      profile = profile?.[0] ?? null;

      const token = generateToken({
        user_id: user.user_id,
        email: user.email,
        account_type: effectiveAccountType,
        roles,
        permissions,
      });
      const refreshToken = await issueRefreshToken({
        userId: user.user_id,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"] as string | undefined,
      });
      const scopes = buildAuthScopes(
        roles,
        profile,
        await buildStaffAcademicScope(roles, user.user_id)
      );

      return res.status(200).json({
        status: "success",
        message: "Login successful",
        access_token: token,
        refresh_token: refreshToken,
        expires_in: 60 * 60,
        token,
        user: {
          user_id: user.user_id,
          email: user.email,
          account_type: effectiveAccountType,
          roles,
          permissions,
          status: user.status,
          created_at: user.created_at,
        },
        permissions,
        scopes,
        profile: profile || null,
      });

    } catch (err: any) {
      console.error("LOGIN ERROR:", err);
      return res.status(500).json({
        status: "error",
        message: "Internal server error",
      });
    }
  };


  export const logout = async (req: Request, res: Response) => {
    try {
      const refreshToken =
        typeof req.body?.refresh_token === "string"
          ? req.body.refresh_token.trim()
          : "";

      if (refreshToken) {
        await revokeRefreshToken(refreshToken);
      }

      return res.status(200).json({
        status: "success",
        message: "Logout successful",
      });
    } catch (err: any) {
      console.error("LOGOUT ERROR:", err);
      return res.status(500).json({
        status: "error",
        message: "Internal server error",
      });
    }
  };


export const checkAuth = async (req: Request, res: Response) => {
  try {
    await ensureUserSoftDeleteSchema();

    const authUser = (req as any).user;

    if (!authUser?.user_id) {
      return res.status(401).json({
        status: "error",
        authenticated: false,
        message: "Unauthorized",
      });
    }

    const userId = authUser.user_id;


    const users: any[] = await sequelize.query(
      `
      SELECT 
        user_id,
        email,
        account_type,
        status,
        created_at
      FROM users
      WHERE user_id = :userId
        AND deleted_at IS NULL
      `,
      {
        replacements: { userId },
        type: QueryTypes.SELECT,
      }
    );

    if (!users.length) {
      return res.status(404).json({
        status: "error",
        authenticated: false,
        message: "User not found",
      });
    }

    const user = users[0];

    const rolesResult = await sequelize.query(
      `
      SELECT r.role_name
      FROM user_roles ur
      INNER JOIN roles r ON ur.role_id = r.role_id
      WHERE ur.user_id = :userId
      `,
      {
        replacements: { userId },
        type: QueryTypes.SELECT,
      }
    );

    const roles = rolesResult.map((r: any) => r.role_name);
    const permissions = await getPermissionsForRoles(roles);
    const effectiveAccountType = resolveEffectiveAccountType(
      user.account_type,
      roles
    );

    let profile: any = null;

    if (effectiveAccountType === "student") {
      const students: any[] = await sequelize.query(
        `
        SELECT 
          sp.*,
          c.course_code,
          c.course_name
        FROM student_profiles sp
        LEFT JOIN courses c ON sp.course_id = c.course_id
        WHERE sp.user_id = :userId
        `,
        {
          replacements: { userId },
          type: QueryTypes.SELECT,
        }
      );

      if (students.length) {
        const student = students[0];

        const addresses = await sequelize.query(
          `
          SELECT 
            sa.address_id,
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
            replacements: { studentId: student.student_id },
            type: QueryTypes.SELECT,
          }
        );

        const guardians = await sequelize.query(
          `
          SELECT 
            guardian_id,
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
            replacements: { studentId: student.student_id },
            type: QueryTypes.SELECT,
          }
        );

        profile = {
          ...student,
          addresses,
          guardians,
        };
      }

    } else if (
      ["admin", "registrar"].includes(effectiveAccountType) ||
      roles.some((role) =>
        ["dean", "college_admin", "treasurer"].includes(role)
      )
    ) {
      const admins: any[] = await sequelize.query(
        `
        SELECT *
        FROM admin_profiles
        WHERE user_id = :userId
        `,
        {
          replacements: { userId },
          type: QueryTypes.SELECT,
        }
      );

      profile = admins[0] ?? null;
    }

    return res.status(200).json({
      status: "success",
      authenticated: true,
      user: {
        ...user,
        account_type: effectiveAccountType,
        roles,
        permissions,
      },
      roles,
      permissions,
      scopes: buildAuthScopes(
        roles,
        profile,
        await buildStaffAcademicScope(roles, user.user_id)
      ),
      profile,
    });

  } catch (err) {
    console.error("CHECK AUTH ERROR:", err);
    return res.status(500).json({
      status: "error",
      authenticated: false,
      message: "Internal server error",
    });
  }
};

export const refreshAccessToken = async (req: Request, res: Response) => {
  try {
    await ensureUserSoftDeleteSchema();

    const refreshToken =
      typeof req.body?.refresh_token === "string"
        ? req.body.refresh_token.trim()
        : "";

    if (!refreshToken) {
      return res.status(400).json({
        status: "error",
        message: "refresh_token is required",
      });
    }

    const tokenRow = await findRefreshToken(refreshToken);

    if (!tokenRow) {
      return res.status(401).json({
        status: "error",
        message: "Refresh token is invalid or expired",
      });
    }

    const users: any[] = await sequelize.query(
      `
      SELECT user_id, email, account_type, status, created_at
      FROM users
      WHERE user_id = :userId
        AND deleted_at IS NULL
      LIMIT 1
      `,
      {
        replacements: { userId: tokenRow.user_id },
        type: QueryTypes.SELECT,
      }
    );

    const user = users[0];
    if (!user || user.status !== "active") {
      await revokeRefreshTokenById(tokenRow.refresh_token_id);
      return res.status(401).json({
        status: "error",
        message: "User is inactive or missing",
      });
    }

    const roleRows: any[] = await sequelize.query(
      `
      SELECT r.role_name
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.role_id
      WHERE ur.user_id = :userId
      `,
      {
        replacements: { userId: user.user_id },
        type: QueryTypes.SELECT,
      }
    );

    const roles = roleRows.map((row: any) => row.role_name);
    const permissions = await getPermissionsForRoles(roles);
    const effectiveAccountType = resolveEffectiveAccountType(
      user.account_type,
      roles
    );

    const accessToken = generateToken({
      user_id: user.user_id,
      email: user.email,
      account_type: effectiveAccountType,
      roles,
      permissions,
    });

    const rotatedRefreshToken = await issueRefreshToken({
      userId: user.user_id,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"] as string | undefined,
      rotatedFromId: tokenRow.refresh_token_id,
    });

    await revokeRefreshTokenById(tokenRow.refresh_token_id);

    return res.status(200).json({
      status: "success",
      access_token: accessToken,
      refresh_token: rotatedRefreshToken,
      expires_in: 60 * 60,
      permissions,
      scopes: {
        roles,
      },
    });
  } catch (error) {
    console.error("REFRESH ACCESS TOKEN ERROR:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to refresh access token",
    });
  }
};

const renderVerificationPage = ({
  title,
  message,
  tone,
}: {
  title: string;
  message: string;
  tone: "success" | "error";
}): string => {
  const accentColor = tone === "success" ? "#0f766e" : "#b91c1c";
  const surfaceColor = tone === "success" ? "#ecfdf5" : "#fef2f2";

  return `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${title}</title>
    </head>
    <body style="margin:0;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a;">
      <div style="max-width:560px;margin:60px auto;padding:0 20px;">
        <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;padding:32px;box-shadow:0 10px 30px rgba(15,23,42,0.08);">
          <div style="display:inline-block;padding:6px 12px;border-radius:999px;background:${surfaceColor};color:${accentColor};font-weight:700;font-size:12px;letter-spacing:0.04em;text-transform:uppercase;">
            Email verification
          </div>
          <h1 style="margin:16px 0 12px;font-size:28px;line-height:1.2;">${title}</h1>
          <p style="margin:0;font-size:16px;line-height:1.6;color:#334155;">${message}</p>
        </div>
      </div>
    </body>
  </html>`;
};

export const verifyEmail = async (req: Request, res: Response) => {
  try {
    await ensureUserSoftDeleteSchema();

    const token =
      typeof req.query.token === "string" ? req.query.token.trim() : "";

    if (!token) {
      return res
        .status(400)
        .type("html")
        .send(
          renderVerificationPage({
            title: "Invalid verification link",
            message: "The verification token is missing from this request.",
            tone: "error",
          })
        );
    }

    const payload = verifyEmailVerificationToken(token);

    if (payload.purpose !== "email_verification") {
      return res
        .status(400)
        .type("html")
        .send(
          renderVerificationPage({
            title: "Invalid verification link",
            message: "This verification token is not valid for account activation.",
            tone: "error",
          })
        );
    }

    const user = await User.findOne({
      where: {
        user_id: payload.user_id,
        email: payload.email,
        deleted_at: null,
      },
    });

    if (!user) {
      return res
        .status(404)
        .type("html")
        .send(
          renderVerificationPage({
            title: "Account not found",
            message: "We could not find an account for this verification link.",
            tone: "error",
          })
        );
    }

    if (user.status === "active") {
      return res
        .status(200)
        .type("html")
        .send(
          renderVerificationPage({
            title: "Email already confirmed",
            message: "This account is already active. You can return to the app and log in.",
            tone: "success",
          })
        );
    }

    await user.update({ status: "active" });

    await logActivity({
      userId: user.user_id,
      action: "VERIFY_EMAIL",
      tableName: "users",
      recordId: user.user_id,
      oldValue: { status: "inactive" },
      newValue: { status: "active" },
      req,
    });

    return res
      .status(200)
      .type("html")
      .send(
        renderVerificationPage({
          title: "Email confirmed",
          message: "Your account is now active. You can return to the app and log in.",
          tone: "success",
        })
      );
  } catch (error: any) {
    const isExpiredToken = error?.name === "TokenExpiredError";

    return res
      .status(400)
      .type("html")
      .send(
        renderVerificationPage({
          title: isExpiredToken
            ? "Verification link expired"
            : "Verification failed",
          message: isExpiredToken
            ? "This verification link has expired. Request a new confirmation email and try again."
            : "This verification link is invalid or has already been changed.",
          tone: "error",
        })
      );
  }
};

export const resendVerificationEmail = async (req: Request, res: Response) => {
  try {
    await ensureUserSoftDeleteSchema();

    const email =
      typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";

    if (!email) {
      return res.status(400).json({
        status: "error",
        message: "Email is required",
      });
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid email format",
      });
    }

    const user = await User.findOne({
      where: {
        email,
        account_type: "student",
        deleted_at: null,
      },
    });

    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "Student account not found",
      });
    }

    if (user.status === "active") {
      return res.status(400).json({
        status: "error",
        message: "This account is already active",
      });
    }

    const student = await StudentProfile.findOne({
      where: { user_id: user.user_id },
      attributes: ["first_name"],
    });

    const verificationUrl = getVerificationUrlForUser(user.user_id, user.email);

    try {
      await sendEmailVerificationEmail({
        userId: user.user_id,
        email: user.email,
        firstName: student?.first_name,
      });
    } catch (mailError) {
      const emailErrorMessage = getErrorMessage(mailError);

      console.error(
        "VERIFICATION EMAIL DELIVERY ERROR:",
        getMailErrorDebugDetails(mailError)
      );

      if (!isProductionEnvironment()) {
        return res.status(200).json({
          status: "success",
          message:
            "Verification email could not be sent. Use the verification URL below in development or retry once the mail service is available.",
          warning: "Verification email delivery failed.",
          verification_url: verificationUrl,
          email_error: emailErrorMessage,
        });
      }

      return res.status(503).json({
        status: "error",
        message: "Failed to send verification email",
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Verification email sent successfully",
    });
  } catch (error) {
    console.error("VERIFICATION EMAIL ERROR:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to send verification email",
    });
  }
};

export const testMailConnection = async (req: Request, res: Response) => {
  try {
    const authenticatedEmail =
      typeof req.user?.email === "string" ? req.user.email.trim().toLowerCase() : "";
    const requestedEmail =
      typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const email = requestedEmail || authenticatedEmail;

    if (!email) {
      return res.status(400).json({
        status: "error",
        message: "Email address is required for mail test delivery.",
      });
    }

    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({
        status: "error",
        message: "Enter a valid email address for mail testing.",
      });
    }

    const mailSummary = getMailDebugSummary();

    await sendEmail({
      to: email,
      subject: "eRegistrar mail test email",
      text: `Hello,

This is a test email from eRegistrar.

Sent at: ${new Date().toISOString()}
Transport: ${mailSummary.transport}
From address: ${mailSummary.sender_email || "not configured"}
`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #1f2937;">
          <h2 style="margin-bottom: 16px;">eRegistrar mail test email</h2>
          <p style="margin-bottom: 16px;">Hello,</p>
          <p style="margin-bottom: 16px;">This is a test email from eRegistrar.</p>
          <p style="margin-bottom: 8px;"><strong>Sent at:</strong> ${new Date().toISOString()}</p>
          <p style="margin-bottom: 8px;"><strong>Transport:</strong> ${mailSummary.transport}</p>
          <p style="margin-bottom: 8px;"><strong>From address:</strong> ${mailSummary.sender_email || "not configured"}</p>
        </div>
      `,
    });

    return res.status(200).json({
      status: "success",
      message: `Mail test email sent successfully to ${email}.`,
      data: {
        to: email,
        mail: mailSummary,
      },
    });
  } catch (error) {
    const message = getErrorMessage(error);
    const mailSummary = getMailDebugSummary();

    console.error("MAIL TEST EMAIL ERROR:", getMailErrorDebugDetails(error));

    return res.status(503).json({
      status: "error",
      message: "Mail test email failed.",
      error_detail: message,
      data: {
        mail: mailSummary,
      },
    });
  }
};
