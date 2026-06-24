'use client';

import { useState, useEffect } from 'react';
import { resolvePersonName } from '@/components/PersonPicker';
import PageLoading from '@/components/PageLoading';
import { THREE_WEEK_TASKS, tasksApplyToTeam, type OnboardingTaskDef } from '@/lib/onboarding-tasks';

interface OnboardingTaskRecord {
  taskKey: string;
  assigneeEmail: string | null;
  completedAt: string | null;
  completedBy: string | null;
}

interface OnboardingTicketRecord {
  id: string;
  type: 'DEEL_EMAIL' | 'OFFICE' | 'SAFETY' | 'TRUCK' | 'IT' | 'ONE_WEEK';
  status: 'OPEN' | 'DONE';
  assigneeEmail: string | null;
}

interface HiredCandidate {
  id: string;
  name: string;
  email: string | null;
  role: string | null;
  startDate: string | null;
  officeLocation: string | null;
  manager: string | null;
  team: string | null;
  employmentType: string | null;
  onboardingStageOverride: Stage | null;
  workEmail: string | null;
  onboardingTasks: OnboardingTaskRecord[];
  onboardingTickets: OnboardingTicketRecord[];
}

interface TeamMember {
  email: string;
  name: string;
}

const OFFICE_NAMES: Record<string, string> = { LB: 'Long Beach', Vegas: 'Las Vegas', Norcal: 'NorCal' };

type Task = OnboardingTaskDef;

function tasksFor(c: HiredCandidate, base: Task[]): Task[] {
  return base.filter((t) => tasksApplyToTeam(t, c.team));
}

type Stage = 'QUEUE' | 'THREE_WEEKS' | 'ONE_WEEK' | 'STARTED';

const STAGE_ORDER: Stage[] = ['QUEUE', 'THREE_WEEKS', 'ONE_WEEK', 'STARTED'];

function dateDerivedStage(startDate: string | null): Stage {
  if (!startDate) return 'QUEUE';
  const ms = new Date(startDate).getTime() - Date.now();
  const days = Math.ceil(ms / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'STARTED';
  if (days <= 7) return 'ONE_WEEK';
  if (days <= 21) return 'THREE_WEEKS';
  return 'QUEUE';
}

function effectiveStage(c: HiredCandidate): Stage {
  const derived = dateDerivedStage(c.startDate);
  if (!c.onboardingStageOverride) return derived;
  // Override only moves forward — take the later of derived and override
  return STAGE_ORDER.indexOf(c.onboardingStageOverride) > STAGE_ORDER.indexOf(derived)
    ? c.onboardingStageOverride
    : derived;
}

function formatDate(s: string | null) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric' });
}

const TEAM_ORDER = ['HW', 'SW', 'Field', 'Ops'];

function groupByTeam(candidates: HiredCandidate[]): Array<{ team: string; items: HiredCandidate[] }> {
  const map = new Map<string, HiredCandidate[]>();
  for (const c of candidates) {
    const key = c.team || 'Other';
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(c);
  }
  const known = TEAM_ORDER.filter((t) => map.has(t)).map((t) => ({ team: t, items: map.get(t)! }));
  const extras = Array.from(map.keys())
    .filter((t) => !TEAM_ORDER.includes(t))
    .sort()
    .map((t) => ({ team: t, items: map.get(t)! }));
  return [...known, ...extras];
}

