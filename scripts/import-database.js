require("dotenv").config({ quiet: true });

const importSql = require("./import-sql");

async function main() {
  await importSql({
    sqlFile: "eRegistrar-database.sql",
    schemaOnly: true,
  });

  await importSql({
    sqlFile: "seeding/SeedMePo.sql",
  });
}

main().catch((error) => {
  console.error("Database import failed.");
  console.error(error && (error.code || error.message || error));
  process.exit(1);
});
