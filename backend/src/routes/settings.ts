import { Router } from "express";
import { prisma } from "../prisma.js";
import { restartScheduler } from "../scheduler/cron.js";

export const settingsRouter = Router();

settingsRouter.get("/", async (_req, res) => {
  let settings = await prisma.settings.findFirst();
  if (!settings) {
    settings = await prisma.settings.create({ data: {} });
  }
  res.json(settings);
});

settingsRouter.put("/", async (req, res) => {
  let settings = await prisma.settings.findFirst();
  if (!settings) {
    settings = await prisma.settings.create({ data: {} });
  }

  const oldCronSchedule = settings.cronSchedule;

  const data: Record<string, unknown> = {};
  const fields = [
    // Scoring weights
    "weightSkillMatch",
    "weightTargetTitle",
    "weightRecencyDay1",
    "weightRecencyDay3",
    "weightRecencyWeek",
    "weightWorkModeMatch",
    "weightSeniorityMatch",
    "weightSeniorityMismatch",
    "weightSalaryOverlap",
    "weightSalaryBelow",
    "weightIndustryMatch",
    "weightEducationMeet",
    "weightEducationUnder",
    "weightCompanySize",
    "weightExpMatch",
    "weightExpMismatch",
    "weightCitizenship",
    "weightOptCptBoost",
    "minRecommendedScore",
    "weightAvoidKeyword",
    // Cron schedule
    "cronSchedule",
    "cronEnabled",
    // Search settings
    "searchNumPages",
    "recommendedNumPages",
    "recommendedDatePosted",
    "recommendedExpiryDays",
    "excludePublishers",
    // Cover letter model
    "coverLetterModel",
  ];

  for (const field of fields) {
    if (req.body[field] !== undefined) {
      data[field] = req.body[field];
    }
  }

  const updated = await prisma.settings.update({
    where: { id: settings.id },
    data,
  });

  // If cron toggles or cronSchedule changed, restart/stop scheduler
  if (
    (data.cronSchedule !== undefined && data.cronSchedule !== oldCronSchedule) ||
    data.cronEnabled !== undefined
  ) {
    await restartScheduler();
  }

  res.json(updated);
});
