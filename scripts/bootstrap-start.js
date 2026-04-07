const mysql = require("mysql2/promise");
require("dotenv").config();

const databaseUrl = process.env.DATABASE_URL?.trim();
const requiredTables = [
  "users",
  "roles",
  "document_types",
  "workflow_requests",
];

const importSql = require("./import-sql");

const getMissingTables = async () => {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const connection = await mysql.createConnection({ uri: databaseUrl });

  try {
    const [rows] = await connection.query(
      `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
      `
    );

    const existingTableNames = new Set(
      rows.map((row) => String(row.table_name || "").toLowerCase())
    );

    return requiredTables.filter(
      (tableName) => !existingTableNames.has(tableName.toLowerCase())
    );
  } finally {
    await connection.end();
  }
};

const hasDefaultSeedData = async () => {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const connection = await mysql.createConnection({ uri: databaseUrl });

  try {
    const [rows] = await connection.query(
      `
      SELECT COUNT(*) AS count
      FROM users
      WHERE email = 'admin@tmc.edu.ph'
      `
    );

    return Number(rows?.[0]?.count || 0) > 0;
  } catch (error) {
    if (error?.code === "ER_NO_SUCH_TABLE") {
      return false;
    }
    throw error;
  } finally {
    await connection.end();
  }
};

async function main() {
  const missingTables = await getMissingTables();

  if (missingTables.length > 0) {
    console.log(
      `Missing core tables detected (${missingTables.join(
        ", "
      )}). Importing schema before server start...`
    );
    await importSql({
      sqlFile: "eRegistrar-database.sql",
      schemaOnly: true,
    });
  } else {
    console.log("Database schema already present. Skipping SQL import.");
  }

  if (!(await hasDefaultSeedData())) {
    console.log("Default seed data not found. Applying seeding/SeedMePo.sql...");
    await importSql({
      sqlFile: "seeding/SeedMePo.sql",
    });
  } else {
    console.log("Default seed data already present. Skipping SeedMePo.sql.");
  }

  require("../dist/server.js");
}

main().catch((error) => {
  console.error("Startup bootstrap failed.");
  console.error(error && (error.code || error.message || error));
  process.exit(1);
});
