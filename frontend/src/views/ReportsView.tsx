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
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1 rounded bg-blue-50 text-blue-700 border border-blue-200">
              <FileSpreadsheet className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-900">
              Findings Archive & Threat Telemetry Export
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Intelligence Reports &amp; Export
          </h2>
          <p className="text-xs text-slate-500 max-w-2xl mt-0.5">
            Export validated brand protection findings, evidence dossiers, and analyst triage records for executive
            reporting, domain registrar abuse complaints, or platform takedown filings.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV Dataset ({filtered.length})</span>
          </button>
        </div>
      </div>

      {/* Executive Report Summary Snapshot */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <span className="text-[10px] uppercase font-bold text-blue-400 tracking-wider">
              Executive Threat Briefing
            </span>
            <h3 className="text-sm font-bold text-white">Brand: {brandProfile.brandName}</h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Report Timestamp: {new Date().toLocaleDateString()}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs">
          <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700">
            <span className="text-2xl font-bold font-mono text-white block">{stats.totalAnalyzed}</span>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5 block">
              Total Assets Screened
            </span>
          </div>
          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-900/60">
            <span className="text-2xl font-bold font-mono text-rose-300 block">{stats.criticalRiskCount}</span>
            <span className="text-[10px] text-rose-400 uppercase tracking-wider mt-0.5 block">Critical Impersonators</span>
          </div>
          <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-900/60">
            <span className="text-2xl font-bold font-mono text-amber-300 block">{stats.investigatingCount}</span>
            <span className="text-[10px] text-amber-400 uppercase tracking-wider mt-0.5 block">Cases in Review</span>
          </div>
          <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-900/60">
            <span className="text-2xl font-bold font-mono text-emerald-300 block">{stats.benignOrOfficialCount}</span>
            <span className="text-[10px] text-emerald-400 uppercase tracking-wider mt-0.5 block">False Positives Avoided</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
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

          <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200">
            <span className="text-slate-500 font-medium">Type:</span>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 focus:outline-hidden"
            >
              <option value="all">All Types</option>
              <option value="social">Social</option>
              <option value="app">Mobile App</option>
              <option value="domain">Domain</option>
            </select>
          </div>

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
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search findings table..."
            className="pl-8 pr-3 py-1.5 border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-600 w-56 text-xs"
          />
        </div>
      </div>

      {/* Comprehensive Findings Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
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
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 italic">
                    No threat findings matching your query.
                  </td>
                </tr>
              ) : (
                filtered.map(c => (
                  <tr
                    key={c.id}
                    onClick={() => setSelectedCandidateId(c.id)}
                    className="hover:bg-blue-50/40 cursor-pointer transition-colors"
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-slate-100 text-slate-600">
                          {c.type === 'app' ? (
                            <Smartphone className="w-3.5 h-3.5" />
                          ) : c.type === 'domain' ? (
                            <Globe className="w-3.5 h-3.5" />
                          ) : (
                            <Share2 className="w-3.5 h-3.5" />
                          )}
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 block">{c.title}</span>
                          <span className="text-[11px] text-slate-500 font-mono">{c.identifier}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-slate-700 font-medium">{c.platform}</td>
                    <td className="py-3.5 px-3">
                      <RiskBadge level={c.riskCategory} size="sm" />
                    </td>
                    <td className="py-3.5 px-3">
                      <StatusBadge status={c.status} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 max-w-xs truncate" title={c.summary}>
                      {c.summary}
                    </td>
                    <td className="py-3.5 px-3 text-slate-600">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono text-[11px]">
                        {c.evidenceSupporting.length} observed
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setSelectedCandidateId(c.id);
                        }}
                        className="px-2.5 py-1 rounded bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 font-medium transition-colors text-[11px]"
                      >
                        Inspect
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
