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
      <div className="rounded-xl border border-[#1E314F] bg-[#111D30] p-6 shadow-panel relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="p-1.5 rounded-lg bg-[#45C8E8]/10 text-[#45C8E8] border border-[#45C8E8]/30">
                <FolderSearch className="w-4 h-4" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-[#45C8E8] font-mono">
                Analyst Case Management
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#111D30] border border-[#1E314F] text-[#8EA2C6] font-mono">
                Active Session
              </span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Threat Investigation Center
            </h2>
            <p className="text-xs text-[#8EA2C6] max-w-2xl mt-1 leading-relaxed">
              Triage threat candidate evidence, orchestrate status transitions, document analyst rationale, and inspect immutable session audit trails across verified assets.
            </p>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-[#0E1726] border border-[#1E314F] rounded-lg px-3.5 py-2.5 min-w-[105px]">
              <span className="text-[10px] uppercase font-bold text-[#8EA2C6] tracking-wider block font-mono">Total Cases</span>
              <span className="text-xl font-bold text-white font-mono">{totalCases}</span>
            </div>
            <div className="bg-[#0E1726] border border-[#1E314F] rounded-lg px-3.5 py-2.5 min-w-[105px]">
              <span className="text-[10px] uppercase font-bold text-[#45C8E8] tracking-wider block font-mono">Triage Queue</span>
              <span className="text-xl font-bold text-[#45C8E8] font-mono">{newCases}</span>
            </div>
            <div className="bg-[#0E1726] border border-[#1E314F] rounded-lg px-3.5 py-2.5 min-w-[105px]">
              <span className="text-[10px] uppercase font-bold text-[#F59E0B] tracking-wider block font-mono">In Review</span>
              <span className="text-xl font-bold text-[#F59E0B] font-mono">{investigatingCases}</span>
            </div>
            <div className="bg-[#0E1726] border border-[#1E314F] rounded-lg px-3.5 py-2.5 min-w-[105px]">
              <span className="text-[10px] uppercase font-bold text-[#EF4444] tracking-wider block font-mono">Confirmed</span>
              <span className="text-xl font-bold text-[#EF4444] font-mono">{confirmedThreats}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#111D30] p-4 rounded-xl border border-[#1E314F] shadow-panel flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Status Filter */}
          <div className="flex items-center gap-2 bg-[#0E1726] px-3 py-1.5 rounded-lg border border-[#1E314F]">
            <span className="text-[#8EA2C6] font-semibold">Status:</span>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-transparent font-semibold text-white focus:outline-hidden cursor-pointer"
            >
              <option value="all" className="bg-[#0E1726] text-white">All Statuses ({totalCases})</option>
              <option value="New" className="bg-[#0E1726] text-white">New ({newCases})</option>
              <option value="Investigating" className="bg-[#0E1726] text-white">Investigating ({investigatingCases})</option>
              <option value="Confirmed Suspicious" className="bg-[#0E1726] text-white">Confirmed Suspicious ({confirmedThreats})</option>
              <option value="Dismissed" className="bg-[#0E1726] text-white">Dismissed ({dismissedCases})</option>
            </select>
          </div>

          {/* Risk Filter */}
          <div className="flex items-center gap-2 bg-[#0E1726] px-3 py-1.5 rounded-lg border border-[#1E314F]">
            <span className="text-[#8EA2C6] font-semibold">Risk:</span>
            <select
              value={riskFilter}
              onChange={e => setRiskFilter(e.target.value)}
              className="bg-transparent font-semibold text-white focus:outline-hidden cursor-pointer"
            >
              <option value="all" className="bg-[#0E1726] text-white">All Risks</option>
              <option value="Critical" className="bg-[#0E1726] text-[#EF4444]">Critical</option>
              <option value="High" className="bg-[#0E1726] text-[#F97316]">High</option>
              <option value="Medium" className="bg-[#0E1726] text-[#F59E0B]">Medium</option>
              <option value="Low" className="bg-[#0E1726] text-[#10B981]">Low</option>
            </select>
          </div>

          {/* Asset Type Filter */}
          <div className="flex items-center gap-2 bg-[#0E1726] px-3 py-1.5 rounded-lg border border-[#1E314F]">
            <span className="text-[#8EA2C6] font-semibold">Type:</span>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="bg-transparent font-semibold text-white focus:outline-hidden cursor-pointer"
            >
              <option value="all" className="bg-[#0E1726] text-white">All Types</option>
              <option value="social" className="bg-[#0E1726] text-white">Social Media</option>
              <option value="app" className="bg-[#0E1726] text-white">Mobile Apps</option>
              <option value="domain" className="bg-[#0E1726] text-white">Domains</option>
            </select>
          </div>
        </div>

        {/* Text Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[#8EA2C6] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search cases, handles, URLs..."
            className="pl-8 pr-3 py-1.5 bg-[#0E1726] border border-[#1E314F] text-white placeholder-[#8EA2C6]/60 rounded-lg focus:outline-hidden focus:border-[#45C8E8] w-64 text-xs transition-colors"
          />
        </div>
      </div>

      {/* Main Candidate Table */}
      <div className="bg-[#111D30] rounded-xl border border-[#1E314F] shadow-panel overflow-hidden">
        <div className="px-5 py-4 border-b border-[#1E314F] flex items-center justify-between bg-[#0E1726]">
          <div className="flex items-center gap-2.5">
            <span className="text-sm font-bold text-white font-mono">Triage & Investigation Queue</span>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-[#111D30] border border-[#1E314F] text-[#45C8E8]">
              {filteredCandidates.length} Active Records
            </span>
          </div>
          <span className="text-[11px] text-[#8EA2C6] hidden sm:inline font-mono">
            Click row to preview evidence or inspect full dossier
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0E1726] text-[#8EA2C6] uppercase tracking-wider font-semibold border-b border-[#1E314F] font-mono text-[11px]">
              <tr>
                <th className="py-3 px-4">Case / Asset Title</th>
                <th className="py-3 px-3">Type & Channel</th>
                <th className="py-3 px-3">Risk Assessment</th>
                <th className="py-3 px-3">Investigation Status</th>
                <th className="py-3 px-3">Analyst Notes</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E314F]/60">
              {filteredCandidates.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#8EA2C6]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FolderSearch className="w-8 h-8 text-[#8EA2C6]/40" />
                      <p className="font-medium">No investigation cases match your active filter criteria.</p>
                      <button
                        onClick={() => {
                          setStatusFilter('all');
                          setRiskFilter('all');
                          setTypeFilter('all');
                          setSearchQuery('');
                        }}
                        className="text-xs text-[#45C8E8] hover:underline"
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
                        className={`hover:bg-[#16253D] cursor-pointer transition-colors group ${
                          isExpanded ? 'bg-[#16253D]/80' : ''
                        }`}
                      >
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-[#0E1726] text-[#45C8E8] border border-[#1E314F] group-hover:border-[#45C8E8]/50 transition-colors">
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
                                <span className="font-bold text-white group-hover:text-[#45C8E8] text-xs transition-colors">
                                  {c.title}
                                </span>
                                {isExpanded ? (
                                  <ChevronUp className="w-3 h-3 text-[#8EA2C6]" />
                                ) : (
                                  <ChevronDown className="w-3 h-3 text-[#8EA2C6]/60" />
                                )}
                              </div>
                              <span className="text-[11px] text-[#8EA2C6] font-mono">{c.identifier}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="text-white font-medium block">{c.platform}</span>
                          <span className="text-[10px] text-[#8EA2C6] capitalize font-mono">{c.type}</span>
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
                                ? 'bg-[#EF4444]/10 border-[#EF4444]/40 text-[#EF4444]'
                                : c.status === 'Investigating'
                                ? 'bg-[#F59E0B]/10 border-[#F59E0B]/40 text-[#F59E0B]'
                                : c.status === 'Dismissed'
                                ? 'bg-[#0E1726] border-[#1E314F] text-[#8EA2C6]'
                                : 'bg-[#111D30] border-[#1E314F] text-[#45C8E8]'
                            }`}
                          >
                            <option value="New" className="bg-[#0E1726] text-white">New</option>
                            <option value="Investigating" className="bg-[#0E1726] text-[#F59E0B]">Investigating</option>
                            <option value="Confirmed Suspicious" className="bg-[#0E1726] text-[#EF4444]">Confirmed Suspicious</option>
                            <option value="Dismissed" className="bg-[#0E1726] text-[#8EA2C6]">Dismissed</option>
                          </select>
                        </td>
                        <td className="py-3.5 px-3 text-[#8EA2C6]">
                          <span className="inline-flex items-center gap-1.5 font-mono text-[11px] bg-[#0E1726] px-2 py-0.5 rounded-md border border-[#1E314F]">
                            <FileText className="w-3.5 h-3.5 text-[#45C8E8]" />
                            {c.analystNotes.length} note(s)
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => setSelectedCandidateId(c.id)}
                              className="px-2.5 py-1 rounded-lg bg-[#45C8E8]/10 text-[#45C8E8] hover:bg-[#45C8E8] hover:text-[#080F1D] border border-[#45C8E8]/40 text-xs font-semibold font-mono transition-all flex items-center gap-1"
                              title="Open detailed forensic dossier"
                            >
                              <span>Dossier</span>
                              <ArrowUpRight className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => deleteCandidate(c.id)}
                              className="p-1.5 rounded-lg text-[#8EA2C6] hover:text-[#EF4444] hover:bg-[#EF4444]/10 border border-transparent hover:border-[#EF4444]/30 transition-all"
                              title="Remove case from session"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Inline Evidence & Note Drawer */}
                      {isExpanded && (
                        <tr className="bg-[#0E1726]/80 border-b border-[#1E314F]">
                          <td colSpan={6} className="px-6 py-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Left: Forensic Evidence Summary */}
                              <div className="bg-[#111D30] border border-[#1E314F] rounded-lg p-3.5 space-y-2">
                                <span className="text-[10px] uppercase font-bold text-[#45C8E8] tracking-wider block font-mono">
                                  Forensic Telemetry Evidence
                                </span>
                                {c.evidence && c.evidence.length > 0 ? (
                                  <ul className="space-y-1.5">
                                    {c.evidence.map((ev, i) => (
                                      <li key={i} className="text-[11px] text-white flex items-start gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#45C8E8] mt-1.5 shrink-0" />
                                        <span>{ev}</span>
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p className="text-[11px] text-[#8EA2C6] italic">No automated evidence flags generated.</p>
                                )}
                              </div>

                              {/* Right: Latest Analyst Note & Meta */}
                              <div className="bg-[#111D30] border border-[#1E314F] rounded-lg p-3.5 space-y-2 flex flex-col justify-between">
                                <div>
                                  <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-[10px] uppercase font-bold text-[#F59E0B] tracking-wider font-mono">
                                      Latest Analyst Journal
                                    </span>
                                    <span className="text-[10px] font-mono text-[#8EA2C6]">
                                      First Seen: {new Date(c.detectedAt).toLocaleDateString()}
                                    </span>
                                  </div>
                                  {c.analystNotes.length > 0 ? (
                                    <p className="text-[11px] text-white bg-[#0E1726] p-2.5 rounded-lg border border-[#1E314F] italic">
                                      "{c.analystNotes[c.analystNotes.length - 1]}"
                                    </p>
                                  ) : (
                                    <p className="text-[11px] text-[#8EA2C6] italic">No analyst notes recorded yet.</p>
                                  )}
                                </div>

                                <div className="pt-2 border-t border-[#1E314F] flex items-center justify-between text-[11px]">
                                  <span className="text-[#8EA2C6]">Score: <span className="font-mono text-[#45C8E8] font-bold">{c.threatScore}/100</span></span>
                                  <button
                                    onClick={() => setSelectedCandidateId(c.id)}
                                    className="text-[#45C8E8] hover:underline font-semibold flex items-center gap-1 font-mono"
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
      <div className="bg-[#111D30] rounded-xl border border-[#1E314F] p-6 shadow-panel space-y-4">
        <div className="flex items-center justify-between border-b border-[#1E314F] pb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 font-mono">
            <History className="w-4 h-4 text-[#9B8AFB]" />
            Session Status Audit Trail ({allHistory.length} Recorded Events)
          </h3>
          <span className="text-xs text-[#8EA2C6] font-mono bg-[#0E1726] px-2.5 py-1 rounded-lg border border-[#1E314F]">
            Immutable In-Memory Audit Log
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0E1726] text-[#8EA2C6] uppercase tracking-wider font-semibold border-b border-[#1E314F] font-mono text-[11px]">
              <tr>
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Target Candidate</th>
                <th className="py-2.5 px-3">Transition</th>
                <th className="py-2.5 px-3">Analyst Signature</th>
                <th className="py-2.5 px-3">Note / Rationale</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E314F]/50 text-white">
              {allHistory.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[#8EA2C6] italic">
                    No session transitions recorded yet. Changes in status will be cataloged here automatically.
                  </td>
                </tr>
              ) : (
                allHistory.map((item, idx) => (
                  <tr key={idx} className="hover:bg-[#16253D] transition-colors">
                    <td className="py-2.5 px-3 font-mono text-[11px] text-[#8EA2C6]">
                      {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-white">
                      <span
                        onClick={() => setSelectedCandidateId(item.candidateId)}
                        className="hover:text-[#45C8E8] cursor-pointer underline decoration-[#1E314F] transition-colors"
                      >
                        {item.candidateTitle}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-medium">
                      <span className="text-[#8EA2C6]">{item.from}</span>
                      <span className="mx-1.5 text-[#8EA2C6]">→</span>
                      <span className="font-bold text-[#45C8E8]">{item.to}</span>
                    </td>
                    <td className="py-2.5 px-3 font-medium text-white">{item.analyst}</td>
                    <td className="py-2.5 px-3 text-[#8EA2C6] text-[11px] italic">{item.note || '—'}</td>
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
