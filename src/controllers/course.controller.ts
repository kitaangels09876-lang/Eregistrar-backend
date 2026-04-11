import { Request, Response } from "express";
import { sequelize } from "../models";
import { QueryTypes } from "sequelize";
import {
  ensureWorkflowAssignmentSchema,
  setDeanAssignmentForCourse,
} from "../services/auth/staffAssignments.service";

export const getAllCourses = async (req: Request, res: Response) => {
  try {
    await ensureWorkflowAssignmentSchema();

    const courses = await sequelize.query(
      `
      SELECT
        c.course_id,
        c.course_code,
        c.course_name,
        c.course_description,
        c.department,
        c.created_at,
        da.user_id AS dean_user_id,
        du.email AS dean_email,
        TRIM(CONCAT_WS(' ', ap.first_name, ap.middle_name, ap.last_name)) AS dean_name
      FROM courses c
      LEFT JOIN (
        SELECT
          wda.course_id,
          MIN(wda.user_id) AS user_id
        FROM workflow_dean_assignments wda
        INNER JOIN users u ON u.user_id = wda.user_id
        INNER JOIN user_roles ur ON ur.user_id = u.user_id
        INNER JOIN roles r ON r.role_id = ur.role_id
        WHERE wda.is_active = 1
          AND u.deleted_at IS NULL
          AND r.role_name = 'dean'
        GROUP BY wda.course_id
      ) da ON da.course_id = c.course_id
      LEFT JOIN users du ON du.user_id = da.user_id
      LEFT JOIN admin_profiles ap ON ap.user_id = du.user_id
      ORDER BY c.course_name ASC
      `,
      { type: QueryTypes.SELECT }
    );

    return res.status(200).json({
      status: "success",
      data: courses,
    });
  } catch (error) {
    console.error("GET COURSES ERROR:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};


export const updateCourse = async (req: Request, res: Response) => {
  const transaction = await sequelize.transaction();

  try {
    await ensureWorkflowAssignmentSchema();

    const { courseId } = req.params;
    const {
      course_code,
      course_name,
      course_description,
      department,
      dean_user_id,
    } = req.body;
    const hasDeanUserIdInput = Object.prototype.hasOwnProperty.call(
      req.body,
      "dean_user_id"
    );
    const normalizedCourseId = Number(courseId);
    const normalizedDeanUserId =
      dean_user_id === null || dean_user_id === "" || dean_user_id === undefined
        ? null
        : Number(dean_user_id);

    if (!Number.isInteger(normalizedCourseId) || normalizedCourseId <= 0) {
      await transaction.rollback();
      return res.status(400).json({
        status: "error",
        message: "Valid course ID is required",
      });
    }

    if (!course_code || !course_name) {
      await transaction.rollback();
      return res.status(400).json({
        status: "error",
        message: "Course code and course name are required",
      });
    }

    if (
      hasDeanUserIdInput &&
      normalizedDeanUserId !== null &&
      (!Number.isInteger(normalizedDeanUserId) || normalizedDeanUserId <= 0)
    ) {
      await transaction.rollback();
      return res.status(400).json({
        status: "error",
        message: "Select a valid dean account",
      });
    }

    const existingCourse: any[] = await sequelize.query(
      `SELECT course_id FROM courses WHERE course_id = :courseId`,
      {
        replacements: { courseId: normalizedCourseId },
        type: QueryTypes.SELECT,
        transaction,
      }
    );

    if (existingCourse.length === 0) {
      await transaction.rollback();
      return res.status(404).json({
        status: "error",
        message: "Course not found",
      });
    }

    const duplicateCode: any[] = await sequelize.query(
      `
      SELECT course_id 
      FROM courses 
      WHERE course_code = :course_code
        AND course_id != :courseId
      `,
      {
        replacements: { course_code, courseId: normalizedCourseId },
        type: QueryTypes.SELECT,
        transaction,
      }
    );

    if (duplicateCode.length > 0) {
      await transaction.rollback();
      return res.status(400).json({
        status: "error",
        message: "Course code already exists",
      });
    }

    await sequelize.query(
      `
      UPDATE courses
      SET
        course_code = :course_code,
        course_name = :course_name,
        course_description = :course_description,
        department = :department
      WHERE course_id = :courseId
      `,
      {
        replacements: {
          courseId: normalizedCourseId,
          course_code,
          course_name,
          course_description: course_description || null,
          department: department || null,
        },
        type: QueryTypes.UPDATE,
        transaction,
      }
    );

    if (hasDeanUserIdInput) {
      await setDeanAssignmentForCourse(
        normalizedCourseId,
        normalizedDeanUserId,
        transaction
      );
    }

    await transaction.commit();

    return res.status(200).json({
      status: "success",
      message: "Course updated successfully",
    });
  } catch (error: any) {
    await transaction.rollback();
    console.error("UPDATE COURSE ERROR:", error);

    const message =
      error instanceof Error ? error.message : "Internal server error";
    const isValidationError =
      message === "Select a valid dean account" ||
      message.includes("workflow scope") ||
      message.includes("Valid course ID");

    return res.status(isValidationError ? 400 : 500).json({
      status: "error",
      message: isValidationError ? message : "Internal server error",
    });
  }
};

export const createCourse = async (req: Request, res: Response) => {
  try {
    const {
      course_code,
      course_name,
      course_description,
      department,
    } = req.body;

    if (!course_code || !course_name) {
      return res.status(400).json({
        status: "error",
        message: "Course code and course name are required",
      });
    }

    const existing: any[] = await sequelize.query(
      `
      SELECT course_id
      FROM courses
      WHERE course_code = :course_code
      `,
      {
        replacements: { course_code },
        type: QueryTypes.SELECT,
      }
    );

    if (existing.length > 0) {
      return res.status(400).json({
        status: "error",
        message: "Course code already exists",
      });
    }

    const result: any = await sequelize.query(
      `
      INSERT INTO courses (
        course_code,
        course_name,
        course_description,
        department
      ) VALUES (
        :course_code,
        :course_name,
        :course_description,
        :department
      )
      `,
      {
        replacements: {
          course_code,
          course_name,
          course_description: course_description || null,
          department: department || null,
        },
        type: QueryTypes.INSERT,
      }
    );

    return res.status(201).json({
      status: "success",
      message: "Course created successfully",
      data: {
        course_id: result[0],
        course_code,
        course_name,
        course_description: course_description || null,
        department: department || null,
      },
    });
  } catch (error) {
    console.error("CREATE COURSE ERROR:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};
