require("dotenv").config();

const importSql = require("./import-sql");

importSql({
  sqlFile: "seeding/SeedMePo.sql",
}).catch((error) => {
  console.error("Seed import failed.");
  console.error(error && (error.code || error.message || error));
  process.exit(1);
});
