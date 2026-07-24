import type { OnboardingTicketType } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { OFFICE_NAMES } from '@/lib/constants';

export interface TicketTypeConfig {
  type: OnboardingTicketType;
  label: string;
  webhookEnv: string;
}

export const TICKET_TYPES: TicketTypeConfig[] = [
  { type: 'DEEL_EMAIL', label: 'Deel + Email', webhookEnv: 'SLACK_TICKET_DEEL_WEBHOOK_URL' },
  { type: 'OFFICE',     label: 'Office',       webhookEnv: 'SLACK_TICKET_OFFICE_WEBHOOK_URL' },
  { type: 'SAFETY',     label: 'Safety',       webhookEnv: 'SLACK_TICKET_SAFETY_WEBHOOK_URL' },
  { type: 'TRUCK',      label: 'Truck',        webhookEnv: 'SLACK_TICKET_TRUCK_WEBHOOK_URL' },
  { type: 'IT',         label: 'IT',           webhookEnv: 'SLACK_TICKET_IT_WEBHOOK_URL' },
  { type: 'ONE_WEEK',   label: 'One Week',     webhookEnv: 'SLACK_TICKET_ONE_WEEK_WEBHOOK_URL' },
];

export const FOLLOW_ON_TYPES: OnboardingTicketType[] = ['OFFICE', 'SAFETY', 'TRUCK', 'IT'];

export function getTicketConfig(type: OnboardingTicketType): TicketTypeConfig {
  const cfg = TICKET_TYPES.find((t) => t.type === type);
  if (!cfg) throw new Error(`Unknown ticket type: ${type}`);
  return cfg;
}

// ── Checklist items per ticket type ──────────────────────────────────────────

export interface ChecklistItemDef {
  key: string;
  label: string;
  /** External URL to link the label to */
  link?: string;
  /** Only show this item when the candidate matches a condition */
  condition?: { field: 'officeLocation' | 'team'; value: string };
  /** Text-input metadata fields to capture when completing this item */
  metaFields?: { key: string; label: string }[];
  /** Allow marking as N/A instead of done */
  allowNA?: boolean;
}

export const TICKET_CHECKLISTS: Partial<Record<OnboardingTicketType, ChecklistItemDef[]>> = {
  DEEL_EMAIL: [
    { key: 'added_to_deel', label: 'Added to Deel', link: 'https://app.deel.com/' },
  ],
  OFFICE: [
    { key: 'order_desk', label: 'Order desk' },
    { key: 'confirm_desk_space', label: 'Confirm desk space' },
  ],
  SAFETY: [
    { key: 'confined_space', label: 'Confined Space', allowNA: true },
    { key: 'excavation_trenching', label: 'Excavation and Trenching', allowNA: true },
    { key: 'competent_persons', label: 'Competent Persons', allowNA: true },
    { key: 'defensive_driving', label: 'Defensive Driving', allowNA: true },
    { key: 'osha_10', label: 'OSHA-10', allowNA: true },
    { key: 'cpr_first_aid', label: 'CPR/First Aid', allowNA: true },
    { key: 'immigration_forms', label: 'Immigration forms triggered', condition: { field: 'officeLocation', value: 'Vegas' } },
  ],
  TRUCK: [
    { key: 'purchase_locate_equipment', label: 'Purchase locate equipment' },
    { key: 'purchase_truck_equipment', label: 'Purchase truck equipment' },
    { key: 'purchase_truck', label: 'Purchase truck', metaFields: [
      { key: 'licensePlate', label: 'License plate' },
      { key: 'make', label: 'Make' },
      { key: 'model', label: 'Model' },
      { key: 'year', label: 'Year' },
      { key: 'color', label: 'Color' },
    ]},
    { key: 'installation', label: 'Installation' },
  ],
  ONE_WEEK: [
    { key: 'email_supervisor', label: 'Email to supervisor' },
    { key: 'email_candidate', label: 'Email to candidate with email, temp password, and building access' },
    { key: 'add_to_slack', label: 'Add them to Slack' },
    { key: 'add_to_confluence', label: 'Add them to Confluence' },
    { key: 'add_to_google_drive', label: 'Add to Google Drive' },
    { key: 'give_ramp_card', label: 'Give them a Ramp card' },
    { key: 'add_to_gcal', label: 'Add to Google Calendar' },
  ],
};

/** Due date offset in days relative to the candidate's start date. */
export const TICKET_DUE_OFFSETS: Partial<Record<OnboardingTicketType, number>> = {
  OFFICE:   -7,   // 1 week before start
  SAFETY:   -7,   // 1 week before start
  TRUCK:     0,   // start date
  ONE_WEEK: -7,   // 1 week before start
};

export function computeTicketDueDate(type: OnboardingTicketType, startDate: Date | null): Date | null {
  if (!startDate) return null;
  const offset = TICKET_DUE_OFFSETS[type];
  if (offset === undefined) return null;
  const due = new Date(startDate);
  due.setDate(due.getDate() + offset);
  return due;
}

