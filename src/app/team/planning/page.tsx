'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import PageLoading from '@/components/PageLoading';

interface TeamRow {
  team: string;
  filled: number;
  open: number;
  projected: number;
  openTitles: string[];
}

interface Totals { filled: number; open: number; projected: number }

export default function HeadcountPlannerPage() {
  const [rows, setRows] = useState<TeamRow[]>([]);
  const [totals, setTotals] = useState<Totals>({ filled: 0, open: 0, projected: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/team/planning');
      const data = await res.json();
      if (data.success) { setRows(data.data.teams); setTotals(data.data.totals); }
      else setError(data.error || 'Failed to load');
    } catch { setError('Failed to load'); }
  }, []);

  useEffect(() => { load().finally(() => setIsLoading(false)); }, [load]);

  if (isLoading) return <PageLoading />;

  // Scale bars against the largest projected headcount so the visual is comparable.
  const maxProjected = Math.max(1, ...rows.map((r) => r.projected));

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-end justify-between gap-4 border-b border-[var(--border)] pb-4">
        <div>
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-[var(--foreground)]">Headcount Planner</h2>
          <p className="mt-1 text-[11px] text-[var(--text-secondary)]">Filled vs. open roles per team · projected if all open roles are hired</p>
        </div>
        <Link href="/team/tracker"
          className="border border-[var(--border)] bg-[var(--card-background)] px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-[var(--foreground)] hover:border-[var(--foreground)] transition-colors shrink-0">
          ← Tracker
        </Link>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-3">
        {[
          { label: 'Today', value: totals.filled, sub: 'filled' },
          { label: 'Open roles', value: totals.open, sub: totals.open === 1 ? 'to hire' : 'to hire' },
          { label: 'Projected', value: totals.projected, sub: `+${totals.open} if all filled` },
        ].map((f) => (
          <div key={f.label} className="border border-[var(--border)] bg-[var(--card-background)] px-4 py-3">
            <div className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-secondary)]">{f.label}</div>
            <div className="mt-1 font-mono text-2xl font-black text-[var(--foreground)]">{f.value}</div>
            <div className="text-[9px] uppercase tracking-wider text-[var(--border-light)]">{f.sub}</div>
          </div>
        ))}
      </div>

      {error && <p className="mb-3 text-xs text-red-700">{error}</p>}

      {rows.length === 0 ? (
        <div className="border border-dashed border-[var(--border-light)] bg-[var(--card-background)] p-10 text-center">
          <p className="text-[11px] uppercase tracking-wider text-[var(--border-light)]">No teams to plan yet — add team members or post open roles.</p>
        </div>
      ) : (
        <div className="border border-[var(--border)]">
          <div className="grid grid-cols-[120px_1fr_140px] gap-3 border-b border-[var(--border)] bg-[var(--card-background)] px-4 py-2 text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-secondary)]">
            <div>Team</div>
            <div>Filled vs. open</div>
            <div className="text-right">Totals</div>
          </div>
          {rows.map((r) => {
            const filledPct = (r.filled / maxProjected) * 100;
            const openPct = (r.open / maxProjected) * 100;
            return (
              <div key={r.team} className="grid grid-cols-[120px_1fr_140px] items-center gap-3 border-t border-[var(--border-light)] px-4 py-3 text-[11px] font-mono">
                <div className="font-black uppercase tracking-wider text-[var(--foreground)]">{r.team}</div>
                <div>
                  <div className="flex h-6 w-full border border-[var(--border-light)] bg-[var(--background)]" title={r.openTitles.length ? `Open: ${r.openTitles.join(', ')}` : undefined}>
                    <div className="h-full bg-[var(--foreground)]" style={{ width: `${filledPct}%` }} />
                    <div className="h-full border-l border-[var(--background)] bg-[var(--foreground)] opacity-30" style={{ width: `${openPct}%` }} />
                  </div>
                  {r.openTitles.length > 0 && (
                    <div className="mt-1 text-[9px] uppercase tracking-wider text-[var(--text-secondary)] truncate" title={r.openTitles.join(', ')}>
                      Open: {r.openTitles.join(', ')}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div><span className="font-black text-[var(--foreground)]">{r.filled}</span> <span className="text-[var(--text-secondary)]">+ {r.open} open</span></div>
                  <div className="text-[9px] uppercase tracking-wider text-[var(--border-light)]">→ {r.projected} projected</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
