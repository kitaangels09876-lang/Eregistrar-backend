import { sequelize } from "../models";
import { QueryTypes } from "sequelize";

export const acquireLock = async (lockName: string, timeout = 5): Promise<boolean> => {
  const [result]: any = await sequelize.query(
    `SELECT GET_LOCK(:lockName, :timeout) AS acquired`,
    {
      replacements: { lockName, timeout },
      type: QueryTypes.SELECT,
    }
  );

  return result?.acquired === 1;
};

export const releaseLock = async (lockName: string): Promise<void> => {
  await sequelize.query(
    `SELECT RELEASE_LOCK(:lockName)`,
    {
      replacements: { lockName },
      type: QueryTypes.SELECT,
    }
  );
};
