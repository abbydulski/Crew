'use client';

import { useState, useEffect } from 'react';
import PageLoading from '@/components/PageLoading';

const ALL_TICKET_TYPES = [
  { value: 'DEEL_EMAIL', label: 'Deel + Email' },
  { value: 'OFFICE', label: 'Office' },
  { value: 'SAFETY', label: 'Safety' },
  { value: 'TRUCK', label: 'Truck' },
  { value: 'IT', label: 'IT' },
  { value: 'ONE_WEEK', label: 'One Week' },
] as const;

interface TeamMember {
  id: string;
  name: string;
  email: string;
  image: string | null;
  defaultTicketTypes: string[];
  slackUserId: string | null;
  lastLogin: string;
  joinedAt: string;
}

export default function TeamDirectoryPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState<string | null>(null);
  const [editingSlack, setEditingSlack] = useState<string | null>(null);
  const [slackInput, setSlackInput] = useState('');

  const load = () => {
    fetch('/api/team-directory')
      .then((r) => r.json())
      .then((d) => { if (d.success) setMembers(d.data); })
      .catch((err) => console.error('Failed to fetch team:', err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => { load(); }, []);

  const toggleTicketType = async (member: TeamMember, ticketType: string) => {
    const current = member.defaultTicketTypes || [];
    const next = current.includes(ticketType)
      ? current.filter((t) => t !== ticketType)
      : [...current, ticketType];
    setSaving(member.id);
    try {
      const res = await fetch('/api/team-directory', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: member.id, defaultTicketTypes: next }),
      });
      const data = await res.json();
      if (data.success) {
        setMembers((prev) => prev.map((m) => m.id === member.id ? { ...m, defaultTicketTypes: next } : m));
      }
    } catch (err) { console.error('Failed to update ticket types:', err); }
    finally { setSaving(null); }
  };

  const filtered = members.filter((m) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q);
  });

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between border-b border-[var(--border)] pb-4">
        <div>
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-[var(--foreground)]">Team Directory</h2>
          <p className="mt-1 text-[11px] text-[var(--text-secondary)]">{members.length} team member{members.length !== 1 ? 's' : ''}</p>
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name or email..."
          className="border border-[var(--border)] bg-[var(--card-background)] px-3 py-1.5 text-[11px] w-64"
        />
      </div>

      {isLoading ? (
        <PageLoading />
      ) : filtered.length === 0 ? (
        <p className="py-20 text-center text-[11px] uppercase tracking-wider text-[var(--border-light)]">
          {members.length === 0 ? 'No team members yet — they\'ll appear here after logging in' : 'No members match your search'}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-0 border border-[var(--border)] sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((m, i) => (
            <div key={m.id} className={`flex flex-col gap-3 bg-[var(--card-background)] p-4 border-[var(--border-light)] ${i >= 1 ? 'border-t lg:border-t-0' : ''} ${i % 3 !== 0 ? 'lg:border-l' : ''} ${i >= 3 ? 'lg:border-t' : ''} ${i % 2 !== 0 ? 'sm:border-l' : ''} ${i >= 2 ? 'sm:border-t lg:border-t-0' : ''}`}>
              <div className="flex items-start gap-4">
                {m.image ? (
                  <img src={m.image} alt={m.name} className="h-10 w-10 object-cover shrink-0" referrerPolicy="no-referrer" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center bg-[var(--foreground)] text-[10px] font-black text-[var(--background)] shrink-0">
                    {m.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-black text-sm text-[var(--foreground)] truncate">{m.name}</p>
                  <a href={`mailto:${m.email}`} className="block text-[10px] text-[var(--text-secondary)] hover:text-[var(--foreground)] truncate">{m.email}</a>
                  <div className="mt-1 flex items-center gap-2 text-[9px] uppercase tracking-wider text-[var(--border-light)]">
                    <span>Joined {formatDate(m.joinedAt)}</span>
                    <span>·</span>
                    <span>Last {formatDate(m.lastLogin)}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex flex-wrap gap-1 flex-1">
                  {ALL_TICKET_TYPES.map((tt) => {
                    const active = m.defaultTicketTypes.includes(tt.value);
                    return (
                      <button
                        key={tt.value}
                        onClick={() => toggleTicketType(m, tt.value)}
                        disabled={saving === m.id}
                        className={`px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.15em] border transition-colors ${
                          active
                            ? 'bg-[var(--foreground)] text-[var(--background)] border-[var(--foreground)]'
                            : 'bg-transparent text-[var(--border-light)] border-[var(--border-light)] hover:border-[var(--foreground)]'
                        }`}
                      >
                        {tt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs">
                {editingSlack === m.id ? (
                  <>
                    <input
                      type="text"
                      value={slackInput}
                      onChange={(e) => setSlackInput(e.target.value)}
                      placeholder="U04ABCD1234"
                      className="w-28 border border-[var(--border)] bg-[var(--card-background)] px-2 py-0.5 text-[10px]"
                      autoFocus
                    />
                    <button
                      onClick={async () => {
                        setSaving(m.id);
                        try {
                          const res = await fetch('/api/team-directory', {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ userId: m.id, slackUserId: slackInput.trim() || null }),
                          });
                          const data = await res.json();
                          if (data.success) {
                            setMembers((prev) => prev.map((x) => x.id === m.id ? { ...x, slackUserId: slackInput.trim() || null } : x));
                          }
                        } catch (err) { console.error('Failed to save Slack ID:', err); }
                        finally { setSaving(null); setEditingSlack(null); }
                      }}
                      disabled={saving === m.id}
                      className="text-[9px] font-black uppercase tracking-wider text-[var(--foreground)] hover:underline"
                    >Save</button>
                    <button onClick={() => setEditingSlack(null)} className="text-[9px] uppercase tracking-wider text-[var(--border-light)] hover:underline">Cancel</button>
                  </>
                ) : (
                  <button
                    onClick={() => { setEditingSlack(m.id); setSlackInput(m.slackUserId || ''); }}
                    className="text-[9px] uppercase tracking-wider text-[var(--border-light)] hover:text-[var(--foreground)]"
                  >
                    {m.slackUserId ? `Slack: ${m.slackUserId}` : '+ Slack ID'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
