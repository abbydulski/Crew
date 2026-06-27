'use client';

import { useCallback, useEffect, useState } from 'react';
import PageLoading from '@/components/PageLoading';

type FaqStatus = 'PENDING' | 'PUBLISHED' | 'ARCHIVED';

interface Faq {
  id: string;
  question: string;
  answer: string | null;
  status: FaqStatus;
  submittedBy: string | null;
  submittedByName: string | null;
  answeredBy: string | null;
  answeredAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const TABS: { key: FaqStatus; label: string }[] = [
  { key: 'PENDING', label: 'Pending' },
  { key: 'PUBLISHED', label: 'Published' },
  { key: 'ARCHIVED', label: 'Archived' },
];

export default function FaqAdminPage() {
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tab, setTab] = useState<FaqStatus>('PENDING');
  const [error, setError] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchFaqs = useCallback(async () => {
    try {
      const res = await fetch('/api/faq/admin');
      const data = await res.json();
      if (data.success) setFaqs(data.data);
      else setError(data.error || 'Failed to load');
    } catch (err) { console.error('Failed to fetch FAQs:', err); }
  }, []);

  useEffect(() => {
    fetchFaqs().finally(() => setIsLoading(false));
  }, [fetchFaqs]);

  const handlePatch = async (id: string, body: Record<string, unknown>) => {
    try {
      const res = await fetch(`/api/faq/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) await fetchFaqs();
      else setError(data.error || 'Failed to update');
    } catch { setError('Failed to update'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this FAQ permanently?')) return;
    try {
      const res = await fetch(`/api/faq/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) await fetchFaqs();
      else setError(data.error || 'Failed to delete');
    } catch { setError('Failed to delete'); }
  };

