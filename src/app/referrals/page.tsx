'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import PageLoading from '@/components/PageLoading';

interface Referral {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  linkedin: string | null;
  notes: string | null;
  submittedBy: string;
  submittedByName: string | null;
  createdAt: string;
}

export default function ReferralsPage() {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const fetchReferrals = useCallback(async () => {
    try {
      const res = await fetch('/api/referrals');
      const data = await res.json();
      if (data.success) setReferrals(data.data);
    } catch (err) { console.error('Failed to fetch referrals:', err); }
  }, []);

  useEffect(() => {
    fetchReferrals().finally(() => setIsLoading(false));
  }, [fetchReferrals]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Name is required'); return; }
    setIsSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/referrals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email || null, phone: phone || null, linkedin: linkedin || null, notes: notes || null }),
      });
      const data = await res.json();
      if (data.success) {
        setName(''); setEmail(''); setPhone(''); setLinkedin(''); setNotes('');
        setSuccess('Referral submitted!');
        await fetchReferrals();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Failed to submit');
      }
    } catch (err) {
      setError('Failed to submit referral');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <PageLoading />;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 border-b border-[var(--border)] pb-4">
        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-[var(--foreground)]">Referrals</h2>
        <p className="mt-1 text-[11px] text-[var(--text-secondary)]">Refer someone you know — they&apos;ll be added to the Spybase</p>
      </div>

      {/* Submit Form */}
      <form onSubmit={handleSubmit} className="mb-10 border border-[var(--border)] bg-[var(--card-background)] p-6">
        <div className="mb-4">
          <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.15em] text-[var(--text-secondary)]">Name *</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Full name"
            className="w-full border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm" autoFocus />
        </div>
        <div className="mb-4 grid grid-cols-2 gap-0">
          <div className="pr-0">
            <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.15em] text-[var(--text-secondary)]">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address"
              className="w-full border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.15em] text-[var(--text-secondary)]">Phone</label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone number"
              className="w-full border border-l-0 border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm" />
          </div>
        </div>
        <div className="mb-4">
          <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.15em] text-[var(--text-secondary)]">LinkedIn</label>
          <input type="url" value={linkedin} onChange={e => setLinkedin(e.target.value)} placeholder="https://linkedin.com/in/..."
            className="w-full border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm" />
        </div>
        <div className="mb-4">
          <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.15em] text-[var(--text-secondary)]">How do you know this person?</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
            placeholder="e.g. Former coworker, great at field ops..."
            className="w-full border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm resize-none" />
        </div>
        {error && <p className="mb-3 text-xs text-red-700">{error}</p>}
        {success && <p className="mb-3 text-xs text-green-700">{success}</p>}
        <button type="submit" disabled={isSubmitting || !name.trim()}
          className="border border-[var(--border)] bg-[var(--foreground)] px-5 py-2 text-[11px] font-black uppercase tracking-wider text-[var(--background)] hover:opacity-80 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          {isSubmitting ? 'Submitting...' : 'Submit Referral'}
        </button>
      </form>

      {/* Referral List */}
      <ReferralList referrals={referrals} onDelete={async (id) => {
        if (!confirm('Delete this referral?')) return;
        try {
          const res = await fetch(`/api/referrals/${id}`, { method: 'DELETE' });
          const data = await res.json();
          if (data.success) await fetchReferrals();
          else setError(data.error || 'Failed to delete');
        } catch { setError('Failed to delete referral'); }
      }} />
    </div>
  );
}

function ReferralList({ referrals, onDelete }: { referrals: Referral[]; onDelete: (id: string) => void }) {
  if (referrals.length === 0) {
    return (
      <div className="border border-dashed border-[var(--border-light)] bg-[var(--card-background)] p-8 text-center">
        <p className="text-[11px] uppercase tracking-wider text-[var(--border-light)]">No referrals submitted yet</p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--border-light)]">All Referrals ({referrals.length})</h3>
      <div className="border border-[var(--border)] bg-[var(--card-background)]">
        {referrals.map((r, i) => (
          <div key={r.id} className={`px-5 py-4 ${i > 0 ? 'border-t border-[var(--border-light)]' : ''}`}>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-black text-[var(--foreground)]">{r.name}</p>
                  {r.linkedin && (
                    <a href={r.linkedin} target="_blank" rel="noopener noreferrer" className="text-[var(--text-secondary)] hover:text-[var(--foreground)]">
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
                    </a>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap gap-3 text-[10px] text-[var(--text-secondary)]">
                  {r.email && <span>{r.email}</span>}
                  {r.phone && <span>{r.phone}</span>}
                </div>
                {r.notes && <p className="mt-2 text-xs text-[var(--text-secondary)] whitespace-pre-wrap">{r.notes}</p>}
              </div>
              <div className="flex items-start gap-3 shrink-0 ml-4">
                <div className="text-right">
                  <p className="text-[10px] text-[var(--text-secondary)]">{r.submittedByName || r.submittedBy}</p>
                  <p className="text-[9px] uppercase tracking-wider text-[var(--border-light)]">
                    {new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                <button type="button" onClick={() => onDelete(r.id)}
                  className="p-1 text-[var(--border-light)] hover:text-red-700 transition-colors" title="Delete referral">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
