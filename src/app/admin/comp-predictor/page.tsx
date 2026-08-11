'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import PageLoading from '@/components/PageLoading';
import { OFFICE_OPTIONS, TEAM_OPTIONS, EMPLOYMENT_TYPE_OPTIONS } from '@/lib/constants';

interface Benchmark {
  id: string; role: string; yearsExperience: number | null; company: string | null;
  team: string | null; location: string | null; employmentType: string | null;
  currency: string; salary: number; equity: number | null; notes: string | null;
}
interface PredictResult {
  count: number;
  experience: { target: number; tolerance: number; matched: number; total: number } | null;
  stats: { min: number; median: number; max: number } | null;
  equity: { count: number; min: number; median: number; max: number } | null;
  points: Benchmark[];
  placement: { pctAmong: number; label: string } | null;
  internal: { count: number; min: number; median: number; max: number } | null;
}
type PredictForm = { role: string; yearsExperience: string; team: string; location: string; employmentType: string; proposedSalary: string };
type BandForm = Omit<Benchmark, 'id' | 'currency'> & { currency: string };

const fmt = (n: number) => `$${Math.round(n).toLocaleString()}`;
const inputCls = 'border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-[11px] font-mono';
const labelCls = 'text-[8px] font-black uppercase tracking-[0.2em] text-[var(--text-secondary)]';
const EMPTY_BAND: BandForm = { role: '', yearsExperience: null, company: '', team: '', location: '', employmentType: '', currency: 'USD', salary: 0, equity: null, notes: '' };

