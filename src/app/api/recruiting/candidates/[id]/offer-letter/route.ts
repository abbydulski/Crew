import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { OFFICE_ADDRESSES } from '@/lib/constants';

const TEMPLATE_IDS: Record<string, string> = {
  CA: process.env.OFFER_TEMPLATE_CA || '',
  NV: process.env.OFFER_TEMPLATE_NV || '',
};

const DRIVE_FOLDER_ID = process.env.OFFER_DRIVE_FOLDER_ID || '';

function getTemplateId(office: string): string {
  if (office === 'Vegas') return TEMPLATE_IDS.NV;
  return TEMPLATE_IDS.CA;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

async function googleFetch(accessToken: string, url: string, options: RequestInit = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google API error (${res.status}): ${text}`);
  }
  return res;
}

/** GET /api/recruiting/candidates/[id]/offer-letter — generate offer letter via Google Docs */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const session = await getServerSession(authOptions);
    const accessToken = (session as unknown as Record<string, unknown>)?.accessToken as string;
    if (!accessToken) {
      return NextResponse.json({ success: false, error: 'Not authenticated — please sign in again' }, { status: 401 });
    }

    const candidate = await prisma.candidate.findUnique({
      where: { id },
      include: { recruiter: { select: { id: true, name: true } } },
    });

    if (!candidate) {
      return NextResponse.json({ success: false, error: 'Candidate not found' }, { status: 404 });
    }

    // Resolve manager email -> display name (when manager value is an AppUser email)
    let managerName = candidate.manager || '';
    if (managerName && managerName.includes('@')) {
      const user = await prisma.appUser.findUnique({ where: { email: managerName.toLowerCase() } });
      if (user?.name) managerName = user.name;
    }

    if (candidate.status !== 'OFFER' || (candidate.offerStatus !== 'COMPLETE' && candidate.offerStatus !== 'APPROVED')) {
      return NextResponse.json({ success: false, error: 'Candidate must have a completed offer' }, { status: 400 });
    }

    // If already generated, return existing doc info
    if (candidate.offerDocId && candidate.offerDriveLink) {
      return NextResponse.json({ success: true, driveLink: candidate.offerDriveLink, docId: candidate.offerDocId, fileName: `Offer Letter - ${candidate.name}`, alreadyGenerated: true });
    }

    const office = candidate.officeLocation || 'LB';
    const templateId = getTemplateId(office);

    const salaryStr = candidate.salary
      ? candidate.salaryType === 'HOURLY'
        ? `${candidate.salary.toLocaleString()}/hr`
        : `${candidate.salary.toLocaleString()}/yr`
      : '';

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 14);

    const fileName = `Offer Letter - ${candidate.name} - ${formatDate(new Date())}`;

    // 1. Copy the template to the offers folder
    const copyRes = await googleFetch(accessToken,
      `https://www.googleapis.com/drive/v3/files/${templateId}/copy`,
      {
        method: 'POST',
        body: JSON.stringify({ name: fileName, parents: [DRIVE_FOLDER_ID] }),
      }
    );
    const { id: docId } = await copyRes.json();

    // 2. Find/replace all placeholders
    const replacements: Record<string, string> = {
      '{{name}}': candidate.name || '',
      '{{start_date}}': candidate.startDate ? formatDate(new Date(candidate.startDate)) : '',
      '{{due_date}}': formatDate(dueDate),
      '{{position}}': candidate.role || '',
      '{{manager}}': managerName,
      '{{office_address}}': OFFICE_ADDRESSES[office] || OFFICE_ADDRESSES.LB,
      '{{salary}}': salaryStr,
      '{{equity}}': candidate.equityShares ? candidate.equityShares.toLocaleString() : '0',
      '{{Email}}': candidate.email || '',
      '{{email}}': candidate.email || '',
      '{{current_date}}': formatDate(new Date()),
    };

    const requests = Object.entries(replacements).map(([placeholder, value]) => ({
      replaceAllText: {
        containsText: { text: placeholder, matchCase: true },
        replaceText: value,
      },
    }));

    await googleFetch(accessToken,
      `https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`,
      { method: 'POST', body: JSON.stringify({ requests }) }
    );

    // 3. Save doc ID on candidate so we don't regenerate
    const driveLink = `https://docs.google.com/document/d/${docId}/edit`;

    await prisma.candidate.update({
      where: { id },
      data: { offerDocId: docId, offerDriveLink: driveLink },
    });

    return NextResponse.json({ success: true, driveLink, docId, fileName });
  } catch (error: unknown) {
    console.error('Failed to generate offer letter:', error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: `Failed to generate offer letter: ${msg}` }, { status: 500 });
  }
}

