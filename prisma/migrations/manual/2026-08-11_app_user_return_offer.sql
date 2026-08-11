-- Team Tracker: intern return-offer tracking on AppUser.
-- Drives the "Incoming Conversions" stream in the Headcount Planner: interns
-- with a Given/Accepted offer project as returning (Intern → FT or Intern →
-- Intern) without being double-counted while still active.  Run in Supabase
-- SQL editor.

DO $$ BEGIN
  CREATE TYPE "ReturnOfferStatus" AS ENUM ('NONE', 'GIVEN', 'ACCEPTED', 'DECLINED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "ReturnOfferType" AS ENUM ('FULL_TIME', 'INTERNSHIP');
EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE "AppUser"
  ADD COLUMN IF NOT EXISTS "returnOfferStatus" "ReturnOfferStatus" NOT NULL DEFAULT 'NONE',
  ADD COLUMN IF NOT EXISTS "returnOfferType" "ReturnOfferType",
  ADD COLUMN IF NOT EXISTS "returnStartDate" TIMESTAMP(3);
