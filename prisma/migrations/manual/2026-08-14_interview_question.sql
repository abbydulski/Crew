-- Interview Question Bank: technical interview questions organized by team.
-- Hardware questions can be tagged Mechanical/Electrical/Embedded (tags[]).
-- Idempotent — safe to re-run.

CREATE TABLE IF NOT EXISTS "InterviewQuestion" (
  "id"            TEXT NOT NULL,
  "team"          TEXT NOT NULL,
  "tags"          TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "question"      TEXT NOT NULL,
  "answer"        TEXT,
  "difficulty"    TEXT,
  "createdBy"     TEXT,
  "createdByName" TEXT,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InterviewQuestion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "InterviewQuestion_team_idx" ON "InterviewQuestion" ("team");
