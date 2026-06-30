import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import type { FaqStatus } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';

const VALID_STATUSES = new Set<FaqStatus>(['PENDING', 'PUBLISHED', 'ARCHIVED']);

/** PATCH /api/faq/[id] — update question/answer/status (admin only) */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    const denial = requireAdmin(session?.user?.email);
    if (denial) return denial;

    const body = await request.json();
    const data: {
      question?: string;
      answer?: string | null;
      status?: FaqStatus;
      answeredBy?: string | null;
      answeredAt?: Date | null;
      publishedAt?: Date | null;
    } = {};

    if (typeof body.question === 'string') {
      const q = body.question.trim();
      if (!q) return NextResponse.json({ success: false, error: 'Question cannot be empty' }, { status: 400 });
      data.question = q;
    }
    if (body.answer !== undefined) {
      const a = typeof body.answer === 'string' ? body.answer.trim() : '';
      data.answer = a || null;
      data.answeredAt = a ? new Date() : null;
      data.answeredBy = a ? session!.user!.email!.toLowerCase() : null;
    }
    if (typeof body.status === 'string') {
      const s = body.status.toUpperCase() as FaqStatus;
      if (!VALID_STATUSES.has(s)) {
        return NextResponse.json({ success: false, error: 'Invalid status' }, { status: 400 });
      }
      data.status = s;
      if (s === 'PUBLISHED') data.publishedAt = new Date();
    }

    const updated = await prisma.faq.update({ where: { id }, data });
    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    console.error('Failed to update FAQ:', err);
    return NextResponse.json({ success: false, error: 'Failed to update FAQ' }, { status: 500 });
  }
}

/** DELETE /api/faq/[id] — hard delete (admin only) */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    const denial = requireAdmin(session?.user?.email);
    if (denial) return denial;

    await prisma.faq.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Failed to delete FAQ:', err);
    return NextResponse.json({ success: false, error: 'Failed to delete FAQ' }, { status: 500 });
  }
}
