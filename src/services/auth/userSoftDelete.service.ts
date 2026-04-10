import { QueryTypes } from "sequelize";
import { sequelize } from "../../models";

let softDeleteSchemaReady = false;

export const ensureUserSoftDeleteSchema = async () => {
  if (softDeleteSchemaReady) {
    return;
  }

  const columns: any[] = await sequelize.query(
    `
    SHOW COLUMNS FROM users LIKE 'deleted_at'
    `,
    { type: QueryTypes.SELECT }
  );

  if (columns.length === 0) {
    await sequelize.query(
      `
      ALTER TABLE users
      ADD COLUMN deleted_at DATETIME NULL
      `
    );
  }

  softDeleteSchemaReady = true;
};
