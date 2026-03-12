  import { Request, Response } from "express";
  import { User, Admin, Role, sequelize,StudentProfile } from "../models";
  import { QueryTypes } from "sequelize"; 
  import bcrypt from "bcryptjs";
  import { generateToken } from '../config/jwt.config';
import { logActivity, getUserIdFromRequest } from "../utils/auditlog.service";


  const setTokenCookie = (res: Response, token: string) => {
    const isProduction = process.env.NODE_ENV === 'production';
    
    res.cookie('token', token, {
      httpOnly: true,       
      secure: isProduction, 
      sameSite: 'strict',   
      maxAge: 60 * 60 * 1000 
    });
  };


export const registerStaff = async (req: Request, res: Response) => {
  try {
    const {
      email,
      password,
      role, 
      first_name,
      middle_name,
      last_name,
      contact_number,
    } = req.body;

    const creatorUserId = getUserIdFromRequest(req);

    if (!creatorUserId) {
      return res.status(401).json({
        status: "error",
        message: "Unauthorized",
      });
    }

    if (!["admin", "registrar"].includes(role)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid role. Allowed roles: admin, registrar",
      });
    }

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(400).json({
        status: "error",
        message: "Email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      email,
      password: hashedPassword,
      account_type: "admin", 
    });

    await Admin.create({
      user_id: user.user_id,
      first_name,
      middle_name,
      last_name,
      contact_number,
    });

    const roleRecord = await Role.findOne({ where: { role_name: role } });
    if (!roleRecord) {
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
      }
    );

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
        role,
      },
    });
  } catch (error) {
    console.error("REGISTER STAFF ERROR:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

export const registerStudent = async (req: Request, res: Response) => {
  const transaction = await sequelize.transaction();

  try {
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

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      await transaction.rollback();
      return res.status(400).json({
        status: "error",
        message: "Email already exists",
      });
    }

    const existingStudent = await StudentProfile.findOne({
      where: { student_number },
    });
    if (existingStudent) {
      await transaction.rollback();
      return res.status(400).json({
        status: "error",
        message: "Student number already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create(
      {
        email,
        password: hashedPassword,
        account_type: "student",
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

    const token = generateToken({
      user_id: user.user_id,
      email: user.email,
      account_type: "student",
      roles: ["student"],
    });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 1000,
    });

    await transaction.commit();

    return res.status(201).json({
      status: "success",
      message: "Student account created successfully",
      user: {
        user_id: user.user_id,
        email: user.email,
        account_type: "student",
      },
      student: {
        student_id: student.student_id,
        student_number: student.student_number,
        first_name: student.first_name,
        last_name: student.last_name,
      },
    });

  } catch (error: any) {
    await transaction.rollback();
    console.error("REGISTER STUDENT ERROR:", error);

    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

  export const login = async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({
          status: "error",
          message: "Email and password are required",
        });
      }

      const user = await User.findOne({ where: { email } });

      if (!user) {
        return res.status(401).json({
          status: "error",
          message: "Invalid email or password",
        });
      }

      if (user.status === "inactive") {
        return res.status(403).json({
          status: "error",
          message: "Your account is inactive. Contact administrator.",
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
      let profile = null;

      if (user.account_type === "student") {
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
      } else if (user.account_type === "admin") {
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
        account_type: user.account_type,
        roles,
      });

      setTokenCookie(res, token);

      return res.status(200).json({
        status: "success",
        message: "Login successful",
        user: {
          user_id: user.user_id,
          email: user.email,
          account_type: user.account_type,
          roles,
          status: user.status,
          created_at: user.created_at,
        },
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
      res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
      });

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

    let profile: any = null;

    if (user.account_type === "student") {
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

    } else if (user.account_type === "admin") {
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
      user,
      roles,
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
