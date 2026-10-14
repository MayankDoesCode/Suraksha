import React, { useState } from 'react';
import {
  Smartphone,
  Crosshair,
  Shield,
  Activity,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  Search,
  Filter
} from 'lucide-react';

export default function ProductPreviewSection({ onLaunchDashboard }) {
  const [activeTab, setActiveTab] = useState('apps');

  const tabs = [
    { id: 'apps', label: 'Mobile App Guard', icon: Smartphone, tag: 'LIVE PROVIDER' },
    { id: 'threats', label: 'Threat Explorer', icon: Crosshair, tag: '5-STAGE TRIAGE' },
    { id: 'ground-truth', label: 'Ground Truth Whitelist', icon: Shield, tag: 'ZERO-FP ENGINE' },
    { id: 'diagnostics', label: 'System Diagnostics', icon: Activity, tag: 'TELEMETRY' },
  ];

  return (
    <section id="preview" className="py-24 relative border-t border-[#1E314F] bg-[#080F1D]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#1E314F] bg-[#111D30] text-[#45C8E8] font-mono text-[11px] uppercase tracking-wider mb-4">
            <Search className="w-3.5 h-3.5" />
            Interactive Platform Preview
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white font-mono">
            Designed for <span className="text-[#45C8E8]">Cybersecurity</span> Analysts
          </h2>
          <p className="mt-4 text-base text-[#8EA2C6] leading-relaxed">
            Preview the actual interface built to manage brand assets, trigger external ecosystem scans, inspect mathematically scored evidence, and execute triage workflows.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-10">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-mono tracking-wide transition-all ${
                  isActive
                    ? 'bg-[#111D30] border border-[#45C8E8] text-white shadow-card'
                    : 'bg-[#0E1726] border border-[#1E314F] text-[#8EA2C6] hover:text-white hover:border-[#45C8E8]/40'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-cyber-accent' : 'text-cyber-textMuted'}`} />
                <span>{tab.label}</span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                  isActive ? 'bg-cyber-accent/20 text-cyber-accent' : 'bg-cyber-border text-cyber-textMuted'
                }`}>
                  {tab.tag}
                </span>
              </button>
            );
          })}
        </div>

        {/* Interactive Mockup Container */}
        <div className="rounded-2xl border border-cyber-border bg-cyber-dark/90 shadow-2xl overflow-hidden backdrop-blur-xl">
          {/* Mock Browser Header */}
          <div className="h-11 px-4 border-b border-cyber-border bg-cyber-darkest/90 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
              <span className="ml-3 text-[11px] font-mono text-cyber-textMuted hidden sm:inline-block">
                suraksha.internal / platform / {activeTab}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-mono text-cyber-accent flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyber-accent animate-pulse" />
                WSGI API ACTIVE
              </span>
              <button
                onClick={onLaunchDashboard}
                className="text-[10px] font-mono text-cyber-accent hover:underline flex items-center gap-1"
              >
                Open Real UI <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Tab 1: Mobile App Guard Preview */}
          {activeTab === 'apps' && (
            <div className="p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-cyber-surface/60 border border-cyber-border">
                <div>
                  <div className="flex items-center gap-2 text-xs font-mono font-semibold text-white">
                    <span>TARGET BRAND: MICROSOFT CORP</span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-cyber-emerald/10 text-cyber-emerald border border-cyber-emerald/30">
                      3 VERIFIED ASSETS
                    </span>
                  </div>
                  <div className="text-[11px] text-cyber-textMuted mt-1">
                    Live scan targets: Apple iTunes Search API (entity: software)
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="px-3 py-1.5 rounded-lg bg-cyber-darkest border border-cyber-accent/40 text-[11px] font-mono text-cyber-accent flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyber-accent animate-pulse" />
                    APPLE APP STORE • OPERATIONAL
                  </div>
                  <button
                    onClick={onLaunchDashboard}
                    className="px-4 py-2 rounded-lg bg-cyber-accent text-cyber-darkest font-mono text-xs font-semibold flex items-center gap-1.5 hover:bg-cyber-accentHover"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Run Live Scan
                  </button>
                </div>
              </div>

              {/* Exclusion callout */}
              <div className="p-4 rounded-xl bg-cyber-emerald/5 border border-cyber-emerald/30 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-cyber-emerald shrink-0 mt-0.5" />
                <div className="text-xs">
                  <div className="font-semibold text-cyber-emerald font-mono">
                    Official Whitelist Exclusion Pipeline Active
                  </div>
                  <div className="text-slate-300 mt-1 leading-relaxed">
                    Exact matches against verified bundle identifier <code className="px-1.5 py-0.5 rounded bg-cyber-darkest text-cyber-accent font-mono text-[11px]">com.microsoft.Office.Outlook</code> are verified and excluded with zero threat records generated.
                  </div>
                </div>
              </div>

              {/* Sample Detected Candidate */}
              <div className="rounded-xl border border-cyber-border bg-cyber-darkest/70 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-cyber-surface border border-cyber-rose/30 flex items-center justify-center text-cyber-rose">
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white font-mono">
                        Outlook Mail & Calendar Assistant Pro
                      </div>
                      <div className="text-[11px] text-cyber-textMuted font-mono">
                        Publisher: Unauthorized Dev LLC • Bundle: com.mailassist.outlookpro
                      </div>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded text-[11px] font-mono font-bold bg-cyber-rose/15 text-cyber-rose border border-cyber-rose/30">
                    RISK SCORE: 88.5 • HIGH
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-cyber-border/60 text-[11px] font-mono text-cyber-textMuted">
                  <div>Title Similarity: <span className="text-white">82%</span></div>
                  <div>Publisher Mismatch: <span className="text-cyber-rose">FLAGGED</span></div>
                  <div>Source: <span className="text-cyber-accent">itunes_app_store</span></div>
                  <div>Status: <span className="text-cyber-amber">NEEDS REVIEW</span></div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Threat Explorer Preview */}
          {activeTab === 'threats' && (
            <div className="p-6 sm:p-8 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-cyber-surface/60 border border-cyber-border">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-lg text-xs font-mono bg-cyber-darkest text-white border border-cyber-border">
                    ALL FINDINGS (12)
                  </span>
                  <span className="px-3 py-1 rounded-lg text-xs font-mono bg-cyber-accent/10 text-cyber-accent border border-cyber-accent/30">
                    LIVE EXTERNAL PROVIDERS
                  </span>
                  <span className="px-3 py-1 rounded-lg text-xs font-mono bg-cyber-surface text-cyber-textMuted border border-cyber-border">
                    ANALYST SAMPLES
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono text-cyber-textMuted">
                  <Filter className="w-3.5 h-3.5" />
                  <span>Severity Filter: CRITICAL, HIGH, MEDIUM</span>
                </div>
              </div>

              {/* Findings Table Preview */}
              <div className="space-y-3">
                {[
                  {
                    title: 'MicroSoft-Support-Connect',
                    type: 'iOS App Listing',
                    source: 'itunes_app_store',
                    score: 92.0,
                    severity: 'CRITICAL',
                    status: 'UNDER_INVESTIGATION',
                    color: 'text-rose-400 border-rose-500/30 bg-rose-500/10'
                  },
                  {
                    title: 'Office Cloud Authenticator Sync',
                    type: 'Mobile Package',
                    source: 'itunes_app_store',
                    score: 78.4,
                    severity: 'HIGH',
                    status: 'NEW',
                    color: 'text-amber-400 border-amber-500/30 bg-amber-500/10'
                  },
                  {
                    title: '@micros0ft_security_desk',
                    type: 'Social Handle',
                    source: 'analyst_submission',
                    score: 84.0,
                    severity: 'HIGH',
                    status: 'CONFIRMED_THREAT',
                    color: 'text-cyber-accent border-cyber-accent/30 bg-cyber-accent/10'
                  }
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-cyber-border bg-cyber-darkest/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-cyber-accent/30 transition-all"
                  >
                    <div>
                      <div className="text-xs font-bold text-white font-mono">
                        {item.title}
                      </div>
                      <div className="text-[11px] text-cyber-textMuted font-mono flex items-center gap-3 mt-1">
                        <span>{item.type}</span>
                        <span>•</span>
                        <span className="text-cyber-accent">{item.source}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 font-mono text-xs">
                      <span className={`px-2.5 py-0.5 rounded border text-[11px] font-bold ${item.color}`}>
                        {item.severity} ({item.score})
                      </span>
                      <span className="px-2.5 py-0.5 rounded bg-cyber-surface border border-cyber-border text-white text-[11px]">
                        {item.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 3: Ground Truth Whitelist Preview */}
          {activeTab === 'ground-truth' && (
            <div className="p-6 sm:p-8 space-y-6">
              <div className="p-4 rounded-xl bg-cyber-surface/60 border border-cyber-border flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-white font-mono">
                    Brand Ground Truth Configuration
                  </div>
                  <div className="text-xs text-cyber-textMuted mt-0.5">
                    Authorized corporate perimeter assets whitelisted for exclusion
                  </div>
                </div>
                <button
                  onClick={onLaunchDashboard}
                  className="px-3 py-1.5 rounded-lg bg-cyber-accent/10 border border-cyber-accent/40 text-cyber-accent font-mono text-xs hover:bg-cyber-accent/20"
                >
                  + Add Brand Asset
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border border-cyber-border bg-cyber-darkest/70 space-y-2">
                  <div className="text-[11px] font-mono text-cyber-textMuted">VERIFIED DOMAINS</div>
                  <div className="text-xs font-mono text-white space-y-1">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-cyber-emerald" />
                      microsoft.com
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-cyber-emerald" />
                      office.com
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-cyber-border bg-cyber-darkest/70 space-y-2">
                  <div className="text-[11px] font-mono text-cyber-textMuted">OFFICIAL APP BUNDLE IDS</div>
                  <div className="text-xs font-mono text-white space-y-1">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-cyber-emerald" />
                      com.microsoft.Office.Outlook
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-cyber-emerald" />
                      com.microsoft.teams
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-cyber-border bg-cyber-darkest/70 space-y-2">
                  <div className="text-[11px] font-mono text-cyber-textMuted">OFFICIAL SOCIAL HANDLES</div>
                  <div className="text-xs font-mono text-white space-y-1">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-cyber-emerald" />
                      @Microsoft
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-cyber-emerald" />
                      @MSFT365
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: System Diagnostics Preview */}
          {activeTab === 'diagnostics' && (
            <div className="p-6 sm:p-8 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border border-cyber-emerald/30 bg-cyber-emerald/5 space-y-1">
                  <div className="text-[11px] font-mono text-cyber-emerald">API SERVER HEALTH</div>
                  <div className="text-lg font-bold text-white font-mono">200 OK • HEALTHY</div>
                  <div className="text-[10px] text-cyber-textMuted font-mono">Flask 3.1 WSGI / Gunicorn</div>
                </div>

                <div className="p-4 rounded-xl border border-cyber-accent/30 bg-cyber-accent/5 space-y-1">
                  <div className="text-[11px] font-mono text-cyber-accent">DATABASE PERSISTENCE</div>
                  <div className="text-lg font-bold text-white font-mono">POSTGRESQL CONNECTED</div>
                  <div className="text-[10px] text-cyber-textMuted font-mono">Alembic Schema v002 Head</div>
                </div>

                <div className="p-4 rounded-xl border border-cyber-border bg-cyber-darkest/60 space-y-1">
                  <div className="text-[11px] font-mono text-cyber-textMuted">CONNECTOR REGISTRY</div>
                  <div className="text-lg font-bold text-white font-mono">APPLE STORE: ACTIVE</div>
                  <div className="text-[10px] text-cyber-textMuted font-mono">Zero Secret Exposure</div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-cyber-darkest border border-cyber-border font-mono text-[11px] text-cyber-textMuted">
                <div>GET /api/v1/health</div>
                <div className="text-cyber-accent mt-1">
                  &#123; "status": "healthy", "service": "SURAKSHA API", "version": "1.0.0", "database": &#123; "connected": true &#125; &#125;
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom CTA */}
        <div className="mt-12 text-center">
          <button
            onClick={onLaunchDashboard}
            className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-cyber-surface border border-cyber-accent/40 text-cyber-accent font-mono text-xs uppercase tracking-wider font-semibold hover:bg-cyber-accent hover:text-cyber-darkest transition-all shadow-glow active:scale-95"
          >
            <span>Open Interactive Dashboard Now</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
