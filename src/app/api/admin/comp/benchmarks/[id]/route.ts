import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';

/** PATCH /api/admin/comp/benchmarks/[id] — update a benchmark band (admin only) */
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
    const data: Record<string, unknown> = {};

    if (body.role !== undefined) {
      const role = String(body.role || '').trim();
      if (!role) return NextResponse.json({ success: false, error: 'Role cannot be empty' }, { status: 400 });
      data.role = role;
    }
    if (body.company !== undefined)        data.company = body.company?.trim() || null;
    if (body.team !== undefined)           data.team = body.team?.trim() || null;
    if (body.location !== undefined)       data.location = body.location?.trim() || null;
    if (body.employmentType !== undefined) data.employmentType = body.employmentType?.trim() || null;
    if (body.currency !== undefined)       data.currency = body.currency?.trim() || 'USD';
    if (body.notes !== undefined)          data.notes = body.notes?.trim() || null;

    if (body.salary !== undefined) {
      const n = Number(body.salary);
      if (!Number.isFinite(n) || n < 0) {
        return NextResponse.json({ success: false, error: 'Salary must be a valid non-negative number' }, { status: 400 });
      }
      data.salary = n;
    }
    for (const key of ['yearsExperience', 'equity'] as const) {
      if (body[key] !== undefined) {
        const raw = body[key];
        if (raw === '' || raw === null) data[key] = null;
        else {
          const n = Number(raw);
          if (!Number.isFinite(n)) return NextResponse.json({ success: false, error: `${key} must be a number` }, { status: 400 });
          data[key] = n;
        }
      }
    }

    const updated = await prisma.compBenchmark.update({ where: { id }, data });
    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    console.error('Failed to update comp benchmark:', err);
    return NextResponse.json({ success: false, error: 'Failed to update' }, { status: 500 });
  }
}

/** DELETE /api/admin/comp/benchmarks/[id] — remove a benchmark band (admin only) */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const denial = requireAdmin(session?.user?.email);
  if (denial) return denial;

  try {
    const { id } = await params;
    await prisma.compBenchmark.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Failed to delete comp benchmark:', err);
    return NextResponse.json({ success: false, error: 'Failed to delete' }, { status: 500 });
  }
}
