import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { QueryTypes } from "sequelize";
import { sequelize } from "../../models";

type ClaimStubRequest = {
  request_reference: string;
  claim_stub_number: string;
  current_status: string;
  submitted_at: string;
  academic_snapshot: Record<string, any>;
  release_snapshot: Record<string, any>;
  items: Array<{
    document_name: string;
    quantity: number;
  }>;
  purpose: string;
  lookup_token: string;
  verification_url: string;
};

type SchoolBranding = {
  school_name?: string | null;
  school_logo?: string | null;
};

const DEFAULT_SCHOOL_NAME = "TRINIDAD MUNICIPAL COLLEGE";
const REGISTRAR_TITLE = "OFFICE OF THE REGISTRAR";

const ensureDirectory = (directoryPath: string) => {
  if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath, { recursive: true });
  }
};

const upper = (value: unknown) =>
  typeof value === "string" ? value.trim().toUpperCase() : "";

const normalizeFieldValue = (value: string) => value.trim() || " ";

const resolveUploadAssetPath = (assetPath?: string | null) => {
  if (!assetPath) {
    return null;
  }

  const normalizedPath = assetPath.replace(/^\/+/, "").replace(/\//g, path.sep);
  const absolutePath = path.join(process.cwd(), normalizedPath);
  return fs.existsSync(absolutePath) ? absolutePath : null;
};

const getSchoolBranding = async (): Promise<SchoolBranding> => {
  const rows = await sequelize.query<SchoolBranding>(
    `
    SELECT school_name, school_logo
    FROM system_settings
    WHERE id = 1
    LIMIT 1
    `,
    { type: QueryTypes.SELECT }
  );

  return rows[0] || {};
};

const clampTextToHeight = (
  doc: PDFKit.PDFDocument,
  text: string,
  width: number,
  maxHeight: number,
  lineGap = 1
) => {
  const safeText = normalizeFieldValue(text);
  const measure = (candidate: string) =>
    doc.heightOfString(candidate, { width, lineGap, align: "left" });

  if (measure(safeText) <= maxHeight) {
    return safeText;
  }

  let candidate = safeText;
  const suffix = "...";

  while (candidate.length > 1) {
    const nextSpace = candidate.lastIndexOf(" ");
    candidate =
      nextSpace > 0 ? candidate.slice(0, nextSpace).trimEnd() : candidate.slice(0, -1).trimEnd();

    if (!candidate) {
      break;
    }

    const truncated = `${candidate}${suffix}`;
    if (measure(truncated) <= maxHeight) {
      return truncated;
    }
  }

  return suffix;
};

const fitTextBlock = (
  doc: PDFKit.PDFDocument,
  text: string,
  width: number,
  options?: {
    baseFontSize?: number;
    minFontSize?: number;
    maxLines?: number;
    lineGap?: number;
  }
) => {
  const baseFontSize = options?.baseFontSize ?? 9;
  const minFontSize = options?.minFontSize ?? 6;
  const maxLines = options?.maxLines ?? 2;
  const lineGap = options?.lineGap ?? 1;

  for (let fontSize = baseFontSize; fontSize >= minFontSize; fontSize -= 0.5) {
    doc.font("Helvetica").fontSize(fontSize);
    const maxHeight = fontSize * maxLines + lineGap * (maxLines - 1) + 2;
    const fittedText = clampTextToHeight(doc, text, width, maxHeight, lineGap);
    const height = Math.max(
      fontSize + 1,
      doc.heightOfString(fittedText, { width, lineGap, align: "left" })
    );

    if (height <= maxHeight) {
      return {
        text: fittedText,
        fontSize,
        height,
        lineGap,
      };
    }
  }

  doc.font("Helvetica").fontSize(minFontSize);
  const maxHeight = minFontSize * maxLines + lineGap * (maxLines - 1) + 2;
  const fittedText = clampTextToHeight(doc, text, width, maxHeight, lineGap);

  return {
    text: fittedText,
    fontSize: minFontSize,
    height: Math.max(
      minFontSize + 1,
      doc.heightOfString(fittedText, { width, lineGap, align: "left" })
    ),
    lineGap,
  };
};

const safeDateTime = (value: unknown) => {
  if (!value || typeof value !== "string") {
    return "";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString("en-PH", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const line = (
  doc: PDFKit.PDFDocument,
  label: string,
  value: string,
  x: number,
  y: number,
  width = 460,
  maxLines = 2
) => {
  doc.font("Helvetica-Bold").fontSize(9).text(label, x, y);
  const labelWidth = doc.widthOfString(label) + 6;
  const valueWidth = Math.max(width - labelWidth, 40);
  const fitted = fitTextBlock(doc, value || " ", valueWidth, { maxLines });
  const reservedFieldHeight = Math.max(12, fitted.height + 4);
  const underlineY = y + reservedFieldHeight;
  const valueY = Math.max(y, underlineY - fitted.height - 2);

  doc.font("Helvetica").fontSize(fitted.fontSize).text(fitted.text, x + labelWidth, valueY, {
    width: valueWidth,
    lineGap: fitted.lineGap,
  });
  doc
    .moveTo(x + labelWidth, underlineY)
    .lineTo(x + width, underlineY)
    .lineWidth(0.6)
    .strokeColor("#444444")
    .stroke();
  return underlineY - y + 5;
};

export const generateClaimStubPdf = async (
  request: ClaimStubRequest
) => {
  const uploadsDir = path.join(process.cwd(), "uploads", "workflow", "claim-stubs");
  ensureDirectory(uploadsDir);

  const fileName = `${request.claim_stub_number}.pdf`;
  const absolutePath = path.join(uploadsDir, fileName);
  const relativePath = `/uploads/workflow/claim-stubs/${fileName}`;

  const qrDataUrl = await QRCode.toDataURL(request.verification_url, {
    margin: 1,
    width: 280,
  });
  const qrImageBuffer = Buffer.from(qrDataUrl.split(",")[1], "base64");
  const branding = await getSchoolBranding();

  await new Promise<void>((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 36, left: 42, right: 42, bottom: 36 },
    });

    const stream = fs.createWriteStream(absolutePath);
    doc.pipe(stream);

    const academic = request.academic_snapshot || {};
    const release = request.release_snapshot || {};
    const fullName =
      upper(academic.full_name) ||
      [upper(academic.first_name), upper(academic.middle_name), upper(academic.last_name)]
        .filter(Boolean)
        .join(" ");

    const schoolLogoPath = resolveUploadAssetPath(branding.school_logo);
    if (schoolLogoPath) {
      try {
        doc.image(schoolLogoPath, 50, 39, {
          fit: [56, 56],
          align: "center",
          valign: "center",
        });
      } catch {
        doc.circle(78, 67, 28).fillAndStroke("#1f4b8f", "#153b6f");
        doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(14).text("TMC", 64, 62, {
          width: 28,
          align: "center",
        });
      }
    } else {
      doc.circle(78, 67, 28).fillAndStroke("#1f4b8f", "#153b6f");
      doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(14).text("TMC", 64, 62, {
        width: 28,
        align: "center",
      });
    }

    const schoolName = upper(branding.school_name) || DEFAULT_SCHOOL_NAME;
    let schoolNameFontSize = 20;
    while (schoolNameFontSize > 14) {
      doc.font("Times-Bold").fontSize(schoolNameFontSize);
      if (doc.widthOfString(schoolName) <= 370) {
        break;
      }
      schoolNameFontSize -= 1;
    }

    doc.fillColor("#111111");
    doc.font("Times-Bold").fontSize(schoolNameFontSize).text(schoolName, 110, 48, {
      width: 370,
      align: "center",
    });
    doc.font("Helvetica-Bold").fontSize(13).text(REGISTRAR_TITLE, 138, 74, {
      width: 320,
      align: "center",
    });

    doc.font("Helvetica-Bold").fontSize(16).text("CLAIM STUB / CLAIM RECEIPT", 0, 118, {
      width: 595,
      align: "center",
    });

    let y = 160;
    y += line(doc, "CLAIM STUB NO.:", request.claim_stub_number, 48, y);
    y += line(doc, "REQUEST REFERENCE NO.:", request.request_reference, 48, y);
    y += line(doc, "STUDENT / ALUMNI NAME:", fullName, 48, y, 460, 2);
    y += line(doc, "STUDENT ID NO.:", upper(academic.student_number), 48, y);
    y += line(doc, "COURSE / PROGRAM:", upper(academic.course_name), 48, y, 460, 2);
    y += line(doc, "DOCUMENT REQUESTED:", request.items.map((item) => upper(item.document_name)).join(", "), 48, y, 460, 2);
    y += line(doc, "PURPOSE:", upper(request.purpose), 48, y, 460, 2);
    y += line(doc, "REQUEST DATE:", safeDateTime(request.submitted_at), 48, y);
    y += line(doc, "READY FOR RELEASE DATE:", safeDateTime(release.expected_release_date || release.date_released), 48, y);
    y += line(doc, "RELEASE METHOD:", upper(release.release_method || "PICKUP"), 48, y);
    y += line(doc, "CLAIM LOCATION:", "OFFICE OF THE REGISTRAR", 48, y);

    y += 34;
    doc.font("Helvetica-Bold").fontSize(10).text("CLAIM INSTRUCTIONS", 48, y);
    y += 18;
    doc.font("Helvetica").fontSize(9).text(
      "1. Present this claim stub and one valid ID at the Registrar Office.\n" +
        "2. If a representative will claim, bring an authorization letter and representative ID.\n" +
        "3. Claim is subject to registrar verification and release eligibility.\n" +
        "4. This stub becomes invalid once the request is claimed, cancelled, rejected, or completed.",
      48,
      y,
      { width: 490, lineGap: 4 }
    );

    y += 88;
    doc.rect(48, y, 150, 150).lineWidth(0.8).strokeColor("#222222").stroke();
    doc.image(qrImageBuffer, 58, y + 10, {
      fit: [130, 130],
      align: "center",
      valign: "center",
    });
    doc.font("Helvetica").fontSize(7).text("SCAN TO VERIFY", 48, y + 136, {
      width: 150,
      align: "center",
    });

    doc.font("Helvetica-Bold").fontSize(9).text("MANUAL LOOKUP", 240, y + 12);
    line(doc, "CLAIM STUB NO.:", request.claim_stub_number, 240, y + 32, 250, 1);
    line(doc, "REFERENCE NO.:", request.request_reference, 240, y + 52, 250, 1);
    line(doc, "CURRENT STATUS:", upper(request.current_status), 240, y + 72, 250, 1);
    line(doc, "LOOKUP TOKEN:", request.lookup_token, 240, y + 92, 250, 2);
    line(doc, "ISSUED BY:", "EREGISTRAR SYSTEM", 240, y + 112, 250, 1);
    line(doc, "GENERATED AT:", safeDateTime(new Date().toISOString()), 240, y + 132, 250, 1);

    doc.end();

    stream.on("finish", () => resolve());
    stream.on("error", (error) => reject(error));
  });

  return {
    fileName,
    absolutePath,
    relativePath,
  };
};
