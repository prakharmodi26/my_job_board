import cron from "node-cron";
import { runRecommendedPull } from "../services/recommendedRunner.js";

export function startScheduler() {
  // Run every 4 hours: at minute 0 of hours 0, 4, 8, 12, 16, 20
  cron.schedule("0 */4 * * *", async () => {
    console.log("[CRON] Starting recommended pull...");
    try {
      const run = await runRecommendedPull();
      console.log(
        `[CRON] Completed. Fetched: ${run.totalFetched}, New: ${run.newJobs}, Dupes: ${run.duplicates}`
      );
    } catch (error) {
      console.error("[CRON] Recommended pull failed:", error);
    }
  });

  console.log("[CRON] Scheduler started — recommended pull every 4 hours");
}
