import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';

/** POST /api/team/tracker/[id]/convert-ft
 *  Flips an intern's employmentType to Full-Time, logs a PROMOTION check-in,
 *  and optionally updates salary/salaryType. Runs in a transaction. Admin only.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const denial = requireAdmin(session?.user?.email);
  if (denial) return denial;

  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { salary, salaryType, notes } = body as {
      salary?: number | string | null;
      salaryType?: string | null;
      notes?: string | null;
    };

    const user = await prisma.appUser.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, employmentType: true },
    });
    if (!user) return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });

    const updateData: Record<string, unknown> = { employmentType: 'Full-Time' };
    if (salary !== undefined && salary !== null && salary !== '') {
      updateData.salary = Number(salary);
    }
    if (salaryType !== undefined && salaryType !== null && salaryType !== '') {
      updateData.salaryType = String(salaryType);
    }

    const previous = user.employmentType || 'Intern';
    const noteLines = [`Converted from ${previous} to Full-Time`];
    if (updateData.salary !== undefined) {
      noteLines.push(`New salary: ${updateData.salary}${updateData.salaryType ? ` (${updateData.salaryType})` : ''}`);
    }
    if (notes && typeof notes === 'string' && notes.trim()) {
      noteLines.push(notes.trim());
    }

    const [updated, checkin] = await prisma.$transaction([
      prisma.appUser.update({ where: { id }, data: updateData }),
      prisma.checkin.create({
        data: {
          userId: id,
          type: 'PROMOTION',
          loggedBy: session!.user!.email!.toLowerCase(),
          loggedAt: new Date(),
          notes: noteLines.join('\n'),
        },
      }),
    ]);

    return NextResponse.json({ success: true, data: { user: updated, checkin } });
  } catch (err) {
    console.error('Failed to convert to FT:', err);
    return NextResponse.json({ success: false, error: 'Failed to convert' }, { status: 500 });
  }
}
