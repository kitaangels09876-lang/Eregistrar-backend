import { Request, Response } from "express";
import { sequelize, Admin as AdminProfile, User } from "../models";
import { QueryTypes, UniqueConstraintError } from "sequelize";

export const getAllAdminAndRegistrarAccounts = async (
  req: Request,
  res: Response
) => {
  const staffRoles = [
    "admin",
    "registrar",
    "dean",
    "college_admin",
    "accounting",
    "treasurer",
  ];

  try {
    const search = (req.query.search as string) || "";
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const countResult: any = await sequelize.query(
      `
      SELECT COUNT(DISTINCT u.user_id) AS total
      FROM users u
      INNER JOIN admin_profiles ap ON ap.user_id = u.user_id
      INNER JOIN user_roles ur ON ur.user_id = u.user_id
      INNER JOIN roles r ON r.role_id = ur.role_id
      WHERE r.role_name IN (:staffRoles)
        AND (
          :search = '' OR
          u.email LIKE :likeSearch OR
          ap.first_name LIKE :likeSearch OR
          ap.last_name LIKE :likeSearch OR
          r.role_name LIKE :likeSearch
        )
      `,
      {
        replacements: {
          search,
          likeSearch: `%${search}%`,
          staffRoles,
        },
        type: QueryTypes.SELECT,
      }
    );

    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit);

    const admins = await sequelize.query(
      `
      SELECT
        u.user_id,
        u.email,
        u.account_type,
        u.status,
        u.created_at,

        ap.admin_id,
        ap.first_name,
        ap.middle_name,
        ap.last_name,
        ap.contact_number,

        GROUP_CONCAT(r.role_name ORDER BY r.role_name SEPARATOR ', ') AS roles

      FROM users u
      INNER JOIN admin_profiles ap 
        ON ap.user_id = u.user_id
      INNER JOIN user_roles ur 
        ON ur.user_id = u.user_id
      INNER JOIN roles r 
        ON r.role_id = ur.role_id

      WHERE r.role_name IN (:staffRoles)
        AND (
          :search = '' OR
          u.email LIKE :likeSearch OR
          ap.first_name LIKE :likeSearch OR
          ap.last_name LIKE :likeSearch OR
          r.role_name LIKE :likeSearch
        )

      GROUP BY u.user_id, ap.admin_id
      ORDER BY u.created_at DESC
      LIMIT :limit OFFSET :offset
      `,
      {
        replacements: {
          search,
          likeSearch: `%${search}%`,
          staffRoles,
          limit,
          offset,
        },
        type: QueryTypes.SELECT,
      }
    );

    return res.status(200).json({
      status: "success",
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
      data: admins,
    });
  } catch (error) {
    console.error("GET ADMIN & REGISTRAR ERROR:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

export const getAdminOrRegistrarById = async (
  req: Request,
  res: Response
) => {
  const staffRoles = [
    "admin",
    "registrar",
    "dean",
    "college_admin",
    "accounting",
    "treasurer",
  ];

  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        status: "error",
        message: "User ID is required"
      });
    }

    const result: any = await sequelize.query(
      `
      SELECT
        u.user_id,
        u.email,
        u.account_type,
        u.status,
        u.created_at,
        u.updated_at,

        ap.admin_id,
        ap.first_name,
        ap.middle_name,
        ap.last_name,
        ap.contact_number,
        ap.created_at AS admin_created_at,
        ap.updated_at AS admin_updated_at,

        GROUP_CONCAT(r.role_name ORDER BY r.role_name SEPARATOR ', ') AS roles

      FROM users u
      INNER JOIN admin_profiles ap
        ON ap.user_id = u.user_id
      INNER JOIN user_roles ur
        ON ur.user_id = u.user_id
      INNER JOIN roles r
        ON r.role_id = ur.role_id

      WHERE u.user_id = :userId
        AND r.role_name IN (:staffRoles)

      GROUP BY u.user_id, ap.admin_id
      LIMIT 1
      `,
      {
        replacements: { userId, staffRoles },
        type: QueryTypes.SELECT
      }
    );

    if (!result || result.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Admin or Registrar not found"
      });
    }

    return res.status(200).json({
      status: "success",
      data: result[0]
    });
  } catch (error) {
    console.error("GET ADMIN/REGISTRAR BY ID ERROR:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error"
    });
  }
};

