import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
dotenv.config({ quiet: true });

const databaseUrlEnvNames = [
    'DATABASE_PUBLIC_URL',
    'MYSQL_PUBLIC_URL',
    'DATABASE_URL',
];

const trimEnv = (name: string) => process.env[name]?.trim() || '';

const assertPlainHost = (host: string) => {
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(host) || host.includes('/')) {
        throw new Error(
            'DB_HOST must be only a hostname, not a full URL. Put mysql://... values in DATABASE_URL instead.'
        );
    }
};

const getUnresolvableHostHint = (host: string) => {
    if (host.endsWith('.railway.internal')) {
        return ' Railway internal hosts only resolve inside Railway; use the public Railway database host/port on Render.';
    }

    if (host.endsWith('.internal')) {
        return ' Internal hostnames only resolve inside their provider network; use the public database host/port from Render.';
    }

    return '';
};

const assertResolvableHost = (host: string, source: string) => {
    if (host.endsWith('.internal')) {
        throw new Error(
            `Database host "${host}" from ${source} is private/internal and cannot be reached from Render.${getUnresolvableHostHint(host)}`
        );
    }
};

const getDatabaseUrlConfig = () => {
    for (const name of databaseUrlEnvNames) {
        const value = trimEnv(name);

        if (value) {
            return { name, value };
        }
    }

    return null;
};

const getSplitDatabaseConfig = () => {
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
    assertResolvableHost(dbHost, 'DB_HOST');

    if (!Number.isInteger(dbPort) || dbPort < 1 || dbPort > 65535) {
        throw new Error('DB_PORT must be a valid port number.');
    }

    return {
        database: dbName,
        user: dbUser,
        password: process.env.DB_PASSWORD || '',
        host: dbHost,
        port: dbPort,
    };
};

const createSequelizeInstance = () => {
    const baseOptions = {
        dialect: 'mysql' as const,
        pool: { max: 5, min: 0, acquire: 30000, idle: 10000 },
        logging: false,
    };

    const databaseUrlConfig = getDatabaseUrlConfig();

    if (databaseUrlConfig) {
        let parsedUrl: URL;

        try {
            parsedUrl = new URL(databaseUrlConfig.value);
        } catch (_error) {
            throw new Error(`${databaseUrlConfig.name} must be a valid MySQL connection URL.`);
        }

        if (!parsedUrl.hostname) {
            throw new Error(`${databaseUrlConfig.name} must be a valid MySQL connection URL.`);
        }

        if (!parsedUrl.hostname.endsWith('.internal')) {
            return new Sequelize(databaseUrlConfig.value, baseOptions);
        }

        if (trimEnv('DB_HOST') && trimEnv('DB_USER') && trimEnv('DB_NAME')) {
            const splitConfig = getSplitDatabaseConfig();

            return new Sequelize(
                splitConfig.database,
                splitConfig.user,
                splitConfig.password,
                {
                    ...baseOptions,
                    host: splitConfig.host,
                    port: splitConfig.port,
                }
            );
        }

        assertResolvableHost(parsedUrl.hostname, databaseUrlConfig.name);
    }

    const splitConfig = getSplitDatabaseConfig();

    return new Sequelize(
        splitConfig.database,
        splitConfig.user,
        splitConfig.password,
        {
            ...baseOptions,
            host: splitConfig.host,
            port: splitConfig.port,
        }
    );
};

const sequelize = createSequelizeInstance();

export default sequelize;
