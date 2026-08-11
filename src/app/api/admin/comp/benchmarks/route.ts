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
    orderBy: [{ role: 'asc' }, { yearsExperience: 'asc' }, { salary: 'asc' }],
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

    const salary = Number(body.salary);
    if (!Number.isFinite(salary) || salary < 0) {
      return NextResponse.json({ success: false, error: 'Salary must be a valid non-negative number' }, { status: 400 });
    }

    const optNum = (raw: unknown): number | null =>
      raw === '' || raw === null || raw === undefined ? null : Number(raw);
    const yearsExperience = optNum(body.yearsExperience);
    if (yearsExperience !== null && !Number.isFinite(yearsExperience)) {
      return NextResponse.json({ success: false, error: 'Years of experience must be a number' }, { status: 400 });
    }
    const equity = optNum(body.equity);
    if (equity !== null && !Number.isFinite(equity)) {
      return NextResponse.json({ success: false, error: 'Equity must be a number' }, { status: 400 });
    }

    const created = await prisma.compBenchmark.create({
      data: {
        role,
        yearsExperience,
        company: body.company?.trim() || null,
        team: body.team?.trim() || null,
        location: body.location?.trim() || null,
        employmentType: body.employmentType?.trim() || null,
        currency: body.currency?.trim() || 'USD',
        salary,
        equity,
        notes: body.notes?.trim() || null,
      },
    });
    return NextResponse.json({ success: true, data: created });
  } catch (err) {
    console.error('Failed to create comp benchmark:', err);
    return NextResponse.json({ success: false, error: 'Failed to create' }, { status: 500 });
  }
}
