import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";

type RequestItem = {
  document_name: string;
  quantity: number;
  base_price: number;
  final_price: number;
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

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const LEFT = 42;
const RIGHT = PAGE_WIDTH - 42;

const ensureDirectory = (directoryPath: string) => {
  if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath, { recursive: true });
  }
};

const upper = (value: unknown) =>
  typeof value === "string" ? value.trim().toUpperCase() : "";

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

const drawLabeledLine = (
  doc: PDFKit.PDFDocument,
  options: {
    label: string;
    value: string;
    x: number;
    y: number;
    width?: number;
    lineOffset?: number;
  }
) => {
  const { label, value, x, y, width = 420, lineOffset = 11 } = options;
  doc.font("Helvetica-Bold").fontSize(9).fillColor("#111111").text(label, x, y);
  const labelWidth = doc.widthOfString(label) + 4;
  doc.font("Helvetica").fontSize(9).text(value || " ", x + labelWidth, y, {
    width: Math.max(width - labelWidth, 40),
  });
  strokeFieldLine(doc, x + labelWidth, y + lineOffset, width - labelWidth);
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

const groupItems = (items: RequestItem[]) => {
  const grouped: Record<string, RequestItem[]> = {
    "RECORDS REQUESTED": [],
    CERTIFICATIONS: [],
    "PRINTING SERVICES": [],
  };

  for (const item of items) {
    grouped[inferDocumentGroup(item.document_name)].push(item);
  }

  return grouped;
};

const drawHeader = (doc: PDFKit.PDFDocument) => {
  doc
    .circle(78, 67, 28)
    .fillAndStroke("#1f4b8f", "#153b6f");

  doc.fillColor("#f5d062").circle(78, 58, 5).fill();
  doc.fillColor("#ffffff").rect(66, 63, 24, 16).fill();
  doc.fillColor("#b8860b").font("Helvetica-Bold").fontSize(14).text("TMC", 66, 66, {
    width: 24,
    align: "center",
  });

  doc.fillColor("#111111");
  doc.font("Times-Bold").fontSize(20).text("TRINIDAD MUNICIPAL COLLEGE", 118, 48, {
    width: 360,
    align: "center",
  });
  doc.font("Helvetica-Bold").fontSize(13).text("OFFICE OF THE REGISTRAR", 140, 74, {
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

  doc.font("Helvetica").fontSize(9).text(familyName || " ", startX + 4, y + 1, {
    width: familyWidth - 8,
    align: "center",
  });
  doc.text(firstName || " ", startX + familyWidth + 13, y + 1, {
    width: firstWidth - 8,
    align: "center",
  });
  doc.text(middleName || " ", startX + familyWidth + firstWidth + 22, y + 1, {
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
    doc
      .font("Helvetica")
      .fontSize(9)
      .text(upper(item.document_name), LEFT + 34, currentY, {
        width: 320,
      });
    doc.text(formatMoney(item.final_price || item.base_price), RIGHT - 78, currentY, {
      width: 58,
      align: "right",
    });
    currentY += 16;
  }

  return currentY + 8;
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

  await new Promise<void>((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 30, left: LEFT, right: 42, bottom: 30 },
    });

    const stream = fs.createWriteStream(absolutePath);
    doc.pipe(stream);

    const form = request.form_snapshot || {};
    const academic = request.academic_snapshot || {};
    const approval = request.approval_snapshot || {};
    const fee = request.fee_snapshot || {};
    const payment = request.payment_snapshot || {};
    const release = request.release_snapshot || {};
    const groupedItems = groupItems(request.items || []);

    const fullName =
      upper(academic.full_name) ||
      [
        upper(academic.first_name),
        upper(academic.middle_name),
        upper(academic.last_name),
        upper(academic.extension_name),
      ]
        .filter(Boolean)
        .join(" ");

    drawHeader(doc);
    doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .text("BASIC INFORMATION (PLEASE FILL UP IN CAPITAL LETTER, WRITE LEGIBLY)", LEFT + 55, 116, {
        width: 390,
        align: "center",
      });

    doc.font("Helvetica").fontSize(8).fillColor("#444444").text(
      `REFERENCE NO: ${request.request_reference}`,
      RIGHT - 130,
      96,
      { width: 120, align: "right" }
    );
    doc.fillColor("#111111");

    let y = 140;
    drawLabeledLine(doc, { label: "NAME:", value: fullName, x: LEFT + 18, y, width: 470 });
    y += 16;
    drawLabeledLine(doc, { label: "CIVIL STATUS:", value: upper(form.civil_status), x: LEFT + 18, y, width: 470 });
    y += 16;
    drawLabeledLine(doc, { label: "GENDER:", value: upper(form.gender), x: LEFT + 18, y, width: 470 });
    y += 16;
    drawLabeledLine(doc, { label: "CONTACT NUMBER:", value: upper(form.contact_number), x: LEFT + 18, y, width: 470 });
    y += 16;
    drawLabeledLine(doc, { label: "ADDRESS:", value: upper(form.address_line), x: LEFT + 18, y, width: 470 });
    y += 16;
    drawLabeledLine(doc, { label: "PUROK:", value: upper(form.purok), x: LEFT + 46, y, width: 442 });
    y += 16;
    drawLabeledLine(doc, { label: "BARANGAY:", value: upper(form.barangay), x: LEFT + 46, y, width: 442 });
    y += 16;
    drawLabeledLine(doc, { label: "MUNICIPALITY:", value: upper(form.municipality), x: LEFT + 46, y, width: 442 });
    y += 16;
    drawLabeledLine(doc, { label: "PROVINCE:", value: upper(form.province), x: LEFT + 46, y, width: 442 });
    y += 16;
    drawLabeledLine(doc, { label: "ACADEMIC YEAR:", value: upper(form.academic_year_label), x: LEFT + 18, y, width: 470 });
    y += 16;
    drawLabeledLine(doc, { label: "PLACE OF BIRTH:", value: upper(form.place_of_birth), x: LEFT + 18, y, width: 470 });
    y += 16;
    drawLabeledLine(doc, { label: "DATE OF BIRTH:", value: safeDate(form.date_of_birth), x: LEFT + 18, y, width: 470 });
    y += 16;
    drawLabeledLine(doc, { label: "GUARDIAN:", value: upper(form.guardian_name), x: LEFT + 18, y, width: 470 });
    y += 16;
    drawLabeledLine(
      doc,
      {
        label: "TYPE OF RECORD TO BE CLAIM:",
        value: request.items.map((item) => upper(item.document_name)).join(", "),
        x: LEFT + 18,
        y,
        width: 470,
      }
    );
    y += 16;
    drawLabeledLine(doc, { label: "PURPOSE:", value: upper(request.purpose), x: LEFT + 18, y, width: 470 });

    y += 32;
    drawSectionTitle(doc, "EDUCATIONAL BACK GROUND", y);
    y += 22;

    const levels = [
      { key: "primary", label: "PRIMARY:" },
      { key: "elementary", label: "ELEMENTARY" },
      { key: "junior_high_school", label: "JUNIOR HIGH SCHOOL" },
      { key: "senior_high_school", label: "SENIOR HIGH SCHOOL" },
    ];

    for (const level of levels) {
      const entry =
        request.educational_background.find((item) => item.level === level.key) || {};

      doc.font("Helvetica-Bold").fontSize(9).text(level.label, LEFT + 46, y);
      y += 14;
      drawLabeledLine(doc, { label: "NAME OF SCHOOL:", value: upper(entry.school_name), x: LEFT + 40, y, width: 445 });
      y += 16;
      drawLabeledLine(doc, { label: "ADDRESS OF SCHOOL:", value: upper(entry.school_address), x: LEFT + 40, y, width: 445 });
      y += 16;
      drawLabeledLine(doc, { label: "YEAR GRADUATED:", value: upper(entry.year_graduated), x: LEFT + 40, y, width: 445 });
      y += 22;
    }

    doc.addPage();
    drawHeader(doc);
    doc.font("Helvetica-Bold").fontSize(15).text("REQUEST FORM", 0, 104, {
      width: PAGE_WIDTH,
      align: "center",
    });

    y = 135;
    drawNameColumns(doc, {
      familyName: upper(academic.last_name),
      firstName: upper(academic.first_name),
      middleName: upper(academic.middle_name),
      y,
    });

    y += 36;
    drawLabeledLine(doc, {
      label: "Course Graduated:",
      value: upper(academic.course_name || form.course_text),
      x: LEFT + 18,
      y,
      width: 300,
    });
    drawLabeledLine(doc, {
      label: "Academic Year:",
      value: upper(form.academic_year_label),
      x: LEFT + 330,
      y,
      width: 170,
    });

    y += 16;
    drawLabeledLine(doc, {
      label: "Last Semester Attended if Undergraduate:",
      value: upper(form.last_semester_attended),
      x: LEFT + 18,
      y,
      width: 300,
    });
    drawLabeledLine(doc, {
      label: "Academic Year:",
      value: upper(form.academic_year_label),
      x: LEFT + 330,
      y,
      width: 170,
    });

    y += 26;
    doc.font("Helvetica-Bold").fontSize(9).text("Please Checked type of Records Requested:", LEFT + 18, y);
    y += 18;

    y = drawDocumentSection(doc, "RECORDS REQUESTED", groupedItems["RECORDS REQUESTED"], y);
    y = drawDocumentSection(doc, "CERTIFICATIONS", groupedItems.CERTIFICATIONS, y);
    y = drawDocumentSection(doc, "PRINTING SERVICES", groupedItems["PRINTING SERVICES"], y);

    y += 10;
    doc.font("Helvetica-Bold").fontSize(9).text("Approved by:", LEFT + 18, y);
    y += 18;

    drawLabeledLine(doc, {
      label: "Treasurer:",
      value: upper(payment.confirmed_by_name || payment.official_receipt_no),
      x: LEFT + 18,
      y,
      width: 150,
    });
    drawLabeledLine(doc, {
      label: "College Department Head:",
      value: upper(approval.dean_name),
      x: LEFT + 175,
      y,
      width: 180,
    });
    drawLabeledLine(doc, {
      label: "Registrar:",
      value: upper(approval.registrar_name),
      x: LEFT + 360,
      y,
      width: 135,
    });

    y += 20;
    drawLabeledLine(doc, {
      label: "College Administrator:",
      value: upper(approval.college_admin_name),
      x: LEFT + 135,
      y,
      width: 260,
    });

    y += 22;
    drawLabeledLine(doc, {
      label: "Purpose:",
      value: upper(request.purpose),
      x: LEFT + 18,
      y,
      width: 210,
    });
    drawLabeledLine(doc, {
      label: "Date of Released:",
      value: safeDate(release.date_released),
      x: LEFT + 245,
      y,
      width: 240,
    });

    y += 28;
    strokeFieldLine(doc, LEFT + 18, y, 465);
    y += 14;
    doc.font("Helvetica-Bold").fontSize(10).text("CLAIM SLIP", 0, y, {
      width: PAGE_WIDTH,
      align: "center",
    });

    y += 20;
    drawLabeledLine(doc, {
      label: "Name:",
      value: fullName,
      x: LEFT + 18,
      y,
      width: 180,
    });
    drawLabeledLine(doc, {
      label: "Course:",
      value: upper(academic.course_name || form.course_text),
      x: LEFT + 205,
      y,
      width: 190,
    });
    drawLabeledLine(doc, {
      label: "ID No.:",
      value: upper(academic.student_number),
      x: LEFT + 402,
      y,
      width: 85,
    });

    y += 18;
    drawLabeledLine(doc, {
      label: "Type of Record to be Claim:",
      value: request.items.map((item) => upper(item.document_name)).join(", "),
      x: LEFT + 18,
      y,
      width: 470,
    });

    y += 18;
    drawLabeledLine(doc, {
      label: "Request by:",
      value: fullName,
      x: LEFT + 18,
      y,
      width: 205,
    });
    drawLabeledLine(doc, {
      label: "Date:",
      value: safeDate(request.submitted_at),
      x: LEFT + 232,
      y,
      width: 105,
    });
    drawLabeledLine(doc, {
      label: "Expected Date of Released:",
      value: safeDate(release.expected_release_date),
      x: LEFT + 344,
      y,
      width: 145,
    });

    y += 18;
    doc.font("Helvetica-Bold").fontSize(9).text("Requirements to bring:", LEFT + 18, y);
    for (let index = 0; index < 4; index += 1) {
      const itemX = LEFT + 18 + index * 115;
      doc.font("Helvetica").fontSize(9).text(`${index + 1}.`, itemX, y + 14);
      strokeFieldLine(doc, itemX + 16, y + 25, 90);
    }

    y += 38;
    doc.font("Helvetica").fontSize(8).fillColor("#444444").text(
      `SYSTEM STATUS: ${upper(request.current_status)}    PAYMENT: ${upper(
        payment.payment_status || "PENDING"
      )}    FINAL FEE: ${formatMoney(fee.final_fee ?? fee.assessed_fee)}`,
      LEFT + 18,
      y,
      { width: 470, align: "left" }
    );

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
