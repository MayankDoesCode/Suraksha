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
} from 'lucide-react';

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

  const candidate = candidates.find(c => c.id === candidateId);
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

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex justify-center items-start p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden my-4">
        {/* Modal Top Bar */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-600/30 text-blue-400 border border-blue-500/30">
              {candidate.type === 'app' ? (
                <Smartphone className="w-5 h-5" />
              ) : candidate.type === 'domain' ? (
                <Globe className="w-5 h-5" />
              ) : (
                <Share2 className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                  Investigation Dossier
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-xs text-slate-400 font-mono">{candidate.id}</span>
                {candidate.isFictionalDemo && (
                  <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700">
                    Prototype Demo Record
                  </span>
                )}
              </div>
              <h2 className="text-lg font-bold text-white tracking-tight">{candidate.title}</h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <RiskBadge level={candidate.riskCategory} size="md" />
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[75vh] overflow-y-auto space-y-6">
          {/* Header Summary & Identity Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <div>
              <span className="text-slate-500 font-medium block">Identifier / Handle:</span>
              <span className="font-semibold text-slate-900 text-sm font-mono truncate block mt-0.5">
                {candidate.identifier}
              </span>
            </div>
            <div>
              <span className="text-slate-500 font-medium block">Platform / Store:</span>
              <span className="font-semibold text-slate-900 text-sm block mt-0.5">{candidate.platform}</span>
            </div>
            <div>
              <span className="text-slate-500 font-medium block">Investigation Status:</span>
              <div className="mt-1">
                <StatusBadge status={candidate.status} size="md" />
              </div>
            </div>
            {candidate.developer && (
              <div className="md:col-span-2">
                <span className="text-slate-500 font-medium block">Reported Developer:</span>
                <span
                  className={`font-semibold text-sm block mt-0.5 ${
                    candidate.developerMismatch ? 'text-rose-600' : 'text-slate-900'
                  }`}
                >
                  {candidate.developer} {candidate.developerMismatch && '(MISMATCH DETECTED)'}
                </span>
              </div>
            )}
            {candidate.url && (
              <div className="md:col-span-3">
                <span className="text-slate-500 font-medium block">Target Resource URL:</span>
                <a
                  href={candidate.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 hover:underline text-xs flex items-center gap-1 font-mono break-all mt-0.5"
                >
                  {candidate.url}
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
              </div>
            )}
          </div>

          {/* Executive Summary */}
          <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200">
            <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900 mb-1 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-blue-600" />
              AI Threat Assessment Summary
            </h4>
            <p className="text-xs text-slate-800 leading-relaxed font-normal">{candidate.summary}</p>
            {candidate.analysisEngine && (
              <div className="mt-2 text-[10px] text-slate-500 font-mono">
                Evaluated by: {candidate.analysisEngine}
              </div>
            )}
          </div>

          {/* Deep Evidence Two-Column Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Supporting Evidence */}
            <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/30">
              <h4 className="text-xs font-bold uppercase tracking-wider text-rose-800 mb-2 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                Evidence Supporting Assessment ({candidate.evidenceSupporting.length})
              </h4>
              {candidate.evidenceSupporting.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No malicious evidence observed.</p>
              ) : (
                <ul className="space-y-1.5">
                  {candidate.evidenceSupporting.map((ev, idx) => (
                    <li key={idx} className="text-xs text-slate-800 flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                      <span>{ev}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Mitigating / Benign Evidence */}
            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/30">
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 mb-2 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Mitigating Evidence & Benign Factors ({candidate.evidenceAgainst.length})
              </h4>
              {candidate.evidenceAgainst.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No mitigating factors identified.</p>
              ) : (
                <ul className="space-y-1.5">
                  {candidate.evidenceAgainst.map((ev, idx) => (
                    <li key={idx} className="text-xs text-slate-800 flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                      <span>{ev}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Missing Information & Recommended Next Steps */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-slate-500" />
                Missing Information / Intelligence Gaps
              </h4>
              <ul className="space-y-1.5">
                {candidate.missingInformation.map((item, idx) => (
                  <li key={idx} className="text-xs text-slate-600 flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/30">
              <h4 className="text-xs font-bold uppercase tracking-wider text-blue-800 mb-2 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-blue-600" />
                Recommended Next Steps
              </h4>
              <ul className="space-y-1.5">
                {candidate.recommendedNextSteps.map((step, idx) => (
                  <li key={idx} className="text-xs text-slate-800 flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                    <span className="font-medium">{step}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* String Matching Signals */}
          {candidate.stringSignals && candidate.stringSignals.length > 0 && (
            <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/20">
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-900 mb-2 flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-indigo-600" />
                Deterministic String Signals Detected
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {candidate.stringSignals.map((sig, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded-lg bg-white border border-indigo-100 text-xs flex flex-col justify-between"
                  >
                    <span className="font-mono font-bold text-indigo-900 text-[11px]">{sig.type}</span>
                    <span className="text-slate-600 text-[11px] mt-0.5">{sig.detail}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Status Change & Workflow Panel */}
          <div className="p-4 rounded-xl bg-slate-900 text-white space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-blue-400" />
                Update Investigation Status
              </h4>
              <span className="text-xs text-slate-400">Current: {candidate.status}</span>
            </div>

            <form onSubmit={handleStatusChange} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">New Status</label>
                  <select
                    value={newStatus}
                    onChange={e => setNewStatus(e.target.value as InvestigationStatus)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-hidden focus:border-blue-500"
                  >
                    <option value="New">New</option>
                    <option value="Investigating">Investigating</option>
                    <option value="Confirmed Suspicious">Confirmed Suspicious</option>
                    <option value="Dismissed">Dismissed (Allowlist/Benign)</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[11px] text-slate-400 block mb-1">Status Transition Note</label>
                  <input
                    type="text"
                    value={statusNote}
                    onChange={e => setStatusNote(e.target.value)}
                    placeholder="e.g. Escalate to legal takedown or Allowlist partner"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white transition-colors"
                >
                  Commit Status Transition
                </button>
              </div>
            </form>
          </div>

          {/* Audit History & Analyst Notes Split */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Analyst Notes */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-blue-600" />
                Analyst Notes Notebook ({candidate.analystNotes.length})
              </h4>

              <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
                {candidate.analystNotes.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No notes recorded yet.</p>
                ) : (
                  candidate.analystNotes.map(note => (
                    <div key={note.id} className="p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                      <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                        <span className="font-semibold text-slate-700">{note.author}</span>
                        <span>{new Date(note.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-slate-800">{note.text}</p>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleAddNote} className="flex gap-2">
                <input
                  type="text"
                  value={newAnalystNote}
                  onChange={e => setNewAnalystNote(e.target.value)}
                  placeholder="Add investigation observation..."
                  className="flex-1 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-blue-500"
                />
                <button
                  type="submit"
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition-colors"
                  title="Add Note"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>

            {/* Audit History Log */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-1.5">
                <History className="w-4 h-4 text-purple-600" />
                Session Audit History
              </h4>

              <div className="space-y-2 max-h-48 overflow-y-auto">
                {candidate.statusHistory.map((item, idx) => (
                  <div key={idx} className="p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span className="font-semibold text-slate-700">{item.analyst}</span>
                      <span>{new Date(item.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 font-medium text-slate-800">
                      <span className="text-[11px] text-slate-500">{item.from}</span>
                      <span>→</span>
                      <span className="text-[11px] font-bold text-blue-600">{item.to}</span>
                    </div>
                    {item.note && <p className="text-[11px] text-slate-600 mt-0.5 italic">{item.note}</p>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="bg-slate-100 px-6 py-3 border-t border-slate-200 flex items-center justify-between text-xs">
          <button
            onClick={() => {
              onClose();
              setActiveTab('threat-graph');
            }}
            className="inline-flex items-center gap-1.5 text-blue-700 font-semibold hover:underline"
          >
            <Network className="w-4 h-4" />
            <span>Locate in Threat Graph</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition-colors"
          >
            Close Dossier
          </button>
        </div>
      </div>
    </div>
  );
};
