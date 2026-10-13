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
} from 'lucide-react';
import type { InvestigationStatus, RiskLevel } from '../types';

export const InvestigationCenterView: React.FC = () => {
  const { candidates, updateCandidateStatus, setSelectedCandidateId, deleteCandidate } = useApp();

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

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
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1 rounded bg-amber-50 text-amber-700 border border-amber-200">
              <FolderSearch className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-amber-900">
              Analyst Case Management
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Threat Investigation Center
          </h2>
          <p className="text-xs text-slate-500 max-w-2xl mt-0.5">
            Review threat candidate evidence, manage investigation workflows, add analyst case notes, and track
            session audit logs across all triage actions.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200">
            <span className="text-slate-500 font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 focus:outline-hidden"
            >
              <option value="all">All Statuses</option>
              <option value="New">New</option>
              <option value="Investigating">Investigating</option>
              <option value="Confirmed Suspicious">Confirmed Suspicious</option>
              <option value="Dismissed">Dismissed</option>
            </select>
          </div>

          {/* Risk Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200">
            <span className="text-slate-500 font-medium">Risk:</span>
            <select
              value={riskFilter}
              onChange={e => setRiskFilter(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 focus:outline-hidden"
            >
              <option value="all">All Risks</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          {/* Asset Type Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200">
            <span className="text-slate-500 font-medium">Type:</span>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 focus:outline-hidden"
            >
              <option value="all">All Assets</option>
              <option value="social">Social Media</option>
              <option value="app">Mobile Apps</option>
              <option value="domain">Domains</option>
            </select>
          </div>
        </div>

        {/* Text Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search cases & handles..."
            className="pl-8 pr-3 py-1.5 border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-600 w-56 text-xs"
          />
        </div>
      </div>

      {/* Main Candidate Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Case / Asset Title</th>
                <th className="py-3 px-3">Type & Channel</th>
                <th className="py-3 px-3">Risk Assessment</th>
                <th className="py-3 px-3">Investigation Status</th>
                <th className="py-3 px-3">Analyst Notes</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCandidates.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400 italic">
                    No active investigation cases match your filters.
                  </td>
                </tr>
              ) : (
                filteredCandidates.map(c => (
                  <tr
                    key={c.id}
                    onClick={() => setSelectedCandidateId(c.id)}
                    className="hover:bg-blue-50/40 cursor-pointer transition-colors group"
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-slate-100 text-slate-600 group-hover:bg-blue-100 group-hover:text-blue-700 transition-colors">
                          {c.type === 'app' ? (
                            <Smartphone className="w-4 h-4" />
                          ) : c.type === 'domain' ? (
                            <Globe className="w-4 h-4" />
                          ) : (
                            <Share2 className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 group-hover:text-blue-600 block text-xs">
                            {c.title}
                          </span>
                          <span className="text-[11px] text-slate-500 font-mono">{c.identifier}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="text-slate-800 font-medium block">{c.platform}</span>
                      <span className="text-[10px] text-slate-400 capitalize">{c.type}</span>
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
                        className="bg-slate-50 border border-slate-200 text-slate-800 font-medium rounded-lg px-2 py-1 text-xs focus:outline-hidden focus:border-blue-600"
                      >
                        <option value="New">New</option>
                        <option value="Investigating">Investigating</option>
                        <option value="Confirmed Suspicious">Confirmed Suspicious</option>
                        <option value="Dismissed">Dismissed</option>
                      </select>
                    </td>
                    <td className="py-3.5 px-3 text-slate-600">
                      <span className="inline-flex items-center gap-1 font-mono text-slate-700">
                        <FileText className="w-3.5 h-3.5 text-slate-400" />
                        {c.analystNotes.length} note(s)
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => setSelectedCandidateId(c.id)}
                          className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white text-xs font-semibold transition-colors flex items-center gap-1"
                          title="Open detailed dossier"
                        >
                          <span>Dossier</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => deleteCandidate(c.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Remove case from session"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Complete Session Audit History Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <History className="w-4 h-4 text-purple-600" />
            Session Status Audit Trail ({allHistory.length} Recorded Events)
          </h3>
          <span className="text-xs text-slate-400 font-mono">Immutable during current session</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Target Candidate</th>
                <th className="py-2.5 px-3">Transition</th>
                <th className="py-2.5 px-3">Analyst Signature</th>
                <th className="py-2.5 px-3">Note / Rationale</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-normal">
              {allHistory.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/60">
                  <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                    {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-slate-900">
                    <span
                      onClick={() => setSelectedCandidateId(item.candidateId)}
                      className="hover:text-blue-600 cursor-pointer underline decoration-slate-300"
                    >
                      {item.candidateTitle}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-medium">
                    <span className="text-slate-500">{item.from}</span>
                    <span className="mx-1 text-slate-400">→</span>
                    <span className="font-bold text-blue-700">{item.to}</span>
                  </td>
                  <td className="py-2.5 px-3 font-medium text-slate-800">{item.analyst}</td>
                  <td className="py-2.5 px-3 text-slate-600 text-[11px] italic">{item.note || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
