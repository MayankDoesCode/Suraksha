import React from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import {
  ShieldAlert,
  Sparkles,
  Download,
  ChevronRight,
  ChevronDown,
  ShieldCheck,
  Shield,
  Menu,
  User,
  LogOut,
  Activity,
  Globe,
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
    backendOnline,
    backendBrands,
    selectedBackendBrandId,
    selectBrandById,
    isDemoMode,
    enterDemoMode,
    exitDemoMode,
  } = useApp();

  const { currentUser, userProfile, logOut } = useAuth();

  const titleMap: Record<string, { title: string; subtitle: string }> = {
    overview: {
      title: 'Executive Command Center',
      subtitle: `Real-time brand impersonation telemetry for ${brandProfile.brandName}`,
    },
    watchtower: {
      title: 'Brand Impersonation Watchtower',
      subtitle: `Continuous and on-demand brand perimeter surveillance for ${brandProfile.brandName}`,
    },
    'brand-profile': {
      title: 'Official Brand Registry',
      subtitle: `Protected assets and verified identity directory for ${brandProfile.brandName}`,
    },
    'social-monitoring': {
      title: 'Social Identity Monitor',
      subtitle: 'Analyze suspected profile impersonation using ML & multi-signal detection',
    },
    'app-monitoring': {
      title: 'App Store Monitor',
      subtitle: 'Inspect rogue app packages, publisher mismatches, and permissions abuse',
    },
    'lookalike-engine': {
      title: 'Look-alike Similarity Engine',
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
      title: 'Intelligence Dossiers & Exports',
      subtitle: 'Searchable findings archive, CSV export, and compliance documentation',
    },
    diagnostics: {
      title: 'System Diagnostics & Telemetry',
      subtitle: 'Backend health check, database status, and external connectors',
    },
  };

  const current = titleMap[activeTab] || {
    title: 'SURAKSHA',
    subtitle: 'Digital Risk Protection Platform',
  };

  const analystDisplayName =
    userProfile?.displayName || currentUser?.displayName || currentUser?.email?.split('@')[0] || 'SecOps Analyst';

  return (
    <header className="bg-[#0B1424] border-b border-[#1E314F] sticky top-0 z-20 font-sans shadow-sm">
      {/* 1. Top Navigation Bar */}
      <div className="h-16 px-4 sm:px-6 flex items-center justify-between border-b border-[#1E314F]/70">
        {/* Left: Mobile Toggle, Logo Mark, Monitored Brand Selector */}
        <div className="flex items-center gap-3">
          {onToggleMobileMenu && (
            <button
              onClick={onToggleMobileMenu}
              className="lg:hidden p-2 rounded-lg bg-[#111D30] border border-[#1E314F] text-[#45C8E8] hover:bg-[#16253D] transition-colors cursor-pointer"
              title="Open Navigation Menu"
              aria-label="Open Navigation Menu"
            >
              <Menu className="w-4 h-4" />
            </button>
          )}

          {/* SURAKSHA Shield Emblem for Mobile */}
          <div className="lg:hidden flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#111D30] border border-[#1E314F] flex items-center justify-center">
              <Shield className="w-3.5 h-3.5 text-[#45C8E8]" />
            </div>
            <span className="font-bold text-xs font-mono tracking-tight text-white hidden sm:inline">
              SURAKSHA
            </span>
          </div>

          <div className="hidden sm:block h-4 w-[1px] bg-[#1E314F] mx-0.5" />

          {/* Monitored Brand Selector */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold font-mono tracking-wide text-[#8EA2C6] shrink-0 hidden md:inline">
              Target Entity:
            </span>

            <div className="relative">
              <select
                value={isDemoMode ? 'demo-apexpay' : (selectedBackendBrandId || '')}
                onChange={(e) => {
                  if (e.target.value === 'demo-apexpay') {
                    enterDemoMode();
                  } else if (e.target.value) {
                    selectBrandById(e.target.value);
                  }
                }}
                aria-label="Select Monitored Brand"
                className="appearance-none bg-[#111D30] hover:bg-[#16253D] border border-[#1E314F] focus:border-[#45C8E8] rounded-lg pl-3 pr-8 py-1 text-xs font-semibold text-[#F8FAFC] focus:outline-hidden transition-all cursor-pointer shadow-xs"
              >
                {backendBrands.length === 0 && !isDemoMode && (
                  <option value="">No Brands Registered</option>
                )}
                {backendBrands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} (Live Protected)
                  </option>
                ))}
                {isDemoMode && (
                  <option value="demo-apexpay">
                    ApexPay Global (DEMO DATA)
                  </option>
                )}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#8EA2C6] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {isDemoMode && (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#EF4444]/15 border border-[#EF4444]/40 text-[#EF4444] text-[10px] font-mono font-bold uppercase tracking-wider">
                DEMO DATA — NOT REAL THREATS
              </span>
            )}
          </div>
        </div>

        {/* Right: Telemetry Connectivity, Analyst Profile & Logout */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Backend Online / Local Dev status */}
          <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded bg-[#111D30] border border-[#1E314F]">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                backendOnline ? 'bg-[#10B981]' : 'bg-[#F59E0B]'
              } shrink-0`}
            />
            <span className="text-[11px] font-mono text-[#8EA2C6]">
              Engine:{' '}
              <strong className={backendOnline ? 'text-[#10B981]' : 'text-[#F59E0B]'}>
                {backendOnline ? 'Operational' : 'Local Dev'}
              </strong>
            </span>
          </div>

          {/* Enterprise Security Badge */}
          <div className="hidden xl:flex items-center gap-1.5 text-[11px] text-[#45C8E8] font-mono font-medium px-2.5 py-1 rounded bg-[#45C8E8]/10 border border-[#45C8E8]/25">
            <ShieldCheck className="w-3.5 h-3.5 text-[#45C8E8]" />
            <span>SOC-2 Controls Active</span>
          </div>

          {/* Analyst Session Profile & Sign Out Button */}
          <div className="flex items-center gap-2.5 pl-3 border-l border-[#1E314F]">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded bg-[#16253D] border border-[#1E314F] flex items-center justify-center text-[#45C8E8] shrink-0 font-mono font-bold text-xs">
                {analystDisplayName.slice(0, 2).toUpperCase()}
              </div>
              <div className="hidden lg:block text-left">
                <p className="text-xs font-medium text-[#F8FAFC] leading-tight truncate max-w-[120px]">
                  {analystDisplayName}
                </p>
                <p className="text-[9.5px] font-mono text-[#8EA2C6] leading-tight truncate max-w-[120px]">
                  {currentUser?.email || 'SecOps Tier 3'}
                </p>
              </div>
            </div>

            <button
              onClick={() => logOut()}
              className="p-1.5 rounded-lg bg-[#111D30] hover:bg-[#16253D] border border-[#1E314F] text-[#8EA2C6] hover:text-[#EF4444] transition-colors cursor-pointer"
              title="Sign Out of Session"
              aria-label="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Sub-Header: Breadcrumbs, View Title & Quick Actions */}
      <div className="px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 bg-[#080F1D]/60">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#8EA2C6] mb-0.5">
            <span>SURAKSHA</span>
            <ChevronRight className="w-3 h-3 text-[#1E314F]" />
            <span className="text-[#45C8E8] font-semibold">{current.title}</span>
          </div>
          <h1 className="text-base sm:text-lg font-bold text-[#F8FAFC] tracking-tight">
            {current.title}
          </h1>
          <p className="text-[11px] text-[#8EA2C6]">{current.subtitle}</p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {activeTab !== 'social-monitoring' && activeTab !== 'app-monitoring' && (
            <div className="hidden sm:flex items-center gap-1.5">
              <button
                onClick={() => setActiveTab('social-monitoring')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#111D30] hover:bg-[#16253D] text-[#F8FAFC] text-xs font-medium border border-[#1E314F] hover:border-[#9B8AFB]/40 transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#9B8AFB]" />
                <span>Inspect Social</span>
              </button>
              <button
                onClick={() => setActiveTab('app-monitoring')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#111D30] hover:bg-[#16253D] text-[#F8FAFC] text-xs font-medium border border-[#1E314F] hover:border-[#45C8E8]/40 transition-all cursor-pointer"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-[#45C8E8]" />
                <span>Inspect App</span>
              </button>
            </div>
          )}

          {/* Export Findings CSV */}
          <button
            onClick={() => exportCandidatesToCSV(candidates, brandProfile.brandName)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#45C8E8] hover:bg-[#38B2D0] text-[#080F1D] text-xs font-semibold shadow-sm transition-all cursor-pointer"
            title="Download CSV dossier of all findings"
          >
            <Download className="w-3.5 h-3.5 text-[#080F1D]" />
            <span>Export CSV</span>
          </button>

          {onNavigateHome && (
            <button
              onClick={onNavigateHome}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#111D30] hover:bg-[#16253D] text-[#8EA2C6] hover:text-[#F8FAFC] text-xs font-medium border border-[#1E314F] transition-colors cursor-pointer"
              title="Return to Public Landing Page"
            >
              <Globe className="w-3 h-3 text-[#45C8E8]" />
              <span>Public Portal</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
