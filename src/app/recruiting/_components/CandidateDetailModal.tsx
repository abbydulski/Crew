'use client';

import { useEffect, useState } from 'react';
import type { Candidate } from './types';
import { ALL_STATUSES } from '@/lib/constants';

interface Approver { email: string; name: string }

export default function CandidateDetailModal({ candidate: c, onClose, onEdit }: { candidate: Candidate; onClose: () => void; onEdit: () => void; }) {
  const statusLabel = ALL_STATUSES.find(s => s.key === c.status)?.label || c.status;
  const [isApproving, setIsApproving] = useState(false);
  const [approveResult, setApproveResult] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [offerLink, setOfferLink] = useState<string | null>(c.offerDriveLink);
  const [offerDocId, setOfferDocId] = useState<string | null>(c.offerDocId);
  const [approverEmail, setApproverEmail] = useState<string>(c.offerApproverEmail || '');
  const [approvers, setApprovers] = useState<Approver[]>([]);
  const [savingApprover, setSavingApprover] = useState(false);
  // Conversion links — original intern this was converted from, or FT records converted from this one.
  const [convertedFrom, setConvertedFrom] = useState<Candidate | null>(null);
  const [convertedTo, setConvertedTo] = useState<Candidate[]>([]);

  useEffect(() => {
    fetch('/api/recruiting/approvers').then(r => r.json()).then(d => { if (d.success) setApprovers(d.data); }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!c.convertedFromCandidateId && c.status !== 'HIRED') return;
    fetch('/api/recruiting/candidates').then(r => r.json()).then(d => {
      if (!d.success) return;
      const all = d.data as Candidate[];
      if (c.convertedFromCandidateId) {
        setConvertedFrom(all.find((x) => x.id === c.convertedFromCandidateId) || null);
      }
      setConvertedTo(all.filter((x) => x.convertedFromCandidateId === c.id));
    }).catch(() => {});
  }, [c.id, c.convertedFromCandidateId, c.status]);

  const handleApproverChange = async (email: string) => {
    setApproverEmail(email); setSavingApprover(true);
    try {
      await fetch(`/api/recruiting/candidates/${c.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offerApproverEmail: email || null }),
      });
    } finally { setSavingApprover(false); }
  };

  const handleGenerateOffer = async () => {
    setIsGenerating(true); setApproveResult(null);
    try {
      const res = await fetch(`/api/recruiting/candidates/${c.id}/offer-letter`);
      const data = await res.json();
      if (data.success) {
        setOfferLink(data.driveLink);
        setOfferDocId(data.docId);
      } else {
        setApproveResult(`Error: ${data.error}`);
      }
    } catch { setApproveResult('Failed to generate offer letter'); }
    finally { setIsGenerating(false); }
  };

  const handlePreviewPdf = () => {
    if (offerDocId) {
      window.open(`/api/recruiting/offer-preview?docId=${offerDocId}`, '_blank');
    }
  };

  const handleApprove = async () => {
    if (!confirm('Approve this offer and notify Slack?')) return;
    setIsApproving(true); setApproveResult(null);
    try {
      const res = await fetch(`/api/recruiting/candidates/${c.id}/approve-offer`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setApproveResult('Offer approved! Slack notified.');
        setTimeout(() => window.location.reload(), 1500);
      }
      else setApproveResult(`Error: ${data.error}`);
    } catch { setApproveResult('Failed to approve offer'); }
    finally { setIsApproving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded bg-[var(--card-background)] p-6 shadow-md" onClick={e => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-bold text-[var(--foreground)]">{c.name}</h3>
          <div className="flex items-center gap-2">
            <button onClick={onEdit} className="rounded border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--background)] hover:text-[var(--foreground)]">Edit</button>
            <button onClick={onClose} className="text-[var(--border-light)] hover:text-[var(--foreground)]">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
        <div className="space-y-3">
          {c.role && <div><span className="text-xs font-medium text-[var(--border-light)]">Role</span><p className="text-sm text-[var(--foreground)]">{c.role}</p></div>}
          <div className="grid grid-cols-2 gap-4">
            <div><span className="text-xs font-medium text-[var(--border-light)]">Status</span><p className="text-sm text-[var(--foreground)]">{statusLabel}</p></div>
            <div><span className="text-xs font-medium text-[var(--border-light)]">Recruiter</span><p className="text-sm text-[var(--foreground)]">{c.recruiterName || c.recruiter?.name || 'Unassigned'}</p></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {c.email && <div><span className="text-xs font-medium text-[var(--border-light)]">Email</span><p className="text-sm text-[var(--foreground)]">{c.email}</p></div>}
            {c.phone && <div><span className="text-xs font-medium text-[var(--border-light)]">Phone</span><p className="text-sm text-[var(--foreground)]">{c.phone}</p></div>}
          </div>
          {c.linkedin && (
            <div>
              <span className="text-xs font-medium text-[var(--border-light)]">LinkedIn</span>
              <a href={c.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
                View Profile
              </a>
            </div>
          )}
          {(c.status === 'OFFER' || c.status === 'HIRED') && (c.salary || c.team || c.employmentType) && (
            <>
              <hr className="border-[var(--border)]" />
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--border-light)]">Offer Details {c.offerStatus === 'PENDING' && <span className="ml-1 text-amber-600">(Pending)</span>}{c.offerStatus === 'APPROVED' && <span className="ml-1 text-green-600">(Approved)</span>}</p>
              <div className="grid grid-cols-2 gap-4">
                {c.salary && <div><span className="text-xs font-medium text-[var(--border-light)]">Salary</span><p className="text-sm text-[var(--foreground)]">${c.salary.toLocaleString()}{c.salaryType === 'HOURLY' ? '/hr' : '/yr'}</p></div>}
                {c.manager && <div><span className="text-xs font-medium text-[var(--border-light)]">Manager</span><p className="text-sm text-[var(--foreground)]">{c.manager}</p></div>}
                {c.team && <div><span className="text-xs font-medium text-[var(--border-light)]">Team</span><p className="text-sm text-[var(--foreground)]">{c.team}</p></div>}
                {c.employmentType && <div><span className="text-xs font-medium text-[var(--border-light)]">Employment Type</span><p className="text-sm text-[var(--foreground)]">{c.employmentType}</p></div>}
                {c.officeLocation && <div><span className="text-xs font-medium text-[var(--border-light)]">Office</span><p className="text-sm text-[var(--foreground)]">{c.officeLocation}</p></div>}
                {c.startDate && <div><span className="text-xs font-medium text-[var(--border-light)]">Start Date</span><p className="text-sm text-[var(--foreground)]">{new Date(c.startDate).toLocaleDateString('en-US', { timeZone: 'UTC' })}</p></div>}
                {c.conversion !== null && <div><span className="text-xs font-medium text-[var(--border-light)]">Conversion</span><p className="text-sm text-[var(--foreground)]">{c.conversion ? 'Yes' : 'No'}</p></div>}
                {c.personalAddress && <div><span className="text-xs font-medium text-[var(--border-light)]">Personal Address</span><p className="text-sm text-[var(--foreground)]">{c.personalAddress}</p></div>}
                {c.equityShares && <div><span className="text-xs font-medium text-[var(--border-light)]">Equity Shares</span><p className="text-sm text-[var(--foreground)]">{c.equityShares.toLocaleString()}</p></div>}
              </div>
              {c.status === 'OFFER' && c.offerStatus === 'COMPLETE' && (
                <div className="flex flex-col gap-3 pt-2">
                  {!offerDocId ? (
                    <div className="flex items-center gap-2">
                      <button onClick={handleGenerateOffer} disabled={isGenerating}
                        className="rounded bg-[var(--foreground)] px-4 py-2 text-sm font-medium text-white hover:opacity-80 disabled:opacity-50">
                        {isGenerating ? 'Generating...' : '📄 Generate Offer Letter'}
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <button onClick={handlePreviewPdf}
                        className="rounded bg-[var(--foreground)] px-4 py-2 text-sm font-medium text-white hover:opacity-80">
                        📄 Preview Offer Letter PDF
                      </button>
                      <a href={offerLink!} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                        View in Google Drive ↗
                      </a>
                    </div>
                  )}
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">Offer Approver {savingApprover && <span className="ml-1 text-[10px] text-[var(--border-light)]">Saving...</span>}</label>
                    <select value={approverEmail} onChange={e => handleApproverChange(e.target.value)}
                      className="w-full rounded border border-[var(--border)] px-3 py-2 text-sm">
                      <option value="">Unassigned</option>
                      {approvers.map(a => <option key={a.email} value={a.email}>{a.name}</option>)}
                      {approverEmail && !approvers.some(a => a.email === approverEmail) && (
                        <option value={approverEmail}>{approverEmail}</option>
                      )}
                    </select>
                    <p className="mt-1 text-[10px] text-[var(--border-light)]">Shown as a task in this person&apos;s My Tasks list.</p>
                  </div>
                  <button onClick={handleApprove} disabled={isApproving}
                    className="w-full rounded border-2 border-green-700 px-4 py-2 text-sm font-bold text-green-700 hover:bg-green-700 hover:text-white transition-colors disabled:opacity-50">
                    {isApproving ? 'Approving...' : '✓ Approve Offer'}
                  </button>
                </div>
              )}
              {c.status === 'OFFER' && c.offerStatus === 'APPROVED' && (
                <div className="flex flex-col gap-2 pt-2">
                  {!offerDocId ? (
                    <button onClick={handleGenerateOffer} disabled={isGenerating}
                      className="rounded bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-50">
                      {isGenerating ? 'Generating...' : '📄 Generate Offer Letter'}
                    </button>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <button onClick={handlePreviewPdf}
                        className="rounded bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800">
                        📄 Preview Offer Letter PDF
                      </button>
                      <a href={offerLink!} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                        View in Google Drive ↗
                      </a>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 rounded bg-green-50 px-3 py-1.5">
                    <span className="text-sm text-green-700">✓</span>
                    <span className="text-xs font-bold text-green-700">Offer Approved</span>
                  </div>
                </div>
              )}
              {approveResult && (
                <p className={`text-xs ${approveResult.startsWith('Error') ? 'text-red-600' : 'text-green-700'}`}>{approveResult}</p>
              )}
            </>
          )}
          {(convertedFrom || convertedTo.length > 0) && (
            <>
              <hr className="border-[var(--border)]" />
              {convertedFrom && (
                <div>
                  <span className="text-xs font-medium text-[var(--border-light)]">Converted from</span>
                  <p className="text-sm text-[var(--foreground)]">{convertedFrom.name}{convertedFrom.role ? ` · ${convertedFrom.role}` : ''}<span className="ml-2 text-[10px] uppercase tracking-wider text-[var(--border-light)]">intern</span></p>
                </div>
              )}
              {convertedTo.map((to) => (
                <div key={to.id}>
                  <span className="text-xs font-medium text-[var(--border-light)]">Converted to FT →</span>
                  <p className="text-sm text-[var(--foreground)]">{to.name}{to.role ? ` · ${to.role}` : ''}</p>
                </div>
              ))}
            </>
          )}
          {c.notes && (
            <div>
              <span className="text-xs font-medium text-[var(--border-light)]">Notes</span>
              <p className="mt-1 whitespace-pre-wrap rounded bg-[var(--background)] p-3 text-sm text-[var(--text-secondary)]">{c.notes}</p>
            </div>
          )}
          <div className="pt-2 text-[10px] text-[var(--border-light)]">Added {new Date(c.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
        </div>
      </div>
    </div>
  );
}
