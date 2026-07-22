'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import PageLoading from '@/components/PageLoading';

interface TeamRow {
  team: string;
  filled: number;
  open: number;
  projected: number;
  openTitles: string[];
}

interface Intern {
  id: string;
  name: string;
  team: string;
  manager: string | null;
  startDate: string | null;
  daysSinceStart: number | null;
  plannedConversionDate: string | null;
}

interface Totals { filled: number; open: number; projected: number }

export default function HeadcountPlannerPage() {
  const [rows, setRows] = useState<TeamRow[]>([]);
  const [interns, setInterns] = useState<Intern[]>([]);
  const [totals, setTotals] = useState<Totals>({ filled: 0, open: 0, projected: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Scenario controls
  const [scenarioDate, setScenarioDate] = useState('');
  const [autoConvert, setAutoConvert] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/team/planning');
      const data = await res.json();
      if (data.success) {
        setRows(data.data.teams);
        setTotals(data.data.totals);
        setInterns(data.data.interns || []);
      } else setError(data.error || 'Failed to load');
    } catch { setError('Failed to load'); }
  }, []);

  useEffect(() => { load().finally(() => setIsLoading(false)); }, [load]);

  // Compute scenario: which interns would convert by the chosen date?
  const scenario = useMemo(() => {
    if (!scenarioDate || !autoConvert) return { converting: [] as Intern[], delta: 0 };
    const target = new Date(scenarioDate).getTime();
    const converting = interns.filter((i) => {
      // Convert if their 90-day mark falls before or on target date
      if (!i.startDate) return false;
      const ninetyDayMark = new Date(i.startDate).getTime() + 90 * 24 * 60 * 60 * 1000;
      return ninetyDayMark <= target;
    });
    return { converting, delta: converting.length };
  }, [scenarioDate, autoConvert, interns]);

  // Adjusted totals under scenario
  const adjustedTotals = useMemo(() => {
    if (!autoConvert || scenario.delta === 0) return totals;
    // Conversions don't change headcount — they change the mix (intern→FT).
    // But headcount stays the same. Show the mix shift.
    return totals;
  }, [totals, autoConvert, scenario.delta]);

  if (isLoading) return <PageLoading />;

  const maxProjected = Math.max(1, ...rows.map((r) => r.projected));

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-end justify-between gap-4 border-b border-[var(--border)] pb-4">
        <div>
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-[var(--foreground)]">Headcount Planner</h2>
          <p className="mt-1 text-[11px] text-[var(--text-secondary)]">Filled vs. open roles per team · scenario planning for intern conversions</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/team/interns"
            className="border border-[var(--border)] bg-[var(--card-background)] px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-[var(--foreground)] hover:border-[var(--foreground)] transition-colors shrink-0">
            Interns →
          </Link>
          <Link href="/team/tracker"
            className="border border-[var(--border)] bg-[var(--card-background)] px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-[var(--foreground)] hover:border-[var(--foreground)] transition-colors shrink-0">
            ← Tracker
          </Link>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-3">
        {[
          { label: 'Today', value: adjustedTotals.filled, sub: `${interns.length} intern${interns.length !== 1 ? 's' : ''}` },
          { label: 'Open roles', value: adjustedTotals.open, sub: 'to hire' },
          { label: 'Projected', value: adjustedTotals.projected, sub: `+${adjustedTotals.open} if all filled` },
        ].map((f) => (
          <div key={f.label} className="border border-[var(--border)] bg-[var(--card-background)] px-4 py-3">
            <div className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-secondary)]">{f.label}</div>
            <div className="mt-1 font-mono text-2xl font-black text-[var(--foreground)]">{f.value}</div>
            <div className="text-[9px] uppercase tracking-wider text-[var(--border-light)]">{f.sub}</div>
          </div>
        ))}
      </div>

      {/* Scenario controls */}
      <div className="mb-6 border border-amber-300 bg-amber-50 p-4">
        <h3 className="mb-3 text-[9px] font-black uppercase tracking-[0.2em] text-amber-800">Scenario: What-if</h3>
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="mb-1 block text-[9px] font-black uppercase tracking-[0.15em] text-amber-800">Look ahead to date</label>
            <input type="date" value={scenarioDate} onChange={(e) => setScenarioDate(e.target.value)}
              className="border border-amber-300 bg-white px-3 py-1.5 text-xs font-mono" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="autoConvert" checked={autoConvert} onChange={(e) => setAutoConvert(e.target.checked)}
              className="h-4 w-4 accent-amber-600" />
            <label htmlFor="autoConvert" className="text-[10px] font-black uppercase tracking-wider text-amber-800">
              Auto-convert interns past 90 days by that date
            </label>
          </div>
        </div>
        {autoConvert && scenarioDate && (
          <div className="mt-3">
            {scenario.converting.length === 0 ? (
              <p className="text-[10px] text-amber-700">No interns would hit their 90-day mark by {new Date(scenarioDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}.</p>
            ) : (
              <div>
                <p className="mb-2 text-[10px] font-black text-amber-800">
                  {scenario.converting.length} intern{scenario.converting.length !== 1 ? 's' : ''} would convert to FT by {new Date(scenarioDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}:
                </p>
                <div className="space-y-1">
                  {scenario.converting.map((i) => {
                    const mark = i.startDate ? new Date(new Date(i.startDate).getTime() + 90 * 24 * 60 * 60 * 1000) : null;
                    return (
                      <div key={i.id} className="flex items-center gap-3 text-[11px] font-mono">
                        <span className="font-black text-[var(--foreground)]">{i.name}</span>
                        <span className="text-amber-700">{i.team}</span>
                        <span className="text-amber-700">mgr: {i.manager || '—'}</span>
                        <span className="ml-auto text-[9px] text-amber-800">{i.daysSinceStart ?? '—'}d tenure</span>
                        {mark && <span className="text-[9px] text-amber-600">90d: {mark.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}</span>}
                      </div>
                    );
                  })}
                </div>
                <p className="mt-2 text-[9px] text-amber-600">Headcount stays the same — {scenario.delta} intern{scenario.delta !== 1 ? 's' : ''} move to Full-Time in the mix.</p>
              </div>
            )}
          </div>
        )}
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
