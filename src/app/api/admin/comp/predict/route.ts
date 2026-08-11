import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';

type Band = { salaryP25: number; salaryP50: number; salaryP75: number };

/** Piecewise-linear percentile of a salary against p25/p50/p75 anchors, clamped 0–100. */
function estimatePercentile(salary: number, b: Band): number {
  const { salaryP25: p25, salaryP50: p50, salaryP75: p75 } = b;
  let pct: number;
  if (salary <= p50) {
    const span = p50 - p25 || 1;
    pct = 50 + ((salary - p50) / span) * 25; // 25 pts per band below the median
  } else {
    const span = p75 - p50 || 1;
    pct = 50 + ((salary - p50) / span) * 25;
  }
  return Math.max(0, Math.min(100, Math.round(pct)));
}

function placementLabel(salary: number, b: Band): string {
  if (salary < b.salaryP25) return 'Below p25';
  if (salary < b.salaryP50) return 'p25–p50';
  if (salary < b.salaryP75) return 'p50–p75';
  return 'At / above p75';
}

const median = (nums: number[]): number => {
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

/** POST /api/admin/comp/predict — place a proposed salary against market bands (admin only) */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const denial = requireAdmin(session?.user?.email);
  if (denial) return denial;

  try {
    const body = await request.json();
    const role = String(body.role || '').trim();
    const level = body.level?.trim() || null;
    const team = body.team?.trim() || null;
    const location = body.location?.trim() || null;
    const employmentType = body.employmentType?.trim() || null;
    const proposedSalary = body.proposedSalary === '' || body.proposedSalary === null || body.proposedSalary === undefined
      ? null : Number(body.proposedSalary);

    if (!role) return NextResponse.json({ success: false, error: 'Role is required' }, { status: 400 });
    if (proposedSalary !== null && !Number.isFinite(proposedSalary)) {
      return NextResponse.json({ success: false, error: 'Proposed salary must be a number' }, { status: 400 });
    }

    // Candidate bands: same role (case-insensitive). Score by how many optional
    // filters also match, so the most specific band wins.
    const all = await prisma.compBenchmark.findMany();
    const roleLc = role.toLowerCase();
    const roleMatches = all.filter((b) => b.role.toLowerCase() === roleLc);
    const scored = roleMatches.map((b) => {
      let score = 0;
      if (level && b.level && b.level.toLowerCase() === level.toLowerCase()) score += 4;
      if (team && b.team && b.team.toLowerCase() === team.toLowerCase()) score += 2;
      if (location && b.location && b.location.toLowerCase() === location.toLowerCase()) score += 1;
      if (employmentType && b.employmentType && b.employmentType.toLowerCase() === employmentType.toLowerCase()) score += 1;
      return { b, score };
    }).sort((a, z) => z.score - a.score);
    const band = scored[0]?.b ?? null;

    // Internal actuals overlay — active AppUsers matching role (+ team), annual pay
    // only. Clearly labeled/read-only in the UI; omitted entirely when empty.
    const users = await prisma.appUser.findMany({
      where: { endDate: null, salary: { not: null }, role: { equals: role, mode: 'insensitive' } },
      select: { salary: true, salaryType: true, team: true },
    });
    const internalSalaries = users
      .filter((u) => (!team || (u.team || '').toLowerCase() === team.toLowerCase()))
      .filter((u) => !(u.salaryType || '').toLowerCase().includes('hour'))
      .map((u) => u.salary as number);
    const internal = internalSalaries.length > 0 ? {
      count: internalSalaries.length,
      min: Math.min(...internalSalaries),
      median: median(internalSalaries),
      max: Math.max(...internalSalaries),
    } : null;

    const placement = band && proposedSalary !== null ? {
      percentile: estimatePercentile(proposedSalary, band),
      label: placementLabel(proposedSalary, band),
    } : null;

    return NextResponse.json({
      success: true,
      data: {
        query: { role, level, team, location, employmentType, proposedSalary },
        band,
        matchScore: scored[0]?.score ?? 0,
        alternativesCount: Math.max(0, roleMatches.length - 1),
        placement,
        internal,
      },
    });
  } catch (err) {
    console.error('Failed to predict comp:', err);
    return NextResponse.json({ success: false, error: 'Failed to predict' }, { status: 500 });
  }
}
