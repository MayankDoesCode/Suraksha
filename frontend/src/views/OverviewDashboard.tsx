import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { RiskBadge } from '../components/RiskBadge';
import { StatusBadge } from '../components/StatusBadge';
import {
  ShieldAlert,
  AlertTriangle,
  FolderSearch,
  CheckCircle2,
  TrendingUp,
  Activity,
  ArrowUpRight,
  Filter,
  Search,
  Share2,
  Smartphone,
  Globe,
  Sparkles,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import type { RiskLevel, InvestigationStatus } from '../types';

export const OverviewDashboard: React.FC = () => {
  const { candidates, brandProfile, stats, setActiveTab, setSelectedCandidateId, resetAllToDemoData } = useApp();
  const [filterRisk, setFilterRisk] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredCandidates = candidates.filter(c => {
    const matchesRisk = filterRisk === 'all' || c.riskCategory === filterRisk;
    const matchesSearch =
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.identifier.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.platform.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRisk && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner Alert / Monitored Brand Header */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-2xl p-5 text-white shadow-lg border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400 bg-blue-900/60 px-2.5 py-0.5 rounded-full border border-blue-700/50">
              Suraksha Brand Protection Matrix
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Monitored Brand: <strong className="text-white">{brandProfile.brandName}</strong> (Fictional Fintech)
            </span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white">
            Digital Brand Protection &amp; Threat Intelligence
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl mt-1">
            Automated intelligence surveillance across social media platforms, app stores, and look-alike domains.
            Powered by <strong>Suraksha AI</strong> with multi-signal evidence reasoning and false-positive defense.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setActiveTab('social-monitoring')}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition-colors flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>New Social Scan</span>
          </button>
          <button
            onClick={() => setActiveTab('app-monitoring')}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors flex items-center gap-1.5"
          >
            <Smartphone className="w-3.5 h-3.5 text-sky-400" />
            <span>New App Scan</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards: Analyzed Assets, High-Risk Alerts, In Investigation, Confirmed Suspicious */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Analyzed Assets */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Analyzed Assets</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight font-mono">
              {stats.totalAnalyzed}
            </span>
            <span className="text-xs font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
              Total Screened
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Social profiles, app stores, and domain candidates
          </p>
        </div>

        {/* High-Risk Alerts */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">High-Risk Alerts</span>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight font-mono">
              {stats.activeAlerts}
            </span>
            <span className="text-xs font-medium text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
              Needs Action
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Critical ({stats.criticalRiskCount}) &amp; High ({stats.highRiskCount}) threat candidates
          </p>
        </div>

        {/* In Investigation */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">In Investigation</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
              <FolderSearch className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight font-mono">
              {stats.investigatingCount}
            </span>
            <span className="text-xs font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
              Active Triage
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Under active analyst review and evidence verification
          </p>
        </div>

        {/* Confirmed Suspicious */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Confirmed Suspicious</span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600 border border-purple-100">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight font-mono">
              {stats.confirmedSuspiciousCount}
            </span>
            <span className="text-xs font-medium text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">
              Takedown Ready
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Verified fraudulent look-alikes &amp; rogue packages
          </p>
        </div>
      </div>

      {/* Two Column Layout: Priority Threat Candidates Table + Benchmark Validation Suite */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Priority Threat Candidates Table (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Priority Threat Candidates</h3>
              <p className="text-xs text-slate-500">
                Screened accounts, apps, and domains ranked by threat severity.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Risk Filter */}
              <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-lg border border-slate-200 text-xs">
                <Filter className="w-3.5 h-3.5 text-slate-400 ml-1" />
                <select
                  value={filterRisk}
                  onChange={e => setFilterRisk(e.target.value)}
                  className="bg-transparent text-xs font-medium text-slate-700 focus:outline-hidden"
                >
                  <option value="all">All Risks</option>
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>

              {/* Quick Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search candidate..."
                  className="pl-8 pr-2.5 py-1 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:border-blue-500 w-36 sm:w-44"
                />
              </div>
            </div>
          </div>

          {/* Candidates List */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Candidate Asset</th>
                  <th className="py-2.5 px-3">Platform</th>
                  <th className="py-2.5 px-3">Risk Level</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Evidence Summary</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCandidates.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 italic">
                      No candidate assets match your search filters.
                    </td>
                  </tr>
                ) : (
                  filteredCandidates.map(c => (
                    <tr
                      key={c.id}
                      onClick={() => setSelectedCandidateId(c.id)}
                      className="hover:bg-blue-50/40 cursor-pointer transition-colors group"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 rounded-lg bg-slate-100 text-slate-600 group-hover:bg-blue-100 group-hover:text-blue-700 transition-colors">
                            {c.type === 'app' ? (
                              <Smartphone className="w-4 h-4" />
                            ) : c.type === 'domain' ? (
                              <Globe className="w-4 h-4" />
                            ) : (
                              <Share2 className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 group-hover:text-blue-600 flex items-center gap-1.5">
                              <span>{c.title}</span>
                              {c.isFictionalDemo && (
                                <span className="text-[9px] bg-slate-100 text-slate-500 px-1 py-0.2 rounded font-mono">
                                  DEMO
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-500 font-mono block">{c.identifier}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-700 font-medium">{c.platform}</td>
                      <td className="py-3 px-3">
                        <RiskBadge level={c.riskCategory} size="sm" />
                      </td>
                      <td className="py-3 px-3">
                        <StatusBadge status={c.status} size="sm" />
                      </td>
                      <td className="py-3 px-3 text-slate-600 max-w-xs truncate" title={c.summary}>
                        {c.summary}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setSelectedCandidateId(c.id);
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold transition-colors shadow-2xs"
                        >
                          <span>Investigate</span>
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

        {/* Right Column: Benchmark Validation Suite & Live Activity */}
        <div className="space-y-6">
          {/* Benchmark Validation Suite Panel */}
          <div className="bg-slate-900 text-white rounded-2xl p-4 border border-slate-800 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-blue-400">
                Fictional Test Suite
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Benchmark</span>
            </div>
            <h4 className="text-xs font-bold text-white mb-1">
              Benchmark Validation Suite
            </h4>
            <p className="text-[11px] text-slate-300 mb-3">
              Standardized validation cases for monitored brand <strong>ApexPay</strong>. Click to inspect evidence:
            </p>

            <div className="space-y-2 text-xs">
              <div
                onClick={() => setSelectedCandidateId('cand-001')}
                className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 cursor-pointer flex items-center justify-between transition-colors"
              >
                <div>
                  <span className="font-semibold text-emerald-400 text-[11px] block">1. Official Account (Safe)</span>
                  <span className="text-[10px] text-slate-400">@apexpay_official — Allowlisted identity</span>
                </div>
                <RiskBadge level="Low" size="sm" />
              </div>

              <div
                onClick={() => setSelectedCandidateId('cand-002')}
                className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 cursor-pointer flex items-center justify-between transition-colors"
              >
                <div>
                  <span className="font-semibold text-rose-400 text-[11px] block">2. Look-alike Phishing Lure</span>
                  <span className="text-[10px] text-slate-400">@apexpay_support_claims — Credential trap</span>
                </div>
                <RiskBadge level="Critical" size="sm" />
              </div>

              <div
                onClick={() => setSelectedCandidateId('cand-003')}
                className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 cursor-pointer flex items-center justify-between transition-colors"
              >
                <div>
                  <span className="font-semibold text-amber-400 text-[11px] block">3. Authorized Partner</span>
                  <span className="text-[10px] text-slate-400">FinTech Daily — Nuanced partner review</span>
                </div>
                <RiskBadge level="Medium" size="sm" />
              </div>

              <div
                onClick={() => setSelectedCandidateId('cand-004')}
                className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 cursor-pointer flex items-center justify-between transition-colors"
              >
                <div>
                  <span className="font-semibold text-rose-400 text-[11px] block">4. Rogue Mobile Loan App</span>
                  <span className="text-[10px] text-slate-400">Mismatched publisher &amp; SMS permissions</span>
                </div>
                <RiskBadge level="Critical" size="sm" />
              </div>

              <div
                onClick={() => setSelectedCandidateId('cand-005')}
                className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 cursor-pointer flex items-center justify-between transition-colors"
              >
                <div>
                  <span className="font-semibold text-emerald-400 text-[11px] block">5. Unrelated Benign Account</span>
                  <span className="text-[10px] text-slate-400">@apex_payne_art — 3D Concept Artist</span>
                </div>
                <RiskBadge level="Low" size="sm" />
              </div>
            </div>
          </div>

          {/* Recent Analyst Activity Feed */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              Recent Triage & Audit Timeline
            </h4>

            <div className="space-y-3">
              {candidates
                .flatMap(c =>
                  c.statusHistory.map(h => ({
                    ...h,
                    candidateTitle: c.title,
                    candidateId: c.id,
                  }))
                )
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .slice(0, 4)
                .map((event, idx) => (
                  <div
                    key={idx}
                    onClick={() => setSelectedCandidateId(event.candidateId)}
                    className="p-2.5 rounded-xl bg-slate-50 hover:bg-blue-50/60 border border-slate-100 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between text-[10px] text-slate-500 mb-0.5">
                      <span className="font-semibold text-slate-700">{event.analyst}</span>
                      <span>{new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="text-xs font-semibold text-slate-800 truncate">{event.candidateTitle}</div>
                    <div className="text-[11px] text-slate-600 mt-0.5">
                      Status changed to <span className="font-bold text-blue-600">{event.to}</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
