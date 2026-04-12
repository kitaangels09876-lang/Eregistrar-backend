import jwt, { SignOptions } from "jsonwebtoken";
import { sendEmail } from "./mail.service";

interface PasswordResetTokenPayload {
  user_id: number;
  email: string;
  purpose: "password_reset";
}

interface SendPasswordResetEmailParams {
  userId: number;
  email: string;
  passwordHash: string;
  displayName?: string | null;
}

const getBaseSecret = (): string => {
  const secret =
    process.env.PASSWORD_RESET_SECRET?.trim() ||
    process.env.JWT_SECRET?.trim();

  if (!secret) {
    throw new Error("PASSWORD_RESET_SECRET or JWT_SECRET must be configured");
  }

  return secret;
};

const getResetSecret = (passwordHash: string): string =>
  `${getBaseSecret()}:${passwordHash}`;

const getFrontendBaseUrl = (): string => {
  const rawBaseUrl = process.env.FRONTEND_URL?.trim() || "http://localhost:3000";
  return rawBaseUrl.endsWith("/") ? rawBaseUrl.slice(0, -1) : rawBaseUrl;
};

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export const generatePasswordResetToken = ({
  userId,
  email,
  passwordHash,
}: {
  userId: number;
  email: string;
  passwordHash: string;
}): string => {
  const expiresIn = (process.env.PASSWORD_RESET_EXPIRES_IN ||
    "30m") as SignOptions["expiresIn"];

  return jwt.sign(
    {
      user_id: userId,
      email,
      purpose: "password_reset",
    },
    getResetSecret(passwordHash),
    { expiresIn }
  );
};

export const decodePasswordResetToken = (
  token: string
): PasswordResetTokenPayload => {
  const payload = jwt.decode(token);

  if (
    !payload ||
    typeof payload !== "object" ||
    payload.purpose !== "password_reset" ||
    typeof payload.email !== "string" ||
    typeof payload.user_id !== "number"
  ) {
    throw new Error("Invalid password reset token");
  }

  return {
    user_id: payload.user_id,
    email: payload.email,
    purpose: "password_reset",
  };
};

export const verifyPasswordResetToken = ({
  token,
  passwordHash,
}: {
  token: string;
  passwordHash: string;
}): PasswordResetTokenPayload =>
  jwt.verify(token, getResetSecret(passwordHash)) as PasswordResetTokenPayload;

export const buildPasswordResetUrl = (token: string): string => {
  const resetUrl = new URL("/reset-password", `${getFrontendBaseUrl()}/`);
  resetUrl.searchParams.set("token", token);

  return resetUrl.toString();
};

const buildPasswordResetEmailContent = ({
  resetUrl,
  displayName,
}: {
  resetUrl: string;
  displayName?: string | null;
}) => {
  const greeting = displayName ? `Hello ${displayName},` : "Hello,";
  const htmlGreeting = displayName
    ? `Hello ${escapeHtml(displayName)},`
    : "Hello,";
  const subject = "Reset your eRegistrar password";
  const text = `${greeting}

We received a request to reset your eRegistrar password.

Open this link to set a new password:
${resetUrl}

This link expires soon. If you did not request a password reset, you can ignore this email.`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1f2937;">
      <h2 style="margin-bottom: 16px;">Reset your eRegistrar password</h2>
      <p style="margin-bottom: 16px;">${htmlGreeting}</p>
      <p style="margin-bottom: 16px;">
        We received a request to reset your eRegistrar password.
      </p>
      <p style="margin-bottom: 24px;">
        <a
          href="${resetUrl}"
          style="display: inline-block; padding: 12px 20px; background: #0f766e; color: #ffffff; text-decoration: none; border-radius: 6px;"
        >
          Reset password
        </a>
      </p>
      <p style="margin-bottom: 8px;">
        If the button does not work, open this link in your browser:
      </p>
      <p style="word-break: break-all; margin-bottom: 16px;">${resetUrl}</p>
      <p style="color: #6b7280; font-size: 14px;">
        This link expires soon. If you did not request a password reset, you can ignore this email.
      </p>
    </div>
  `;

  return { subject, text, html };
};

export const sendPasswordResetEmail = async ({
  userId,
  email,
  passwordHash,
  displayName,
}: SendPasswordResetEmailParams): Promise<string> => {
  const token = generatePasswordResetToken({
    userId,
    email,
    passwordHash,
  });
  const resetUrl = buildPasswordResetUrl(token);
  const { subject, text, html } = buildPasswordResetEmailContent({
    resetUrl,
    displayName,
  });

  await sendEmail({
    to: email,
    subject,
    text,
    html,
    debugContext: {
      flow: "password_reset",
      user_id: userId,
      frontend_url_configured: Boolean(process.env.FRONTEND_URL?.trim()),
      reset_expires_in: process.env.PASSWORD_RESET_EXPIRES_IN || "30m",
    },
  });

  return resetUrl;
};
