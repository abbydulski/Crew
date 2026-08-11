'use client';

import { useCallback, useEffect, useState } from 'react';
import PageLoading from '@/components/PageLoading';
import { OFFICE_OPTIONS, TEAM_OPTIONS, EMPLOYMENT_TYPE_OPTIONS } from '@/lib/constants';

interface Benchmark {
  id: string; role: string; level: string | null; team: string | null; location: string | null;
  employmentType: string | null; currency: string; salaryP25: number; salaryP50: number; salaryP75: number;
  equityP50: number | null; source: string | null; notes: string | null;
}
interface PredictResult {
  band: Benchmark | null; matchScore: number; alternativesCount: number;
  placement: { percentile: number; label: string } | null;
  internal: { count: number; min: number; median: number; max: number } | null;
}
type PredictForm = { role: string; level: string; team: string; location: string; employmentType: string; proposedSalary: string };
type BandForm = Omit<Benchmark, 'id' | 'currency'> & { currency: string };

const fmt = (n: number) => `$${Math.round(n).toLocaleString()}`;
const inputCls = 'border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-[11px] font-mono';
const labelCls = 'text-[8px] font-black uppercase tracking-[0.2em] text-[var(--text-secondary)]';
const EMPTY_BAND: BandForm = { role: '', level: '', team: '', location: '', employmentType: '', currency: 'USD', salaryP25: 0, salaryP50: 0, salaryP75: 0, equityP50: null, source: '', notes: '' };

