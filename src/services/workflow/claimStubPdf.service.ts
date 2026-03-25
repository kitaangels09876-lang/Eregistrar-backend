import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";

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

const ensureDirectory = (directoryPath: string) => {
  if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath, { recursive: true });
  }
};

const upper = (value: unknown) =>
  typeof value === "string" ? value.trim().toUpperCase() : "";

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
  width = 460
) => {
  doc.font("Helvetica-Bold").fontSize(9).text(label, x, y);
  const labelWidth = doc.widthOfString(label) + 6;
  doc.font("Helvetica").text(value || " ", x + labelWidth, y, {
    width: Math.max(width - labelWidth, 40),
  });
  doc
    .moveTo(x + labelWidth, y + 12)
    .lineTo(x + width, y + 12)
    .lineWidth(0.6)
    .strokeColor("#444444")
    .stroke();
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

    doc.circle(78, 67, 28).fillAndStroke("#1f4b8f", "#153b6f");
    doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(14).text("TMC", 64, 62, {
      width: 28,
      align: "center",
    });
    doc.fillColor("#111111");
    doc.font("Times-Bold").fontSize(20).text("TRINIDAD MUNICIPAL COLLEGE", 110, 48, {
      width: 370,
      align: "center",
    });
    doc.font("Helvetica-Bold").fontSize(13).text("OFFICE OF THE REGISTRAR", 138, 74, {
      width: 320,
      align: "center",
    });

    doc.font("Helvetica-Bold").fontSize(16).text("CLAIM STUB / CLAIM RECEIPT", 0, 118, {
      width: 595,
      align: "center",
    });

    let y = 160;
    line(doc, "CLAIM STUB NO.:", request.claim_stub_number, 48, y);
    y += 18;
    line(doc, "REQUEST REFERENCE NO.:", request.request_reference, 48, y);
    y += 18;
    line(doc, "STUDENT / ALUMNI NAME:", fullName, 48, y);
    y += 18;
    line(doc, "STUDENT ID NO.:", upper(academic.student_number), 48, y);
    y += 18;
    line(doc, "COURSE / PROGRAM:", upper(academic.course_name), 48, y);
    y += 18;
    line(doc, "DOCUMENT REQUESTED:", request.items.map((item) => upper(item.document_name)).join(", "), 48, y);
    y += 18;
    line(doc, "PURPOSE:", upper(request.purpose), 48, y);
    y += 18;
    line(doc, "REQUEST DATE:", safeDateTime(request.submitted_at), 48, y);
    y += 18;
    line(doc, "READY FOR RELEASE DATE:", safeDateTime(release.expected_release_date || release.date_released), 48, y);
    y += 18;
    line(doc, "RELEASE METHOD:", upper(release.release_method || "PICKUP"), 48, y);
    y += 18;
    line(doc, "CLAIM LOCATION:", "OFFICE OF THE REGISTRAR", 48, y);

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
    line(doc, "CLAIM STUB NO.:", request.claim_stub_number, 240, y + 32, 250);
    line(doc, "REFERENCE NO.:", request.request_reference, 240, y + 52, 250);
    line(doc, "CURRENT STATUS:", upper(request.current_status), 240, y + 72, 250);
    line(doc, "LOOKUP TOKEN:", request.lookup_token, 240, y + 92, 250);
    line(doc, "ISSUED BY:", "EREGISTRAR SYSTEM", 240, y + 112, 250);
    line(doc, "GENERATED AT:", safeDateTime(new Date().toISOString()), 240, y + 132, 250);

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
