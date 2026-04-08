interface MailPayload {
  to: string;
  subject: string;
  text: string;
  html: string;
}

const RESEND_API_BASE_URL = "https://api.resend.com";

const getRequiredEnv = (key: string): string => {
  const value = process.env[key]?.trim();

  if (!value) {
    throw new Error(`${key} is not configured`);
  }

  return value;
};

const getOptionalEnv = (key: string): string =>
  process.env[key]?.trim() || "";

const getResendConfig = () => {
  const apiKey = getRequiredEnv("RESEND_API_KEY");
  const from = getRequiredEnv("RESEND_FROM");
  const replyTo = getOptionalEnv("RESEND_REPLY_TO");

  return {
    apiKey,
    from,
    replyTo,
  };
};

export const sendEmail = async ({
  to,
  subject,
  text,
  html,
}: MailPayload): Promise<void> => {
  const config = getResendConfig();

  try {
    const response = await fetch(`${RESEND_API_BASE_URL}/emails`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: config.from,
        to: [to],
        subject,
        text,
        html,
        ...(config.replyTo ? { reply_to: config.replyTo } : {}),
      }),
      signal: AbortSignal.timeout(30000),
    });

    const responseData = (await response.json().catch(() => null)) as
      | {
          id?: string;
          message?: string;
          error?: {
            message?: string;
            name?: string;
          };
        }
      | null;

    if (!response.ok) {
      throw new Error(
        responseData?.message ||
          responseData?.error?.message ||
          `Resend email failed with status ${response.status}`
      );
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error || "Unknown error");

    if (message.toLowerCase().includes("timeout")) {
      throw new Error("Resend email request timed out.");
    }

    throw error;
  }
};
