import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';

const median = (nums: number[]): number => {
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

// Optional filter: keep a point when the query didn't specify a value, or the
// point doesn't carry that field, or they match (case-insensitive).
const matchOpt = (pointVal: string | null, queryVal: string | null): boolean =>
  !queryVal || !pointVal || pointVal.toLowerCase() === queryVal.toLowerCase();

/** POST /api/admin/comp/predict — place a proposed salary against market data points (admin only) */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const denial = requireAdmin(session?.user?.email);
  if (denial) return denial;

  try {
    const body = await request.json();
    const role = String(body.role || '').trim();
    const team = body.team?.trim() || null;
    const location = body.location?.trim() || null;
    const employmentType = body.employmentType?.trim() || null;
    const num = (raw: unknown): number | null =>
      raw === '' || raw === null || raw === undefined ? null : Number(raw);
    const yearsExperience = num(body.yearsExperience);
    const proposedSalary = num(body.proposedSalary);

    if (!role) return NextResponse.json({ success: false, error: 'Role is required' }, { status: 400 });
    if (proposedSalary !== null && !Number.isFinite(proposedSalary)) {
      return NextResponse.json({ success: false, error: 'Proposed salary must be a number' }, { status: 400 });
    }

    // All submitted data points for this role (case-insensitive), narrowed by any
    // optional filters the caller provided.
    const all = await prisma.compBenchmark.findMany();
    const roleLc = role.toLowerCase();
    const points = all
      .filter((b) => b.role.toLowerCase() === roleLc)
      .filter((b) => matchOpt(b.team, team) && matchOpt(b.location, location) && matchOpt(b.employmentType, employmentType))
      .sort((a, b) => a.salary - b.salary);

    const salaries = points.map((p) => p.salary);
    const stats = salaries.length ? {
      min: Math.min(...salaries),
      median: median(salaries),
      max: Math.max(...salaries),
    } : null;

    // Equity aggregated over the points that carry an equity value.
    const equities = points
      .map((p) => p.equity)
      .filter((e): e is number => e !== null && Number.isFinite(e));
    const equity = equities.length ? {
      count: equities.length,
      min: Math.min(...equities),
      median: median(equities),
      max: Math.max(...equities),
    } : null;

    // Where the proposed number lands among the data points.
    const placement = stats && proposedSalary !== null ? {
      pctAmong: Math.round((salaries.filter((s) => s < proposedSalary).length / salaries.length) * 100),
      label: proposedSalary >= stats.median ? 'At / above market median' : 'Below market median',
    } : null;

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

    return NextResponse.json({
      success: true,
      data: {
        query: { role, yearsExperience, team, location, employmentType, proposedSalary },
        count: points.length,
        stats,
        equity,
        points,
        placement,
        internal,
      },
    });
  } catch (err) {
    console.error('Failed to predict comp:', err);
    return NextResponse.json({ success: false, error: 'Failed to predict' }, { status: 500 });
  }
}
