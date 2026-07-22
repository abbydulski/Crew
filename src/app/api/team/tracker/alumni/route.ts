import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';

/** GET /api/team/tracker/alumni — list former AppUsers (endDate set), admin only */
export async function GET() {
  const session = await getServerSession(authOptions);
  const denial = requireAdmin(session?.user?.email);
  if (denial) return denial;

  const users = await prisma.appUser.findMany({
    where: { endDate: { not: null } },
    orderBy: [{ endDate: 'desc' }, { name: 'asc' }],
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
    endDate: u.endDate,
    endReason: u.endReason,
    createdAt: u.createdAt,
    lastLogin: u.lastLogin,
  }));

  return NextResponse.json({ success: true, data });
}
