import React, { useState } from 'react';
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
} from 'lucide-react';
import { ExplainableAIAssistant } from './ExplainableAIAssistant';

interface CandidateModalProps {
  candidateId: string | null;
  onClose: () => void;
}

export const CandidateModal: React.FC<CandidateModalProps> = ({ candidateId, onClose }) => {
  const { candidates, updateCandidateStatus, addAnalystNote, setActiveTab } = useApp();
  const [newStatus, setNewStatus] = useState<InvestigationStatus>('Investigating');
  const [statusNote, setStatusNote] = useState('');
  const [newAnalystNote, setNewAnalystNote] = useState('');
  const [analystName, setAnalystName] = useState('Alex Mercer (Threat Lead)');

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
      <div className="bg-[#111D30] text-[#F8FAFC] rounded-xl shadow-2xl border border-[#1E314F] w-full max-w-4xl overflow-hidden my-4">
        {/* Modal Top Bar */}
        <div className="bg-[#0E1726] text-[#F8FAFC] px-5 py-3.5 flex items-center justify-between border-b border-[#1E314F]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded bg-[#16253D] text-[#45C8E8] border border-[#1E314F]">
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
                <span className="text-[11px] uppercase tracking-wider text-[#8EA2C6] font-mono font-semibold">
                  Investigation Dossier
                </span>
                <span className="text-[#1E314F]">•</span>
                <span className="text-xs text-[#45C8E8] font-mono">{candidate.id}</span>
                {candidate.isFictionalDemo && (
                  <span className="text-[10px] bg-[#16253D] text-[#8EA2C6] px-1.5 py-0.2 rounded border border-[#1E314F] font-mono">
                    Sandbox Demo
                  </span>
                )}
              </div>
              <h2 className="text-base font-bold text-[#F8FAFC] tracking-tight mt-0.5">{candidate.title}</h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <RiskBadge level={candidate.riskCategory} size="sm" />
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#8EA2C6] hover:text-white hover:bg-[#16253D] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 max-h-[75vh] overflow-y-auto space-y-4">
          {/* Provenance & Verification Banner */}
          <div className="p-3.5 rounded-lg bg-[#0E1726] border border-[#1E314F] space-y-2 text-xs font-mono">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1E314F] pb-2">
              <div className="flex items-center gap-2">
                {isMlModel ? (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#9B8AFB]/10 text-[#9B8AFB] border border-[#9B8AFB]/30 font-medium">
                    <Sparkles className="w-3 h-3 text-[#9B8AFB]" />
                    <span>ML Model Prediction</span>
                  </span>
                ) : isAllowlist ? (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/30 font-medium">
                    <ShieldCheck className="w-3 h-3 text-[#10B981]" />
                    <span>Allowlist Verification Rule</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#16253D] text-[#45C8E8] border border-[#1E314F] font-medium">
                    <Cpu className="w-3 h-3 text-[#45C8E8]" />
                    <span>Deterministic Heuristics</span>
                  </span>
                )}

                <span className="text-[#8EA2C6] text-[11px]">
                  Engine: <strong className="text-white">{candidate.analysisEngine || 'SURAKSHA Core Engine'}</strong>
                </span>
              </div>

              {/* Confidence / String Similarity if present */}
              {candidate.stringSimilarity !== undefined && (
                <div className="flex items-center gap-1.5 text-[11px] text-[#45C8E8] bg-[#16253D] px-2 py-0.5 rounded border border-[#1E314F]">
                  <Percent className="w-3 h-3 text-[#45C8E8]" />
                  <span>
                    Similarity Ratio: <strong className="text-white">{candidate.stringSimilarity}%</strong>
                    {candidate.levenshteinDistance !== undefined && (
                      <span className="text-[#8EA2C6] ml-1">(Dist: {candidate.levenshteinDistance})</span>
                    )}
                  </span>
                </div>
              )}
            </div>

            {/* Verification State Callout */}
            <div className="flex items-center justify-between gap-2 text-[11px] pt-0.5">
              <div className="flex items-center gap-2">
                <span className="text-[#8EA2C6]">Verification Status:</span>
                {isConfirmed ? (
                  <span className="inline-flex items-center gap-1 text-[#EF4444] font-bold">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Confirmed Incident (Analyst Verified)</span>
                  </span>
                ) : isDismissed ? (
                  <span className="inline-flex items-center gap-1 text-[#10B981] font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Allowlisted / Benign Asset (Exempted)</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[#F59E0B] font-bold">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Candidate Threat (Pending Evidence Verification)</span>
                  </span>
                )}
              </div>

              <span className="text-[10px] text-[#8EA2C6] italic hidden sm:inline">
                {isPendingVerification
                  ? 'Automated candidate flags require human verification before formal takedown.'
                  : isConfirmed
                  ? 'Confirmed malicious; prepared for takedown notice dispatch.'
                  : 'Exempted from active incident triage.'}
              </span>
            </div>
          </div>

          {/* Identity & Metadata Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 p-3.5 rounded-lg bg-[#0E1726] border border-[#1E314F] text-xs font-mono">
            <div>
              <span className="text-[#8EA2C6] font-medium block">Identifier / Handle:</span>
              <span className="font-semibold text-[#F8FAFC] text-xs truncate block mt-0.5">
                {candidate.identifier}
              </span>
            </div>
            <div>
              <span className="text-[#8EA2C6] font-medium block">Platform / Vector:</span>
              <span className="font-semibold text-[#F8FAFC] text-xs block mt-0.5">{candidate.platform}</span>
            </div>
            <div>
              <span className="text-[#8EA2C6] font-medium block">Workflow Status:</span>
              <div className="mt-1">
                <StatusBadge status={candidate.status} size="sm" />
              </div>
            </div>
            {candidate.developer && (
              <div className="md:col-span-2">
                <span className="text-[#8EA2C6] font-medium block">Reported Publisher:</span>
                <span
                  className={`font-semibold text-xs block mt-0.5 ${
                    candidate.developerMismatch ? 'text-[#EF4444]' : 'text-[#F8FAFC]'
                  }`}
                >
                  {candidate.developer} {candidate.developerMismatch && '(PUBLISHER MISMATCH DETECTED)'}
                </span>
              </div>
            )}
            {candidate.url && (
              <div className="md:col-span-3">
                <span className="text-[#8EA2C6] font-medium block">Target Resource URL:</span>
                <a
                  href={candidate.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#45C8E8] hover:underline text-xs flex items-center gap-1 break-all mt-0.5"
                >
                  {candidate.url}
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
              </div>
            )}
          </div>

          {/* Threat Assessment Summary */}
          <div className="p-3.5 rounded-lg bg-[#0E1726] border border-[#1E314F]">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[#45C8E8] mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#45C8E8]" />
              Threat Assessment Summary
            </h4>
            <p className="text-xs text-[#F8FAFC] leading-relaxed font-normal">{candidate.summary}</p>
          </div>

          {/* Deep Evidence Two-Column Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* Supporting Malicious Evidence */}
            <div className="p-3.5 rounded-lg border border-[#EF4444]/30 bg-[#EF4444]/10">
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[#EF4444] mb-2 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-[#EF4444]" />
                Malicious Evidence Observed ({candidate.evidenceSupporting?.length || 0})
              </h4>
              {(!candidate.evidenceSupporting || candidate.evidenceSupporting.length === 0) ? (
                <p className="text-xs text-[#8EA2C6] italic">No malicious evidence observed.</p>
              ) : (
                <ul className="space-y-1.5">
                  {candidate.evidenceSupporting.map((ev, idx) => (
                    <li key={idx} className="text-xs text-[#F8FAFC] flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] mt-1.5 shrink-0" />
                      <span>{ev}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Mitigating / Benign Factors */}
            <div className="p-3.5 rounded-lg border border-[#10B981]/30 bg-[#10B981]/10">
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[#10B981] mb-2 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
                Mitigating Factors ({candidate.evidenceAgainst?.length || 0})
              </h4>
              {(!candidate.evidenceAgainst || candidate.evidenceAgainst.length === 0) ? (
                <p className="text-xs text-[#8EA2C6] italic">No mitigating factors identified.</p>
              ) : (
                <ul className="space-y-1.5">
                  {candidate.evidenceAgainst.map((ev, idx) => (
                    <li key={idx} className="text-xs text-[#F8FAFC] flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] mt-1.5 shrink-0" />
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
            <div className="p-3.5 rounded-lg border border-[#1E314F] bg-[#0E1726]">
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[#45C8E8] mb-2 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-[#45C8E8]" />
                Analyst Notes Notebook ({candidate.analystNotes?.length || 0})
              </h4>

              <div className="space-y-2 mb-2.5 max-h-36 overflow-y-auto">
                {!candidate.analystNotes || candidate.analystNotes.length === 0 ? (
                  <p className="text-xs text-[#8EA2C6] italic">No analyst notes recorded yet.</p>
                ) : (
                  candidate.analystNotes.map((note) => (
                    <div key={note.id} className="p-2 rounded bg-[#16253D] border border-[#1E314F] text-xs">
                      <div className="flex items-center justify-between text-[10px] text-[#8EA2C6] mb-1">
                        <span className="font-semibold text-white">{note.author}</span>
                        <span>
                          {new Date(note.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[#F8FAFC]">{note.text}</p>
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
                  className="flex-1 bg-[#16253D] border border-[#1E314F] rounded-lg px-2.5 py-1.5 text-xs text-[#F8FAFC] placeholder-[#8EA2C6] focus:outline-hidden focus:border-[#45C8E8]"
                />
                <button
                  type="submit"
                  className="p-2 rounded-lg bg-[#45C8E8] hover:bg-[#38B2D0] text-[#080F1D] transition-colors cursor-pointer"
                  title="Add Note"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>

            {/* Audit History Log */}
            <div className="p-3.5 rounded-lg border border-[#1E314F] bg-[#0E1726]">
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[#9B8AFB] mb-2 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-[#9B8AFB]" />
                Audit Trail Log ({candidate.statusHistory?.length || 0})
              </h4>

              <div className="space-y-2 max-h-40 overflow-y-auto">
                {candidate.statusHistory?.map((item, idx) => (
                  <div key={idx} className="p-2 rounded bg-[#16253D] border border-[#1E314F] text-xs">
                    <div className="flex items-center justify-between text-[10px] text-[#8EA2C6]">
                      <span className="font-semibold text-white">{item.analyst}</span>
                      <span>{new Date(item.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 font-medium text-[#F8FAFC]">
                      <span className="text-[11px] text-[#8EA2C6]">{item.from}</span>
                      <span>→</span>
                      <span className="text-[11px] font-bold text-[#45C8E8]">{item.to}</span>
                    </div>
                    {item.note && <p className="text-[11px] text-[#8EA2C6] mt-0.5 italic">{item.note}</p>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="bg-[#0E1726] px-5 py-3 border-t border-[#1E314F] flex items-center justify-between text-xs">
          <button
            onClick={() => {
              onClose();
              setActiveTab('threat-graph');
            }}
            className="inline-flex items-center gap-1.5 text-[#45C8E8] font-medium hover:underline cursor-pointer"
          >
            <Network className="w-3.5 h-3.5" />
            <span>Locate in Threat Graph</span>
          </button>

          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg bg-[#16253D] hover:bg-[#1E314F] border border-[#1E314F] hover:border-[#45C8E8]/40 text-[#F8FAFC] font-medium transition-colors cursor-pointer"
          >
            Close Dossier
          </button>
        </div>
      </div>
    </div>
  );
};

export default CandidateModal;
