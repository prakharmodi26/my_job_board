-- Store experience as integer categories: 0=no experience, 2=under 3 years, 4=more than 3 years
ALTER TABLE "Profile" ALTER COLUMN "yearsOfExperience" TYPE INTEGER USING "yearsOfExperience"::INTEGER;