export const changeAdminOrRegistrarRole = async (
  req: Request,
  res: Response
) => {
  const transaction = await sequelize.transaction();
  const allowedRoles = [
    "admin",
    "registrar",
    "dean",
    "college_admin",
    "accounting",
    "treasurer",
  ];

  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!userId || !role) {
      await transaction.rollback();
      return res.status(400).json({
        status: "error",
        message: "User ID and role are required"
      });
    }

    if (!allowedRoles.includes(role)) {
      await transaction.rollback();
      return res.status(400).json({
        status: "error",
        message: `Invalid role. Allowed values: ${allowedRoles.join(", ")}`
      });
    }

 
    const userExists: any = await sequelize.query(
      `
      SELECT user_id FROM users WHERE user_id = :userId
      `,
      {
        replacements: { userId },
        type: QueryTypes.SELECT,
        transaction
      }
    );

    if (userExists.length === 0) {
      await transaction.rollback();
      return res.status(404).json({
        status: "error",
        message: "User not found"
      });
    }


    const roleResult: any = await sequelize.query(
      `
      SELECT role_id FROM roles WHERE role_name = :role
      `,
      {
        replacements: { role },
        type: QueryTypes.SELECT,
        transaction
      }
    );

    if (roleResult.length === 0) {
      await transaction.rollback();
      return res.status(404).json({
        status: "error",
        message: "Role not found"
      });
    }

    const roleId = roleResult[0].role_id;


    await sequelize.query(
      `
      DELETE ur FROM user_roles ur
      INNER JOIN roles r ON r.role_id = ur.role_id
      WHERE ur.user_id = :userId
        AND r.role_name IN (:allowedRoles)
      `,
      {
        replacements: { userId, allowedRoles },
        type: QueryTypes.DELETE,
        transaction
      }
    );

    await sequelize.query(
      `
      INSERT INTO user_roles (user_id, role_id, assigned_by)
      VALUES (:userId, :roleId, NULL)
      `,
      {
        replacements: { userId, roleId },
        type: QueryTypes.INSERT,
        transaction
      }
    );

    await sequelize.query(
      `
      UPDATE users
      SET account_type = :accountType,
          updated_at = NOW()
      WHERE user_id = :userId
      `,
      {
        replacements: {
          userId,
          accountType: role === "registrar" ? "registrar" : "admin",
        },
        type: QueryTypes.UPDATE,
        transaction,
      }
    );

    await transaction.commit();

    return res.status(200).json({
      status: "success",
      message: `User role successfully changed to ${role}`
    });

  } catch (error) {
    await transaction.rollback();
    console.error("CHANGE ROLE ERROR:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error"
    });
  }
};

