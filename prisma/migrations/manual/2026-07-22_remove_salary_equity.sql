-- Remove SALARY_CHANGE from CheckinType enum + add plannedConversionDate.
-- Salary/equity columns are kept on AppUser + Candidate (used in Recruiting);
-- they are simply not surfaced in the Team Tracker UI.
-- Run in Supabase SQL editor.

-- 1. Convert any existing SALARY_CHANGE check-ins to NOTE so we can drop the enum value.
UPDATE "Checkin" SET "type" = 'NOTE' WHERE "type" = 'SALARY_CHANGE';

-- 2. Rebuild the CheckinType enum without SALARY_CHANGE.
ALTER TYPE "CheckinType" RENAME TO "CheckinType_old";
CREATE TYPE "CheckinType" AS ENUM ('CHECK_IN', 'PROMOTION', 'NOTE');
ALTER TABLE "Checkin"
  ALTER COLUMN "type" DROP DEFAULT,
  ALTER COLUMN "type" TYPE "CheckinType" USING "type"::text::"CheckinType",
  ALTER COLUMN "type" SET DEFAULT 'CHECK_IN';
DROP TYPE "CheckinType_old";

-- 3. Add plannedConversionDate for intern conversion scheduling.
ALTER TABLE "AppUser" ADD COLUMN IF NOT EXISTS "plannedConversionDate" TIMESTAMPTZ;
