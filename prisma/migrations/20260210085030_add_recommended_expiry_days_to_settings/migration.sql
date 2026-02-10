/*
  Warnings:

  - You are about to drop the column `excludePublishers` on the `Profile` table. All the data in the column will be lost.
  - You are about to drop the column `locationRadius` on the `Profile` table. All the data in the column will be lost.
  - You are about to drop the column `primarySkills` on the `Profile` table. All the data in the column will be lost.
  - You are about to drop the column `recommendedDatePosted` on the `Profile` table. All the data in the column will be lost.
  - You are about to drop the column `recommendedNumPages` on the `Profile` table. All the data in the column will be lost.
  - You are about to drop the column `searchNumPages` on the `Profile` table. All the data in the column will be lost.
  - You are about to drop the column `secondarySkills` on the `Profile` table. All the data in the column will be lost.
  - You are about to drop the column `timezonePreference` on the `Profile` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Profile" DROP COLUMN "excludePublishers",
DROP COLUMN "locationRadius",
DROP COLUMN "primarySkills",
DROP COLUMN "recommendedDatePosted",
DROP COLUMN "recommendedNumPages",
DROP COLUMN "searchNumPages",
DROP COLUMN "secondarySkills",
DROP COLUMN "timezonePreference";

-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "recommendedExpiryDays" INTEGER NOT NULL DEFAULT 5;
