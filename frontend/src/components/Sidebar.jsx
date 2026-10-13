import React from 'react';
import {
  Shield,
  Layers,
  Globe,
  Smartphone,
  Share2,
  Crosshair,
  Activity,
  ChevronRight,
  Database,
  Lock
} from 'lucide-react';

export default function Sidebar({ currentView, setCurrentView, health }) {
  const navItems = [
    {
      id: 'brands',
      label: 'Brand Profiles',
      icon: Shield,
      phase: 'Core',
      active: true,
      description: 'Identity parameters & verified assets',
    },
    {
      id: 'social',
      label: 'Social Impersonation',
      icon: Share2,
      phase: 'Engine',
      active: true,
      description: 'Fake profiles & rogue accounts',
    },
    {
      id: 'apps',
      label: 'Mobile App Guard',
      icon: Smartphone,
      phase: 'Engine',
      active: true,
      description: 'Impersonating app listings',
    },
    {
      id: 'threats',
      label: 'Threat Intelligence',
      icon: Crosshair,
      phase: 'Live',
      active: true,
      description: 'Central findings database & triage',
    },
    {
      id: 'domains',
      label: 'Domain / URL Watch',
      icon: Globe,
      phase: 'Planned',
      active: false,
      description: 'Lookalike domains & typosquatting',
    },
    {
      id: 'campaigns',
      label: 'Threat Campaigns',
      icon: Layers,
      phase: 'Planned',
      active: false,
      description: 'Cross-platform correlated actors',
    },
    {
      id: 'diagnostics',
      label: 'System Diagnostics',
      icon: Activity,
      phase: 'Active',
      active: true,
      description: 'Core API & database telemetry',
    },
  ];

  return (
    <aside className="w-72 bg-cyber-dark border-r border-cyber-border flex flex-col justify-between shrink-0 select-none">
      <div>
        {/* Brand Header */}
        <div className="p-6 border-b border-cyber-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-cyber-accent/10 border border-cyber-accent/40 flex items-center justify-center text-cyber-accent shadow-glow">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="text-base font-bold tracking-wider text-white flex items-center gap-1.5 font-mono">
                SURAKSHA
              </div>
              <div className="text-[11px] text-cyber-textMuted uppercase tracking-widest font-mono">
                Detect. Verify. Protect.
              </div>
            </div>
          </div>
          
          <div className="mt-4 px-2.5 py-1.5 rounded bg-cyber-surface border border-cyber-border flex items-center justify-between">
            <span className="text-[11px] font-mono text-cyber-textMuted">ENGINE CORE</span>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-cyber-accent">
              <span className="w-1.5 h-1.5 rounded-full bg-cyber-accent animate-pulse"></span>
              v1.0-FOUNDATION
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-4 space-y-1.5">
          <div className="px-3 pb-2 text-[10px] font-mono uppercase tracking-wider text-cyber-textMuted">
            Platform Capabilities
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isSelected = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all group ${
                  isSelected
                    ? 'bg-cyber-surface text-white border border-cyber-accent/40 shadow-sm'
                    : 'text-cyber-textMuted hover:text-white hover:bg-cyber-surface/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isSelected
                        ? 'text-cyber-accent'
                        : item.active
                        ? 'text-cyber-textMuted group-hover:text-cyber-accent'
                        : 'text-slate-500'
                    }`}
                  />
                  <div className="text-left">
                    <div className="leading-tight">{item.label}</div>
                  </div>
                </div>

                {item.active ? (
                  isSelected ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-cyber-accent"></span>
                  ) : null
                ) : (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-slate-700 bg-slate-800/80 text-slate-400">
                    {item.phase}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-cyber-border">
        <div className="p-3 rounded-lg bg-cyber-surface border border-cyber-border space-y-2">
          <div className="flex items-center justify-between text-[11px] font-mono text-cyber-textMuted">
            <span className="flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-cyber-accent" /> DB STATUS
            </span>
            <span className={health?.database?.connected ? 'text-cyber-emerald' : 'text-cyber-rose'}>
              {health?.database?.connected ? 'CONNECTED' : 'OFFLINE'}
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] font-mono text-cyber-textMuted">
            <span className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-cyber-amber" /> ENVIRONMENT
            </span>
            <span className="text-white">LOCAL DEV</span>
          </div>
        </div>
        <div className="mt-3 text-center text-[10px] text-cyber-textMuted font-mono">
          SURAKSHA © 2026 • Detect. Verify. Protect.
        </div>
      </div>
    </aside>
  );
}
