'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import PageLoading from '@/components/PageLoading';

interface FeedbackEntry {
  id: string;
  submittedBy: string;
  submittedByName: string | null;
  submittedByImage: string | null;
  feedback: string;
  technicalFeedback: string | null;
  behavioralFeedback: string | null;
  overallScore: number | null;
  additionalNotes: string | null;
  prefersVerbal: boolean;
  createdAt: string;
  candidate: { id: string; name: string; role: string | null; status: string };
}

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

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export default function AdminFeedbackReferralsPage() {
  const [feedback, setFeedback] = useState<FeedbackEntry[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      const [fbRes, refRes] = await Promise.all([
        fetch('/api/admin/feedback'),
        fetch('/api/admin/referrals'),
      ]);
      const fb = await fbRes.json();
      const ref = await refRes.json();
      if (fb.success) setFeedback(fb.data);
      if (ref.success) setReferrals(ref.data);
    } catch (err) {
      console.error('Failed to fetch admin activity:', err);
    }
  }, []);

  useEffect(() => {
    fetchAll().finally(() => setIsLoading(false));
  }, [fetchAll]);

  if (isLoading) return <PageLoading />;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h2 className="text-sm font-black uppercase tracking-widest text-[#1A1A1A]">Feedback &amp; Referrals</h2>
        <p className="mt-1 text-sm text-[#6B6B6B]">Recent submissions from the last 30 days</p>
      </div>

      <section className="mb-12">
        <h3 className="mb-3 text-xs font-black uppercase tracking-widest text-[#999999]">Interview Feedback ({feedback.length})</h3>
        {feedback.length === 0 ? (
          <EmptyState label="No interview feedback in the last 30 days" />
        ) : (
          <div className="space-y-4">
            {feedback.map((f) => (
              <div key={f.id} className="rounded border border-[#D4D4D4] bg-white px-5 py-4">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  {f.submittedByImage ? (
                    <Image src={f.submittedByImage} alt="" width={24} height={24} className="rounded-full" />
                  ) : (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#E5E5E5] text-[10px] font-bold text-[#6B6B6B]">
                      {(f.submittedByName || f.submittedBy).charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="text-sm font-bold text-[#1A1A1A]">{f.candidate.name}</span>
                  {f.candidate.role && <span className="text-xs text-[#999999]">· {f.candidate.role}</span>}
                  {f.overallScore != null && (
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${f.overallScore >= 3 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{f.overallScore}/4</span>
                  )}
                  {f.prefersVerbal && <span className="rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-bold text-orange-700">Verbal</span>}
                  <span className="ml-auto text-xs text-[#999999]">{f.submittedByName || f.submittedBy} · {fmtDate(f.createdAt)}</span>
                </div>
                {f.technicalFeedback && <Field label="Technical" value={f.technicalFeedback} />}
                {f.behavioralFeedback && <Field label="Behavioral" value={f.behavioralFeedback} />}
                {f.additionalNotes && <Field label="Additional Notes" value={f.additionalNotes} />}
                {!f.technicalFeedback && !f.behavioralFeedback && !f.overallScore && (
                  <p className="whitespace-pre-wrap text-sm text-[#1A1A1A]">{f.feedback}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-3 text-xs font-black uppercase tracking-widest text-[#999999]">Referrals ({referrals.length})</h3>
        {referrals.length === 0 ? (
          <EmptyState label="No referrals in the last 30 days" />
        ) : (
          <div className="border border-[#D4D4D4] bg-white">
            {referrals.map((r, i) => (
              <div key={r.id} className={`px-5 py-4 ${i > 0 ? 'border-t border-[#E5E5E5]' : ''}`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-[#1A1A1A]">{r.name}</p>
                      {r.linkedin && (
                        <a href={r.linkedin} target="_blank" rel="noopener noreferrer" className="text-[#999999] hover:text-[#1A1A1A]">
                          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
                        </a>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-3 text-[10px] text-[#6B6B6B]">
                      {r.email && <span>{r.email}</span>}
                      {r.phone && <span>{r.phone}</span>}
                    </div>
                    {r.notes && <p className="mt-2 whitespace-pre-wrap text-xs text-[#6B6B6B]">{r.notes}</p>}
                  </div>
                  <div className="shrink-0 text-right text-[10px] text-[#999999]">
                    <p>{r.submittedByName || r.submittedBy}</p>
                    <p className="uppercase tracking-wider">{fmtDate(r.createdAt)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-2">
      <p className="text-[10px] font-bold uppercase tracking-widest text-[#999]">{label}</p>
      <p className="whitespace-pre-wrap text-sm text-[#1A1A1A]">{value}</p>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded border border-dashed border-[#D4D4D4] bg-[#FAFAFA] p-8 text-center">
      <p className="text-sm text-[#999999]">{label}</p>
    </div>
  );
}
