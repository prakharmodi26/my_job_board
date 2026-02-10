-- Update defaults for search/recommended pages per query
ALTER TABLE "Settings" ALTER COLUMN "searchNumPages" SET DEFAULT 3;
ALTER TABLE "Settings" ALTER COLUMN "recommendedNumPages" SET DEFAULT 1;
