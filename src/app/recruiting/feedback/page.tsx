'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import PageLoading from '@/components/PageLoading';

interface Candidate {
  id: string;
  name: string;
  role: string | null;
  status: string;
}

interface FeedbackEntry {
  id: string;
  candidateId: string;
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

const SCORE_LABELS: Record<number, string> = {
  1: 'Do not advance',
  2: 'Do not advance',
  3: 'Advance to behavioral',
  4: 'Champion — advance regardless',
};

export default function InterviewFeedbackPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [feedbackList, setFeedbackList] = useState<FeedbackEntry[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState('');
  const [technicalFeedback, setTechnicalFeedback] = useState('');
  const [behavioralFeedback, setBehavioralFeedback] = useState('');
  const [overallScore, setOverallScore] = useState<number | null>(null);
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [prefersVerbal, setPrefersVerbal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const fetchCandidates = useCallback(async () => {
    try {
      const res = await fetch('/api/recruiting/candidates/interview');
      const data = await res.json();
      if (data.success) setCandidates(data.data);
    } catch (err) { console.error('Failed to fetch candidates:', err); }
  }, []);

  const fetchFeedback = useCallback(async () => {
    try {
      const res = await fetch('/api/recruiting/feedback');
      const data = await res.json();
      if (data.success) setFeedbackList(data.data);
    } catch (err) { console.error('Failed to fetch feedback:', err); }
  }, []);

  useEffect(() => {
    (async () => {
      await Promise.all([fetchCandidates(), fetchFeedback()]);
      setIsLoading(false);
    })();
  }, [fetchCandidates, fetchFeedback]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCandidate || !overallScore) {
      setError('Please select a candidate and provide an overall score');
      return;
    }
    setIsSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/recruiting/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateId: selectedCandidate,
          technicalFeedback,
          behavioralFeedback,
          overallScore,
          additionalNotes,
          prefersVerbal,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTechnicalFeedback('');
        setBehavioralFeedback('');
        setOverallScore(null);
        setAdditionalNotes('');
        setPrefersVerbal(false);
        setSelectedCandidate('');
        setSuccess('Feedback submitted!');
        await fetchFeedback();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Failed to submit');
      }
    } catch (err) {
      setError('Failed to submit feedback');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <PageLoading />;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h2 className="text-sm font-black uppercase tracking-widest text-[#1A1A1A]">Interview Feedback</h2>
        <p className="mt-1 text-sm text-[#6B6B6B]">Submit feedback for candidates in the interview stage</p>
      </div>

      {/* Submit Form */}
      <form onSubmit={handleSubmit} className="mb-10 rounded border border-[#D4D4D4] bg-white p-6 space-y-5">
        <div>
          <label className="mb-1 block text-sm font-medium text-[#6B6B6B]">Candidate</label>
          <select value={selectedCandidate} onChange={e => setSelectedCandidate(e.target.value)}
            className="w-full rounded border border-[#D4D4D4] px-3 py-2 text-sm">
            <option value="">Select a candidate...</option>
            {candidates.map(c => (
              <option key={c.id} value={c.id}>{c.name}{c.role ? ` — ${c.role}` : ''}</option>
            ))}
          </select>
          {candidates.length === 0 && <p className="mt-1 text-xs text-[#999999]">No candidates in interview stage</p>}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-[#6B6B6B]">Technical Feedback</label>
          <textarea value={technicalFeedback} onChange={e => setTechnicalFeedback(e.target.value)}
            rows={3} placeholder="How did the candidate perform on technical questions? Knowledge, problem-solving, relevant experience..."
            className="w-full rounded border border-[#D4D4D4] px-3 py-2 text-sm resize-none" />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-[#6B6B6B]">Behavioral Feedback</label>
          <p className="mb-1 text-xs text-[#999]">Communication, enthusiasm, culture fit</p>
          <textarea value={behavioralFeedback} onChange={e => setBehavioralFeedback(e.target.value)}
            rows={3} placeholder="How was their communication style? Were they enthusiastic about the role? Would they be a good culture fit?"
            className="w-full rounded border border-[#D4D4D4] px-3 py-2 text-sm resize-none" />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-[#6B6B6B]">Overall Score *</label>
          <p className="mb-2 text-xs text-[#999]">A score of 4 (champion) means you would champion this person for the role regardless of what other interviewers think. For first-round interviews, 3–4 means &ldquo;advance to behavioral&rdquo;; 1–2 means &ldquo;do not advance&rdquo;.</p>
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((n) => (
              <button key={n} type="button" onClick={() => setOverallScore(n)}
                className={`flex flex-1 flex-col items-center rounded border px-3 py-2.5 transition-colors ${
                  overallScore === n
                    ? 'border-[#1A1A1A] bg-[#1A1A1A] text-white'
                    : 'border-[#D4D4D4] bg-white text-[#1A1A1A] hover:bg-[#F5F5F5]'
                }`}>
                <span className="text-lg font-bold">{n}</span>
                <span className="mt-0.5 text-[10px]">{SCORE_LABELS[n]}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-[#6B6B6B]">Anything Else</label>
          <textarea value={additionalNotes} onChange={e => setAdditionalNotes(e.target.value)}
            rows={2} placeholder="Any other thoughts, concerns, or observations..."
            className="w-full rounded border border-[#D4D4D4] px-3 py-2 text-sm resize-none" />
        </div>

        <div className="flex items-center gap-2">
          <input type="checkbox" id="prefersVerbal" checked={prefersVerbal} onChange={e => setPrefersVerbal(e.target.checked)}
            className="h-4 w-4 rounded border-[#D4D4D4]" />
          <label htmlFor="prefersVerbal" className="text-sm text-[#6B6B6B]">
            I&apos;d prefer to give verbal feedback — please find DK, Abby, or Robert
          </label>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-green-600">{success}</p>}
        <button type="submit" disabled={isSubmitting || !selectedCandidate || !overallScore}
          className="rounded bg-[#1A1A1A] px-4 py-2 text-sm font-medium text-white hover:bg-[#333] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
        </button>
      </form>

      {/* Feedback List */}
      <FeedbackList feedbackList={feedbackList} onDelete={async (id) => {
        if (!confirm('Delete this feedback?')) return;
        try {
          const res = await fetch(`/api/recruiting/feedback/${id}`, { method: 'DELETE' });
          const data = await res.json();
          if (data.success) await fetchFeedback();
          else setError(data.error || 'Failed to delete');
        } catch { setError('Failed to delete feedback'); }
      }} />
    </div>
  );
}

function FeedbackList({ feedbackList, onDelete }: { feedbackList: FeedbackEntry[]; onDelete: (id: string) => void }) {
  if (feedbackList.length === 0) {
    return (
      <div className="rounded border border-dashed border-[#D4D4D4] bg-[#FAFAFA] p-8 text-center">
        <p className="text-sm text-[#999999]">No feedback submitted yet</p>
      </div>
    );
  }

  // Group by candidate
  const grouped: Record<string, FeedbackEntry[]> = {};
  for (const f of feedbackList) {
    const key = f.candidate.name;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(f);
  }

  return (
    <div className="space-y-6">
      <h3 className="text-xs font-black uppercase tracking-widest text-[#999999]">All Feedback</h3>
      {Object.entries(grouped).map(([candidateName, entries]) => (
        <div key={candidateName} className="rounded border border-[#D4D4D4] bg-white">
          <div className="border-b border-[#E5E5E5] bg-[#FAFAFA] px-5 py-3">
            <p className="text-sm font-bold text-[#1A1A1A]">{candidateName}</p>
            <p className="text-xs text-[#999999]">{entries[0].candidate.role || 'No role'} · {entries.length} feedback{entries.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="divide-y divide-[#E5E5E5]">
            {entries.map(f => (
              <div key={f.id} className="px-5 py-4">
                <div className="mb-3 flex items-center gap-2">
                  {f.submittedByImage ? (
                    <Image src={f.submittedByImage} alt="" width={24} height={24} className="rounded-full" />
                  ) : (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#E5E5E5] text-[10px] font-bold text-[#6B6B6B]">
                      {(f.submittedByName || f.submittedBy).charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="text-sm font-medium text-[#1A1A1A]">{f.submittedByName || f.submittedBy}</span>
                  {f.overallScore && (
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      f.overallScore >= 3 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {f.overallScore}/4
                    </span>
                  )}
                  <span className="text-xs text-[#999999]">
                    {new Date(f.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  </span>
                  {f.prefersVerbal && <span className="rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-bold text-orange-700">Verbal</span>}
                  <button type="button" onClick={() => onDelete(f.id)}
                    className="ml-auto rounded p-1 text-[#CCCCCC] hover:bg-red-50 hover:text-red-500 transition-colors" title="Delete feedback">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
                {/* New structured fields */}
                {f.technicalFeedback && (
                  <div className="mb-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#999]">Technical</p>
                    <p className="text-sm text-[#1A1A1A] whitespace-pre-wrap">{f.technicalFeedback}</p>
                  </div>
                )}
                {f.behavioralFeedback && (
                  <div className="mb-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#999]">Behavioral</p>
                    <p className="text-sm text-[#1A1A1A] whitespace-pre-wrap">{f.behavioralFeedback}</p>
                  </div>
                )}
                {f.additionalNotes && (
                  <div className="mb-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#999]">Additional Notes</p>
                    <p className="text-sm text-[#1A1A1A] whitespace-pre-wrap">{f.additionalNotes}</p>
                  </div>
                )}
                {/* Fallback for legacy feedback without structured fields */}
                {!f.technicalFeedback && !f.behavioralFeedback && !f.overallScore && (
                  <p className="text-sm text-[#1A1A1A] whitespace-pre-wrap">{f.feedback}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
