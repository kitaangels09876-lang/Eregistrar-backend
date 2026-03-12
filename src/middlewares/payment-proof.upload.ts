import multer from "multer";
import path from "path";
import fs from "fs";

const uploadDir = "uploads/payments";

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const { paymentId } = req.params;

    const uniqueName = `payment_${paymentId}_${Date.now()}${ext}`;
    cb(null, uniqueName);
  },
});

const uploadPayment = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png"];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Only JPG, PNG"));
    }
    cb(null, true);
  },
});

export default uploadPayment;
