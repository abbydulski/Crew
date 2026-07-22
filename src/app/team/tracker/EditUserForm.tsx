'use client';

import { useState } from 'react';
import { EMPLOYMENT_TYPE_OPTIONS, OFFICE_OPTIONS, SALARY_TYPE_OPTIONS, TEAM_OPTIONS, TrackerUser } from './types';

interface Props {
  user: TrackerUser;
  showSalary: boolean;
  onSaved: () => Promise<void>;
  managerOptions: { name: string; email: string }[];
}

const inputClass =
  'w-full border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 text-xs font-mono';
const labelClass =
  'mb-1 block text-[9px] font-black uppercase tracking-[0.15em] text-[var(--text-secondary)]';

export default function EditUserForm({ user, showSalary, onSaved, managerOptions }: Props) {
  const [name, setName] = useState(user.name || '');
  const [email, setEmail] = useState(user.email);
  const [startDate, setStartDate] = useState(user.startDate ? user.startDate.slice(0, 10) : '');
  const [role, setRole] = useState(user.role || '');
  const [team, setTeam] = useState(user.team || '');
  const [officeLocation, setOfficeLocation] = useState(user.officeLocation || '');
  const [manager, setManager] = useState(user.manager || '');
  const [salary, setSalary] = useState(user.salary !== null ? String(user.salary) : '');
  const [salaryType, setSalaryType] = useState(user.salaryType || '');
  const [equityShares, setEquityShares] = useState(user.equityShares !== null ? String(user.equityShares) : '');
  const [employmentType, setEmploymentType] = useState(user.employmentType || '');
  const [endDate, setEndDate] = useState(user.endDate ? user.endDate.slice(0, 10) : '');
  const [endReason, setEndReason] = useState(user.endReason || '');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    setSaving(true); setError('');
    try {
      const res = await fetch(`/api/team/tracker/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || null,
          email: email.trim(),
          startDate: startDate || null,
          role, team, officeLocation, manager,
          salary: salary === '' ? null : Number(salary),
          salaryType: salaryType || null,
          equityShares: equityShares === '' ? null : Number(equityShares),
          employmentType: employmentType || null,
          endDate: endDate || null,
          endReason: endReason || null,
        }),
      });
      const data = await res.json();
      if (data.success) await onSaved();
      else setError(data.error || 'Failed to save');
    } catch { setError('Failed to save'); }
    finally { setSaving(false); }
  };

  const convertToFT = async () => {
    const label = user.name || user.email;
    if (!confirm(`Convert ${label} to Full-Time?\n\nThis flips employmentType to Full-Time and logs a Promotion check-in. Use Recruiting → New Offer → Conversion for a formal offer letter.`)) return;
    const newSalary = prompt('New annual salary (optional — leave blank to keep current):', '');
    setConverting(true); setError('');
    try {
      const res = await fetch(`/api/team/tracker/${user.id}/convert-ft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salary: newSalary && newSalary.trim() ? Number(newSalary) : null,
          salaryType: newSalary && newSalary.trim() ? 'annual' : null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEmploymentType('Full-Time');
        if (newSalary && newSalary.trim()) { setSalary(newSalary.trim()); setSalaryType('annual'); }
        await onSaved();
      } else { setError(data.error || 'Failed to convert'); }
    } catch { setError('Failed to convert'); }
    finally { setConverting(false); }
  };

  const remove = async () => {
    const label = user.name || user.email;
    if (!confirm(`Delete ${label} from the tracker? This removes the AppUser row and all logged check-ins. This cannot be undone.`)) return;
    setDeleting(true); setError('');
    try {
      const res = await fetch(`/api/team/tracker/${user.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) await onSaved();
      else setError(data.error || 'Failed to delete');
    } catch { setError('Failed to delete'); }
    finally { setDeleting(false); }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Name</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Start date</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Office</label>
          <select value={officeLocation} onChange={(e) => setOfficeLocation(e.target.value)} className={inputClass}>
            <option value="">—</option>
            {OFFICE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Role</label>
          <input type="text" value={role} onChange={(e) => setRole(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Team</label>
          <select value={team} onChange={(e) => setTeam(e.target.value)} className={inputClass}>
            <option value="">—</option>
            {TEAM_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            {team && !TEAM_OPTIONS.some((t) => t.value === team) && (
              <option value={team}>{team}</option>
            )}
          </select>
        </div>
        <div>
          <label className={labelClass}>Manager</label>
          <select value={manager} onChange={(e) => setManager(e.target.value)} className={inputClass}>
            <option value="">—</option>
            {managerOptions.map((m) => (
              <option key={m.email} value={m.name}>{m.name} ({m.email})</option>
            ))}
            {manager && !managerOptions.some((m) => m.name === manager) && (
              <option value={manager}>{manager}</option>
            )}
          </select>
        </div>
        <div>
          <label className={labelClass}>Employment type</label>
          <select value={employmentType} onChange={(e) => setEmploymentType(e.target.value)} className={inputClass}>
            <option value="">—</option>
            {EMPLOYMENT_TYPE_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            {employmentType && !EMPLOYMENT_TYPE_OPTIONS.some((t) => t.value === employmentType) && (
              <option value={employmentType}>{employmentType}</option>
            )}
          </select>
        </div>
      </div>

      {showSalary ? (
        <div className="border border-[var(--border-light)] bg-[var(--background)] p-3">
          <p className="mb-2 text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-secondary)]">Compensation (admin-only)</p>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className={labelClass}>Salary</label>
              <input type="number" value={salary} onChange={(e) => setSalary(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Type</label>
              <select value={salaryType} onChange={(e) => setSalaryType(e.target.value)} className={inputClass}>
                <option value="">—</option>
                {SALARY_TYPE_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Equity shares</label>
              <input type="number" value={equityShares} onChange={(e) => setEquityShares(e.target.value)} className={inputClass} />
            </div>
          </div>
        </div>
      ) : (
        <p className="text-[10px] uppercase tracking-wider text-[var(--border-light)]">Compensation hidden — toggle &quot;Show salary&quot; above to reveal.</p>
      )}

      <div className="border border-[var(--border-light)] bg-[var(--background)] p-3">
        <p className="mb-2 text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-secondary)]">Departure (moves to Alumni)</p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelClass}>End date</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Reason</label>
            <input type="text" value={endReason} onChange={(e) => setEndReason(e.target.value)} placeholder="Departed / Converted to FT / Internship ended" className={inputClass} />
          </div>
        </div>
      </div>

      {error && <p className="text-[10px] text-red-700">{error}</p>}

      <div className="flex items-center gap-2">
        <button type="button" disabled={saving || deleting || converting} onClick={save}
          className="border border-[var(--border)] bg-[var(--foreground)] px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-[var(--background)] hover:opacity-80 disabled:opacity-30 transition-colors">
          {saving ? 'Saving…' : 'Save'}
        </button>
        {employmentType === 'Intern' && (
          <button type="button" disabled={saving || deleting || converting} onClick={convertToFT}
            className="border border-[var(--foreground)] px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-[var(--foreground)] hover:bg-[var(--foreground)] hover:text-[var(--background)] disabled:opacity-30 transition-colors">
            {converting ? 'Converting…' : 'Convert to FT'}
          </button>
        )}
        {user.candidateId && (
          <span className="text-[9px] uppercase tracking-wider text-[var(--border-light)]">linked to candidate</span>
        )}
        <button type="button" disabled={saving || deleting || converting} onClick={remove}
          className="ml-auto border border-red-700 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-red-700 hover:bg-red-700 hover:text-[var(--background)] disabled:opacity-30 transition-colors">
          {deleting ? 'Deleting…' : 'Delete'}
        </button>
      </div>
    </div>
  );
}
