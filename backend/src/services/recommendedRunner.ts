import { prisma } from "../prisma.js";
import { searchJobs } from "./jsearch.js";
import { upsertJob } from "./jobUpsert.js";
import { scoreJob } from "./scoring.js";

export async function runRecommendedPull() {
  const profile = await prisma.profile.findFirst();
  if (!profile || profile.targetTitles.length === 0) {
    throw new Error("Profile not configured — set target titles first");
  }

  const run = await prisma.recommendedRun.create({
    data: {
      status: "running",
      paramsJson: JSON.stringify({
        targetTitles: profile.targetTitles,
        locations: profile.preferredLocations,
        remote: profile.remotePreferred,
      }),
    },
  });

  let totalFetched = 0;
  let newJobs = 0;
  let duplicates = 0;
  const jobIdsThisRun: number[] = [];

  try {
    // Build queries: one per title, combined with each location
    const queries: { query: string; work_from_home?: boolean }[] = [];
    for (const title of profile.targetTitles) {
      if (profile.preferredLocations.length > 0) {
        for (const loc of profile.preferredLocations) {
          queries.push({ query: `${title} in ${loc}` });
        }
      } else {
        queries.push({ query: title });
      }
      // Also add a remote query if preferred
      if (profile.remotePreferred) {
        queries.push({ query: `${title} remote`, work_from_home: true });
      }
    }

    for (const q of queries) {
      try {
        const response = await searchJobs({
          query: q.query,
          num_pages: 1,
          date_posted: "week",
          work_from_home: q.work_from_home,
        });

        for (const apiJob of response.data) {
          totalFetched++;
          const result = await upsertJob(apiJob);
          if (result.isNew) {
            newJobs++;
          } else {
            duplicates++;
          }
          if (!jobIdsThisRun.includes(result.jobId)) {
            jobIdsThisRun.push(result.jobId);
          }
        }
      } catch (err) {
        console.error(`[RecommendedPull] Query "${q.query}" failed:`, err);
        // Continue with other queries
      }
    }

    // Score all discovered jobs
    const jobs = await prisma.job.findMany({
      where: { id: { in: jobIdsThisRun } },
    });

    const scored = jobs.map((job) => ({
      jobId: job.id,
      score: scoreJob(job, profile),
    }));

    // Sort by score descending, assign ranks
    scored.sort((a, b) => b.score - a.score);

    // Create RecommendedMatch records
    if (scored.length > 0) {
      await prisma.recommendedMatch.createMany({
        data: scored.map((s, idx) => ({
          runId: run.id,
          jobId: s.jobId,
          score: s.score,
          rank: idx + 1,
        })),
        skipDuplicates: true,
      });
    }

    // Finalize the run
    const completedRun = await prisma.recommendedRun.update({
      where: { id: run.id },
      data: {
        totalFetched,
        newJobs,
        duplicates,
        status: "completed",
      },
    });

    return completedRun;
  } catch (err) {
    await prisma.recommendedRun.update({
      where: { id: run.id },
      data: { status: "failed", errorMessage: String(err) },
    });
    throw err;
  }
}