/** Filter checklist items that apply to a given candidate. */
export function applicableChecklist(
  type: OnboardingTicketType,
  candidate: { officeLocation?: string | null; team?: string | null },
): ChecklistItemDef[] {
  const defs = TICKET_CHECKLISTS[type];
  if (!defs) return [];
  return defs.filter((item) => {
    if (!item.condition) return true;
    const val = candidate[item.condition.field];
    return val === item.condition.value;
  });
}

/** Build the initial `data` JSON for a ticket, with empty checklist state. */
export function buildInitialTicketData(
  type: OnboardingTicketType,
  candidate: { officeLocation?: string | null; team?: string | null },
): Record<string, unknown> {
  const items = applicableChecklist(type, candidate);
  if (items.length === 0) return {};
  const checklist: Record<string, { completedAt: null; completedBy: null; meta?: Record<string, string> }> = {};
  for (const item of items) {
    const entry: { completedAt: null; completedBy: null; meta?: Record<string, string> } = { completedAt: null, completedBy: null };
    if (item.metaFields) {
      entry.meta = {};
      for (const mf of item.metaFields) entry.meta[mf.key] = '';
    }
    checklist[item.key] = entry;
  }
  return { checklist };
}

interface HireForSlack {
  name: string;
  role: string | null;
  startDate: Date | null;
  officeLocation: string | null;
  workEmail?: string | null;
}

interface TicketForSlack {
  type: OnboardingTicketType;
  assigneeEmail: string | null;
}


export async function notifyTicketSlack(ticket: TicketForSlack, hire: HireForSlack) {
  const cfg = getTicketConfig(ticket.type);
  const webhookUrl = process.env[cfg.webhookEnv];
  if (!webhookUrl) return;
  try {
    const start = hire.startDate
      ? new Date(hire.startDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      : 'TBD';
    const office = hire.officeLocation ? (OFFICE_NAMES[hire.officeLocation] || hire.officeLocation) : 'TBD';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
    const ticketLink = appUrl ? `<${appUrl}/onboarding/tickets|ticket>` : 'ticket';
    const lines: string[] = [
      `New ${cfg.label} ${ticketLink} for *${hire.name}*`,
      `Role: ${hire.role || 'TBD'}`,
      `Office: ${office}`,
      `Start date: ${start}`,
    ];
    if (ticket.assigneeEmail) {
      // Look up Slack user ID for @mention
      const assignee = await prisma.appUser.findUnique({
        where: { email: ticket.assigneeEmail },
        select: { slackUserId: true, name: true },
      });
      const mention = assignee?.slackUserId ? ` (<@${assignee.slackUserId}>)` : '';
      const displayName = assignee?.name || ticket.assigneeEmail;
      lines.push(`Assigned to: ${displayName}${mention}`);
    }
    if (hire.workEmail) lines.push(`Work email: ${hire.workEmail}`);
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: lines.join('\n'), mrkdwn: true }),
    });
  } catch (err) {
    console.error(`Failed to send Slack notification for ${cfg.label} ticket:`, err);
  }
}

/**
 * Send a Slack notification to the Deel webhook for a conversion hire.
 * No tickets are created — just a message to update their Deel info.
 */
export async function notifyConversionSlack(candidate: {
  name: string;
  role: string | null;
  startDate: Date | null;
  officeLocation: string | null;
}) {
  const webhookUrl = process.env.SLACK_TICKET_DEEL_WEBHOOK_URL;
  if (!webhookUrl) return;
  try {
    const start = candidate.startDate
      ? new Date(candidate.startDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      : 'TBD';
    const office = candidate.officeLocation ? (OFFICE_NAMES[candidate.officeLocation] || candidate.officeLocation) : 'TBD';
    const lines: string[] = [
      `⚡ *Conversion* — Update Deel for *${candidate.name}*`,
      `Role: ${candidate.role || 'TBD'}`,
      `Office: ${office}`,
      `Start date: ${start}`,
      `Please update their Deel contract accordingly.`,
    ];
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: lines.join('\n'), mrkdwn: true }),
    });
  } catch (err) {
    console.error('Failed to send conversion Slack notification:', err);
  }
}

/**
 * Look up the default assignee for a ticket type from the AppUser directory.
 * Returns the email of the first AppUser whose defaultTicketTypes JSON array includes the type.
 */
export async function getDefaultAssignee(type: OnboardingTicketType): Promise<string | null> {
  const users = await prisma.appUser.findMany({
    where: { defaultTicketTypes: { not: Prisma.JsonNull } },
    select: { email: true, defaultTicketTypes: true },
  });
  for (const u of users) {
    const types = u.defaultTicketTypes as string[] | null;
    if (Array.isArray(types) && types.includes(type)) return u.email;
  }
  return null;
}