export const changeAdminOrRegistrarStatus = async (
  req: Request,
  res: Response
) => {
  const transaction = await sequelize.transaction();
  const staffRoles = [
    "admin",
    "registrar",
    "dean",
    "college_admin",
    "accounting",
    "treasurer",
  ];

  try {
    const { userId } = req.params;
    const { status } = req.body; 

    if (!userId || !status) {
      await transaction.rollback();
      return res.status(400).json({
        status: "error",
        message: "User ID and status are required",
      });
    }

    if (!["active", "inactive"].includes(status)) {
      await transaction.rollback();
      return res.status(400).json({
        status: "error",
        message: "Invalid status. Allowed values: active, inactive",
      });
    }


    const userCheck: any = await sequelize.query(
      `
      SELECT u.user_id
      FROM users u
      INNER JOIN user_roles ur ON ur.user_id = u.user_id
      INNER JOIN roles r ON r.role_id = ur.role_id
      WHERE u.user_id = :userId
        AND r.role_name IN (:staffRoles)
      LIMIT 1
      `,
      {
        replacements: { userId, staffRoles },
        type: QueryTypes.SELECT,
        transaction,
      }
    );

    if (userCheck.length === 0) {
      await transaction.rollback();
      return res.status(404).json({
        status: "error",
        message: "Admin or Registrar not found",
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
        replacements: { status, userId },
        type: QueryTypes.UPDATE,
        transaction,
      }
    );

    await transaction.commit();

    return res.status(200).json({
      status: "success",
      message: `User status successfully changed to ${status}`,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("CHANGE STATUS ERROR:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

export const updateAdminAccount = async (req: Request, res: Response) => {
  const transaction = await sequelize.transaction();

  try {
    const authUser = req.user;

    if (!authUser?.user_id) {
      await transaction.rollback();
      return res.status(401).json({
        status: "error",
        message: "Authentication required",
      });
    }

    const targetUserId = req.params.userId
      ? Number(req.params.userId)
      : authUser.user_id;

    if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
      await transaction.rollback();
      return res.status(400).json({
        status: "error",
        message: "Invalid user ID",
      });
    }

    const {
      email,
      status,
      first_name,
      middle_name,
      last_name,
      contact_number,
    } = req.body;

    const normalizedEmail =
      email === undefined ? undefined : String(email).trim().toLowerCase();
    const normalizedStatus =
      status === undefined
        ? undefined
        : (String(status).trim().toLowerCase() as "active" | "inactive");
    const normalizedFirstName =
      first_name === undefined ? undefined : String(first_name).trim();
    const normalizedMiddleName =
      middle_name === undefined ? undefined : String(middle_name).trim() || null;
    const normalizedLastName =
      last_name === undefined ? undefined : String(last_name).trim();
    const normalizedContactNumber =
      contact_number === undefined
        ? undefined
        : String(contact_number).trim() || null;

    if (
      normalizedEmail === undefined &&
      normalizedStatus === undefined &&
      normalizedFirstName === undefined &&
      normalizedMiddleName === undefined &&
      normalizedLastName === undefined &&
      normalizedContactNumber === undefined
    ) {
      await transaction.rollback();
      return res.status(400).json({
        status: "error",
        message: "No fields provided for update",
      });
    }

    if (normalizedEmail !== undefined) {
      if (!normalizedEmail) {
        await transaction.rollback();
        return res.status(400).json({
          status: "error",
          message: "Please correct the highlighted fields and try again.",
          errors: [
            {
              field: "email",
              message: "Email is required.",
            },
          ],
        });
      }

      if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
        await transaction.rollback();
        return res.status(400).json({
          status: "error",
          message: "Please correct the highlighted fields and try again.",
          errors: [
            {
              field: "email",
              message: "Invalid email format.",
            },
          ],
        });
      }
    }

    if (
      normalizedStatus !== undefined &&
      !["active", "inactive"].includes(normalizedStatus)
    ) {
      await transaction.rollback();
      return res.status(400).json({
        status: "error",
        message: "Invalid status. Allowed values: active, inactive",
      });
    }

    if (normalizedFirstName !== undefined && !normalizedFirstName) {
      await transaction.rollback();
      return res.status(400).json({
        status: "error",
        message: "First name is required",
      });
    }

    if (normalizedLastName !== undefined && !normalizedLastName) {
      await transaction.rollback();
      return res.status(400).json({
        status: "error",
        message: "Last name is required",
      });
    }

    if (normalizedContactNumber !== undefined && normalizedContactNumber !== null) {
      const digits = normalizedContactNumber.replace(/\D/g, "");

      if (digits.length !== 11) {
        await transaction.rollback();
        return res.status(400).json({
          status: "error",
          message: "Contact number must be exactly 11 digits",
        });
      }
    }

    const existingAccount = await User.findByPk(targetUserId, {
      attributes: ["user_id"],
      transaction,
    });

    const existingProfile = await AdminProfile.findOne({
      where: { user_id: targetUserId },
      attributes: ["admin_id"],
      transaction,
    });

    if (!existingAccount || !existingProfile) {
      await transaction.rollback();
      return res.status(404).json({
        status: "error",
        message: "Admin or Registrar not found",
      });
    }

    if (normalizedEmail !== undefined) {
      const duplicateEmailUser = await User.findOne({
        where: { email: normalizedEmail },
        attributes: ["user_id"],
        transaction,
      });

      if (duplicateEmailUser && duplicateEmailUser.user_id !== targetUserId) {
        await transaction.rollback();
        return res.status(409).json({
          status: "error",
          message: "Please correct the highlighted fields and try again.",
          errors: [
            {
              field: "email",
              message: "This email is already registered.",
            },
          ],
        });
      }
    }

    const userUpdates = {
      ...(normalizedEmail !== undefined && { email: normalizedEmail }),
      ...(normalizedStatus !== undefined && { status: normalizedStatus }),
    };

    if (Object.keys(userUpdates).length > 0) {
      await User.update(
        userUpdates,
        {
          where: { user_id: targetUserId },
          transaction,
        }
      );
    }

    const profileUpdates = {
      ...(normalizedFirstName !== undefined && {
        first_name: normalizedFirstName,
      }),
      ...(normalizedMiddleName !== undefined && {
        middle_name: normalizedMiddleName,
      }),
      ...(normalizedLastName !== undefined && {
        last_name: normalizedLastName,
      }),
      ...(normalizedContactNumber !== undefined && {
        contact_number: normalizedContactNumber,
      }),
    };

    if (Object.keys(profileUpdates).length > 0) {
      await AdminProfile.update(
        profileUpdates,
        {
          where: { user_id: targetUserId },
          transaction,
        }
      );
    }

    await transaction.commit();

    return res.status(200).json({
      status: "success",
      message: "Account updated successfully",
    });

  } catch (error: any) {
    await transaction.rollback();
    console.error("UPDATE ADMIN ACCOUNT ERROR:", error);

    if (error instanceof UniqueConstraintError || error?.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({
        status: "error",
        message: "Please correct the highlighted fields and try again.",
        errors: [
          {
            field: "email",
            message: "This email is already registered.",
          },
        ],
      });
    }

    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};
