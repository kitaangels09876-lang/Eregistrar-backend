import { Request, Response } from "express";
import { sequelize } from "../models";
import { QueryTypes } from "sequelize";

export const getAllCourses = async (req: Request, res: Response) => {
  try {
    const courses = await sequelize.query(
      `
      SELECT
        course_id,
        course_code,
        course_name,
        course_description,
        department,
        created_at
      FROM courses
      ORDER BY course_name ASC
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
  try {
    const { courseId } = req.params;
    const {
      course_code,
      course_name,
      course_description,
      department,
    } = req.body;

    if (!courseId) {
      return res.status(400).json({
        status: "error",
        message: "Course ID is required",
      });
    }

    if (!course_code || !course_name) {
      return res.status(400).json({
        status: "error",
        message: "Course code and course name are required",
      });
    }

    const existingCourse: any[] = await sequelize.query(
      `SELECT course_id FROM courses WHERE course_id = :courseId`,
      {
        replacements: { courseId },
        type: QueryTypes.SELECT,
      }
    );

    if (existingCourse.length === 0) {
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
        replacements: { course_code, courseId },
        type: QueryTypes.SELECT,
      }
    );

    if (duplicateCode.length > 0) {
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
          courseId,
          course_code,
          course_name,
          course_description: course_description || null,
          department: department || null,
        },
        type: QueryTypes.UPDATE,
      }
    );

    return res.status(200).json({
      status: "success",
      message: "Course updated successfully",
    });
  } catch (error) {
    console.error("UPDATE COURSE ERROR:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
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