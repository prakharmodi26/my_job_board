-- Step 1a: Rename User.email to User.username
ALTER TABLE "User" RENAME COLUMN "email" TO "username";
ALTER INDEX "User_email_key" RENAME TO "User_username_key";

-- Step 1b: Drop deprecated Profile columns
ALTER TABLE "Profile" DROP COLUMN IF EXISTS "primarySkills";
ALTER TABLE "Profile" DROP COLUMN IF EXISTS "secondarySkills";
ALTER TABLE "Profile" DROP COLUMN IF EXISTS "workAuthorization";
ALTER TABLE "Profile" DROP COLUMN IF EXISTS "locationRadius";
ALTER TABLE "Profile" DROP COLUMN IF EXISTS "timezonePreference";
ALTER TABLE "Profile" DROP COLUMN IF EXISTS "searchNumPages";
ALTER TABLE "Profile" DROP COLUMN IF EXISTS "recommendedNumPages";
ALTER TABLE "Profile" DROP COLUMN IF EXISTS "recommendedDatePosted";
ALTER TABLE "Profile" DROP COLUMN IF EXISTS "excludePublishers";

-- Step 1c: Create Settings table
CREATE TABLE "Settings" (
    "id" SERIAL NOT NULL,
    "weightSkillMatch" INTEGER NOT NULL DEFAULT 10,
    "weightTargetTitle" INTEGER NOT NULL DEFAULT 10,
    "weightRecencyDay1" INTEGER NOT NULL DEFAULT 30,
    "weightRecencyDay3" INTEGER NOT NULL DEFAULT 20,
    "weightRecencyWeek" INTEGER NOT NULL DEFAULT 10,
    "weightRemoteMatch" INTEGER NOT NULL DEFAULT 15,
    "coverLetterModel" TEXT NOT NULL DEFAULT 'vt-arc',
    "weightWorkModeMatch" INTEGER NOT NULL DEFAULT 10,
    "weightOnsiteMatch" INTEGER NOT NULL DEFAULT 5,
    "weightSeniorityMatch" INTEGER NOT NULL DEFAULT 20,
    "weightSeniorityMismatch" INTEGER NOT NULL DEFAULT -15,
    "weightSalaryOverlap" INTEGER NOT NULL DEFAULT 15,
    "weightSalaryBelow" INTEGER NOT NULL DEFAULT -20,
    "weightIndustryMatch" INTEGER NOT NULL DEFAULT 10,
    "weightEducationMeet" INTEGER NOT NULL DEFAULT 5,
    "weightEducationUnder" INTEGER NOT NULL DEFAULT -10,
    "weightCompanySize" INTEGER NOT NULL DEFAULT 10,
    "weightExpMeet" INTEGER NOT NULL DEFAULT 10,
    "weightExpClose" INTEGER NOT NULL DEFAULT 5,
    "weightExpUnder" INTEGER NOT NULL DEFAULT -15,
    "weightCitizenship" INTEGER NOT NULL DEFAULT -50,
    "weightOptCptBoost" INTEGER NOT NULL DEFAULT 20,
    "cronSchedule" TEXT NOT NULL DEFAULT '0 */12 * * *',
    "searchNumPages" INTEGER NOT NULL DEFAULT 5,
    "recommendedNumPages" INTEGER NOT NULL DEFAULT 3,
    "recommendedDatePosted" TEXT NOT NULL DEFAULT 'week',
    "excludePublishers" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- Seed a default Settings row
INSERT INTO "Settings" ("updatedAt") VALUES (NOW());
