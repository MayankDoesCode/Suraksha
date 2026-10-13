import React from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import {
  ShieldAlert,
  Sparkles,
  Search,
  Download,
  Info,
  ChevronRight,
  UserCheck,
} from 'lucide-react';
import { exportCandidatesToCSV } from '../utils/csvExport';

export const Header: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    brandProfile,
    candidates,
    stats,
    backendBrands,
    selectedBackendBrandId,
    selectBrandById,
  } = useApp();

  const titleMap: Record<string, { title: string; subtitle: string }> = {
    overview: {
      title: 'Overview Dashboard',
      subtitle: `Real-time brand impersonation telemetry for ${brandProfile.brandName}`,
    },
    'brand-profile': {
      title: 'Official Brand Profile',
      subtitle: `Protected assets and verified identity directory for ${brandProfile.brandName}`,
    },
    'social-monitoring': {
      title: 'Social Media Monitor',
      subtitle: 'Analyze suspected profile impersonation using Gemini AI reasoning',
    },
    'app-monitoring': {
      title: 'App Store Monitor',
      subtitle: 'Inspect rogue app packages, publisher mismatches, and permissions abuse',
    },
    'lookalike-engine': {
      title: 'Look-alike Engine',
      subtitle: 'Deterministic string matching, homoglyphs, and algorithmic heuristics',
    },
    'investigation-center': {
      title: 'Investigation Center',
      subtitle: 'Analyst case management, evidence timeline, and status auditing',
    },
    'threat-graph': {
      title: 'Threat Relationship Graph',
      subtitle: 'Infrastructure links, shared hosts, and inferred threat clusters',
    },
    reports: {
      title: 'Intelligence Reports',
      subtitle: 'Searchable findings archive, CSV export, and compliance documentation',
    },
    diagnostics: {
      title: 'System Diagnostics & Telemetry',
      subtitle: 'Backend health check, database status, and external connectors',
    },
  };

  const current = titleMap[activeTab] || {
    title: 'Suraksha',
    subtitle: 'Digital Brand Protection Matrix',
  };

  const { currentUser, userProfile } = useAuth();

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-2xs">
      {/* Prototype Notice Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-blue-100 px-4 py-1.5 text-xs flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 font-semibold text-sky-300">
            <Info className="w-3.5 h-3.5" />
            Monitored Brand:
          </span>
          {backendBrands.length > 0 ? (
            <select
              value={selectedBackendBrandId || 'demo-apexpay'}
              onChange={(e) => selectBrandById(e.target.value)}
              className="bg-blue-950/90 border border-blue-600/70 rounded-md px-2 py-0.5 text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-sky-400 cursor-pointer"
            >
              <option value="demo-apexpay">ApexPay (Demo Sandbox)</option>
              {backendBrands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} (DB Record)
                </option>
              ))}
            </select>
          ) : (
            <span className="text-slate-300">
              <strong>"{brandProfile.brandName}"</strong>
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {currentUser && (
            <span className="text-slate-300 text-[11px] hidden sm:inline">
              Session: <span className="text-sky-300 font-mono">{currentUser.email}</span>
            </span>
          )}
          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Zero-Trust Protected
          </span>
        </div>
      </div>

      {/* Main Header Bar */}
      <div className="px-6 py-3.5 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-0.5">
            <span className="font-semibold text-slate-700">Suraksha</span>
            <ChevronRight className="w-3 h-3 text-slate-400" />
            <span className="text-blue-600 font-semibold">{current.title}</span>
          </div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            {current.title}
          </h1>
          <p className="text-xs text-slate-500">{current.subtitle}</p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          {/* Quick Jump to New Scan */}
          {activeTab !== 'social-monitoring' && activeTab !== 'app-monitoring' && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setActiveTab('social-monitoring')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium border border-slate-300 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>Analyze Social</span>
              </button>
              <button
                onClick={() => setActiveTab('app-monitoring')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium border border-slate-300 transition-colors"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                <span>Analyze App</span>
              </button>
            </div>
          )}

          {/* Export Findings CSV */}
          <button
            onClick={() => exportCandidatesToCSV(candidates, brandProfile.brandName)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs hover:shadow-sm transition-all"
            title="Download CSV report of all findings"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>
    </header>
  );
};
