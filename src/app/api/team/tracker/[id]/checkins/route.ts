import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import type { CheckinType } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';

const VALID_TYPES = new Set<CheckinType>(['CHECK_IN', 'PROMOTION', 'NOTE']);

/** GET /api/team/tracker/[id]/checkins — full event history for a user (admin only) */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const denial = requireAdmin(session?.user?.email);
  if (denial) return denial;

  const { id } = await params;
  const items = await prisma.checkin.findMany({
    where: { userId: id },
    orderBy: { loggedAt: 'desc' },
    take: 200,
  });
  return NextResponse.json({ success: true, data: items });
}

/** POST /api/team/tracker/[id]/checkins — log a new people event (admin only) */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const denial = requireAdmin(session?.user?.email);
  if (denial) return denial;

  try {
    const { id } = await params;
    const body = await request.json();
    const typeInput = String(body.type || 'CHECK_IN').toUpperCase() as CheckinType;
    const notes = typeof body.notes === 'string' ? body.notes.trim() : '';
    const loggedAtInput = typeof body.loggedAt === 'string' ? body.loggedAt : null;

    if (!VALID_TYPES.has(typeInput)) {
      return NextResponse.json({ success: false, error: 'Invalid type' }, { status: 400 });
    }

    const user = await prisma.appUser.findUnique({ where: { id }, select: { id: true } });
    if (!user) return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });

    const checkin = await prisma.checkin.create({
      data: {
        userId: id,
        type: typeInput,
        loggedBy: session!.user!.email!.toLowerCase(),
        loggedAt: loggedAtInput ? new Date(loggedAtInput) : new Date(),
        notes: notes || null,
      },
    });
    return NextResponse.json({ success: true, data: checkin });
  } catch (err) {
    console.error('Failed to create checkin:', err);
    return NextResponse.json({ success: false, error: 'Failed to log check-in' }, { status: 500 });
  }
}
