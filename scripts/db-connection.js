const mysql = require("mysql2/promise");
const dotenv = require("dotenv");

dotenv.config({ quiet: true });

const trimEnv = (name) => process.env[name]?.trim() || "";

const getDatabaseUrlHost = (databaseUrl) => {
  try {
    return new URL(databaseUrl).hostname;
  } catch (_error) {
    return "";
  }
};

const assertPlainHost = (host) => {
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(host) || host.includes("/")) {
    throw new Error(
      "DB_HOST must be only a hostname, not a full URL. Put mysql://... values in DATABASE_URL instead."
    );
  }
};

const getUnresolvableHostHint = (host) => {
  if (host.endsWith(".railway.internal")) {
    return " Railway internal hosts only resolve inside Railway; use the public Railway database host/port on Render.";
  }

  if (host.endsWith(".internal")) {
    return " Internal hostnames only resolve inside their provider network; use the public database host/port from Render.";
  }

  return "";
};

const getDatabaseConnectionConfig = () => {
  const databaseUrl = trimEnv("DATABASE_URL");

  if (databaseUrl) {
    const host = getDatabaseUrlHost(databaseUrl);

    if (!host) {
      throw new Error("DATABASE_URL must be a valid MySQL connection URL.");
    }

    return {
      source: "DATABASE_URL",
      host,
      options: { uri: databaseUrl },
    };
  }

  const host = trimEnv("DB_HOST");
  const user = trimEnv("DB_USER");
  const password = process.env.DB_PASSWORD || "";
  const database = trimEnv("DB_NAME");
  const portValue = trimEnv("DB_PORT");
  const port = portValue ? Number(portValue) : 3306;

  const missing = [];
  if (!host) missing.push("DB_HOST");
  if (!user) missing.push("DB_USER");
  if (!database) missing.push("DB_NAME");

  if (missing.length > 0) {
    throw new Error(
      `Database env is not configured. Set DATABASE_URL or DB_HOST, DB_USER, and DB_NAME. Missing: ${missing.join(
        ", "
      )}.`
    );
  }

  assertPlainHost(host);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("DB_PORT must be a valid port number.");
  }

  return {
    source: "DB_*",
    host,
    options: {
      host,
      port,
      user,
      password,
      database,
    },
  };
};

const createDatabaseConnection = async (
  config = getDatabaseConnectionConfig()
) => {
  try {
    return await mysql.createConnection(config.options);
  } catch (error) {
    if (error?.code === "ENOTFOUND") {
      throw new Error(
        `Unable to resolve database host "${config.host}" from ${config.source}. Check the database hostname in your deploy environment variables.${getUnresolvableHostHint(config.host)}`
      );
    }

    throw error;
  }
};

module.exports = {
  createDatabaseConnection,
  getDatabaseConnectionConfig,
};
