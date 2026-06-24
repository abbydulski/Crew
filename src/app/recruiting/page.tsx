'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Candidate, Recruiter } from '@/features/recruiting/types';
import PageLoading from '@/components/PageLoading';
import Board from '@/features/recruiting/components/Board';
import CandidateCard from '@/features/recruiting/components/CandidateCard';
import CandidateModal from '@/features/recruiting/components/CandidateModal';
import CandidateDetailModal from '@/features/recruiting/components/CandidateDetailModal';
import RecruiterModal from '@/features/recruiting/components/RecruiterModal';
import OfferModal from '@/features/recruiting/components/OfferModal';
import NewOfferModal from '@/features/recruiting/components/NewOfferModal';

export default function RecruitingPage() {
  return <RecruitingContent />;
}

function RecruitingContent() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [recruiters, setRecruiters] = useState<Recruiter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);
  const [viewingCandidate, setViewingCandidate] = useState<Candidate | null>(null);
  const [showAddRecruiter, setShowAddRecruiter] = useState(false);
  const [newRecruiterName, setNewRecruiterName] = useState('');
  const [dragOverStatus, setDragOverStatus] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [showOnIce, setShowOnIce] = useState(true);
  const [offerCandidate, setOfferCandidate] = useState<Candidate | null>(null);
  const [showNewOffer, setShowNewOffer] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [candRes, recRes] = await Promise.all([fetch('/api/recruiting/candidates'), fetch('/api/recruiting/recruiters')]);
      const [candData, recData] = await Promise.all([candRes.json(), recRes.json()]);
      if (candData.success) setCandidates(candData.data);
      if (recData.success) setRecruiters(recData.data);
    } catch (err) { console.error('Failed to fetch:', err); }
    finally { setIsLoading(false); }
  }, []);
  useEffect(() => { fetchData(); }, [fetchData]);

  const updateStatus = async (candidateId: string, newStatus: string, extra?: { startDate?: string; officeLocation?: string }) => {
    try {
      const res = await fetch(`/api/recruiting/candidates/${candidateId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus, ...extra }),
      });
      const data = await res.json();
      if (data.success) setCandidates(prev => prev.map(c => c.id === candidateId ? data.data : c));
    } catch (err) { console.error(err); }
  };
  const handleDrop = (e: React.DragEvent, status: string) => {
    e.preventDefault(); setDragOverStatus(null);
    const cid = e.dataTransfer.getData('text/plain');
    if (!cid) return;
    const candidate = candidates.find(c => c.id === cid);
    if (!candidate) return;
    if (status === 'OFFER' && candidate.status !== 'OFFER') {
      setOfferCandidate(candidate);
      return;
    }
    if (status === 'HIRED' && candidate.status !== 'HIRED') {
      if (candidate.offerStatus !== 'COMPLETE' && candidate.offerStatus !== 'APPROVED') {
        alert('This candidate needs a completed offer before being hired. Complete the offer first.');
        return;
      }
    }
    updateStatus(cid, status);
  };
  const deleteCandidate = async (id: string) => {
    if (!confirm('Delete this candidate?')) return;
    try { await fetch(`/api/recruiting/candidates/${id}`, { method: 'DELETE' }); setCandidates(prev => prev.filter(c => c.id !== id)); } catch (err) { console.error(err); }
  };
  const addRecruiter = async () => {
    if (!newRecruiterName.trim()) return;
    try {
      const res = await fetch('/api/recruiting/recruiters', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newRecruiterName.trim() }) });
      const data = await res.json();
      if (data.success) { setRecruiters(prev => [...prev, data.data]); setNewRecruiterName(''); setShowAddRecruiter(false); }
    } catch (err) { console.error(err); }
  };

  const hiredCandidates = candidates.filter(c => c.status === 'HIRED');
  const onIceCandidates = candidates.filter(c => c.status === 'ON_ICE');
  const archivedCandidates = candidates.filter(c => c.status === 'ARCHIVED');
  const pipelineCandidates = candidates.filter(c => !['HIRED', 'ON_ICE', 'ARCHIVED'].includes(c.status));

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between border-b border-[var(--border)] pb-4">
        <div>
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-[var(--foreground)]">Recruiting Pipeline</h2>
          <p className="mt-1 text-[11px] text-[var(--text-secondary)]">Track candidates through your hiring pipeline</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setEditingCandidate(null); setShowAddModal(true); }} className="bg-[var(--foreground)] px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-[var(--card-background)] hover:opacity-80">+ Candidate</button>
        </div>
      </div>
      {recruiters.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Recruiters:</span>
          {recruiters.map(r => <span key={r.id} className="bg-[var(--background)] px-3 py-1 text-[10px] font-bold text-[var(--text-secondary)]">{r.name} {r._count ? `(${r._count.candidates})` : ''}</span>)}
        </div>
      )}
      {isLoading ? (
        <PageLoading />
      ) : (
        <>
          <Board candidates={pipelineCandidates} dragOverStatus={dragOverStatus} setDragOverStatus={setDragOverStatus} handleDrop={handleDrop}
            onClick={(c) => setViewingCandidate(c)} onEdit={(c) => { setEditingCandidate(c); setShowAddModal(true); }} onDelete={deleteCandidate}
            onNewOffer={() => setShowNewOffer(true)} onCompleteOffer={(c) => setOfferCandidate(c)} />

          {/* Hired section — drop zone */}
          <div className="mt-8"
            onDragOver={(e) => { e.preventDefault(); setDragOverStatus('HIRED'); }}
            onDragLeave={() => setDragOverStatus(null)}
            onDrop={(e) => handleDrop(e, 'HIRED')}>
            <div className={`border-2 p-4 transition-colors ${dragOverStatus === 'HIRED' ? 'border-green-400 bg-green-50' : hiredCandidates.length > 0 ? 'border-transparent' : 'border-dashed border-[var(--border)]'}`}>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-green-700">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Hired <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] text-green-700">{hiredCandidates.length}</span>
                {dragOverStatus === 'HIRED' && <span className="ml-2 text-xs font-normal text-green-500">Drop to hire</span>}
              </h3>
              {hiredCandidates.length > 0 ? (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {hiredCandidates.map(c => <CandidateCard key={c.id} c={c} onClick={() => setViewingCandidate(c)} onEdit={() => { setEditingCandidate(c); setShowAddModal(true); }} onDelete={() => deleteCandidate(c.id)} />)}
                </div>
              ) : (
                <p className="py-2 text-center text-xs text-[var(--border-light)]">Drag candidates here to mark as hired</p>
              )}
            </div>
          </div>

          {/* On Ice section — drop zone */}
          <div className="mt-6"
            onDragOver={(e) => { e.preventDefault(); setDragOverStatus('ON_ICE'); if (!showOnIce) setShowOnIce(true); }}
            onDragLeave={() => setDragOverStatus(null)}
            onDrop={(e) => handleDrop(e, 'ON_ICE')}>
            <div className={`rounded border-2 p-4 transition-colors ${dragOverStatus === 'ON_ICE' ? 'border-blue-400 bg-blue-50' : 'border-transparent'}`}>
              <button onClick={() => setShowOnIce(!showOnIce)} className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800">
                <svg className={`h-3 w-3 transition-transform ${showOnIce ? 'rotate-90' : ''}`} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
                On Ice <span className="bg-[var(--background)] px-2 py-0.5 text-[10px] text-[var(--text-secondary)]">{onIceCandidates.length}</span>
                {dragOverStatus === 'ON_ICE' && <span className="ml-2 text-xs font-normal text-blue-400">Drop to put on ice</span>}
              </button>
              {showOnIce && (
                onIceCandidates.length > 0 ? (
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    {onIceCandidates.map(c => <CandidateCard key={c.id} c={c} onClick={() => setViewingCandidate(c)} onEdit={() => { setEditingCandidate(c); setShowAddModal(true); }} onDelete={() => deleteCandidate(c.id)} />)}
                  </div>
                ) : (
                  <p className="mt-2 py-2 text-center text-xs text-[var(--border-light)]">Drag candidates here to keep them warm</p>
                )
              )}
            </div>
          </div>

          {/* Archived section — drop zone */}
          <div className="mt-6"
            onDragOver={(e) => { e.preventDefault(); setDragOverStatus('ARCHIVED'); if (!showArchived) setShowArchived(true); }}
            onDragLeave={() => setDragOverStatus(null)}
            onDrop={(e) => handleDrop(e, 'ARCHIVED')}>
            <div className={`rounded border-2 p-4 transition-colors ${dragOverStatus === 'ARCHIVED' ? 'border-gray-400 bg-gray-50' : 'border-transparent'}`}>
              <button onClick={() => setShowArchived(!showArchived)} className="flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--foreground)]">
                <svg className={`h-3 w-3 transition-transform ${showArchived ? 'rotate-90' : ''}`} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
                Archived <span className="bg-[var(--background)] px-2 py-0.5 text-[10px]">{archivedCandidates.length}</span>
                {dragOverStatus === 'ARCHIVED' && <span className="ml-2 text-xs font-normal text-gray-400">Drop to archive</span>}
              </button>
              {showArchived && (
                archivedCandidates.length > 0 ? (
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    {archivedCandidates.map(c => <CandidateCard key={c.id} c={c} onClick={() => setViewingCandidate(c)} onEdit={() => { setEditingCandidate(c); setShowAddModal(true); }} onDelete={() => deleteCandidate(c.id)} muted />)}
                  </div>
                ) : (
                  <p className="mt-2 py-2 text-center text-xs text-[var(--border-light)]">Drag candidates here to archive</p>
                )
              )}
            </div>
          </div>
        </>
      )}

      {viewingCandidate && <CandidateDetailModal candidate={viewingCandidate} onClose={() => setViewingCandidate(null)}
        onEdit={() => { setEditingCandidate(viewingCandidate); setShowAddModal(true); setViewingCandidate(null); }} />}
      {showAddModal && <CandidateModal candidate={editingCandidate}
        onClose={() => { setShowAddModal(false); setEditingCandidate(null); }}
        onSaved={(c) => { if (editingCandidate) setCandidates(prev => prev.map(x => x.id === c.id ? c : x)); else setCandidates(prev => [c, ...prev]); setShowAddModal(false); setEditingCandidate(null); }} />}
      {showAddRecruiter && <RecruiterModal name={newRecruiterName} setName={setNewRecruiterName} onAdd={addRecruiter} onClose={() => setShowAddRecruiter(false)} />}
      {offerCandidate && <OfferModal candidate={offerCandidate} onClose={() => setOfferCandidate(null)}
        onConfirm={async (offerData) => {
          const res = await fetch(`/api/recruiting/candidates/${offerCandidate.id}`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'OFFER', ...offerData }),
          });
          const data = await res.json();
          if (data.success) setCandidates(prev => prev.map(c => c.id === offerCandidate.id ? data.data : c));
          setOfferCandidate(null);
        }} />}
      {showNewOffer && <NewOfferModal recruiters={recruiters} onClose={() => setShowNewOffer(false)}
        onCreated={(c) => { setCandidates(prev => [c, ...prev]); setShowNewOffer(false); }} />}
    </div>
  );
}

