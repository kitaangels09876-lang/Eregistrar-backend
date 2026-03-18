import nodemailer from "nodemailer";

interface MailPayload {
  to: string;
  subject: string;
  text: string;
  html: string;
}

interface MailConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

let transporter: nodemailer.Transporter | null = null;

const getRequiredEnv = (key: string): string => {
  const value = process.env[key]?.trim();

  if (!value) {
    throw new Error(`${key} is not configured`);
  }

  return value;
};

const getMailConfig = (): MailConfig => {
  const host = getRequiredEnv("SMTP_HOST");
  const port = Number(getRequiredEnv("SMTP_PORT"));
  const user = getRequiredEnv("SMTP_USER");
  const pass = getRequiredEnv("SMTP_PASS");
  const from = process.env.SMTP_FROM?.trim() || user;
  const secure =
    (process.env.SMTP_SECURE ?? String(port === 465)).toLowerCase() === "true";

  if (Number.isNaN(port)) {
    throw new Error("SMTP_PORT must be a valid number");
  }

  return {
    host,
    port,
    secure,
    user,
    pass,
    from,
  };
};

const getTransporter = (): nodemailer.Transporter => {
  if (transporter) {
    return transporter;
  }

  const config = getMailConfig();

  transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  return transporter;
};

export const sendEmail = async ({
  to,
  subject,
  text,
  html,
}: MailPayload): Promise<void> => {
  const config = getMailConfig();

  try {
    await getTransporter().sendMail({
      from: config.from,
      to,
      subject,
      text,
      html,
    });
  } catch (error) {
    const errorCode =
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code?: string }).code)
        : "";

    if (errorCode === "ENOTFOUND" || errorCode === "EDNS") {
      throw new Error(
        `SMTP host lookup failed for ${config.host}. Check DNS, internet access, or firewall settings.`
      );
    }

    throw error;
  }
};
