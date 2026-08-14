'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import PageLoading from '@/components/PageLoading';
import {
  QUESTION_BANK_TEAMS,
  TEAM_QUESTION_TAGS,
  QUESTION_DIFFICULTY_OPTIONS,
} from '@/lib/constants';
import { QuestionEditor } from './QuestionEditor';

export interface InterviewQuestion {
  id: string;
  team: string;
  tags: string[];
  question: string;
  answer: string | null;
  difficulty: string | null;
  createdBy: string | null;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function QuestionBankPage() {
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [team, setTeam] = useState<string>(QUESTION_BANK_TEAMS[0]);
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchQuestions = useCallback(async () => {
    try {
      const res = await fetch('/api/question-bank');
      const data = await res.json();
      if (data.success) setQuestions(data.data);
      else setError(data.error || 'Failed to load');
    } catch (err) { console.error('Failed to fetch questions:', err); setError('Failed to load'); }
  }, []);

  useEffect(() => {
    fetchQuestions().finally(() => setIsLoading(false));
  }, [fetchQuestions]);

  // Reset discipline filter when switching to a team without/with different tags.
  useEffect(() => { setTagFilter(null); }, [team]);

  const teamTags = TEAM_QUESTION_TAGS[team] || [];

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return questions
      .filter((it) => it.team === team)
      .filter((it) => !tagFilter || it.tags.includes(tagFilter))
      .filter((it) => !q || it.question.toLowerCase().includes(q) || (it.answer || '').toLowerCase().includes(q));
  }, [questions, team, tagFilter, query]);

  const handleSaved = async () => {
    setShowNew(false);
    setEditingId(null);
    await fetchQuestions();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this question permanently?')) return;
    try {
      const res = await fetch(`/api/question-bank/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) await fetchQuestions();
      else setError(data.error || 'Failed to delete');
    } catch { setError('Failed to delete'); }
  };

  if (isLoading) return <PageLoading />;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-end justify-between gap-4 border-b border-[var(--border)] pb-4">
        <div>
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-[var(--foreground)]">Question Bank</h2>
          <p className="mt-1 text-[11px] text-[var(--text-secondary)]">Technical interview questions by team</p>
        </div>
        <button type="button" onClick={() => { setShowNew((v) => !v); setEditingId(null); }}
          className="border border-[var(--border)] bg-[var(--foreground)] px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-[var(--background)] hover:opacity-80 transition-colors shrink-0">
          {showNew ? 'Cancel' : '+ New Question'}
        </button>
      </div>

      {showNew && (
        <QuestionEditor mode="create" team={team} onSaved={handleSaved} onCancel={() => setShowNew(false)} setError={setError} />
      )}

      {/* Team tabs */}
      <div className="mb-4 flex flex-wrap gap-0 border-b border-[var(--border-light)]">
        {QUESTION_BANK_TEAMS.map((t) => {
          const count = questions.filter((it) => it.team === t).length;
          const active = team === t;
          return (
            <button key={t} type="button" onClick={() => setTeam(t)}
              className={`px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] border-b-2 -mb-px transition-colors ${
                active ? 'border-[var(--foreground)] text-[var(--foreground)]'
                       : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--foreground)]'
              }`}>
              {t} ({count})
            </button>
          );
        })}
      </div>

      {/* Discipline filter chips (teams with tags, e.g. Hardware) */}
      {teamTags.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          <FilterChip label="All" active={tagFilter === null} onClick={() => setTagFilter(null)} />
          {teamTags.map((tg) => (
            <FilterChip key={tg} label={tg} active={tagFilter === tg} onClick={() => setTagFilter(tg)} />
          ))}
        </div>
      )}

      <div className="mb-6">
        <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search questions…"
          className="w-full border border-[var(--border)] bg-[var(--card-background)] px-3 py-2 text-sm" />
      </div>

      {error && <p className="mb-3 text-xs text-red-700">{error}</p>}

      {visible.length === 0 ? (
        <div className="border border-dashed border-[var(--border-light)] bg-[var(--card-background)] p-8 text-center">
          <p className="text-[11px] uppercase tracking-wider text-[var(--border-light)]">
            {query || tagFilter ? 'No matching questions' : `No ${team} questions yet`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {visible.map((it) => (
            editingId === it.id ? (
              <QuestionEditor key={it.id} mode="edit" team={it.team} question={it} onSaved={handleSaved} onCancel={() => setEditingId(null)} setError={setError} />
            ) : (
              <QuestionCard key={it.id} item={it} onEdit={() => { setEditingId(it.id); setShowNew(false); }} onDelete={() => handleDelete(it.id)} />
            )
          ))}
        </div>
      )}
    </div>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.15em] border transition-colors ${
        active ? 'bg-[var(--foreground)] text-[var(--background)] border-[var(--foreground)]'
               : 'bg-transparent text-[var(--border-light)] border-[var(--border-light)] hover:border-[var(--foreground)] hover:text-[var(--foreground)]'
      }`}>
      {label}
    </button>
  );
}

function QuestionCard({ item, onEdit, onDelete }: { item: InterviewQuestion; onEdit: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const difficulty = QUESTION_DIFFICULTY_OPTIONS.includes(item.difficulty as never) ? item.difficulty : null;
  return (
    <div className="border border-[var(--border)] bg-[var(--card-background)] p-5">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-[9px] uppercase tracking-wider">
        {item.tags.map((t) => (
          <span key={t} className="border border-[var(--border-light)] px-1.5 py-0.5 text-[var(--text-secondary)]">{t}</span>
        ))}
        {difficulty && <span className="text-[var(--border-light)]">· {difficulty}</span>}
      </div>
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-start justify-between gap-3 text-left">
        <span className="text-sm font-black text-[var(--foreground)]">{item.question}</span>
        <span className="font-mono text-[10px] text-[var(--text-secondary)] shrink-0 pt-0.5">{open ? '−' : '+'}</span>
      </button>
      {open && item.answer && (
        <div className="mt-3 border-t border-[var(--border-light)] pt-3 text-sm text-[var(--text-secondary)] whitespace-pre-wrap">{item.answer}</div>
      )}
      <div className="mt-3 flex items-center gap-3 text-[10px] uppercase tracking-wider">
        <button type="button" onClick={onEdit} className="text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors">Edit</button>
        <button type="button" onClick={onDelete} className="ml-auto text-[var(--text-secondary)] hover:text-red-700 transition-colors">Delete</button>
      </div>
    </div>
  );
}
