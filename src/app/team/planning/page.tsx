'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import PageLoading from '@/components/PageLoading';
import { PROBATION_REVIEW_DAYS } from '../tracker/types';

/* ── Types ── */
interface TeamMember { id: string; name: string; role: string | null; employmentType: string | null; incoming?: boolean }
interface TeamRow { team: string; filled: number; open: number; incoming: number; projected: number; openTitles: string[]; members: TeamMember[] }
interface Intern { id: string; name: string; team: string; startDate: string | null; daysSinceStart: number | null; plannedConversionDate: string | null }
interface IncomingHire { id: string; name: string; team: string; role: string | null; employmentType: string | null; startDate: string | null }
interface Totals { filled: number; open: number; incoming: number; projected: number; ftCount: number; internCount: number; otherCount: number }

export default function HeadcountPlannerPage() {
  const [rows, setRows] = useState<TeamRow[]>([]);
  const [totals, setTotals] = useState<Totals>({ filled: 0, open: 0, incoming: 0, projected: 0, ftCount: 0, internCount: 0, otherCount: 0 });
  const [interns, setInterns] = useState<Intern[]>([]);
  const [incomingHires, setIncomingHires] = useState<IncomingHire[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [now] = useState(() => Date.now());

  // Scenario: which interns to convert
  const [convertIds, setConvertIds] = useState<Set<string>>(new Set());
  // UI toggles
  const [convertOpen, setConvertOpen] = useState(false);
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/team/planning');
      const data = await res.json();
      if (data.success) {
        setRows(data.data.teams);
        setTotals(data.data.totals);
        setInterns(data.data.interns || []);
        setIncomingHires(data.data.incoming || []);
      } else setError(data.error || 'Failed to load');
    } catch { setError('Failed to load'); }
  }, []);

  useEffect(() => { load().finally(() => setIsLoading(false)); }, [load]);

  const toggleConvert = (id: string) => {
    setConvertIds((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };

  // Scenario-adjusted counts
  const scenario = useMemo(() => {
    const converting = convertIds.size;
    return {
      filled: totals.filled,
      ft: totals.ftCount + converting,
      intern: totals.internCount - converting,
      other: totals.otherCount,
      open: totals.open,
      incoming: totals.incoming,
      projected: totals.projected,
      converting,
    };
  }, [totals, convertIds.size]);

  if (isLoading) return <PageLoading />;

  const maxProjected = Math.max(1, ...rows.map((r) => r.projected));
  const ftPct = scenario.filled > 0 ? Math.round((scenario.ft / scenario.filled) * 100) : 0;
  const internPct = scenario.filled > 0 ? Math.round((scenario.intern / scenario.filled) * 100) : 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex items-end justify-between gap-4 border-b border-[var(--border)] pb-4">
        <div>
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-[var(--foreground)]">Headcount Planner</h2>
          <p className="mt-1 text-[11px] text-[var(--text-secondary)]">Click teams to drill down · toggle intern conversions to model scenarios</p>
        </div>
        <Link href="/team/tracker"
          className="border border-[var(--border)] bg-[var(--card-background)] px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-[var(--foreground)] hover:border-[var(--foreground)] transition-colors shrink-0">
          ← Tracker
        </Link>
      </div>

      {/* Summary tiles */}
      <div className="mb-6 grid grid-cols-3 gap-3 sm:grid-cols-6">
        {[
          { label: 'Headcount', value: scenario.filled, sub: 'active' },
          { label: 'Full-Time', value: scenario.ft, sub: `${ftPct}%` },
          { label: 'Interns', value: scenario.intern, sub: `${internPct}%` },
          { label: 'Incoming', value: scenario.incoming, sub: 'hired / onboarding' },
          { label: 'Open Roles', value: scenario.open, sub: 'to hire' },
          { label: 'Projected', value: scenario.filled + scenario.incoming + scenario.open, sub: 'all filled + incoming' },
        ].map((f) => (
          <div key={f.label} className="border border-[var(--border)] bg-[var(--card-background)] px-4 py-3">
            <div className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-secondary)]">{f.label}</div>
            <div className="mt-1 font-mono text-2xl font-black text-[var(--foreground)]">{f.value}</div>
            <div className="text-[9px] uppercase tracking-wider text-[var(--border-light)]">{f.sub}</div>
          </div>
        ))}
      </div>

      {/* Headcount mix bar */}
      {scenario.filled > 0 && (
        <div className="mb-6 border border-[var(--border)] bg-[var(--card-background)] p-4">
          <div className="mb-2 text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-secondary)]">Employment Mix</div>
          <div className="flex h-5 w-full overflow-hidden border border-[var(--border-light)]">
            <div className="h-full bg-[var(--foreground)] transition-all" style={{ width: `${ftPct}%` }} title={`Full-Time: ${scenario.ft}`} />
            <div className="h-full bg-[#81858C] transition-all" style={{ width: `${internPct}%` }} title={`Intern: ${scenario.intern}`} />
            {scenario.other > 0 && <div className="h-full bg-[var(--border-light)] transition-all" style={{ width: `${100 - ftPct - internPct}%` }} title={`Other: ${scenario.other}`} />}
          </div>
          <div className="mt-2 flex flex-wrap gap-4 text-[9px] font-mono uppercase tracking-wider text-[var(--text-secondary)]">
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 bg-[var(--foreground)]" /> FT {scenario.ft}</span>
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 bg-[#81858C]" /> Intern {scenario.intern}</span>
            {scenario.other > 0 && <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 bg-[var(--border-light)]" /> Other {scenario.other}</span>}
            {scenario.incoming > 0 && <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 bg-[#00B0FF]" /> Incoming {scenario.incoming}</span>}
            {scenario.converting > 0 && <span className="ml-auto text-[var(--foreground)] font-black">+{scenario.converting} converting to FT</span>}
          </div>
        </div>
      )}

      {error && <p className="mb-3 text-xs text-red-700">{error}</p>}

      {/* Incoming hires banner */}
      {incomingHires.length > 0 && (
        <div className="mb-6 border border-[#00B0FF]/30 bg-[#00B0FF]/5 p-4">
          <h3 className="mb-2 text-[9px] font-black uppercase tracking-[0.2em] text-[#0090D0]">
            Incoming Hires ({incomingHires.length})
          </h3>
          <div className="grid gap-1">
            {incomingHires.map((h) => {
              const startDate = h.startDate ? new Date(h.startDate) : null;
              const daysUntil = startDate ? Math.ceil((startDate.getTime() - now) / (1000 * 60 * 60 * 24)) : null;
              return (
                <div key={h.id} className="flex items-center gap-3 text-[11px] font-mono">
                  <span className="font-black text-[#007AB8]">{h.name}</span>
                  <span className="text-[#0090D0]">{h.team}</span>
                  <span className="text-[#00B0FF]">{h.role || '—'}</span>
                  {h.employmentType && <span className="text-[9px] uppercase text-[#00B0FF]">{h.employmentType}</span>}
                  {startDate && (
                    <span className="ml-auto text-[#0090D0] font-black">
                      {startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}
                      {daysUntil !== null && <span className="ml-1 font-normal text-[#00B0FF]">({daysUntil > 0 ? `in ${daysUntil}d` : daysUntil === 0 ? 'today' : `${Math.abs(daysUntil)}d ago`})</span>}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Collapsible intern conversion panel */}
      {interns.length > 0 && (
        <div className="mb-6 border border-[var(--border)]">
          <button type="button" onClick={() => setConvertOpen((v) => !v)}
            className="flex w-full items-center justify-between bg-[var(--card-background)] px-4 py-3 text-left hover:bg-[var(--background)] transition-colors">
            <div className="flex items-center gap-3">
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                Scenario: Convert Interns → FT
              </span>
              {convertIds.size > 0 && (
                <span className="bg-[var(--foreground)] px-2 py-0.5 text-[9px] font-black text-[var(--background)]">
                  {convertIds.size} selected
                </span>
              )}
            </div>
            <span className="text-[11px] font-mono text-[var(--text-secondary)]">{convertOpen ? '▲' : '▼'}</span>
          </button>
          {convertOpen && (
            <div>
              <div className="flex items-center justify-between border-t border-[var(--border)] bg-[var(--background)] px-4 py-1.5">
                <span className="text-[9px] text-[var(--text-secondary)]">Check interns to simulate converting them to full-time</span>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setConvertIds(new Set(interns.map((i) => i.id)))}
                    className="text-[9px] font-black uppercase tracking-wider text-[var(--foreground)] hover:underline">All</button>
                  <span className="text-[var(--border-light)]">·</span>
                  <button type="button" onClick={() => setConvertIds(new Set())}
                    className="text-[9px] font-black uppercase tracking-wider text-[var(--foreground)] hover:underline">None</button>
                </div>
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-[var(--border-light)]">
                {[...interns].sort((a, b) => {
                  // Overdue first, then review window, then by days desc
                  const da = a.daysSinceStart ?? 0, db = b.daysSinceStart ?? 0;
                  const oa = da > PROBATION_REVIEW_DAYS.end ? 0 : da >= PROBATION_REVIEW_DAYS.start ? 1 : 2;
                  const ob = db > PROBATION_REVIEW_DAYS.end ? 0 : db >= PROBATION_REVIEW_DAYS.start ? 1 : 2;
                  return oa !== ob ? oa - ob : db - da;
                }).map((intern) => {
                  const checked = convertIds.has(intern.id);
                  const days = intern.daysSinceStart;
                  const overdue = days !== null && days > PROBATION_REVIEW_DAYS.end;
                  const reviewDue = days !== null && days >= PROBATION_REVIEW_DAYS.start && days <= PROBATION_REVIEW_DAYS.end;
                  const pct = days !== null ? Math.min(100, Math.round((days / PROBATION_REVIEW_DAYS.end) * 100)) : 0;
                  const planned = intern.plannedConversionDate ? new Date(intern.plannedConversionDate) : null;
                  const plannedDays = planned ? Math.ceil((planned.getTime() - now) / (1000 * 60 * 60 * 24)) : null;
                  return (
                    <label key={intern.id}
                      className={`block cursor-pointer px-4 py-2.5 transition-colors hover:bg-[var(--background)] ${checked ? 'bg-[var(--background)]' : ''}`}>
                      <div className="flex items-center gap-3">
                        <input type="checkbox" checked={checked} onChange={() => toggleConvert(intern.id)}
                          className="h-3.5 w-3.5 accent-[var(--foreground)] shrink-0" />
                        <span className="text-[11px] font-black text-[var(--foreground)] min-w-0 truncate">{intern.name}</span>
                        <span className="text-[10px] text-[var(--text-secondary)] shrink-0">{intern.team}</span>
                        <div className="ml-auto flex items-center gap-2 shrink-0">
                          {intern.plannedConversionDate && <span className="text-[10px] font-black text-[var(--foreground)]">{new Date(intern.plannedConversionDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })}</span>}
                          {overdue && <span className="bg-red-100 px-1.5 py-0.5 text-[8px] font-black uppercase text-red-700">Overdue</span>}
                          {reviewDue && <span className="bg-[#EAEAEA] px-1.5 py-0.5 text-[8px] font-black uppercase text-[#81858C]">Review</span>}
                        </div>
                      </div>
                      {/* Progress bar + dates row */}
                      <div className="mt-1.5 ml-[26px] flex items-center gap-3">
                        <div className="flex-1 flex items-center gap-2">
                          <div className="h-1.5 flex-1 bg-[#EAEAEA] overflow-hidden">
                            <div className={`h-full transition-all ${overdue ? 'bg-[#FD0009]' : reviewDue ? 'bg-[#272727]' : 'bg-[#81858C]'}`} style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-[9px] font-mono text-[var(--text-secondary)] shrink-0 w-[32px] text-right">{days ?? 0}/{PROBATION_REVIEW_DAYS.end}d</span>
                        </div>
                        {planned && (
                          <span className="text-[9px] font-mono text-[#FF6621] shrink-0">
                            {planned.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}
                            {plannedDays !== null && <span className="text-[var(--text-secondary)]"> ({plannedDays > 0 ? `in ${plannedDays}d` : plannedDays === 0 ? 'today' : `${Math.abs(plannedDays)}d ago`})</span>}
                          </span>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Team breakdown */}
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
            const active = r.members.filter((m) => !m.incoming);
            const teamFt = active.filter((m) => (m.employmentType === 'Full-Time' || !m.employmentType) || (m.employmentType === 'Intern' && convertIds.has(m.id))).length;
            const teamIntern = active.filter((m) => m.employmentType === 'Intern' && !convertIds.has(m.id)).length;
            const ftPctBar = (teamFt / maxProjected) * 100;
            const internPctBar = (teamIntern / maxProjected) * 100;
            const openPct = (r.open / maxProjected) * 100;
            const incomingPct = (r.incoming / maxProjected) * 100;
            const isExpanded = expandedTeam === r.team;
            return (
              <div key={r.team}>
                <button type="button" onClick={() => setExpandedTeam(isExpanded ? null : r.team)}
                  className={`grid w-full grid-cols-[120px_1fr_140px] items-center gap-3 border-t border-[var(--border-light)] px-4 py-3 text-left text-[11px] font-mono transition-colors hover:bg-[var(--background)] ${isExpanded ? 'bg-[var(--background)]' : ''}`}>
                  <div className="font-black uppercase tracking-wider text-[var(--foreground)] flex items-center gap-1">
                    <span className="text-[9px] text-[var(--text-secondary)]">{isExpanded ? '▼' : '▶'}</span>
                    {r.team}
                  </div>
                  <div>
                    <div className="flex h-6 w-full border border-[var(--border-light)] bg-[var(--background)]" title={r.openTitles.length ? `Open: ${r.openTitles.join(', ')}` : undefined}>
                      <div className="h-full bg-[var(--foreground)]" style={{ width: `${ftPctBar}%` }} title={`FT: ${teamFt}`} />
                      {internPctBar > 0 && <div className="h-full bg-[#81858C]" style={{ width: `${internPctBar}%` }} title={`Intern: ${teamIntern}`} />}
                      {incomingPct > 0 && <div className="h-full bg-[#00B0FF]" style={{ width: `${incomingPct}%` }} title={`Incoming: ${r.incoming}`} />}
                      <div className="h-full border-l border-[var(--background)] bg-[var(--foreground)] opacity-30" style={{ width: `${openPct}%` }} />
                    </div>
                  </div>
                  <div className="text-right">
                    <div>
                      <span className="font-black text-[var(--foreground)]">{teamFt} FT</span>
                      {teamIntern > 0 && <span className="text-[#81858C]"> · {teamIntern} Intern</span>}
                      {r.incoming > 0 && <span className="text-[#00B0FF]"> +{r.incoming} incoming</span>}
                      <span className="text-[var(--text-secondary)]"> +{r.open} open</span>
                    </div>
                  </div>
                </button>
                {isExpanded && (() => {
                  const active = r.members.filter((m) => !m.incoming);
                  const ftMembers = active.filter((m) => (m.employmentType === 'Full-Time' || !m.employmentType) || (m.employmentType === 'Intern' && convertIds.has(m.id)));
                  const internMembers = active.filter((m) => m.employmentType === 'Intern' && !convertIds.has(m.id));
                  const otherMembers = active.filter((m) => m.employmentType && m.employmentType !== 'Full-Time' && m.employmentType !== 'Intern');
                  const incomingMembers = r.members.filter((m) => m.incoming);
                  const teamTotal = active.length;
                  const teamFtPct = teamTotal > 0 ? Math.round((ftMembers.length / teamTotal) * 100) : 0;
                  const teamInternPct = teamTotal > 0 ? Math.round((internMembers.length / teamTotal) * 100) : 0;
                  return (
                  <div className="border-t border-[var(--border-light)] bg-[var(--background)] px-4 py-3">
                    {/* Per-team mix bar */}
                    {teamTotal > 0 && (
                      <div className="mb-3">
                        <div className="flex h-3 w-full overflow-hidden border border-[var(--border-light)]">
                          <div className="h-full bg-[var(--foreground)] transition-all" style={{ width: `${teamFtPct}%` }} />
                          <div className="h-full bg-[#81858C] transition-all" style={{ width: `${teamInternPct}%` }} />
                          {otherMembers.length > 0 && <div className="h-full bg-[var(--border-light)] transition-all" style={{ width: `${100 - teamFtPct - teamInternPct}%` }} />}
                        </div>
                        <div className="mt-1 flex gap-3 text-[8px] font-mono uppercase tracking-wider text-[var(--text-secondary)]">
                          <span>FT {ftMembers.length} ({teamFtPct}%)</span>
                          {internMembers.length > 0 && <span>Intern {internMembers.length} ({teamInternPct}%)</span>}
                          {otherMembers.length > 0 && <span>Other {otherMembers.length}</span>}
                        </div>
                      </div>
                    )}
                    {/* Full-Time */}
                    {ftMembers.length > 0 && (
                      <>
                        <div className="mb-1 text-[8px] font-black uppercase tracking-[0.2em] text-[var(--text-secondary)]">Full-Time ({ftMembers.length})</div>
                        <div className="grid gap-1 mb-3">
                          {ftMembers.map((m) => (
                            <div key={m.id} className="flex items-center gap-3 text-[11px] font-mono">
                              <span className="font-black text-[var(--foreground)] min-w-0 truncate">{m.name}</span>
                              <span className="text-[var(--text-secondary)] truncate">{m.role || '\u2014'}</span>
                              {m.employmentType === 'Intern' && convertIds.has(m.id) && (
                                <span className="ml-auto shrink-0 bg-[#FF6621]/10 px-1.5 py-0.5 text-[8px] font-black uppercase text-[#FF6621]">Converting</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                    {/* Interns */}
                    {internMembers.length > 0 && (
                      <>
                        <div className="mb-1 text-[8px] font-black uppercase tracking-[0.2em] text-[#81858C]">Interns ({internMembers.length})</div>
                        <div className="grid gap-1 mb-3">
                          {internMembers.map((m) => (
                            <div key={m.id} className="flex items-center gap-3 text-[11px] font-mono">
                              <span className="font-black text-[var(--foreground)] min-w-0 truncate">{m.name}</span>
                              <span className="text-[var(--text-secondary)] truncate">{m.role || '\u2014'}</span>
                              <span className="ml-auto shrink-0 bg-[#EAEAEA] px-1.5 py-0.5 text-[8px] font-black uppercase text-[#81858C]">Intern</span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                    {/* Other */}
                    {otherMembers.length > 0 && (
                      <>
                        <div className="mb-1 text-[8px] font-black uppercase tracking-[0.2em] text-[var(--text-secondary)]">Other ({otherMembers.length})</div>
                        <div className="grid gap-1 mb-3">
                          {otherMembers.map((m) => (
                            <div key={m.id} className="flex items-center gap-3 text-[11px] font-mono">
                              <span className="font-black text-[var(--foreground)] min-w-0 truncate">{m.name}</span>
                              <span className="text-[var(--text-secondary)] truncate">{m.role || '\u2014'}</span>
                              <span className="ml-auto shrink-0 bg-gray-100 px-1.5 py-0.5 text-[8px] font-black uppercase text-gray-600">{m.employmentType}</span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                    {/* Incoming */}
                    {incomingMembers.length > 0 && (
                      <>
                        <div className="mb-1 text-[8px] font-black uppercase tracking-[0.2em] text-[#0090D0]">Incoming ({incomingMembers.length})</div>
                        <div className="grid gap-1 mb-3">
                          {incomingMembers.map((m) => (
                            <div key={m.id} className="flex items-center gap-3 text-[11px] font-mono">
                              <span className="font-black text-[#0090D0] min-w-0 truncate">{m.name}</span>
                              <span className="text-[#00B0FF] truncate">{m.role || '\u2014'}</span>
                              {m.employmentType && (
                                <span className="ml-auto shrink-0 bg-[#00B0FF]/10 px-1.5 py-0.5 text-[8px] font-black uppercase text-[#0090D0]">{m.employmentType}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                    {/* Open roles */}
                    {r.openTitles.length > 0 && (
                      <>
                        <div className="mb-1 text-[8px] font-black uppercase tracking-[0.2em] text-[var(--text-secondary)]">Open Roles ({r.openTitles.length})</div>
                        <div className="grid gap-1">
                          {r.openTitles.map((title, i) => (
                            <div key={i} className="flex items-center gap-2 text-[11px] font-mono text-[var(--text-secondary)]">
                              <span className="text-[var(--border-light)]">{'\u25CB'}</span>
                              {title}
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
