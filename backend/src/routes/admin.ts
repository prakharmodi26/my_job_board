import { Router } from "express";
import { runRecommendedPull } from "../services/recommendedRunner.js";

export const adminRouter = Router();

adminRouter.post("/run-recommended", async (_req, res) => {
  try {
    const run = await runRecommendedPull();
    res.json({
      success: true,
      runId: run.id,
      totalFetched: run.totalFetched,
      newJobs: run.newJobs,
      duplicates: run.duplicates,
    });
  } catch (err) {
    res
      .status(500)
      .json({ error: err instanceof Error ? err.message : String(err) });
  }
});
