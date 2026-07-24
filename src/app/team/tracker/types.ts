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
  employmentType: string | null;
  plannedConversionDate: string | null;
  endDate: string | null;
  endReason: string | null;
  lastCheckin: { id: string; type: CheckinType; loggedAt: string } | null;
  checkinCount: number;
  createdAt: string;
  lastLogin: string;
}

/** Returns "1 yr 3 mo" / "4 mo" / "—" — short, readable tenure. */
export function formatTenure(startIso: string | null): string {
  if (!startIso) return '—';
  const start = new Date(startIso);
  if (Number.isNaN(start.getTime())) return '—';
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

/** Intern probation review flag — shared by TrackerRow + page filters. */
export function isReviewDue(u: { startDate: string | null; employmentType: string | null }): boolean {
  const t = daysSince(u.startDate);
  if (t === null) return false;
  const inWindow = t >= PROBATION_REVIEW_DAYS.start && t <= PROBATION_REVIEW_DAYS.end;
  return inWindow && u.employmentType === 'Intern';
}

/** Intern past their 90-day mark and still classified as Intern — needs attention. */
export function isInternOverdue(u: { startDate: string | null; employmentType: string | null }): boolean {
  const t = daysSince(u.startDate);
  if (t === null) return false;
  return t > PROBATION_REVIEW_DAYS.end && u.employmentType === 'Intern';
}
