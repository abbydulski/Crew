'use client';

import { useEffect, useMemo, useState } from 'react';
import PageLoading from '@/components/PageLoading';
import RoleModal from './RoleModal';

export interface Role {
  id: string;
  title: string;
  description: string;
  team: string;
  officeLocation: string | null;
  employmentType: string | null;
  relevantPeople: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TeamMember { email: string; name: string; image?: string | null }

const OFFICE_NAMES: Record<string, string> = { LB: 'Long Beach', Vegas: 'Las Vegas', Norcal: 'NorCal' };
const TEAM_ORDER = ['HW', 'SW', 'Field', 'Ops'];

export default function OpenRolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalRole, setModalRole] = useState<Role | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const load = () => {
    fetch('/api/recruiting/roles')
      .then((r) => r.json())
      .then((d) => { if (d.success) setRoles(d.data); })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    load();
    fetch('/api/team-directory')
      .then((r) => r.json())
      .then((d) => { if (d.success) setTeam(d.data); })
      .catch((err) => console.error('Failed to fetch team:', err));
  }, []);

  const grouped = useMemo(() => {
    const map: Record<string, Role[]> = {};
    for (const r of roles) (map[r.team] = map[r.team] || []).push(r);
    return map;
  }, [roles]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this role? Candidates linked to it will keep their role name but lose the link.')) return;
    const res = await fetch(`/api/recruiting/roles/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) load();
    else alert(data.error || 'Failed to delete');
  };

  const teamsWithRoles = TEAM_ORDER.filter((t) => grouped[t]?.length);
  const otherTeams = Object.keys(grouped).filter((t) => !TEAM_ORDER.includes(t)).sort();

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between border-b-2 border-[var(--border)] pb-4">
        <div>
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-[var(--foreground)]">Open Roles</h2>
          <p className="mt-1 font-mono text-[10px] text-[var(--text-secondary)]">{roles.length} open role{roles.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="bg-[var(--foreground)] px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--card-background)] hover:opacity-80">
          + New Role
        </button>
      </div>

      {isLoading ? (
        <PageLoading />
      ) : roles.length === 0 ? (
        <p className="py-20 text-center font-mono text-xs text-[var(--border-light)]">No open roles yet — click + New Role to post one.</p>
      ) : (
        <div className="space-y-6">
          {[...teamsWithRoles, ...otherTeams].map((t) => (
            <section key={t}>
              <h3 className="mb-2 text-[11px] font-black uppercase tracking-[0.15em] text-[var(--foreground)]">{t} <span className="font-mono font-normal text-[var(--border-light)]">({grouped[t].length})</span></h3>
              <div className="border-2 border-[var(--border)]">
                {grouped[t].map((r) => (
                  <RoleCard key={r.id} role={r} team={team} onEdit={() => setModalRole(r)} onDelete={() => handleDelete(r.id)} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {(showCreate || modalRole) && (
        <RoleModal
          role={modalRole}
          team={team}
          onClose={() => { setShowCreate(false); setModalRole(null); }}
          onSaved={() => { setShowCreate(false); setModalRole(null); load(); }}
        />
      )}
    </div>
  );
}

function RoleCard({ role, team, onEdit, onDelete }: { role: Role; team: TeamMember[]; onEdit: () => void; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const nameFor = (email: string) => team.find((m) => m.email === email)?.name || email;
  const preview = role.description.length > 140 ? role.description.slice(0, 140) + '\u2026' : role.description;
  return (
    <div className="flex flex-col border-b border-[var(--border)] bg-[var(--card-background)] p-4 last:border-b-0">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-[var(--foreground)] break-words">{role.title}</p>
          <p className="mt-1 font-mono text-[9px] uppercase tracking-widest text-[var(--text-secondary)]">
            {[role.team, role.officeLocation ? OFFICE_NAMES[role.officeLocation] || role.officeLocation : null, role.employmentType].filter(Boolean).join(' · ')}
          </p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2 font-mono text-[9px]">
          <button onClick={onEdit} className="text-[var(--foreground)] underline hover:no-underline">Edit</button>
          <button onClick={onDelete} className="text-red-600 underline hover:no-underline">Delete</button>
        </div>
      </div>

      <p className="mt-3 whitespace-pre-wrap text-xs text-[var(--text-secondary)] break-words">{expanded ? role.description : preview}</p>
      {role.description.length > 140 && (
        <button onClick={() => setExpanded((v) => !v)} className="mt-1 self-start font-mono text-[9px] text-[var(--foreground)] underline hover:no-underline">
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}

      {role.relevantPeople.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-[var(--border)] pt-3">
          {role.relevantPeople.map((email) => (
            <span key={email} className="bg-[var(--foreground)] px-1.5 py-0.5 font-mono text-[9px] text-[var(--card-background)]">{nameFor(email)}</span>
          ))}
        </div>
      )}
    </div>
  );
}
