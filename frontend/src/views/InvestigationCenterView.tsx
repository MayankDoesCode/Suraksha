import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { RiskBadge } from '../components/RiskBadge';
import { StatusBadge } from '../components/StatusBadge';
import {
  FolderSearch,
  Filter,
  Search,
  History,
  FileText,
  Clock,
  UserCheck,
  Share2,
  Smartphone,
  Globe,
  Trash2,
  ExternalLink,
  Plus,
  ArrowUpRight,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { InvestigationStatus, RiskLevel } from '../types';

export const InvestigationCenterView: React.FC = () => {
  const { candidates, updateCandidateStatus, setSelectedCandidateId, deleteCandidate } = useApp();

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedCandidateId, setExpandedCandidateId] = useState<string | null>(null);

  const filteredCandidates = candidates.filter(c => {
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    const matchesRisk = riskFilter === 'all' || c.riskCategory === riskFilter;
    const matchesType = typeFilter === 'all' || c.type === typeFilter;
    const matchesSearch =
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.identifier.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.platform.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesRisk && matchesType && matchesSearch;
  });

  // Calculate case metrics
  const totalCases = candidates.length;
  const newCases = candidates.filter(c => c.status === 'New').length;
  const investigatingCases = candidates.filter(c => c.status === 'Investigating').length;
  const confirmedThreats = candidates.filter(c => c.status === 'Confirmed Suspicious').length;
  const dismissedCases = candidates.filter(c => c.status === 'Dismissed').length;

  // Aggregate session audit history
  const allHistory = candidates
    .flatMap(c =>
      c.statusHistory.map(h => ({
        ...h,
        candidateId: c.id,
        candidateTitle: c.title,
        candidateIdentifier: c.identifier,
      }))
    )
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <div className="space-y-6">
      {/* Header & Case Statistics */}
      <div className="rounded-2xl border border-[#123E78] bg-gradient-to-r from-[#06142D] via-[#081B3B] to-[#06142D] p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-40 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30">
                <FolderSearch className="w-4 h-4" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                Analyst Case Management
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-[#00D9FF] font-mono">
                Active Session
              </span>
            </div>
            <h2 className="text-2xl font-bold text-[#F1F5FF] tracking-tight">
              Threat Investigation Center
            </h2>
            <p className="text-xs text-[#91ACD1] max-w-2xl mt-1 leading-relaxed">
              Triage threat candidate evidence, orchestrate status transitions, document analyst rationale, and inspect immutable session audit trails across verified assets.
            </p>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-[#030D22]/80 border border-[#123E78] rounded-xl px-3.5 py-2.5 min-w-[105px]">
              <span className="text-[10px] uppercase font-bold text-[#91ACD1] tracking-wider block">Total Cases</span>
              <span className="text-xl font-bold text-[#F1F5FF] font-mono">{totalCases}</span>
            </div>
            <div className="bg-[#030D22]/80 border border-blue-500/30 rounded-xl px-3.5 py-2.5 min-w-[105px]">
              <span className="text-[10px] uppercase font-bold text-[#00D9FF] tracking-wider block">Triage Queue</span>
              <span className="text-xl font-bold text-[#00D9FF] font-mono">{newCases}</span>
            </div>
            <div className="bg-[#030D22]/80 border border-amber-500/30 rounded-xl px-3.5 py-2.5 min-w-[105px]">
              <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider block">In Review</span>
              <span className="text-xl font-bold text-amber-400 font-mono">{investigatingCases}</span>
            </div>
            <div className="bg-[#030D22]/80 border border-rose-500/30 rounded-xl px-3.5 py-2.5 min-w-[105px]">
              <span className="text-[10px] uppercase font-bold text-rose-400 tracking-wider block">Confirmed</span>
              <span className="text-xl font-bold text-rose-400 font-mono">{confirmedThreats}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#06142D] p-4 rounded-2xl border border-[#123E78] shadow-lg flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Status Filter */}
          <div className="flex items-center gap-2 bg-[#0A1C3D] px-3 py-1.5 rounded-xl border border-[#123E78]">
            <span className="text-[#91ACD1] font-semibold">Status:</span>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-transparent font-semibold text-[#F1F5FF] focus:outline-hidden cursor-pointer"
            >
              <option value="all" className="bg-[#0A1C3D] text-[#F1F5FF]">All Statuses ({totalCases})</option>
              <option value="New" className="bg-[#0A1C3D] text-[#F1F5FF]">New ({newCases})</option>
              <option value="Investigating" className="bg-[#0A1C3D] text-[#F1F5FF]">Investigating ({investigatingCases})</option>
              <option value="Confirmed Suspicious" className="bg-[#0A1C3D] text-[#F1F5FF]">Confirmed Suspicious ({confirmedThreats})</option>
              <option value="Dismissed" className="bg-[#0A1C3D] text-[#F1F5FF]">Dismissed ({dismissedCases})</option>
            </select>
          </div>

          {/* Risk Filter */}
          <div className="flex items-center gap-2 bg-[#0A1C3D] px-3 py-1.5 rounded-xl border border-[#123E78]">
            <span className="text-[#91ACD1] font-semibold">Risk:</span>
            <select
              value={riskFilter}
              onChange={e => setRiskFilter(e.target.value)}
              className="bg-transparent font-semibold text-[#F1F5FF] focus:outline-hidden cursor-pointer"
            >
              <option value="all" className="bg-[#0A1C3D] text-[#F1F5FF]">All Risks</option>
              <option value="Critical" className="bg-[#0A1C3D] text-rose-400">Critical</option>
              <option value="High" className="bg-[#0A1C3D] text-amber-400">High</option>
              <option value="Medium" className="bg-[#0A1C3D] text-yellow-300">Medium</option>
              <option value="Low" className="bg-[#0A1C3D] text-emerald-400">Low</option>
            </select>
          </div>

          {/* Asset Type Filter */}
          <div className="flex items-center gap-2 bg-[#0A1C3D] px-3 py-1.5 rounded-xl border border-[#123E78]">
            <span className="text-[#91ACD1] font-semibold">Type:</span>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="bg-transparent font-semibold text-[#F1F5FF] focus:outline-hidden cursor-pointer"
            >
              <option value="all" className="bg-[#0A1C3D] text-[#F1F5FF]">All Types</option>
              <option value="social" className="bg-[#0A1C3D] text-[#F1F5FF]">Social Media</option>
              <option value="app" className="bg-[#0A1C3D] text-[#F1F5FF]">Mobile Apps</option>
              <option value="domain" className="bg-[#0A1C3D] text-[#F1F5FF]">Domains</option>
            </select>
          </div>
        </div>

        {/* Text Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[#91ACD1] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search cases, handles, URLs..."
            className="pl-8 pr-3 py-1.5 bg-[#0A1C3D] border border-[#123E78] text-[#F1F5FF] placeholder-[#91ACD1]/60 rounded-xl focus:outline-hidden focus:border-[#00D9FF] w-64 text-xs transition-colors"
          />
        </div>
      </div>

      {/* Main Candidate Table */}
      <div className="bg-[#06142D] rounded-2xl border border-[#123E78] shadow-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#123E78] flex items-center justify-between bg-[#041026]">
          <div className="flex items-center gap-2.5">
            <span className="text-sm font-bold text-[#F1F5FF]">Triage & Investigation Queue</span>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-[#123E78]/60 text-[#00D9FF]">
              {filteredCandidates.length} Active Records
            </span>
          </div>
          <span className="text-[11px] text-[#91ACD1] hidden sm:inline">
            Click row to preview evidence or open full forensic dossier
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#030D22] text-[#91ACD1] uppercase tracking-wider font-semibold border-b border-[#123E78]">
              <tr>
                <th className="py-3 px-4">Case / Asset Title</th>
                <th className="py-3 px-3">Type & Channel</th>
                <th className="py-3 px-3">Risk Assessment</th>
                <th className="py-3 px-3">Investigation Status</th>
                <th className="py-3 px-3">Analyst Notes</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#123E78]/60">
              {filteredCandidates.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#91ACD1]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FolderSearch className="w-8 h-8 text-[#91ACD1]/40" />
                      <p className="font-medium">No investigation cases match your active filter criteria.</p>
                      <button
                        onClick={() => {
                          setStatusFilter('all');
                          setRiskFilter('all');
                          setTypeFilter('all');
                          setSearchQuery('');
                        }}
                        className="text-xs text-[#00D9FF] hover:underline"
                      >
                        Reset filters to view all cases
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCandidates.map(c => {
                  const isExpanded = expandedCandidateId === c.id;
                  return (
                    <React.Fragment key={c.id}>
                      <tr
                        onClick={() => setExpandedCandidateId(isExpanded ? null : c.id)}
                        className={`hover:bg-[#0A1C3D]/80 cursor-pointer transition-colors group ${
                          isExpanded ? 'bg-[#0A1C3D]/60' : ''
                        }`}
                      >
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-[#0A1C3D] text-[#00D9FF] border border-[#123E78] group-hover:border-[#00D9FF]/50 transition-colors">
                              {c.type === 'app' ? (
                                <Smartphone className="w-4 h-4" />
                              ) : c.type === 'domain' ? (
                                <Globe className="w-4 h-4" />
                              ) : (
                                <Share2 className="w-4 h-4" />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-[#F1F5FF] group-hover:text-[#00D9FF] text-xs transition-colors">
                                  {c.title}
                                </span>
                                {isExpanded ? (
                                  <ChevronUp className="w-3 h-3 text-[#91ACD1]" />
                                ) : (
                                  <ChevronDown className="w-3 h-3 text-[#91ACD1]/60" />
                                )}
                              </div>
                              <span className="text-[11px] text-[#91ACD1] font-mono">{c.identifier}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="text-[#F1F5FF] font-medium block">{c.platform}</span>
                          <span className="text-[10px] text-[#91ACD1] capitalize font-mono">{c.type}</span>
                        </td>
                        <td className="py-3.5 px-3">
                          <RiskBadge level={c.riskCategory} size="sm" />
                        </td>
                        <td className="py-3.5 px-3" onClick={e => e.stopPropagation()}>
                          <select
                            value={c.status}
                            onChange={e =>
                              updateCandidateStatus(
                                c.id,
                                e.target.value as InvestigationStatus,
                                'Alex Mercer (Threat Lead)',
                                `Inline status transition to ${e.target.value}`
                              )
                            }
                            className={`border rounded-lg px-2.5 py-1 text-xs font-semibold focus:outline-hidden transition-colors ${
                              c.status === 'Confirmed Suspicious'
                                ? 'bg-rose-500/10 border-rose-500/40 text-rose-300'
                                : c.status === 'Investigating'
                                ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                                : c.status === 'Dismissed'
                                ? 'bg-slate-700/20 border-slate-600/40 text-slate-400'
                                : 'bg-blue-500/10 border-blue-500/40 text-[#00D9FF]'
                            }`}
                          >
                            <option value="New" className="bg-[#0A1C3D] text-[#F1F5FF]">New</option>
                            <option value="Investigating" className="bg-[#0A1C3D] text-amber-300">Investigating</option>
                            <option value="Confirmed Suspicious" className="bg-[#0A1C3D] text-rose-300">Confirmed Suspicious</option>
                            <option value="Dismissed" className="bg-[#0A1C3D] text-slate-400">Dismissed</option>
                          </select>
                        </td>
                        <td className="py-3.5 px-3 text-[#91ACD1]">
                          <span className="inline-flex items-center gap-1.5 font-mono text-[11px] bg-[#0A1C3D] px-2 py-0.5 rounded-md border border-[#123E78]">
                            <FileText className="w-3.5 h-3.5 text-[#00D9FF]" />
                            {c.analystNotes.length} note(s)
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => setSelectedCandidateId(c.id)}
                              className="px-2.5 py-1 rounded-lg bg-blue-600/20 text-[#00D9FF] hover:bg-blue-600 hover:text-white border border-blue-500/40 text-xs font-semibold transition-all flex items-center gap-1"
                              title="Open detailed forensic dossier"
                            >
                              <span>Dossier</span>
                              <ArrowUpRight className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => deleteCandidate(c.id)}
                              className="p-1.5 rounded-lg text-[#91ACD1] hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/30 transition-all"
                              title="Remove case from session"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Inline Evidence & Note Drawer */}
                      {isExpanded && (
                        <tr className="bg-[#041026]/90 border-b border-[#123E78]">
                          <td colSpan={6} className="px-6 py-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Left: Forensic Evidence Summary */}
                              <div className="bg-[#06142D] border border-[#123E78] rounded-xl p-3.5 space-y-2">
                                <span className="text-[10px] uppercase font-bold text-[#00D9FF] tracking-wider block">
                                  Forensic Telemetry Evidence
                                </span>
                                {c.evidence && c.evidence.length > 0 ? (
                                  <ul className="space-y-1.5">
                                    {c.evidence.map((ev, i) => (
                                      <li key={i} className="text-[11px] text-[#F1F5FF] flex items-start gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#00D9FF] mt-1.5 shrink-0" />
                                        <span>{ev}</span>
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p className="text-[11px] text-[#91ACD1] italic">No automated evidence flags generated.</p>
                                )}
                              </div>

                              {/* Right: Latest Analyst Note & Meta */}
                              <div className="bg-[#06142D] border border-[#123E78] rounded-xl p-3.5 space-y-2 flex flex-col justify-between">
                                <div>
                                  <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
                                      Latest Analyst Journal
                                    </span>
                                    <span className="text-[10px] font-mono text-[#91ACD1]">
                                      First Seen: {new Date(c.detectedAt).toLocaleDateString()}
                                    </span>
                                  </div>
                                  {c.analystNotes.length > 0 ? (
                                    <p className="text-[11px] text-[#F1F5FF] bg-[#0A1C3D] p-2.5 rounded-lg border border-[#123E78] italic">
                                      "{c.analystNotes[c.analystNotes.length - 1]}"
                                    </p>
                                  ) : (
                                    <p className="text-[11px] text-[#91ACD1] italic">No analyst notes recorded yet.</p>
                                  )}
                                </div>

                                <div className="pt-2 border-t border-[#123E78] flex items-center justify-between text-[11px]">
                                  <span className="text-[#91ACD1]">Score: <span className="font-mono text-[#00D9FF] font-bold">{c.threatScore}/100</span></span>
                                  <button
                                    onClick={() => setSelectedCandidateId(c.id)}
                                    className="text-[#00D9FF] hover:underline font-semibold flex items-center gap-1"
                                  >
                                    Add Case Note & View Timeline <ArrowUpRight className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Complete Session Audit History Log Table */}
      <div className="bg-[#06142D] rounded-2xl border border-[#123E78] p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-[#123E78] pb-3">
          <h3 className="text-sm font-bold text-[#F1F5FF] flex items-center gap-2">
            <History className="w-4 h-4 text-purple-400" />
            Session Status Audit Trail ({allHistory.length} Recorded Events)
          </h3>
          <span className="text-xs text-[#91ACD1] font-mono bg-[#0A1C3D] px-2.5 py-1 rounded-lg border border-[#123E78]">
            Immutable In-Memory Audit Log
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#030D22] text-[#91ACD1] uppercase tracking-wider font-semibold border-b border-[#123E78]">
              <tr>
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Target Candidate</th>
                <th className="py-2.5 px-3">Transition</th>
                <th className="py-2.5 px-3">Analyst Signature</th>
                <th className="py-2.5 px-3">Note / Rationale</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#123E78]/50 text-[#F1F5FF]">
              {allHistory.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[#91ACD1] italic">
                    No session transitions recorded yet. Changes in status will be cataloged here automatically.
                  </td>
                </tr>
              ) : (
                allHistory.map((item, idx) => (
                  <tr key={idx} className="hover:bg-[#0A1C3D]/50 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-[11px] text-[#91ACD1]">
                      {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-[#F1F5FF]">
                      <span
                        onClick={() => setSelectedCandidateId(item.candidateId)}
                        className="hover:text-[#00D9FF] cursor-pointer underline decoration-[#123E78] transition-colors"
                      >
                        {item.candidateTitle}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-medium">
                      <span className="text-[#91ACD1]">{item.from}</span>
                      <span className="mx-1.5 text-blue-400">→</span>
                      <span className="font-bold text-[#00D9FF]">{item.to}</span>
                    </td>
                    <td className="py-2.5 px-3 font-medium text-[#F1F5FF]">{item.analyst}</td>
                    <td className="py-2.5 px-3 text-[#91ACD1] text-[11px] italic">{item.note || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
