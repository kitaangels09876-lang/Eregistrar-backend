import nodemailer from "nodemailer";

interface MailPayload {
  to: string;
  subject: string;
  text: string;
  html: string;
}

interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
  replyTo: string;
}

const getRequiredEnv = (key: string): string => {
  const value = process.env[key]?.trim();

  if (!value) {
    throw new Error(`${key} is not configured`);
  }

  return value;
};

const getOptionalEnv = (key: string): string =>
  process.env[key]?.trim() || "";

const parseSmtpPort = (value: string): number => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 65535) {
    throw new Error("SMTP_PORT must be a valid TCP port number.");
  }
  return parsed;
};

const parseBooleanEnv = (
  rawValue: string,
  {
    defaultValue,
    keyName,
  }: {
    defaultValue: boolean;
    keyName: string;
  }
): boolean => {
  if (!rawValue) {
    return defaultValue;
  }

  const normalized = rawValue.trim().toLowerCase();

  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  throw new Error(`${keyName} must be one of: true/false, 1/0, yes/no, on/off.`);
};

const getSmtpConfig = (): SmtpConfig => {
  const host = getRequiredEnv("SMTP_HOST");
  const portRaw = getRequiredEnv("SMTP_PORT");
  const port = parseSmtpPort(portRaw);
  const secureRaw = getOptionalEnv("SMTP_SECURE");
  const secure = parseBooleanEnv(secureRaw, {
    defaultValue: port === 465,
    keyName: "SMTP_SECURE",
  });
  const user = getOptionalEnv("SMTP_USER");
  const pass = getOptionalEnv("SMTP_PASS");
  const from = getRequiredEnv("SMTP_FROM");
  const replyTo = getOptionalEnv("SMTP_REPLY_TO");

  if ((user && !pass) || (!user && pass)) {
    throw new Error(
      "SMTP_USER and SMTP_PASS must both be set or both be empty."
    );
  }

  return {
    host,
    port,
    secure,
    user,
    pass,
    from,
    replyTo,
  };
};

export const isMailConfigured = (): boolean => {
  try {
    void getSmtpConfig();
    return true;
  } catch {
    return false;
  }
};

let cachedTransporter: ReturnType<typeof nodemailer.createTransport> | null = null;
let cachedTransporterKey = "";

const getSmtpTransporter = (config: SmtpConfig) => {
  const cacheKey = [
    config.host,
    String(config.port),
    config.secure ? "secure" : "insecure",
    config.user || "no-user",
  ].join("|");

  if (cachedTransporter && cachedTransporterKey === cacheKey) {
    return cachedTransporter;
  }

  const transportOptions = {
    host: config.host,
    port: config.port,
    secure: config.secure,
    connectionTimeout: 30000,
    greetingTimeout: 30000,
    socketTimeout: 30000,
    ...(config.user && config.pass
      ? {
          auth: {
            user: config.user,
            pass: config.pass,
          },
        }
      : {}),
  };

  cachedTransporter = nodemailer.createTransport(transportOptions);
  cachedTransporterKey = cacheKey;

  return cachedTransporter;
};

export const sendEmail = async ({
  to,
  subject,
  text,
  html,
}: MailPayload): Promise<void> => {
  const config = getSmtpConfig();
  const transporter = getSmtpTransporter(config);

  try {
    await transporter.sendMail({
      from: config.from,
      to,
      subject,
      text,
      html,
      ...(config.replyTo ? { replyTo: config.replyTo } : {}),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error || "Unknown error");
    const code =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      typeof (error as { code?: unknown }).code === "string"
        ? String((error as { code: string }).code)
        : "";

    if (
      message.toLowerCase().includes("timeout") ||
      ["ETIMEDOUT", "ECONNECTION", "ESOCKET", "ECONNRESET"].includes(code)
    ) {
      throw new Error("SMTP email request timed out.");
    }

    throw error;
  }
};
