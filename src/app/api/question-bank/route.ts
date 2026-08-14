import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';
import { QUESTION_BANK_TEAMS, TEAM_QUESTION_TAGS } from '@/lib/constants';

const VALID_TEAMS = new Set<string>(QUESTION_BANK_TEAMS);

/** Keep only tags allowed for the given team; empty array for teams without tags. */
function sanitizeTags(team: string, tags: unknown): string[] {
  const allowed = TEAM_QUESTION_TAGS[team];
  if (!allowed || !Array.isArray(tags)) return [];
  const allowedSet = new Set(allowed);
  return [...new Set(tags.map(String))].filter((t) => allowedSet.has(t));
}

/** GET /api/question-bank?team=Hardware&tag=Electrical — list/filter (recruiting only) */
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  const denial = requireAdmin(session?.user?.email);
  if (denial) return denial;

  const { searchParams } = new URL(request.url);
  const team = searchParams.get('team');
  const tag = searchParams.get('tag');

  const items = await prisma.interviewQuestion.findMany({
    where: {
      ...(team && VALID_TEAMS.has(team) ? { team } : {}),
      ...(tag ? { tags: { has: tag } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 1000,
  });
  return NextResponse.json({ success: true, data: items });
}

/** POST /api/question-bank — create a question (recruiting only) */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const denial = requireAdmin(session?.user?.email);
    if (denial) return denial;

    const body = await request.json();
    const team = String(body.team || '').trim();
    const question = String(body.question || '').trim();
    const answer = typeof body.answer === 'string' ? body.answer.trim() : '';
    const difficulty = typeof body.difficulty === 'string' ? body.difficulty.trim() : '';

    if (!VALID_TEAMS.has(team)) {
      return NextResponse.json({ success: false, error: 'Invalid team' }, { status: 400 });
    }
    if (!question) {
      return NextResponse.json({ success: false, error: 'Question required' }, { status: 400 });
    }

    const email = session!.user!.email!.toLowerCase();
    const created = await prisma.interviewQuestion.create({
      data: {
        team,
        tags: sanitizeTags(team, body.tags),
        question,
        answer: answer || null,
        difficulty: difficulty || null,
        createdBy: email,
        createdByName: session?.user?.name || null,
      },
    });
    return NextResponse.json({ success: true, data: created });
  } catch (err) {
    console.error('Failed to create interview question:', err);
    return NextResponse.json({ success: false, error: 'Failed to create question' }, { status: 500 });
  }
}
