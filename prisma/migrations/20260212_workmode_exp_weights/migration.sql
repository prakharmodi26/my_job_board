-- Add new experience weights and cron toggle, remove unused work mode weights
ALTER TABLE "Settings"
  ADD COLUMN IF NOT EXISTS "weightExpMatch" INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS "weightExpMismatch" INTEGER NOT NULL DEFAULT -15,
  ADD COLUMN IF NOT EXISTS "cronEnabled" BOOLEAN NOT NULL DEFAULT true;

-- Keep old columns for safety but they are unused:
-- weightRemoteMatch, weightOnsiteMatch, weightExpMeet, weightExpClose, weightExpUnder remain.