export default function CompPredictorPage() {
  const [benchmarks, setBenchmarks] = useState<Benchmark[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [form, setForm] = useState<PredictForm>({ role: '', yearsExperience: '', team: '', location: '', employmentType: '', proposedSalary: '' });
  const [result, setResult] = useState<PredictResult | null>(null);
  const [predicting, setPredicting] = useState(false);

  const [newBand, setNewBand] = useState<BandForm>(EMPTY_BAND);
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBand, setEditBand] = useState<BandForm>(EMPTY_BAND);

  // Roles come only from submitted benchmarks — that's what you can predict against.
  const roleOptions = useMemo(() => Array.from(new Set(benchmarks.map((b) => b.role))).sort((a, b) => a.localeCompare(b)), [benchmarks]);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/comp/benchmarks');
      const data = await res.json();
      if (data.success) setBenchmarks(data.data);
      else setError(data.error || 'Failed to load benchmarks');
    } catch { setError('Failed to load benchmarks'); }
  }, []);
  useEffect(() => { load().finally(() => setIsLoading(false)); }, [load]);

  const predict = async () => {
    setPredicting(true); setError('');
    try {
      const res = await fetch('/api/admin/comp/predict', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await res.json();
      if (data.success) setResult(data.data);
      else setError(data.error || 'Failed to predict');
    } catch { setError('Failed to predict'); }
    finally { setPredicting(false); }
  };

  const createBenchmark = async () => {
    setSaving(true); setError('');
    try {
      const res = await fetch('/api/admin/comp/benchmarks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newBand) });
      const data = await res.json();
      if (data.success) { setNewBand(EMPTY_BAND); await load(); }
      else setError(data.error || 'Failed to add band');
    } catch { setError('Failed to add band'); }
    finally { setSaving(false); }
  };

  const deleteBenchmark = async (id: string) => {
    setError('');
    try {
      const res = await fetch(`/api/admin/comp/benchmarks/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) await load();
      else setError(data.error || 'Failed to delete');
    } catch { setError('Failed to delete'); }
  };

  const startEdit = (b: Benchmark) => {
    setEditingId(b.id);
    setEditBand({ role: b.role, yearsExperience: b.yearsExperience, company: b.company, team: b.team, location: b.location, employmentType: b.employmentType, currency: b.currency, salary: b.salary, equity: b.equity, notes: b.notes });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setSaving(true); setError('');
    try {
      const res = await fetch(`/api/admin/comp/benchmarks/${editingId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editBand) });
      const data = await res.json();
      if (data.success) { setEditingId(null); await load(); }
      else setError(data.error || 'Failed to update');
    } catch { setError('Failed to update'); }
    finally { setSaving(false); }
  };

  if (isLoading) return <PageLoading />;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 border-b border-[var(--border)] pb-4">
        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-[var(--foreground)]">Comp Predictor</h2>
        <p className="mt-1 text-[11px] text-[var(--text-secondary)]">Place a proposed salary against submitted market benchmarks · internal actuals shown read-only when available</p>
      </div>

      {error && <p className="mb-3 text-xs text-red-700">{error}</p>}

      {/* Predict panel */}
      <div className="mb-8 border border-[var(--border)] bg-[var(--card-background)] p-4">
        <div className="mb-3 text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-secondary)]">Predict</div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <label className="flex flex-col gap-1"><span className={labelCls}>Role*</span><select className={inputCls} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}><option value="">Select role…</option>{roleOptions.map((r) => <option key={r} value={r}>{r}</option>)}</select></label>
          <label className="flex flex-col gap-1"><span className={labelCls}>Years exp</span><input className={inputCls} type="number" value={form.yearsExperience} onChange={(e) => setForm({ ...form, yearsExperience: e.target.value })} placeholder="3" /></label>
          <label className="flex flex-col gap-1"><span className={labelCls}>Team</span><select className={inputCls} value={form.team} onChange={(e) => setForm({ ...form, team: e.target.value })}><option value="">—</option>{TEAM_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>
          <label className="flex flex-col gap-1"><span className={labelCls}>Location</span><select className={inputCls} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}><option value="">—</option>{OFFICE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>
          <label className="flex flex-col gap-1"><span className={labelCls}>Type</span><select className={inputCls} value={form.employmentType} onChange={(e) => setForm({ ...form, employmentType: e.target.value })}><option value="">—</option>{EMPLOYMENT_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>
          <label className="flex flex-col gap-1"><span className={labelCls}>Proposed $</span><input className={inputCls} type="number" value={form.proposedSalary} onChange={(e) => setForm({ ...form, proposedSalary: e.target.value })} placeholder="120000" /></label>
        </div>
        {roleOptions.length === 0 && <p className="mt-2 text-[9px] text-[var(--text-secondary)]">Add a benchmark below to populate roles.</p>}
        <button type="button" onClick={predict} disabled={predicting || !form.role.trim()} className="mt-3 border border-[var(--foreground)] bg-[var(--foreground)] px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-[var(--background)] disabled:opacity-40">{predicting ? 'Predicting…' : 'Predict'}</button>

        {result && <ResultCard result={result} proposed={form.proposedSalary ? Number(form.proposedSalary) : null} />}
      </div>

      {/* Benchmark manager */}
      <div className="border border-[var(--border)]">
        <div className="border-b border-[var(--border)] bg-[var(--card-background)] px-4 py-2 text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-secondary)]">Market Benchmarks ({benchmarks.length})</div>
        <div className="border-b border-[var(--border-light)] bg-[var(--background)] px-4 py-3">
          <div className="mb-2 text-[8px] font-black uppercase tracking-[0.2em] text-[var(--text-secondary)]">Add benchmark</div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
            <input className={inputCls} value={newBand.role} onChange={(e) => setNewBand({ ...newBand, role: e.target.value })} placeholder="Role*" />
            <input className={inputCls} type="number" value={newBand.yearsExperience ?? ''} onChange={(e) => setNewBand({ ...newBand, yearsExperience: e.target.value === '' ? null : Number(e.target.value) })} placeholder="Years exp" />
            <input className={inputCls} value={newBand.company ?? ''} onChange={(e) => setNewBand({ ...newBand, company: e.target.value })} placeholder="Company" />
            <select className={inputCls} value={newBand.team ?? ''} onChange={(e) => setNewBand({ ...newBand, team: e.target.value })}><option value="">Team…</option>{TEAM_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
            <select className={inputCls} value={newBand.location ?? ''} onChange={(e) => setNewBand({ ...newBand, location: e.target.value })}><option value="">Location…</option>{OFFICE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
            <select className={inputCls} value={newBand.employmentType ?? ''} onChange={(e) => setNewBand({ ...newBand, employmentType: e.target.value })}><option value="">Type…</option>{EMPLOYMENT_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
            <input className={inputCls} type="number" value={newBand.salary || ''} onChange={(e) => setNewBand({ ...newBand, salary: Number(e.target.value) })} placeholder="Salary $" />
            <input className={inputCls} type="number" value={newBand.equity ?? ''} onChange={(e) => setNewBand({ ...newBand, equity: e.target.value === '' ? null : Number(e.target.value) })} placeholder="Equity" />
            <input className={`${inputCls} sm:col-span-2 lg:col-span-2`} value={newBand.notes ?? ''} onChange={(e) => setNewBand({ ...newBand, notes: e.target.value })} placeholder="Notes" />
          </div>
          <button type="button" onClick={createBenchmark} disabled={saving || !newBand.role.trim()} className="mt-2 border border-[var(--foreground)] px-3 py-1 text-[9px] font-black uppercase tracking-wider text-[var(--foreground)] hover:bg-[var(--foreground)] hover:text-[var(--background)] disabled:opacity-40">{saving ? 'Adding…' : 'Add benchmark'}</button>
        </div>
        {benchmarks.length === 0 ? (
          <div className="px-4 py-6 text-center text-[11px] uppercase tracking-wider text-[var(--border-light)]">No benchmarks yet — add one above.</div>
        ) : (
          <div className="divide-y divide-[var(--border-light)]">
            {benchmarks.map((b) => editingId === b.id ? (
              <div key={b.id} className="bg-[var(--background)] px-4 py-3">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
                  <input className={inputCls} value={editBand.role} onChange={(e) => setEditBand({ ...editBand, role: e.target.value })} placeholder="Role*" />
                  <input className={inputCls} type="number" value={editBand.yearsExperience ?? ''} onChange={(e) => setEditBand({ ...editBand, yearsExperience: e.target.value === '' ? null : Number(e.target.value) })} placeholder="Years exp" />
                  <input className={inputCls} value={editBand.company ?? ''} onChange={(e) => setEditBand({ ...editBand, company: e.target.value })} placeholder="Company" />
                  <select className={inputCls} value={editBand.team ?? ''} onChange={(e) => setEditBand({ ...editBand, team: e.target.value })}><option value="">Team…</option>{TEAM_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
                  <select className={inputCls} value={editBand.location ?? ''} onChange={(e) => setEditBand({ ...editBand, location: e.target.value })}><option value="">Location…</option>{OFFICE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
                  <select className={inputCls} value={editBand.employmentType ?? ''} onChange={(e) => setEditBand({ ...editBand, employmentType: e.target.value })}><option value="">Type…</option>{EMPLOYMENT_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
                  <input className={inputCls} type="number" value={editBand.salary || ''} onChange={(e) => setEditBand({ ...editBand, salary: Number(e.target.value) })} placeholder="Salary $" />
                  <input className={inputCls} type="number" value={editBand.equity ?? ''} onChange={(e) => setEditBand({ ...editBand, equity: e.target.value === '' ? null : Number(e.target.value) })} placeholder="Equity" />
                  <input className={`${inputCls} sm:col-span-2 lg:col-span-2`} value={editBand.notes ?? ''} onChange={(e) => setEditBand({ ...editBand, notes: e.target.value })} placeholder="Notes" />
                </div>
                <div className="mt-2 flex gap-2">
                  <button type="button" onClick={saveEdit} disabled={saving || !editBand.role.trim()} className="border border-[var(--foreground)] bg-[var(--foreground)] px-3 py-1 text-[9px] font-black uppercase tracking-wider text-[var(--background)] disabled:opacity-40">{saving ? 'Saving…' : 'Save'}</button>
                  <button type="button" onClick={() => setEditingId(null)} className="border border-[var(--border)] px-3 py-1 text-[9px] font-black uppercase tracking-wider text-[var(--foreground)]">Cancel</button>
                </div>
              </div>
            ) : (
              <div key={b.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-[11px] font-mono">
                <span className="font-black text-[var(--foreground)]">{b.role}</span>
                {b.yearsExperience !== null && <span className="text-[var(--text-secondary)]">{b.yearsExperience}y</span>}
                {b.company && <span className="text-[var(--text-secondary)]">{b.company}</span>}
                {b.team && <span className="text-[var(--text-secondary)]">{b.team}</span>}
                <span className="ml-auto font-black text-[var(--foreground)]">{fmt(b.salary)}</span>
                <button type="button" onClick={() => startEdit(b)} className="text-[9px] font-black uppercase tracking-wider text-[var(--foreground)] hover:underline">Edit</button>
                <button type="button" onClick={() => deleteBenchmark(b.id)} className="text-[9px] font-black uppercase tracking-wider text-red-700 hover:underline">Delete</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ResultCard({ result, proposed }: { result: PredictResult; proposed: number | null }) {
  const { stats, equity, experience, points, placement, internal, count } = result;
  if (!stats || count === 0) return <p className="mt-4 text-[11px] text-[var(--text-secondary)]">No benchmarks submitted for that role yet. Add one below to compare.</p>;
  const lo = Math.min(stats.min, proposed ?? stats.min), hi = Math.max(stats.max, proposed ?? stats.max), span = hi - lo || 1;
  const pos = (v: number) => Math.max(0, Math.min(100, ((v - lo) / span) * 100));
  return (
    <div className="mt-4 border border-[var(--border-light)] bg-[var(--background)] p-4">
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-2xl font-black text-[var(--foreground)]">{fmt(stats.median)}</span>
        <span className="text-[9px] uppercase tracking-wider text-[var(--text-secondary)]">market median · {count} benchmark{count > 1 ? 's' : ''}</span>
        {placement && <span className="ml-auto bg-[#7C3AED]/10 px-1.5 py-0.5 text-[9px] font-black uppercase text-[#5B21B6]">{placement.label} · {placement.pctAmong}% below</span>}
      </div>
      {equity && <div className="mt-1 text-[9px] font-mono uppercase tracking-wider text-[var(--text-secondary)]">equity median <span className="font-black text-[var(--foreground)]">{fmt(equity.median)}</span> · min {fmt(equity.min)} · max {fmt(equity.max)} <span className="normal-case">({equity.count} of {count})</span></div>}
      {experience && (
        <div className="mt-1 text-[9px] font-mono text-[var(--text-secondary)]">
          {experience.matched > 0
            ? <><span className="font-black text-[#5B21B6]">{experience.matched}</span> of {experience.total} within ±{experience.tolerance}y of {experience.target}y experience</>
            : <>No benchmarks within ±{experience.tolerance}y of {experience.target}y — showing all {experience.total}</>}
        </div>
      )}
      <div className="relative mt-3 h-6 w-full border border-[var(--border-light)] bg-[var(--card-background)]">
        <div className="absolute inset-y-0 bg-[#81858C]/15" style={{ left: `${pos(stats.min)}%`, right: `${100 - pos(stats.max)}%` }} />
        {points.map((p) => <div key={p.id} className="absolute inset-y-0 w-px bg-[var(--border-light)]" style={{ left: `${pos(p.salary)}%` }} title={`${p.company || '—'} · ${fmt(p.salary)}`} />)}
        <div className="absolute inset-y-0 w-px bg-[var(--foreground)]" style={{ left: `${pos(stats.median)}%` }} title={`Median ${fmt(stats.median)}`} />
        {proposed !== null && <div className="absolute inset-y-0 w-0.5 bg-[#7C3AED]" style={{ left: `${pos(proposed)}%` }} title={`Proposed ${fmt(proposed)}`} />}
      </div>
      <div className="mt-1 flex justify-between text-[8px] font-mono uppercase tracking-wider text-[var(--text-secondary)]"><span>min {fmt(stats.min)}</span><span>median {fmt(stats.median)}</span><span>max {fmt(stats.max)}</span></div>
      <div className="mt-3 grid gap-1">
        {points.map((p) => (
          <div key={p.id} className="flex flex-col gap-0.5">
            <div className="flex items-center gap-3 text-[10px] font-mono">
              <span className="font-black text-[var(--foreground)]">{p.company || '—'}</span>
              {p.yearsExperience !== null && <span className="text-[var(--text-secondary)]">{p.yearsExperience}y</span>}
              {p.team && <span className="text-[var(--text-secondary)]">{p.team}</span>}
              {p.equity !== null && <span className="text-[var(--text-secondary)]">{fmt(p.equity)} eq</span>}
              <span className="ml-auto text-[var(--foreground)]">{fmt(p.salary)}</span>
            </div>
            {p.notes && <div className="pl-1 text-[9px] italic text-[var(--text-secondary)]">{p.notes}</div>}
          </div>
        ))}
      </div>
      {internal && (
        <div className="mt-3 border-t border-[var(--border-light)] pt-2">
          <div className="text-[8px] font-black uppercase tracking-[0.2em] text-[var(--text-secondary)]">Internal Actuals (read-only · {internal.count})</div>
          <div className="mt-1 text-[10px] font-mono text-[var(--foreground)]">min {fmt(internal.min)} · median <span className="font-black">{fmt(internal.median)}</span> · max {fmt(internal.max)}</div>
        </div>
      )}
    </div>
  );
}