export default function CompPredictorPage() {
  const [benchmarks, setBenchmarks] = useState<Benchmark[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [form, setForm] = useState<PredictForm>({ role: '', level: '', team: '', location: '', employmentType: '', proposedSalary: '' });
  const [result, setResult] = useState<PredictResult | null>(null);
  const [predicting, setPredicting] = useState(false);

  const [newBand, setNewBand] = useState<BandForm>(EMPTY_BAND);
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBand, setEditBand] = useState<BandForm>(EMPTY_BAND);

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
    setEditBand({ role: b.role, level: b.level, team: b.team, location: b.location, employmentType: b.employmentType, currency: b.currency, salaryP25: b.salaryP25, salaryP50: b.salaryP50, salaryP75: b.salaryP75, equityP50: b.equityP50, source: b.source, notes: b.notes });
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
        <p className="mt-1 text-[11px] text-[var(--text-secondary)]">Place a proposed salary against market benchmark bands · internal actuals shown read-only when available</p>
      </div>

      {error && <p className="mb-3 text-xs text-red-700">{error}</p>}

      {/* Predict panel */}
      <div className="mb-8 border border-[var(--border)] bg-[var(--card-background)] p-4">
        <div className="mb-3 text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-secondary)]">Predict</div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <label className="flex flex-col gap-1"><span className={labelCls}>Role*</span><input className={inputCls} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="Software Engineer" /></label>
          <label className="flex flex-col gap-1"><span className={labelCls}>Level</span><input className={inputCls} value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} placeholder="L3 / Senior" /></label>
          <label className="flex flex-col gap-1"><span className={labelCls}>Team</span><select className={inputCls} value={form.team} onChange={(e) => setForm({ ...form, team: e.target.value })}><option value="">—</option>{TEAM_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>
          <label className="flex flex-col gap-1"><span className={labelCls}>Location</span><select className={inputCls} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}><option value="">—</option>{OFFICE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>
          <label className="flex flex-col gap-1"><span className={labelCls}>Type</span><select className={inputCls} value={form.employmentType} onChange={(e) => setForm({ ...form, employmentType: e.target.value })}><option value="">—</option>{EMPLOYMENT_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>
          <label className="flex flex-col gap-1"><span className={labelCls}>Proposed $</span><input className={inputCls} type="number" value={form.proposedSalary} onChange={(e) => setForm({ ...form, proposedSalary: e.target.value })} placeholder="120000" /></label>
        </div>
        <button type="button" onClick={predict} disabled={predicting || !form.role.trim()} className="mt-3 border border-[var(--foreground)] bg-[var(--foreground)] px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-[var(--background)] disabled:opacity-40">{predicting ? 'Predicting…' : 'Predict'}</button>

        {result && <ResultCard result={result} proposed={form.proposedSalary ? Number(form.proposedSalary) : null} />}
      </div>

      {/* Benchmark manager */}
      <div className="border border-[var(--border)]">
        <div className="border-b border-[var(--border)] bg-[var(--card-background)] px-4 py-2 text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-secondary)]">Market Benchmarks ({benchmarks.length})</div>
        <div className="border-b border-[var(--border-light)] bg-[var(--background)] px-4 py-3">
          <div className="mb-2 text-[8px] font-black uppercase tracking-[0.2em] text-[var(--text-secondary)]">Add band</div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
            <input className={inputCls} value={newBand.role} onChange={(e) => setNewBand({ ...newBand, role: e.target.value })} placeholder="Role*" />
            <input className={inputCls} value={newBand.level ?? ''} onChange={(e) => setNewBand({ ...newBand, level: e.target.value })} placeholder="Level" />
            <select className={inputCls} value={newBand.team ?? ''} onChange={(e) => setNewBand({ ...newBand, team: e.target.value })}><option value="">Team…</option>{TEAM_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
            <select className={inputCls} value={newBand.location ?? ''} onChange={(e) => setNewBand({ ...newBand, location: e.target.value })}><option value="">Location…</option>{OFFICE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
            <select className={inputCls} value={newBand.employmentType ?? ''} onChange={(e) => setNewBand({ ...newBand, employmentType: e.target.value })}><option value="">Type…</option>{EMPLOYMENT_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
            <input className={inputCls} value={newBand.source ?? ''} onChange={(e) => setNewBand({ ...newBand, source: e.target.value })} placeholder="Source" />
            <input className={inputCls} type="number" value={newBand.salaryP25 || ''} onChange={(e) => setNewBand({ ...newBand, salaryP25: Number(e.target.value) })} placeholder="p25 $" />
            <input className={inputCls} type="number" value={newBand.salaryP50 || ''} onChange={(e) => setNewBand({ ...newBand, salaryP50: Number(e.target.value) })} placeholder="p50 $" />
            <input className={inputCls} type="number" value={newBand.salaryP75 || ''} onChange={(e) => setNewBand({ ...newBand, salaryP75: Number(e.target.value) })} placeholder="p75 $" />
            <input className={inputCls} type="number" value={newBand.equityP50 ?? ''} onChange={(e) => setNewBand({ ...newBand, equityP50: e.target.value === '' ? null : Number(e.target.value) })} placeholder="Equity p50" />
            <input className={`${inputCls} sm:col-span-2 lg:col-span-1`} value={newBand.notes ?? ''} onChange={(e) => setNewBand({ ...newBand, notes: e.target.value })} placeholder="Notes" />
          </div>
          <button type="button" onClick={createBenchmark} disabled={saving || !newBand.role.trim()} className="mt-2 border border-[var(--foreground)] px-3 py-1 text-[9px] font-black uppercase tracking-wider text-[var(--foreground)] hover:bg-[var(--foreground)] hover:text-[var(--background)] disabled:opacity-40">{saving ? 'Adding…' : 'Add band'}</button>
        </div>
        {benchmarks.length === 0 ? (
          <div className="px-4 py-6 text-center text-[11px] uppercase tracking-wider text-[var(--border-light)]">No benchmark bands yet — add one above.</div>
        ) : (
          <div className="divide-y divide-[var(--border-light)]">
            {benchmarks.map((b) => editingId === b.id ? (
              <div key={b.id} className="bg-[var(--background)] px-4 py-3">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
                  <input className={inputCls} value={editBand.role} onChange={(e) => setEditBand({ ...editBand, role: e.target.value })} placeholder="Role*" />
                  <input className={inputCls} value={editBand.level ?? ''} onChange={(e) => setEditBand({ ...editBand, level: e.target.value })} placeholder="Level" />
                  <select className={inputCls} value={editBand.team ?? ''} onChange={(e) => setEditBand({ ...editBand, team: e.target.value })}><option value="">Team…</option>{TEAM_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
                  <select className={inputCls} value={editBand.location ?? ''} onChange={(e) => setEditBand({ ...editBand, location: e.target.value })}><option value="">Location…</option>{OFFICE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
                  <select className={inputCls} value={editBand.employmentType ?? ''} onChange={(e) => setEditBand({ ...editBand, employmentType: e.target.value })}><option value="">Type…</option>{EMPLOYMENT_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
                  <input className={inputCls} value={editBand.source ?? ''} onChange={(e) => setEditBand({ ...editBand, source: e.target.value })} placeholder="Source" />
                  <input className={inputCls} type="number" value={editBand.salaryP25 || ''} onChange={(e) => setEditBand({ ...editBand, salaryP25: Number(e.target.value) })} placeholder="p25 $" />
                  <input className={inputCls} type="number" value={editBand.salaryP50 || ''} onChange={(e) => setEditBand({ ...editBand, salaryP50: Number(e.target.value) })} placeholder="p50 $" />
                  <input className={inputCls} type="number" value={editBand.salaryP75 || ''} onChange={(e) => setEditBand({ ...editBand, salaryP75: Number(e.target.value) })} placeholder="p75 $" />
                  <input className={inputCls} type="number" value={editBand.equityP50 ?? ''} onChange={(e) => setEditBand({ ...editBand, equityP50: e.target.value === '' ? null : Number(e.target.value) })} placeholder="Equity p50" />
                  <input className={`${inputCls} sm:col-span-2 lg:col-span-1`} value={editBand.notes ?? ''} onChange={(e) => setEditBand({ ...editBand, notes: e.target.value })} placeholder="Notes" />
                </div>
                <div className="mt-2 flex gap-2">
                  <button type="button" onClick={saveEdit} disabled={saving || !editBand.role.trim()} className="border border-[var(--foreground)] bg-[var(--foreground)] px-3 py-1 text-[9px] font-black uppercase tracking-wider text-[var(--background)] disabled:opacity-40">{saving ? 'Saving…' : 'Save'}</button>
                  <button type="button" onClick={() => setEditingId(null)} className="border border-[var(--border)] px-3 py-1 text-[9px] font-black uppercase tracking-wider text-[var(--foreground)]">Cancel</button>
                </div>
              </div>
            ) : (
              <div key={b.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-[11px] font-mono">
                <span className="font-black text-[var(--foreground)]">{b.role}</span>
                {b.level && <span className="text-[var(--text-secondary)]">{b.level}</span>}
                {b.team && <span className="text-[var(--text-secondary)]">{b.team}</span>}
                {b.location && <span className="text-[var(--text-secondary)]">{b.location}</span>}
                <span className="ml-auto text-[var(--foreground)]">{fmt(b.salaryP25)} · <span className="font-black">{fmt(b.salaryP50)}</span> · {fmt(b.salaryP75)}</span>
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
  const { band, placement, internal, alternativesCount } = result;
  if (!band) return <p className="mt-4 text-[11px] text-[var(--text-secondary)]">No matching benchmark band for that role. Add one below to predict.</p>;
  const lo = band.salaryP25, hi = band.salaryP75, span = hi - lo || 1;
  const pos = (v: number) => Math.max(0, Math.min(100, ((v - lo) / span) * 100));
  return (
    <div className="mt-4 border border-[var(--border-light)] bg-[var(--background)] p-4">
      <div className="mb-1 flex items-center gap-2 text-[10px] font-mono">
        <span className="font-black uppercase tracking-wider text-[var(--foreground)]">{band.role}</span>
        {band.level && <span className="text-[var(--text-secondary)]">{band.level}</span>}
        {placement && <span className="ml-auto bg-[#7C3AED]/10 px-1.5 py-0.5 text-[9px] font-black uppercase text-[#5B21B6]">{placement.label} · ~p{placement.percentile}</span>}
      </div>
      <div className="relative mt-3 h-6 w-full border border-[var(--border-light)] bg-[var(--card-background)]">
        <div className="absolute inset-y-0 bg-[#81858C]/20" style={{ left: `${pos(band.salaryP25)}%`, right: `${100 - pos(band.salaryP75)}%` }} />
        <div className="absolute inset-y-0 w-px bg-[var(--foreground)]" style={{ left: `${pos(band.salaryP50)}%` }} title={`p50 ${fmt(band.salaryP50)}`} />
        {proposed !== null && <div className="absolute inset-y-0 w-0.5 bg-[#7C3AED]" style={{ left: `${pos(proposed)}%` }} title={`Proposed ${fmt(proposed)}`} />}
      </div>
      <div className="mt-1 flex justify-between text-[8px] font-mono uppercase tracking-wider text-[var(--text-secondary)]"><span>p25 {fmt(band.salaryP25)}</span><span>p50 {fmt(band.salaryP50)}</span><span>p75 {fmt(band.salaryP75)}</span></div>
      {alternativesCount > 0 && <p className="mt-2 text-[9px] text-[var(--text-secondary)]">{alternativesCount} other band{alternativesCount > 1 ? 's' : ''} match this role — refine level/team for a closer fit.</p>}
      {internal && (
        <div className="mt-3 border-t border-[var(--border-light)] pt-2">
          <div className="text-[8px] font-black uppercase tracking-[0.2em] text-[var(--text-secondary)]">Internal Actuals (read-only · {internal.count})</div>
          <div className="mt-1 text-[10px] font-mono text-[var(--foreground)]">min {fmt(internal.min)} · median <span className="font-black">{fmt(internal.median)}</span> · max {fmt(internal.max)}</div>
        </div>
      )}
    </div>
  );
}