export default function OnboardingPage() {
  const [candidates, setCandidates] = useState<HiredCandidate[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/onboarding').then((r) => r.json()),
      fetch('/api/team-directory').then((r) => r.json()),
    ])
      .then(([onb, dir]) => {
        if (onb.success) setCandidates(onb.data);
        if (dir.success) setTeam(dir.data.map((m: { email: string; name: string }) => ({ email: m.email, name: m.name })));
      })
      .catch((err) => console.error('Failed to fetch onboarding:', err))
      .finally(() => setIsLoading(false));
  }, []);

  const updateCandidateTask = (candidateId: string, taskKey: string, patch: Partial<OnboardingTaskRecord>) => {
    setCandidates((prev) =>
      prev.map((c) => {
        if (c.id !== candidateId) return c;
        const existing = c.onboardingTasks.find((t) => t.taskKey === taskKey);
        const merged: OnboardingTaskRecord = existing
          ? { ...existing, ...patch }
          : { taskKey, assigneeEmail: null, completedAt: null, completedBy: null, ...patch };
        const others = c.onboardingTasks.filter((t) => t.taskKey !== taskKey);
        return { ...c, onboardingTasks: [...others, merged] };
      })
    );
  };

  const toggleTask = async (candidateId: string, taskKey: string, currentlyDone: boolean) => {
    const completed = !currentlyDone;
    updateCandidateTask(candidateId, taskKey, { completedAt: completed ? new Date().toISOString() : null });
    try {
      await fetch('/api/onboarding/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId, taskKey, completed }),
      });
    } catch (err) {
      console.error('Failed to toggle task:', err);
    }
  };

  const setAssignee = async (candidateId: string, taskKey: string, assigneeEmail: string | null) => {
    updateCandidateTask(candidateId, taskKey, { assigneeEmail });
    try {
      await fetch('/api/onboarding/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId, taskKey, assigneeEmail }),
      });
    } catch (err) {
      console.error('Failed to set assignee:', err);
    }
  };

  const moveStage = async (candidateId: string, direction: 'forward' | 'backward') => {
    try {
      const res = await fetch('/api/onboarding/override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId, direction }),
      });
      const data = await res.json();
      if (data.success) {
        setCandidates((prev) =>
          prev.map((c) => (c.id === candidateId ? { ...c, onboardingStageOverride: data.data.onboardingStageOverride } : c))
        );
      }
    } catch (err) {
      console.error(`Failed to ${direction === 'forward' ? 'bump' : 'unbump'} stage:`, err);
    }
  };

  const isStageComplete = (c: HiredCandidate, tasks: Task[]) => {
    if (tasks.length === 0) return false;
    return tasks.every((t) => c.onboardingTasks.find((r) => r.taskKey === t.key)?.completedAt);
  };

  const matchesSearch = (c: HiredCandidate) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.role && c.role.toLowerCase().includes(q)) ||
      (c.team && c.team.toLowerCase().includes(q))
    );
  };

  const filtered = candidates.filter(matchesSearch);
  const queue = filtered.filter((c) => effectiveStage(c) === 'QUEUE');
  const threeWeeks = filtered.filter((c) => effectiveStage(c) === 'THREE_WEEKS');
  const oneWeek = filtered.filter((c) => effectiveStage(c) === 'ONE_WEEK');
  const started = filtered.filter((c) => effectiveStage(c) === 'STARTED');

  const sectionProps = { team, onToggle: toggleTask, onAssign: setAssignee, onMove: moveStage, isComplete: isStageComplete };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between border-b border-[var(--border)] pb-4">
        <div>
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-[var(--foreground)]">Onboarding</h2>
          <p className="mt-1 text-[11px] text-[var(--text-secondary)]">{candidates.length} hired candidate{candidates.length !== 1 ? 's' : ''}</p>
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, role..."
          className="border border-[var(--border)] bg-[var(--card-background)] px-3 py-1.5 text-[11px] w-64"
        />
      </div>

      {isLoading ? (
        <PageLoading />
      ) : candidates.length === 0 ? (
        <p className="py-20 text-center text-[11px] uppercase tracking-wider text-[var(--border-light)]">No hired candidates yet</p>
      ) : (
        <div className="space-y-12">
          <QueueSection candidates={queue} onMove={moveStage} />
          <TaskSection title="3 Weeks Out" subtitle="Start date in 8–21 days" candidates={threeWeeks} tasks={THREE_WEEK_TASKS} {...sectionProps} />
          <TaskSection title="1 Week Out" subtitle="Start date within 7 days" candidates={oneWeek} tasks={[]} {...sectionProps} />
          <TaskSection title="Started" subtitle="Start date today or earlier" candidates={started} tasks={[]} {...sectionProps} />
        </div>
      )}
    </div>
  );
}

function StageHeader({ title, subtitle, count }: { title: string; subtitle: string; count: number }) {
  return (
    <div className="mb-4 border-b border-[var(--border)] pb-2">
      <h3 className="text-2xl font-black tracking-tight text-[var(--foreground)]">{title} <span className="text-[var(--border-light)] font-bold">{count}</span></h3>
      <p className="mt-0.5 text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">{subtitle}</p>
    </div>
  );
}

