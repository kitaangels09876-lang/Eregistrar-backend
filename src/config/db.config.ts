import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
dotenv.config();

const dbPort = process.env.DB_PORT?.trim()
  ? Number(process.env.DB_PORT)
  : 3306;

if (Number.isNaN(dbPort)) {
  throw new Error('DB_PORT must be a valid number');
}

const sequelize = new Sequelize(
    process.env.DB_NAME!,
    process.env.DB_USER!,
    process.env.DB_PASSWORD!,
    {
        host: process.env.DB_HOST!,
        port: dbPort,
        dialect: 'mysql',
        pool: { max: 5, min: 0, acquire: 30000, idle: 10000 },
        logging: false,
    }
);

export default sequelize;
