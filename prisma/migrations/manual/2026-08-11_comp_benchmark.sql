-- Comp Predictor: market benchmark bands.
-- Admins enter p25/p50/p75 salary (and optional equity) for a role/level/team/
-- location, and the predictor places a proposed number against the band. Run in
-- the Supabase SQL editor. Idempotent — safe to re-run.

CREATE TABLE IF NOT EXISTS "CompBenchmark" (
  "id"             TEXT NOT NULL,
  "role"           TEXT NOT NULL,
  "level"          TEXT,
  "team"           TEXT,
  "location"       TEXT,
  "employmentType" TEXT,
  "currency"       TEXT NOT NULL DEFAULT 'USD',
  "salaryP25"      DOUBLE PRECISION NOT NULL,
  "salaryP50"      DOUBLE PRECISION NOT NULL,
  "salaryP75"      DOUBLE PRECISION NOT NULL,
  "equityP50"      DOUBLE PRECISION,
  "source"         TEXT,
  "notes"          TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CompBenchmark_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CompBenchmark_role_idx" ON "CompBenchmark" ("role");
CREATE INDEX IF NOT EXISTS "CompBenchmark_team_idx" ON "CompBenchmark" ("team");