/**
 * Idempotent: create the DEEL_EMAIL ticket for a hire if they're within 30 days of
 * start date and don't already have one. Returns the ticket if created (so the caller
 * can fire Slack), or null if no-op.
 */
export async function ensureDeelEmailTicket(candidateId: string): Promise<{ created: boolean; ticketId: string | null }> {
  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
    select: { id: true, status: true, startDate: true, officeLocation: true, team: true, conversion: true },
  });
  if (!candidate) return { created: false, ticketId: null };
  if (candidate.status !== 'HIRED') return { created: false, ticketId: null };
  if (candidate.conversion) return { created: false, ticketId: null }; // Conversions skip tickets
  if (!candidate.startDate) return { created: false, ticketId: null };
  const days = Math.ceil((candidate.startDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days > 21) return { created: false, ticketId: null };

  const existing = await prisma.onboardingTicket.findUnique({
    where: { candidateId_type: { candidateId, type: 'DEEL_EMAIL' } },
    select: { id: true },
  });
  if (existing) return { created: false, ticketId: existing.id };

  const dueDate = computeTicketDueDate('DEEL_EMAIL', candidate.startDate);
  const ticketData = buildInitialTicketData('DEEL_EMAIL', candidate);
  const assigneeEmail = await getDefaultAssignee('DEEL_EMAIL');
  const ticket = await prisma.onboardingTicket.create({
    data: { candidateId, type: 'DEEL_EMAIL', ...(assigneeEmail ? { assigneeEmail } : {}), ...(dueDate ? { dueDate } : {}), ...(Object.keys(ticketData).length ? { data: ticketData as unknown as Record<string, never> } : {}) },
    select: { id: true },
  });
  return { created: true, ticketId: ticket.id };
}

/**
 * Idempotent: create the ONE_WEEK ticket for a hire if they're within 7 days of
 * start date and don't already have one.
 */
export async function ensureOneWeekTicket(candidateId: string): Promise<{ created: boolean; ticketId: string | null }> {
  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
    select: { id: true, status: true, startDate: true, officeLocation: true, team: true, conversion: true },
  });
  if (!candidate) return { created: false, ticketId: null };
  if (candidate.status !== 'HIRED') return { created: false, ticketId: null };
  if (candidate.conversion) return { created: false, ticketId: null }; // Conversions skip tickets
  if (!candidate.startDate) return { created: false, ticketId: null };
  const days = Math.ceil((candidate.startDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days > 7) return { created: false, ticketId: null };

  const existing = await prisma.onboardingTicket.findUnique({
    where: { candidateId_type: { candidateId, type: 'ONE_WEEK' } },
    select: { id: true },
  });
  if (existing) return { created: false, ticketId: existing.id };

  const dueDate = computeTicketDueDate('ONE_WEEK', candidate.startDate);
  const ticketData = buildInitialTicketData('ONE_WEEK', candidate);
  const assigneeEmail = await getDefaultAssignee('ONE_WEEK');
  const ticket = await prisma.onboardingTicket.create({
    data: { candidateId, type: 'ONE_WEEK', ...(assigneeEmail ? { assigneeEmail } : {}), ...(dueDate ? { dueDate } : {}), ...(Object.keys(ticketData).length ? { data: ticketData as unknown as Record<string, never> } : {}) },
    select: { id: true },
  });
  return { created: true, ticketId: ticket.id };
}

/** Ticket types that are only for Field team candidates */
const FIELD_ONLY_TYPES: OnboardingTicketType[] = ['SAFETY', 'TRUCK'];

/**
 * Create the follow-on tickets for a hire if they don't already exist.
 * Safety and Truck tickets are only created for Field team candidates.
 * Returns the list of newly created ticket IDs (so the caller can fire Slack for each).
 */
export async function createFollowOnTickets(candidateId: string): Promise<string[]> {
  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
    select: { startDate: true, officeLocation: true, team: true },
  });
  const created: string[] = [];
  for (const type of FOLLOW_ON_TYPES) {
    // Safety and Truck tickets are only for Field team
    if (FIELD_ONLY_TYPES.includes(type) && candidate?.team !== 'Field') continue;
    const existing = await prisma.onboardingTicket.findUnique({
      where: { candidateId_type: { candidateId, type } },
      select: { id: true },
    });
    if (existing) continue;
    const dueDate = candidate ? computeTicketDueDate(type, candidate.startDate) : null;
    const ticketData = candidate ? buildInitialTicketData(type, candidate) : {};
    const assigneeEmail = await getDefaultAssignee(type);
    const ticket = await prisma.onboardingTicket.create({
      data: { candidateId, type, ...(assigneeEmail ? { assigneeEmail } : {}), ...(dueDate ? { dueDate } : {}), ...(Object.keys(ticketData).length ? { data: ticketData as unknown as Record<string, never> } : {}) },
      select: { id: true },
    });
    created.push(ticket.id);
  }
  return created;
}
