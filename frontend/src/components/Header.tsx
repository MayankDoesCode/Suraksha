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
  ChevronDown,
  ShieldCheck,
  ExternalLink,
  Menu,
} from 'lucide-react';
import { exportCandidatesToCSV } from '../utils/csvExport';

interface HeaderProps {
  onNavigateHome?: () => void;
  onToggleMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onNavigateHome, onToggleMobileMenu }) => {
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

  const { currentUser } = useAuth();

  return (
    <header className="bg-[#030D22] border-b border-[#123E78] sticky top-0 z-20 shadow-xl font-sans">
      {/* 1. Top Navigation Bar (~68px high) */}
      <div className="h-[68px] px-4 sm:px-6 flex items-center justify-between border-b border-[#123E78]/80">
        {/* Left: Mobile menu toggle, Info icon, Monitored Brand label & Dropdown */}
        <div className="flex items-center gap-2.5">
          {onToggleMobileMenu && (
            <button
              onClick={onToggleMobileMenu}
              className="lg:hidden p-1.5 rounded-lg bg-[#06142D] border border-[#123E78] text-[#00D9FF] hover:bg-[#0A1C3D] transition-colors cursor-pointer"
              title="Open Navigation Menu"
            >
              <Menu className="w-4 h-4" />
            </button>
          )}
          <div className="w-7 h-7 rounded-lg bg-[#1265F8]/15 border border-[#1265F8]/40 flex items-center justify-center text-[#00D9FF] shrink-0">
            <Info className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-semibold font-mono tracking-wide text-[#91ACD1] shrink-0">
            Monitored Brand:
          </span>

          <div className="relative">
            <select
              value={selectedBackendBrandId || 'demo-apexpay'}
              onChange={(e) => selectBrandById(e.target.value)}
              className="appearance-none bg-[#06142D] hover:bg-[#0A1C3D] border border-[#123E78] focus:border-[#00D9FF] rounded-xl pl-3 pr-8 py-1.5 text-xs font-semibold text-[#F1F5FF] focus:outline-hidden transition-all cursor-pointer shadow-xs"
            >
              <option value="demo-apexpay">ApexPay (Demo Sandbox)</option>
              {backendBrands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} (DB Record)
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[#91ACD1] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Right: Session, Status, Zero-Trust Protected */}
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="text-xs font-mono text-[#91ACD1] hidden md:inline">
            Session:{' '}
            <span className="text-[#00D9FF] font-semibold">
              {currentUser?.email || 'analyst@suraksha.local'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#00E5A0] shadow-[0_0_8px_#00E5A0] animate-pulse shrink-0" />
            <div className="inline-flex items-center gap-1.5 text-xs text-[#00E5A0] font-mono font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-[#00E5A0]" />
              <span>Zero-Trust Protected</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Sub-Header: Breadcrumbs, View Title & Quick Actions */}
      <div className="px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 bg-[#030D22]/60">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#91ACD1] mb-0.5">
            <span className="font-semibold text-slate-300">Suraksha</span>
            <ChevronRight className="w-3 h-3 text-[#123E78]" />
            <span className="text-[#00D9FF] font-semibold">{current.title}</span>
          </div>
          <h1 className="text-base sm:text-lg font-bold text-[#F1F5FF] tracking-tight">
            {current.title}
          </h1>
          <p className="text-[11px] text-[#91ACD1]">{current.subtitle}</p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {activeTab !== 'social-monitoring' && activeTab !== 'app-monitoring' && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setActiveTab('social-monitoring')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#06142D] hover:bg-[#0A1C3D] text-[#F1F5FF] text-xs font-medium border border-[#123E78] hover:border-[#00D9FF]/40 transition-all cursor-pointer shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#00D9FF]" />
                <span>Analyze Social</span>
              </button>
              <button
                onClick={() => setActiveTab('app-monitoring')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#06142D] hover:bg-[#0A1C3D] text-[#F1F5FF] text-xs font-medium border border-[#123E78] hover:border-[#FF315B]/40 transition-all cursor-pointer shadow-xs"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-[#FF315B]" />
                <span>Analyze App</span>
              </button>
            </div>
          )}

          {/* Export Findings CSV */}
          <button
            onClick={() => exportCandidatesToCSV(candidates, brandProfile.brandName)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1265F8] hover:bg-[#1265F8]/90 text-white text-xs font-semibold shadow-md shadow-[#1265F8]/30 transition-all cursor-pointer"
            title="Download CSV report of all findings"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          {onNavigateHome && (
            <button
              onClick={onNavigateHome}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#06142D] hover:bg-[#0A1C3D] text-[#91ACD1] hover:text-[#F1F5FF] text-xs font-medium border border-[#123E78] transition-colors cursor-pointer"
              title="Return to Public Landing Page"
            >
              <span>Public Portal</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
