'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import PageLoading from '@/components/PageLoading';
import TrackerRow from './TrackerRow';
import AddMemberForm from './AddMemberForm';
import { TrackerUser, formatTenure, daysSince, isReviewDue, isInternOverdue } from './types';

type SortKey = 'name' | 'tenure' | 'lastCheckin';
type Tag = 'intern' | 'review' | 'overdue';

export default function TeamTrackerPage() {
  const [users, setUsers] = useState<TrackerUser[]>([]);
  const [alumniCount, setAlumniCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('lastCheckin');
  const [managerFilter, setManagerFilter] = useState('');
  const [tag, setTag] = useState<Tag | ''>('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [tRes, aRes] = await Promise.all([
        fetch('/api/team/tracker'),
        fetch('/api/team/tracker/alumni'),
      ]);
      const tData = await tRes.json();
      const aData = await aRes.json();
      if (tData.success) setUsers(tData.data); else setError(tData.error || 'Failed to load');
      if (aData.success) setAlumniCount(aData.data.length);
    } catch { setError('Failed to load'); }
  }, []);

  useEffect(() => { load().finally(() => setIsLoading(false)); }, [load]);

  // Distinct manager names actually present in the data — drives the filter dropdown.
  const managerFilterOptions = useMemo(() => {
    const set = new Set<string>();
    users.forEach((u) => { if (u.manager) set.add(u.manager); });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [users]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let matches = q
      ? users.filter((u) =>
          (u.name || '').toLowerCase().includes(q)
          || u.email.toLowerCase().includes(q)
          || (u.team || '').toLowerCase().includes(q)
          || (u.role || '').toLowerCase().includes(q))
      : users;

    if (managerFilter) {
      matches = matches.filter((u) => u.manager === managerFilter);
    }

    if (tag === 'intern') {
      matches = matches.filter((u) => u.employmentType === 'Intern');
    } else if (tag === 'review') {
      matches = matches.filter(isReviewDue);
    } else if (tag === 'overdue') {
      matches = matches.filter(isInternOverdue);
    }

    const sorted = [...matches];
    if (sort === 'name') {
      sorted.sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email));
    } else if (sort === 'tenure') {
      sorted.sort((a, b) => {
        const ta = a.startDate ? new Date(a.startDate).getTime() : Infinity;
        const tb = b.startDate ? new Date(b.startDate).getTime() : Infinity;
        return ta - tb; // longest tenure first
      });
    } else {
      // lastCheckin: oldest/never first so they pop to the top
      sorted.sort((a, b) => {
        const ta = a.lastCheckin ? new Date(a.lastCheckin.loggedAt).getTime() : 0;
        const tb = b.lastCheckin ? new Date(b.lastCheckin.loggedAt).getTime() : 0;
        return ta - tb;
      });
    }
    return sorted;
  }, [users, search, sort, managerFilter, tag]);

  // Counts on the filter chips show how many would match each tag (with manager+search applied).
  const tagCounts = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = users.filter((u) => {
      if (q && !((u.name || '').toLowerCase().includes(q)
          || u.email.toLowerCase().includes(q)
          || (u.team || '').toLowerCase().includes(q)
          || (u.role || '').toLowerCase().includes(q))) return false;
      if (managerFilter && u.manager !== managerFilter) return false;
      return true;
    });
    return {
      intern: base.filter((u) => u.employmentType === 'Intern').length,
      review: base.filter(isReviewDue).length,
      overdue: base.filter(isInternOverdue).length,
    };
  }, [users, search, managerFilter]);

  // Capture `now` once on mount so useMemo stays pure across re-renders.
  const [now] = useState(() => Date.now());

  // Fast facts: active headcount, new this quarter (last 90 days), alumni total.
  const facts = useMemo(() => {
    const ninetyDaysAgo = now - 90 * 24 * 60 * 60 * 1000;
    const newThisQuarter = users.filter((u) => {
      if (!u.startDate) return false;
      const t = new Date(u.startDate).getTime();
      return !Number.isNaN(t) && t >= ninetyDaysAgo && t <= now;
    }).length;
    return { active: users.length, newThisQuarter, alumni: alumniCount };
  }, [users, alumniCount, now]);

  // Upcoming conversions: interns with a planned conversion date, sorted soonest first.
  const upcomingConversions = useMemo(() => {
    return users
      .filter((u) => u.employmentType === 'Intern' && u.plannedConversionDate)
      .sort((a, b) => new Date(a.plannedConversionDate!).getTime() - new Date(b.plannedConversionDate!).getTime());
  }, [users]);

  // Manager options come from the directory itself — anyone in the tracker
  // can be picked as someone else's manager. Sorted by name for the dropdown.
  const managerOptions = useMemo(() => {
    return users
      .filter((u) => u.name && u.name.trim())
      .map((u) => ({ name: u.name as string, email: u.email }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [users]);

  if (isLoading) return <PageLoading />;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-end justify-between gap-4 border-b border-[var(--border)] pb-4">
        <div>
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-[var(--foreground)]">Team Tracker</h2>
          <p className="mt-1 text-[11px] text-[var(--text-secondary)]">{users.length} team member{users.length !== 1 ? 's' : ''} · tenure &amp; check-in log</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/team/planning"
            className="border border-[var(--border)] bg-[var(--card-background)] px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-[var(--foreground)] hover:border-[var(--foreground)] transition-colors shrink-0">
            Planning →
          </Link>
          <Link href="/team/alumni"
            className="border border-[var(--border)] bg-[var(--card-background)] px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-[var(--foreground)] hover:border-[var(--foreground)] transition-colors shrink-0">
            Alumni →
          </Link>
          <button type="button" onClick={() => setShowAdd((v) => !v)}
            className="border border-[var(--border)] bg-[var(--foreground)] px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-[var(--background)] hover:opacity-80 transition-colors shrink-0">
            {showAdd ? 'Cancel' : '+ Add member'}
          </button>

          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, team…"
            className="border border-[var(--border)] bg-[var(--card-background)] px-3 py-1.5 text-[11px] w-56" />
        </div>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-3">
        {[
          { label: 'Active headcount', value: facts.active },
          { label: 'New this quarter', value: facts.newThisQuarter },
          { label: 'Alumni total', value: facts.alumni },
        ].map((f) => (
          <div key={f.label} className="border border-[var(--border)] bg-[var(--card-background)] px-4 py-3">
            <div className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-secondary)]">{f.label}</div>
            <div className="mt-1 font-mono text-2xl font-black text-[var(--foreground)]">{f.value}</div>
          </div>
        ))}
      </div>

      {upcomingConversions.length > 0 && (
        <div className="mb-4 border border-amber-300 bg-amber-50 p-4">
          <h3 className="mb-2 text-[9px] font-black uppercase tracking-[0.2em] text-amber-800">Upcoming Conversions ({upcomingConversions.length})</h3>
          <div className="space-y-1">
            {upcomingConversions.map((u) => {
              const d = new Date(u.plannedConversionDate!);
              const daysUntil = Math.ceil((d.getTime() - now) / (1000 * 60 * 60 * 24));
              const past = daysUntil < 0;
              return (
                <div key={u.id} className="flex items-center gap-3 text-[11px] font-mono">
                  <span className="font-black text-[var(--foreground)]">{u.name || u.email}</span>
                  <span className="text-amber-700">{u.team || '—'}</span>
                  <span className="text-amber-700">mgr: {u.manager || '—'}</span>
                  <span className="ml-auto font-black">
                    {d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}
                  </span>
                  <span className={`text-[9px] font-black uppercase ${past ? 'text-red-700' : 'text-amber-800'}`}>
                    {past ? `${Math.abs(daysUntil)}d overdue` : `in ${daysUntil}d`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showAdd && <AddMemberForm onCreated={load} onCancel={() => setShowAdd(false)} managerOptions={managerOptions} />}

      <div className="mb-3 flex flex-wrap items-center gap-3 text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">
        <span>Sort:</span>
        {(['lastCheckin', 'tenure', 'name'] as SortKey[]).map((k) => (
          <button key={k} type="button" onClick={() => setSort(k)}
            className={`px-1 ${sort === k ? 'font-black text-[var(--foreground)] underline' : 'hover:text-[var(--foreground)]'}`}>
            {k === 'lastCheckin' ? 'Days since check-in' : k === 'tenure' ? 'Tenure' : 'Name'}
          </button>
        ))}
        <span className="ml-2">Manager:</span>
        <select value={managerFilter} onChange={(e) => setManagerFilter(e.target.value)}
          className="border border-[var(--border)] bg-[var(--card-background)] px-2 py-1 text-[10px] font-mono uppercase tracking-wider">
          <option value="">All</option>
          {managerFilterOptions.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        {managerFilter && (
          <button type="button" onClick={() => setManagerFilter('')}
            className="px-1 hover:text-[var(--foreground)]">Clear</button>
        )}
        <span className="ml-2">Show:</span>
        {(['intern', 'review', 'overdue'] as Tag[]).map((t) => (
          <button key={t} type="button" onClick={() => setTag((cur) => (cur === t ? '' : t))}
            className={`border px-2 py-1 text-[10px] font-black uppercase tracking-wider transition-colors ${
              tag === t
                ? 'border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)]'
                : 'border-[var(--border)] bg-[var(--card-background)] text-[var(--foreground)] hover:border-[var(--foreground)]'
            }`}>
            {t === 'intern' ? 'Interns' : t === 'review' ? 'Review due' : 'Overdue'} ({tagCounts[t]})
          </button>
        ))}
      </div>

      {error && <p className="mb-3 text-xs text-red-700">{error}</p>}

      {filtered.length === 0 ? (
        <div className="border border-dashed border-[var(--border-light)] bg-[var(--card-background)] p-10 text-center">
          <p className="text-[11px] uppercase tracking-wider text-[var(--border-light)]">No team members match</p>
        </div>
      ) : (
        <div className="border border-[var(--border)]">
          <div className="grid grid-cols-[2fr_1fr_1fr_2fr_60px] gap-3 border-b border-[var(--border)] bg-[var(--card-background)] px-4 py-2 text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-secondary)]">
            <div>Name</div>
            <div>Tenure</div>
            <div>Last check-in</div>
            <div>Role / Team</div>
            <div className="text-right"></div>
          </div>
          {filtered.map((u) => (
            <TrackerRow
              key={u.id}
              user={u}
              expanded={expanded === u.id}
              onToggle={() => setExpanded((cur) => (cur === u.id ? null : u.id))}
              onChanged={load}
              formatTenure={formatTenure}
              daysSince={daysSince}
              managerOptions={managerOptions}
            />
          ))}
        </div>
      )}
    </div>
  );
}
