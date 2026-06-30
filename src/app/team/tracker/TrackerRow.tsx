'use client';

import { useCallback, useEffect, useState } from 'react';
import { CHECKIN_TYPE_LABEL, CheckinType, TrackerCheckin, TrackerUser, isReviewDue } from './types';
import EditUserForm from './EditUserForm';
import CheckinForm from './CheckinForm';

interface Props {
  user: TrackerUser;
  expanded: boolean;
  onToggle: () => void;
  showSalary: boolean;
  onChanged: () => Promise<void>;
  formatTenure: (iso: string | null) => string;
  daysSince: (iso: string | null | undefined) => number | null;
  managerOptions: { name: string; email: string }[];
}

export default function TrackerRow({ user: u, expanded, onToggle, showSalary, onChanged, formatTenure, daysSince, managerOptions }: Props) {
  const [history, setHistory] = useState<TrackerCheckin[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/team/tracker/${u.id}/checkins`);
      const data = await res.json();
      if (data.success) setHistory(data.data);
    } finally { setHistoryLoading(false); }
  }, [u.id]);

  useEffect(() => { if (expanded) loadHistory(); }, [expanded, loadHistory]);

  const days = daysSince(u.lastCheckin?.loggedAt);
  const noneYet = u.lastCheckin === null;
  // Overdue when last check-in > 90 days ago, OR when they have no check-in
  // and started more than 90 days ago.
  const tenureDays = daysSince(u.startDate);
  const overdue = noneYet
    ? tenureDays !== null && tenureDays > 90
    : days !== null && days > 90;
  // 3-month review window: hourly probation + intern conversion both hit at the same point.
  const reviewDue = isReviewDue(u);
  const reviewReason = u.employmentType === 'Intern' ? 'Intern' : 'Hourly';
  // Show a pill for non-default employment types so interns / part-time stand out.
  const employmentPill = u.employmentType && u.employmentType !== 'Full-Time' ? u.employmentType : null;

  const deleteCheckin = async (checkinId: string) => {
    if (!confirm('Delete this entry?')) return;
    const res = await fetch(`/api/team/tracker/${u.id}/checkins/${checkinId}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) { await loadHistory(); await onChanged(); }
  };

  return (
    <div className="border-b border-[var(--border-light)] last:border-b-0">
      <button type="button" onClick={onToggle}
        className="grid w-full grid-cols-[2fr_1fr_1fr_2fr_60px] items-center gap-3 px-4 py-3 text-left text-[11px] hover:bg-[var(--card-background)] transition-colors">
        <div className="flex items-center gap-3 min-w-0">
          {u.image ? (
            <img src={u.image} alt={u.name || u.email} className="h-7 w-7 object-cover shrink-0" referrerPolicy="no-referrer" />
          ) : (
            <div className="flex h-7 w-7 items-center justify-center bg-[var(--foreground)] text-[9px] font-black text-[var(--background)] shrink-0">
              {(u.name || u.email).split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <p className="font-black text-[var(--foreground)] truncate">{u.name || u.email.split('@')[0]}</p>
              {employmentPill && (
                <span className="bg-[var(--foreground)] text-[var(--background)] px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider shrink-0">
                  {employmentPill}
                </span>
              )}
            </div>
            <p className="text-[10px] text-[var(--text-secondary)] truncate">{u.email}</p>
          </div>
        </div>
        <div className="font-mono flex items-center gap-1.5 min-w-0">
          <span className="truncate">{formatTenure(u.startDate)}</span>
          {reviewDue && (
            <span
              className="bg-amber-100 text-amber-900 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider shrink-0"
              title={`${reviewReason} 3-month review due (${90 - (tenureDays ?? 0)} day${90 - (tenureDays ?? 0) === 1 ? '' : 's'} to 3 mo mark)`}
            >
              Review
            </span>
          )}
        </div>
        <div
          className={`font-mono ${overdue ? 'bg-red-100 text-red-800 px-1.5 py-0.5 inline-block w-fit' : ''}`}
        >
          {noneYet ? <span className="text-[var(--border-light)]">Never</span> : `${days} day${days === 1 ? '' : 's'}`}
        </div>
        <div className="min-w-0 truncate text-[var(--text-secondary)]">
          <span className="text-[var(--foreground)]">{u.role || '—'}</span>
          {u.team && <span> · {u.team}</span>}
          {u.manager && <span> · mgr: {u.manager}</span>}
        </div>
        <div className="text-right text-[9px] uppercase tracking-wider text-[var(--border-light)]">
          {expanded ? '▲' : '▼'}
        </div>
      </button>

      {expanded && (
        <div className="grid gap-6 border-t border-[var(--border-light)] bg-[var(--card-background)] p-5 lg:grid-cols-2">
          <div>
            <h4 className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-secondary)]">Details</h4>
            <EditUserForm user={u} showSalary={showSalary} onSaved={onChanged} managerOptions={managerOptions} />
          </div>
          <div>
            <h4 className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-secondary)]">Log event</h4>
            <CheckinForm userId={u.id} onLogged={async () => { await loadHistory(); await onChanged(); }} />

            <h4 className="mt-6 mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-secondary)]">History ({u.checkinCount})</h4>
            {historyLoading ? (
              <p className="text-[10px] text-[var(--border-light)]">Loading…</p>
            ) : history.length === 0 ? (
              <p className="text-[10px] text-[var(--border-light)]">No events logged yet</p>
            ) : (
              <ul className="space-y-2">
                {history.map((h) => (
                  <li key={h.id} className="border border-[var(--border-light)] bg-[var(--background)] p-2.5">
                    <div className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-wider">
                      <span className="font-black text-[var(--foreground)]">{CHECKIN_TYPE_LABEL[h.type as CheckinType]}</span>
                      <span className="font-mono text-[var(--text-secondary)]">{new Date(h.loggedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                    {h.notes && <p className="mt-1 text-xs text-[var(--foreground)] whitespace-pre-wrap">{h.notes}</p>}
                    <div className="mt-1 flex items-center justify-between text-[9px] text-[var(--border-light)]">
                      <span>by {h.loggedBy}</span>
                      <button type="button" onClick={() => deleteCheckin(h.id)} className="uppercase tracking-wider hover:text-red-700">Delete</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
