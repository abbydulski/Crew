import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';

/** PATCH /api/team/tracker/[id] — update tracker fields on AppUser (admin only) */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const denial = requireAdmin(session?.user?.email);
  if (denial) return denial;

  try {
    const { id } = await params;
    const body = await request.json();
    const { name, email, startDate, role, team, officeLocation, manager, employmentType, plannedConversionDate, endDate, endReason, returnOfferStatus, returnOfferType, returnStartDate } = body as {
      name?: string | null;
      email?: string;
      startDate?: string | null;
      role?: string | null;
      team?: string | null;
      officeLocation?: string | null;
      manager?: string | null;
      employmentType?: string | null;
      plannedConversionDate?: string | null;
      endDate?: string | null;
      endReason?: string | null;
      returnOfferStatus?: string | null;
      returnOfferType?: string | null;
      returnStartDate?: string | null;
    };

    const data: Record<string, unknown> = {};
    if (name !== undefined)           data.name           = name && name.trim() ? name.trim() : null;
    if (email !== undefined) {
      const normalized = email.trim().toLowerCase();
      if (!normalized || !normalized.includes('@')) {
        return NextResponse.json({ success: false, error: 'Invalid email' }, { status: 400 });
      }
      data.email = normalized;
    }
    if (startDate !== undefined)      data.startDate      = startDate ? new Date(startDate) : null;
    if (role !== undefined)           data.role           = role || null;
    if (team !== undefined)           data.team           = team || null;
    if (officeLocation !== undefined) data.officeLocation = officeLocation || null;
    if (manager !== undefined)        data.manager        = manager || null;
    if (employmentType !== undefined) data.employmentType = employmentType || null;
    if (plannedConversionDate !== undefined) data.plannedConversionDate = plannedConversionDate ? new Date(plannedConversionDate) : null;
    if (endDate !== undefined)        data.endDate        = endDate ? new Date(endDate) : null;
    if (endReason !== undefined)      data.endReason      = endReason || null;
    if (returnOfferStatus !== undefined) {
      const s = (returnOfferStatus || 'NONE').toUpperCase();
      const allowed = ['NONE', 'GIVEN', 'ACCEPTED', 'DECLINED'];
      if (!allowed.includes(s)) return NextResponse.json({ success: false, error: 'Invalid return offer status' }, { status: 400 });
      data.returnOfferStatus = s;
      // Clear type/date when there is no live offer
      if (s === 'NONE' || s === 'DECLINED') { data.returnOfferType = null; data.returnStartDate = null; }
    }
    if (returnOfferType !== undefined) {
      if (!returnOfferType) data.returnOfferType = null;
      else {
        const t = returnOfferType.toUpperCase();
        const allowed = ['FULL_TIME', 'INTERNSHIP'];
        if (!allowed.includes(t)) return NextResponse.json({ success: false, error: 'Invalid return offer type' }, { status: 400 });
        data.returnOfferType = t;
      }
    }
    if (returnStartDate !== undefined) data.returnStartDate = returnStartDate ? new Date(returnStartDate) : null;

    try {
      const updated = await prisma.appUser.update({ where: { id }, data });
      return NextResponse.json({ success: true, data: updated });
    } catch (err) {
      if (err && typeof err === 'object' && 'code' in err && (err as { code?: string }).code === 'P2002') {
        return NextResponse.json({ success: false, error: 'That email is already in use' }, { status: 409 });
      }
      throw err;
    }
  } catch (err) {
    console.error('Failed to update tracker user:', err);
    return NextResponse.json({ success: false, error: 'Failed to update' }, { status: 500 });
  }
}

/** DELETE /api/team/tracker/[id] — remove an AppUser row (admin only).
 *  Cascades to checkins; sets candidate.appUser to null via SetNull. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const denial = requireAdmin(session?.user?.email);
  if (denial) return denial;

  try {
    const { id } = await params;
    await prisma.appUser.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Failed to delete tracker user:', err);
    return NextResponse.json({ success: false, error: 'Failed to delete' }, { status: 500 });
  }
}
