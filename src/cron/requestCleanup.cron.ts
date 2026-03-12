import cron from "node-cron";
import {
  softCleanupExpiredRequests,
  hardCleanupArchivedRequests
} from "../services/requestCleanup.service";

/* =========================================================
   SOFT CLEANUP — DAILY (2:00 AM)
========================================================= */
cron.schedule(
  "0 2 * * *",
  async () => {
    try {
      console.log("[CRON] Running SOFT cleanup...");
      const count = await softCleanupExpiredRequests();
      console.log(`[CRON] Soft cleanup archived: ${count}`);
    } catch (error) {
      console.error("[CRON] Soft cleanup failed:", error);
    }
  },
  {
    timezone: "Asia/Manila",
  }
);

/* =========================================================
   HARD CLEANUP — WEEKLY (SUNDAY 3:00 AM)
========================================================= */
cron.schedule(
  "0 3 * * 0",
  async () => {
    try {
      console.log("[CRON] Running HARD cleanup...");
      const count = await hardCleanupArchivedRequests();
      console.log(`[CRON] Hard cleanup deleted: ${count}`);
    } catch (error) {
      console.error("[CRON] Hard cleanup failed:", error);
    }
  },
  {
    timezone: "Asia/Manila",
  }
);