function TeamColumns({ groups, render }: {
  groups: Array<{ team: string; items: HiredCandidate[] }>;
  render: (c: HiredCandidate) => React.ReactNode;
}) {
  if (groups.length === 0) return null;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
      {groups.map((g) => (
        <div key={g.team} className="min-w-0">
          <h4 className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--foreground)]">{g.team} <span className="font-bold text-[var(--border-light)]">({g.items.length})</span></h4>
          <div className="space-y-2">{g.items.map(render)}</div>
        </div>
      ))}
    </div>
  );
}

function QueueSection({ candidates, onMove }: { candidates: HiredCandidate[]; onMove: (id: string, dir: 'forward' | 'backward') => void }) {
  if (candidates.length === 0) return null;
  const groups = groupByTeam(candidates);
  return (
    <section>
      <StageHeader title="Queue" subtitle="Start date more than 1 month away" count={candidates.length} />
      <TeamColumns
        groups={groups}
        render={(c) => (
          <div key={c.id} className="border border-[var(--border)] bg-[var(--card-background)] px-3 py-2">
            <p className="font-black text-sm text-[var(--foreground)] break-words">{c.name}</p>
            <p className="text-[10px] text-[var(--text-secondary)] break-words">{c.role || '—'}</p>
            <div className="mt-1 flex items-center justify-between gap-2">
              <span className="text-[10px] uppercase tracking-wider text-[var(--foreground)]">{formatDate(c.startDate)}</span>
              <button onClick={() => onMove(c.id, 'forward')} className="text-[10px] font-black uppercase tracking-wider text-[var(--foreground)] underline hover:no-underline flex-shrink-0">Bump</button>
            </div>
          </div>
        )}
      />
    </section>
  );
}

function TaskSection({
  title, subtitle, candidates, tasks, team, onToggle, onAssign, onMove, isComplete,
}: {
  title: string;
  subtitle: string;
  candidates: HiredCandidate[];
  tasks: Task[];
  team: TeamMember[];
  onToggle: (candidateId: string, taskKey: string, currentlyDone: boolean) => void;
  onAssign: (candidateId: string, taskKey: string, assigneeEmail: string | null) => void;
  onMove: (candidateId: string, direction: 'forward' | 'backward') => void;
  isComplete: (c: HiredCandidate, tasks: Task[]) => boolean;
}) {
  const groups = groupByTeam(candidates);
  const canBump = title !== 'Started';
  return (
    <section>
      <StageHeader title={title} subtitle={subtitle} count={candidates.length} />
      {candidates.length === 0 ? (
        <p className="text-sm text-[#999999]">No candidates in this stage.</p>
      ) : (
        <TeamColumns
          groups={groups}
          render={(c) => {
            const candidateTasks = tasksFor(c, tasks);
            return (
              <CandidateCard key={c.id} candidate={c} tasks={candidateTasks} team={team} complete={isComplete(c, candidateTasks)} canBump={canBump} onToggle={onToggle} onAssign={onAssign} onMove={onMove} />
            );
          }}
        />
      )}
    </section>
  );
}

