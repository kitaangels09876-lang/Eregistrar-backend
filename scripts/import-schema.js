require("dotenv").config();

const importSql = require("./import-sql");

importSql({
  sqlFile: "eRegistrar-database.sql",
  schemaOnly: true,
}).catch((error) => {
  console.error("Schema import failed.");
  console.error(error && (error.code || error.message || error));
  process.exit(1);
});
