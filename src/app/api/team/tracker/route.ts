import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';

/** GET /api/team/tracker — list all AppUsers with tracker fields + checkin summary (admin only) */
export async function GET() {
  const session = await getServerSession(authOptions);
  const denial = requireAdmin(session?.user?.email);
  if (denial) return denial;

  const users = await prisma.appUser.findMany({
    where: { endDate: null },
    orderBy: [{ name: 'asc' }, { email: 'asc' }],
    include: {
      checkins: {
        orderBy: { loggedAt: 'desc' },
        take: 1,
        select: { id: true, type: true, loggedAt: true },
      },
      _count: { select: { checkins: true } },
    },
  });

  const data = users.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    image: u.image,
    candidateId: u.candidateId,
    startDate: u.startDate,
    role: u.role,
    team: u.team,
    officeLocation: u.officeLocation,
    manager: u.manager,
    employmentType: u.employmentType,
    plannedConversionDate: u.plannedConversionDate,
    endDate: u.endDate,
    endReason: u.endReason,
    lastCheckin: u.checkins[0] || null,
    checkinCount: u._count.checkins,
    createdAt: u.createdAt,
    lastLogin: u.lastLogin,
  }));

  return NextResponse.json({ success: true, data });
}

/** POST /api/team/tracker — admin-created AppUser (backfill / demo seeding) */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const denial = requireAdmin(session?.user?.email);
  if (denial) return denial;

  try {
    const body = await request.json();
    const email = String(body.email || '').trim().toLowerCase();
    if (!email || !email.includes('@')) {
      return NextResponse.json({ success: false, error: 'Valid email required' }, { status: 400 });
    }

    const existing = await prisma.appUser.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'A team member with that email already exists — expand their row to edit.' },
        { status: 409 }
      );
    }

    const { name, startDate, role, team, officeLocation, manager, employmentType } = body as {
      name?: string | null;
      startDate?: string | null;
      role?: string | null;
      team?: string | null;
      officeLocation?: string | null;
      manager?: string | null;
      employmentType?: string | null;
    };

    const created = await prisma.appUser.create({
      data: {
        email,
        name: name?.trim() || null,
        startDate: startDate ? new Date(startDate) : null,
        role: role?.trim() || null,
        team: team?.trim() || null,
        officeLocation: officeLocation?.trim() || null,
        manager: manager?.trim() || null,
        employmentType: employmentType?.trim() || null,
      },
    });

    // If a matching Candidate already exists by workEmail, link + snapshot now.
    const { linkAppUserToCandidate } = await import('@/lib/team-tracker');
    await linkAppUserToCandidate(email);

    return NextResponse.json({ success: true, data: created });
  } catch (err) {
    console.error('Failed to create team member:', err);
    return NextResponse.json({ success: false, error: 'Failed to create' }, { status: 500 });
  }
}