  const handleCreate = async (status: FaqStatus) => {
    if (!newQuestion.trim()) { setError('Question is required'); return; }
    if (status === 'PUBLISHED' && !newAnswer.trim()) { setError('Answer required to publish'); return; }
    setCreating(true);
    setError('');
    try {
      const res = await fetch('/api/faq/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: newQuestion.trim(), answer: newAnswer.trim(), status }),
      });
      const data = await res.json();
      if (data.success) {
        setNewQuestion(''); setNewAnswer(''); setShowNew(false);
        setTab(status);
        await fetchFaqs();
      } else {
        setError(data.error || 'Failed to create');
      }
    } catch { setError('Failed to create'); }
    finally { setCreating(false); }
  };

  if (isLoading) return <PageLoading />;

  const visible = faqs.filter((f) => f.status === tab);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-end justify-between gap-4 border-b border-[var(--border)] pb-4">
        <div>
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-[var(--foreground)]">FAQ Admin</h2>
          <p className="mt-1 text-[11px] text-[var(--text-secondary)]">Answer submissions, publish, archive</p>
        </div>
        <button type="button" onClick={() => setShowNew((v) => !v)}
          className="border border-[var(--border)] bg-[var(--foreground)] px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-[var(--background)] hover:opacity-80 transition-colors shrink-0">
          {showNew ? 'Cancel' : '+ New FAQ'}
        </button>
      </div>

      {showNew && (
        <div className="mb-6 border border-[var(--border)] bg-[var(--card-background)] p-5">
          <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.15em] text-[var(--text-secondary)]">Question</label>
          <textarea value={newQuestion} onChange={(e) => setNewQuestion(e.target.value)} rows={2}
            className="mb-3 w-full border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm resize-none" autoFocus />
          <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.15em] text-[var(--text-secondary)]">Answer</label>
          <textarea value={newAnswer} onChange={(e) => setNewAnswer(e.target.value)} rows={4}
            placeholder="Write the answer here…"
            className="mb-3 w-full border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm resize-none" />
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={creating || !newQuestion.trim() || !newAnswer.trim()} onClick={() => handleCreate('PUBLISHED')}
              className="border border-[var(--border)] bg-[var(--foreground)] px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-[var(--background)] hover:opacity-80 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              {creating ? 'Saving…' : 'Publish'}
            </button>
            <button type="button" disabled={creating || !newQuestion.trim()} onClick={() => handleCreate('PENDING')}
              className="border border-[var(--border)] bg-[var(--card-background)] px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-[var(--foreground)] hover:bg-[var(--foreground)] hover:text-[var(--background)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              Save as draft
            </button>
          </div>
        </div>
      )}

      <div className="mb-5 flex gap-0 border-b border-[var(--border-light)]">
        {TABS.map((t) => {
          const count = faqs.filter((f) => f.status === t.key).length;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] border-b-2 -mb-px transition-colors ${
                active
                  ? 'border-[var(--foreground)] text-[var(--foreground)]'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--foreground)]'
              }`}
            >
              {t.label} ({count})
            </button>
          );
        })}
      </div>

      {error && <p className="mb-3 text-xs text-red-700">{error}</p>}

      {visible.length === 0 ? (
        <div className="border border-dashed border-[var(--border-light)] bg-[var(--card-background)] p-8 text-center">
          <p className="text-[11px] uppercase tracking-wider text-[var(--border-light)]">No {tab.toLowerCase()} FAQs</p>
        </div>
      ) : (
        <div className="space-y-4">
          {visible.map((f) => (
            <FaqRow key={f.id} faq={f} onPatch={handlePatch} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}

function FaqRow({
  faq, onPatch, onDelete,
}: { faq: Faq; onPatch: (id: string, body: Record<string, unknown>) => Promise<void>; onDelete: (id: string) => void }) {
  const [question, setQuestion] = useState(faq.question);
  const [answer, setAnswer] = useState(faq.answer || '');
  const [saving, setSaving] = useState(false);

  const dirty = question !== faq.question || answer !== (faq.answer || '');

  const save = async (extra: Record<string, unknown> = {}) => {
    setSaving(true);
    await onPatch(faq.id, { question, answer, ...extra });
    setSaving(false);
  };

  return (
    <div className="border border-[var(--border)] bg-[var(--card-background)] p-5">
      <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">
        <span>From: {faq.submittedByName || faq.submittedBy || 'Unknown'}</span>
        <span>{new Date(faq.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
      </div>
      <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.15em] text-[var(--text-secondary)]">Question</label>
      <textarea value={question} onChange={(e) => setQuestion(e.target.value)} rows={2}
        className="mb-3 w-full border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm resize-none" />
      <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.15em] text-[var(--text-secondary)]">Answer</label>
      <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} rows={4}
        placeholder="Write the published answer here…"
        className="mb-3 w-full border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm resize-none" />
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" disabled={saving || !dirty} onClick={() => save()}
          className="border border-[var(--border)] bg-[var(--card-background)] px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-[var(--foreground)] hover:bg-[var(--foreground)] hover:text-[var(--background)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          Save
        </button>
        {faq.status !== 'PUBLISHED' && (
          <button type="button" disabled={saving || !answer.trim()} onClick={() => save({ status: 'PUBLISHED' })}
            className="border border-[var(--border)] bg-[var(--foreground)] px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-[var(--background)] hover:opacity-80 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            Publish
          </button>
        )}
        {faq.status !== 'ARCHIVED' && (
          <button type="button" disabled={saving} onClick={() => save({ status: 'ARCHIVED' })}
            className="border border-[var(--border)] bg-[var(--card-background)] px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-[var(--foreground)] hover:bg-[var(--foreground)] hover:text-[var(--background)] disabled:opacity-30 transition-colors">
            Archive
          </button>
        )}
        {faq.status === 'ARCHIVED' && (
          <button type="button" disabled={saving} onClick={() => save({ status: 'PENDING' })}
            className="border border-[var(--border)] bg-[var(--card-background)] px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-[var(--foreground)] hover:bg-[var(--foreground)] hover:text-[var(--background)] disabled:opacity-30 transition-colors">
            Restore
          </button>
        )}
        <button type="button" onClick={() => onDelete(faq.id)}
          className="ml-auto text-[10px] uppercase tracking-wider text-[var(--text-secondary)] hover:text-red-700 transition-colors">
          Delete
        </button>
      </div>
    </div>
  );
}
