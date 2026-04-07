import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
dotenv.config();

const databaseUrl = process.env.DATABASE_URL?.trim();

const createSequelizeInstance = () => {
    const baseOptions = {
        dialect: 'mysql' as const,
        pool: { max: 5, min: 0, acquire: 30000, idle: 10000 },
        logging: false,
    };

    if (databaseUrl) {
        return new Sequelize(databaseUrl, baseOptions);
    }

    const dbPort = process.env.DB_PORT?.trim()
      ? Number(process.env.DB_PORT)
      : 3306;

    if (Number.isNaN(dbPort)) {
      throw new Error('DB_PORT must be a valid number');
    }

    return new Sequelize(
        process.env.DB_NAME!,
        process.env.DB_USER!,
        process.env.DB_PASSWORD!,
        {
            ...baseOptions,
            host: process.env.DB_HOST!,
            port: dbPort,
        }
    );
};

const sequelize = createSequelizeInstance();

export default sequelize;
