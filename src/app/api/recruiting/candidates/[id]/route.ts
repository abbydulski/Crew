import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { ensureDeelEmailTicket, notifyTicketSlack, notifyConversionSlack } from '@/lib/onboarding-tickets';

/** PATCH /api/recruiting/candidates/[id] — update a candidate */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, role, roleId, email, phone, linkedin, notes, status, recruiterId, recruiterEmail, startDate, officeLocation, salary, salaryType, manager, equityShares, team, employmentType, conversion, convertedFromCandidateId, personalAddress, offerStatus, offerApproverEmail } = body;

    // Get current candidate before update
    const current = await prisma.candidate.findUnique({ where: { id } });

    // When moving to HIRED, require that offer fields already exist on the candidate
    if (status === 'HIRED' && current?.status !== 'HIRED') {
      if (!current?.startDate || !current?.officeLocation || !current?.salary || !current?.manager) {
        return NextResponse.json(
          { success: false, error: 'Candidate must have offer details before being hired' },
          { status: 400 }
        );
      }
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (roleId !== undefined) {
      updateData.roleId = roleId || null;
      // Snapshot the role title from the linked Role for display continuity.
      if (roleId) {
        const r = await prisma.role.findUnique({ where: { id: roleId }, select: { title: true } });
        if (r) updateData.role = r.title;
      } else if (role === undefined) {
        // If clearing roleId without explicit role, also clear the snapshot.
        updateData.role = null;
      }
    }
    if (role !== undefined) updateData.role = role || null;
    if (email !== undefined) updateData.email = email || null;
    if (phone !== undefined) updateData.phone = phone || null;
    if (linkedin !== undefined) updateData.linkedin = linkedin || null;
    if (notes !== undefined) updateData.notes = notes || null;
    if (status !== undefined) updateData.status = status;
    if (recruiterId !== undefined) updateData.recruiterId = recruiterId || null;
    if (recruiterEmail !== undefined) {
      updateData.recruiterEmail = recruiterEmail ? recruiterEmail.toLowerCase() : null;
      // When a new team-directory recruiter is picked, clear the legacy recruiterId so the new choice wins.
      if (recruiterEmail) updateData.recruiterId = null;
    }
    if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null;
    if (officeLocation !== undefined) updateData.officeLocation = officeLocation || null;
    if (salary !== undefined) updateData.salary = salary !== null ? Number(salary) : null;
    if (salaryType !== undefined) updateData.salaryType = salaryType || null;
    if (manager !== undefined) updateData.manager = manager || null;
    if (equityShares !== undefined) updateData.equityShares = equityShares !== null ? Number(equityShares) : null;
    if (team !== undefined) updateData.team = team || null;
    if (employmentType !== undefined) updateData.employmentType = employmentType || null;
    if (conversion !== undefined) updateData.conversion = conversion;
    if (convertedFromCandidateId !== undefined) updateData.convertedFromCandidateId = convertedFromCandidateId || null;
    if (personalAddress !== undefined) updateData.personalAddress = personalAddress || null;
    if (offerStatus !== undefined) updateData.offerStatus = offerStatus || null;
    if (offerApproverEmail !== undefined) updateData.offerApproverEmail = offerApproverEmail ? offerApproverEmail.toLowerCase() : null;

    // If any offer-related fields changed, clear the generated offer letter so it can be regenerated
    const offerFields = ['salary', 'salaryType', 'manager', 'equityShares', 'startDate', 'officeLocation', 'role', 'name', 'email'];
    const offerFieldChanged = offerFields.some((f) => body[f] !== undefined && body[f] !== (current as Record<string, unknown>)?.[f]);
    if (offerFieldChanged && current?.offerDocId) {
      updateData.offerDocId = null;
      updateData.offerDriveLink = null;
    }

    const candidate = await prisma.candidate.update({
      where: { id },
      data: updateData,
      include: { recruiter: { select: { id: true, name: true } } },
    });

    // Send Slack notification when moved to HIRED
    if (status === 'HIRED' && current?.status !== 'HIRED') {
      try { await sendHiredSlackNotification(candidate.name, candidate.role, candidate.email, candidate.startDate, candidate.officeLocation); } catch (err) { console.error('Slack notification failed:', err); }
    }

    // If now HIRED and start date is within range, ensure the DEEL_EMAIL ticket exists.
    // Also runs when startDate is updated for an already-HIRED candidate (e.g., moved closer).
    // Conversions skip tickets entirely — just send a Slack to Deel webhook.
    const startDateChanged = startDate !== undefined && (current?.startDate?.toISOString() ?? null) !== (candidate.startDate?.toISOString() ?? null);
    const becameHired = status === 'HIRED' && current?.status !== 'HIRED';
    if (candidate.status === 'HIRED' && (becameHired || startDateChanged)) {
      try {
        if (candidate.conversion && becameHired) {
          // Conversion hire: no tickets, just Slack notification to update Deel.
          await notifyConversionSlack(candidate);
          // Flip the original intern's AppUser employmentType so the tracker pill
          // reflects the conversion. The intern stays active (endDate untouched).
          if (candidate.convertedFromCandidateId) {
            try {
              const intern = await prisma.candidate.findUnique({
                where: { id: candidate.convertedFromCandidateId },
                include: { appUser: { select: { id: true } } },
              });
              if (intern?.appUser) {
                await prisma.appUser.update({
                  where: { id: intern.appUser.id },
                  data: { employmentType: candidate.employmentType || 'Full-Time' },
                });
              }
            } catch (err) { console.error('Failed to flip intern employmentType on conversion:', err); }
          }
        } else if (!candidate.conversion) {
          const { created, ticketId } = await ensureDeelEmailTicket(candidate.id);
          if (created && ticketId) {
            const t = await prisma.onboardingTicket.findUnique({
              where: { id: ticketId },
              include: { candidate: { select: { name: true, role: true, startDate: true, officeLocation: true, workEmail: true } } },
            });
            if (t) await notifyTicketSlack({ type: t.type, assigneeEmail: t.assigneeEmail }, t.candidate);
          }
        }
      } catch (err) { console.error('Failed to handle onboarding for hired candidate:', err); }
    }

    return NextResponse.json({ success: true, data: candidate });
  } catch (error) {
    console.error('Failed to update candidate:', error);
    return NextResponse.json({ success: false, error: 'Failed to update candidate' }, { status: 500 });
  }
}

async function sendHiredSlackNotification(
  name: string,
  role: string | null,
  email: string | null,
  startDate: Date | null,
  officeLocation: string | null,
) {
  const webhookUrl = process.env.SLACK_RECRUITING_WEBHOOK_URL;
  if (!webhookUrl) return;

  const OFFICE_NAMES: Record<string, string> = { LB: 'Long Beach', Vegas: 'Las Vegas', Norcal: 'Northern California' };
  const position = role || 'a new position';
  const office = officeLocation ? (OFFICE_NAMES[officeLocation] || officeLocation) : 'TBD';
  const start = startDate
    ? new Date(startDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : 'TBD';

  const lines = [
    `${name} has been hired for ${position}!`,
    `Office: ${office}`,
    `Start Date: ${start}`,
  ];
  if (email) lines.push(`Email: ${email}`);

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: lines.join('\n') }),
  });
}

/** DELETE /api/recruiting/candidates/[id] — delete a candidate */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.candidate.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete candidate:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete candidate' }, { status: 500 });
  }
}

