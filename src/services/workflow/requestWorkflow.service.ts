import crypto from "crypto";
import { QueryTypes } from "sequelize";
import { sequelize } from "../../models";
import {
  WORKFLOW_STATUSES,
  WORKFLOW_TRANSITIONS,
  WorkflowStatus,
} from "../../constants/workflow";
import { getPermissionsForRolesSync } from "../../constants/permissions";
import { WorkflowRequestPayload } from "../../types/workflow";
import { generateClaimStubPdf } from "./claimStubPdf.service";
import { generateRequestFormPdf } from "./requestFormPdf.service";
import { createNotification } from "../notification.service";
import { logActivity } from "../../utils/auditlog.service";

let schemaReady = false;

type AuthUser = {
  user_id: number;
  account_type: string;
  roles?: string[];
};

const STAFF_ROLES = [
  "admin",
  "registrar",
  "dean",
  "college_admin",
  "accounting",
  "treasurer",
] as const;

const PAYMENT_VISIBLE_STATUSES: WorkflowStatus[] = [
  "AWAITING_PAYMENT",
  "PAYMENT_CONFIRMED",
  "FOR_PROCESSING",
];

const TARGET_STATUS_ROLE_RULES: Partial<Record<WorkflowStatus, string[]>> = {
  UNDER_REGISTRAR_REVIEW: ["registrar", "admin"],
  AWAITING_DEAN_APPROVAL: ["registrar", "admin"],
  DEAN_APPROVED: ["dean", "admin"],
  AWAITING_COLLEGE_ADMIN_REVIEW: ["dean", "admin"],
  COLLEGE_ADMIN_APPROVED: ["college_admin", "admin"],
  FEE_ASSESSED: ["registrar", "admin"],
  AWAITING_PAYMENT: ["registrar", "admin"],
  PAYMENT_CONFIRMED: ["treasurer", "accounting", "admin"],
  FOR_PROCESSING: ["treasurer", "accounting", "admin"],
  DOCUMENT_PREPARING: ["registrar", "admin"],
  READY_FOR_RELEASE: ["registrar", "admin"],
  OUT_FOR_DELIVERY: ["registrar", "admin"],
  RELEASED: ["registrar", "admin"],
  CLAIMED: ["registrar", "admin"],
  COMPLETED: ["registrar", "admin"],
};

const normalizeRoles = (roles: string[] = []) =>
  roles.map((role) => role.trim().toLowerCase()).filter(Boolean);

