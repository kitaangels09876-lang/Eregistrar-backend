import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import {
  uploadLocalFileToCloudinary,
} from "./cloudinaryStorage";

const formatPHP = (value: any) => {
  const amount = Number(value);
  if (isNaN(amount)) return "PHP 0.00";

  return `PHP ${amount
    .toFixed(2)
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
};

export const generateReceiptPDF = async (data: {
  receipt: any;
  school: any;
  student: any;
  issuer?: {
    full_name?: string;
    role_name?: string;
  };
  items: any[];
}) => {
  const fileName = `receipt-${data.receipt.receipt_reference}.pdf`;
  const filePath = path.join("uploads/receipts", fileName);

  fs.mkdirSync("uploads/receipts", { recursive: true });

  const doc = new PDFDocument({ margin: 40 });
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  /* ================= HEADER ================= */
  doc.fontSize(14).text(data.school.school_name, { align: "center" });
  doc.fontSize(9).text(data.school.school_address, { align: "center" });
  doc.text(
    `Email: ${data.school.school_email} | Tel: ${data.school.school_contact_number}`,
    { align: "center" }
  );

  doc.moveDown(1.5);
  doc.fontSize(16).text("OFFICIAL RECEIPT", { align: "center" });
  doc.moveDown();

  /* ================= META ================= */
  doc.fontSize(10);
  doc.text(`OR No: ${data.receipt.receipt_reference}`);
  doc.text(`Date Issued: ${data.receipt.issued_at}`);
  doc.text(
    `Issued By: ${data.issuer?.full_name ?? "System"} (${(
      data.issuer?.role_name ?? "ADMIN"
    ).toUpperCase()})`
  );
  doc.moveDown();

  /* ================= STUDENT ================= */
  doc.text(`Student Name : ${data.student.full_name}`);
  doc.text(`Student No   : ${data.student.student_number}`);
  doc.text(`Course       : ${data.student.course_name || "N/A"}`);
  doc.moveDown();

  /* ================= ITEMS ================= */
  doc.fontSize(11).text("PARTICULARS");
  doc.moveDown(0.5);

  data.items.forEach((item, index) => {
    doc.fontSize(10).text(
      `${index + 1}. ${item.document_name} (x${item.quantity}) — ${formatPHP(
        item.total_amount
      )} [${item.request_status.toUpperCase()}]`
    );
  });

  doc.moveDown();

  /* ================= TOTALS ================= */
  doc.fontSize(10);
  doc.text(`Total Paid        : ${formatPHP(data.receipt.total_paid)}`);
  doc.text(`Completed Amount  : ${formatPHP(data.receipt.completed_amount)}`);
  doc.text(`Rejected Amount   : ${formatPHP(data.receipt.rejected_amount)}`);
  doc.text(`Refundable Amount : ${formatPHP(data.receipt.refundable_amount)}`);

  doc.moveDown(2);

  /* ================= FOOTER ================= */
  doc
    .fontSize(9)
    .text(
      "This is a system-generated official receipt.\nAll transactions are recorded and auditable.",
      { align: "center" }
    );

  doc.end();

  await new Promise<void>((resolve, reject) => {
    stream.on("finish", resolve);
    stream.on("error", reject);
  });

  await uploadLocalFileToCloudinary({
    filePath,
    fileName,
    mimeType: "application/pdf",
    folder: "eregistrar/receipts",
    publicId: data.receipt.receipt_reference,
    resourceType: "image",
  });

  return `/${filePath.replace(/\\/g, "/")}`;
};
