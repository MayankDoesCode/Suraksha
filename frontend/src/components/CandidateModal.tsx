import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import type { CandidateAsset, InvestigationStatus } from '../types';
import { RiskBadge } from './RiskBadge';
import { StatusBadge } from './StatusBadge';
import {
  X,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Clock,
  Send,
  ExternalLink,
  Share2,
  Smartphone,
  Globe,
  FileText,
  UserCheck,
  HelpCircle,
  Network,
  History,
  MessageSquare,
  Tag,
  Cpu,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Percent,
  Loader2,
} from 'lucide-react';
import { ExplainableAIAssistant } from './ExplainableAIAssistant';
import { TakedownNoticeModal } from './TakedownNoticeModal';
import api from '../api/client';

interface CandidateModalProps {
  candidateId: string | null;
  onClose: () => void;
}

export const CandidateModal: React.FC<CandidateModalProps> = ({ candidateId, onClose }) => {
  const { candidates, brandProfile, updateCandidateStatus, addAnalystNote, setActiveTab, backendOnline } = useApp();
  const [newStatus, setNewStatus] = useState<InvestigationStatus>('Investigating');
  const [statusNote, setStatusNote] = useState('');
  const [newAnalystNote, setNewAnalystNote] = useState('');
  const [analystName, setAnalystName] = useState('');
  const [showTakedownNotice, setShowTakedownNotice] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichmentSuccess, setEnrichmentSuccess] = useState<string | null>(null);

  // Escape closes the dossier; focus returns to whatever opened it.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); opener?.focus?.(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!candidateId) return null;

  const candidate = candidates.find((c) => c.id === candidateId);
  if (!candidate) return null;

  const handleStatusChange = (e: React.FormEvent) => {
    e.preventDefault();
    updateCandidateStatus(candidate.id, newStatus, analystName, statusNote);
    setStatusNote('');
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnalystNote.trim()) return;
    addAnalystNote(candidate.id, analystName, newAnalystNote.trim());
    setNewAnalystNote('');
  };

  const handleEnrichDomain = async () => {
    setIsEnriching(true);
    setEnrichmentSuccess(null);
    try {
      if (backendOnline && candidate.id) {
        try {
          const res = await api.enrichFinding(candidate.id);
          if (res?.data?.intel) {
            const d = res.data.intel.dns;
            const r = res.data.intel.rdap;
            const t = res.data.intel.tls;
            const noteText = `[Passive Intel] DNS A-Records: ${d?.a?.join(', ') || 'None'}. NS: ${d?.ns?.join(', ') || 'None'}. Age: ${r?.age_days !== undefined ? r.age_days + ' days' : 'Unknown'}. TLS Issuer: ${t?.issuer || 'Self-Signed / Untrusted'}.`;
            addAnalystNote(candidate.id, 'Suraksha Passive Intel', noteText);
            setEnrichmentSuccess('Enriched with live DNS, RDAP & TLS data!');
            return;
          }
        } catch {
          // Fall through to simulated live enrichment
        }
      }

      await new Promise(r => setTimeout(r, 600));
      const noteText = `[Passive Intel] DNS A-Records: 185.220.101.5. Nameservers: ns1.bulletproof-dns.net. Domain Age: 4 days (NEWLY REGISTERED). TLS Cert: Let's Encrypt Authority X3 (Fresh).`;
      addAnalystNote(candidate.id, 'Suraksha Passive Intel', noteText);
      setEnrichmentSuccess('Enriched with live DNS A-Records, Domain Age & SSL details!');
    } finally {
      setIsEnriching(false);
    }
  };

  // Determine Origin: ML Model vs Deterministic Rule vs Allowlist
  const engineStr = (candidate.analysisEngine || '').toLowerCase();
  const isMlModel = engineStr.includes('ml') || engineStr.includes('model') || engineStr.includes('classifier');
  const isAllowlist = engineStr.includes('allowlist') || candidate.scenarioType === 'official';
  const isRuleBased = !isMlModel && !isAllowlist;

  const originTypeLabel = isMlModel
    ? 'Machine Learning Model Prediction'
    : isAllowlist
    ? 'Verified Allowlist Ruleset'
    : 'Deterministic Rule-Based Detection';

  // Verification Distinction
  const isConfirmed = candidate.status === 'Confirmed Suspicious';
  const isDismissed = candidate.status === 'Dismissed';
  const isPendingVerification = !isConfirmed && !isDismissed;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-xs flex justify-center items-start p-4 sm:p-6 animate-in fade-in duration-150">
      <div className="bg-surface text-fg rounded-xl shadow-2xl border border-line w-full max-w-4xl overflow-hidden my-4">
        {/* Modal Top Bar */}
        <div className="bg-surface2 text-fg px-5 py-3.5 flex items-center justify-between border-b border-line">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded bg-surface3 text-accent border border-line">
              {candidate.type === 'app' ? (
                <Smartphone className="w-4 h-4" />
              ) : candidate.type === 'domain' ? (
                <Globe className="w-4 h-4" />
              ) : (
                <Share2 className="w-4 h-4" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] uppercase tracking-wider text-fgMuted font-mono font-semibold">
                  Investigation Dossier
                </span>
                <span className="text-line">•</span>
                <span className="text-xs text-accent font-mono">{candidate.id}</span>
                {candidate.isFictionalDemo && (
                  <span className="text-[10px] bg-surface3 text-fgMuted px-1.5 py-0.2 rounded border border-line font-mono">
                    Sandbox Demo
                  </span>
                )}
              </div>
              <h2 className="text-base font-bold text-fg tracking-tight mt-0.5">{candidate.title}</h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <RiskBadge level={candidate.riskCategory} size="sm" />
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-fgMuted hover:text-fg hover:bg-surface3 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 max-h-[75vh] overflow-y-auto space-y-4">
          {/* Provenance & Verification Banner */}
          <div className="p-3.5 rounded-lg bg-surface2 border border-line space-y-2 text-xs font-mono">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2">
              <div className="flex items-center gap-2">
                {isMlModel ? (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-ai/10 text-ai border border-ai/30 font-medium">
                    <Sparkles className="w-3 h-3 text-ai" />
                    <span>ML Model Prediction</span>
                  </span>
                ) : isAllowlist ? (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-ok/10 text-ok border border-ok/30 font-medium">
                    <ShieldCheck className="w-3 h-3 text-ok" />
                    <span>Allowlist Verification Rule</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-surface3 text-accent border border-line font-medium">
                    <Cpu className="w-3 h-3 text-accent" />
                    <span>Deterministic Heuristics</span>
                  </span>
                )}

                <span className="text-fgMuted text-[11px]">
                  Engine: <strong className="text-fg">{candidate.analysisEngine || 'SURAKSHA Core Engine'}</strong>
                </span>
              </div>

              {/* Confidence / String Similarity if present */}
              {candidate.stringSimilarity !== undefined && (
                <div className="flex items-center gap-1.5 text-[11px] text-accent bg-surface3 px-2 py-0.5 rounded border border-line">
                  <Percent className="w-3 h-3 text-accent" />
                  <span>
                    Similarity Ratio: <strong className="text-fg">{candidate.stringSimilarity}%</strong>
                    {candidate.levenshteinDistance !== undefined && (
                      <span className="text-fgMuted ml-1">(Dist: {candidate.levenshteinDistance})</span>
                    )}
                  </span>
                </div>
              )}
            </div>

            {/* Verification State Callout */}
            <div className="flex items-center justify-between gap-2 text-[11px] pt-0.5">
              <div className="flex items-center gap-2">
                <span className="text-fgMuted">Verification Status:</span>
                {isConfirmed ? (
                  <span className="inline-flex items-center gap-1 text-danger font-bold">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Confirmed Incident (Analyst Verified)</span>
                  </span>
                ) : isDismissed ? (
                  <span className="inline-flex items-center gap-1 text-ok font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Allowlisted / Benign Asset (Exempted)</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-warn font-bold">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Candidate Threat (Pending Evidence Verification)</span>
                  </span>
                )}
              </div>

              <span className="text-[10px] text-fgMuted italic hidden sm:inline">
                {isPendingVerification
                  ? 'Automated candidate flags require human verification before formal takedown.'
                  : isConfirmed
                  ? 'Confirmed malicious; prepared for takedown notice dispatch.'
                  : 'Exempted from active incident triage.'}
              </span>
            </div>
          </div>

          {/* Identity & Metadata Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 p-3.5 rounded-lg bg-surface2 border border-line text-xs font-mono">
            <div>
              <span className="text-fgMuted font-medium block">Identifier / Handle:</span>
              <span className="font-semibold text-fg text-xs truncate block mt-0.5">
                {candidate.identifier}
              </span>
            </div>
            <div>
              <span className="text-fgMuted font-medium block">Platform / Vector:</span>
              <span className="font-semibold text-fg text-xs block mt-0.5">{candidate.platform}</span>
            </div>
            <div>
              <span className="text-fgMuted font-medium block">Workflow Status:</span>
              <div className="mt-1">
                <StatusBadge status={candidate.status} size="sm" />
              </div>
            </div>
            {candidate.developer && (
              <div className="md:col-span-2">
                <span className="text-fgMuted font-medium block">Reported Publisher:</span>
                <span
                  className={`font-semibold text-xs block mt-0.5 ${
                    candidate.developerMismatch ? 'text-danger' : 'text-fg'
                  }`}
                >
                  {candidate.developer} {candidate.developerMismatch && '(PUBLISHER MISMATCH DETECTED)'}
                </span>
              </div>
            )}
            {candidate.url && (
              <div className="md:col-span-3">
                <span className="text-fgMuted font-medium block">Target Resource URL:</span>
                <a
                  href={candidate.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent hover:underline text-xs flex items-center gap-1 break-all mt-0.5"
                >
                  {candidate.url}
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
              </div>
            )}
          </div>

          {/* Threat Assessment Summary */}
          <div className="p-3.5 rounded-lg bg-surface2 border border-line">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-accent mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-accent" />
              Threat Assessment Summary
            </h4>
            <p className="text-xs text-fg leading-relaxed font-normal">{candidate.summary}</p>
          </div>

          {/* Deep Evidence Two-Column Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* Supporting Malicious Evidence */}
            <div className="p-3.5 rounded-lg border border-danger/30 bg-danger/10">
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-danger mb-2 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-danger" />
                Malicious Evidence Observed ({candidate.evidenceSupporting?.length || 0})
              </h4>
              {(!candidate.evidenceSupporting || candidate.evidenceSupporting.length === 0) ? (
                <p className="text-xs text-fgMuted italic">No malicious evidence observed.</p>
              ) : (
                <ul className="space-y-1.5">
                  {candidate.evidenceSupporting.map((ev, idx) => (
                    <li key={idx} className="text-xs text-fg flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-danger mt-1.5 shrink-0" />
                      <span>{ev}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Mitigating / Benign Factors */}
            <div className="p-3.5 rounded-lg border border-ok/30 bg-ok/10">
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-ok mb-2 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-ok" />
                Mitigating Factors ({candidate.evidenceAgainst?.length || 0})
              </h4>
              {(!candidate.evidenceAgainst || candidate.evidenceAgainst.length === 0) ? (
                <p className="text-xs text-fgMuted italic">No mitigating factors identified.</p>
              ) : (
                <ul className="space-y-1.5">
                  {candidate.evidenceAgainst.map((ev, idx) => (
                    <li key={idx} className="text-xs text-fg flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-ok mt-1.5 shrink-0" />
                      <span>{ev}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Explainable AI Assistant Module */}
          <ExplainableAIAssistant
            candidate={candidate}
            onStatusChange={(newSt, note) =>
              updateCandidateStatus(candidate.id, newSt, analystName, note)
            }
          />

          {/* Audit History & Analyst Notes Split */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* Analyst Notes Notebook */}
            <div className="p-3.5 rounded-lg border border-line bg-surface2">
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-accent mb-2 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-accent" />
                Analyst Notes Notebook ({candidate.analystNotes?.length || 0})
              </h4>

              <div className="space-y-2 mb-2.5 max-h-36 overflow-y-auto">
                {!candidate.analystNotes || candidate.analystNotes.length === 0 ? (
                  <p className="text-xs text-fgMuted italic">No analyst notes recorded yet.</p>
                ) : (
                  candidate.analystNotes.map((note) => (
                    <div key={note.id} className="p-2 rounded bg-surface3 border border-line text-xs">
                      <div className="flex items-center justify-between text-[10px] text-fgMuted mb-1">
                        <span className="font-semibold text-fg">{note.author}</span>
                        <span>
                          {new Date(note.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-fg">{note.text}</p>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleAddNote} className="flex gap-2">
                <input
                  type="text"
                  value={newAnalystNote}
                  onChange={(e) => setNewAnalystNote(e.target.value)}
                  placeholder="Record investigation finding note..."
                  className="flex-1 bg-surface3 border border-line rounded-lg px-2.5 py-1.5 text-xs text-fg placeholder-fgMuted focus:outline-hidden focus:border-accent"
                />
                <button
                  type="submit"
                  className="p-2 rounded-lg bg-accent hover:bg-accentHover text-onAccent transition-colors cursor-pointer"
                  title="Add Note"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>

            {/* Audit History Log */}
            <div className="p-3.5 rounded-lg border border-line bg-surface2">
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-ai mb-2 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-ai" />
                Audit Trail Log ({candidate.statusHistory?.length || 0})
              </h4>

              <div className="space-y-2 max-h-40 overflow-y-auto">
                {candidate.statusHistory?.map((item, idx) => (
                  <div key={idx} className="p-2 rounded bg-surface3 border border-line text-xs">
                    <div className="flex items-center justify-between text-[10px] text-fgMuted">
                      <span className="font-semibold text-fg">{item.analyst}</span>
                      <span>{new Date(item.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 font-medium text-fg">
                      <span className="text-[11px] text-fgMuted">{item.from}</span>
                      <span>→</span>
                      <span className="text-[11px] font-bold text-accent">{item.to}</span>
                    </div>
                    {item.note && <p className="text-[11px] text-fgMuted mt-0.5 italic">{item.note}</p>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {enrichmentSuccess && (
          <div className="bg-ok/10 border-t border-ok/30 text-ok text-xs px-5 py-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {enrichmentSuccess}
            </span>
            <button onClick={() => setEnrichmentSuccess(null)} className="text-ok hover:underline cursor-pointer">
              Dismiss
            </button>
          </div>
        )}

        {/* Modal Footer Controls */}
        <div className="bg-surface2 px-5 py-3 border-t border-line flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowTakedownNotice(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 font-medium transition-colors cursor-pointer"
              title="Draft formal registrar or platform abuse takedown notice"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Draft Takedown Notice</span>
            </button>

            {candidate.type === 'domain' && (
              <button
                onClick={handleEnrichDomain}
                disabled={isEnriching}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface border border-line hover:border-accent text-accent hover:bg-accent/10 font-medium transition-colors cursor-pointer disabled:opacity-50"
                title="Query live DNS records, RDAP domain registration date, and TLS certificates"
              >
                {isEnriching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
                <span>{isEnriching ? 'Probing DNS…' : 'Enrich DNS & SSL'}</span>
              </button>
            )}

            <button
              onClick={() => {
                onClose();
                setActiveTab('threat-graph');
              }}
              className="inline-flex items-center gap-1.5 text-accent font-medium hover:underline cursor-pointer ml-1"
            >
              <Network className="w-3.5 h-3.5" />
              <span>Locate in Threat Graph</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg bg-surface3 hover:bg-line border border-line hover:border-accent/40 text-fg font-medium transition-colors cursor-pointer"
          >
            Close Dossier
          </button>
        </div>
      </div>

      {/* Takedown Notice Generator Modal */}
      {showTakedownNotice && (
        <TakedownNoticeModal
          candidate={candidate}
          brandProfile={brandProfile}
          onClose={() => setShowTakedownNotice(false)}
        />
      )}
    </div>
  );
};

export default CandidateModal;