const parseJsonField = <T>(value: any, fallback: T): T => {
  if (!value) {
    return fallback;
  }

  if (typeof value === "object") {
    return value as T;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

const createWorkflowAuditLog = async ({
  userId,
  action,
  workflowRequestId,
  oldValue,
  newValue,
}: {
  userId: number;
  action: string;
  workflowRequestId: number;
  oldValue?: Record<string, any> | null;
  newValue?: Record<string, any> | null;
}) => {
  await logActivity({
    userId,
    action,
    tableName: "workflow_requests",
    recordId: workflowRequestId,
    oldValue: oldValue || null,
    newValue: newValue || null,
  });
};

const createWorkflowNotification = async ({
  userId,
  title,
  message,
  status,
}: {
  userId: number | null | undefined;
  title: string;
  message: string;
  status: string;
}) => {
  if (!userId) {
    return;
  }

  await createNotification({
    userId,
    title,
    message,
    type: "request_update",
    status,
  });
};

const insertApprovalRecord = async ({
  workflowRequestId,
  approvalStage,
  status,
  actedByUserId,
  remarks,
}: {
  workflowRequestId: number;
  approvalStage: string;
  status: string;
  actedByUserId: number;
  remarks?: string | null;
}) => {
  await sequelize.query(
    `
    INSERT INTO workflow_request_approvals (
      workflow_request_id,
      approval_stage,
      status,
      acted_by_user_id,
      remarks,
      acted_at
    ) VALUES (
      :workflowRequestId,
      :approvalStage,
      :status,
      :actedByUserId,
      :remarks,
      NOW()
    )
    `,
    {
      replacements: {
        workflowRequestId,
        approvalStage,
        status,
        actedByUserId,
        remarks: remarks || null,
      },
      type: QueryTypes.INSERT,
    }
  );
};

const insertFeeAssessmentRecord = async ({
  workflowRequestId,
  assessedByUserId,
  assessment,
}: {
  workflowRequestId: number;
  assessedByUserId: number;
  assessment: Record<string, any>;
}) => {
  const [versionRow]: any[] = await sequelize.query(
    `
    SELECT COALESCE(MAX(assessment_version), 0) + 1 AS nextVersion
    FROM workflow_fee_assessments
    WHERE workflow_request_id = :workflowRequestId
    `,
    {
      replacements: { workflowRequestId },
      type: QueryTypes.SELECT,
    }
  );

  await sequelize.query(
    `
    INSERT INTO workflow_fee_assessments (
      workflow_request_id,
      assessment_version,
      base_fee,
      quantity,
      policy_type,
      discount_amount,
      waiver_amount,
      surcharge_amount,
      final_fee,
      currency,
      assessment_notes,
      assessed_by_user_id,
      assessed_at
    ) VALUES (
      :workflowRequestId,
      :assessmentVersion,
      :baseFee,
      :quantity,
      :policyType,
      :discountAmount,
      :waiverAmount,
      :surchargeAmount,
      :finalFee,
      :currency,
      :assessmentNotes,
      :assessedByUserId,
      NOW()
    )
    `,
    {
      replacements: {
        workflowRequestId,
        assessmentVersion: Number(versionRow?.nextVersion || 1),
        baseFee: Number(assessment.base_fee ?? assessment.assessed_fee ?? 0),
        quantity: Number(assessment.quantity ?? 1),
        policyType: assessment.policy_type || "ALWAYS_PAID",
        discountAmount: Number(assessment.discount_amount ?? 0),
        waiverAmount: Number(assessment.waiver_amount ?? 0),
        surchargeAmount: Number(assessment.surcharge_amount ?? 0),
        finalFee: Number(assessment.final_fee ?? assessment.assessed_fee ?? 0),
        currency: assessment.currency || "PHP",
        assessmentNotes: assessment.notes || null,
        assessedByUserId,
      },
      type: QueryTypes.INSERT,
    }
  );
};

const upsertReleaseRecord = async ({
  workflowRequestId,
  releaseSnapshot,
  actedByUserId,
}: {
  workflowRequestId: number;
  releaseSnapshot: Record<string, any>;
  actedByUserId: number;
}) => {
  const [generatedDocument]: any[] = await sequelize.query(
    `
    SELECT workflow_generated_document_id
    FROM workflow_generated_documents
    WHERE workflow_request_id = :workflowRequestId
    ORDER BY version_number DESC
    LIMIT 1
    `,
    {
      replacements: { workflowRequestId },
      type: QueryTypes.SELECT,
    }
  );

  const [existing]: any[] = await sequelize.query(
    `
    SELECT workflow_release_record_id
    FROM workflow_release_records
    WHERE workflow_request_id = :workflowRequestId
    LIMIT 1
    `,
    {
      replacements: { workflowRequestId },
      type: QueryTypes.SELECT,
    }
  );

  if (existing?.workflow_release_record_id) {
    await sequelize.query(
      `
      UPDATE workflow_release_records
      SET
        workflow_generated_document_id = :generatedDocumentId,
        release_method = :releaseMethod,
        release_status = :releaseStatus,
        prepared_by_user_id = COALESCE(prepared_by_user_id, :actedByUserId),
        released_by_user_id = :releasedByUserId,
        released_at = :releasedAt,
        recipient_name = :recipientName,
        recipient_email = :recipientEmail,
        authorized_representative_name = :authorizedRepresentativeName,
        authorized_representative_id_type = :authorizedRepresentativeIdType,
        authorized_representative_id_number = :authorizedRepresentativeIdNumber,
        courier_name = :courierName,
        tracking_number = :trackingNumber,
        dispatch_at = :dispatchAt,
        delivery_confirmed_at = :deliveryConfirmedAt
      WHERE workflow_release_record_id = :releaseRecordId
      `,
      {
        replacements: {
          releaseRecordId: existing.workflow_release_record_id,
          generatedDocumentId: generatedDocument?.workflow_generated_document_id || null,
          releaseMethod: releaseSnapshot.release_method || "pickup",
          releaseStatus: releaseSnapshot.release_status || "PENDING",
          actedByUserId,
          releasedByUserId: releaseSnapshot.released_by_user_id || actedByUserId,
          releasedAt: releaseSnapshot.date_released || null,
          recipientName: releaseSnapshot.recipient_name || releaseSnapshot.claimant_name || null,
          recipientEmail: releaseSnapshot.receiver_email || null,
          authorizedRepresentativeName:
            releaseSnapshot.authorized_representative_name || null,
          authorizedRepresentativeIdType:
            releaseSnapshot.authorized_representative_id_type || null,
          authorizedRepresentativeIdNumber:
            releaseSnapshot.authorized_representative_id_number || null,
          courierName: releaseSnapshot.courier_name || null,
          trackingNumber: releaseSnapshot.tracking_number || null,
          dispatchAt: releaseSnapshot.dispatched_at || null,
          deliveryConfirmedAt: releaseSnapshot.completed_at || null,
        },
        type: QueryTypes.UPDATE,
      }
    );

    return Number(existing.workflow_release_record_id);
  }

  const [insertResult]: any = await sequelize.query(
    `
    INSERT INTO workflow_release_records (
      workflow_request_id,
      workflow_generated_document_id,
      release_method,
      release_status,
      prepared_by_user_id,
      released_by_user_id,
      released_at,
      recipient_name,
      recipient_email,
      authorized_representative_name,
      authorized_representative_id_type,
      authorized_representative_id_number,
      courier_name,
      tracking_number,
      dispatch_at,
      delivery_confirmed_at
    ) VALUES (
      :workflowRequestId,
      :generatedDocumentId,
      :releaseMethod,
      :releaseStatus,
      :preparedByUserId,
      :releasedByUserId,
      :releasedAt,
      :recipientName,
      :recipientEmail,
      :authorizedRepresentativeName,
      :authorizedRepresentativeIdType,
      :authorizedRepresentativeIdNumber,
      :courierName,
      :trackingNumber,
      :dispatchAt,
      :deliveryConfirmedAt
    )
    `,
    {
      replacements: {
        workflowRequestId,
        generatedDocumentId: generatedDocument?.workflow_generated_document_id || null,
        releaseMethod: releaseSnapshot.release_method || "pickup",
        releaseStatus: releaseSnapshot.release_status || "PENDING",
        preparedByUserId: actedByUserId,
        releasedByUserId: actedByUserId,
        releasedAt: releaseSnapshot.date_released || null,
        recipientName: releaseSnapshot.recipient_name || releaseSnapshot.claimant_name || null,
        recipientEmail: releaseSnapshot.receiver_email || null,
        authorizedRepresentativeName:
          releaseSnapshot.authorized_representative_name || null,
        authorizedRepresentativeIdType:
          releaseSnapshot.authorized_representative_id_type || null,
        authorizedRepresentativeIdNumber:
          releaseSnapshot.authorized_representative_id_number || null,
        courierName: releaseSnapshot.courier_name || null,
        trackingNumber: releaseSnapshot.tracking_number || null,
        dispatchAt: releaseSnapshot.dispatched_at || null,
        deliveryConfirmedAt: releaseSnapshot.completed_at || null,
      },
      type: QueryTypes.INSERT,
    }
  );

  return Number(insertResult);
};

const insertReleaseLog = async ({
  workflowRequestId,
  workflowReleaseRecordId,
  eventType,
  remarks,
  metadata,
  actedByUserId,
}: {
  workflowRequestId: number;
  workflowReleaseRecordId?: number | null;
  eventType: string;
  remarks?: string | null;
  metadata?: Record<string, any>;
  actedByUserId: number;
}) => {
  await sequelize.query(
    `
    INSERT INTO workflow_release_claim_logs (
      workflow_request_id,
      workflow_release_record_id,
      event_type,
      remarks,
      metadata_json,
      acted_by_user_id,
      acted_at
    ) VALUES (
      :workflowRequestId,
      :workflowReleaseRecordId,
      :eventType,
      :remarks,
      :metadataJson,
      :actedByUserId,
      NOW()
    )
    `,
    {
      replacements: {
        workflowRequestId,
        workflowReleaseRecordId: workflowReleaseRecordId || null,
        eventType,
        remarks: remarks || null,
        metadataJson: JSON.stringify(metadata || {}),
        actedByUserId,
      },
      type: QueryTypes.INSERT,
    }
  );
};

const WORKFLOW_ACTION_RULES: Record<
  string,
  { roles: string[]; currentStatuses: WorkflowStatus[] }
> = {
  registrar_verification: {
    roles: ["registrar", "admin"],
    currentStatuses: ["SUBMITTED", "UNDER_REGISTRAR_REVIEW"],
  },
  dean_approve: {
    roles: ["dean", "admin"],
    currentStatuses: ["AWAITING_DEAN_APPROVAL"],
  },
  college_admin_approve: {
    roles: ["college_admin", "admin"],
    currentStatuses: ["AWAITING_COLLEGE_ADMIN_REVIEW"],
  },
  fee_assess: {
    roles: ["registrar", "admin"],
    currentStatuses: ["COLLEGE_ADMIN_APPROVED"],
  },
  payment_confirm: {
    roles: ["treasurer", "accounting", "admin"],
    currentStatuses: ["AWAITING_PAYMENT"],
  },
  document_prepare: {
    roles: ["registrar", "admin"],
    currentStatuses: ["FOR_PROCESSING"],
  },
  document_finalize: {
    roles: ["registrar", "admin"],
    currentStatuses: ["DOCUMENT_PREPARING"],
  },
  release_dispatch: {
    roles: ["registrar", "admin"],
    currentStatuses: ["READY_FOR_RELEASE"],
  },
  release_email: {
    roles: ["registrar", "admin"],
    currentStatuses: ["READY_FOR_RELEASE"],
  },
  release_claim: {
    roles: ["registrar", "admin"],
    currentStatuses: ["READY_FOR_RELEASE"],
  },
  release_complete: {
    roles: ["registrar", "admin"],
    currentStatuses: ["OUT_FOR_DELIVERY", "RELEASED", "CLAIMED"],
  },
};

const ensureWorkflowSchema = async () => {
  if (schemaReady) {
    return;
  }

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS workflow_colleges (
      college_id INT AUTO_INCREMENT PRIMARY KEY,
      college_code VARCHAR(50) NULL,
      college_name VARCHAR(255) NOT NULL,
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
    CREATE TABLE IF NOT EXISTS workflow_college_admin_assignments (
      college_admin_assignment_id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      college_id INT NOT NULL,
      is_active TINYINT(1) DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(user_id),
      FOREIGN KEY (college_id) REFERENCES workflow_colleges(college_id)
    ) ENGINE=InnoDB;
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS workflow_requests (
      workflow_request_id INT AUTO_INCREMENT PRIMARY KEY,
      request_reference VARCHAR(50) NOT NULL UNIQUE,
      student_id INT NOT NULL,
      student_user_id INT NOT NULL,
      dean_user_id INT NULL,
      college_admin_user_id INT NULL,
      current_status VARCHAR(64) NOT NULL,
      purpose VARCHAR(255) NOT NULL,
      delivery_method VARCHAR(20) NOT NULL,
      form_snapshot_json JSON NOT NULL,
      educational_background_json JSON NOT NULL,
      academic_snapshot_json JSON NOT NULL,
      approval_snapshot_json JSON NULL,
      fee_snapshot_json JSON NULL,
      payment_snapshot_json JSON NULL,
      release_snapshot_json JSON NULL,
      submitted_at DATETIME NOT NULL,
      completed_at DATETIME NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES student_profiles(student_id),
      FOREIGN KEY (student_user_id) REFERENCES users(user_id),
      FOREIGN KEY (dean_user_id) REFERENCES users(user_id),
      FOREIGN KEY (college_admin_user_id) REFERENCES users(user_id)
    ) ENGINE=InnoDB;
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS workflow_request_items (
      workflow_request_item_id INT AUTO_INCREMENT PRIMARY KEY,
      workflow_request_id INT NOT NULL,
      document_type_id INT NOT NULL,
      document_name VARCHAR(255) NOT NULL,
      quantity INT NOT NULL DEFAULT 1,
      base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
      final_price DECIMAL(10,2) NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (workflow_request_id) REFERENCES workflow_requests(workflow_request_id) ON DELETE CASCADE,
      FOREIGN KEY (document_type_id) REFERENCES document_types(document_type_id)
    ) ENGINE=InnoDB;
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS workflow_request_actions (
      workflow_request_action_id INT AUTO_INCREMENT PRIMARY KEY,
      workflow_request_id INT NOT NULL,
      action_role VARCHAR(100) NOT NULL,
      action_type VARCHAR(100) NOT NULL,
      from_status VARCHAR(64) NULL,
      to_status VARCHAR(64) NULL,
      remarks TEXT NULL,
      payload_json JSON NULL,
      acted_by_user_id INT NOT NULL,
      acted_at DATETIME NOT NULL,
      FOREIGN KEY (workflow_request_id) REFERENCES workflow_requests(workflow_request_id) ON DELETE CASCADE,
      FOREIGN KEY (acted_by_user_id) REFERENCES users(user_id)
    ) ENGINE=InnoDB;
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS workflow_request_approvals (
      workflow_request_approval_id INT AUTO_INCREMENT PRIMARY KEY,
      workflow_request_id INT NOT NULL,
      approval_stage VARCHAR(64) NOT NULL,
      status VARCHAR(64) NOT NULL,
      acted_by_user_id INT NOT NULL,
      remarks TEXT NULL,
      acted_at DATETIME NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (workflow_request_id) REFERENCES workflow_requests(workflow_request_id) ON DELETE CASCADE,
      FOREIGN KEY (acted_by_user_id) REFERENCES users(user_id)
    ) ENGINE=InnoDB;
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS workflow_fee_assessments (
      workflow_fee_assessment_id INT AUTO_INCREMENT PRIMARY KEY,
      workflow_request_id INT NOT NULL,
      assessment_version INT NOT NULL,
      base_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
      quantity INT NOT NULL DEFAULT 1,
      policy_type VARCHAR(64) NOT NULL DEFAULT 'ALWAYS_PAID',
      discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
      waiver_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
      surcharge_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
      final_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
      currency VARCHAR(10) NOT NULL DEFAULT 'PHP',
      assessment_notes TEXT NULL,
      assessed_by_user_id INT NOT NULL,
      assessed_at DATETIME NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (workflow_request_id) REFERENCES workflow_requests(workflow_request_id) ON DELETE CASCADE,
      FOREIGN KEY (assessed_by_user_id) REFERENCES users(user_id)
    ) ENGINE=InnoDB;
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS workflow_generated_documents (
      workflow_generated_document_id INT AUTO_INCREMENT PRIMARY KEY,
      workflow_request_id INT NOT NULL,
      version_number INT NOT NULL,
      source_status VARCHAR(64) NOT NULL,
      file_name VARCHAR(255) NOT NULL,
      file_path VARCHAR(255) NOT NULL,
      generated_by_user_id INT NOT NULL,
      generated_at DATETIME NOT NULL,
      FOREIGN KEY (workflow_request_id) REFERENCES workflow_requests(workflow_request_id) ON DELETE CASCADE,
      FOREIGN KEY (generated_by_user_id) REFERENCES users(user_id)
    ) ENGINE=InnoDB;
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS workflow_claim_stubs (
      workflow_claim_stub_id INT AUTO_INCREMENT PRIMARY KEY,
      workflow_request_id INT NOT NULL,
      claim_stub_number VARCHAR(100) NOT NULL UNIQUE,
      claim_stub_status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
      lookup_token_hash VARCHAR(255) NOT NULL,
      file_name VARCHAR(255) NOT NULL,
      file_path VARCHAR(500) NOT NULL,
      generated_at DATETIME NOT NULL,
      used_at DATETIME NULL,
      voided_at DATETIME NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (workflow_request_id) REFERENCES workflow_requests(workflow_request_id) ON DELETE CASCADE
    ) ENGINE=InnoDB;
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS workflow_release_records (
      workflow_release_record_id INT AUTO_INCREMENT PRIMARY KEY,
      workflow_request_id INT NOT NULL,
      workflow_generated_document_id INT NULL,
      release_method VARCHAR(32) NOT NULL,
      release_status VARCHAR(64) NOT NULL,
      prepared_by_user_id INT NULL,
      released_by_user_id INT NULL,
      released_at DATETIME NULL,
      recipient_name VARCHAR(255) NULL,
      recipient_email VARCHAR(255) NULL,
      authorized_representative_name VARCHAR(255) NULL,
      authorized_representative_id_type VARCHAR(100) NULL,
      authorized_representative_id_number VARCHAR(100) NULL,
      courier_name VARCHAR(255) NULL,
      tracking_number VARCHAR(255) NULL,
      dispatch_at DATETIME NULL,
      delivery_confirmed_at DATETIME NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (workflow_request_id) REFERENCES workflow_requests(workflow_request_id) ON DELETE CASCADE,
      FOREIGN KEY (workflow_generated_document_id) REFERENCES workflow_generated_documents(workflow_generated_document_id),
      FOREIGN KEY (prepared_by_user_id) REFERENCES users(user_id),
      FOREIGN KEY (released_by_user_id) REFERENCES users(user_id)
    ) ENGINE=InnoDB;
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS workflow_release_claim_logs (
      workflow_release_claim_log_id INT AUTO_INCREMENT PRIMARY KEY,
      workflow_request_id INT NOT NULL,
      workflow_release_record_id INT NULL,
      event_type VARCHAR(64) NOT NULL,
      remarks TEXT NULL,
      metadata_json JSON NULL,
      acted_by_user_id INT NOT NULL,
      acted_at DATETIME NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (workflow_request_id) REFERENCES workflow_requests(workflow_request_id) ON DELETE CASCADE,
      FOREIGN KEY (workflow_release_record_id) REFERENCES workflow_release_records(workflow_release_record_id) ON DELETE SET NULL,
      FOREIGN KEY (acted_by_user_id) REFERENCES users(user_id)
    ) ENGINE=InnoDB;
  `);

  schemaReady = true;
};

const getRoleNames = (user: AuthUser) => {
  const roles = normalizeRoles(user.roles || []);
  if (roles.length > 0) {
    return roles;
  }

  return [String(user.account_type || "").toLowerCase()].filter(Boolean);
};

const getPrimaryRole = (user: AuthUser) => {
  const roles = getRoleNames(user);
  return STAFF_ROLES.find((role) => roles.includes(role)) || roles[0] || "student";
};

const assertCanViewWorkflowRequest = (
  detail: any,
  user: AuthUser,
  roles: string[]
) => {
  if (roles.includes("admin") || roles.includes("registrar")) {
    return;
  }

  if (roles.includes("student") || user.account_type === "student") {
    if (detail.student_user_id !== user.user_id) {
      throw new Error("You do not have access to this workflow request");
    }
    return;
  }

  if (roles.includes("dean")) {
    if (detail.dean_user_id !== user.user_id) {
      throw new Error("You do not have access to this dean workflow request");
    }
    return;
  }

  if (roles.includes("college_admin")) {
    if (detail.college_admin_user_id !== user.user_id) {
      throw new Error("You do not have access to this college workflow request");
    }
    return;
  }

  if (roles.includes("accounting") || roles.includes("treasurer")) {
    if (!PAYMENT_VISIBLE_STATUSES.includes(detail.current_status as WorkflowStatus)) {
      throw new Error("You do not have access to this payment workflow request");
    }
    return;
  }

  throw new Error("You do not have access to this workflow request");
};

const getRequestReference = async () => {
  const [result]: any[] = await sequelize.query(
    `SELECT COUNT(*) + 1 AS nextNumber FROM workflow_requests`,
    { type: QueryTypes.SELECT }
  );

  return `REQ-${new Date().getFullYear()}-${String(result.nextNumber).padStart(6, "0")}`;
};

const assertCanAdvance = (roles: string[], targetStatus: WorkflowStatus) => {
  const allowedRoles = TARGET_STATUS_ROLE_RULES[targetStatus] || [];

  if (allowedRoles.length > 0 && !roles.some((role) => allowedRoles.includes(role))) {
    throw new Error(`Only ${allowedRoles.join(", ")} can move a request to ${targetStatus}`);
  }
};

const resolveAcademicScope = async (courseId: number | null) => {
  if (!courseId) {
    return {
      college_id: null,
      college_name: null,
      department_id: null,
      department_name: null,
      dean_user_id: null,
      college_admin_user_id: null,
    };
  }

  const [scope]: any[] = await sequelize.query(
    `
    SELECT
      c.course_id,
      c.course_name,
      c.course_code,
      wcs.college_id,
      wc.college_name,
      wcs.department_id,
      wd.department_name
    FROM courses c
    LEFT JOIN workflow_course_scopes wcs ON wcs.course_id = c.course_id
    LEFT JOIN workflow_colleges wc ON wc.college_id = wcs.college_id
    LEFT JOIN workflow_departments wd ON wd.department_id = wcs.department_id
    WHERE c.course_id = :courseId
    `,
    {
      replacements: { courseId },
      type: QueryTypes.SELECT,
    }
  );

  const [dean]: any[] = await sequelize.query(
    `
    SELECT user_id
    FROM workflow_dean_assignments
    WHERE is_active = 1
      AND (course_id = :courseId OR department_id = :departmentId OR college_id = :collegeId)
    ORDER BY
      CASE
        WHEN course_id = :courseId THEN 1
        WHEN department_id = :departmentId THEN 2
        WHEN college_id = :collegeId THEN 3
        ELSE 4
      END
    LIMIT 1
    `,
    {
      replacements: {
        courseId,
        departmentId: scope?.department_id || null,
        collegeId: scope?.college_id || null,
      },
      type: QueryTypes.SELECT,
    }
  );

  const [collegeAdmin]: any[] = await sequelize.query(
    `
    SELECT user_id
    FROM workflow_college_admin_assignments
    WHERE is_active = 1 AND college_id = :collegeId
    LIMIT 1
    `,
    {
      replacements: { collegeId: scope?.college_id || null },
      type: QueryTypes.SELECT,
    }
  );

  return {
    college_id: scope?.college_id || null,
    college_name: scope?.college_name || null,
    department_id: scope?.department_id || null,
    department_name: scope?.department_name || null,
    dean_user_id: dean?.user_id || null,
    college_admin_user_id: collegeAdmin?.user_id || null,
  };
};

const getRequestDetailInternal = async (workflowRequestId: number) => {
  const [request]: any[] = await sequelize.query(
    `
    SELECT *
    FROM workflow_requests
    WHERE workflow_request_id = :workflowRequestId
    `,
    {
      replacements: { workflowRequestId },
      type: QueryTypes.SELECT,
    }
  );

  if (!request) {
    throw new Error("Workflow request not found");
  }

  const items: any[] = await sequelize.query(
    `
    SELECT
      workflow_request_item_id,
      document_type_id,
      document_name,
      quantity,
      base_price,
      final_price
    FROM workflow_request_items
    WHERE workflow_request_id = :workflowRequestId
    ORDER BY workflow_request_item_id ASC
    `,
    {
      replacements: { workflowRequestId },
      type: QueryTypes.SELECT,
    }
  );

  const actions: any[] = await sequelize.query(
    `
    SELECT
      workflow_request_action_id,
      action_role,
      action_type,
      from_status,
      to_status,
      remarks,
      payload_json,
      acted_by_user_id,
      acted_at
    FROM workflow_request_actions
    WHERE workflow_request_id = :workflowRequestId
    ORDER BY acted_at ASC, workflow_request_action_id ASC
    `,
    {
      replacements: { workflowRequestId },
      type: QueryTypes.SELECT,
    }
  );

  const [document]: any[] = await sequelize.query(
    `
    SELECT *
    FROM workflow_generated_documents
    WHERE workflow_request_id = :workflowRequestId
    ORDER BY version_number DESC
    LIMIT 1
    `,
    {
      replacements: { workflowRequestId },
      type: QueryTypes.SELECT,
    }
  );

  const [claimStub]: any[] = await sequelize.query(
    `
    SELECT *
    FROM workflow_claim_stubs
    WHERE workflow_request_id = :workflowRequestId
    ORDER BY generated_at DESC, workflow_claim_stub_id DESC
    LIMIT 1
    `,
    {
      replacements: { workflowRequestId },
      type: QueryTypes.SELECT,
    }
  );

  return {
    ...request,
    form_snapshot: parseJsonField(request.form_snapshot_json, {}),
    educational_background: parseJsonField(request.educational_background_json, []),
    academic_snapshot: parseJsonField(request.academic_snapshot_json, {}),
    approval_snapshot: parseJsonField(request.approval_snapshot_json, {}),
    fee_snapshot: parseJsonField(request.fee_snapshot_json, {}),
    payment_snapshot: parseJsonField(request.payment_snapshot_json, {}),
    release_snapshot: parseJsonField(request.release_snapshot_json, {}),
    items,
    actions: actions.map((action) => ({
      ...action,
      payload_json: parseJsonField(action.payload_json, {}),
    })),
    latest_generated_document: document || null,
    latest_claim_stub: claimStub || null,
  };
};

const regenerateDocument = async (workflowRequestId: number, actedByUserId: number) => {
  const detail = await getRequestDetailInternal(workflowRequestId);
  const [versionRow]: any[] = await sequelize.query(
    `
    SELECT COALESCE(MAX(version_number), 0) + 1 AS nextVersion
    FROM workflow_generated_documents
    WHERE workflow_request_id = :workflowRequestId
    `,
    {
      replacements: { workflowRequestId },
      type: QueryTypes.SELECT,
    }
  );

  const generated = await generateRequestFormPdf(
    {
      workflow_request_id: detail.workflow_request_id,
      request_reference: detail.request_reference,
      current_status: detail.current_status,
      purpose: detail.purpose,
      submitted_at: detail.submitted_at,
      form_snapshot: detail.form_snapshot,
      educational_background: detail.educational_background,
      academic_snapshot: detail.academic_snapshot,
      approval_snapshot: detail.approval_snapshot,
      fee_snapshot: detail.fee_snapshot,
      payment_snapshot: detail.payment_snapshot,
      release_snapshot: detail.release_snapshot,
      items: detail.items,
    },
    Number(versionRow?.nextVersion || 1)
  );

  await sequelize.query(
    `
    INSERT INTO workflow_generated_documents (
      workflow_request_id,
      version_number,
      source_status,
      file_name,
      file_path,
      generated_by_user_id,
      generated_at
    ) VALUES (
      :workflowRequestId,
      :versionNumber,
      :sourceStatus,
      :fileName,
      :filePath,
      :generatedByUserId,
      NOW()
    )
    `,
    {
      replacements: {
        workflowRequestId,
        versionNumber: Number(versionRow?.nextVersion || 1),
        sourceStatus: detail.current_status,
        fileName: generated.fileName,
        filePath: generated.relativePath,
        generatedByUserId: actedByUserId,
      },
      type: QueryTypes.INSERT,
    }
  );
};

const getClaimStubNumber = async () => {
  const [result]: any[] = await sequelize.query(
    `SELECT COUNT(*) + 1 AS nextNumber FROM workflow_claim_stubs`,
    { type: QueryTypes.SELECT }
  );

  return `CS-${new Date().getFullYear()}-${String(result.nextNumber).padStart(6, "0")}`;
};

const ensureClaimStub = async (workflowRequestId: number, actedByUserId: number) => {
  const detail = await getRequestDetailInternal(workflowRequestId);
  const releaseMethod = String(
    detail.release_snapshot?.release_method || detail.delivery_method || ""
  ).toLowerCase();

  if (releaseMethod !== "pickup" || detail.current_status !== "READY_FOR_RELEASE") {
    return null;
  }

  const [existing]: any[] = await sequelize.query(
    `
    SELECT *
    FROM workflow_claim_stubs
    WHERE workflow_request_id = :workflowRequestId
    ORDER BY generated_at DESC, workflow_claim_stub_id DESC
    LIMIT 1
    `,
    {
      replacements: { workflowRequestId },
      type: QueryTypes.SELECT,
    }
  );

  if (existing && existing.claim_stub_status === "ACTIVE") {
    return existing;
  }

  const claimStubNumber = await getClaimStubNumber();
  const lookupToken = crypto.randomBytes(24).toString("hex");
  const generated = await generateClaimStubPdf({
    request_reference: detail.request_reference,
    claim_stub_number: claimStubNumber,
    current_status: detail.current_status,
    submitted_at: detail.submitted_at,
    academic_snapshot: detail.academic_snapshot,
    release_snapshot: detail.release_snapshot,
    items: detail.items,
    purpose: detail.purpose,
  });

  const [insertResult]: any = await sequelize.query(
    `
    INSERT INTO workflow_claim_stubs (
      workflow_request_id,
      claim_stub_number,
      claim_stub_status,
      lookup_token_hash,
      file_name,
      file_path,
      generated_at
    ) VALUES (
      :workflowRequestId,
      :claimStubNumber,
      'ACTIVE',
      :lookupTokenHash,
      :fileName,
      :filePath,
      NOW()
    )
    `,
    {
      replacements: {
        workflowRequestId,
        claimStubNumber,
        lookupTokenHash: lookupToken,
        fileName: generated.fileName,
        filePath: generated.relativePath,
      },
      type: QueryTypes.INSERT,
    }
  );

  await createWorkflowAuditLog({
    userId: actedByUserId,
    action: "CLAIM_STUB_GENERATED",
    workflowRequestId,
    newValue: {
      claim_stub_number: claimStubNumber,
      file_path: generated.relativePath,
    },
  });

  await createWorkflowNotification({
    userId: detail.student_user_id,
    title: "Claim stub available",
    message: `Claim stub ${claimStubNumber} is ready for request ${detail.request_reference}.`,
    status: detail.current_status,
  });

  const [inserted]: any[] = await sequelize.query(
    `
    SELECT *
    FROM workflow_claim_stubs
    WHERE workflow_claim_stub_id = :workflowClaimStubId
    LIMIT 1
    `,
    {
      replacements: {
        workflowClaimStubId: Number(insertResult),
      },
      type: QueryTypes.SELECT,
    }
  );

  return inserted || null;
};

const updateClaimStubStatus = async (
  workflowRequestId: number,
  claimStubStatus: "USED" | "VOID"
) => {
  const timestampColumn = claimStubStatus === "USED" ? "used_at" : "voided_at";

  await sequelize.query(
    `
    UPDATE workflow_claim_stubs
    SET
      claim_stub_status = :claimStubStatus,
      ${timestampColumn} = NOW()
    WHERE workflow_request_id = :workflowRequestId
      AND claim_stub_status = 'ACTIVE'
    `,
    {
      replacements: {
        workflowRequestId,
        claimStubStatus,
      },
      type: QueryTypes.UPDATE,
    }
  );
};

export const createWorkflowRequest = async (user: AuthUser, payload: WorkflowRequestPayload) => {
  await ensureWorkflowSchema();

  const roles = getRoleNames(user);
  if (!roles.includes("student") && user.account_type !== "student") {
    throw new Error("Only students or alumni can submit workflow requests");
  }

  if (!Array.isArray(payload.requested_document_ids) || payload.requested_document_ids.length === 0) {
    throw new Error("At least one requested document is required");
  }

  const [student]: any[] = await sequelize.query(
    `
    SELECT
      sp.student_id,
      sp.student_number,
      sp.first_name,
      sp.middle_name,
      sp.last_name,
      sp.extension_name,
      sp.course_id,
      c.course_code,
      c.course_name
    FROM student_profiles sp
    LEFT JOIN courses c ON c.course_id = sp.course_id
    WHERE sp.user_id = :userId
    `,
    {
      replacements: { userId: user.user_id },
      type: QueryTypes.SELECT,
    }
  );

  if (!student) {
    throw new Error("Student profile not found");
  }

  const documents: any[] = await sequelize.query(
    `
    SELECT document_type_id, document_name, base_price
    FROM document_types
    WHERE document_type_id IN (:ids) AND is_active = 1
    `,
    {
      replacements: { ids: payload.requested_document_ids },
      type: QueryTypes.SELECT,
    }
  );

  if (documents.length !== payload.requested_document_ids.length) {
    throw new Error("One or more selected documents are invalid");
  }

  const academicScope = await resolveAcademicScope(student.course_id || null);
  const requestReference = await getRequestReference();
  const fullName = [
    student.first_name,
    student.middle_name,
    student.last_name,
    student.extension_name,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  const formSnapshot = {
    ...payload,
    delivery_method: payload.delivery_method,
  };

  const academicSnapshot = {
    student_number: student.student_number,
    full_name: fullName,
    first_name: student.first_name,
    middle_name: student.middle_name,
    last_name: student.last_name,
    extension_name: student.extension_name,
    course_id: student.course_id,
    course_code: student.course_code,
    course_name: student.course_name,
    department_id: academicScope.department_id,
    department_name: academicScope.department_name,
    college_id: academicScope.college_id,
    college_name: academicScope.college_name,
  };

  const approvalSnapshot = {
    registrar_status: "SUBMITTED",
    dean_status: "PENDING",
    college_admin_status: "PENDING",
    treasurer_status: "PENDING",
  };

  await sequelize.transaction(async (transaction) => {
    const [requestInsert]: any = await sequelize.query(
      `
      INSERT INTO workflow_requests (
        request_reference,
        student_id,
        student_user_id,
        dean_user_id,
        college_admin_user_id,
        current_status,
        purpose,
        delivery_method,
        form_snapshot_json,
        educational_background_json,
        academic_snapshot_json,
        approval_snapshot_json,
        submitted_at
      ) VALUES (
        :requestReference,
        :studentId,
        :studentUserId,
        :deanUserId,
        :collegeAdminUserId,
        'SUBMITTED',
        :purpose,
        :deliveryMethod,
        :formSnapshot,
        :educationalBackground,
        :academicSnapshot,
        :approvalSnapshot,
        NOW()
      )
      `,
      {
        replacements: {
          requestReference,
          studentId: student.student_id,
          studentUserId: user.user_id,
          deanUserId: academicScope.dean_user_id,
          collegeAdminUserId: academicScope.college_admin_user_id,
          purpose: payload.purpose,
          deliveryMethod: payload.delivery_method,
          formSnapshot: JSON.stringify(formSnapshot),
          educationalBackground: JSON.stringify(payload.educational_background || []),
          academicSnapshot: JSON.stringify(academicSnapshot),
          approvalSnapshot: JSON.stringify(approvalSnapshot),
        },
        transaction,
        type: QueryTypes.INSERT,
      }
    );

    const workflowRequestId = Number(requestInsert);

    for (const document of documents) {
      await sequelize.query(
        `
        INSERT INTO workflow_request_items (
          workflow_request_id,
          document_type_id,
          document_name,
          quantity,
          base_price,
          final_price
        ) VALUES (
          :workflowRequestId,
          :documentTypeId,
          :documentName,
          1,
          :basePrice,
          :finalPrice
        )
        `,
        {
          replacements: {
            workflowRequestId,
            documentTypeId: document.document_type_id,
            documentName: document.document_name,
            basePrice: Number(document.base_price || 0),
            finalPrice: Number(document.base_price || 0),
          },
          transaction,
          type: QueryTypes.INSERT,
        }
      );
    }

    await sequelize.query(
      `
      INSERT INTO workflow_request_actions (
        workflow_request_id,
        action_role,
        action_type,
        from_status,
        to_status,
        remarks,
        payload_json,
        acted_by_user_id,
        acted_at
      ) VALUES (
        :workflowRequestId,
        'student',
        'SUBMIT_REQUEST',
        NULL,
        'SUBMITTED',
        'Printed registrar request form submitted.',
        :payload,
        :actedByUserId,
        NOW()
      )
      `,
      {
        replacements: {
          workflowRequestId,
          payload: JSON.stringify({
            request_reference: requestReference,
            requested_document_ids: payload.requested_document_ids,
          }),
          actedByUserId: user.user_id,
        },
        transaction,
        type: QueryTypes.INSERT,
      }
    );
  });

  const [created]: any[] = await sequelize.query(
    `
    SELECT workflow_request_id
    FROM workflow_requests
    WHERE request_reference = :requestReference
    LIMIT 1
    `,
    {
      replacements: { requestReference },
      type: QueryTypes.SELECT,
    }
  );

  await regenerateDocument(created.workflow_request_id, user.user_id);
  await createWorkflowAuditLog({
    userId: user.user_id,
    action: "WORKFLOW_REQUEST_SUBMITTED",
    workflowRequestId: created.workflow_request_id,
    newValue: {
      request_reference: requestReference,
      current_status: "SUBMITTED",
      purpose: payload.purpose,
    },
  });

  if (academicScope.dean_user_id) {
    await createWorkflowNotification({
      userId: academicScope.dean_user_id,
      title: "Dean approval required",
      message: `Request ${requestReference} is ready for registrar verification and dean routing.`,
      status: "SUBMITTED",
    });
  }

  return getRequestDetailInternal(created.workflow_request_id);
};

export const listWorkflowRequests = async (user: AuthUser) => {
  await ensureWorkflowSchema();

  const roles = getRoleNames(user);
  const whereClauses: string[] = [];
  const replacements: Record<string, any> = {};

  if (roles.includes("student") || user.account_type === "student") {
    whereClauses.push("wr.student_user_id = :userId");
    replacements.userId = user.user_id;
  } else if (roles.includes("admin") || roles.includes("registrar")) {
    // Operational staff can see the full queue.
  } else if (roles.includes("dean")) {
    whereClauses.push("wr.dean_user_id = :userId");
    replacements.userId = user.user_id;
  } else if (roles.includes("college_admin")) {
    whereClauses.push("wr.college_admin_user_id = :userId");
    replacements.userId = user.user_id;
  } else if (roles.includes("accounting") || roles.includes("treasurer")) {
    whereClauses.push("wr.current_status IN (:paymentVisibleStatuses)");
    replacements.paymentVisibleStatuses = PAYMENT_VISIBLE_STATUSES;
  }

  const rows: any[] = await sequelize.query(
    `
    SELECT
      wr.workflow_request_id,
      wr.request_reference,
      wr.current_status,
      wr.purpose,
      wr.delivery_method,
      wr.submitted_at,
      wr.updated_at,
      wr.student_user_id,
      wr.dean_user_id,
      wr.college_admin_user_id,
      wr.academic_snapshot_json,
      wr.approval_snapshot_json,
      wr.fee_snapshot_json,
      wr.payment_snapshot_json,
      (
        SELECT file_path
        FROM workflow_generated_documents wgd
        WHERE wgd.workflow_request_id = wr.workflow_request_id
        ORDER BY version_number DESC
        LIMIT 1
      ) AS latest_pdf_path,
      (
        SELECT file_path
        FROM workflow_claim_stubs wcs
        WHERE wcs.workflow_request_id = wr.workflow_request_id
        ORDER BY generated_at DESC, workflow_claim_stub_id DESC
        LIMIT 1
      ) AS latest_claim_stub_path,
      (
        SELECT claim_stub_number
        FROM workflow_claim_stubs wcs
        WHERE wcs.workflow_request_id = wr.workflow_request_id
        ORDER BY generated_at DESC, workflow_claim_stub_id DESC
        LIMIT 1
      ) AS latest_claim_stub_number,
      (
        SELECT JSON_ARRAYAGG(
          JSON_OBJECT(
            'document_name', document_name,
            'quantity', quantity,
            'final_price', final_price
          )
        )
        FROM workflow_request_items wri
        WHERE wri.workflow_request_id = wr.workflow_request_id
      ) AS items_json
    FROM workflow_requests wr
    ${whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : ""}
    ORDER BY wr.updated_at DESC, wr.workflow_request_id DESC
    `,
    {
      replacements,
      type: QueryTypes.SELECT,
    }
  );

  return rows.map((row) => ({
    ...row,
    academic_snapshot: parseJsonField(row.academic_snapshot_json, {}),
    approval_snapshot: parseJsonField(row.approval_snapshot_json, {}),
    fee_snapshot: parseJsonField(row.fee_snapshot_json, {}),
    payment_snapshot: parseJsonField(row.payment_snapshot_json, {}),
    items: parseJsonField(row.items_json, []),
    allowed_actions: Object.entries(WORKFLOW_ACTION_RULES)
      .filter(([, rule]) => {
        const currentStatus = row.current_status as WorkflowStatus;
        return (
          rule.currentStatuses.includes(currentStatus) &&
          roles.some((role) => rule.roles.includes(role))
        );
      })
      .map(([action]) => action),
    permissions: getPermissionsForRolesSync(roles),
  }));
};

export const getWorkflowRequestDetail = async (
  workflowRequestId: number,
  user: AuthUser
) => {
  await ensureWorkflowSchema();

  const detail = await getRequestDetailInternal(workflowRequestId);
  const roles = getRoleNames(user);
  assertCanViewWorkflowRequest(detail, user, roles);

  return {
    ...detail,
    allowed_next_statuses:
      WORKFLOW_TRANSITIONS[detail.current_status as WorkflowStatus] || [],
    allowed_actions: Object.entries(WORKFLOW_ACTION_RULES)
      .filter(([, rule]) => {
        const currentStatus = detail.current_status as WorkflowStatus;
        return (
          rule.currentStatuses.includes(currentStatus) &&
          roles.some((role) => rule.roles.includes(role))
        );
      })
      .map(([action]) => action),
    permissions: getPermissionsForRolesSync(roles),
  };
};

export const advanceWorkflowRequest = async (
  workflowRequestId: number,
  user: AuthUser,
  body: {
    target_status: WorkflowStatus;
    remarks?: string;
    updates?: Record<string, any>;
  }
) => {
  await ensureWorkflowSchema();

  if (!WORKFLOW_STATUSES.includes(body.target_status)) {
    throw new Error("Invalid target status");
  }

  const detail = await getRequestDetailInternal(workflowRequestId);
  const currentStatus = detail.current_status as WorkflowStatus;
  const allowedNext = WORKFLOW_TRANSITIONS[currentStatus] || [];

  if (!allowedNext.includes(body.target_status)) {
    throw new Error(`Request cannot move from ${currentStatus} to ${body.target_status}`);
  }

  const roles = getRoleNames(user);
  assertCanAdvance(roles, body.target_status);

  const approvalSnapshot = { ...detail.approval_snapshot };
  const feeSnapshot = { ...detail.fee_snapshot };
  const paymentSnapshot = { ...detail.payment_snapshot };
  const releaseSnapshot = { ...detail.release_snapshot };
  const remarks = body.remarks?.trim() || null;
  const updates = body.updates || {};

  if (body.target_status === "UNDER_REGISTRAR_REVIEW") {
    approvalSnapshot.registrar_status = "UNDER REVIEW";
    approvalSnapshot.registrar_name =
      updates.registrar_name || approvalSnapshot.registrar_name || "Registrar";
    approvalSnapshot.registrar_remarks = remarks;
  }

  if (body.target_status === "AWAITING_DEAN_APPROVAL") {
    if (!detail.dean_user_id) {
      throw new Error("Dean assignment is missing for this request");
    }
    approvalSnapshot.registrar_status = "VERIFIED";
    approvalSnapshot.registrar_name =
      updates.registrar_name || approvalSnapshot.registrar_name || "Registrar";
    approvalSnapshot.registrar_forwarded_at = new Date().toISOString();
  }

  if (body.target_status === "DEAN_APPROVED") {
    approvalSnapshot.dean_status = "APPROVED";
    approvalSnapshot.dean_name =
      updates.dean_name || approvalSnapshot.dean_name || "Dean";
    approvalSnapshot.dean_approved_at = new Date().toISOString();
    approvalSnapshot.dean_remarks = remarks;
  }

  if (body.target_status === "COLLEGE_ADMIN_APPROVED") {
    approvalSnapshot.college_admin_status = "APPROVED";
    approvalSnapshot.college_admin_name =
      updates.college_admin_name ||
      approvalSnapshot.college_admin_name ||
      "College Administrator";
    approvalSnapshot.college_admin_approved_at = new Date().toISOString();
    approvalSnapshot.college_admin_remarks = remarks;
  }

  if (body.target_status === "FEE_ASSESSED") {
    feeSnapshot.assessed_by_role = getPrimaryRole(user);
    feeSnapshot.assessed_fee = updates.assessed_fee ?? feeSnapshot.assessed_fee ?? 0;
    feeSnapshot.final_fee =
      updates.final_fee ??
      feeSnapshot.final_fee ??
      feeSnapshot.assessed_fee ??
      0;
    feeSnapshot.assessed_at = new Date().toISOString();
    feeSnapshot.notes = remarks;
  }

  if (body.target_status === "PAYMENT_CONFIRMED") {
    paymentSnapshot.payment_status = "CONFIRMED";
    paymentSnapshot.official_receipt_no =
      updates.official_receipt_no || paymentSnapshot.official_receipt_no || null;
    paymentSnapshot.confirmed_at = new Date().toISOString();
    paymentSnapshot.confirmed_by_name =
      updates.confirmed_by_name ||
      paymentSnapshot.confirmed_by_name ||
      "Treasurer";
    paymentSnapshot.confirmation_notes = remarks;
  }

  if (body.target_status === "FOR_PROCESSING") {
    approvalSnapshot.registrar_processing_owner =
      updates.registrar_name ||
      approvalSnapshot.registrar_name ||
      "Registrar";
  }

  if (body.target_status === "DOCUMENT_PREPARING") {
    approvalSnapshot.registrar_status = "PREPARING DOCUMENT";
  }

  if (body.target_status === "READY_FOR_RELEASE") {
    releaseSnapshot.expected_release_date =
      updates.expected_release_date ||
      releaseSnapshot.expected_release_date ||
      null;
    releaseSnapshot.release_method =
      updates.release_method ||
      releaseSnapshot.release_method ||
      detail.delivery_method;
    releaseSnapshot.release_notes = remarks;
    releaseSnapshot.release_status = "READY_FOR_RELEASE";
  }

  if (body.target_status === "OUT_FOR_DELIVERY") {
    releaseSnapshot.release_method = "courier";
    releaseSnapshot.courier_name =
      updates.courier_name || releaseSnapshot.courier_name || null;
    releaseSnapshot.tracking_number =
      updates.tracking_number || releaseSnapshot.tracking_number || null;
    releaseSnapshot.dispatched_at = new Date().toISOString();
    releaseSnapshot.release_status = "OUT_FOR_DELIVERY";
  }

  if (body.target_status === "RELEASED") {
    releaseSnapshot.release_method =
      updates.release_method ||
      releaseSnapshot.release_method ||
      detail.delivery_method;
    releaseSnapshot.date_released = new Date().toISOString();
    releaseSnapshot.recipient_name =
      updates.recipient_name || releaseSnapshot.recipient_name || null;
    releaseSnapshot.receiver_email =
      updates.receiver_email || releaseSnapshot.receiver_email || null;
    releaseSnapshot.release_status = "RELEASED";
  }

  if (body.target_status === "CLAIMED") {
    releaseSnapshot.date_released = new Date().toISOString();
    releaseSnapshot.claimant_name =
      updates.claimant_name || releaseSnapshot.claimant_name || null;
    releaseSnapshot.claimed_by = releaseSnapshot.claimant_name;
    releaseSnapshot.release_status = "CLAIMED";
  }

  if (body.target_status === "COMPLETED") {
    releaseSnapshot.completed_at = new Date().toISOString();
    releaseSnapshot.release_status = "COMPLETED";
  }

  await sequelize.transaction(async (transaction) => {
    await sequelize.query(
      `
      UPDATE workflow_requests
      SET
        current_status = :targetStatus,
        approval_snapshot_json = :approvalSnapshot,
        fee_snapshot_json = :feeSnapshot,
        payment_snapshot_json = :paymentSnapshot,
        release_snapshot_json = :releaseSnapshot,
        completed_at = CASE WHEN :targetStatus = 'COMPLETED' THEN NOW() ELSE completed_at END
      WHERE workflow_request_id = :workflowRequestId
      `,
      {
        replacements: {
          targetStatus: body.target_status,
          approvalSnapshot: JSON.stringify(approvalSnapshot),
          feeSnapshot: JSON.stringify(feeSnapshot),
          paymentSnapshot: JSON.stringify(paymentSnapshot),
          releaseSnapshot: JSON.stringify(releaseSnapshot),
          workflowRequestId,
        },
        transaction,
        type: QueryTypes.UPDATE,
      }
    );

    if (body.target_status === "FEE_ASSESSED" && Array.isArray(updates.item_fees)) {
      for (const item of updates.item_fees) {
        await sequelize.query(
          `
          UPDATE workflow_request_items
          SET final_price = :finalPrice
          WHERE workflow_request_id = :workflowRequestId
            AND workflow_request_item_id = :itemId
          `,
          {
            replacements: {
              workflowRequestId,
              itemId: item.workflow_request_item_id,
              finalPrice: item.final_price,
            },
            transaction,
            type: QueryTypes.UPDATE,
          }
        );
      }
    }

    await sequelize.query(
      `
      INSERT INTO workflow_request_actions (
        workflow_request_id,
        action_role,
        action_type,
        from_status,
        to_status,
        remarks,
        payload_json,
        acted_by_user_id,
        acted_at
      ) VALUES (
        :workflowRequestId,
        :actionRole,
        'ADVANCE_STATUS',
        :fromStatus,
        :toStatus,
        :remarks,
        :payload,
        :actedByUserId,
        NOW()
      )
      `,
      {
        replacements: {
          workflowRequestId,
          actionRole: getPrimaryRole(user),
          fromStatus: currentStatus,
          toStatus: body.target_status,
          remarks,
          payload: JSON.stringify(updates),
          actedByUserId: user.user_id,
        },
        transaction,
        type: QueryTypes.INSERT,
      }
    );
  });

  if (body.target_status === "DEAN_APPROVED") {
    await insertApprovalRecord({
      workflowRequestId,
      approvalStage: "DEAN",
      status: "APPROVED",
      actedByUserId: user.user_id,
      remarks,
    });
  }

  if (body.target_status === "COLLEGE_ADMIN_APPROVED") {
    await insertApprovalRecord({
      workflowRequestId,
      approvalStage: "COLLEGE_ADMIN",
      status: "APPROVED",
      actedByUserId: user.user_id,
      remarks,
    });
  }

  if (body.target_status === "FEE_ASSESSED") {
    await insertFeeAssessmentRecord({
      workflowRequestId,
      assessedByUserId: user.user_id,
      assessment: feeSnapshot,
    });
  }

  let releaseRecordId: number | null = null;
  if (
    ["READY_FOR_RELEASE", "OUT_FOR_DELIVERY", "RELEASED", "CLAIMED", "COMPLETED"].includes(
      body.target_status
    )
  ) {
    releaseRecordId = await upsertReleaseRecord({
      workflowRequestId,
      releaseSnapshot,
      actedByUserId: user.user_id,
    });

    await insertReleaseLog({
      workflowRequestId,
      workflowReleaseRecordId: releaseRecordId,
      eventType: body.target_status,
      remarks,
      metadata: updates,
      actedByUserId: user.user_id,
    });
  }

  await createWorkflowAuditLog({
    userId: user.user_id,
    action: `WORKFLOW_${body.target_status}`,
    workflowRequestId,
    oldValue: {
      current_status: currentStatus,
    },
    newValue: {
      current_status: body.target_status,
      approval_snapshot: approvalSnapshot,
      fee_snapshot: feeSnapshot,
      payment_snapshot: paymentSnapshot,
      release_snapshot: releaseSnapshot,
    },
  });

  if (body.target_status === "AWAITING_DEAN_APPROVAL") {
    await createWorkflowNotification({
      userId: detail.dean_user_id,
      title: "Dean approval required",
      message: `Request ${detail.request_reference} is awaiting your approval.`,
      status: body.target_status,
    });
  }

  if (body.target_status === "AWAITING_COLLEGE_ADMIN_REVIEW") {
    await createWorkflowNotification({
      userId: detail.college_admin_user_id,
      title: "College review required",
      message: `Request ${detail.request_reference} is awaiting college administration review.`,
      status: body.target_status,
    });
  }

  if (body.target_status === "AWAITING_PAYMENT") {
    await createWorkflowNotification({
      userId: detail.student_user_id,
      title: "Payment required",
      message: `Request ${detail.request_reference} has been assessed and is awaiting payment confirmation.`,
      status: body.target_status,
    });
  }

  if (body.target_status === "FOR_PROCESSING") {
    await createWorkflowNotification({
      userId: detail.student_user_id,
      title: "Payment confirmed",
      message: `Request ${detail.request_reference} has cleared payment and returned to registrar processing.`,
      status: body.target_status,
    });
  }

  if (body.target_status === "READY_FOR_RELEASE") {
    await createWorkflowNotification({
      userId: detail.student_user_id,
      title: "Document ready",
      message: `Request ${detail.request_reference} is ready for release.`,
      status: body.target_status,
    });
  }

  if (["RELEASED", "CLAIMED", "COMPLETED"].includes(body.target_status)) {
    await createWorkflowNotification({
      userId: detail.student_user_id,
      title: "Release update",
      message: `Request ${detail.request_reference} is now ${body.target_status
        .replace(/_/g, " ")
        .toLowerCase()}.`,
      status: body.target_status,
    });
  }

  await regenerateDocument(workflowRequestId, user.user_id);

  if (body.target_status === "READY_FOR_RELEASE") {
    await ensureClaimStub(workflowRequestId, user.user_id);
  }

  if (body.target_status === "CLAIMED" || body.target_status === "COMPLETED") {
    await updateClaimStubStatus(workflowRequestId, "USED");
  }

  return getWorkflowRequestDetail(workflowRequestId, user);
};

export const getWorkflowRequestLatestDocument = async (
  workflowRequestId: number,
  user?: AuthUser
) => {
  await ensureWorkflowSchema();

  if (user) {
    await getWorkflowRequestDetail(workflowRequestId, user);
  }

  const [document]: any[] = await sequelize.query(
    `
    SELECT *
    FROM workflow_generated_documents
    WHERE workflow_request_id = :workflowRequestId
    ORDER BY version_number DESC
    LIMIT 1
    `,
    {
      replacements: { workflowRequestId },
      type: QueryTypes.SELECT,
    }
  );

  if (!document) {
    throw new Error("No generated request form is available");
  }

  return document;
};

export const getWorkflowRequestClaimStub = async (
  workflowRequestId: number,
  user: AuthUser
) => {
  const detail = await getWorkflowRequestDetail(workflowRequestId, user);
  const claimStub = detail.latest_claim_stub;

  if (!claimStub) {
    throw new Error("No claim stub is available for this request");
  }

  return claimStub;
};

export const getWorkflowRequestTimeline = async (
  workflowRequestId: number,
  user: AuthUser
) => {
  const detail = await getWorkflowRequestDetail(workflowRequestId, user);
  return detail.actions;
};

export const listWorkflowQueueByStatuses = async (
  user: AuthUser,
  statuses: WorkflowStatus[]
) => {
  const items = await listWorkflowRequests(user);
  return items.filter((item) =>
    statuses.includes(item.current_status as WorkflowStatus)
  );
};

export const processWorkflowAction = async (
  workflowRequestId: number,
  user: AuthUser,
  action: string,
  input: {
    remarks?: string;
    updates?: Record<string, any>;
  }
) => {
  const detail = await getWorkflowRequestDetail(workflowRequestId, user);
  const roles = getRoleNames(user);
  const currentStatus = detail.current_status as WorkflowStatus;
  const rule = WORKFLOW_ACTION_RULES[action];

  if (!rule) {
    throw new Error("Unknown workflow action");
  }

  if (!rule.currentStatuses.includes(currentStatus)) {
    throw new Error(`Action ${action} is not allowed when request is ${currentStatus}`);
  }

  if (!roles.some((role) => rule.roles.includes(role))) {
    throw new Error(`You do not have access to perform ${action}`);
  }

  if (action === "registrar_verification") {
    if (currentStatus === "SUBMITTED") {
      await advanceWorkflowRequest(workflowRequestId, user, {
        target_status: "UNDER_REGISTRAR_REVIEW",
        remarks: input.remarks,
        updates: input.updates,
      });
    }

    return advanceWorkflowRequest(workflowRequestId, user, {
      target_status: "AWAITING_DEAN_APPROVAL",
      remarks: input.remarks,
      updates: input.updates,
    });
  }

  if (action === "dean_approve") {
    await advanceWorkflowRequest(workflowRequestId, user, {
      target_status: "DEAN_APPROVED",
      remarks: input.remarks,
      updates: input.updates,
    });

    return advanceWorkflowRequest(workflowRequestId, user, {
      target_status: "AWAITING_COLLEGE_ADMIN_REVIEW",
      remarks: input.remarks,
      updates: input.updates,
    });
  }

  if (action === "college_admin_approve") {
    return advanceWorkflowRequest(workflowRequestId, user, {
      target_status: "COLLEGE_ADMIN_APPROVED",
      remarks: input.remarks,
      updates: input.updates,
    });
  }

  if (action === "fee_assess") {
    await advanceWorkflowRequest(workflowRequestId, user, {
      target_status: "FEE_ASSESSED",
      remarks: input.remarks,
      updates: input.updates,
    });

    return advanceWorkflowRequest(workflowRequestId, user, {
      target_status: "AWAITING_PAYMENT",
      remarks: input.remarks,
      updates: input.updates,
    });
  }

  if (action === "payment_confirm") {
    await advanceWorkflowRequest(workflowRequestId, user, {
      target_status: "PAYMENT_CONFIRMED",
      remarks: input.remarks,
      updates: input.updates,
    });

    return advanceWorkflowRequest(workflowRequestId, user, {
      target_status: "FOR_PROCESSING",
      remarks: input.remarks,
      updates: input.updates,
    });
  }

  if (action === "document_prepare") {
    return advanceWorkflowRequest(workflowRequestId, user, {
      target_status: "DOCUMENT_PREPARING",
      remarks: input.remarks,
      updates: input.updates,
    });
  }

  if (action === "document_finalize") {
    return advanceWorkflowRequest(workflowRequestId, user, {
      target_status: "READY_FOR_RELEASE",
      remarks: input.remarks,
      updates: input.updates,
    });
  }

  if (action === "release_dispatch") {
    return advanceWorkflowRequest(workflowRequestId, user, {
      target_status: "OUT_FOR_DELIVERY",
      remarks: input.remarks,
      updates: {
        ...(input.updates || {}),
        release_method: "courier",
      },
    });
  }

  if (action === "release_email") {
    return advanceWorkflowRequest(workflowRequestId, user, {
      target_status: "RELEASED",
      remarks: input.remarks,
      updates: {
        ...(input.updates || {}),
        release_method: "email",
      },
    });
  }

  if (action === "release_claim") {
    return advanceWorkflowRequest(workflowRequestId, user, {
      target_status: "CLAIMED",
      remarks: input.remarks,
      updates: {
        ...(input.updates || {}),
        release_method: "pickup",
      },
    });
  }

  if (action === "release_complete") {
    return advanceWorkflowRequest(workflowRequestId, user, {
      target_status: "COMPLETED",
      remarks: input.remarks,
      updates: input.updates,
    });
  }

  throw new Error("Unhandled workflow action");
};
