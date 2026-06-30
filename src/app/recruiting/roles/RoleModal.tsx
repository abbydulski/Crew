'use client';

import { useState } from 'react';
import type { Role, TeamMember } from './page';

const TEAM_OPTIONS = ['HW', 'SW', 'Field', 'Ops'];
const OFFICE_OPTIONS: { value: string; label: string }[] = [
  { value: 'LB', label: 'Long Beach' },
  { value: 'Vegas', label: 'Las Vegas' },
  { value: 'Norcal', label: 'NorCal' },
];
const EMPLOYMENT_OPTIONS = ['Full-Time', 'Part-Time', 'Intern'];

export default function RoleModal({ role, team, onClose, onSaved }: {
  role: Role | null;
  team: TeamMember[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(role?.title || '');
  const [description, setDescription] = useState(role?.description || '');
  const [teamValue, setTeamValue] = useState(role?.team || '');
  const [officeLocation, setOfficeLocation] = useState(role?.officeLocation || '');
  const [employmentType, setEmploymentType] = useState(role?.employmentType || '');
  const [relevantPeople, setRelevantPeople] = useState<string[]>(role?.relevantPeople || []);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const togglePerson = (email: string) => {
    setRelevantPeople((prev) => prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError('Title is required'); return; }
    if (!description.trim()) { setError('Description is required'); return; }
    if (!teamValue) { setError('Team is required'); return; }
    setSubmitting(true); setError('');
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        team: teamValue,
        officeLocation: officeLocation || null,
        employmentType: employmentType || null,
        relevantPeople,
      };
      const url = role ? `/api/recruiting/roles/${role.id}` : '/api/recruiting/roles';
      const res = await fetch(url, {
        method: role ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to save');
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto border-2 border-[var(--border)] bg-[var(--card-background)] p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between border-b-2 border-[var(--border)] pb-3">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--foreground)]">{role ? 'Edit Role' : 'New Role'}</h3>
          <button onClick={onClose} className="text-[var(--border-light)] hover:text-[var(--foreground)]">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Title *</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-[var(--border)] px-3 py-2 text-sm" placeholder="e.g. Senior Field Technician" />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Team *</label>
              <select value={teamValue} onChange={(e) => setTeamValue(e.target.value)}
                className="w-full border border-[var(--border)] px-3 py-2 text-sm">
                <option value="">Select...</option>
                {TEAM_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Office</label>
              <select value={officeLocation} onChange={(e) => setOfficeLocation(e.target.value)}
                className="w-full border border-[var(--border)] px-3 py-2 text-sm">
                <option value="">Any</option>
                {OFFICE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Employment Type</label>
              <select value={employmentType} onChange={(e) => setEmploymentType(e.target.value)}
                className="w-full border border-[var(--border)] px-3 py-2 text-sm">
                <option value="">Any</option>
                {EMPLOYMENT_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Description *</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={8}
              className="w-full border border-[var(--border)] px-3 py-2 text-sm" placeholder="Job description, responsibilities, requirements..." />
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Relevant people</label>
            <p className="mb-2 font-mono text-[9px] text-[var(--border-light)]">Tag team members involved with this role.</p>
            <div className="flex flex-wrap gap-1.5 border border-[var(--border)] p-2 max-h-48 overflow-y-auto">
              {team.length === 0 ? (
                <p className="font-mono text-[9px] text-[var(--border-light)]">Loading team...</p>
              ) : team.map((m) => {
                const selected = relevantPeople.includes(m.email);
                return (
                  <button key={m.email} type="button" onClick={() => togglePerson(m.email)}
                    className={`px-2 py-0.5 font-mono text-[9px] font-bold ${selected ? 'bg-[var(--foreground)] text-[var(--card-background)]' : 'bg-[var(--background)] text-[var(--text-secondary)] hover:bg-[var(--border-light)]'}`}>
                    {m.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t-2 border-[var(--border)] pt-4">
            <button type="button" onClick={onClose} className="border border-[var(--border)] px-4 py-2 font-mono text-[10px] font-bold uppercase text-[var(--foreground)] hover:bg-[var(--background)]">Cancel</button>
            <button type="submit" disabled={submitting}
              className="bg-[var(--foreground)] px-4 py-2 font-mono text-[10px] font-bold uppercase text-[var(--card-background)] hover:opacity-80 disabled:opacity-50">
              {submitting ? 'Saving...' : role ? 'Save' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