function CandidateCard({
  candidate: c, tasks, team, complete, canBump, onToggle, onAssign, onMove,
}: {
  candidate: HiredCandidate;
  tasks: Task[];
  team: TeamMember[];
  complete: boolean;
  canBump: boolean;
  onToggle: (candidateId: string, taskKey: string, currentlyDone: boolean) => void;
  onAssign: (candidateId: string, taskKey: string, assigneeEmail: string | null) => void;
  onMove: (candidateId: string, direction: 'forward' | 'backward') => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const taskMap = new Map(c.onboardingTasks.map((t) => [t.taskKey, t]));
  const doneCount = tasks.filter((t) => taskMap.get(t.key)?.completedAt).length;
  const canUnbump = !!c.onboardingStageOverride;
  return (
    <div className={`flex flex-col border h-full ${complete ? 'border-green-700 bg-green-50' : 'border-[var(--border)] bg-[var(--card-background)]'}`}>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-[var(--background)]"
      >
        <span className="text-[var(--border-light)] text-xs w-3 flex-shrink-0 mt-0.5">{expanded ? '▾' : '▸'}</span>
        <span className="font-black text-sm text-[var(--foreground)] flex-1 min-w-0 break-words">{c.name}</span>
        <span className={`text-[10px] font-bold uppercase tracking-wider whitespace-nowrap mt-0.5 ${complete ? 'text-green-700' : 'text-[var(--text-secondary)]'}`}>{doneCount}/{tasks.length}</span>
      </button>
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 px-3 pb-2 -mt-1">
        <span className="text-[10px] text-[var(--text-secondary)] break-words min-w-0">{c.role || '—'} · {formatDate(c.startDate)}</span>
        <div className="flex items-center gap-2 flex-shrink-0">
          {canUnbump && (
            <button onClick={() => onMove(c.id, 'backward')} className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] underline hover:no-underline">Unbump</button>
          )}
          {canBump && (
            <button onClick={() => onMove(c.id, 'forward')} className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground)] underline hover:no-underline">Bump</button>
          )}
        </div>
      </div>
      {expanded && (
        <div className="border-t border-[var(--border-light)] px-3 py-3">
          <p className="text-[10px] text-[var(--text-secondary)] mb-2 break-words">
            {c.officeLocation ? (OFFICE_NAMES[c.officeLocation] || c.officeLocation) : '—'}{c.manager ? ` · ${resolvePersonName(c.manager, team)}` : ''}{c.employmentType ? ` · ${c.employmentType}` : ''}
          </p>
          <TicketsChips tickets={c.onboardingTickets} workEmail={c.workEmail} />
          <ul className="space-y-2">
            {tasks.map((t) => {
              const record = taskMap.get(t.key);
              const done = !!record?.completedAt;
              const assignee = record?.assigneeEmail || '';
              return (
                <li key={t.key} className="space-y-1">
                  <label className="flex items-start gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={done} onChange={() => onToggle(c.id, t.key, done)} className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 border-[var(--border)] accent-[var(--foreground)]" />
                    <span className={done ? 'text-[var(--border-light)] line-through break-words text-xs' : 'text-[var(--foreground)] break-words text-xs'}>{t.label}</span>
                  </label>
                  <select
                    value={assignee}
                    onChange={(e) => onAssign(c.id, t.key, e.target.value || null)}
                    className="w-full border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-[10px] text-[var(--foreground)]"
                  >
                    <option value="">Unassigned</option>
                    {team.map((m) => (
                      <option key={m.email} value={m.email}>{m.name}</option>
                    ))}
                  </select>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}


const TICKET_TYPE_LABELS: Record<OnboardingTicketRecord['type'], string> = {
  DEEL_EMAIL: 'Deel',
  OFFICE: 'Office',
  SAFETY: 'Safety',
  TRUCK: 'Truck',
  IT: 'IT',
  ONE_WEEK: '1 Wk',
};

const TICKET_TYPE_ORDER: OnboardingTicketRecord['type'][] = ['DEEL_EMAIL', 'OFFICE', 'SAFETY', 'TRUCK', 'IT', 'ONE_WEEK'];

function TicketsChips({ tickets, workEmail }: { tickets: OnboardingTicketRecord[]; workEmail: string | null }) {
  if (!tickets || tickets.length === 0) return null;
  const byType = new Map(tickets.map((t) => [t.type, t]));
  const ordered = TICKET_TYPE_ORDER.map((t) => byType.get(t)).filter(Boolean) as OnboardingTicketRecord[];
  return (
    <div className="mb-3 space-y-1">
      <div className="flex flex-wrap items-center gap-1.5">
        {ordered.map((t) => {
          const done = t.status === 'DONE';
          return (
            <a
              key={t.id}
              href="/onboarding/tickets"
              title={`${TICKET_TYPE_LABELS[t.type]} \u00b7 ${done ? 'Done' : 'Open'}${t.assigneeEmail ? ` \u00b7 ${t.assigneeEmail}` : ''}`}
              className={`px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.15em] border ${
                done ? 'bg-[var(--foreground)] text-[var(--background)] border-[var(--foreground)]' : 'bg-transparent text-[var(--text-secondary)] border-[var(--border-light)] hover:border-[var(--foreground)]'
              }`}
            >
              {TICKET_TYPE_LABELS[t.type]}
            </a>
          );
        })}
      </div>
      {workEmail && <p className="text-[10px] text-[#999] break-all">{workEmail}</p>}
    </div>
  );
}
