import { QueryTypes, Transaction } from "sequelize";

import { sequelize } from "../../models";

let assignmentSchemaReady = false;

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

export class DeanCourseAssignmentConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DeanCourseAssignmentConflictError";
  }
}

const ensureWorkflowAssignmentSchema = async () => {
  if (assignmentSchemaReady) {
    return;
  }

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS workflow_colleges (
      college_id INT AUTO_INCREMENT PRIMARY KEY,
      college_code VARCHAR(50) NULL,
      college_name VARCHAR(255) NOT NULL,
      UNIQUE KEY uniq_workflow_college_code (college_code),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS workflow_departments (
      department_id INT AUTO_INCREMENT PRIMARY KEY,
      college_id INT NOT NULL,
      department_code VARCHAR(50) NULL,
      department_name VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_workflow_department_code (college_id, department_code),
      FOREIGN KEY (college_id) REFERENCES workflow_colleges(college_id)
    ) ENGINE=InnoDB;
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS workflow_course_scopes (
      course_scope_id INT AUTO_INCREMENT PRIMARY KEY,
      course_id INT NOT NULL UNIQUE,
      college_id INT NULL,
      department_id INT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (course_id) REFERENCES courses(course_id),
      FOREIGN KEY (college_id) REFERENCES workflow_colleges(college_id),
      FOREIGN KEY (department_id) REFERENCES workflow_departments(department_id)
    ) ENGINE=InnoDB;
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS workflow_dean_assignments (
      dean_assignment_id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      course_id INT NULL,
      department_id INT NULL,
      college_id INT NULL,
      is_active TINYINT(1) DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(user_id),
      FOREIGN KEY (course_id) REFERENCES courses(course_id),
      FOREIGN KEY (department_id) REFERENCES workflow_departments(department_id),
      FOREIGN KEY (college_id) REFERENCES workflow_colleges(college_id)
    ) ENGINE=InnoDB;
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS workflow_registrar_assignments (
      registrar_assignment_id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      course_id INT NULL,
      department_id INT NULL,
      college_id INT NULL,
      is_active TINYINT(1) DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(user_id),
      FOREIGN KEY (course_id) REFERENCES courses(course_id),
      FOREIGN KEY (department_id) REFERENCES workflow_departments(department_id),
      FOREIGN KEY (college_id) REFERENCES workflow_colleges(college_id)
    ) ENGINE=InnoDB;
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS workflow_college_admin_assignments (
      college_admin_assignment_id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      college_id INT NOT NULL,
      is_active TINYINT(1) DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_workflow_college_admin_assignment (user_id, college_id),
      FOREIGN KEY (user_id) REFERENCES users(user_id),
      FOREIGN KEY (college_id) REFERENCES workflow_colleges(college_id)
    ) ENGINE=InnoDB;
  `);

  assignmentSchemaReady = true;
};

export const listDeanAssignments = async (
  userId: number,
  transaction?: Transaction
) => {
  await ensureWorkflowAssignmentSchema();

  const assignments: Array<{
    course_id: number;
    course_code: string;
    course_name: string;
    department: string | null;
  }> = await sequelize.query(
    `
    SELECT
      wda.course_id,
      c.course_code,
      c.course_name,
      c.department
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
  await ensureWorkflowAssignmentSchema();

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

export const listAssignableDeanCourses = async (currentUserId?: number) => {
  await ensureWorkflowAssignmentSchema();

  const userId =
    Number.isInteger(currentUserId) && Number(currentUserId) > 0
      ? Number(currentUserId)
      : 0;

  const courses: Array<{
    course_id: number;
    course_code: string;
    course_name: string;
    course_description: string | null;
    department: string | null;
    department_id: number | null;
    college_id: number | null;
  }> = await sequelize.query(
    `
    SELECT DISTINCT
      c.course_id,
      c.course_code,
      c.course_name,
      c.course_description,
      c.department,
      wcs.department_id,
      wcs.college_id
    FROM courses c
    INNER JOIN workflow_course_scopes wcs ON wcs.course_id = c.course_id
    WHERE NOT EXISTS (
      SELECT 1
      FROM workflow_dean_assignments wda
      INNER JOIN users u ON u.user_id = wda.user_id
      WHERE wda.is_active = 1
        AND u.deleted_at IS NULL
        AND wda.user_id <> :userId
        AND wda.course_id = c.course_id
    )
    ORDER BY c.course_name ASC
    `,
    {
      replacements: { userId },
      type: QueryTypes.SELECT,
    }
  );

  return courses;
};

export const replaceDeanAssignments = async (
  userId: number,
  courseIds: unknown,
  transaction: Transaction
) => {
  await ensureWorkflowAssignmentSchema();

  const normalizedCourseIds = normalizeCourseIds(courseIds);

  if (normalizedCourseIds.length === 0) {
    await clearDeanAssignments(userId, transaction);
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

  const conflicts: Array<{
    course_code: string;
    course_name: string;
  }> = await sequelize.query(
    `
    SELECT DISTINCT
      assigned.course_code,
      assigned.course_name
    FROM workflow_dean_assignments wda
    INNER JOIN users u ON u.user_id = wda.user_id
    INNER JOIN courses assigned ON assigned.course_id = wda.course_id
    INNER JOIN workflow_course_scopes selected_scope
      ON selected_scope.course_id IN (:courseIds)
    WHERE wda.is_active = 1
      AND u.deleted_at IS NULL
      AND wda.user_id <> :userId
      AND wda.course_id = selected_scope.course_id
    LIMIT 1
    `,
    {
      replacements: { courseIds: normalizedCourseIds, userId },
      type: QueryTypes.SELECT,
      transaction,
    }
  );

  if (conflicts.length > 0) {
    const conflict = conflicts[0];

    throw new DeanCourseAssignmentConflictError(
      `${conflict.course_code} - ${conflict.course_name} is already assigned to another dean.`
    );
  }

  await clearDeanAssignments(userId, transaction);

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

export const listRegistrarAssignments = async (
  userId: number,
  transaction?: Transaction
) => {
  await ensureWorkflowAssignmentSchema();

  const assignments: Array<{
    course_id: number;
    course_code: string;
    course_name: string;
  }> = await sequelize.query(
    `
    SELECT
      wra.course_id,
      c.course_code,
      c.course_name
    FROM workflow_registrar_assignments wra
    INNER JOIN courses c ON c.course_id = wra.course_id
    WHERE wra.user_id = :userId
      AND wra.is_active = 1
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

export const clearRegistrarAssignments = async (
  userId: number,
  transaction: Transaction
) => {
  await ensureWorkflowAssignmentSchema();

  await sequelize.query(
    `
    DELETE FROM workflow_registrar_assignments
    WHERE user_id = :userId
    `,
    {
      replacements: { userId },
      type: QueryTypes.DELETE,
      transaction,
    }
  );
};

export const replaceRegistrarAssignments = async (
  userId: number,
  courseIds: unknown,
  transaction: Transaction
) => {
  await ensureWorkflowAssignmentSchema();

  const normalizedCourseIds = normalizeCourseIds(courseIds);

  await clearRegistrarAssignments(userId, transaction);

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
      "One or more selected registrar courses are missing workflow scope assignments"
    );
  }

  for (const scope of scopes) {
    await sequelize.query(
      `
      INSERT INTO workflow_registrar_assignments (
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
