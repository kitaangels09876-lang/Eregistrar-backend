import axios from "axios";
import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import { QueryTypes } from "sequelize";
import { sequelize } from "../../models";
import {
  removeLocalFileIfExists,
  uploadLocalFileToCloudinary,
} from "../../utils/cloudinaryStorage";

type RequestItem = {
  document_type_id?: number;
  document_name: string;
  quantity: number;
  base_price: number;
  final_price: number;
};

type CatalogItem = {
  document_type_id: number;
  document_name: string;
  base_price: number;
};

type WorkflowRequestForPdf = {
  workflow_request_id: number;
  request_reference: string;
  current_status: string;
  purpose: string;
  submitted_at: string;
  form_snapshot: Record<string, any>;
  educational_background: Array<Record<string, any>>;
  academic_snapshot: Record<string, any>;
  approval_snapshot: Record<string, any>;
  fee_snapshot: Record<string, any>;
  payment_snapshot: Record<string, any>;
  release_snapshot: Record<string, any>;
  items: RequestItem[];
};

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 1008;
const LEFT = 42;
const RIGHT = PAGE_WIDTH - 42;
const DEFAULT_SCHOOL_NAME = "TRINIDAD MUNICIPAL COLLEGE";
const REGISTRAR_TITLE = "OFFICE OF THE REGISTRAR";

type SchoolBranding = {
  school_name?: string | null;
  school_short_name?: string | null;
  school_logo?: string | null;
};

type PdfImageSource = string | Buffer;

const ensureDirectory = (directoryPath: string) => {
  if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath, { recursive: true });
  }
};

const upper = (value: unknown) =>
  typeof value === "string" ? value.trim().toUpperCase() : "";

const normalizeFieldValue = (value: string) => value.trim() || " ";

