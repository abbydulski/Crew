'use client';

import { useEffect, useRef, useState } from 'react';
import PersonPicker from '@/components/PersonPicker';

interface Approver { email: string; name: string }

let approversCache: Approver[] | null = null;
let approversPromise: Promise<Approver[]> | null = null;
function fetchApprovers(): Promise<Approver[]> {
  if (approversCache) return Promise.resolve(approversCache);
  if (approversPromise) return approversPromise;
  approversPromise = fetch('/api/recruiting/approvers')
    .then((r) => r.json())
    .then((d) => {
      const list: Approver[] = d.success ? d.data : [];
      approversCache = list;
      return list;
    })
    .catch(() => []);
  return approversPromise;
}

export default function OfferFormFields({ startDate, setStartDate, salary, setSalary, salaryType, setSalaryType, manager, setManager, officeLocation, setOfficeLocation, equityShares, setEquityShares, team, setTeam, employmentType, setEmploymentType, conversion, setConversion, offerApproverEmail, setOfferApproverEmail }: {
  startDate: string; setStartDate: (s: string) => void;
  salary: string; setSalary: (s: string) => void;
  salaryType: string; setSalaryType: (s: string) => void;
  manager: string; setManager: (s: string) => void;
  officeLocation: string; setOfficeLocation: (s: string) => void;
  equityShares: string; setEquityShares: (s: string) => void;
  team: string; setTeam: (s: string) => void;
  employmentType: string; setEmploymentType: (s: string) => void;
  conversion: boolean; setConversion: (b: boolean) => void;
  offerApproverEmail: string; setOfferApproverEmail: (s: string) => void;
}) {
  const lastSuggestedRef = useRef<string>('');
  const [approvers, setApprovers] = useState<Approver[]>([]);
  useEffect(() => { fetchApprovers().then(setApprovers); }, []);

  useEffect(() => {
    if (salaryType !== 'ANNUAL') return;
    const salaryNum = Number(salary);
    if (!salary || !Number.isFinite(salaryNum) || salaryNum <= 0) return;
    const suggested = String(Math.floor(salaryNum / 15 / 100) * 100);
    if (equityShares === '' || equityShares === lastSuggestedRef.current) {
      if (equityShares !== suggested) setEquityShares(suggested);
      lastSuggestedRef.current = suggested;
    }
  }, [salary, salaryType, equityShares, setEquityShares]);

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Team *</label>
          <select value={team} onChange={e => setTeam(e.target.value)}
            className="w-full border border-[var(--border)] px-3 py-2 text-sm">
            <option value="">Select team...</option>
            <option value="HW">HW</option>
            <option value="SW">SW</option>
            <option value="Field">Field</option>
            <option value="Ops">Ops</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Employment Type *</label>
          <select value={employmentType} onChange={e => setEmploymentType(e.target.value)}
            className="w-full border border-[var(--border)] px-3 py-2 text-sm">
            <option value="">Select type...</option>
            <option value="Full-Time">Full-Time</option>
            <option value="Part-Time">Part-Time</option>
            <option value="Intern">Intern</option>
          </select>
        </div>
      </div>
      <div>
        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Salary *</label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--border-light)]">$</span>
            <input type="number" value={salary} onChange={e => setSalary(e.target.value)} placeholder="0"
              className="w-full border border-[var(--border)] pl-7 pr-3 py-2 text-sm" min="0" step="0.01" />
          </div>
          <select value={salaryType} onChange={e => setSalaryType(e.target.value)}
            className="border border-[var(--border)] px-3 py-2 text-sm">
            <option value="">Type...</option>
            <option value="HOURLY">Hourly</option>
            <option value="ANNUAL">Annual</option>
          </select>
        </div>
      </div>
      <div>
        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Manager *</label>
        <PersonPicker value={manager} onChange={setManager} placeholder="Select manager..." />
      </div>
      <div>
        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Offer Approver</label>
        <select value={offerApproverEmail} onChange={e => setOfferApproverEmail(e.target.value)}
          className="w-full border border-[var(--border)] px-3 py-2 text-sm">
          <option value="">Unassigned</option>
          {approvers.map(a => <option key={a.email} value={a.email}>{a.name}</option>)}
          {offerApproverEmail && !approvers.some(a => a.email === offerApproverEmail) && (
            <option value={offerApproverEmail}>{offerApproverEmail}</option>
          )}
        </select>
        <p className="mt-1 text-xs text-[var(--border-light)]">Will see this offer in their My Tasks list.</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Office Location *</label>
          <select value={officeLocation} onChange={e => setOfficeLocation(e.target.value)}
            className="w-full border border-[var(--border)] px-3 py-2 text-sm">
            <option value="">Select office...</option>
            <option value="LB">Long Beach</option>
            <option value="Vegas">Las Vegas</option>
            <option value="Norcal">Northern California</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Start Date *</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
            className="w-full border border-[var(--border)] px-3 py-2 text-sm" />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Equity Shares</label>
        <input type="number" value={equityShares} onChange={e => setEquityShares(e.target.value)} placeholder="0"
          className="w-full border border-[var(--border)] px-3 py-2 text-sm" min="0" step="1" />
        {salaryType === 'ANNUAL' && Number(salary) > 0 && (
          <p className="mt-1 text-xs text-[var(--border-light)]">Auto-populated from salary. Edit as needed.</p>
        )}
      </div>
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Conversion</label>
        <button type="button" onClick={() => setConversion(!conversion)}
          className={`relative inline-flex h-5 w-9 shrink-0 border-2 border-transparent transition-colors ${conversion ? 'bg-[var(--foreground)]' : 'bg-[var(--border-light)]'}`}>
          <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${conversion ? 'translate-x-4' : 'translate-x-0'}`} />
        </button>
      </div>
    </>
  );
}
