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

interface MailDebugSummary {
  provider: string | null;
  transport: "smtp";
  host: string | null;
  port: string | null;
  secure: string | null;
  from: string | null;
  reply_to: string | null;
  smtp_user_configured: boolean;
  smtp_pass_configured: boolean;
  suspicious_env: string[];
}

const SMTP_TIMEOUT_CODES = ["ETIMEDOUT", "ECONNECTION", "ESOCKET", "ECONNRESET"];

const getRequiredEnv = (key: string): string => {
  const value = process.env[key]?.trim();

  if (!value) {
    throw new Error(`${key} is not configured`);
  }

  return value;
};

const getOptionalEnv = (key: string): string =>
  process.env[key]?.trim() || "";

const hasEmbeddedEnvAssignment = (value: string): boolean =>
  /[A-Z_][A-Z0-9_]*=/i.test(value);

const getSuspiciousMailEnv = (): string[] => {
  const suspiciousKeys: string[] = [];

  for (const key of ["SMTP_HOST", "SMTP_USER", "SMTP_PASS", "SMTP_FROM"]) {
    const value = process.env[key]?.trim();

    if (value && hasEmbeddedEnvAssignment(value)) {
      suspiciousKeys.push(key);
    }
  }

  return suspiciousKeys;
};

const redactEmail = (email: string): string => {
  const [name, domain] = email.split("@");

  if (!name || !domain) {
    return "[invalid-email]";
  }

  return `${name.slice(0, 2)}***@${domain}`;
};

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
  const suspiciousEnv = getSuspiciousMailEnv();
  if (suspiciousEnv.length > 0) {
    throw new Error(
      `Mail env value looks malformed; check for missing newlines near: ${suspiciousEnv.join(
        ", "
      )}.`
    );
  }

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
    throw new Error("SMTP_USER and SMTP_PASS must both be set or both be empty.");
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

export const getMailDebugSummary = (): MailDebugSummary => ({
  provider: process.env.MAIL_PROVIDER?.trim() || null,
  transport: "smtp",
  host: process.env.SMTP_HOST?.trim() || null,
  port: process.env.SMTP_PORT?.trim() || null,
  secure: process.env.SMTP_SECURE?.trim() || null,
  from: process.env.SMTP_FROM?.trim() || null,
  reply_to: process.env.SMTP_REPLY_TO?.trim() || null,
  smtp_user_configured: Boolean(process.env.SMTP_USER?.trim()),
  smtp_pass_configured: Boolean(process.env.SMTP_PASS?.trim()),
  suspicious_env: getSuspiciousMailEnv(),
});

export const getMailErrorDebugDetails = (error: unknown) => {
  const details: Record<string, unknown> = {
    summary: getMailDebugSummary(),
  };

  if (error instanceof Error) {
    details.name = error.name;
    details.message = error.message;
  } else {
    details.message = String(error || "Unknown error");
  }

  if (typeof error === "object" && error !== null) {
    const maybeSmtpError = error as {
      code?: unknown;
      command?: unknown;
      responseCode?: unknown;
    };

    if (maybeSmtpError.code) {
      details.code = maybeSmtpError.code;
    }

    if (maybeSmtpError.command) {
      details.command = maybeSmtpError.command;
    }

    if (maybeSmtpError.responseCode) {
      details.responseCode = maybeSmtpError.responseCode;
    }
  }

  return details;
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
    console.info("[mail] Sending email", {
      to: redactEmail(to),
      subject,
      summary: getMailDebugSummary(),
    });

    await transporter.sendMail({
      from: config.from,
      to,
      subject,
      text,
      html,
      ...(config.replyTo ? { replyTo: config.replyTo } : {}),
    });

    console.info("[mail] Email sent", {
      to: redactEmail(to),
      subject,
      summary: getMailDebugSummary(),
    });
  } catch (error) {
    console.error("[mail] Email send failed", getMailErrorDebugDetails(error));

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
      SMTP_TIMEOUT_CODES.includes(code)
    ) {
      throw new Error("SMTP email request timed out.");
    }

    throw error;
  }
};
