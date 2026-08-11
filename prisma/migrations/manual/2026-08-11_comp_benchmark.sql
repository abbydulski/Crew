-- Comp Predictor: market benchmark data points.
-- Each row is one company's salary for a role at a given years-of-experience.
-- The predictor aggregates points per role to place a proposed salary against
-- the market. Run in the Supabase SQL editor.
--
-- NOTE: this DROPs the table first — safe because it holds only test data so
-- far. Re-run any time to reset to the current shape.

DROP TABLE IF EXISTS "CompBenchmark";

CREATE TABLE "CompBenchmark" (
  "id"              TEXT NOT NULL,
  "role"            TEXT NOT NULL,
  "yearsExperience" DOUBLE PRECISION,
  "company"         TEXT,
  "team"            TEXT,
  "location"        TEXT,
  "employmentType"  TEXT,
  "currency"        TEXT NOT NULL DEFAULT 'USD',
  "salary"          DOUBLE PRECISION NOT NULL,
  "equity"          DOUBLE PRECISION,
  "notes"           TEXT,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CompBenchmark_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CompBenchmark_role_idx" ON "CompBenchmark" ("role");
CREATE INDEX "CompBenchmark_team_idx" ON "CompBenchmark" ("team");
