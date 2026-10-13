import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { exportCandidatesToCSV } from '../utils/csvExport';
import { RiskBadge } from '../components/RiskBadge';
import { StatusBadge } from '../components/StatusBadge';
import {
  FileSpreadsheet,
  Download,
  Search,
  Filter,
  Share2,
  Smartphone,
  Globe,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ShieldAlert,
  Printer,
  Calendar,
  Layers,
} from 'lucide-react';

export const ReportsView: React.FC = () => {
  const { candidates, brandProfile, stats, setSelectedCandidateId } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = candidates.filter(c => {
    const matchesRisk = riskFilter === 'all' || c.riskCategory === riskFilter;
    const matchesType = typeFilter === 'all' || c.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    const matchesSearch =
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.identifier.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.summary.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRisk && matchesType && matchesStatus && matchesSearch;
  });

  const handleExport = () => {
    exportCandidatesToCSV(filtered, brandProfile.brandName);
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="rounded-2xl border border-[#123E78] bg-gradient-to-r from-[#06142D] via-[#081B3B] to-[#06142D] p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-40 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="p-1.5 rounded-lg bg-blue-500/10 text-[#00D9FF] border border-blue-500/30">
                <FileSpreadsheet className="w-4 h-4" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-[#00D9FF]">
                Findings Archive & Telemetry Export
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[#00E5A0] font-mono">
                Audit Ready
              </span>
            </div>
            <h2 className="text-2xl font-bold text-[#F1F5FF] tracking-tight">
              Intelligence Reports &amp; Compliance Export
            </h2>
            <p className="text-xs text-[#91ACD1] max-w-2xl mt-1 leading-relaxed">
              Generate threat intelligence records, evidence dossiers, and analyst triage records for executive reporting,
              domain registrar abuse complaints, or platform takedown filings.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2 border border-blue-400/40"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV Findings ({filtered.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Executive Report Summary Snapshot */}
      <div className="bg-[#06142D] text-white rounded-2xl p-6 border border-[#123E78] shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#123E78] pb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#0A1C3D] border border-[#123E78] flex items-center justify-center text-[#00D9FF]">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-[#00D9FF] tracking-wider block">
                Executive Threat Briefing
              </span>
              <h3 className="text-sm font-bold text-[#F1F5FF]">Target Entity: {brandProfile.brandName}</h3>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#91ACD1] font-mono bg-[#0A1C3D] px-3 py-1.5 rounded-xl border border-[#123E78]">
            <Calendar className="w-3.5 h-3.5 text-[#00D9FF]" />
            <span>Generated: {new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs">
          <div className="p-3.5 rounded-xl bg-[#0A1C3D] border border-[#123E78]">
            <span className="text-2xl font-bold font-mono text-[#F1F5FF] block">{stats.totalAnalyzed}</span>
            <span className="text-[10px] text-[#91ACD1] uppercase tracking-wider mt-1 block">
              Total Assets Screened
            </span>
          </div>
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30">
            <span className="text-2xl font-bold font-mono text-rose-400 block">{stats.criticalRiskCount}</span>
            <span className="text-[10px] text-rose-300 uppercase tracking-wider mt-1 block">Critical Impersonators</span>
          </div>
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
            <span className="text-2xl font-bold font-mono text-amber-400 block">{stats.investigatingCount}</span>
            <span className="text-[10px] text-amber-300 uppercase tracking-wider mt-1 block">Cases in Review</span>
          </div>
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
            <span className="text-2xl font-bold font-mono text-[#00E5A0] block">{stats.benignOrOfficialCount}</span>
            <span className="text-[10px] text-emerald-300 uppercase tracking-wider mt-1 block">False Positives Avoided</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#06142D] p-4 rounded-2xl border border-[#123E78] shadow-lg flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2.5">
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

          <div className="flex items-center gap-2 bg-[#0A1C3D] px-3 py-1.5 rounded-xl border border-[#123E78]">
            <span className="text-[#91ACD1] font-semibold">Type:</span>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="bg-transparent font-semibold text-[#F1F5FF] focus:outline-hidden cursor-pointer"
            >
              <option value="all" className="bg-[#0A1C3D] text-[#F1F5FF]">All Types</option>
              <option value="social" className="bg-[#0A1C3D] text-[#F1F5FF]">Social Accounts</option>
              <option value="app" className="bg-[#0A1C3D] text-[#F1F5FF]">Mobile Apps</option>
              <option value="domain" className="bg-[#0A1C3D] text-[#F1F5FF]">Lookalike Domains</option>
            </select>
          </div>

          <div className="flex items-center gap-2 bg-[#0A1C3D] px-3 py-1.5 rounded-xl border border-[#123E78]">
            <span className="text-[#91ACD1] font-semibold">Status:</span>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-transparent font-semibold text-[#F1F5FF] focus:outline-hidden cursor-pointer"
            >
              <option value="all" className="bg-[#0A1C3D] text-[#F1F5FF]">All Statuses</option>
              <option value="New" className="bg-[#0A1C3D] text-[#F1F5FF]">New</option>
              <option value="Investigating" className="bg-[#0A1C3D] text-amber-300">Investigating</option>
              <option value="Confirmed Suspicious" className="bg-[#0A1C3D] text-rose-300">Confirmed Suspicious</option>
              <option value="Dismissed" className="bg-[#0A1C3D] text-slate-400">Dismissed</option>
            </select>
          </div>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[#91ACD1] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search report archive..."
            className="pl-8 pr-3 py-1.5 bg-[#0A1C3D] border border-[#123E78] text-[#F1F5FF] placeholder-[#91ACD1]/60 rounded-xl focus:outline-hidden focus:border-[#00D9FF] w-64 text-xs transition-colors"
          />
        </div>
      </div>

      {/* Comprehensive Findings Table */}
      <div className="bg-[#06142D] rounded-2xl border border-[#123E78] shadow-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#123E78] flex items-center justify-between bg-[#041026]">
          <div className="flex items-center gap-2.5">
            <span className="text-sm font-bold text-[#F1F5FF]">Threat Telemetry Findings Archive</span>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-[#123E78]/60 text-[#00D9FF]">
              {filtered.length} Filtered Records
            </span>
          </div>
          <span className="text-[11px] text-[#91ACD1] hidden sm:inline font-mono">
            Compliant with ISO/IEC 27001 Threat Triage Standards
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#030D22] text-[#91ACD1] uppercase tracking-wider font-semibold border-b border-[#123E78]">
              <tr>
                <th className="py-3 px-4">Candidate Asset</th>
                <th className="py-3 px-3">Platform</th>
                <th className="py-3 px-3">Risk Category</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-4">Summary Rationale</th>
                <th className="py-3 px-3">Evidence Signals</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#123E78]/60">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#91ACD1]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FileSpreadsheet className="w-8 h-8 text-[#91ACD1]/40" />
                      <p className="font-medium">No threat findings matching your query.</p>
                      <button
                        onClick={() => {
                          setRiskFilter('all');
                          setTypeFilter('all');
                          setStatusFilter('all');
                          setSearchQuery('');
                        }}
                        className="text-xs text-[#00D9FF] hover:underline"
                      >
                        Reset filters to view all findings
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map(c => (
                  <tr
                    key={c.id}
                    onClick={() => setSelectedCandidateId(c.id)}
                    className="hover:bg-[#0A1C3D]/80 cursor-pointer transition-colors group"
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-[#0A1C3D] text-[#00D9FF] border border-[#123E78] group-hover:border-[#00D9FF]/50 transition-colors">
                          {c.type === 'app' ? (
                            <Smartphone className="w-3.5 h-3.5" />
                          ) : c.type === 'domain' ? (
                            <Globe className="w-3.5 h-3.5" />
                          ) : (
                            <Share2 className="w-3.5 h-3.5" />
                          )}
                        </div>
                        <div>
                          <span className="font-bold text-[#F1F5FF] group-hover:text-[#00D9FF] block text-xs transition-colors">
                            {c.title}
                          </span>
                          <span className="text-[11px] text-[#91ACD1] font-mono">{c.identifier}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-[#F1F5FF] font-medium">{c.platform}</td>
                    <td className="py-3.5 px-3">
                      <RiskBadge level={c.riskCategory} size="sm" />
                    </td>
                    <td className="py-3.5 px-3">
                      <StatusBadge status={c.status} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 text-[#91ACD1] max-w-xs truncate text-[11px]" title={c.summary}>
                      {c.summary}
                    </td>
                    <td className="py-3.5 px-3 text-[#91ACD1]">
                      <span className="bg-[#0A1C3D] text-[#00D9FF] border border-[#123E78] px-2 py-0.5 rounded font-mono text-[11px]">
                        {c.evidenceSupporting.length} observed
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setSelectedCandidateId(c.id);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-blue-600/20 text-[#00D9FF] hover:bg-blue-600 hover:text-white border border-blue-500/40 text-xs font-semibold transition-all inline-flex items-center gap-1"
                      >
                        <span>Inspect</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </button>
                    </td>
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
