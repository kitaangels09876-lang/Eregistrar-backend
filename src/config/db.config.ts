import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
dotenv.config({ quiet: true });

const databaseUrl = process.env.DATABASE_URL?.trim();

const trimEnv = (name: string) => process.env[name]?.trim() || '';

const assertPlainHost = (host: string) => {
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(host) || host.includes('/')) {
        throw new Error(
            'DB_HOST must be only a hostname, not a full URL. Put mysql://... values in DATABASE_URL instead.'
        );
    }
};

const createSequelizeInstance = () => {
    const baseOptions = {
        dialect: 'mysql' as const,
        pool: { max: 5, min: 0, acquire: 30000, idle: 10000 },
        logging: false,
    };

    if (databaseUrl) {
        try {
            const parsedUrl = new URL(databaseUrl);
            if (!parsedUrl.hostname) {
                throw new Error('missing host');
            }
        } catch (_error) {
            throw new Error('DATABASE_URL must be a valid MySQL connection URL.');
        }

        return new Sequelize(databaseUrl, baseOptions);
    }

    const dbHost = trimEnv('DB_HOST');
    const dbUser = trimEnv('DB_USER');
    const dbName = trimEnv('DB_NAME');
    const dbPort = trimEnv('DB_PORT')
        ? Number(trimEnv('DB_PORT'))
        : 3306;

    const missing = [];
    if (!dbHost) missing.push('DB_HOST');
    if (!dbUser) missing.push('DB_USER');
    if (!dbName) missing.push('DB_NAME');

    if (missing.length > 0) {
        throw new Error(
            `Database env is not configured. Set DATABASE_URL or DB_HOST, DB_USER, and DB_NAME. Missing: ${missing.join(', ')}.`
        );
    }

    assertPlainHost(dbHost);

    if (!Number.isInteger(dbPort) || dbPort < 1 || dbPort > 65535) {
        throw new Error('DB_PORT must be a valid port number.');
    }

    return new Sequelize(
        dbName,
        dbUser,
        process.env.DB_PASSWORD || '',
        {
            ...baseOptions,
            host: dbHost,
            port: dbPort,
        }
    );
};

const sequelize = createSequelizeInstance();

export default sequelize;
