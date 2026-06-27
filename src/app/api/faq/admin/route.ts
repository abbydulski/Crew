import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import type { FaqStatus } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { requireFaqAdmin } from '@/lib/faq-auth';

const VALID_STATUSES = new Set<FaqStatus>(['PENDING', 'PUBLISHED', 'ARCHIVED']);

/** GET /api/faq/admin — list all FAQs (admin only) */
export async function GET() {
  const session = await getServerSession(authOptions);
  const denial = requireFaqAdmin(session?.user?.email);
  if (denial) return denial;

  const items = await prisma.faq.findMany({
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    take: 500,
  });
  return NextResponse.json({ success: true, data: items });
}

/** POST /api/faq/admin — admin-authored FAQ entry (no Slack ping) */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const denial = requireFaqAdmin(session?.user?.email);
    if (denial) return denial;

    const body = await request.json();
    const question = String(body.question || '').trim();
    const answer = typeof body.answer === 'string' ? body.answer.trim() : '';
    const statusInput = String(body.status || 'PUBLISHED').toUpperCase() as FaqStatus;

    if (!question) {
      return NextResponse.json({ success: false, error: 'Question required' }, { status: 400 });
    }
    if (!VALID_STATUSES.has(statusInput)) {
      return NextResponse.json({ success: false, error: 'Invalid status' }, { status: 400 });
    }
    if (statusInput === 'PUBLISHED' && !answer) {
      return NextResponse.json({ success: false, error: 'Answer required to publish' }, { status: 400 });
    }

    const email = session!.user!.email!.toLowerCase();
    const now = new Date();
    const created = await prisma.faq.create({
      data: {
        question,
        answer: answer || null,
        status: statusInput,
        submittedBy: email,
        submittedByName: session?.user?.name || null,
        answeredBy: answer ? email : null,
        answeredAt: answer ? now : null,
        publishedAt: statusInput === 'PUBLISHED' ? now : null,
      },
    });
    return NextResponse.json({ success: true, data: created });
  } catch (err) {
    console.error('Failed to create FAQ:', err);
    return NextResponse.json({ success: false, error: 'Failed to create FAQ' }, { status: 500 });
  }
}
