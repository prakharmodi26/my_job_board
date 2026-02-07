import type { Job, Profile } from "@prisma/client";

const CITIZENSHIP_PATTERNS = [
  /\bus\s*citizen/i,
  /\bunited\s*states\s*citizen/i,
  /\bgreen\s*card/i,
  /\bsecurity\s*clearance/i,
  /\bclearance\s*required/i,
  /\bmust\s*be\s*(legally\s*)?authorized\s*to\s*work/i,
  /\bwithout\s*sponsorship/i,
  /\bno\s*visa\s*sponsor/i,
  /\bpermanent\s*resident/i,
  /\bUS\s*Person/i,
];

export function scoreJob(job: Job, profile: Profile): number {
  let score = 0;
  const searchText = `${job.title} ${job.description}`.toLowerCase();

  // Keyword matching: profile skills + target titles
  const keywords = [...profile.skills, ...profile.targetTitles];
  for (const kw of keywords) {
    const kwLower = kw.toLowerCase();
    // Count occurrences (capped at 3 per keyword)
    const regex = new RegExp(kwLower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    const matches = searchText.match(regex);
    const count = Math.min(matches?.length ?? 0, 3);
    score += count * 10;
  }

  // Recency boost: up to 30 points for jobs posted in the last 7 days
  if (job.postedAt) {
    const ageMs = Date.now() - new Date(job.postedAt).getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    if (ageDays <= 1) score += 30;
    else if (ageDays <= 3) score += 20;
    else if (ageDays <= 7) score += 10;
  }

  // Remote bonus if user prefers remote
  if (profile.remotePreferred && job.isRemote) {
    score += 15;
  }

  // Citizenship penalty
  if (profile.citizenshipNotRequired) {
    const fullText = `${job.title} ${job.description}`;
    if (CITIZENSHIP_PATTERNS.some((p) => p.test(fullText))) {
      score -= 50;
    }
  }

  return Math.max(score, 0);
}
