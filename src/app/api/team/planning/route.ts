import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';

/** Common short codes → canonical team labels (matches tracker TEAM_OPTIONS). */
const TEAM_ALIASES: Record<string, string> = {
  hw: 'Hardware',
  hardware: 'Hardware',
  sw: 'Software',
  software: 'Software',
  field: 'Field',
  ops: 'BizOps',
  bizops: 'BizOps',
  'biz ops': 'BizOps',
};

function normalizeTeam(raw: string | null | undefined): string {
  if (!raw) return 'Unassigned';
  const key = raw.trim().toLowerCase();
  return TEAM_ALIASES[key] || raw.trim();
}

/** GET /api/team/planning — per-team filled headcount vs. open roles (admin only) */
export async function GET() {
  const session = await getServerSession(authOptions);
  const denial = requireAdmin(session?.user?.email);
  if (denial) return denial;

  try {
    const [activeUsers, openRoles] = await Promise.all([
      prisma.appUser.findMany({
        where: { endDate: null },
        select: { team: true },
      }),
      prisma.role.findMany({
        select: { team: true, title: true },
      }),
    ]);

    const teams = new Map<string, { filled: number; open: number; openTitles: string[] }>();
    const ensure = (t: string) => {
      if (!teams.has(t)) teams.set(t, { filled: 0, open: 0, openTitles: [] });
      return teams.get(t)!;
    };
    for (const u of activeUsers) ensure(normalizeTeam(u.team)).filled += 1;
    for (const r of openRoles) {
      const entry = ensure(normalizeTeam(r.team));
      entry.open += 1;
      entry.openTitles.push(r.title);
    }

    const data = Array.from(teams.entries())
      .map(([team, v]) => ({ team, ...v, projected: v.filled + v.open }))
      .sort((a, b) => b.projected - a.projected || a.team.localeCompare(b.team));

    const totals = data.reduce(
      (acc, t) => ({ filled: acc.filled + t.filled, open: acc.open + t.open, projected: acc.projected + t.projected }),
      { filled: 0, open: 0, projected: 0 }
    );

    return NextResponse.json({ success: true, data: { teams: data, totals } });
  } catch (err) {
    console.error('Failed to load planning data:', err);
    return NextResponse.json({ success: false, error: 'Failed to load' }, { status: 500 });
  }
}
