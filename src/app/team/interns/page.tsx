'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import PageLoading from '@/components/PageLoading';
import { daysSince, PROBATION_REVIEW_DAYS } from '../tracker/types';

interface Intern {
  id: string;
  name: string | null;
  email: string;
  team: string | null;
  manager: string | null;
  startDate: string | null;
  plannedConversionDate: string | null;
}

export default function InternsDashboardPage() {
  const [interns, setInterns] = useState<Intern[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [now] = useState(() => Date.now());

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/team/tracker');
      const data = await res.json();
      if (data.success) {
        setInterns(data.data.filter((u: { employmentType: string | null }) => u.employmentType === 'Intern'));
      } else setError(data.error || 'Failed to load');
    } catch { setError('Failed to load'); }
  }, []);

  useEffect(() => { load().finally(() => setIsLoading(false)); }, [load]);

  const sorted = useMemo(() => {
    return [...interns].sort((a, b) => {
      const da = daysSince(a.startDate) ?? -1;
      const db = daysSince(b.startDate) ?? -1;
      return db - da; // longest tenure first
    });
  }, [interns]);

  if (isLoading) return <PageLoading />;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-end justify-between gap-4 border-b border-[var(--border)] pb-4">
        <div>
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-[var(--foreground)]">Intern Pipeline</h2>
          <p className="mt-1 text-[11px] text-[var(--text-secondary)]">{interns.length} active intern{interns.length !== 1 ? 's' : ''} · sorted by tenure</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/team/planning"
            className="border border-[var(--border)] bg-[var(--card-background)] px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-[var(--foreground)] hover:border-[var(--foreground)] transition-colors shrink-0">
            Planning →
          </Link>
          <Link href="/team/tracker"
            className="border border-[var(--border)] bg-[var(--card-background)] px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-[var(--foreground)] hover:border-[var(--foreground)] transition-colors shrink-0">
            ← Tracker
          </Link>
        </div>
      </div>

      {error && <p className="mb-3 text-xs text-red-700">{error}</p>}

      {sorted.length === 0 ? (
        <div className="border border-dashed border-[var(--border-light)] bg-[var(--card-background)] p-10 text-center">
          <p className="text-[11px] uppercase tracking-wider text-[var(--border-light)]">No active interns in the tracker.</p>
        </div>
      ) : (
        <div className="border border-[var(--border)]">
          <div className="grid grid-cols-[2fr_1fr_1fr_120px_120px_80px] gap-3 border-b border-[var(--border)] bg-[var(--card-background)] px-4 py-2 text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-secondary)]">
            <div>Name</div>
            <div>Team</div>
            <div>Manager</div>
            <div>Tenure</div>
            <div>Conversion</div>
            <div className="text-right">Status</div>
          </div>
          {sorted.map((i) => {
            const days = daysSince(i.startDate);
            const daysTo90 = days !== null ? PROBATION_REVIEW_DAYS.end - days : null;
            const overdue = daysTo90 !== null && daysTo90 < 0;
            const reviewDue = daysTo90 !== null && daysTo90 >= 0 && daysTo90 <= (PROBATION_REVIEW_DAYS.end - PROBATION_REVIEW_DAYS.start);
            const convDate = i.plannedConversionDate ? new Date(i.plannedConversionDate) : null;
            const convDaysUntil = convDate ? Math.ceil((convDate.getTime() - now) / (1000 * 60 * 60 * 24)) : null;

            return (
              <div key={i.id} className="grid grid-cols-[2fr_1fr_1fr_120px_120px_80px] items-center gap-3 border-t border-[var(--border-light)] px-4 py-3 text-[11px] font-mono">
                <div className="min-w-0">
                  <p className="font-black text-[var(--foreground)] truncate">{i.name || i.email.split('@')[0]}</p>
                  <p className="text-[9px] text-[var(--text-secondary)] truncate">{i.email}</p>
                </div>
                <div className="text-[var(--text-secondary)]">{i.team || '—'}</div>
                <div className="text-[var(--text-secondary)]">{i.manager || '—'}</div>
                <div>
                  <span className="font-black">{days ?? '—'}d</span>
                  {daysTo90 !== null && !overdue && (
                    <span className="ml-1 text-[9px] text-[var(--text-secondary)]">({daysTo90}d to 90)</span>
                  )}
                </div>
                <div className="text-[10px]">
                  {convDate ? (
                    <div>
                      <span>{convDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}</span>
                      <span className={`ml-1 text-[9px] font-black ${convDaysUntil !== null && convDaysUntil < 0 ? 'text-red-700' : 'text-amber-700'}`}>
                        {convDaysUntil !== null && convDaysUntil < 0 ? `${Math.abs(convDaysUntil)}d ago` : convDaysUntil !== null ? `in ${convDaysUntil}d` : ''}
                      </span>
                    </div>
                  ) : (
                    <span className="text-[var(--border-light)]">Not set</span>
                  )}
                </div>
                <div className="text-right">
                  {overdue ? (
                    <span className="bg-red-100 text-red-800 px-1.5 py-0.5 text-[9px] font-black uppercase">Overdue</span>
                  ) : reviewDue ? (
                    <span className="bg-amber-100 text-amber-900 px-1.5 py-0.5 text-[9px] font-black uppercase">Review</span>
                  ) : (
                    <span className="text-[9px] uppercase text-[var(--border-light)]">Active</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
