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
    const [activeUsers, openRoles, hiredCandidates] = await Promise.all([
      prisma.appUser.findMany({
        where: { endDate: null },
        select: { id: true, name: true, email: true, team: true, role: true, employmentType: true, startDate: true, plannedConversionDate: true, manager: true, candidateId: true },
      }),
      prisma.role.findMany({
        select: { team: true, title: true },
      }),
      // Candidates marked HIRED but not yet linked to an AppUser — incoming hires
      prisma.candidate.findMany({
        where: { status: 'HIRED', appUser: null },
        select: { id: true, name: true, team: true, role: true, employmentType: true, startDate: true },
      }),
    ]);

    // Identify linked candidate IDs so we don't double-count
    const linkedCandidateIds = new Set(activeUsers.map((u) => u.candidateId).filter(Boolean));

    interface TeamMember { id: string; name: string; role: string | null; employmentType: string | null; incoming?: boolean }
    const teams = new Map<string, { filled: number; open: number; incoming: number; openTitles: string[]; members: TeamMember[] }>();
    const ensure = (t: string) => {
      if (!teams.has(t)) teams.set(t, { filled: 0, open: 0, incoming: 0, openTitles: [], members: [] });
      return teams.get(t)!;
    };
    for (const u of activeUsers) {
      const entry = ensure(normalizeTeam(u.team));
      entry.filled += 1;
      entry.members.push({ id: u.id, name: u.name || u.email, role: u.role, employmentType: u.employmentType });
    }

    // Incoming hires: HIRED candidates not yet linked to an AppUser
    const incomingHires = hiredCandidates.filter((c) => !linkedCandidateIds.has(c.id));
    for (const c of incomingHires) {
      const entry = ensure(normalizeTeam(c.team));
      entry.incoming += 1;
      entry.members.push({ id: c.id, name: c.name, role: c.role, employmentType: c.employmentType, incoming: true });
    }

    for (const r of openRoles) {
      const entry = ensure(normalizeTeam(r.team));
      entry.open += 1;
      entry.openTitles.push(r.title);
    }

    const data = Array.from(teams.entries())
      .map(([team, v]) => ({
        team,
        filled: v.filled,
        open: v.open,
        incoming: v.incoming,
        projected: v.filled + v.open + v.incoming,
        openTitles: v.openTitles,
        members: v.members.sort((a, b) => (a.name).localeCompare(b.name)),
      }))
      .sort((a, b) => b.projected - a.projected || a.team.localeCompare(b.team));

    // Employment type breakdown (active only — incoming counted separately)
    const ftCount = activeUsers.filter((u) => u.employmentType === 'Full-Time').length;
    const internCount = activeUsers.filter((u) => u.employmentType === 'Intern').length;
    const otherCount = activeUsers.length - ftCount - internCount;

    const totals = {
      ...data.reduce(
        (acc, t) => ({ filled: acc.filled + t.filled, open: acc.open + t.open, incoming: acc.incoming + t.incoming, projected: acc.projected + t.projected }),
        { filled: 0, open: 0, incoming: 0, projected: 0 }
      ),
      ftCount, internCount, otherCount,
    };

    // Build intern list for scenario planning on the client
    const interns = activeUsers
      .filter((u) => u.employmentType === 'Intern')
      .map((u) => {
        const startMs = u.startDate ? new Date(u.startDate).getTime() : null;
        const daysSinceStart = startMs && !Number.isNaN(startMs) ? Math.floor((Date.now() - startMs) / (1000 * 60 * 60 * 24)) : null;
        return {
          id: u.id,
          name: u.name || u.email,
          team: normalizeTeam(u.team),
          manager: u.manager || null,
          startDate: u.startDate,
          daysSinceStart,
          plannedConversionDate: u.plannedConversionDate,
        };
      })
      .sort((a, b) => (b.daysSinceStart ?? 0) - (a.daysSinceStart ?? 0));

    // Incoming hire details for the UI
    const incoming = incomingHires.map((c) => ({
      id: c.id,
      name: c.name,
      team: normalizeTeam(c.team),
      role: c.role,
      employmentType: c.employmentType,
      startDate: c.startDate,
    })).sort((a, b) => {
      if (!a.startDate && !b.startDate) return 0;
      if (!a.startDate) return 1;
      if (!b.startDate) return -1;
      return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
    });

    return NextResponse.json({ success: true, data: { teams: data, totals, interns, incoming } });
  } catch (err) {
    console.error('Failed to load planning data:', err);
    return NextResponse.json({ success: false, error: 'Failed to load' }, { status: 500 });
  }
}
