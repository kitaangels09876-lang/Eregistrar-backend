import express from "express";
import cors, { CorsOptions } from "cors";
import dotenv from "dotenv";
import path from "path";
import { sequelize } from "./src/models";
import { errorHandler } from "./src/middlewares/error.middleware";

import authRoutes from "./src/routes/auth.routes";
import activityLogRoutes from "./src/routes/auditlog.routes";
import announcementRoutes from "./src/routes/announcement.routes";
import documentRoutes from "./src/routes/document.routes";
import paymentMethod from "./src/routes/paymentMethod.routes";
import studentRoutes from "./src/routes/student.routes";
import adminRoutes from "./src/routes/admin.routes";
import roleRoutes from "./src/routes/role.routes";
import systemSettingsRoutes from "./src/routes/systemSettings.routes";
import courseRoutes from "./src/routes/course.routes";
import noticationRoutes from "./src/routes/notification.routes";
import workflowRequestRoutes from "./src/routes/workflow/requestWorkflow.routes";
import { ensureDefaultDocumentTypes } from "./src/services/defaultDocumentSeed.service";
import { logMailStartupDebug } from "./src/services/mail.service";

dotenv.config({ quiet: true });

const app = express();
const PORT = process.env.PORT || 5000;

const normalizeOrigin = (value: string) => value.trim().replace(/\/$/, "");
const defaultAllowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "https://eregistrar-frontend.vercel.app",
];

const getAllowedOrigins = () => {
  const configuredOrigins = [
    process.env.FRONTEND_URL,
    process.env.CORS_ORIGINS,
  ]
    .filter((value): value is string => Boolean(value?.trim()))
    .flatMap((value) => value.split(","))
    .map(normalizeOrigin)
    .filter(Boolean);

  return Array.from(
    new Set([
      ...defaultAllowedOrigins,
      ...configuredOrigins,
    ])
  );
};

const allowedOrigins = getAllowedOrigins();
const corsOptions: CorsOptions = {
  origin(origin, callback) {
    if (!origin) {
      callback(null, true);
      return;
    }

    const normalizedOrigin = normalizeOrigin(origin);
    if (allowedOrigins.includes(normalizedOrigin)) {
      callback(null, true);
      return;
    }

    console.warn(`CORS blocked origin: ${origin}`);
    callback(null, false);
  },
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  exposedHeaders: ["Authorization"],
  credentials: true,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/", (_req, res) => {
  res.json({
    status: "success",
    message: "eRegistrar API running",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/auth", authRoutes);
app.use("/api", studentRoutes);
app.use("/api", noticationRoutes);
app.use("/api", activityLogRoutes);
app.use("/api", announcementRoutes);
app.use("/api", documentRoutes);
app.use("/api", paymentMethod);
app.use("/api", adminRoutes);
app.use("/api", roleRoutes);
app.use("/api", systemSettingsRoutes);
app.use("/api", courseRoutes);
app.use("/api", workflowRequestRoutes);

app.use(errorHandler);

app.use((_req, res) => {
  res.status(404).json({
    status: "error",
    message: "Route not found",
  });
});

const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log("Database connected successfully");

    await ensureDefaultDocumentTypes();
    console.log("Default document types ensured");

    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`Allowed CORS origins: ${allowedOrigins.join(", ")}`);
      logMailStartupDebug();
    });
  } catch (error) {
    console.error("Application startup failed:", error);
    process.exit(1);
  }
};

void startServer();

export default app;
