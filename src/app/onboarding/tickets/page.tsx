'use client';

import { useEffect, useMemo, useState } from 'react';
import PageLoading from '@/components/PageLoading';
import TicketCard from './TicketCard';

export type TicketType = 'DEEL_EMAIL' | 'OFFICE' | 'SAFETY' | 'TRUCK' | 'IT' | 'ONE_WEEK';
export type TicketStatus = 'OPEN' | 'DONE';

export interface ChecklistItemState {
  completedAt: string | null;
  completedBy: string | null;
  naAt?: string | null;
  naBy?: string | null;
  meta?: Record<string, string>;
}

export interface Ticket {
  id: string;
  candidateId: string;
  type: TicketType;
  status: TicketStatus;
  assigneeEmail: string | null;
  notes: string | null;
  dueDate: string | null;
  data: { checklist?: Record<string, ChecklistItemState> } | null;
  createdAt: string;
  completedAt: string | null;
  completedBy: string | null;
  candidate: {
    id: string;
    name: string;
    email: string | null;
    role: string | null;
    startDate: string | null;
    officeLocation: string | null;
    team: string | null;
    workEmail: string | null;
    status: string;
  };
}

const TYPE_LABELS: Record<TicketType, string> = {
  DEEL_EMAIL: 'Deel + Email',
  OFFICE: 'Office',
  SAFETY: 'Safety',
  TRUCK: 'Truck',
  IT: 'IT',
  ONE_WEEK: 'One Week',
};

const TYPES: TicketType[] = ['DEEL_EMAIL', 'OFFICE', 'SAFETY', 'TRUCK', 'IT', 'ONE_WEEK'];

export interface TeamMember { email: string; name: string }

export default function OnboardingTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'ALL'>('OPEN');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = () => {
    fetch('/api/onboarding/tickets')
      .then((r) => r.json())
      .then((d) => { if (d.success) setTickets(d.data); })
      .finally(() => setIsLoading(false));
  };
  useEffect(() => {
    load();
    fetch('/api/team-directory')
      .then((r) => r.json())
      .then((d) => { if (d.success) setTeam(d.data.map((m: { email: string; name: string }) => ({ email: m.email, name: m.name }))); })
      .catch((err) => console.error('Failed to fetch team directory:', err));
  }, []);

  const nameFor = (email: string | null) => team.find((m) => m.email === email)?.name || email || '';

  const updateTicket = async (id: string, patch: Record<string, unknown>) => {
    const res = await fetch(`/api/onboarding/tickets/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to update');
    load();
  };

  const filtered = useMemo(() => tickets.filter((t) => {
    if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
    return true;
  }), [tickets, statusFilter]);

  const grouped = useMemo(() => {
    const byType: Record<string, Ticket[]> = {};
    for (const t of filtered) {
      (byType[t.type] = byType[t.type] || []).push(t);
    }
    return byType;
  }, [filtered]);

  return (
    <div className="px-8 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A1A]">Onboarding Tickets</h1>
          <p className="mt-1 text-sm text-[#6B6B6B]">Completing Deel + Email creates the downstream tickets.</p>
        </div>
        <div className="flex items-center gap-1 rounded border border-[#D4D4D4] bg-white p-0.5">
          {(['ALL', 'OPEN', 'DONE'] as const).map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`rounded px-3 py-1 text-xs font-medium transition-colors ${statusFilter === s ? 'bg-[#1A1A1A] text-white' : 'text-[#6B6B6B] hover:bg-[#F5F5F5]'}`}>
              {s === 'ALL' ? 'All' : s === 'OPEN' ? 'Open' : 'Done'}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <PageLoading />
      ) : filtered.length === 0 ? (
        <p className="py-20 text-center text-sm text-[#999]">No tickets match the current filter.</p>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {TYPES.filter((t) => grouped[t]?.length).map((t) => (
            <div key={t} className="flex w-72 min-w-[288px] flex-col rounded border border-[#D4D4D4] bg-white">
              <div className="rounded-t border-b border-[#E5E5E5] bg-[#FAFAFA] px-4 py-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#1A1A1A]">{TYPE_LABELS[t]}</h3>
                  <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#E5E5E5] px-1.5 text-[10px] font-bold text-[#6B6B6B]">{grouped[t].length}</span>
                </div>
              </div>
              <div className="flex flex-1 flex-col gap-2 p-3">
                {grouped[t].map((ticket) => (
                  <TicketCard key={ticket.id} ticket={ticket} team={team} onUpdate={updateTicket}
                    expanded={expandedId === ticket.id} onToggleExpand={() => setExpandedId(expandedId === ticket.id ? null : ticket.id)}
                    nameFor={nameFor} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
