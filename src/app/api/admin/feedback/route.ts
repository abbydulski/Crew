import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requireAdmin } from '@/lib/admin-auth';

const RECENT_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

/** GET /api/admin/feedback — all interview feedback from the last 30 days (admin only) */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const denial = requireAdmin(session?.user?.email);
    if (denial) return denial;

    const since = new Date(Date.now() - RECENT_WINDOW_MS);
    const feedback = await prisma.interviewFeedback.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      include: {
        candidate: { select: { id: true, name: true, role: true, status: true } },
      },
    });

    return NextResponse.json({ success: true, data: feedback });
  } catch (error) {
    console.error('Failed to fetch admin feedback:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
