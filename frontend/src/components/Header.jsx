import React from 'react';
import { Plus, RefreshCw, Activity, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function Header({
  currentView,
  health,
  healthLoading,
  onRefresh,
  onOpenCreateModal
}) {
  const titles = {
    brands: {
      title: 'Brand Identity Management',
      subtitle: 'Verified organizational assets, domains, social accounts & package signatures',
    },
    social: {
      title: 'Social Impersonation Watch (Planned)',
      subtitle: 'Phase 2 detection module for rogue profiles, bio cloning, and spoofed accounts',
    },
    domains: {
      title: 'Domain & Lookalike Watch (Planned)',
      subtitle: 'Phase 2 detection module for typosquatting, IDN homoglyphs, and phishing portals',
    },
    apps: {
      title: 'Mobile App Guard (Planned)',
      subtitle: 'Phase 2 detection module for fraudulent stores, rogue APKs, and repackaged packages',
    },
    campaigns: {
      title: 'Threat Campaigns (Planned)',
      subtitle: 'Phase 2 correlation engine tracking cross-vector adversary networks',
    },
    diagnostics: {
      title: 'System & Database Telemetry',
      subtitle: 'Live API health, database latency, schema migration state & environment variables',
    },
  };

  const currentInfo = titles[currentView] || titles.brands;
  const isHealthy = health?.status === 'healthy' && health?.database?.connected;

  return (
    <header className="h-20 bg-cyber-dark/80 backdrop-blur-md border-b border-cyber-border px-8 flex items-center justify-between shrink-0">
      <div>
        <h1 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
          {currentInfo.title}
        </h1>
        <p className="text-xs text-cyber-textMuted mt-0.5">
          {currentInfo.subtitle}
        </p>
      </div>

      <div className="flex items-center gap-4">
        {/* Health Indicator Badge */}
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-cyber-surface border border-cyber-border">
          <span className="relative flex h-2.5 w-2.5">
            {isHealthy ? (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyber-emerald opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyber-emerald"></span>
              </>
            ) : (
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyber-rose"></span>
            )}
          </span>
          <span className="text-xs font-mono font-medium">
            {healthLoading ? (
              <span className="text-cyber-textMuted">CHECKING...</span>
            ) : isHealthy ? (
              <span className="text-cyber-emerald">OPERATIONAL</span>
            ) : (
              <span className="text-cyber-rose">API UNREACHABLE</span>
            )}
          </span>
        </div>

        {/* Refresh Action */}
        <button
          onClick={onRefresh}
          title="Refresh Data"
          className="p-2 rounded-lg bg-cyber-surface border border-cyber-border text-cyber-textMuted hover:text-white hover:border-cyber-accent/40 transition-all"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        {/* Primary Action Button */}
        {currentView === 'brands' && (
          <button
            onClick={onOpenCreateModal}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyber-accent text-cyber-darkest font-semibold text-xs tracking-wide hover:bg-cyber-accentHover transition-all shadow-glow hover:shadow-cyan-400/30"
          >
            <Plus className="w-4 h-4" />
            REGISTER BRAND
          </button>
        )}
      </div>
    </header>
  );
}
