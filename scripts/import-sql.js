const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");
require("dotenv").config();

const databaseUrl = process.env.DATABASE_URL?.trim();
const sqlFile = process.env.SQL_FILE?.trim() || "eRegistrar-database.sql";
const sqlPath = path.resolve(process.cwd(), sqlFile);
const dryRun = process.env.DRY_RUN === "1";

if (!databaseUrl) {
  console.error("DATABASE_URL is not configured.");
  process.exit(1);
}

if (!fs.existsSync(sqlPath)) {
  console.error(`SQL file not found: ${sqlPath}`);
  process.exit(1);
}

const stripLocalDatabaseDirectives = (sql) =>
  sql
    .split(/\r?\n/)
    .filter(
      (line) =>
        !/^\s*CREATE\s+DATABASE\b/i.test(line) &&
        !/^\s*USE\b/i.test(line)
    )
    .join("\n");

const normalizeCreateTableStatements = (sql) =>
  sql.replace(
    /\bCREATE\s+TABLE\s+(?!IF\s+NOT\s+EXISTS\b)/gi,
    "CREATE TABLE IF NOT EXISTS "
  );

const splitSqlStatements = (sql) => {
  const statements = [];
  let current = "";
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let index = 0; index < sql.length; index += 1) {
    const char = sql[index];
    const nextChar = sql[index + 1];

    if (inLineComment) {
      current += char;
      if (char === "\n") {
        inLineComment = false;
      }
      continue;
    }

    if (inBlockComment) {
      current += char;
      if (char === "*" && nextChar === "/") {
        current += nextChar;
        index += 1;
        inBlockComment = false;
      }
      continue;
    }

    if (!inSingleQuote && !inDoubleQuote) {
      if (char === "-" && nextChar === "-") {
        inLineComment = true;
        current += char;
        continue;
      }

      if (char === "/" && nextChar === "*") {
        inBlockComment = true;
        current += char;
        continue;
      }
    }

    if (char === "'" && !inDoubleQuote) {
      const isEscaped = sql[index - 1] === "\\";
      if (!isEscaped) {
        inSingleQuote = !inSingleQuote;
      }
      current += char;
      continue;
    }

    if (char === '"' && !inSingleQuote) {
      const isEscaped = sql[index - 1] === "\\";
      if (!isEscaped) {
        inDoubleQuote = !inDoubleQuote;
      }
      current += char;
      continue;
    }

    if (char === ";" && !inSingleQuote && !inDoubleQuote) {
      const statement = current.trim();
      if (statement) {
        statements.push(statement);
      }
      current = "";
      continue;
    }

    current += char;
  }

  const trailingStatement = current.trim();
  if (trailingStatement) {
    statements.push(trailingStatement);
  }

  return statements;
};

const normalizeStatementForMatching = (statement) =>
  statement
    .replace(/^(?:\s+|--[^\n]*\n|\/\*[\s\S]*?\*\/)*/g, "")
    .trimStart();

const isSystemSettingsSeedStatement = (statement) =>
  /^INSERT\s+INTO\s+system_settings\b/i.test(
    normalizeStatementForMatching(statement)
  );

const shouldSkipSystemSettingsSeed = async (connection) => {
  try {
    const [rows] = await connection.query(
      "SELECT COUNT(*) AS count FROM system_settings"
    );
    return Number(rows?.[0]?.count || 0) > 0;
  } catch (error) {
    if (error?.code === "ER_NO_SUCH_TABLE") {
      return false;
    }
    throw error;
  }
};

async function main() {
  const rawSql = fs.readFileSync(sqlPath, "utf8");
  const sql = normalizeCreateTableStatements(
    stripLocalDatabaseDirectives(rawSql)
  ).trim();

  if (!sql) {
    console.error("SQL file is empty after preprocessing.");
    process.exit(1);
  }

  const statements = splitSqlStatements(sql);

  if (!statements.length) {
    console.error("No executable SQL statements were found.");
    process.exit(1);
  }

  if (dryRun) {
    console.log(
      JSON.stringify(
        {
          sqlFile: path.basename(sqlPath),
          statementCount: statements.length,
          createTableCount: statements.filter((statement) =>
            /^CREATE\s+TABLE\b/i.test(normalizeStatementForMatching(statement))
          ).length,
          insertCount: statements.filter((statement) =>
            /^INSERT\b/i.test(normalizeStatementForMatching(statement))
          ).length,
          systemSettingsSeedPresent: statements.some(isSystemSettingsSeedStatement),
        },
        null,
        2
      )
    );
    return;
  }

  const connection = await mysql.createConnection({
    uri: databaseUrl,
  });

  try {
    console.log(
      `Importing ${path.basename(sqlPath)} into DATABASE_URL with ${statements.length} statements...`
    );

    for (const statement of statements) {
      if (isSystemSettingsSeedStatement(statement)) {
        const shouldSkip = await shouldSkipSystemSettingsSeed(connection);
        if (shouldSkip) {
          console.log(
            "Skipping system_settings seed because the table already has data."
          );
          continue;
        }
      }

      await connection.query(statement);
    }

    console.log("SQL import completed successfully.");
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error("SQL import failed.");
  console.error(error && (error.code || error.message || error));
  process.exit(1);
});
