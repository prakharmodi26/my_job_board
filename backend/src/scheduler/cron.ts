import cron, { type ScheduledTask } from "node-cron";
import { prisma } from "../prisma.js";
import { runRecommendedPull } from "../services/recommendedRunner.js";

let currentTask: ScheduledTask | null = null;

function createCronTask(schedule: string): ScheduledTask {
  return cron.schedule(schedule, async () => {
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
}

async function loadCronSchedule(): Promise<string> {
  let settings = await prisma.settings.findFirst();
  if (!settings) {
    settings = await prisma.settings.create({ data: {} });
  }
  return settings.cronSchedule;
}

export async function startScheduler() {
  const schedule = await loadCronSchedule();
  currentTask = createCronTask(schedule);
  console.log(`[CRON] Scheduler started — recommended pull on schedule: ${schedule}`);
}

export async function restartScheduler() {
  if (currentTask) {
    currentTask.stop();
    console.log("[CRON] Stopped current cron task");
  }

  const schedule = await loadCronSchedule();
  currentTask = createCronTask(schedule);
  console.log(`[CRON] Scheduler restarted — new schedule: ${schedule}`);
}
