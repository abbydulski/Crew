'use client';

import { useState, useEffect } from 'react';
import type { Candidate } from './types';
import { ALL_STATUSES } from '@/lib/constants';
import OfferFormFields from './OfferFormFields';

interface RoleOption {
  id: string;
  title: string;
  team: string;
  officeLocation: string | null;
  employmentType: string | null;
}

interface TeamMember {
  email: string;
  name: string;
}

export default function CandidateModal({ candidate, onClose, onSaved }: {
  candidate: Candidate | null; onClose: () => void; onSaved: (c: Candidate) => void;
}) {
  const [name, setName] = useState(candidate?.name || '');
  const [roleId, setRoleId] = useState(candidate?.roleId || '');
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [email, setEmail] = useState(candidate?.email || '');
  const [phone, setPhone] = useState(candidate?.phone || '');
  const [linkedin, setLinkedin] = useState(candidate?.linkedin || '');
  const [notes, setNotes] = useState(candidate?.notes || '');
  const [status, setStatus] = useState(candidate?.status || 'REACHED_OUT');
  const [recruiterEmail, setRecruiterEmail] = useState(candidate?.recruiterEmail || '');
  const [team_, setTeamDirectory] = useState<TeamMember[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);

  const legacyRecruiterName = !recruiterEmail && candidate?.recruiter?.name ? candidate.recruiter.name : null;

  // Offer fields (shown when editing a candidate in OFFER or HIRED stage)
  const showOfferFields = candidate && (candidate.status === 'OFFER' || candidate.status === 'HIRED');
  const [startDate, setStartDate] = useState(candidate?.startDate ? candidate.startDate.split('T')[0] : '');
  const [salary, setSalary] = useState(candidate?.salary ? String(candidate.salary) : '');
  const [salaryType, setSalaryType] = useState(candidate?.salaryType || '');
  const [manager, setManager] = useState(candidate?.manager || '');
  const [officeLocation, setOfficeLocation] = useState(candidate?.officeLocation || '');
  const [equityShares, setEquityShares] = useState(candidate?.equityShares ? String(candidate.equityShares) : '');
  const [team, setTeam] = useState(candidate?.team || '');
  const [employmentType, setEmploymentType] = useState(candidate?.employmentType || '');
  const [conversion, setConversion] = useState(candidate?.conversion ?? false);
  const [offerApproverEmail, setOfferApproverEmail] = useState(candidate?.offerApproverEmail || '');

  useEffect(() => {
    fetch('/api/recruiting/roles')
      .then((r) => r.json())
      .then((d) => { if (d.success) setRoles(d.data); })
      .catch((err) => console.error('Failed to fetch roles:', err));
    fetch('/api/team-directory')
      .then((r) => r.json())
      .then((d) => { if (d.success) setTeamDirectory(d.data); })
      .catch((err) => console.error('Failed to fetch team directory:', err));
  }, []);

  const handleRoleChange = (newRoleId: string) => {
    setRoleId(newRoleId);
    if (!newRoleId) return;
    const r = roles.find((x) => x.id === newRoleId);
    if (!r) return;
    setTeam(r.team);
    if (r.officeLocation) setOfficeLocation(r.officeLocation);
    if (r.employmentType) setEmploymentType(r.employmentType);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Name is required'); return; }
    if (!candidate && !roleId && roles.length > 0) { setError('Role is required'); return; }
    setIsSubmitting(true); setError('');
    try {
      const payload: Record<string, unknown> = { name: name.trim(), roleId: roleId || null, email: email || null, phone: phone || null, linkedin: linkedin || null, notes: notes || null, status, recruiterEmail: recruiterEmail || null };
      // Propagate role-derived fields so they're saved on new candidates too (not just on offer edits).
      if (roleId) {
        if (team) payload.team = team;
        if (officeLocation) payload.officeLocation = officeLocation;
        if (employmentType) payload.employmentType = employmentType;
      }
      if (showOfferFields) {
        payload.startDate = startDate || null;
        payload.officeLocation = officeLocation || null;
        payload.salary = salary ? Number(salary) : null;
        payload.salaryType = salaryType || null;
        payload.manager = manager || null;
        payload.team = team || null;
        payload.employmentType = employmentType || null;
        payload.conversion = conversion;
        payload.offerApproverEmail = offerApproverEmail || null;
        if (equityShares) payload.equityShares = Number(equityShares);
      }
      const url = candidate ? `/api/recruiting/candidates/${candidate.id}` : '/api/recruiting/candidates';
      const res = await fetch(url, { method: candidate ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      let saved = data.data;
      // Upload resume if a file was selected
      if (resumeFile) {
        const fd = new FormData();
        fd.append('file', resumeFile);
        const rRes = await fetch(`/api/recruiting/candidates/${saved.id}/resume`, { method: 'POST', body: fd });
        const rData = await rRes.json();
        if (rData.success) saved = rData.data;
        else console.error('Resume upload failed:', rData.error);
      }
      onSaved(saved);
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to save'); }
    finally { setIsSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto border border-[var(--border)] bg-[var(--card-background)] p-6" onClick={e => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between border-b border-[var(--border)] pb-3">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--foreground)]">{candidate ? 'Edit Candidate' : 'New Candidate'}</h3>
          <button onClick={onClose} className="text-[var(--border-light)] hover:text-[var(--foreground)]">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Name *</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full border border-[var(--border)] px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Role / Position</label>
            {roles.length === 0 ? (
              <p className="border border-dashed border-[var(--border)] px-3 py-2 text-xs text-[var(--text-secondary)]">
                No open roles yet. <a href="/recruiting/roles" className="font-medium text-[var(--foreground)] underline hover:no-underline">Create one in Open Roles</a> first.
              </p>
            ) : (
              <select value={roleId} onChange={e => handleRoleChange(e.target.value)} required={!candidate} className="w-full border border-[var(--border)] px-3 py-2 text-sm">
                {!candidate ? (
                  <option value="" disabled>Select a role...</option>
                ) : (
                  <option value="">Unassigned</option>
                )}
                {roles.map(r => (
                  <option key={r.id} value={r.id}>{r.title} · {r.team}</option>
                ))}
              </select>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full border border-[var(--border)] px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Phone</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full border border-[var(--border)] px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">LinkedIn Profile URL</label>
            <input type="url" value={linkedin} onChange={e => setLinkedin(e.target.value)} placeholder="https://linkedin.com/in/..." className="w-full border border-[var(--border)] px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)} className="w-full border border-[var(--border)] px-3 py-2 text-sm">
                {ALL_STATUSES.filter(s => (s.key !== 'HIRED' || candidate?.status === 'HIRED') && (s.key !== 'OFFER' || candidate?.status === 'OFFER')).map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Recruiter</label>
              <select value={recruiterEmail} onChange={e => setRecruiterEmail(e.target.value)} className="w-full border border-[var(--border)] px-3 py-2 text-sm">
                <option value="">Unassigned</option>
                {team_.map(m => <option key={m.email} value={m.email}>{m.name}</option>)}
              </select>
              {legacyRecruiterName && (
                <p className="mt-1 text-[10px] text-[var(--border-light)]">Currently: {legacyRecruiterName} (legacy)</p>
              )}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="w-full border border-[var(--border)] px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Resume</label>
            {candidate?.resumeFileName && (
              <div className="mb-1 flex items-center gap-2 text-xs">
                <span className="text-[var(--text-secondary)]">{candidate.resumeFileName}</span>
                {candidate.resumeDriveFileId && (
                  <a href={`/api/recruiting/candidates/${candidate.id}/resume`} target="_blank" rel="noopener noreferrer" className="font-medium text-[var(--foreground)] underline hover:no-underline">View</a>
                )}
              </div>
            )}
            <input type="file" accept=".pdf,.doc,.docx" onChange={e => setResumeFile(e.target.files?.[0] || null)} className="w-full text-xs file:mr-2 file:border file:border-[var(--border)] file:bg-[var(--card-background)] file:px-2 file:py-1 file:text-[10px] file:font-bold file:uppercase file:tracking-wider" />
            {resumeFile && <p className="mt-1 text-[10px] text-[var(--text-secondary)]">Will upload on save</p>}
          </div>
          {showOfferFields && (
            <>
              <hr className="border-[var(--border)]" />
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--border-light)]">Offer Details</p>
              <OfferFormFields startDate={startDate} setStartDate={setStartDate} salary={salary} setSalary={setSalary}
                salaryType={salaryType} setSalaryType={setSalaryType} manager={manager} setManager={setManager}
                officeLocation={officeLocation} setOfficeLocation={setOfficeLocation} equityShares={equityShares} setEquityShares={setEquityShares}
                team={team} setTeam={setTeam} employmentType={employmentType} setEmploymentType={setEmploymentType}
                conversion={conversion} setConversion={setConversion}
                offerApproverEmail={offerApproverEmail} setOfferApproverEmail={setOfferApproverEmail} />
            </>
          )}
          <button type="submit" disabled={isSubmitting} className="w-full bg-[var(--foreground)] px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-[var(--card-background)] hover:opacity-80 disabled:opacity-50">
            {isSubmitting ? 'Saving...' : candidate ? 'Save Changes' : 'Add Candidate'}
          </button>
        </form>
      </div>
    </div>
  );
}
