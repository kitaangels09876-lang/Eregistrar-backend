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
  permissions?: string[];
};

const STAFF_ROLES = [
  "admin",
  "registrar",
  "dean",
  "college_admin",
  "treasurer",
] as const;

const PORTAL_ROLES = ["student", "alumni"] as const;

const PAYMENT_VISIBLE_STATUSES: WorkflowStatus[] = [
  "AWAITING_PAYMENT",
  "PAYMENT_SUBMITTED",
  "PAYMENT_CONFIRMED",
  "UNDER_REGISTRAR_PROCESSING",
];

const QUEUE_ACCESS_RULES: Array<{
  statuses: WorkflowStatus[];
  roles: string[];
  permissions: string[];
}> = [
  {
    statuses: ["UNDER_DEAN_APPROVAL"],
    roles: ["dean", "admin"],
    permissions: ["approval.dean.view", "request.view.all"],
  },
  {
    statuses: ["UNDER_COLLEGE_ADMIN_REVIEW"],
    roles: ["college_admin", "admin"],
    permissions: ["approval.college_admin.view", "request.view.all"],
  },
  {
    statuses: ["AWAITING_PAYMENT", "PAYMENT_SUBMITTED"],
    roles: ["treasurer", "admin"],
    permissions: ["payment.confirm", "request.view.all"],
  },
];

const VIEW_PERMISSION_RULES = {
  portal: "request.view.own",
  registrar: "request.view.all",
  admin: "request.view.all",
  dean: "approval.dean.view",
  college_admin: "approval.college_admin.view",
  treasurer: "payment.confirm",
} as const;

const TARGET_STATUS_PERMISSION_RULES: Partial<Record<WorkflowStatus, string[]>> = {
  UNDER_REGISTRAR_VERIFICATION: ["request.verify"],
  UNDER_DEAN_APPROVAL: ["request.verify"],
  DEAN_APPROVED: ["approval.dean.approve"],
  UNDER_COLLEGE_ADMIN_REVIEW: ["approval.dean.approve"],
  COLLEGE_ADMIN_APPROVED: ["approval.college_admin.approve"],
  FEE_ASSESSED: ["payment.assess"],
  AWAITING_PAYMENT: ["payment.assess"],
  PAYMENT_SUBMITTED: ["payment.submit.own"],
  PAYMENT_CONFIRMED: ["payment.confirm"],
  UNDER_REGISTRAR_PROCESSING: ["payment.confirm"],
  DOCUMENT_GENERATION: ["document.prepare"],
  READY_FOR_RELEASE: ["document.generate"],
  CLAIMED: ["document.claim"],
  COMPLETED: ["document.release", "document.claim"],
  CANCELLED: ["request.cancel.own", "request.cancel.any"],
  REJECTED: [
    "request.verify",
    "approval.dean.approve",
    "approval.college_admin.approve",
  ],
};

const TARGET_STATUS_ROLE_RULES: Partial<Record<WorkflowStatus, string[]>> = {
  UNDER_REGISTRAR_VERIFICATION: ["registrar", "admin"],
  UNDER_DEAN_APPROVAL: ["registrar", "admin"],
  DEAN_APPROVED: ["dean", "admin"],
  UNDER_COLLEGE_ADMIN_REVIEW: ["dean", "admin"],
  COLLEGE_ADMIN_APPROVED: ["college_admin", "admin"],
  FEE_ASSESSED: ["registrar", "admin"],
  AWAITING_PAYMENT: ["registrar", "admin"],
  PAYMENT_SUBMITTED: ["student", "alumni", "admin"],
  PAYMENT_CONFIRMED: ["treasurer", "admin"],
  UNDER_REGISTRAR_PROCESSING: ["treasurer", "admin"],
  DOCUMENT_GENERATION: ["registrar", "admin"],
  READY_FOR_RELEASE: ["registrar", "admin"],
  CLAIMED: ["registrar", "admin"],
  COMPLETED: ["registrar", "admin"],
  CANCELLED: ["student", "alumni", "registrar", "admin"],
  REJECTED: ["registrar", "dean", "college_admin", "admin"],
};

const normalizeRoles = (roles: string[] = []) =>
  roles.map((role) => role.trim().toLowerCase()).filter(Boolean);

const canPerformWorkflowRule = (
  user: AuthUser,
  roles: string[],
  rule: { roles: string[]; permissions: string[] }
) =>
  roles.some((role) => rule.roles.includes(role)) &&
  hasAnyPermission(user, rule.permissions);

const assertSignaturePresent = (
  signatureFilePath: unknown,
  message: string
) => {
  if (typeof signatureFilePath !== "string" || !signatureFilePath.trim()) {
    throw new Error(message);
  }
};

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

