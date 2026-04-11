import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { QueryTypes } from "sequelize";
import { sequelize } from "../src/models";
import { uploadLocalFileToCloudinary } from "../src/utils/cloudinaryStorage";

dotenv.config({ quiet: true });

const requiredEnvKeys = [
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
];

const ensureCloudinaryConfigured = () => {
  const missing = requiredEnvKeys.filter((key) => !process.env[key]?.trim());

  if (missing.length > 0) {
    throw new Error(`Missing Cloudinary env vars: ${missing.join(", ")}`);
  }
};

const pathMappings = [
  { prefix: "/uploads/system/", folder: "eregistrar/system" },
  { prefix: "/uploads/receipts/", folder: "eregistrar/receipts" },
  { prefix: "/uploads/workflow/forms/", folder: "eregistrar/workflow/forms" },
  { prefix: "/uploads/workflow/claim-stubs/", folder: "eregistrar/workflow/claim-stubs" },
  {
    prefix: "/uploads/workflow/request-attachments/",
    folder: "eregistrar/workflow/request-attachments",
  },
  {
    prefix: "/uploads/workflow/payment-proofs/",
    folder: "eregistrar/workflow/payment-proofs",
  },
  {
    prefix: "/uploads/workflow/approval-signatures/",
    folder: "eregistrar/workflow/approval-signatures",
  },
  { prefix: "/uploads/workflow/claim-files/", folder: "eregistrar/workflow/claim-files" },
  { prefix: "/uploads/payments/", folder: "eregistrar/payments" },
] as const;

const inferFolder = (assetPath: string) =>
  pathMappings.find((entry) => assetPath.startsWith(entry.prefix))?.folder ||
  `eregistrar/${assetPath.replace(/^\/+/, "").replace(/^uploads\//, "").split("/").slice(0, -1).join("/")}`;

const isLocalUploadPath = (value: unknown): value is string =>
  typeof value === "string" && value.trim().startsWith("/uploads/");

