-- Convert yearsOfExperience to text array categories
ALTER TABLE "Profile" DROP COLUMN IF EXISTS "yearsOfExperience";
ALTER TABLE "Profile" ADD COLUMN "yearsOfExperience" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
