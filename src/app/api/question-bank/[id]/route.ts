import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';
import { QUESTION_BANK_TEAMS, TEAM_QUESTION_TAGS } from '@/lib/constants';

const VALID_TEAMS = new Set<string>(QUESTION_BANK_TEAMS);

function sanitizeTags(team: string, tags: unknown): string[] {
  const allowed = TEAM_QUESTION_TAGS[team];
  if (!allowed || !Array.isArray(tags)) return [];
  const allowedSet = new Set(allowed);
  return [...new Set(tags.map(String))].filter((t) => allowedSet.has(t));
}

/** PATCH /api/question-bank/[id] — update a question (recruiting only) */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    const denial = requireAdmin(session?.user?.email);
    if (denial) return denial;

    const existing = await prisma.interviewQuestion.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }

    const body = await request.json();
    const data: {
      team?: string;
      tags?: string[];
      question?: string;
      answer?: string | null;
      difficulty?: string | null;
    } = {};

    // Resolve the effective team first so tags can be validated against it.
    let effectiveTeam = existing.team;
    if (typeof body.team === 'string') {
      const t = body.team.trim();
      if (!VALID_TEAMS.has(t)) {
        return NextResponse.json({ success: false, error: 'Invalid team' }, { status: 400 });
      }
      data.team = t;
      effectiveTeam = t;
    }
    if (body.tags !== undefined) {
      data.tags = sanitizeTags(effectiveTeam, body.tags);
    } else if (data.team) {
      // Team changed but tags not sent — drop tags no longer valid for new team.
      data.tags = sanitizeTags(effectiveTeam, existing.tags);
    }
    if (typeof body.question === 'string') {
      const q = body.question.trim();
      if (!q) return NextResponse.json({ success: false, error: 'Question cannot be empty' }, { status: 400 });
      data.question = q;
    }
    if (body.answer !== undefined) {
      const a = typeof body.answer === 'string' ? body.answer.trim() : '';
      data.answer = a || null;
    }
    if (body.difficulty !== undefined) {
      const d = typeof body.difficulty === 'string' ? body.difficulty.trim() : '';
      data.difficulty = d || null;
    }

    const updated = await prisma.interviewQuestion.update({ where: { id }, data });
    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    console.error('Failed to update interview question:', err);
    return NextResponse.json({ success: false, error: 'Failed to update question' }, { status: 500 });
  }
}

/** DELETE /api/question-bank/[id] — hard delete (recruiting only) */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    const denial = requireAdmin(session?.user?.email);
    if (denial) return denial;

    await prisma.interviewQuestion.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Failed to delete interview question:', err);
    return NextResponse.json({ success: false, error: 'Failed to delete question' }, { status: 500 });
  }
}
