"""Patch monorepo crew files to import constants from @/lib/constants."""
import re, os

BASE = os.path.expanduser("~/Desktop/asc-internal-tools-temp/apps/crew/src")

def read(rel):
    with open(os.path.join(BASE, rel)) as f:
        return f.read()

def write(rel, content):
    with open(os.path.join(BASE, rel), "w") as f:
        f.write(content)

# ── 1. Update constants.ts — add SALARY_TYPE_OPTIONS + SALARY_CHANGE ──

c = read("lib/constants.ts")
# Fix CheckinType to include SALARY_CHANGE
c = c.replace(
    "export type CheckinType = 'CHECK_IN' | 'PROMOTION' | 'NOTE';",
    "export type CheckinType = 'CHECK_IN' | 'SALARY_CHANGE' | 'PROMOTION' | 'NOTE';"
)
c = c.replace(
    "export const CHECKIN_TYPE_LABEL: Record<CheckinType, string> = {\n  CHECK_IN: 'Check-in',\n  PROMOTION: 'Promotion',\n  NOTE: 'Note',\n};",
    "export const CHECKIN_TYPE_LABEL: Record<CheckinType, string> = {\n  CHECK_IN: 'Check-in',\n  SALARY_CHANGE: 'Salary change',\n  PROMOTION: 'Promotion',\n  NOTE: 'Note',\n};"
)
# Add SALARY_TYPE_OPTIONS after EMPLOYMENT_TYPE_OPTIONS block
c = c.replace(
    "// ── Intern probation",
    "export const SALARY_TYPE_OPTIONS = [\n  { value: 'annual', label: 'Annual' },\n  { value: 'hourly', label: 'Hourly' },\n] as const;\n\n// ── Intern probation"
)
write("lib/constants.ts", c)
print("1. constants.ts updated")

# ── 2. Update tracker/types.ts — re-export from constants ──

t = read("pages/team/tracker/types.ts")
# Remove all inline constant definitions, keep interfaces and functions
# Replace entire file with re-exports + interfaces + functions
new_types = """// Re-export shared constants so existing imports from './types' keep working
export {
  type CheckinType,
  CHECKIN_TYPE_LABEL,
  OFFICE_OPTIONS,
  TEAM_OPTIONS,
  EMPLOYMENT_TYPE_OPTIONS,
  SALARY_TYPE_OPTIONS,
  PROBATION_REVIEW_DAYS,
} from '@/lib/constants';

import type { CheckinType } from '@/lib/constants';
import { PROBATION_REVIEW_DAYS } from '@/lib/constants';

export interface TrackerCheckin {
  id: string;
  type: CheckinType;
  loggedBy: string;
  loggedAt: string;
  notes: string | null;
  createdAt: string;
}

export interface TrackerUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  candidateId: string | null;
  startDate: string | null;
  role: string | null;
  team: string | null;
  officeLocation: string | null;
  manager: string | null;
  salary: number | null;
  salaryType: string | null;
  equityShares: number | null;
  employmentType: string | null;
  plannedConversionDate: string | null;
  endDate: string | null;
  endReason: string | null;
  lastCheckin: { id: string; type: CheckinType; loggedAt: string } | null;
  checkinCount: number;
  createdAt: string;
  lastLogin: string;
}

/** Returns "1 yr 3 mo" / "4 mo" / "\\u2014" \\u2014 short, readable tenure. */
export function formatTenure(startIso: string | null): string {
  if (!startIso) return '\\u2014';
  const start = new Date(startIso);
  if (Number.isNaN(start.getTime())) return '\\u2014';
  const now = new Date();
  let months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  if (now.getDate() < start.getDate()) months -= 1;
  if (months < 0) months = 0;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (years === 0) return `${rem} mo`;
  if (rem === 0) return `${years} yr`;
  return `${years} yr ${rem} mo`;
}

/** Returns whole days between iso date and today. Returns null if input falsy. */
export function daysSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  const ms = Date.now() - then;
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

/** Hourly + intern probation review flag \\u2014 shared by TrackerRow + page filters. */
export function isReviewDue(u: { startDate: string | null; employmentType: string | null; salaryType: string | null }): boolean {
  const t = daysSince(u.startDate);
  if (t === null) return false;
  const inWindow = t >= PROBATION_REVIEW_DAYS.start && t <= PROBATION_REVIEW_DAYS.end;
  return inWindow && (u.salaryType === 'hourly' || u.employmentType === 'Intern');
}

/** Intern past their 90-day mark and still classified as Intern \\u2014 needs attention. */
export function isInternOverdue(u: { startDate: string | null; employmentType: string | null }): boolean {
  const t = daysSince(u.startDate);
  if (t === null) return false;
  return t > PROBATION_REVIEW_DAYS.end && u.employmentType === 'Intern';
}
"""
write("pages/team/tracker/types.ts", new_types)
print("2. tracker/types.ts updated")

