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
  const {
    targetTitles,
    skills,
    preferredLocations,
    remotePreferred,
    citizenshipNotRequired,
    workAuthorization,
  } = req.body;

  let profile = await prisma.profile.findFirst();
  if (!profile) {
    profile = await prisma.profile.create({ data: {} });
  }

  const data: Record<string, unknown> = {};
  if (targetTitles !== undefined) data.targetTitles = targetTitles;
  if (skills !== undefined) data.skills = skills;
  if (preferredLocations !== undefined)
    data.preferredLocations = preferredLocations;
  if (remotePreferred !== undefined) data.remotePreferred = remotePreferred;
  if (citizenshipNotRequired !== undefined)
    data.citizenshipNotRequired = citizenshipNotRequired;
  if (workAuthorization !== undefined)
    data.workAuthorization = workAuthorization;

  const updated = await prisma.profile.update({
    where: { id: profile.id },
    data,
  });

  res.json(updated);
});