const fileExists = (filePath: string) => {
  try {
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
};

const toAbsolutePath = (assetPath: string) =>
  path.resolve(process.cwd(), assetPath.replace(/^\/+/, "").replace(/\//g, path.sep));

const migrateAssetPath = async (assetPath: string) => {
  if (!isLocalUploadPath(assetPath)) {
    return assetPath;
  }

  const absolutePath = toAbsolutePath(assetPath);

  if (!fileExists(absolutePath)) {
    console.warn(`Skipped missing file: ${assetPath}`);
    return assetPath;
  }

  const fileName = path.basename(absolutePath);
  const publicId = assetPath
    .replace(/^\/+/, "")
    .replace(/^uploads\//, "")
    .replace(/\.[^.]+$/, "");
  const uploaded = await uploadLocalFileToCloudinary({
    filePath: absolutePath,
    fileName,
    folder: inferFolder(assetPath),
    publicId,
  });

  return uploaded.url;
};

const deepMigrateUploadPaths = async (value: unknown): Promise<{ value: unknown; changed: boolean }> => {
  if (Array.isArray(value)) {
    let changed = false;
    const next = [];

    for (const item of value) {
      const migrated = await deepMigrateUploadPaths(item);
      changed = changed || migrated.changed;
      next.push(migrated.value);
    }

    return { value: next, changed };
  }

  if (value && typeof value === "object") {
    let changed = false;
    const entries = await Promise.all(
      Object.entries(value as Record<string, unknown>).map(async ([key, nestedValue]) => {
        const migrated = await deepMigrateUploadPaths(nestedValue);
        changed = changed || migrated.changed;
        return [key, migrated.value] as const;
      })
    );

    return { value: Object.fromEntries(entries), changed };
  }

  if (isLocalUploadPath(value)) {
    const migrated = await migrateAssetPath(value);
    return { value: migrated, changed: migrated !== value };
  }

  return { value, changed: false };
};

const tableExists = async (tableName: string) => {
  const rows = await sequelize.query(
    `SHOW TABLES LIKE :tableName`,
    { replacements: { tableName }, type: QueryTypes.SELECT }
  );

  return rows.length > 0;
};

const migrateScalarFields = async (config: {
  table: string;
  idColumn: string;
  fields: string[];
}) => {
  if (!(await tableExists(config.table))) {
    return { updated: 0, scanned: 0 };
  }

  const rows = (await sequelize.query(
    `SELECT ${config.idColumn}, ${config.fields.join(", ")} FROM ${config.table}`,
    { type: QueryTypes.SELECT }
  )) as Array<Record<string, unknown>>;

  let updated = 0;

  for (const row of rows) {
    const sets: string[] = [];
    const replacements: Record<string, unknown> = { id: row[config.idColumn] };

    for (const field of config.fields) {
      const currentValue = row[field];
      if (!isLocalUploadPath(currentValue)) {
        continue;
      }

      const migrated = await migrateAssetPath(currentValue);
      if (migrated === currentValue) {
        continue;
      }

      sets.push(`${field} = :${field}`);
      replacements[field] = migrated;
    }

    if (sets.length === 0) {
      continue;
    }

    await sequelize.query(
      `UPDATE ${config.table} SET ${sets.join(", ")} WHERE ${config.idColumn} = :id`,
      { replacements, type: QueryTypes.UPDATE }
    );
    updated += 1;
  }

  return { updated, scanned: rows.length };
};

const migrateJsonFields = async (config: {
  table: string;
  idColumn: string;
  fields: string[];
}) => {
  if (!(await tableExists(config.table))) {
    return { updated: 0, scanned: 0 };
  }

  const rows = (await sequelize.query(
    `SELECT ${config.idColumn}, ${config.fields.join(", ")} FROM ${config.table}`,
    { type: QueryTypes.SELECT }
  )) as Array<Record<string, unknown>>;

  let updated = 0;

  for (const row of rows) {
    const sets: string[] = [];
    const replacements: Record<string, unknown> = { id: row[config.idColumn] };

    for (const field of config.fields) {
      const rawValue = row[field];
      if (!rawValue) {
        continue;
      }

      let parsed: unknown;
      try {
        parsed = typeof rawValue === "string" ? JSON.parse(rawValue) : rawValue;
      } catch {
        continue;
      }

      const migrated = await deepMigrateUploadPaths(parsed);
      if (!migrated.changed) {
        continue;
      }

      sets.push(`${field} = :${field}`);
      replacements[field] = JSON.stringify(migrated.value);
    }

    if (sets.length === 0) {
      continue;
    }

    await sequelize.query(
      `UPDATE ${config.table} SET ${sets.join(", ")} WHERE ${config.idColumn} = :id`,
      { replacements, type: QueryTypes.UPDATE }
    );
    updated += 1;
  }

  return { updated, scanned: rows.length };
};

const run = async () => {
  ensureCloudinaryConfigured();

  const scalarPlans = [
    {
      table: "system_settings",
      idColumn: "id",
      fields: ["school_logo", "school_seal", "school_icon"],
    },
    {
      table: "receipts",
      idColumn: "receipt_id",
      fields: ["pdf_path"],
    },
    {
      table: "workflow_generated_documents",
      idColumn: "workflow_generated_document_id",
      fields: ["file_path"],
    },
    {
      table: "workflow_claim_stubs",
      idColumn: "workflow_claim_stub_id",
      fields: ["file_path"],
    },
    {
      table: "workflow_request_attachments",
      idColumn: "workflow_request_attachment_id",
      fields: ["file_path"],
    },
    {
      table: "workflow_payment_submissions",
      idColumn: "workflow_payment_submission_id",
      fields: ["proof_file_path"],
    },
    {
      table: "workflow_release_records",
      idColumn: "workflow_release_record_id",
      fields: [
        "authorization_letter_file_path",
        "claimant_id_file_path",
        "signature_file_path",
      ],
    },
    {
      table: "payments",
      idColumn: "payment_id",
      fields: ["payment_proof"],
    },
  ];

  const jsonPlans = [
    {
      table: "workflow_requests",
      idColumn: "workflow_request_id",
      fields: ["approval_snapshot_json", "payment_snapshot_json", "release_snapshot_json"],
    },
    {
      table: "workflow_request_actions",
      idColumn: "workflow_request_action_id",
      fields: ["payload_json"],
    },
    {
      table: "workflow_release_claim_logs",
      idColumn: "workflow_release_claim_log_id",
      fields: ["metadata_json"],
    },
  ];

  const summary: Array<string> = [];

  for (const plan of scalarPlans) {
    const result = await migrateScalarFields(plan);
    summary.push(`${plan.table}: ${result.updated} updated / ${result.scanned} scanned`);
  }

  for (const plan of jsonPlans) {
    const result = await migrateJsonFields(plan);
    summary.push(`${plan.table} JSON: ${result.updated} updated / ${result.scanned} scanned`);
  }

  console.log("Upload migration summary:");
  for (const line of summary) {
    console.log(`- ${line}`);
  }
};

void run()
  .catch((error) => {
    console.error("Upload migration failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close().catch(() => undefined);
  });
