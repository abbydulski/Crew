'use client';

import { useState } from 'react';
import { CHECKIN_TYPE_LABEL, CheckinType } from './types';

interface Props {
  userId: string;
  onLogged: () => Promise<void>;
}

const TYPES: CheckinType[] = ['CHECK_IN', 'PROMOTION', 'NOTE'];

export default function CheckinForm({ userId, onLogged }: Props) {
  const [type, setType] = useState<CheckinType>('CHECK_IN');
  const [notes, setNotes] = useState('');
  const [loggedAt, setLoggedAt] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setSaving(true); setError('');
    try {
      const res = await fetch(`/api/team/tracker/${userId}/checkins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, notes, loggedAt: loggedAt || undefined }),
      });
      const data = await res.json();
      if (data.success) {
        setNotes(''); setLoggedAt(''); setType('CHECK_IN');
        await onLogged();
      } else { setError(data.error || 'Failed to log'); }
    } catch { setError('Failed to log'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-2 border border-[#00B0FF]/30 bg-[#00B0FF]/5 p-3">
      <div className="flex flex-wrap gap-1">
        {TYPES.map((t) => {
          const active = type === t;
          return (
            <button key={t} type="button" onClick={() => setType(t)}
              className={`px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.15em] border transition-colors ${
                active
                  ? 'bg-[var(--foreground)] text-[var(--background)] border-[var(--foreground)]'
                  : 'bg-transparent text-[var(--border-light)] border-[var(--border-light)] hover:border-[var(--foreground)]'
              }`}>
              {CHECKIN_TYPE_LABEL[t]}
            </button>
          );
        })}
      </div>
      <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
        placeholder="Notes (optional)…"
        className="w-full border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 text-xs resize-none" />
      <div className="flex items-center gap-2">
        <input type="date" value={loggedAt} onChange={(e) => setLoggedAt(e.target.value)}
          className="border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-[10px] font-mono" />
        <span className="text-[9px] uppercase tracking-wider text-[var(--border-light)]">leave blank for today</span>
        <button type="button" disabled={saving} onClick={submit}
          className="ml-auto border border-[var(--border)] bg-[var(--foreground)] px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[var(--background)] hover:opacity-80 disabled:opacity-30 transition-colors">
          {saving ? 'Logging…' : 'Log'}
        </button>
      </div>
      {error && <p className="text-[10px] text-red-700">{error}</p>}
    </div>
  );
}
