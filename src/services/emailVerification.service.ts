import jwt, { SignOptions } from "jsonwebtoken";
import { sendEmail } from "./mail.service";

interface EmailVerificationTokenPayload {
  user_id: number;
  email: string;
  purpose: "email_verification";
}

interface SendVerificationEmailParams {
  userId: number;
  email: string;
  firstName?: string | null;
  debugContext?: Record<string, unknown>;
}

const getVerificationSecret = (): string => {
  const secret =
    process.env.EMAIL_VERIFICATION_SECRET?.trim() ||
    process.env.JWT_SECRET?.trim();

  if (!secret) {
    throw new Error(
      "EMAIL_VERIFICATION_SECRET or JWT_SECRET must be configured"
    );
  }

  return secret;
};

const getBackendBaseUrl = (): string => {
  const rawBaseUrl =
    process.env.BACKEND_URL?.trim() ||
    `http://localhost:${process.env.PORT || "3001"}`;

  return rawBaseUrl.endsWith("/") ? rawBaseUrl.slice(0, -1) : rawBaseUrl;
};

const escapeHtml = (value: string): string => {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

export const generateEmailVerificationToken = ({
  user_id,
  email,
}: Omit<EmailVerificationTokenPayload, "purpose">): string => {
  const expiresIn = (process.env.EMAIL_VERIFICATION_EXPIRES_IN || "1d") as SignOptions["expiresIn"];

  return jwt.sign(
    {
      user_id,
      email,
      purpose: "email_verification",
    },
    getVerificationSecret(),
    { expiresIn }
  );
};

export const verifyEmailVerificationToken = (
  token: string
): EmailVerificationTokenPayload => {
  return jwt.verify(token, getVerificationSecret()) as EmailVerificationTokenPayload;
};

export const buildEmailVerificationUrl = (token: string): string => {
  const verificationUrl = new URL("/api/auth/verify-email", `${getBackendBaseUrl()}/`);
  verificationUrl.searchParams.set("token", token);

  return verificationUrl.toString();
};

const buildEmailContent = ({
  verificationUrl,
  firstName,
}: {
  verificationUrl: string;
  firstName?: string | null;
}): { subject: string; text: string; html: string } => {
  const greeting = firstName ? `Hi ${firstName},` : "Hello,";
  const htmlGreeting = firstName
    ? `Hi ${escapeHtml(firstName)},`
    : "Hello,";
  const subject = "Confirm your eRegistrar account";
  const text = `${greeting}

Please confirm your email address to activate your eRegistrar account.

Open this link to activate your account:
${verificationUrl}

If you did not create this account, you can ignore this email.`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1f2937;">
      <h2 style="margin-bottom: 16px;">Confirm your eRegistrar account</h2>
      <p style="margin-bottom: 16px;">${htmlGreeting}</p>
      <p style="margin-bottom: 16px;">
        Please confirm your email address to activate your eRegistrar account.
      </p>
      <p style="margin-bottom: 24px;">
        <a
          href="${verificationUrl}"
          style="display: inline-block; padding: 12px 20px; background: #0f766e; color: #ffffff; text-decoration: none; border-radius: 6px;"
        >
          Activate account
        </a>
      </p>
      <p style="margin-bottom: 8px;">
        If the button does not work, open this link in your browser:
      </p>
      <p style="word-break: break-all; margin-bottom: 16px;">${verificationUrl}</p>
      <p style="color: #6b7280; font-size: 14px;">
        If you did not create this account, you can ignore this email.
      </p>
    </div>
  `;

  return { subject, text, html };
};

export const sendEmailVerificationEmail = async ({
  userId,
  email,
  firstName,
  debugContext,
}: SendVerificationEmailParams): Promise<string> => {
  const token = generateEmailVerificationToken({
    user_id: userId,
    email,
  });
  const verificationUrl = buildEmailVerificationUrl(token);
  const { subject, text, html } = buildEmailContent({
    verificationUrl,
    firstName,
  });

  await sendEmail({
    to: email,
    subject,
    text,
    html,
    debugContext: {
      flow: "email_verification",
      user_id: userId,
      backend_url_configured: Boolean(process.env.BACKEND_URL?.trim()),
      verification_expires_in:
        process.env.EMAIL_VERIFICATION_EXPIRES_IN || "1d",
      ...(debugContext || {}),
    },
  });

  return verificationUrl;
};
