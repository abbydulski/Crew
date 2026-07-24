'use client';

import type { Candidate } from './types';
import { PIPELINE_STATUSES } from '@/lib/constants';
import CandidateCard from './CandidateCard';

export default function Board({ candidates, dragOverStatus, setDragOverStatus, handleDrop, onClick, onEdit, onDelete, onNewOffer, onCompleteOffer }: {
  candidates: Candidate[]; dragOverStatus: string | null; setDragOverStatus: (s: string | null) => void;
  handleDrop: (e: React.DragEvent, s: string) => void; onClick: (c: Candidate) => void; onEdit: (c: Candidate) => void; onDelete: (id: string) => void;
  onNewOffer: () => void; onCompleteOffer: (c: Candidate) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      {PIPELINE_STATUSES.map(({ key, label }) => {
        const sc = candidates.filter(c => c.status === key);
        return (
          <div key={key} onDragOver={(e) => { e.preventDefault(); setDragOverStatus(key); }} onDragLeave={() => setDragOverStatus(null)} onDrop={(e) => handleDrop(e, key)}
            className={`border border-[var(--border)] p-3 transition-colors ${dragOverStatus === key ? 'border-blue-400 bg-blue-50' : ''}`}>
            <div className="mb-3 flex items-center justify-between border-b border-[var(--border)] pb-2">
              <div className="flex items-center gap-2">
                <h3 className="text-[11px] font-black uppercase tracking-[0.15em] text-[var(--foreground)]">{label}</h3>
                <span className="flex h-5 min-w-[20px] items-center justify-center bg-[var(--background)] px-1.5 text-[10px] font-bold text-[var(--text-secondary)]">{sc.length}</span>
              </div>
              {key === 'OFFER' && (
                <button onClick={onNewOffer} className="bg-[var(--foreground)] px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--card-background)] hover:opacity-80">+ New Offer</button>
              )}
            </div>
            <div className="space-y-2">
              {sc.map(c => <CandidateCard key={c.id} c={c}
                onClick={() => { if (c.status === 'OFFER' && c.offerStatus === 'PENDING') { onCompleteOffer(c); } else { onClick(c); } }}
                onEdit={() => onEdit(c)} onDelete={() => onDelete(c.id)} draggable />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
