// ── Office locations ────────────────────────────────────────────────────────

/** Canonical office option list (forms, dropdowns). */
export const OFFICE_OPTIONS = [
  { value: 'LB', label: 'Long Beach' },
  { value: 'Vegas', label: 'Las Vegas' },
  { value: 'Norcal', label: 'NorCal' },
  { value: 'Remote', label: 'Remote' },
] as const;

/** Short-code → display name lookup (derived from OFFICE_OPTIONS). */
export const OFFICE_NAMES: Record<string, string> = Object.fromEntries(
  OFFICE_OPTIONS.map((o) => [o.value, o.label]),
);

/** Physical mailing addresses per office — used in offer letters. */
export const OFFICE_ADDRESSES: Record<string, string> = {
  LB: '2799 Temple Ave, Signal Hill, CA 90755',
  Vegas: '1610 N Woodchips Rd, Pahrump, NV 89060',
  Norcal: '755 Paige Mill Road, Palo Alto, CA 94304',
};

// ── Teams ───────────────────────────────────────────────────────────────────

export const TEAM_OPTIONS = [
  { value: 'BizOps', label: 'BizOps' },
  { value: 'Hardware', label: 'Hardware' },
  { value: 'Software', label: 'Software' },
  { value: 'Field', label: 'Field' },
] as const;

/** Normalises freeform team strings → canonical team names. */
export const TEAM_ALIASES: Record<string, string> = {
  hw: 'Hardware',
  hardware: 'Hardware',
  sw: 'Software',
  software: 'Software',
  field: 'Field',
  ops: 'BizOps',
  bizops: 'BizOps',
  'biz ops': 'BizOps',
};

// ── Employment types ────────────────────────────────────────────────────────

export const EMPLOYMENT_TYPE_OPTIONS = [
  { value: 'Full-Time', label: 'Full-Time' },
  { value: 'Part-Time', label: 'Part-Time' },
  { value: 'Intern', label: 'Intern' },
] as const;

// ── Intern return offers ────────────────────────────────────────────────────

export const RETURN_OFFER_STATUS_OPTIONS = [
  { value: 'NONE', label: 'None' },
  { value: 'GIVEN', label: 'Given' },
  { value: 'ACCEPTED', label: 'Accepted' },
  { value: 'DECLINED', label: 'Declined' },
] as const;

export const RETURN_OFFER_TYPE_OPTIONS = [
  { value: 'FULL_TIME', label: 'Full-Time' },
  { value: 'INTERNSHIP', label: 'Internship' },
] as const;

export type ReturnOfferStatus = 'NONE' | 'GIVEN' | 'ACCEPTED' | 'DECLINED';
export type ReturnOfferType = 'FULL_TIME' | 'INTERNSHIP';

// ── Intern probation ────────────────────────────────────────────────────────

/** Hourly probation review window: 3 weeks before the 3-month mark. */
export const PROBATION_REVIEW_DAYS = { start: 69, end: 90 } as const;

// ── Check-in types ──────────────────────────────────────────────────────────

export type CheckinType = 'CHECK_IN' | 'PROMOTION' | 'NOTE';

export const CHECKIN_TYPE_LABEL: Record<CheckinType, string> = {
  CHECK_IN: 'Check-in',
  PROMOTION: 'Promotion',
  NOTE: 'Note',
};

// ── Candidate pipeline statuses ─────────────────────────────────────────────

export const PIPELINE_STATUSES = [
  { key: 'REACHED_OUT', label: 'Reached Out' },
  { key: 'IN_DIALOGUE', label: 'In Dialogue' },
  { key: 'INTERVIEW', label: 'Interview' },
  { key: 'OFFER', label: 'Offer' },
] as const;

export const ALL_STATUSES = [
  ...PIPELINE_STATUSES,
  { key: 'HIRED', label: 'Hired' },
  { key: 'ON_ICE', label: 'On Ice' },
  { key: 'ARCHIVED', label: 'Archived' },
] as const;
