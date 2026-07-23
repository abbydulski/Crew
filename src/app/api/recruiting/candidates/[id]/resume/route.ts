import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * Google Drive folder for candidate resumes.
 * Falls back to the same folder used for offer letters if not set.
 */
const RESUME_FOLDER_ID = process.env.RESUME_DRIVE_FOLDER_ID || '1jyDP7tXhYQo-odiDrYxmtii6mwGPPenl';

/** POST /api/recruiting/candidates/[id]/resume — upload a resume file to Google Drive */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const session = await getServerSession(authOptions);
    const accessToken = (session as unknown as Record<string, unknown>)?.accessToken as string;
    if (!accessToken) {
      return NextResponse.json({ success: false, error: 'Not authenticated — please sign in again' }, { status: 401 });
    }

    const candidate = await prisma.candidate.findUnique({ where: { id } });
    if (!candidate) {
      return NextResponse.json({ success: false, error: 'Candidate not found' }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    // Build a multipart/related request for Google Drive upload
    const fileName = `Resume - ${candidate.name} - ${file.name}`;
    const boundary = '---resumeupload' + Date.now();
    const metadata = JSON.stringify({
      name: fileName,
      parents: [RESUME_FOLDER_ID],
    });

    const fileBuffer = Buffer.from(await file.arrayBuffer());

    const body = Buffer.concat([
      Buffer.from(
        `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: ${file.type || 'application/octet-stream'}\r\n\r\n`
      ),
      fileBuffer,
      Buffer.from(`\r\n--${boundary}--`),
    ]);

    const uploadRes = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body,
      }
    );

    if (!uploadRes.ok) {
      const text = await uploadRes.text();
      console.error('Drive upload failed:', text);
      return NextResponse.json({ success: false, error: `Drive upload failed (${uploadRes.status})` }, { status: 500 });
    }

    const driveFile = await uploadRes.json();

    // Save the Drive file info on the candidate
    const updated = await prisma.candidate.update({
      where: { id },
      data: {
        resumeDriveFileId: driveFile.id,
        resumeFileName: file.name,
        resumeWebViewLink: driveFile.webViewLink || `https://drive.google.com/file/d/${driveFile.id}/view`,
      },
      include: { recruiter: { select: { id: true, name: true } } },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    console.error('Resume upload error:', error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

/** GET /api/recruiting/candidates/[id]/resume — redirect to the Drive file */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const candidate = await prisma.candidate.findUnique({
      where: { id },
      select: { resumeWebViewLink: true, resumeDriveFileId: true },
    });

    if (!candidate?.resumeDriveFileId) {
      return NextResponse.json({ success: false, error: 'No resume on file' }, { status: 404 });
    }

    const url = candidate.resumeWebViewLink || `https://drive.google.com/file/d/${candidate.resumeDriveFileId}/view`;
    return NextResponse.redirect(url);
  } catch (error: unknown) {
    console.error('Resume fetch error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch resume' }, { status: 500 });
  }
}
