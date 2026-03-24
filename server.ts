import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { sequelize } from "./src/models";
import { errorHandler } from "./src/middlewares/error.middleware";

import authRoutes from "./src/routes/auth.routes";
import dashboardRoutes from "./src/routes/dashboard.routes";
import activityLogRoutes from "./src/routes/auditlog.routes";
import studentRequestRoutes from "./src/routes/studentrequest.routes";
import requestStatusRoutes from "./src/routes/requestStatus.routes";
import paymentRoutes from "./src/routes/payment.routes";
import announcementRoutes from "./src/routes/announcement.routes";
import documentRoutes from "./src/routes/document.routes";
import paymentMethod from "./src/routes/paymentMethod.routes";
import studentRoutes from "./src/routes/student.routes";
import adminRoutes from "./src/routes/admin.routes";
import roleRoutes from "./src/routes/role.routes";
import systemSettingsRoutes from "./src/routes/systemSettings.routes";
import documentRequestRoutes from "./src/routes/document-request.routes";
import courseRoutes from "./src/routes/course.routes";
import noticationRoutes from "./src/routes/notification.routes";
import workflowRequestRoutes from "./src/routes/workflow/requestWorkflow.routes";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["Authorization"],
  })
);

app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"))
);


// Health check
app.get("/", (_req, res) => {
  res.json({
    status: "success",
    message: "eRegistrar API running",
    timestamp: new Date().toISOString(),
  });
});

// AUTH
app.use("/api/auth", authRoutes);

// STUDENT ROUTES
app.use("/api", studentRoutes);
app.use("/api", studentRequestRoutes);
app.use("/api/student", documentRequestRoutes);

// NOTIFICATION ROUTES
app.use("/api", noticationRoutes);

// ADMIN / REGISTRAR ROUTES
app.use("/api", dashboardRoutes);
app.use("/api", activityLogRoutes);
app.use("/api", requestStatusRoutes);
app.use("/api", paymentRoutes);
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

sequelize
  .authenticate()
  .then(() => {
    console.log("✅ Database connected successfully");

    app.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(
        `🔗 Frontend: ${process.env.FRONTEND_URL || "http://localhost:3000"}`
      );
    });
  })
  .catch((err) => {
    console.error("❌ Database connection failed:", err);
    process.exit(1);
  });

export default app;