const insertPaymentSubmissionRecord = async ({
  workflowRequestId,
  submittedByUserId,
  payment,
}: {
  workflowRequestId: number;
  submittedByUserId: number;
  payment: Record<string, any>;
}) => {
  await sequelize.query(
    `
    INSERT INTO workflow_payment_submissions (
      workflow_request_id,
      payment_reference_number,
      payment_channel,
      proof_file_name,
      proof_file_path,
      submission_notes,
      submitted_by_user_id,
      submitted_at
    ) VALUES (
      :workflowRequestId,
      :paymentReferenceNumber,
      :paymentChannel,
      :proofFileName,
      :proofFilePath,
      :submissionNotes,
      :submittedByUserId,
      NOW()
    )
    `,
    {
      replacements: {
        workflowRequestId,
        paymentReferenceNumber: payment.payment_reference_number || null,
        paymentChannel: payment.payment_channel || null,
        proofFileName: payment.proof_file_name || null,
        proofFilePath: payment.proof_file_path || null,
        submissionNotes: payment.submission_notes || null,
        submittedByUserId,
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
        recipient_email = NULL,
        authorized_representative_name = :authorizedRepresentativeName,
        authorized_representative_id_type = :authorizedRepresentativeIdType,
        authorized_representative_id_number = :authorizedRepresentativeIdNumber,
        claimant_type = :claimantType,
        claimant_relationship = :claimantRelationship,
        claimant_id_type = :claimantIdType,
        claimant_id_number = :claimantIdNumber,
        authorization_letter_file_path = :authorizationLetterFilePath,
        claimant_id_file_path = :claimantIdFilePath,
        signature_file_path = :signatureFilePath,
        courier_name = NULL,
        tracking_number = NULL,
        dispatch_at = NULL,
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
          authorizedRepresentativeName:
            releaseSnapshot.authorized_representative_name || null,
          authorizedRepresentativeIdType:
            releaseSnapshot.authorized_representative_id_type || null,
          authorizedRepresentativeIdNumber:
            releaseSnapshot.authorized_representative_id_number || null,
          claimantType: releaseSnapshot.claimant_type || null,
          claimantRelationship: releaseSnapshot.claimant_relationship || null,
          claimantIdType: releaseSnapshot.claimant_id_type || null,
          claimantIdNumber: releaseSnapshot.claimant_id_number || null,
          authorizationLetterFilePath:
            releaseSnapshot.authorization_letter_file_path || null,
          claimantIdFilePath: releaseSnapshot.claimant_id_file_path || null,
          signatureFilePath: releaseSnapshot.signature_file_path || null,
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
      claimant_type,
      claimant_relationship,
      claimant_id_type,
      claimant_id_number,
      authorization_letter_file_path,
      claimant_id_file_path,
      signature_file_path,
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
      NULL,
      :authorizedRepresentativeName,
      :authorizedRepresentativeIdType,
      :authorizedRepresentativeIdNumber,
      :claimantType,
      :claimantRelationship,
      :claimantIdType,
      :claimantIdNumber,
      :authorizationLetterFilePath,
      :claimantIdFilePath,
      :signatureFilePath,
      NULL,
      NULL,
      NULL,
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
        authorizedRepresentativeName:
          releaseSnapshot.authorized_representative_name || null,
        authorizedRepresentativeIdType:
          releaseSnapshot.authorized_representative_id_type || null,
        authorizedRepresentativeIdNumber:
          releaseSnapshot.authorized_representative_id_number || null,
        claimantType: releaseSnapshot.claimant_type || null,
        claimantRelationship: releaseSnapshot.claimant_relationship || null,
        claimantIdType: releaseSnapshot.claimant_id_type || null,
        claimantIdNumber: releaseSnapshot.claimant_id_number || null,
        authorizationLetterFilePath:
          releaseSnapshot.authorization_letter_file_path || null,
        claimantIdFilePath: releaseSnapshot.claimant_id_file_path || null,
        signatureFilePath: releaseSnapshot.signature_file_path || null,
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
  { roles: string[]; permissions: string[]; currentStatuses: WorkflowStatus[] }
> = {
  registrar_verification: {
    roles: ["registrar", "admin"],
    permissions: ["request.verify"],
    currentStatuses: ["SUBMITTED", "UNDER_REGISTRAR_VERIFICATION"],
  },
  dean_approve: {
    roles: ["dean", "admin"],
    permissions: ["approval.dean.approve"],
    currentStatuses: ["UNDER_DEAN_APPROVAL"],
  },
  college_admin_approve: {
    roles: ["college_admin", "admin"],
    permissions: ["approval.college_admin.approve"],
    currentStatuses: ["UNDER_COLLEGE_ADMIN_REVIEW"],
  },
  fee_assess: {
    roles: ["registrar", "admin"],
    permissions: ["payment.assess"],
    currentStatuses: ["COLLEGE_ADMIN_APPROVED"],
  },
  payment_submit: {
    roles: ["student", "alumni", "admin"],
    permissions: ["payment.submit.own"],
    currentStatuses: ["AWAITING_PAYMENT"],
  },
  payment_confirm: {
    roles: ["treasurer", "admin"],
    permissions: ["payment.confirm"],
    currentStatuses: ["AWAITING_PAYMENT", "PAYMENT_SUBMITTED"],
  },
  document_prepare: {
    roles: ["registrar", "admin"],
    permissions: ["document.prepare"],
    currentStatuses: ["UNDER_REGISTRAR_PROCESSING"],
  },
  document_finalize: {
    roles: ["registrar", "admin"],
    permissions: ["document.generate"],
    currentStatuses: ["DOCUMENT_GENERATION"],
  },
  release_claim: {
    roles: ["registrar", "admin"],
    permissions: ["document.claim"],
    currentStatuses: ["READY_FOR_RELEASE"],
  },
  release_complete: {
    roles: ["registrar", "admin"],
    permissions: ["document.release", "document.claim"],
    currentStatuses: ["CLAIMED"],
  },
  request_cancel: {
    roles: ["student", "alumni", "registrar", "admin"],
    permissions: ["request.cancel.own", "request.cancel.any"],
    currentStatuses: [
      "SUBMITTED",
      "UNDER_REGISTRAR_VERIFICATION",
      "UNDER_DEAN_APPROVAL",
      "DEAN_APPROVED",
      "UNDER_COLLEGE_ADMIN_REVIEW",
      "COLLEGE_ADMIN_APPROVED",
      "FEE_ASSESSED",
      "AWAITING_PAYMENT",
      "PAYMENT_SUBMITTED",
    ],
  },
  registrar_reject: {
    roles: ["registrar", "admin"],
    permissions: ["request.verify"],
    currentStatuses: ["UNDER_REGISTRAR_VERIFICATION", "UNDER_REGISTRAR_PROCESSING", "DOCUMENT_GENERATION"],
  },
  dean_reject: {
    roles: ["dean", "admin"],
    permissions: ["approval.dean.approve"],
    currentStatuses: ["UNDER_DEAN_APPROVAL"],
  },
  college_admin_reject: {
    roles: ["college_admin", "admin"],
    permissions: ["approval.college_admin.approve"],
    currentStatuses: ["UNDER_COLLEGE_ADMIN_REVIEW"],
  },
};

const ensureColumnExists = async (
  tableName: string,
  columnName: string,
  definition: string
) => {
  const columns: any[] = await sequelize.query(
    `
    SHOW COLUMNS FROM ${tableName} LIKE :columnName
    `,
    {
      replacements: { columnName },
      type: QueryTypes.SELECT,
    }
  );

  if (columns.length === 0) {
    await sequelize.query(
      `
      ALTER TABLE ${tableName}
      ADD COLUMN ${columnName} ${definition}
      `
    );
  }
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
    CREATE TABLE IF NOT EXISTS workflow_request_attachments (
      workflow_request_attachment_id INT AUTO_INCREMENT PRIMARY KEY,
      workflow_request_id INT NOT NULL,
      attachment_label VARCHAR(255) NULL,
      original_file_name VARCHAR(255) NOT NULL,
      stored_file_name VARCHAR(255) NOT NULL,
      file_path VARCHAR(500) NOT NULL,
      mime_type VARCHAR(120) NULL,
      file_size BIGINT NULL,
      uploaded_by_user_id INT NOT NULL,
      uploaded_at DATETIME NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (workflow_request_id) REFERENCES workflow_requests(workflow_request_id) ON DELETE CASCADE,
      FOREIGN KEY (uploaded_by_user_id) REFERENCES users(user_id)
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

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS workflow_payment_submissions (
      workflow_payment_submission_id INT AUTO_INCREMENT PRIMARY KEY,
      workflow_request_id INT NOT NULL,
      payment_reference_number VARCHAR(120) NULL,
      payment_channel VARCHAR(120) NULL,
      proof_file_name VARCHAR(255) NULL,
      proof_file_path VARCHAR(500) NULL,
      submission_notes TEXT NULL,
      submitted_by_user_id INT NOT NULL,
      submitted_at DATETIME NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (workflow_request_id) REFERENCES workflow_requests(workflow_request_id) ON DELETE CASCADE,
      FOREIGN KEY (submitted_by_user_id) REFERENCES users(user_id)
    ) ENGINE=InnoDB;
  `);

  await ensureColumnExists("workflow_requests", "rejection_reason", "TEXT NULL");
  await ensureColumnExists("workflow_requests", "rejected_by_role", "VARCHAR(100) NULL");
  await ensureColumnExists("workflow_requests", "rejected_at", "DATETIME NULL");
  await ensureColumnExists("workflow_requests", "cancellation_reason", "TEXT NULL");
  await ensureColumnExists("workflow_requests", "cancelled_by_role", "VARCHAR(100) NULL");
  await ensureColumnExists("workflow_requests", "cancelled_at", "DATETIME NULL");

  await ensureColumnExists(
    "workflow_release_records",
    "claimant_type",
    "VARCHAR(50) NULL"
  );
  await ensureColumnExists(
    "workflow_release_records",
    "claimant_relationship",
    "VARCHAR(100) NULL"
  );
  await ensureColumnExists(
    "workflow_release_records",
    "claimant_id_type",
    "VARCHAR(100) NULL"
  );
  await ensureColumnExists(
    "workflow_release_records",
    "claimant_id_number",
    "VARCHAR(100) NULL"
  );
  await ensureColumnExists(
    "workflow_release_records",
    "authorization_letter_file_path",
    "VARCHAR(500) NULL"
  );
  await ensureColumnExists(
    "workflow_release_records",
    "claimant_id_file_path",
    "VARCHAR(500) NULL"
  );
  await ensureColumnExists(
    "workflow_release_records",
    "signature_file_path",
    "VARCHAR(500) NULL"
  );

  await sequelize.query(`
    UPDATE workflow_requests
    SET current_status = CASE current_status
      WHEN 'UNDER_REGISTRAR_REVIEW' THEN 'UNDER_REGISTRAR_VERIFICATION'
      WHEN 'AWAITING_DEAN_APPROVAL' THEN 'UNDER_DEAN_APPROVAL'
      WHEN 'AWAITING_COLLEGE_ADMIN_REVIEW' THEN 'UNDER_COLLEGE_ADMIN_REVIEW'
      WHEN 'FOR_PROCESSING' THEN 'UNDER_REGISTRAR_PROCESSING'
      WHEN 'DOCUMENT_PREPARING' THEN 'DOCUMENT_GENERATION'
      ELSE current_status
    END
    WHERE current_status IN (
      'UNDER_REGISTRAR_REVIEW',
      'AWAITING_DEAN_APPROVAL',
      'AWAITING_COLLEGE_ADMIN_REVIEW',
      'FOR_PROCESSING',
      'DOCUMENT_PREPARING'
    )
  `);

  await sequelize.query(`
    UPDATE workflow_request_actions
    SET from_status = CASE from_status
      WHEN 'UNDER_REGISTRAR_REVIEW' THEN 'UNDER_REGISTRAR_VERIFICATION'
      WHEN 'AWAITING_DEAN_APPROVAL' THEN 'UNDER_DEAN_APPROVAL'
      WHEN 'AWAITING_COLLEGE_ADMIN_REVIEW' THEN 'UNDER_COLLEGE_ADMIN_REVIEW'
      WHEN 'FOR_PROCESSING' THEN 'UNDER_REGISTRAR_PROCESSING'
      WHEN 'DOCUMENT_PREPARING' THEN 'DOCUMENT_GENERATION'
      ELSE from_status
    END,
    to_status = CASE to_status
      WHEN 'UNDER_REGISTRAR_REVIEW' THEN 'UNDER_REGISTRAR_VERIFICATION'
      WHEN 'AWAITING_DEAN_APPROVAL' THEN 'UNDER_DEAN_APPROVAL'
      WHEN 'AWAITING_COLLEGE_ADMIN_REVIEW' THEN 'UNDER_COLLEGE_ADMIN_REVIEW'
      WHEN 'FOR_PROCESSING' THEN 'UNDER_REGISTRAR_PROCESSING'
      WHEN 'DOCUMENT_PREPARING' THEN 'DOCUMENT_GENERATION'
      ELSE to_status
    END
    WHERE from_status IN (
      'UNDER_REGISTRAR_REVIEW',
      'AWAITING_DEAN_APPROVAL',
      'AWAITING_COLLEGE_ADMIN_REVIEW',
      'FOR_PROCESSING',
      'DOCUMENT_PREPARING'
    )
    OR to_status IN (
      'UNDER_REGISTRAR_REVIEW',
      'AWAITING_DEAN_APPROVAL',
      'AWAITING_COLLEGE_ADMIN_REVIEW',
      'FOR_PROCESSING',
      'DOCUMENT_PREPARING'
    )
  `);

  await sequelize.query(`
    UPDATE workflow_generated_documents
    SET source_status = CASE source_status
      WHEN 'UNDER_REGISTRAR_REVIEW' THEN 'UNDER_REGISTRAR_VERIFICATION'
      WHEN 'AWAITING_DEAN_APPROVAL' THEN 'UNDER_DEAN_APPROVAL'
      WHEN 'AWAITING_COLLEGE_ADMIN_REVIEW' THEN 'UNDER_COLLEGE_ADMIN_REVIEW'
      WHEN 'FOR_PROCESSING' THEN 'UNDER_REGISTRAR_PROCESSING'
      WHEN 'DOCUMENT_PREPARING' THEN 'DOCUMENT_GENERATION'
      ELSE source_status
    END
    WHERE source_status IN (
      'UNDER_REGISTRAR_REVIEW',
      'AWAITING_DEAN_APPROVAL',
      'AWAITING_COLLEGE_ADMIN_REVIEW',
      'FOR_PROCESSING',
      'DOCUMENT_PREPARING'
    )
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

const getUserPermissions = (user: AuthUser) => {
  const tokenPermissions = Array.isArray(user.permissions)
    ? user.permissions.map((permission) => String(permission).trim()).filter(Boolean)
    : [];

  if (tokenPermissions.length > 0) {
    return Array.from(new Set(tokenPermissions)).sort();
  }

  return getPermissionsForRolesSync(getRoleNames(user));
};

const hasAnyPermission = (user: AuthUser, requiredPermissions: string[] = []) => {
  if (requiredPermissions.length === 0) {
    return true;
  }

  const permissions = getUserPermissions(user);
  return requiredPermissions.some((permission) => permissions.includes(permission));
};

const buildDocumentAccessPolicy = (detail: any, user?: AuthUser) => {
  const roles = user ? getRoleNames(user) : [];
  const isStaff =
    roles.includes("admin") ||
    roles.includes("registrar") ||
    roles.includes("dean") ||
    roles.includes("college_admin") ||
    roles.includes("treasurer");

  if (isStaff) {
    return {
      can_view_generated_document: true,
      can_download_generated_document: true,
      can_view_claim_stub: true,
      can_download_claim_stub: true,
      generated_document_reason: "staff_access",
      claim_stub_reason: "staff_access",
    };
  }

  const currentStatus = detail.current_status as WorkflowStatus;
  const releaseMethod = String(
    detail.release_snapshot?.release_method || detail.delivery_method || ""
  ).toLowerCase();

  const isPickup = releaseMethod === "pickup";

  return {
    can_view_generated_document: false,
    can_download_generated_document: false,
    can_view_claim_stub:
      isPickup &&
      ["READY_FOR_RELEASE", "CLAIMED", "COMPLETED"].includes(currentStatus) &&
      Boolean(detail.latest_claim_stub),
    can_download_claim_stub:
      isPickup &&
      ["READY_FOR_RELEASE", "CLAIMED", "COMPLETED"].includes(currentStatus) &&
      Boolean(detail.latest_claim_stub),
    generated_document_reason: "pickup_release_blocks_student_download",
    claim_stub_reason: isPickup ? "pickup_claim_required" : "claim_stub_not_applicable",
  };
};

const getWorkflowRequestAcademicScope = (detail: any) => {
  const academicSnapshot = detail?.academic_snapshot || {};
  const parseScopeId = (value: unknown) => {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  };

  return {
    course_id: parseScopeId(academicSnapshot.course_id),
    department_id: parseScopeId(academicSnapshot.department_id),
    college_id: parseScopeId(academicSnapshot.college_id),
  };
};

const hasScopedDeanAccess = async (detail: any, userId: number) => {
  if (detail.dean_user_id === userId) {
    return true;
  }

  const scope = getWorkflowRequestAcademicScope(detail);

  if (!scope.course_id && !scope.department_id && !scope.college_id) {
    return false;
  }

  const [match]: any[] = await sequelize.query(
    `
    SELECT 1
    FROM workflow_dean_assignments
    WHERE user_id = :userId
      AND is_active = 1
      AND (
        course_id = :courseId
        OR department_id = :departmentId
        OR college_id = :collegeId
      )
    LIMIT 1
    `,
    {
      replacements: {
        userId,
        courseId: scope.course_id,
        departmentId: scope.department_id,
        collegeId: scope.college_id,
      },
      type: QueryTypes.SELECT,
    }
  );

  return Boolean(match);
};

const hasScopedCollegeAdminAccess = async (detail: any, userId: number) => {
  if (detail.college_admin_user_id === userId) {
    return true;
  }

  const scope = getWorkflowRequestAcademicScope(detail);

  if (!scope.college_id) {
    return false;
  }

  const [match]: any[] = await sequelize.query(
    `
    SELECT 1
    FROM workflow_college_admin_assignments
    WHERE user_id = :userId
      AND college_id = :collegeId
      AND is_active = 1
    LIMIT 1
    `,
    {
      replacements: {
        userId,
        collegeId: scope.college_id,
      },
      type: QueryTypes.SELECT,
    }
  );

  return Boolean(match);
};

const assertCanViewWorkflowRequest = async (
  detail: any,
  user: AuthUser,
  roles: string[]
) => {
  if (roles.includes("admin") || roles.includes("registrar")) {
    if (!hasAnyPermission(user, [VIEW_PERMISSION_RULES.admin])) {
      throw new Error("Missing permission to view workflow requests");
    }
    return;
  }

  if (
    roles.some((role) => PORTAL_ROLES.includes(role as (typeof PORTAL_ROLES)[number])) ||
    PORTAL_ROLES.includes(String(user.account_type || "").toLowerCase() as any)
  ) {
    if (!hasAnyPermission(user, [VIEW_PERMISSION_RULES.portal])) {
      throw new Error("Missing permission to view own workflow requests");
    }
    if (detail.student_user_id !== user.user_id) {
      throw new Error("You do not have access to this workflow request");
    }
    return;
  }

  if (roles.includes("dean")) {
    if (!hasAnyPermission(user, [VIEW_PERMISSION_RULES.dean])) {
      throw new Error("Missing permission to view dean workflow requests");
    }
    if (!(await hasScopedDeanAccess(detail, user.user_id))) {
      throw new Error("You do not have access to this dean workflow request");
    }
    return;
  }

  if (roles.includes("college_admin")) {
    if (!hasAnyPermission(user, [VIEW_PERMISSION_RULES.college_admin])) {
      throw new Error("Missing permission to view college workflow requests");
    }
    if (!(await hasScopedCollegeAdminAccess(detail, user.user_id))) {
      throw new Error("You do not have access to this college workflow request");
    }
    return;
  }

  if (roles.includes("treasurer")) {
    if (
      !hasAnyPermission(user, [
        VIEW_PERMISSION_RULES.treasurer,
      ])
    ) {
      throw new Error("Missing permission to view payment workflow requests");
    }
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

const hasCompletedDocumentHistory = async (
  studentId: number,
  documentTypeId: number
) => {
  const [workflowHistory]: any[] = await sequelize.query(
    `
    SELECT 1
    FROM workflow_requests wr
    JOIN workflow_request_items wri ON wri.workflow_request_id = wr.workflow_request_id
    WHERE wr.student_id = :studentId
      AND wri.document_type_id = :documentTypeId
      AND wr.current_status = 'COMPLETED'
    LIMIT 1
    `,
    {
      replacements: { studentId, documentTypeId },
      type: QueryTypes.SELECT,
    }
  );

  if (workflowHistory) {
    return true;
  }

  const [legacyHistory]: any[] = await sequelize.query(
    `
    SELECT 1
    FROM document_requests
    WHERE student_id = :studentId
      AND document_type_id = :documentTypeId
      AND request_status = 'completed'
    LIMIT 1
    `,
    {
      replacements: { studentId, documentTypeId },
      type: QueryTypes.SELECT,
    }
  );

  return Boolean(legacyHistory);
};

const assertCanAdvance = (user: AuthUser, roles: string[], targetStatus: WorkflowStatus) => {
  const allowedRoles = TARGET_STATUS_ROLE_RULES[targetStatus] || [];
  const allowedPermissions = TARGET_STATUS_PERMISSION_RULES[targetStatus] || [];

  if (allowedRoles.length > 0 && !roles.some((role) => allowedRoles.includes(role))) {
    throw new Error(`Only ${allowedRoles.join(", ")} can move a request to ${targetStatus}`);
  }

  if (!hasAnyPermission(user, allowedPermissions)) {
    throw new Error(`Missing permission to move a request to ${targetStatus}`);
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

  const paymentSubmissions: any[] = await sequelize.query(
    `
    SELECT *
    FROM workflow_payment_submissions
    WHERE workflow_request_id = :workflowRequestId
    ORDER BY submitted_at DESC, workflow_payment_submission_id DESC
    `,
    {
      replacements: { workflowRequestId },
      type: QueryTypes.SELECT,
    }
  );

  const releaseLogs: any[] = await sequelize.query(
    `
    SELECT *
    FROM workflow_release_claim_logs
    WHERE workflow_request_id = :workflowRequestId
    ORDER BY acted_at ASC, workflow_release_claim_log_id ASC
    `,
    {
      replacements: { workflowRequestId },
      type: QueryTypes.SELECT,
    }
  );

  const attachments: any[] = await sequelize.query(
    `
    SELECT
      workflow_request_attachment_id,
      attachment_label,
      original_file_name,
      stored_file_name,
      file_path,
      mime_type,
      file_size,
      uploaded_by_user_id,
      uploaded_at
    FROM workflow_request_attachments
    WHERE workflow_request_id = :workflowRequestId
    ORDER BY uploaded_at ASC, workflow_request_attachment_id ASC
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
    payment_submissions: paymentSubmissions,
    attachments,
    release_logs: releaseLogs.map((log) => ({
      ...log,
      metadata_json: parseJsonField(log.metadata_json, {}),
    })),
    latest_generated_document: document || null,
    latest_claim_stub: claimStub
      ? {
          workflow_claim_stub_id: claimStub.workflow_claim_stub_id,
          claim_stub_number: claimStub.claim_stub_number,
          claim_stub_status: claimStub.claim_stub_status,
          file_name: claimStub.file_name,
          file_path: claimStub.file_path,
          generated_at: claimStub.generated_at,
          used_at: claimStub.used_at,
          voided_at: claimStub.voided_at,
        }
      : null,
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
  const lookupTokenHash = crypto.createHash("sha256").update(lookupToken).digest("hex");
  const verificationUrl = `${
    process.env.FRONTEND_URL || "http://localhost:3000"
  }/admin/workflow/claim-verification?token=${lookupToken}`;
  const generated = await generateClaimStubPdf({
    request_reference: detail.request_reference,
    claim_stub_number: claimStubNumber,
    current_status: detail.current_status,
    submitted_at: detail.submitted_at,
    academic_snapshot: detail.academic_snapshot,
    release_snapshot: detail.release_snapshot,
    items: detail.items,
    purpose: detail.purpose,
    lookup_token: lookupToken,
    verification_url: verificationUrl,
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
        lookupTokenHash,
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
      verification_url: verificationUrl,
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
  const normalizedAccountType = String(user.account_type || "").toLowerCase();
  const isPortalUser =
    roles.some((role) => PORTAL_ROLES.includes(role as (typeof PORTAL_ROLES)[number])) ||
    PORTAL_ROLES.includes(normalizedAccountType as any);

  if (!isPortalUser) {
    throw new Error("Only students or alumni can submit workflow requests");
  }

  if (!hasAnyPermission(user, ["request.create"])) {
    throw new Error("Missing permission to create workflow requests");
  }

  if (!Array.isArray(payload.requested_document_ids) || payload.requested_document_ids.length === 0) {
    throw new Error("At least one requested document is required");
  }

  const requiredFieldChecks: Array<[string, string | null | undefined]> = [
    ["civil_status", payload.civil_status],
    ["gender", payload.gender],
    ["contact_number", payload.contact_number],
    ["address_line", payload.address_line],
    ["academic_year_label", payload.academic_year_label],
    ["purpose", payload.purpose],
  ];

  for (const [field, value] of requiredFieldChecks) {
    if (!String(value || "").trim()) {
      throw new Error(`Field ${field} is required`);
    }
  }

  if (String(payload.delivery_method || "").toLowerCase() !== "pickup") {
    throw new Error("Only pickup release is supported");
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
    SELECT document_type_id, document_name, base_price, is_free_first_time, requirements
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

  const attachments = Array.isArray(payload.attachments) ? payload.attachments : [];

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
      const isFirstTimeFreeEligible =
        Boolean(document.is_free_first_time) &&
        !(await hasCompletedDocumentHistory(student.student_id, document.document_type_id));
      const finalPrice = isFirstTimeFreeEligible ? 0 : Number(document.base_price || 0);

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
            finalPrice,
          },
          transaction,
          type: QueryTypes.INSERT,
        }
      );
    }

    for (const attachment of attachments) {
      await sequelize.query(
        `
        INSERT INTO workflow_request_attachments (
          workflow_request_id,
          attachment_label,
          original_file_name,
          stored_file_name,
          file_path,
          mime_type,
          file_size,
          uploaded_by_user_id,
          uploaded_at
        ) VALUES (
          :workflowRequestId,
          :attachmentLabel,
          :originalFileName,
          :storedFileName,
          :filePath,
          :mimeType,
          :fileSize,
          :uploadedByUserId,
          NOW()
        )
        `,
        {
          replacements: {
            workflowRequestId,
            attachmentLabel: attachment.attachment_label || "Request attachment",
            originalFileName: attachment.original_file_name,
            storedFileName: attachment.stored_file_name,
            filePath: attachment.file_path,
            mimeType: attachment.mime_type || null,
            fileSize: attachment.file_size || null,
            uploadedByUserId: user.user_id,
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
            attachment_count: attachments.length,
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
      attachment_count: attachments.length,
    },
  });

  if (attachments.length > 0) {
    await createWorkflowAuditLog({
      userId: user.user_id,
      action: "WORKFLOW_REQUIREMENTS_UPLOADED",
      workflowRequestId: created.workflow_request_id,
      newValue: {
        attachment_count: attachments.length,
        file_names: attachments.map((attachment) => attachment.original_file_name),
      },
    });
  }

  if (academicScope.dean_user_id) {
    await createWorkflowNotification({
      userId: academicScope.dean_user_id,
      title: "Dean approval required",
      message: `Request ${requestReference} is ready for registrar verification and dean routing.`,
      status: "SUBMITTED",
    });
  }

  await createWorkflowNotification({
    userId: user.user_id,
    title: "Request submitted",
    message: `Your request ${requestReference} has been submitted successfully.`,
    status: "SUBMITTED",
  });

  return getRequestDetailInternal(created.workflow_request_id);
};

export const listWorkflowRequests = async (
  user: AuthUser,
  filters?: {
    search?: string;
    status?: string;
    payment_status?: string;
    document_type_id?: string | number;
    from_date?: string;
    to_date?: string;
    page?: number;
    limit?: number;
  }
) => {
  await ensureWorkflowSchema();

  const roles = getRoleNames(user);
  const whereClauses: string[] = [];
  const replacements: Record<string, any> = {};
  const page = Math.max(1, Number(filters?.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(filters?.limit) || 12));
  const offset = (page - 1) * limit;

  if (
    roles.some((role) => PORTAL_ROLES.includes(role as (typeof PORTAL_ROLES)[number])) ||
    PORTAL_ROLES.includes(String(user.account_type || "").toLowerCase() as any)
  ) {
    if (!hasAnyPermission(user, [VIEW_PERMISSION_RULES.portal])) {
      throw new Error("Missing permission to list own workflow requests");
    }
    whereClauses.push("wr.student_user_id = :userId");
    replacements.userId = user.user_id;
  } else if (roles.includes("admin") || roles.includes("registrar")) {
    if (!hasAnyPermission(user, [VIEW_PERMISSION_RULES.admin])) {
      throw new Error("Missing permission to list workflow requests");
    }
    // Operational staff can see the full queue.
  } else if (roles.includes("dean")) {
    if (!hasAnyPermission(user, [VIEW_PERMISSION_RULES.dean])) {
      throw new Error("Missing permission to list dean workflow queue");
    }
    whereClauses.push(`
      (
        wr.dean_user_id = :userId
        OR EXISTS (
          SELECT 1
          FROM workflow_dean_assignments wda
          WHERE wda.user_id = :userId
            AND wda.is_active = 1
            AND (
              wda.course_id = CAST(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(wr.academic_snapshot_json, '$.course_id')), '') AS UNSIGNED)
              OR wda.department_id = CAST(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(wr.academic_snapshot_json, '$.department_id')), '') AS UNSIGNED)
              OR wda.college_id = CAST(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(wr.academic_snapshot_json, '$.college_id')), '') AS UNSIGNED)
            )
        )
      )
    `);
    replacements.userId = user.user_id;
  } else if (roles.includes("college_admin")) {
    if (!hasAnyPermission(user, [VIEW_PERMISSION_RULES.college_admin])) {
      throw new Error("Missing permission to list college workflow queue");
    }
    whereClauses.push(`
      (
        wr.college_admin_user_id = :userId
        OR EXISTS (
          SELECT 1
          FROM workflow_college_admin_assignments wcaa
          WHERE wcaa.user_id = :userId
            AND wcaa.is_active = 1
            AND wcaa.college_id = CAST(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(wr.academic_snapshot_json, '$.college_id')), '') AS UNSIGNED)
        )
      )
    `);
    replacements.userId = user.user_id;
  } else if (roles.includes("treasurer")) {
    if (
      !hasAnyPermission(user, [
        VIEW_PERMISSION_RULES.treasurer,
      ])
    ) {
      throw new Error("Missing permission to list payment workflow queue");
    }
    whereClauses.push("wr.current_status IN (:paymentVisibleStatuses)");
    replacements.paymentVisibleStatuses = PAYMENT_VISIBLE_STATUSES;
  } else {
    throw new Error("You do not have access to list workflow requests");
  }

  if (filters?.status) {
    whereClauses.push("wr.current_status = :statusFilter");
    replacements.statusFilter = filters.status;
  }

  if (filters?.payment_status) {
    whereClauses.push(
      "COALESCE(JSON_UNQUOTE(JSON_EXTRACT(wr.payment_snapshot_json, '$.payment_status')), 'PENDING') = :paymentStatusFilter"
    );
    replacements.paymentStatusFilter = filters.payment_status;
  }

  if (filters?.from_date) {
    whereClauses.push("DATE(wr.submitted_at) >= :fromDateFilter");
    replacements.fromDateFilter = filters.from_date;
  }

  if (filters?.to_date) {
    whereClauses.push("DATE(wr.submitted_at) <= :toDateFilter");
    replacements.toDateFilter = filters.to_date;
  }

  if (filters?.document_type_id) {
    whereClauses.push(
      "EXISTS (SELECT 1 FROM workflow_request_items wri_filter WHERE wri_filter.workflow_request_id = wr.workflow_request_id AND wri_filter.document_type_id = :documentTypeFilter)"
    );
    replacements.documentTypeFilter = Number(filters.document_type_id);
  }

  if (filters?.search?.trim()) {
    whereClauses.push(
      `(
        LOWER(wr.request_reference) LIKE :searchFilter
        OR LOWER(COALESCE(JSON_UNQUOTE(JSON_EXTRACT(wr.academic_snapshot_json, '$.full_name')), '')) LIKE :searchFilter
        OR LOWER(COALESCE(JSON_UNQUOTE(JSON_EXTRACT(wr.academic_snapshot_json, '$.course_name')), '')) LIKE :searchFilter
        OR LOWER(COALESCE(wr.purpose, '')) LIKE :searchFilter
        OR EXISTS (
          SELECT 1
          FROM workflow_request_items wri_search
          WHERE wri_search.workflow_request_id = wr.workflow_request_id
            AND LOWER(COALESCE(wri_search.document_name, '')) LIKE :searchFilter
        )
      )`
    );
    replacements.searchFilter = `%${filters.search.trim().toLowerCase()}%`;
  }

  const totalRows = (await sequelize.query(
    `
    SELECT COUNT(*) AS total
    FROM workflow_requests wr
    ${whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : ""}
    `,
    {
      replacements,
      type: QueryTypes.SELECT,
    }
  )) as Array<{ total: number | string }>;

  const total = Number(totalRows[0]?.total || 0);

  const rows: any[] = await sequelize.query(
    `
    SELECT
      wr.workflow_request_id,
      wr.request_reference,
      wr.current_status,
      wr.purpose,
      wr.delivery_method,
      wr.rejection_reason,
      wr.rejected_by_role,
      wr.rejected_at,
      wr.cancellation_reason,
      wr.cancelled_by_role,
      wr.cancelled_at,
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
      ) AS latest_claim_stub_number
    FROM workflow_requests wr
    ${whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : ""}
    ORDER BY wr.updated_at DESC, wr.workflow_request_id DESC
    LIMIT :limit OFFSET :offset
    `,
    {
      replacements: {
        ...replacements,
        limit,
        offset,
      },
      type: QueryTypes.SELECT,
    }
  );

  const requestIds = rows.map((row) => Number(row.workflow_request_id)).filter(Boolean);
  const itemRows: any[] = requestIds.length
    ? await sequelize.query(
        `
        SELECT
          workflow_request_id,
          document_type_id,
          document_name,
          quantity,
          final_price
        FROM workflow_request_items
        WHERE workflow_request_id IN (:requestIds)
        ORDER BY workflow_request_id ASC, workflow_request_item_id ASC
        `,
        {
          replacements: { requestIds },
          type: QueryTypes.SELECT,
        }
      )
    : [];

  const itemsByRequestId = itemRows.reduce<Record<number, any[]>>((acc, item) => {
    const key = Number(item.workflow_request_id);
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push({
      document_type_id: item.document_type_id,
      document_name: item.document_name,
      quantity: item.quantity,
      final_price: item.final_price,
    });
    return acc;
  }, {});

  const items = rows.map((row) => {
    const mapped = {
      ...row,
      academic_snapshot: parseJsonField(row.academic_snapshot_json, {}),
      approval_snapshot: parseJsonField(row.approval_snapshot_json, {}),
      fee_snapshot: parseJsonField(row.fee_snapshot_json, {}),
      payment_snapshot: parseJsonField(row.payment_snapshot_json, {}),
      items: itemsByRequestId[Number(row.workflow_request_id)] || [],
      allowed_actions: Object.entries(WORKFLOW_ACTION_RULES)
        .filter(([, rule]) => {
          const currentStatus = row.current_status as WorkflowStatus;
          return (
            rule.currentStatuses.includes(currentStatus) &&
            canPerformWorkflowRule(user, roles, rule)
          );
        })
        .map(([action]) => action),
      permissions: getUserPermissions(user),
    };

    return {
      ...mapped,
      document_access: buildDocumentAccessPolicy(mapped, user),
    };
  });

  return {
    items,
    meta: {
      page,
      limit,
      total,
      total_pages: total > 0 ? Math.ceil(total / limit) : 1,
    },
  };
};

export const getWorkflowRequestDetail = async (
  workflowRequestId: number,
  user: AuthUser
) => {
  await ensureWorkflowSchema();

  const detail = await getRequestDetailInternal(workflowRequestId);
  const roles = getRoleNames(user);
  await assertCanViewWorkflowRequest(detail, user, roles);

  return {
    ...detail,
    allowed_next_statuses:
      WORKFLOW_TRANSITIONS[detail.current_status as WorkflowStatus] || [],
    allowed_actions: Object.entries(WORKFLOW_ACTION_RULES)
      .filter(([, rule]) => {
        const currentStatus = detail.current_status as WorkflowStatus;
        return (
          rule.currentStatuses.includes(currentStatus) &&
          canPerformWorkflowRule(user, roles, rule)
        );
      })
      .map(([action]) => action),
    permissions: getUserPermissions(user),
    document_access: buildDocumentAccessPolicy(detail, user),
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
  assertCanAdvance(user, roles, body.target_status);

  const approvalSnapshot = { ...detail.approval_snapshot };
  const feeSnapshot = { ...detail.fee_snapshot };
  const paymentSnapshot = { ...detail.payment_snapshot };
  const releaseSnapshot = { ...detail.release_snapshot };
  const remarks = body.remarks?.trim() || null;
  const updates = body.updates || {};
  let nextDeanUserId = detail.dean_user_id || null;
  let nextCollegeAdminUserId = detail.college_admin_user_id || null;

  if (body.target_status === "UNDER_REGISTRAR_VERIFICATION") {
    approvalSnapshot.registrar_status = "UNDER REVIEW";
    approvalSnapshot.registrar_name =
      updates.registrar_name || approvalSnapshot.registrar_name || "Registrar";
    approvalSnapshot.registrar_remarks = remarks;
  }

  if (body.target_status === "UNDER_DEAN_APPROVAL") {
    const scope = await resolveAcademicScope(
      getWorkflowRequestAcademicScope(detail).course_id
    );
    nextDeanUserId = scope.dean_user_id || detail.dean_user_id || null;

    if (!nextDeanUserId) {
      throw new Error("Dean assignment is missing for this request");
    }
    approvalSnapshot.registrar_status = "VERIFIED";
    approvalSnapshot.registrar_name =
      updates.registrar_name || approvalSnapshot.registrar_name || "Registrar";
    approvalSnapshot.registrar_forwarded_at = new Date().toISOString();
    approvalSnapshot.registrar_signature_file_name =
      updates.signature_file_name ||
      approvalSnapshot.registrar_signature_file_name ||
      null;
    approvalSnapshot.registrar_signature_file_path =
      updates.signature_file_path ||
      approvalSnapshot.registrar_signature_file_path ||
      null;
  }

  if (body.target_status === "DEAN_APPROVED") {
    assertSignaturePresent(
      updates.signature_file_path,
      "Dean signature is required before approving this request"
    );
    approvalSnapshot.dean_status = "APPROVED";
    approvalSnapshot.dean_name =
      updates.dean_name || approvalSnapshot.dean_name || "Dean";
    approvalSnapshot.dean_approved_at = new Date().toISOString();
    approvalSnapshot.dean_remarks = remarks;
    approvalSnapshot.dean_signature_file_name =
      updates.signature_file_name || approvalSnapshot.dean_signature_file_name || null;
    approvalSnapshot.dean_signature_file_path =
      updates.signature_file_path || approvalSnapshot.dean_signature_file_path || null;
  }

  if (body.target_status === "UNDER_COLLEGE_ADMIN_REVIEW") {
    const scope = await resolveAcademicScope(
      getWorkflowRequestAcademicScope(detail).course_id
    );
    nextCollegeAdminUserId =
      scope.college_admin_user_id || detail.college_admin_user_id || null;

    if (!nextCollegeAdminUserId) {
      throw new Error(
        "College administrator assignment is missing for this request"
      );
    }
  }

  if (body.target_status === "COLLEGE_ADMIN_APPROVED") {
    assertSignaturePresent(
      updates.signature_file_path,
      "College administrator signature is required before approving this request"
    );
    approvalSnapshot.college_admin_status = "APPROVED";
    approvalSnapshot.college_admin_name =
      updates.college_admin_name ||
      approvalSnapshot.college_admin_name ||
      "College Administrator";
    approvalSnapshot.college_admin_approved_at = new Date().toISOString();
    approvalSnapshot.college_admin_remarks = remarks;
    approvalSnapshot.college_admin_signature_file_name =
      updates.signature_file_name ||
      approvalSnapshot.college_admin_signature_file_name ||
      null;
    approvalSnapshot.college_admin_signature_file_path =
      updates.signature_file_path ||
      approvalSnapshot.college_admin_signature_file_path ||
      null;
  }

  if (body.target_status === "FEE_ASSESSED") {
    const defaultAssessedFee = detail.items.reduce(
      (sum: number, item: any) => sum + Number(item.final_price ?? item.base_price ?? 0),
      0
    );
    feeSnapshot.assessed_by_role = getPrimaryRole(user);
    feeSnapshot.assessed_fee =
      updates.assessed_fee ?? feeSnapshot.assessed_fee ?? defaultAssessedFee;
    feeSnapshot.final_fee =
      updates.final_fee ??
      feeSnapshot.final_fee ??
      feeSnapshot.assessed_fee ??
      defaultAssessedFee;
    feeSnapshot.assessed_at = new Date().toISOString();
    feeSnapshot.notes = remarks;
  }

  if (body.target_status === "PAYMENT_SUBMITTED") {
    paymentSnapshot.payment_status = "PAYMENT_SUBMITTED";
    paymentSnapshot.payment_reference_number =
      updates.payment_reference_number || paymentSnapshot.payment_reference_number || null;
    paymentSnapshot.payment_channel =
      updates.payment_channel || paymentSnapshot.payment_channel || null;
    paymentSnapshot.proof_file_name =
      updates.proof_file_name || paymentSnapshot.proof_file_name || null;
    paymentSnapshot.proof_file_path =
      updates.proof_file_path || paymentSnapshot.proof_file_path || null;
    paymentSnapshot.submission_notes = remarks;
    paymentSnapshot.submitted_at = new Date().toISOString();
  }

  if (body.target_status === "PAYMENT_CONFIRMED") {
    assertSignaturePresent(
      updates.signature_file_path,
      "Treasurer signature is required before confirming payment"
    );
    paymentSnapshot.payment_status = "CONFIRMED";
    paymentSnapshot.official_receipt_no =
      updates.official_receipt_no || paymentSnapshot.official_receipt_no || null;
    paymentSnapshot.confirmed_at = new Date().toISOString();
    paymentSnapshot.confirmed_by_name =
      updates.confirmed_by_name ||
      paymentSnapshot.confirmed_by_name ||
      "Treasurer";
    paymentSnapshot.confirmation_notes = remarks;
    paymentSnapshot.confirmed_by_signature_file_name =
      updates.signature_file_name ||
      paymentSnapshot.confirmed_by_signature_file_name ||
      null;
    paymentSnapshot.confirmed_by_signature_file_path =
      updates.signature_file_path ||
      paymentSnapshot.confirmed_by_signature_file_path ||
      null;
  }

  if (body.target_status === "UNDER_REGISTRAR_PROCESSING") {
    approvalSnapshot.registrar_processing_owner =
      updates.registrar_name ||
      approvalSnapshot.registrar_name ||
      "Registrar";
  }

  if (body.target_status === "DOCUMENT_GENERATION") {
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

  if (body.target_status === "CLAIMED") {
    releaseSnapshot.release_method = "pickup";
    releaseSnapshot.date_released = new Date().toISOString();
    releaseSnapshot.claimant_name =
      updates.claimant_name || releaseSnapshot.claimant_name || null;
    releaseSnapshot.claimant_type =
      updates.claimant_type || releaseSnapshot.claimant_type || "student";
    releaseSnapshot.claimant_relationship =
      updates.claimant_relationship || releaseSnapshot.claimant_relationship || null;
    releaseSnapshot.claimant_id_type =
      updates.claimant_id_type || releaseSnapshot.claimant_id_type || null;
    releaseSnapshot.claimant_id_number =
      updates.claimant_id_number || releaseSnapshot.claimant_id_number || null;
    releaseSnapshot.authorization_letter_file_path =
      updates.authorization_letter_file_path ||
      releaseSnapshot.authorization_letter_file_path ||
      null;
    releaseSnapshot.claimant_id_file_path =
      updates.claimant_id_file_path || releaseSnapshot.claimant_id_file_path || null;
    releaseSnapshot.signature_file_path =
      updates.signature_file_path || releaseSnapshot.signature_file_path || null;
    releaseSnapshot.authorized_representative_name =
      updates.authorized_representative_name ||
      releaseSnapshot.authorized_representative_name ||
      null;
    releaseSnapshot.authorized_representative_id_type =
      updates.authorized_representative_id_type ||
      releaseSnapshot.authorized_representative_id_type ||
      null;
    releaseSnapshot.authorized_representative_id_number =
      updates.authorized_representative_id_number ||
      releaseSnapshot.authorized_representative_id_number ||
      null;
    releaseSnapshot.claimed_by = releaseSnapshot.claimant_name;
    releaseSnapshot.release_status = "CLAIMED";
  }

  if (body.target_status === "COMPLETED") {
    releaseSnapshot.completed_at = new Date().toISOString();
    releaseSnapshot.release_status = "COMPLETED";
  }

  if (body.target_status === "CANCELLED") {
    if (!remarks) {
      throw new Error("Cancellation reason is required");
    }
    releaseSnapshot.release_status = "CANCELLED";
  }

  if (body.target_status === "REJECTED") {
    if (!remarks) {
      throw new Error("Rejection reason is required");
    }
    releaseSnapshot.release_status = "REJECTED";
  }

  await sequelize.transaction(async (transaction) => {
    await sequelize.query(
      `
      UPDATE workflow_requests
      SET
        dean_user_id = :deanUserId,
        college_admin_user_id = :collegeAdminUserId,
        current_status = :targetStatus,
        approval_snapshot_json = :approvalSnapshot,
        fee_snapshot_json = :feeSnapshot,
        payment_snapshot_json = :paymentSnapshot,
        release_snapshot_json = :releaseSnapshot,
        completed_at = CASE WHEN :targetStatus = 'COMPLETED' THEN NOW() ELSE completed_at END,
        rejection_reason = CASE WHEN :targetStatus = 'REJECTED' THEN :terminalRemarks ELSE rejection_reason END,
        rejected_by_role = CASE WHEN :targetStatus = 'REJECTED' THEN :actedByRole ELSE rejected_by_role END,
        rejected_at = CASE WHEN :targetStatus = 'REJECTED' THEN NOW() ELSE rejected_at END,
        cancellation_reason = CASE WHEN :targetStatus = 'CANCELLED' THEN :terminalRemarks ELSE cancellation_reason END,
        cancelled_by_role = CASE WHEN :targetStatus = 'CANCELLED' THEN :actedByRole ELSE cancelled_by_role END,
        cancelled_at = CASE WHEN :targetStatus = 'CANCELLED' THEN NOW() ELSE cancelled_at END
      WHERE workflow_request_id = :workflowRequestId
      `,
      {
        replacements: {
          deanUserId: nextDeanUserId,
          collegeAdminUserId: nextCollegeAdminUserId,
          targetStatus: body.target_status,
          approvalSnapshot: JSON.stringify(approvalSnapshot),
          feeSnapshot: JSON.stringify(feeSnapshot),
          paymentSnapshot: JSON.stringify(paymentSnapshot),
          releaseSnapshot: JSON.stringify(releaseSnapshot),
          terminalRemarks: remarks,
          actedByRole: getPrimaryRole(user),
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

  if (body.target_status === "PAYMENT_SUBMITTED") {
    await insertPaymentSubmissionRecord({
      workflowRequestId,
      submittedByUserId: user.user_id,
      payment: paymentSnapshot,
    });
  }

  let releaseRecordId: number | null = null;
  if (
    [
      "READY_FOR_RELEASE",
      "CLAIMED",
      "COMPLETED",
      "CANCELLED",
      "REJECTED",
    ].includes(
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

  if (body.target_status === "UNDER_DEAN_APPROVAL") {
    await createWorkflowNotification({
      userId: detail.student_user_id,
      title: "Registrar verification completed",
      message: `Request ${detail.request_reference} passed registrar verification and is now under dean approval.`,
      status: body.target_status,
    });

    await createWorkflowNotification({
      userId: nextDeanUserId,
      title: "Dean approval required",
      message: `Request ${detail.request_reference} is awaiting your approval.`,
      status: body.target_status,
    });
  }

  if (body.target_status === "UNDER_COLLEGE_ADMIN_REVIEW") {
    await createWorkflowNotification({
      userId: detail.student_user_id,
      title: "Dean approval completed",
      message: `Request ${detail.request_reference} has been approved by the dean and routed to college administration.`,
      status: body.target_status,
    });

    await createWorkflowNotification({
      userId: nextCollegeAdminUserId,
      title: "College review required",
      message: `Request ${detail.request_reference} is awaiting college administration review.`,
      status: body.target_status,
    });
  }

  if (body.target_status === "AWAITING_PAYMENT") {
    await createWorkflowNotification({
      userId: detail.student_user_id,
      title: "College administration review completed",
      message: `Request ${detail.request_reference} has cleared college administration review and is now at fee assessment/payment.`,
      status: body.target_status,
    });

    await createWorkflowNotification({
      userId: detail.student_user_id,
      title: "Payment required",
      message: `Request ${detail.request_reference} has been assessed and is awaiting payment confirmation.`,
      status: body.target_status,
    });
  }

  if (body.target_status === "PAYMENT_SUBMITTED") {
    await createWorkflowNotification({
      userId: detail.student_user_id,
      title: "Payment submitted",
      message: `Payment proof for request ${detail.request_reference} has been submitted and is awaiting treasurer confirmation.`,
      status: body.target_status,
    });
  }

  if (body.target_status === "UNDER_REGISTRAR_PROCESSING") {
    await createWorkflowNotification({
      userId: detail.student_user_id,
      title: "Payment confirmed",
      message: `Request ${detail.request_reference} has cleared payment and returned to registrar processing.`,
      status: body.target_status,
    });
  }

  if (body.target_status === "DOCUMENT_GENERATION") {
    await createWorkflowNotification({
      userId: detail.student_user_id,
      title: "Registrar processing started",
      message: `Registrar processing has started for request ${detail.request_reference}.`,
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

  if (["CLAIMED", "COMPLETED"].includes(body.target_status)) {
    await createWorkflowNotification({
      userId: detail.student_user_id,
      title: "Release update",
      message: `Request ${detail.request_reference} is now ${body.target_status
        .replace(/_/g, " ")
        .toLowerCase()}.`,
      status: body.target_status,
    });
  }

  if (body.target_status === "CANCELLED") {
    await createWorkflowNotification({
      userId: detail.student_user_id,
      title: "Request cancelled",
      message: `Request ${detail.request_reference} was cancelled. Reason: ${remarks}`,
      status: body.target_status,
    });
  }

  if (body.target_status === "REJECTED") {
    await createWorkflowNotification({
      userId: detail.student_user_id,
      title: "Request rejected",
      message: `Request ${detail.request_reference} was rejected. Reason: ${remarks}`,
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

  if (body.target_status === "CANCELLED" || body.target_status === "REJECTED") {
    await updateClaimStubStatus(workflowRequestId, "VOID");
  }

  return getWorkflowRequestDetail(workflowRequestId, user);
};

export const getWorkflowRequestLatestDocument = async (
  workflowRequestId: number,
  user?: AuthUser
) => {
  await ensureWorkflowSchema();

  let detail: any = null;
  if (user) {
    detail = await getWorkflowRequestDetail(workflowRequestId, user);
    if (
      getRoleNames(user).every((role) => !STAFF_ROLES.includes(role as any)) &&
      (!hasAnyPermission(user, ["document.view.own.allowed"]) ||
        !detail.document_access?.can_view_generated_document)
    ) {
      throw new Error("Generated document access is not allowed for this request yet");
    }
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

  if (user) {
    await createWorkflowAuditLog({
      userId: user.user_id,
      action: "GENERATED_DOCUMENT_VIEWED",
      workflowRequestId,
      newValue: {
        workflow_generated_document_id: document.workflow_generated_document_id,
        file_path: document.file_path,
      },
    });
  }

  return document;
};

export const getWorkflowRequestLatestDocumentDownload = async (
  workflowRequestId: number,
  user: AuthUser
) => {
  const document = await getWorkflowRequestLatestDocument(workflowRequestId, user);

  await createWorkflowAuditLog({
    userId: user.user_id,
    action: "GENERATED_DOCUMENT_DOWNLOADED",
    workflowRequestId,
    newValue: {
      workflow_generated_document_id: document.workflow_generated_document_id,
      file_path: document.file_path,
    },
  });

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

  if (
    getRoleNames(user).every((role) => !STAFF_ROLES.includes(role as any)) &&
    (!hasAnyPermission(user, ["claim_stub.view.own", "claim_stub.download.own"]) ||
      !detail.document_access?.can_view_claim_stub)
  ) {
    throw new Error("Claim stub access is not allowed for this request");
  }

  await createWorkflowAuditLog({
    userId: user.user_id,
    action: "CLAIM_STUB_VIEWED",
    workflowRequestId,
    newValue: {
      claim_stub_number: claimStub.claim_stub_number,
      file_path: claimStub.file_path,
    },
  });

  return claimStub;
};

export const getWorkflowRequestClaimStubDownload = async (
  workflowRequestId: number,
  user: AuthUser
) => {
  const claimStub = await getWorkflowRequestClaimStub(workflowRequestId, user);

  await createWorkflowAuditLog({
    userId: user.user_id,
    action: "CLAIM_STUB_DOWNLOADED",
    workflowRequestId,
    newValue: {
      claim_stub_number: claimStub.claim_stub_number,
      file_path: claimStub.file_path,
    },
  });

  return claimStub;
};

const parseClaimLookupToken = (lookupValue: string) => {
  const trimmed = lookupValue.trim();
  if (!trimmed) {
    return "";
  }

  try {
    const url = new URL(trimmed);
    return url.searchParams.get("token") || trimmed;
  } catch {
    return trimmed.replace(/^TMC-CLAIM:/i, "");
  }
};

export const lookupWorkflowClaimStub = async (
  user: AuthUser,
  input: {
    claim_stub_number?: string;
    request_reference?: string;
    lookup_token?: string;
  }
) => {
  await ensureWorkflowSchema();

  const roles = getRoleNames(user);
  if (
    (!roles.includes("registrar") && !roles.includes("admin")) ||
    !hasAnyPermission(user, ["claim_stub.verify"])
  ) {
    throw new Error("Only registrar or admin with claim stub verification permission can verify claim stubs");
  }

  const lookupToken = input.lookup_token ? parseClaimLookupToken(input.lookup_token) : "";
  const lookupTokenHash = lookupToken
    ? crypto.createHash("sha256").update(lookupToken).digest("hex")
    : "";

  const clauses: string[] = [];
  const replacements: Record<string, any> = {};

  if (input.claim_stub_number?.trim()) {
    clauses.push("wcs.claim_stub_number = :claimStubNumber");
    replacements.claimStubNumber = input.claim_stub_number.trim();
  }

  if (input.request_reference?.trim()) {
    clauses.push("wr.request_reference = :requestReference");
    replacements.requestReference = input.request_reference.trim();
  }

  if (lookupTokenHash) {
    clauses.push("wcs.lookup_token_hash = :lookupTokenHash");
    replacements.lookupTokenHash = lookupTokenHash;
  }

  if (clauses.length === 0) {
    throw new Error("Claim lookup requires a claim stub number, request reference, or QR token");
  }

  const [claimRow]: any[] = await sequelize.query(
    `
    SELECT
      wcs.workflow_claim_stub_id,
      wcs.claim_stub_number,
      wcs.claim_stub_status,
      wcs.file_path AS claim_stub_file_path,
      wr.workflow_request_id
    FROM workflow_claim_stubs wcs
    JOIN workflow_requests wr ON wr.workflow_request_id = wcs.workflow_request_id
    WHERE ${clauses.join(" OR ")}
    ORDER BY wcs.generated_at DESC, wcs.workflow_claim_stub_id DESC
    LIMIT 1
    `,
    {
      replacements,
      type: QueryTypes.SELECT,
    }
  );

  if (!claimRow) {
    throw new Error("Claim stub lookup failed");
  }

  const detail = await getRequestDetailInternal(Number(claimRow.workflow_request_id));
  const currentStatus = detail.current_status as WorkflowStatus;
  const invalidStatuses: WorkflowStatus[] = ["CANCELLED", "REJECTED", "COMPLETED"];

  await createWorkflowAuditLog({
    userId: user.user_id,
    action: "CLAIM_VERIFICATION_INITIATED",
    workflowRequestId: Number(claimRow.workflow_request_id),
    newValue: {
      claim_stub_number: claimRow.claim_stub_number,
      current_status: currentStatus,
    },
  });

  return {
    workflow_request_id: detail.workflow_request_id,
    request_reference: detail.request_reference,
    current_status: currentStatus,
    claim_stub: {
      workflow_claim_stub_id: claimRow.workflow_claim_stub_id,
      claim_stub_number: claimRow.claim_stub_number,
      claim_stub_status: claimRow.claim_stub_status,
      file_path: claimRow.claim_stub_file_path,
    },
    is_claimable:
      currentStatus === "READY_FOR_RELEASE" &&
      String(detail.release_snapshot?.release_method || detail.delivery_method || "").toLowerCase() ===
        "pickup" &&
      claimRow.claim_stub_status === "ACTIVE",
    claim_block_reason:
      invalidStatuses.includes(currentStatus)
        ? `Request is ${currentStatus.toLowerCase()}`
        : claimRow.claim_stub_status !== "ACTIVE"
        ? `Claim stub is ${String(claimRow.claim_stub_status).toLowerCase()}`
        : currentStatus !== "READY_FOR_RELEASE"
        ? `Request is ${currentStatus.toLowerCase()}`
        : null,
    academic_snapshot: detail.academic_snapshot,
    release_snapshot: detail.release_snapshot,
    items: detail.items,
    payment_snapshot: detail.payment_snapshot,
    latest_claim_stub: detail.latest_claim_stub,
    latest_generated_document: detail.latest_generated_document,
    actions: detail.actions,
  };
};

export const confirmWorkflowClaimStub = async (
  claimStubId: number,
  user: AuthUser,
  input: {
    remarks?: string;
    updates?: Record<string, any>;
  }
) => {
  await ensureWorkflowSchema();

  const [claimStub]: any[] = await sequelize.query(
    `
    SELECT workflow_request_id, claim_stub_status
    FROM workflow_claim_stubs
    WHERE workflow_claim_stub_id = :claimStubId
    LIMIT 1
    `,
    {
      replacements: { claimStubId },
      type: QueryTypes.SELECT,
    }
  );

  if (!claimStub) {
    throw new Error("Claim stub not found");
  }

  if (String(claimStub.claim_stub_status || "").toUpperCase() !== "ACTIVE") {
    throw new Error("Claim stub is no longer active");
  }

  const claimantType = String(input.updates?.claimant_type || "student").toLowerCase();
  if (
    claimantType === "representative" &&
    !(
      input.updates?.authorization_letter_file_path ||
      input.updates?.authorized_representative_name
    )
  ) {
    throw new Error("Representative claim requires authorization details");
  }

  return processWorkflowAction(
    Number(claimStub.workflow_request_id),
    user,
    "release_claim",
    input
  );
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
  const roles = getRoleNames(user);
  const matchingRule = QUEUE_ACCESS_RULES.find((rule) =>
    statuses.length === rule.statuses.length &&
    statuses.every((status) => rule.statuses.includes(status))
  );

  if (matchingRule) {
    const hasAllowedRole = roles.some((role) => matchingRule.roles.includes(role));
    const hasRequiredPermission = hasAnyPermission(user, matchingRule.permissions);

    if (!hasAllowedRole || !hasRequiredPermission) {
      throw new Error("You do not have access to this workflow queue");
    }
  }

  const result = await listWorkflowRequests(user, { page: 1, limit: 100 });
  return result.items.filter((item) =>
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

  if (!canPerformWorkflowRule(user, roles, rule)) {
    throw new Error(`Missing permission to perform ${action}`);
  }

  if (action === "registrar_verification") {
    if (currentStatus === "SUBMITTED") {
      await advanceWorkflowRequest(workflowRequestId, user, {
        target_status: "UNDER_REGISTRAR_VERIFICATION",
        remarks: input.remarks,
        updates: input.updates,
      });
    }

    return advanceWorkflowRequest(workflowRequestId, user, {
      target_status: "UNDER_DEAN_APPROVAL",
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
      target_status: "UNDER_COLLEGE_ADMIN_REVIEW",
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

  if (action === "payment_submit") {
    const finalFee = Number(
      detail.fee_snapshot?.final_fee ?? detail.fee_snapshot?.assessed_fee ?? 0
    );

    if (finalFee > 0 && !input.updates?.proof_file_path && !input.updates?.payment_reference_number) {
      throw new Error("Payment reference number or proof file is required");
    }

    return advanceWorkflowRequest(workflowRequestId, user, {
      target_status: "PAYMENT_SUBMITTED",
      remarks: input.remarks,
      updates: input.updates,
    });
  }

  if (action === "payment_confirm") {
    const finalFee = Number(
      detail.fee_snapshot?.final_fee ?? detail.fee_snapshot?.assessed_fee ?? 0
    );

    if (currentStatus === "AWAITING_PAYMENT" && finalFee > 0) {
      throw new Error(
        "Paid requests must have a submitted payment record before treasurer confirmation"
      );
    }

    await advanceWorkflowRequest(workflowRequestId, user, {
      target_status: "PAYMENT_CONFIRMED",
      remarks: input.remarks,
      updates: input.updates,
    });

    return advanceWorkflowRequest(workflowRequestId, user, {
      target_status: "UNDER_REGISTRAR_PROCESSING",
      remarks: input.remarks,
      updates: input.updates,
    });
  }

  if (action === "document_prepare") {
    return advanceWorkflowRequest(workflowRequestId, user, {
      target_status: "DOCUMENT_GENERATION",
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

  if (action === "release_claim") {
    const claimantType = String(input.updates?.claimant_type || "student").toLowerCase();
    if (claimantType === "representative") {
      if (!input.updates?.claimant_name) {
        throw new Error("Representative claimant name is required");
      }

      if (!input.updates?.claimant_id_type || !input.updates?.claimant_id_number) {
        throw new Error("Representative ID type and ID number are required");
      }

      if (!input.updates?.authorization_letter_file_path) {
        throw new Error("Authorization letter is required for representative claims");
      }
    }

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

  if (action === "request_cancel") {
    return advanceWorkflowRequest(workflowRequestId, user, {
      target_status: "CANCELLED",
      remarks: input.remarks,
      updates: input.updates,
    });
  }

  if (action === "registrar_reject" || action === "dean_reject" || action === "college_admin_reject") {
    return advanceWorkflowRequest(workflowRequestId, user, {
      target_status: "REJECTED",
      remarks: input.remarks,
      updates: {
        ...(input.updates || {}),
        rejected_by_role: getPrimaryRole(user),
      },
    });
  }

  throw new Error("Unhandled workflow action");
};