# ── 3. Update recruiting/types.ts — re-export statuses ──

r = read("pages/recruiting/types.ts")
r = r.replace(
    "export const PIPELINE_STATUSES = [\n  { key: 'REACHED_OUT', label: 'Reached Out' },\n  { key: 'IN_DIALOGUE', label: 'In Dialogue' },\n  { key: 'INTERVIEW', label: 'Interview' },\n  { key: 'OFFER', label: 'Offer' },\n] as const;\n\nexport const ALL_STATUSES = [\n  ...PIPELINE_STATUSES,\n  { key: 'HIRED', label: 'Hired' },\n  { key: 'ON_ICE', label: 'On Ice' },\n  { key: 'ARCHIVED', label: 'Archived' },\n] as const;",
    "// Re-export from shared constants so existing imports keep working\nexport { PIPELINE_STATUSES, ALL_STATUSES } from '@/lib/constants';"
)
write("pages/recruiting/types.ts", r)
print("3. recruiting/types.ts updated")

# ── 4. Update RoleModal.tsx ──

rm = read("pages/recruiting/components/RoleModal.tsx")
rm = rm.replace(
    """const TEAM_OPTIONS = ['HW', 'SW', 'Field', 'Ops'];
const OFFICE_OPTIONS: { value: string; label: string }[] = [
  { value: 'LB', label: 'Long Beach' },
  { value: 'Vegas', label: 'Las Vegas' },
  { value: 'Norcal', label: 'NorCal' },
];
const EMPLOYMENT_OPTIONS = ['Full-Time', 'Part-Time', 'Intern'];""",
    "import { OFFICE_OPTIONS, EMPLOYMENT_TYPE_OPTIONS, TEAM_OPTIONS } from '@/lib/constants';"
)
# Fix TEAM_OPTIONS usage (was flat string, now {value,label})
rm = rm.replace(
    "{TEAM_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}",
    "{TEAM_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}"
)
# Fix EMPLOYMENT_OPTIONS usage
rm = rm.replace(
    "{EMPLOYMENT_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}",
    "{EMPLOYMENT_TYPE_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}"
)
write("pages/recruiting/components/RoleModal.tsx", rm)
print("4. RoleModal.tsx updated")

# ── 5. Update RolesPage.tsx ──

rp = read("pages/recruiting/RolesPage.tsx")
# Add import
rp = rp.replace(
    'import { crewFetch, crewJson } from "@/lib/api";',
    'import { crewFetch, crewJson } from "@/lib/api";\nimport { OFFICE_NAMES } from "@/lib/constants";'
)
# Remove inline
rp = rp.replace(
    "const OFFICE_NAMES: Record<string, string> = { LB: 'Long Beach', Vegas: 'Las Vegas', Norcal: 'NorCal' };\n",
    ""
)
write("pages/recruiting/RolesPage.tsx", rp)
print("5. RolesPage.tsx updated")

# ── 6. Update OnboardingPage.tsx ──

ob = read("pages/onboarding/OnboardingPage.tsx")
# Add import
ob = ob.replace(
    "import { crewFetch, crewJson } from '@/lib/api';",
    "import { crewFetch, crewJson } from '@/lib/api';\nimport { OFFICE_NAMES } from '@/lib/constants';"
)
# Remove inline
ob = ob.replace(
    "const OFFICE_NAMES: Record<string, string> = { LB: 'Long Beach', Vegas: 'Las Vegas', Norcal: 'NorCal' };\n",
    ""
)
write("pages/onboarding/OnboardingPage.tsx", ob)
print("6. OnboardingPage.tsx updated")

# ── 7. Update HeadcountPlannerPage.tsx ──

hp = read("pages/team/HeadcountPlannerPage.tsx")
hp = hp.replace(
    "import { PROBATION_REVIEW_DAYS } from './tracker/types';",
    "import { PROBATION_REVIEW_DAYS } from '@/lib/constants';"
)
write("pages/team/HeadcountPlannerPage.tsx", hp)
print("7. HeadcountPlannerPage.tsx updated")

print("\nAll monorepo crew files patched!")
