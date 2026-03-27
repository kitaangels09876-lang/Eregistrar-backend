import { QueryTypes, Transaction } from "sequelize";

import { sequelize } from "../../models";

const normalizeCourseIds = (courseIds: unknown): number[] => {
  if (!Array.isArray(courseIds)) {
    return [];
  }

  return Array.from(
    new Set(
      courseIds
        .map((courseId) => Number(courseId))
        .filter((courseId) => Number.isInteger(courseId) && courseId > 0)
    )
  );
};

export const listDeanAssignments = async (
  userId: number,
  transaction?: Transaction
) => {
  const assignments: Array<{
    course_id: number;
    course_code: string;
    course_name: string;
  }> = await sequelize.query(
    `
    SELECT
      wda.course_id,
      c.course_code,
      c.course_name
    FROM workflow_dean_assignments wda
    INNER JOIN courses c ON c.course_id = wda.course_id
    WHERE wda.user_id = :userId
      AND wda.is_active = 1
    ORDER BY c.course_name ASC
    `,
    {
      replacements: { userId },
      type: QueryTypes.SELECT,
      transaction,
    }
  );

  return assignments;
};

export const clearDeanAssignments = async (
  userId: number,
  transaction: Transaction
) => {
  await sequelize.query(
    `
    DELETE FROM workflow_dean_assignments
    WHERE user_id = :userId
    `,
    {
      replacements: { userId },
      type: QueryTypes.DELETE,
      transaction,
    }
  );
};

export const replaceDeanAssignments = async (
  userId: number,
  courseIds: unknown,
  transaction: Transaction
) => {
  const normalizedCourseIds = normalizeCourseIds(courseIds);

  await clearDeanAssignments(userId, transaction);

  if (normalizedCourseIds.length === 0) {
    return [];
  }

  const scopes: Array<{
    course_id: number;
    department_id: number | null;
    college_id: number | null;
  }> = await sequelize.query(
    `
    SELECT
      course_id,
      department_id,
      college_id
    FROM workflow_course_scopes
    WHERE course_id IN (:courseIds)
    `,
    {
      replacements: { courseIds: normalizedCourseIds },
      type: QueryTypes.SELECT,
      transaction,
    }
  );

  if (scopes.length !== normalizedCourseIds.length) {
    throw new Error(
      "One or more selected dean courses are missing workflow scope assignments"
    );
  }

  for (const scope of scopes) {
    await sequelize.query(
      `
      INSERT INTO workflow_dean_assignments (
        user_id,
        course_id,
        department_id,
        college_id,
        is_active
      ) VALUES (
        :userId,
        :courseId,
        :departmentId,
        :collegeId,
        1
      )
      `,
      {
        replacements: {
          userId,
          courseId: scope.course_id,
          departmentId: scope.department_id,
          collegeId: scope.college_id,
        },
        type: QueryTypes.INSERT,
        transaction,
      }
    );
  }

  return normalizedCourseIds;
};