const safeDate = (value: unknown) => {
  if (!value || typeof value !== "string") {
    return "";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

const formatMoney = (value: unknown) => Number(value || 0).toFixed(2);

const strokeFieldLine = (
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  width: number
) => {
  doc
    .moveTo(x, y)
    .lineTo(x + width, y)
    .lineWidth(0.6)
    .strokeColor("#444444")
    .stroke();
};

const resolveUploadAssetPath = (assetPath?: string | null) => {
  if (!assetPath) {
    return null;
  }

  const normalizedPath = assetPath.replace(/^\/+/, "").replace(/\//g, path.sep);
  const absolutePath = path.join(process.cwd(), normalizedPath);
  return fs.existsSync(absolutePath) ? absolutePath : null;
};

const loadUploadAssetSource = async (assetPath?: string | null): Promise<PdfImageSource | null> => {
  if (!assetPath) {
    return null;
  }

  if (/^https?:\/\//i.test(assetPath)) {
    try {
      const response = await axios.get<ArrayBuffer>(assetPath, {
        responseType: "arraybuffer",
        timeout: 15000,
      });
      return Buffer.from(response.data);
    } catch {
      return null;
    }
  }

  return resolveUploadAssetPath(assetPath);
};

const getSchoolBranding = async (): Promise<SchoolBranding> => {
  const rows = await sequelize.query<SchoolBranding>(
    `
    SELECT school_name, school_short_name, school_logo
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

const fitSingleLineText = (
  doc: PDFKit.PDFDocument,
  text: string,
  width: number,
  baseFontSize = 9,
  minFontSize = 6
) => fitTextBlock(doc, text, width, { baseFontSize, minFontSize, maxLines: 1, lineGap: 0 });

const drawLabeledLine = (
  doc: PDFKit.PDFDocument,
  options: {
    label: string;
    value: string;
    x: number;
    y: number;
    width?: number;
    lineOffset?: number;
    maxLines?: number;
  }
) => {
  const { label, value, x, y, width = 420, lineOffset = 11, maxLines = 2 } = options;
  doc.font("Helvetica-Bold").fontSize(9).fillColor("#111111").text(label, x, y);
  const labelWidth = doc.widthOfString(label) + 4;
  const valueWidth = Math.max(width - labelWidth, 40);
  const fitted = fitTextBlock(doc, value || " ", valueWidth, { maxLines });
  const reservedFieldHeight = Math.max(lineOffset, fitted.height + 4);
  const underlineY = y + reservedFieldHeight;
  const valueY = Math.max(y, underlineY - fitted.height - 2);

  doc.font("Helvetica").fontSize(fitted.fontSize).text(fitted.text, x + labelWidth, valueY, {
    width: valueWidth,
    lineGap: fitted.lineGap,
  });
  strokeFieldLine(doc, x + labelWidth, underlineY, width - labelWidth);
  return underlineY - y + 5;
};

const drawSectionTitle = (
  doc: PDFKit.PDFDocument,
  title: string,
  y: number
) => {
  doc.font("Helvetica-Bold").fontSize(10).fillColor("#111111").text(title, LEFT, y, {
    width: RIGHT - LEFT,
    align: "center",
  });
};

const drawCheckbox = (
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  checked: boolean
) => {
  doc.rect(x, y, 10, 10).lineWidth(0.7).strokeColor("#222222").stroke();
  if (checked) {
    doc
      .moveTo(x + 2, y + 5)
      .lineTo(x + 4.5, y + 8)
      .lineTo(x + 8.5, y + 2)
      .lineWidth(1)
      .strokeColor("#111111")
      .stroke();
  }
};

const inferDocumentGroup = (documentName: string) => {
  const normalized = upper(documentName);

  if (
    normalized.includes("PRINTING") ||
    normalized.includes("GRADE SLIP") ||
    normalized.includes("BILLING STATEMENT") ||
    normalized.includes("ASSESSMENT")
  ) {
    return "PRINTING SERVICES";
  }

  if (
    normalized.includes("CERTIFICATE") ||
    normalized.includes("CERTIFICATION") ||
    normalized.includes("COR") ||
    normalized.includes("GOOD MORAL")
  ) {
    return "CERTIFICATIONS";
  }

  return "RECORDS REQUESTED";
};

const dedupeRequestItems = (items: RequestItem[]) => {
  const seen = new Set<string>();

  return items.filter((item) => {
    const key = `${item.document_type_id || ""}:${upper(item.document_name)}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
};

const groupItems = (items: Array<RequestItem | CatalogItem>) => {
  const grouped: Record<string, RequestItem[]> = {
    "RECORDS REQUESTED": [],
    CERTIFICATIONS: [],
    "PRINTING SERVICES": [],
  };

  for (const item of items as RequestItem[]) {
    grouped[inferDocumentGroup(item.document_name)].push(item as RequestItem);
  }

  return grouped;
};

const loadDocumentCatalog = async (): Promise<CatalogItem[]> => {
  const rows = await sequelize.query<CatalogItem>(
    `
    SELECT
      document_type_id,
      document_name,
      base_price
    FROM document_types
    WHERE is_active = 1
    ORDER BY document_name ASC
    `,
    {
      type: QueryTypes.SELECT,
    }
  );

  return rows;
};

const normalizeEducationBackground = (entries: Array<Record<string, any>> = []) => {
  const levels = [
    "primary",
    "elementary",
    "junior_high_school",
    "senior_high_school",
  ] as const;

  return levels.map((level) => {
    const match = entries.find((entry) => entry?.level === level) || {};
    return {
      level,
      school_name: upper(match.school_name),
      school_address: upper(match.school_address),
      year_graduated: upper(match.year_graduated),
    };
  });
};

const buildRequestedDocumentLabel = (items: RequestItem[]) =>
  dedupeRequestItems(items)
    .map((item) => upper(item.document_name))
    .filter(Boolean)
    .join(", ");

const createEditableFieldWriter = (doc: PDFKit.PDFDocument) => {
  let fieldIndex = 0;

  return (
    options: {
      namePrefix: string;
      label: string;
      value: string;
      x: number;
      y: number;
      width: number;
      labelWidth?: number;
      maxLines?: number;
      baseFontSize?: number;
      minFontSize?: number;
      align?: "left" | "center" | "right";
    }
  ) => {
    const {
      namePrefix,
      label,
      value,
      x,
      y,
      width,
      labelWidth,
      maxLines = 1,
      baseFontSize = 9,
      minFontSize = 6,
      align = "left",
    } = options;

    doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#111111").text(label, x, y + 2);
    const resolvedLabelWidth = labelWidth ?? doc.widthOfString(label) + 6;
    const fieldX = x + resolvedLabelWidth;
    const fieldWidth = Math.max(width - resolvedLabelWidth, 40);
    const fitted = fitTextBlock(doc, value || " ", fieldWidth - 8, {
      baseFontSize,
      minFontSize,
      maxLines,
      lineGap: 0,
    });
    const fieldHeight = Math.max(
      maxLines > 1 ? 18 : 11,
      Math.ceil(fitted.height + 3)
    );
    const underlineY = y + fieldHeight + 2;

    doc.font("Helvetica");
    doc.formText(
      `${namePrefix}_${fieldIndex++}`,
      fieldX,
      y,
      fieldWidth,
      fieldHeight,
      {
        value: value || "",
        fontSize: fitted.fontSize,
        multiline: maxLines > 1,
        align,
      }
    );
    strokeFieldLine(doc, fieldX, underlineY, fieldWidth);

    return underlineY - y + 4;
  };
};

const drawEditableNameColumns = (
  doc: PDFKit.PDFDocument,
  writeField: ReturnType<typeof createEditableFieldWriter>,
  options: {
    familyName: string;
    firstName: string;
    middleName: string;
    y: number;
  }
) => {
  const { familyName, firstName, middleName, y } = options;

  doc.font("Helvetica-Bold").fontSize(8.5).text("Name:", LEFT, y + 2);

  const startX = LEFT + 44;
  const totalWidth = RIGHT - startX;
  const familyWidth = 198;
  const firstWidth = 150;
  const middleWidth = totalWidth - familyWidth - firstWidth - 12;

  writeField({
    namePrefix: "family_name",
    label: "",
    value: familyName,
    x: startX,
    y,
    width: familyWidth,
    baseFontSize: 8.5,
    minFontSize: 6,
    align: "center",
    labelWidth: 0,
  });
  writeField({
    namePrefix: "first_name",
    label: "",
    value: firstName,
    x: startX + familyWidth + 6,
    y,
    width: firstWidth,
    baseFontSize: 8.5,
    minFontSize: 6,
    align: "center",
    labelWidth: 0,
  });
  writeField({
    namePrefix: "middle_name",
    label: "",
    value: middleName,
    x: startX + familyWidth + firstWidth + 12,
    y,
    width: middleWidth,
    baseFontSize: 8.5,
    minFontSize: 6,
    align: "center",
    labelWidth: 0,
  });

  doc.font("Helvetica").fontSize(7.5).fillColor("#333333").text("Family Name", startX, y + 16, {
    width: familyWidth,
    align: "center",
  });
  doc.text("First Name", startX + familyWidth + 6, y + 16, {
    width: firstWidth,
    align: "center",
  });
  doc.text("Middle Name", startX + familyWidth + firstWidth + 12, y + 16, {
    width: middleWidth,
    align: "center",
  });
  doc.fillColor("#111111");
};

const drawCatalogDocumentSection = (
  doc: PDFKit.PDFDocument,
  title: string,
  items: CatalogItem[],
  selectedIds: Set<number>,
  y: number
) => {
  doc.font("Helvetica-Bold").fontSize(9).text(title, LEFT + 14, y);
  let currentY = y + 16;

  for (const item of items) {
    const checked = selectedIds.has(Number(item.document_type_id));
    drawCheckbox(doc, LEFT + 16, currentY + 1, checked);
    const itemName = fitTextBlock(doc, upper(item.document_name), 320, {
      baseFontSize: 8.5,
      minFontSize: 6,
      maxLines: 2,
    });
    doc.font("Helvetica").fontSize(itemName.fontSize).text(itemName.text, LEFT + 34, currentY, {
      width: 320,
      lineGap: itemName.lineGap,
    });
    doc.text(formatMoney(item.base_price), RIGHT - 78, currentY, {
      width: 58,
      align: "right",
    });
    currentY += Math.max(13, itemName.height + 2);
  }

  return currentY + 8;
};

const drawFallbackHeaderLogo = (doc: PDFKit.PDFDocument) => {
  doc.circle(78, 67, 28).fillAndStroke("#1f4b8f", "#153b6f");
  doc.fillColor("#f5d062").circle(78, 58, 5).fill();
  doc.fillColor("#ffffff").rect(66, 63, 24, 16).fill();
  doc.fillColor("#b8860b").font("Helvetica-Bold").fontSize(14).text("TMC", 66, 66, {
    width: 24,
    align: "center",
  });
};

const drawHeader = (
  doc: PDFKit.PDFDocument,
  branding: SchoolBranding,
  schoolLogoSource?: PdfImageSource | null
) => {
  if (schoolLogoSource) {
    try {
      doc.image(schoolLogoSource, 50, 39, {
        fit: [56, 56],
        align: "center",
        valign: "center",
      });
    } catch {
      drawFallbackHeaderLogo(doc);
    }
  } else {
    drawFallbackHeaderLogo(doc);
  }

  const schoolName = upper(branding.school_name) || DEFAULT_SCHOOL_NAME;
  let schoolNameFontSize = 20;
  while (schoolNameFontSize > 14) {
    doc.font("Times-Bold").fontSize(schoolNameFontSize);
    if (doc.widthOfString(schoolName) <= 360) {
      break;
    }
    schoolNameFontSize -= 1;
  }

  doc.fillColor("#111111");
  doc.font("Times-Bold").fontSize(schoolNameFontSize).text(schoolName, 118, 48, {
    width: 360,
    align: "center",
  });
  doc.font("Helvetica-Bold").fontSize(13).text(REGISTRAR_TITLE, 140, 74, {
    width: 320,
    align: "center",
  });
};

const drawNameColumns = (
  doc: PDFKit.PDFDocument,
  {
    familyName,
    firstName,
    middleName,
    y,
  }: {
    familyName: string;
    firstName: string;
    middleName: string;
    y: number;
  }
) => {
  doc.font("Helvetica-Bold").fontSize(9).text("Name:", LEFT, y + 2);

  const startX = LEFT + 45;
  const totalWidth = RIGHT - startX;
  const familyWidth = 200;
  const firstWidth = 150;
  const middleWidth = totalWidth - familyWidth - firstWidth - 18;

  strokeFieldLine(doc, startX, y + 13, familyWidth);
  strokeFieldLine(doc, startX + familyWidth + 9, y + 13, firstWidth);
  strokeFieldLine(doc, startX + familyWidth + firstWidth + 18, y + 13, middleWidth);

  const familyFit = fitSingleLineText(doc, familyName || " ", familyWidth - 8, 9, 6);
  const firstFit = fitSingleLineText(doc, firstName || " ", firstWidth - 8, 9, 6);
  const middleFit = fitSingleLineText(doc, middleName || " ", middleWidth - 8, 9, 6);

  doc.font("Helvetica").fontSize(familyFit.fontSize).text(familyFit.text, startX + 4, y + 1, {
    width: familyWidth - 8,
    align: "center",
  });
  doc.font("Helvetica").fontSize(firstFit.fontSize).text(firstFit.text, startX + familyWidth + 13, y + 1, {
    width: firstWidth - 8,
    align: "center",
  });
  doc.font("Helvetica").fontSize(middleFit.fontSize).text(middleFit.text, startX + familyWidth + firstWidth + 22, y + 1, {
    width: middleWidth - 8,
    align: "center",
  });

  doc.font("Helvetica").fontSize(8).fillColor("#333333").text("Family Name", startX, y + 16, {
    width: familyWidth,
    align: "center",
  });
  doc.text("First Name", startX + familyWidth + 9, y + 16, {
    width: firstWidth,
    align: "center",
  });
  doc.text("Middle Name", startX + familyWidth + firstWidth + 18, y + 16, {
    width: middleWidth,
    align: "center",
  });
  doc.fillColor("#111111");
};

const drawDocumentSection = (
  doc: PDFKit.PDFDocument,
  title: string,
  items: RequestItem[],
  y: number
) => {
  doc.font("Helvetica-Bold").fontSize(10).text(title, LEFT + 14, y);
  let currentY = y + 18;

  if (items.length === 0) {
    drawCheckbox(doc, LEFT + 16, currentY + 1, false);
    strokeFieldLine(doc, LEFT + 34, currentY + 10, 280);
    strokeFieldLine(doc, RIGHT - 78, currentY + 10, 58);
    currentY += 18;
    return currentY;
  }

  for (const item of items) {
    drawCheckbox(doc, LEFT + 16, currentY + 1, true);
    const itemName = fitTextBlock(doc, upper(item.document_name), 320, {
      baseFontSize: 9,
      minFontSize: 6,
      maxLines: 2,
    });
    doc.font("Helvetica").fontSize(itemName.fontSize).text(itemName.text, LEFT + 34, currentY, {
      width: 320,
      lineGap: itemName.lineGap,
    });
    doc.text(formatMoney(item.final_price || item.base_price), RIGHT - 78, currentY, {
      width: 58,
      align: "right",
    });
    currentY += Math.max(16, itemName.height + 4);
  }

  return currentY + 8;
};

const drawSignatureApprovalField = (
  doc: PDFKit.PDFDocument,
  options: {
    label: string;
    name: string;
    signatureSource?: PdfImageSource | null;
    x: number;
    y: number;
    width: number;
  }
) => {
  const { label, name, signatureSource, x, y, width } = options;
  const lineY = y + 34;

  doc.font("Helvetica-Bold").fontSize(9).fillColor("#111111").text(label, x, y, {
    width,
    align: "left",
  });

  if (signatureSource) {
    try {
      doc.image(signatureSource, x + 8, y + 6, {
        fit: [Math.max(width - 16, 40), 22],
        align: "center",
        valign: "center",
      });
    } catch {
      // Keep the field printable even if the file is unreadable.
    }
  }

  strokeFieldLine(doc, x, lineY, width);
  doc.font("Helvetica").fontSize(8).fillColor("#333333").text(name || " ", x, lineY + 3, {
    width,
    align: "center",
  });
  doc.fillColor("#111111");

  return 48;
};

export const generateRequestFormPdf = async (
  request: WorkflowRequestForPdf,
  versionNumber: number
) => {
  const uploadsDir = path.join(process.cwd(), "uploads", "workflow", "forms");
  ensureDirectory(uploadsDir);

  const fileName = `${request.request_reference}_v${versionNumber}.pdf`;
  const absolutePath = path.join(uploadsDir, fileName);
  const relativePath = `/uploads/workflow/forms/${fileName}`;
  const branding = await getSchoolBranding();
  const approvalSnapshot = request.approval_snapshot || {};
  const paymentSnapshot = request.payment_snapshot || {};
  const schoolLogoSource = await loadUploadAssetSource(branding.school_logo);
  const signatureSources = {
    treasurer: await loadUploadAssetSource(paymentSnapshot.confirmed_by_signature_file_path),
    dean: await loadUploadAssetSource(approvalSnapshot.dean_signature_file_path),
    registrar: await loadUploadAssetSource(approvalSnapshot.registrar_signature_file_path),
    collegeAdmin: await loadUploadAssetSource(
      approvalSnapshot.college_admin_signature_file_path
    ),
  };
  const uniqueItems = dedupeRequestItems(request.items || []);
  const groupedCatalog = groupItems(await loadDocumentCatalog()) as Record<
    string,
    CatalogItem[]
  >;
  const requestedDocumentLabel = buildRequestedDocumentLabel(uniqueItems);
  const educationEntries = normalizeEducationBackground(request.educational_background || []);
  const selectedDocumentIds = new Set(
    uniqueItems
      .map((item) => Number(item.document_type_id))
      .filter((value) => Number.isInteger(value) && value > 0)
  );

  await new Promise<void>((resolve, reject) => {
    const doc = new PDFDocument({
      size: "LEGAL",
      margins: { top: 24, left: LEFT, right: 42, bottom: 30 },
    });

    const stream = fs.createWriteStream(absolutePath);
    doc.pipe(stream);
    doc.font("Times-Roman");
    doc.initForm();

    const form = request.form_snapshot || {};
    const academic = request.academic_snapshot || {};
    const approval = request.approval_snapshot || {};
    const fee = request.fee_snapshot || {};
    const payment = request.payment_snapshot || {};
    const release = request.release_snapshot || {};
    const writeField = createEditableFieldWriter(doc);

    const fullName =
      upper(academic.full_name) ||
      [
        upper(academic.last_name),
        upper(academic.first_name),
        upper(academic.middle_name),
        upper(academic.extension_name),
      ]
        .filter(Boolean)
        .join(", ");

    drawHeader(doc, branding, schoolLogoSource);
    doc
      .font("Helvetica-Bold")
      .fontSize(8)
      .text("BASIC INFORMATION (PLEASE FILL UP IN CAPITAL LETTER, WRITE LEGIBLY)", LEFT + 40, 114, {
        width: RIGHT - LEFT - 80,
        align: "center",
      });

    doc.font("Helvetica").fontSize(8).fillColor("#444444").text(
      `REFERENCE NO: ${request.request_reference}`,
      RIGHT - 130,
      96,
      { width: 120, align: "right" }
    );
    doc.fillColor("#111111");

    let y = 136;
    y += writeField({
      namePrefix: "basic_name",
      label: "NAME:",
      value: fullName,
      x: LEFT + 18,
      y,
      width: 490,
      maxLines: 2,
      baseFontSize: 8.5,
    });
    y += writeField({
      namePrefix: "civil_status",
      label: "CIVIL STATUS:",
      value: upper(form.civil_status),
      x: LEFT + 18,
      y,
      width: 490,
      baseFontSize: 8.5,
    });
    y += writeField({
      namePrefix: "gender",
      label: "GENDER:",
      value: upper(form.gender),
      x: LEFT + 18,
      y,
      width: 490,
      baseFontSize: 8.5,
    });
    y += writeField({
      namePrefix: "contact_number",
      label: "CONTACT NUMBER:",
      value: upper(form.contact_number),
      x: LEFT + 18,
      y,
      width: 490,
      baseFontSize: 8.5,
    });
    y += writeField({
      namePrefix: "address_line",
      label: "ADDRESS:",
      value: upper(form.address_line),
      x: LEFT + 18,
      y,
      width: 490,
      maxLines: 2,
      baseFontSize: 8.5,
    });
    y += writeField({
      namePrefix: "purok",
      label: "PUROK:",
      value: upper(form.purok),
      x: LEFT + 18,
      y,
      width: 490,
      baseFontSize: 8.5,
    });
    y += writeField({
      namePrefix: "barangay",
      label: "BARANGAY:",
      value: upper(form.barangay),
      x: LEFT + 18,
      y,
      width: 490,
      maxLines: 2,
      baseFontSize: 8.5,
    });
    y += writeField({
      namePrefix: "municipality",
      label: "MUNICIPALITY:",
      value: upper(form.municipality),
      x: LEFT + 18,
      y,
      width: 490,
      baseFontSize: 8.5,
    });
    y += writeField({
      namePrefix: "province",
      label: "PROVINCE:",
      value: upper(form.province),
      x: LEFT + 18,
      y,
      width: 490,
      baseFontSize: 8.5,
    });
    y += writeField({
      namePrefix: "academic_year_label",
      label: "ACADEMIC YEAR:",
      value: upper(form.academic_year_label),
      x: LEFT + 18,
      y,
      width: 490,
      baseFontSize: 8.5,
    });
    y += writeField({
      namePrefix: "place_of_birth",
      label: "PLACE OF BIRTH:",
      value: upper(form.place_of_birth),
      x: LEFT + 18,
      y,
      width: 490,
      maxLines: 2,
      baseFontSize: 8.5,
    });
    y += writeField({
      namePrefix: "date_of_birth",
      label: "DATE OF BIRTH:",
      value: safeDate(form.date_of_birth),
      x: LEFT + 18,
      y,
      width: 490,
      baseFontSize: 8.5,
    });
    y += writeField({
      namePrefix: "type_of_record",
      label: "TYPE OF RECORD TO BE CLAIM:",
      value: requestedDocumentLabel,
      x: LEFT + 18,
      y,
      width: 490,
      maxLines: 3,
      baseFontSize: 8.5,
    });
    y += writeField({
      namePrefix: "purpose_page_1",
      label: "PURPOSE:",
      value: upper(request.purpose),
      x: LEFT + 18,
      y,
      width: 490,
      maxLines: 2,
      baseFontSize: 8.5,
    });

    y += 16;
    drawSectionTitle(doc, "EDUCATIONAL BACK GROUND", y);
    y += 18;

    const levels = [
      { key: "primary", label: "PRIMARY:" },
      { key: "elementary", label: "ELEMENTARY:" },
      { key: "junior_high_school", label: "JUNIOR HIGH SCHOOL:" },
      { key: "senior_high_school", label: "SENIOR HIGH SCHOOL:" },
    ] as const;

    for (const level of levels) {
      const entry =
        educationEntries.find((item) => item.level === level.key) || educationEntries[0];

      doc.font("Helvetica-Bold").fontSize(8.5).text(level.label, LEFT + 40, y);
      y += 10;
      y += writeField({
        namePrefix: `${level.key}_school_name`,
        label: "NAME OF SCHOOL:",
        value: entry.school_name,
        x: LEFT + 40,
        y,
        width: 450,
        maxLines: 2,
        baseFontSize: 8,
      });
      y += writeField({
        namePrefix: `${level.key}_school_address`,
        label: "ADDRESS OF SCHOOL:",
        value: entry.school_address,
        x: LEFT + 40,
        y,
        width: 450,
        maxLines: 2,
        baseFontSize: 8,
      });
      y += writeField({
        namePrefix: `${level.key}_year_graduated`,
        label: "YEAR GRADUATED:",
        value: entry.year_graduated,
        x: LEFT + 40,
        y,
        width: 450,
        baseFontSize: 8,
      });
      y += 6;
    }

    doc.addPage({
      size: "LEGAL",
      margins: { top: 24, left: LEFT, right: 42, bottom: 30 },
    });
    drawHeader(doc, branding);
    doc.font("Helvetica-Bold").fontSize(15).text("REQUEST FORM", 0, 104, {
      width: PAGE_WIDTH,
      align: "center",
    });

    y = 136;
    drawEditableNameColumns(doc, writeField, {
      familyName: upper(academic.last_name),
      firstName: upper(academic.first_name),
      middleName: upper(academic.middle_name),
      y,
    });

    y += 34;
    const graduationRowHeight = Math.max(
      writeField({
        namePrefix: "course_graduated",
        label: "Course Graduated:",
        value: upper(academic.course_name || form.course_text),
        x: LEFT + 18,
        y,
        width: 302,
        maxLines: 2,
        baseFontSize: 8.5,
      }),
      writeField({
        namePrefix: "course_academic_year",
        label: "Academic Year:",
        value: upper(form.academic_year_label),
        x: LEFT + 332,
        y,
        width: 170,
        baseFontSize: 8.5,
      })
    );

    y += graduationRowHeight;
    const semesterRowHeight = Math.max(
      writeField({
        namePrefix: "last_semester_attended",
        label: "Last Semester Attended if Undergraduate:",
        value: upper(form.last_semester_attended),
        x: LEFT + 18,
        y,
        width: 302,
        maxLines: 2,
        baseFontSize: 8.5,
      }),
      writeField({
        namePrefix: "semester_academic_year",
        label: "Academic Year:",
        value: upper(form.academic_year_label),
        x: LEFT + 332,
        y,
        width: 170,
        baseFontSize: 8.5,
      })
    );

    y += semesterRowHeight + 10;
    doc.font("Helvetica-Bold").fontSize(8.5).text("Please Checked type of Records Requested:", LEFT + 18, y);
    y += 18;

    y = drawCatalogDocumentSection(
      doc,
      "RECORDS REQUESTED",
      groupedCatalog["RECORDS REQUESTED"] || [],
      selectedDocumentIds,
      y
    );
    y = drawCatalogDocumentSection(
      doc,
      "CERTIFICATIONS",
      groupedCatalog.CERTIFICATIONS || [],
      selectedDocumentIds,
      y
    );
    y = drawCatalogDocumentSection(
      doc,
      "PRINTING SERVICES",
      groupedCatalog["PRINTING SERVICES"] || [],
      selectedDocumentIds,
      y
    );

    y += 10;
    doc.font("Helvetica-Bold").fontSize(9).text("Approved by:", LEFT + 18, y);
    y += 16;

    const signatureRowHeight = Math.max(
      drawSignatureApprovalField(doc, {
        label: "Treasurer",
        name: upper(payment.confirmed_by_name || payment.official_receipt_no),
        signatureSource: signatureSources.treasurer,
        x: LEFT + 18,
        y,
        width: 140,
      }),
      drawSignatureApprovalField(doc, {
        label: "College Department Head",
        name: upper(approval.dean_name),
        signatureSource: signatureSources.dean,
        x: LEFT + 178,
        y,
        width: 150,
      }),
      drawSignatureApprovalField(doc, {
        label: "Registrar",
        name: upper(approval.registrar_name),
        signatureSource: signatureSources.registrar,
        x: LEFT + 348,
        y,
        width: 140,
      })
    );

    y += signatureRowHeight + 8;
    y += drawSignatureApprovalField(doc, {
      label: "College Administrator",
      name: upper(approval.college_admin_name),
      signatureSource: signatureSources.collegeAdmin,
      x: LEFT + 140,
      y,
      width: 220,
    });

    y += 6;
    const releaseMetaRowHeight = Math.max(
      writeField({
        namePrefix: "purpose_page_2",
        label: "Purpose:",
        value: upper(request.purpose),
        x: LEFT + 18,
        y,
        width: 210,
        maxLines: 2,
        baseFontSize: 8.5,
      }),
      writeField({
        namePrefix: "date_of_released",
        label: "Date of Released:",
        value: safeDate(release.date_released),
        x: LEFT + 245,
        y,
        width: 240,
        baseFontSize: 8.5,
      })
    );

    y += releaseMetaRowHeight + 8;
    strokeFieldLine(doc, LEFT + 18, y, 465);
    y += 14;
    doc.font("Helvetica-Bold").fontSize(10).text("CLAIM SLIP", 0, y, {
      width: PAGE_WIDTH,
      align: "center",
    });

    y += 20;
    const claimHeaderRowHeight = Math.max(
      writeField({
        namePrefix: "claim_name",
        label: "Name:",
        value: fullName,
        x: LEFT + 18,
        y,
        width: 180,
        maxLines: 2,
        baseFontSize: 8,
      }),
      writeField({
        namePrefix: "claim_course",
        label: "Course:",
        value: upper(academic.course_name || form.course_text),
        x: LEFT + 205,
        y,
        width: 190,
        maxLines: 2,
        baseFontSize: 8,
      }),
      writeField({
        namePrefix: "claim_id_no",
        label: "ID No.:",
        value: upper(academic.student_number),
        x: LEFT + 402,
        y,
        width: 85,
        baseFontSize: 8,
      })
    );

    y += claimHeaderRowHeight;
    y += writeField({
      namePrefix: "claim_type_of_record",
      label: "Type of Record to be Claim:",
      value: requestedDocumentLabel,
      x: LEFT + 18,
      y,
      width: 470,
      maxLines: 3,
      baseFontSize: 8,
    });

    const claimMetaRowHeight = Math.max(
      writeField({
        namePrefix: "claim_requested_by",
        label: "Request by:",
        value: fullName,
        x: LEFT + 18,
        y,
        width: 205,
        maxLines: 2,
        baseFontSize: 8,
      }),
      writeField({
        namePrefix: "claim_date",
        label: "Date:",
        value: safeDate(request.submitted_at),
        x: LEFT + 232,
        y,
        width: 105,
        baseFontSize: 8,
      }),
      writeField({
        namePrefix: "claim_expected_release",
        label: "Expected Date of Released:",
        value: safeDate(release.expected_release_date),
        x: LEFT + 344,
        y,
        width: 145,
        baseFontSize: 8,
      })
    );

    y += claimMetaRowHeight;
    doc.font("Helvetica-Bold").fontSize(9).text("Requirements to bring:", LEFT + 18, y);
    for (let index = 0; index < 4; index += 1) {
      const itemX = LEFT + 18 + index * 115;
      doc.font("Helvetica").fontSize(9).text(`${index + 1}.`, itemX, y + 14);
      strokeFieldLine(doc, itemX + 16, y + 25, 90);
    }

    doc.end();

    stream.on("finish", () => resolve());
    stream.on("error", (error) => reject(error));
  });

  const uploaded = await uploadLocalFileToCloudinary({
    filePath: absolutePath,
    fileName,
    folder: "eregistrar/workflow/forms",
    publicId: `${request.request_reference}_v${versionNumber}`,
    resourceType: "raw",
  });

  if (uploaded.usedCloudinary) {
    await removeLocalFileIfExists(absolutePath);
  }

  return {
    fileName,
    absolutePath,
    relativePath: uploaded.url || relativePath,
  };
};
