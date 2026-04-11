import axios from "axios";

interface MailPayload {
  to: string;
  subject: string;
  text: string;
  html: string;
  debugContext?: Record<string, unknown>;
}

interface BrevoConfig {
  apiKey: string;
  endpoint: string;
  senderEmail: string;
  senderName: string;
  replyTo: string;
}

interface MailDebugSummary {
  transport: "brevo_rest";
  endpoint: string;
  sender_email: string | null;
  sender_name: string | null;
  reply_to: string | null;
  brevo_api_key_configured: boolean;
  suspicious_env: string[];
}

const BREVO_DEFAULT_ENDPOINT = "https://api.brevo.com/v3/smtp/email";
const BREVO_TIMEOUT_CODES = ["ETIMEDOUT", "ECONNECTION", "ESOCKET", "ECONNRESET"];

const getRenderDebugSummary = () => ({
  is_render: Boolean(process.env.RENDER),
  service_name: process.env.RENDER_SERVICE_NAME || null,
  service_type: process.env.RENDER_SERVICE_TYPE || null,
  instance_id_configured: Boolean(process.env.RENDER_INSTANCE_ID),
});

const stripMatchingQuotes = (value: string): string => {
  const trimmed = value.trim();
  const first = trimmed[0];
  const last = trimmed[trimmed.length - 1];

  if (
    trimmed.length >= 2 &&
    ((first === '"' && last === '"') || (first === "'" && last === "'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }

  return trimmed;
};

const getEnv = (key: string): string =>
  stripMatchingQuotes(process.env[key] || "");

const getRequiredEnv = (key: string): string => {
  const value = getEnv(key);

  if (!value) {
    throw new Error(`${key} is not configured`);
  }

  return value;
};

const getOptionalEnv = (key: string): string => getEnv(key);

const hasEmbeddedEnvAssignment = (value: string): boolean =>
  /[A-Z_][A-Z0-9_]*=/i.test(value);

const getSuspiciousMailEnv = (): string[] => {
  const suspiciousKeys: string[] = [];

  for (const key of ["BREVO_FROM_EMAIL", "BREVO_FROM_NAME", "BREVO_REPLY_TO"]) {
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

const redactEmailLikeValue = (value: string | null): string | null => {
  if (!value) {
    return null;
  }

  const match = value.match(/([^<>\s]+@[^<>\s]+)/);
  if (!match) {
    return value;
  }

  return value.replace(match[1], redactEmail(match[1]));
};

const createMailTraceId = () =>
  `mail_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const getBrevoConfig = (): BrevoConfig => {
  const suspiciousEnv = getSuspiciousMailEnv();
  if (suspiciousEnv.length > 0) {
    throw new Error(
      `Mail env value looks malformed; check for missing newlines near: ${suspiciousEnv.join(
        ", "
      )}.`
    );
  }

  const apiKey = getRequiredEnv("BREVO_API_KEY");
  const endpoint = getOptionalEnv("BREVO_API_URL") || BREVO_DEFAULT_ENDPOINT;
  const senderEmail = getRequiredEnv("BREVO_FROM_EMAIL");
  const senderName = getOptionalEnv("BREVO_FROM_NAME") || "eRegistrar";
  const replyTo = getOptionalEnv("BREVO_REPLY_TO");

  try {
    const parsedEndpoint = new URL(endpoint);
    if (parsedEndpoint.protocol !== "https:") {
      throw new Error();
    }
  } catch {
    throw new Error("BREVO_API_URL must be a valid HTTPS URL.");
  }

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
    void getBrevoConfig();
    return true;
  } catch {
    return false;
  }
};

export const getMailDebugSummary = (): MailDebugSummary => ({
  transport: "brevo_rest",
  endpoint: getOptionalEnv("BREVO_API_URL") || BREVO_DEFAULT_ENDPOINT,
  sender_email: redactEmailLikeValue(getOptionalEnv("BREVO_FROM_EMAIL") || null),
  sender_name: getOptionalEnv("BREVO_FROM_NAME") || "eRegistrar",
  reply_to: redactEmailLikeValue(getOptionalEnv("BREVO_REPLY_TO") || null),
  brevo_api_key_configured: Boolean(getOptionalEnv("BREVO_API_KEY")),
  suspicious_env: getSuspiciousMailEnv(),
});

export const logMailStartupDebug = () => {
  console.info("[mail] Startup Brevo REST debug summary", {
    mail: getMailDebugSummary(),
    runtime: getRenderDebugSummary(),
  });
};

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

  if (axios.isAxiosError(error)) {
    details.status = error.response?.status;
    details.response_data = error.response?.data;
  }

  if (typeof error === "object" && error !== null) {
    const maybeNetworkError = error as {
      code?: unknown;
      command?: unknown;
      responseCode?: unknown;
    };

    if (maybeNetworkError.code) {
      details.code = maybeNetworkError.code;
    }

    if (maybeNetworkError.command) {
      details.command = maybeNetworkError.command;
    }

    if (maybeNetworkError.responseCode) {
      details.responseCode = maybeNetworkError.responseCode;
    }
  }

  return details;
};

const buildBrevoTag = (debugContext?: Record<string, unknown>) => {
  const rawTag = String(debugContext?.flow || "eregistrar");
  return rawTag.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 50) || "eregistrar";
};

export const sendEmail = async ({
  to,
  subject,
  text,
  html,
  debugContext,
}: MailPayload): Promise<void> => {
  const traceId = createMailTraceId();
  let config: BrevoConfig;

  try {
    config = getBrevoConfig();
  } catch (error) {
    console.error("[mail] Brevo REST config failed", {
      trace_id: traceId,
      context: debugContext || null,
      error: getMailErrorDebugDetails(error),
      runtime: getRenderDebugSummary(),
    });
    throw error;
  }

  console.info("[mail] Brevo REST send starting", {
    trace_id: traceId,
    to: redactEmail(to),
    subject,
    context: debugContext || null,
    mail: getMailDebugSummary(),
    runtime: getRenderDebugSummary(),
  });

  try {
    const response = await axios.post(
      config.endpoint,
      {
        sender: {
          email: config.senderEmail,
          name: config.senderName,
        },
        to: [{ email: to }],
        subject,
        htmlContent: html,
        textContent: text,
        ...(config.replyTo ? { replyTo: { email: config.replyTo } } : {}),
        tags: [buildBrevoTag(debugContext)],
      },
      {
        headers: {
          accept: "application/json",
          "api-key": config.apiKey,
          "content-type": "application/json",
        },
        timeout: 30000,
      }
    );

    console.info("[mail] Brevo REST send succeeded", {
      trace_id: traceId,
      to: redactEmail(to),
      subject,
      status: response.status,
      message_id_configured: Boolean(response.data?.messageId),
      context: debugContext || null,
    });
  } catch (error) {
    console.error("[mail] Brevo REST send failed", {
      trace_id: traceId,
      to: redactEmail(to),
      subject,
      context: debugContext || null,
      error: getMailErrorDebugDetails(error),
      runtime: getRenderDebugSummary(),
    });

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
      BREVO_TIMEOUT_CODES.includes(code)
    ) {
      throw new Error("Brevo REST email request timed out.");
    }

    if (axios.isAxiosError(error)) {
      const detail =
        typeof error.response?.data === "object" && error.response?.data !== null
          ? JSON.stringify(error.response.data)
          : error.response?.data || error.message;
      throw new Error(`Brevo REST email request failed: ${detail}`);
    }

    throw error;
  }
};
