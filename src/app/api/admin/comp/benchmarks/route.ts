import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';

/** GET /api/admin/comp/benchmarks — list all market benchmark bands (admin only) */
export async function GET() {
  const session = await getServerSession(authOptions);
  const denial = requireAdmin(session?.user?.email);
  if (denial) return denial;

  const benchmarks = await prisma.compBenchmark.findMany({
    orderBy: [{ role: 'asc' }, { level: 'asc' }],
  });
  return NextResponse.json({ success: true, data: benchmarks });
}

/** POST /api/admin/comp/benchmarks — create a benchmark band (admin only) */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const denial = requireAdmin(session?.user?.email);
  if (denial) return denial;

  try {
    const body = await request.json();
    const role = String(body.role || '').trim();
    if (!role) {
      return NextResponse.json({ success: false, error: 'Role is required' }, { status: 400 });
    }

    const p25 = Number(body.salaryP25);
    const p50 = Number(body.salaryP50);
    const p75 = Number(body.salaryP75);
    if (![p25, p50, p75].every((n) => Number.isFinite(n) && n >= 0)) {
      return NextResponse.json({ success: false, error: 'p25/p50/p75 must be valid non-negative numbers' }, { status: 400 });
    }
    if (!(p25 <= p50 && p50 <= p75)) {
      return NextResponse.json({ success: false, error: 'Percentiles must satisfy p25 ≤ p50 ≤ p75' }, { status: 400 });
    }

    const equityRaw = body.equityP50;
    const equityP50 = equityRaw === '' || equityRaw === null || equityRaw === undefined ? null : Number(equityRaw);
    if (equityP50 !== null && !Number.isFinite(equityP50)) {
      return NextResponse.json({ success: false, error: 'Equity must be a number' }, { status: 400 });
    }

    const created = await prisma.compBenchmark.create({
      data: {
        role,
        level: body.level?.trim() || null,
        team: body.team?.trim() || null,
        location: body.location?.trim() || null,
        employmentType: body.employmentType?.trim() || null,
        currency: body.currency?.trim() || 'USD',
        salaryP25: p25,
        salaryP50: p50,
        salaryP75: p75,
        equityP50,
        source: body.source?.trim() || null,
        notes: body.notes?.trim() || null,
      },
    });
    return NextResponse.json({ success: true, data: created });
  } catch (err) {
    console.error('Failed to create comp benchmark:', err);
    return NextResponse.json({ success: false, error: 'Failed to create' }, { status: 500 });
  }
}
