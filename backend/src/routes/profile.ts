import { Router } from "express";
import { prisma } from "../prisma.js";

export const profileRouter = Router();

profileRouter.get("/", async (_req, res) => {
  let profile = await prisma.profile.findFirst();
  if (!profile) {
    profile = await prisma.profile.create({ data: {} });
  }
  res.json(profile);
});

profileRouter.put("/", async (req, res) => {
  let profile = await prisma.profile.findFirst();
  if (!profile) {
    profile = await prisma.profile.create({ data: {} });
  }

  const arraysToCheck: { field: string; values: unknown[] }[] = [
    { field: "targetTitles", values: req.body.targetTitles || [] },
    { field: "skills", values: req.body.skills || [] },
    { field: "preferredLocations", values: req.body.preferredLocations || [] },
  ];

  for (const item of arraysToCheck) {
    if (Array.isArray(item.values) && item.values.length > 5) {
      res
        .status(400)
        .json({ error: `Max 5 entries allowed for ${item.field}` });
      return;
    }
  }

  const data: Record<string, unknown> = {};
  const fields = [
    // Core targeting
    "targetTitles", "skills", "preferredLocations",
    "remotePreferred", "citizenshipNotRequired",
    // Role preferences
    "seniority", "yearsOfExperience", "roleTypes", "workModePreference",
    // Compensation
    "minSalary", "maxSalary",
    // Education
    "education", "degrees",
    // Industry & company
    "industries", "companySizePreference", "companyTypes",
    // Avoid keywords
    "avoidKeywords",
    // Cover letter profile
    "userMd",
  ];

  for (const field of fields) {
    if (req.body[field] !== undefined) {
      data[field] = req.body[field];
    }
  }

  const updated = await prisma.profile.update({
    where: { id: profile.id },
    data,
  });

  res.json(updated);
});
