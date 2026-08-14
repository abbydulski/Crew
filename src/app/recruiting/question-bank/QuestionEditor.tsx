'use client';

import { useState } from 'react';
import {
  QUESTION_BANK_TEAMS,
  TEAM_QUESTION_TAGS,
  QUESTION_DIFFICULTY_OPTIONS,
} from '@/lib/constants';
import type { InterviewQuestion } from './page';

interface Props {
  mode: 'create' | 'edit';
  team: string;
  question?: InterviewQuestion;
  onSaved: () => void | Promise<void>;
  onCancel: () => void;
  setError: (msg: string) => void;
}

export function QuestionEditor({ mode, team: initialTeam, question, onSaved, onCancel, setError }: Props) {
  const [team, setTeam] = useState(question?.team || initialTeam);
  const [tags, setTags] = useState<string[]>(question?.tags || []);
  const [text, setText] = useState(question?.question || '');
  const [answer, setAnswer] = useState(question?.answer || '');
  const [difficulty, setDifficulty] = useState(question?.difficulty || '');
  const [saving, setSaving] = useState(false);

  const teamTags = TEAM_QUESTION_TAGS[team] || [];

  const toggleTag = (t: string) =>
    setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  const changeTeam = (t: string) => {
    setTeam(t);
    // Drop tags not valid for the newly selected team.
    const allowed = new Set(TEAM_QUESTION_TAGS[t] || []);
    setTags((prev) => prev.filter((x) => allowed.has(x)));
  };

  const save = async () => {
    if (!text.trim()) { setError('Question is required'); return; }
    setSaving(true);
    setError('');
    try {
      const url = mode === 'create' ? '/api/question-bank' : `/api/question-bank/${question!.id}`;
      const method = mode === 'create' ? 'POST' : 'PATCH';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team, tags, question: text.trim(), answer: answer.trim(), difficulty }),
      });
      const data = await res.json();
      if (data.success) await onSaved();
      else setError(data.error || 'Failed to save');
    } catch { setError('Failed to save'); }
    finally { setSaving(false); }
  };

  return (
    <div className="mb-6 border border-[var(--border)] bg-[var(--card-background)] p-5">
      <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.15em] text-[var(--text-secondary)]">Team</label>
          <select value={team} onChange={(e) => changeTeam(e.target.value)}
            className="w-full border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm">
            {QUESTION_BANK_TEAMS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.15em] text-[var(--text-secondary)]">Difficulty</label>
          <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}
            className="w-full border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm">
            <option value="">—</option>
            {QUESTION_DIFFICULTY_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>

      {teamTags.length > 0 && (
        <div className="mb-3">
          <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.15em] text-[var(--text-secondary)]">Discipline</label>
          <div className="flex flex-wrap gap-2">
            {teamTags.map((t) => {
              const active = tags.includes(t);
              return (
                <button key={t} type="button" onClick={() => toggleTag(t)}
                  className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.15em] border transition-colors ${
                    active ? 'bg-[var(--foreground)] text-[var(--background)] border-[var(--foreground)]'
                           : 'bg-transparent text-[var(--border-light)] border-[var(--border-light)] hover:border-[var(--foreground)] hover:text-[var(--foreground)]'
                  }`}>
                  {t}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.15em] text-[var(--text-secondary)]">Question</label>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} autoFocus
        className="mb-3 w-full border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm resize-none" />

      <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.15em] text-[var(--text-secondary)]">Answer / rubric (optional)</label>
      <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} rows={4}
        placeholder="Model answer, what to look for…"
        className="mb-3 w-full border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm resize-none" />

      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={saving || !text.trim()} onClick={save}
          className="border border-[var(--border)] bg-[var(--foreground)] px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-[var(--background)] hover:opacity-80 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          {saving ? 'Saving…' : mode === 'create' ? 'Add Question' : 'Save'}
        </button>
        <button type="button" onClick={onCancel}
          className="border border-[var(--border)] bg-[var(--card-background)] px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-[var(--foreground)] hover:bg-[var(--foreground)] hover:text-[var(--background)] transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}
