'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import PageLoading from '@/components/PageLoading';
import { PROBATION_REVIEW_DAYS } from '../tracker/types';

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
  startDate: string | null;
  daysSinceStart: number | null;
  plannedConversionDate: string | null;
}

interface Totals { filled: number; open: number; projected: number }

export default function HeadcountPlannerPage() {
  const [rows, setRows] = useState<TeamRow[]>([]);
  const [totals, setTotals] = useState<Totals>({ filled: 0, open: 0, projected: 0 });
  const [interns, setInterns] = useState<Intern[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  // Set of intern IDs the user has toggled to "convert" in the scenario
  const [convertIds, setConvertIds] = useState<Set<string>>(new Set());

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

  const toggleConvert = (id: string) => {
    setConvertIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => setConvertIds(new Set(interns.map((i) => i.id)));
  const selectNone = () => setConvertIds(new Set());

  // Adjusted totals: each converted intern is one fewer intern, but stays in filled count (now FT).
  // No headcount change — they just shift from "Intern" to "Full-Time" in the mix.
  const scenarioFtGain = convertIds.size;

  const adjustedTotals = useMemo(() => ({
    filled: totals.filled,
    open: totals.open,
    projected: totals.projected,
    internCount: interns.length - scenarioFtGain,
    ftGain: scenarioFtGain,
  }), [totals, interns.length, scenarioFtGain]);

  if (isLoading) return <PageLoading />;

  const maxProjected = Math.max(1, ...rows.map((r) => r.projected));

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-end justify-between gap-4 border-b border-[var(--border)] pb-4">
        <div>
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-[var(--foreground)]">Headcount Planner</h2>
          <p className="mt-1 text-[11px] text-[var(--text-secondary)]">Filled vs. open roles per team · scenario planning</p>
        </div>
        <Link href="/team/tracker"
          className="border border-[var(--border)] bg-[var(--card-background)] px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-[var(--foreground)] hover:border-[var(--foreground)] transition-colors shrink-0">
          ← Tracker
        </Link>
      </div>

      {/* Summary tiles */}
      <div className="mb-6 grid grid-cols-4 gap-3">
        {[
          { label: 'Headcount', value: adjustedTotals.filled, sub: `${adjustedTotals.internCount} intern${adjustedTotals.internCount !== 1 ? 's' : ''}` },
          { label: 'Open roles', value: adjustedTotals.open, sub: 'to hire' },
          { label: 'Projected', value: adjustedTotals.projected, sub: `+${adjustedTotals.open} if all filled` },
          { label: 'Conversions', value: adjustedTotals.ftGain, sub: scenarioFtGain > 0 ? 'intern → FT' : 'none selected' },
        ].map((f) => (
          <div key={f.label} className="border border-[var(--border)] bg-[var(--card-background)] px-4 py-3">
            <div className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-secondary)]">{f.label}</div>
            <div className="mt-1 font-mono text-2xl font-black text-[var(--foreground)]">{f.value}</div>
            <div className="text-[9px] uppercase tracking-wider text-[var(--border-light)]">{f.sub}</div>
          </div>
        ))}
      </div>

      {error && <p className="mb-3 text-xs text-red-700">{error}</p>}

      {/* Intern conversion selector */}
      {interns.length > 0 && (
        <div className="mb-6 border border-[var(--border)] bg-[var(--card-background)]">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-2">
            <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-secondary)]">
              Convert Interns to Full-Time ({convertIds.size}/{interns.length})
            </h3>
            <div className="flex gap-2">
              <button type="button" onClick={selectAll}
                className="text-[9px] font-black uppercase tracking-wider text-[var(--foreground)] hover:underline">
                Select all
              </button>
              <span className="text-[var(--border-light)]">·</span>
              <button type="button" onClick={selectNone}
                className="text-[9px] font-black uppercase tracking-wider text-[var(--foreground)] hover:underline">
                Clear
              </button>
            </div>
          </div>
          <div className="divide-y divide-[var(--border-light)]">
            {interns.map((intern) => {
              const checked = convertIds.has(intern.id);
              const days = intern.daysSinceStart;
              const overdue = days !== null && days > PROBATION_REVIEW_DAYS.end;
              const reviewDue = days !== null && days >= PROBATION_REVIEW_DAYS.start && days <= PROBATION_REVIEW_DAYS.end;
              return (
                <label key={intern.id}
                  className={`flex cursor-pointer items-center gap-3 px-4 py-2.5 transition-colors hover:bg-[var(--background)] ${checked ? 'bg-[var(--background)]' : ''}`}>
                  <input type="checkbox" checked={checked} onChange={() => toggleConvert(intern.id)}
                    className="h-3.5 w-3.5 accent-[var(--foreground)]" />
                  <div className="min-w-0 flex-1">
                    <span className="text-[11px] font-black text-[var(--foreground)]">{intern.name}</span>
                    <span className="ml-2 text-[10px] text-[var(--text-secondary)]">{intern.team}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-mono text-[var(--text-secondary)]">
                    {days !== null && <span>{days}d tenure</span>}
                    {overdue && <span className="bg-red-100 px-1.5 py-0.5 text-[9px] font-black uppercase text-red-700">Overdue</span>}
                    {reviewDue && <span className="bg-amber-100 px-1.5 py-0.5 text-[9px] font-black uppercase text-amber-700">Review</span>}
                    {intern.plannedConversionDate && (
                      <span className="text-[9px] uppercase text-[var(--text-secondary)]">
                        conv {new Date(intern.plannedConversionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Team bars */}
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
