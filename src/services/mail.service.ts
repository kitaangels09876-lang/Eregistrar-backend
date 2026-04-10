import axios from "axios";
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

interface BrevoConfig {
  apiKey: string;
  endpoint: string;
  senderEmail: string;
  senderName: string;
  replyTo: string;
}

export type MailProvider = "smtp" | "brevo";

interface MailDebugSummary {
  provider: MailProvider | string;
  from: string | null;
  reply_to: string | null;
  host?: string | null;
  port?: string | null;
  secure?: string | null;
  endpoint?: string | null;
  sender_name?: string | null;
}

const DEFAULT_BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";
const SMTP_TIMEOUT_CODES = ["ETIMEDOUT", "ECONNECTION", "ESOCKET", "ECONNRESET"];
const BREVO_TIMEOUT_CODES = ["ECONNABORTED", "ETIMEDOUT", "ECONNRESET", "ENOTFOUND"];

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

const parseMailProvider = (value: string): MailProvider => {
  const normalized = value.trim().toLowerCase();

  if (normalized === "smtp" || normalized === "brevo") {
    return normalized;
  }

  throw new Error("MAIL_PROVIDER must be either 'smtp' or 'brevo'.");
};

const getMailProvider = (): MailProvider => {
  const configuredProvider = getOptionalEnv("MAIL_PROVIDER");

  if (configuredProvider) {
    return parseMailProvider(configuredProvider);
  }

  return getOptionalEnv("BREVO_API_KEY") ? "brevo" : "smtp";
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

const getBrevoConfig = (): BrevoConfig => {
  const apiKey = getRequiredEnv("BREVO_API_KEY");
  const senderEmail = getRequiredEnv("BREVO_SENDER_EMAIL");
  const senderName = getOptionalEnv("BREVO_SENDER_NAME");
  const replyTo = getOptionalEnv("BREVO_REPLY_TO");
  const endpoint = getOptionalEnv("BREVO_API_URL") || DEFAULT_BREVO_ENDPOINT;

  return {
    apiKey,
    endpoint,
    senderEmail,
    senderName,
    replyTo,
  };
};

export const isMailConfigured = (): boolean => {
  try {
    const provider = getMailProvider();

    if (provider === "brevo") {
      void getBrevoConfig();
      return true;
    }

    void getSmtpConfig();
    return true;
  } catch {
    return false;
  }
};

export const getMailDebugSummary = (): MailDebugSummary => {
  let provider: MailProvider | string = "smtp";

  try {
    provider = getMailProvider();
  } catch {
    const fallbackProvider = getOptionalEnv("MAIL_PROVIDER");
    provider = fallbackProvider || "smtp";
  }

  if (provider === "brevo") {
    return {
      provider,
      from: process.env.BREVO_SENDER_EMAIL?.trim() || null,
      reply_to: process.env.BREVO_REPLY_TO?.trim() || null,
      endpoint: process.env.BREVO_API_URL?.trim() || DEFAULT_BREVO_ENDPOINT,
      sender_name: process.env.BREVO_SENDER_NAME?.trim() || null,
    };
  }

  return {
    provider,
    host: process.env.SMTP_HOST?.trim() || null,
    port: process.env.SMTP_PORT?.trim() || null,
    secure: process.env.SMTP_SECURE?.trim() || null,
    from: process.env.SMTP_FROM?.trim() || null,
    reply_to: process.env.SMTP_REPLY_TO?.trim() || null,
  };
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

const isTimeoutError = (message: string, code: string, timeoutCodes: string[]) =>
  message.toLowerCase().includes("timeout") || timeoutCodes.includes(code);

const extractBrevoErrorMessage = (data: unknown): string => {
  if (!data) {
    return "";
  }

  if (typeof data === "string") {
    return data.trim();
  }

  if (typeof data === "object" && data !== null) {
    const payload = data as Record<string, unknown>;
    const candidateValues = [
      payload.message,
      payload.error,
      payload.code,
      payload.details,
    ];

    for (const candidate of candidateValues) {
      if (typeof candidate === "string" && candidate.trim()) {
        return candidate.trim();
      }

      if (Array.isArray(candidate) && candidate.length > 0) {
        const joined = candidate
          .map((item) => (typeof item === "string" ? item : JSON.stringify(item)))
          .join(", ")
          .trim();

        if (joined) {
          return joined;
        }
      }
    }
  }

  return "";
};

const sendViaSmtp = async (
  payload: MailPayload,
  config: SmtpConfig
): Promise<void> => {
  const transporter = getSmtpTransporter(config);

  try {
    await transporter.sendMail({
      from: config.from,
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
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

    if (isTimeoutError(message, code, SMTP_TIMEOUT_CODES)) {
      throw new Error("SMTP email request timed out.");
    }

    throw error;
  }
};

const sendViaBrevo = async (
  payload: MailPayload,
  config: BrevoConfig
): Promise<void> => {
  try {
    await axios.post(
      config.endpoint,
      {
        sender: {
          email: config.senderEmail,
          ...(config.senderName ? { name: config.senderName } : {}),
        },
        to: [{ email: payload.to }],
        subject: payload.subject,
        textContent: payload.text,
        htmlContent: payload.html,
        ...(config.replyTo ? { replyTo: { email: config.replyTo } } : {}),
      },
      {
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          "api-key": config.apiKey,
        },
        timeout: 30000,
      }
    );
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

    if (axios.isAxiosError(error)) {
      if (isTimeoutError(message, code, BREVO_TIMEOUT_CODES)) {
        throw new Error("Brevo email request timed out.");
      }

      const status = error.response?.status;
      const brevoMessage = extractBrevoErrorMessage(error.response?.data);

      if (status === 401 || status === 403) {
        throw new Error("Brevo authentication failed. Check BREVO_API_KEY.");
      }

      if (status && brevoMessage) {
        throw new Error(`Brevo email request failed (${status}): ${brevoMessage}`);
      }

      if (status) {
        throw new Error(`Brevo email request failed with status ${status}.`);
      }
    }

    if (isTimeoutError(message, code, BREVO_TIMEOUT_CODES)) {
      throw new Error("Brevo email request timed out.");
    }

    throw error;
  }
};

export const sendEmail = async (payload: MailPayload): Promise<void> => {
  const provider = getMailProvider();

  if (provider === "brevo") {
    const config = getBrevoConfig();
    await sendViaBrevo(payload, config);
    return;
  }

  const config = getSmtpConfig();
  await sendViaSmtp(payload, config);
};
