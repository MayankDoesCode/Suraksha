import React from 'react';
import {
  ShieldCheck,
  Smartphone,
  Cpu,
  Search,
  CheckCircle2,
  Lock,
  Database,
  ExternalLink,
  Sliders,
  Layers,
  ArrowRight
} from 'lucide-react';

export default function CapabilitiesSection({ onLaunchDashboard }) {
  const capabilities = [
    {
      id: 'ground-truth',
      icon: ShieldCheck,
      badge: 'FOUNDATION',
      badgeColor: 'border-cyber-emerald/40 text-cyber-emerald bg-cyber-emerald/10',
      title: 'Brand Identity Ground Truth',
      tagline: 'Eliminating false positives through immutable asset whitelisting',
      description:
        'Registers verified organizational assets — official domain roots, social handles, mobile application package IDs (e.g., com.company.app), and authorized developer signatures. Incoming candidates are matched deterministically; official assets are excluded prior to threat persistence.',
      points: [
        'Relational asset whitelist for multi-channel brand coverage',
        'Strict regex syntax validation for domains, handles, and bundle IDs',
        'Automated exact-match bypass preventing self-inflicted incident alerts',
      ],
      codeSnippet: `// Official Asset Exclusion Pipeline
if candidate.package_id in brand.verified_app_ids:
    return Excluded(reason="Verified official mobile package")`,
    },
    {
      id: 'app-store',
      icon: Smartphone,
      badge: 'LIVE INGESTION',
      badgeColor: 'border-cyber-accent/40 text-cyber-accent bg-cyber-accent/10',
      title: 'App-Store Threat Intelligence',
      tagline: 'Authorized public API ingestion with real-time metadata extraction',
      description:
        'Connects to Apple\'s official iTunes Search API to discover rogue, lookalike, or unapproved mobile app listings impersonating corporate brands. Extracts live bundle IDs, seller names, store URLs, and release dates without web scraping or bot evasion.',
      points: [
        'Live Apple App Store API integration (US, global store codes)',
        'Unauthorized publisher mismatch detection',
        'Direct links to apps.apple.com with real observation timestamps',
      ],
      codeSnippet: `// Apple iTunes API Data Extraction
GET https://itunes.apple.com/search?term=Brand&entity=software
Response: { bundleId, sellerName, trackViewUrl, version }`,
    },
    {
      id: 'risk-engine',
      icon: Cpu,
      badge: 'BOUNDED SCORING',
      badgeColor: 'border-cyber-amber/40 text-cyber-amber bg-cyber-amber/10',
      title: 'Explainable Risk Scoring Engine',
      tagline: 'Deterministic mathematical factors replacing opaque black-box opacity',
      description:
        'Computes threat scores on a bounded 0.0 – 100.0 scale using deterministic mathematical factors: normalized Levenshtein string distances, token set similarity ratios, package ID entropy, and developer signature deviations. Every score includes a clear audit breakdown.',
      points: [
        'Mathematically bounded: LOW (0-39), MED (40-69), HIGH (70-89), CRITICAL (90-100)',
        'Externally discovered candidates default to "Potential Risk / Needs Review"',
        'Zero generative LLM guesswork in risk calculations',
      ],
      codeSnippet: `// Deterministic Multi-Signal Scoring
score = (title_sim * 0.40) + (publisher_mismatch * 0.35) 
      + (package_mismatch * 0.15) + (keyword_weight * 0.10)
severity = map_tier(bounded(score, 0.0, 100.0))`,
    },
    {
      id: 'triage',
      icon: Search,
      badge: 'ANALYST OPERATIONS',
      badgeColor: 'border-cyber-rose/40 text-cyber-rose bg-cyber-rose/10',
      title: 'Evidence-Led Investigations & Triage',
      tagline: '5-stage lifecycle state machine with relational proof preservation',
      description:
        'Centralizes all detected candidates with raw telemetry payloads, observation timestamps, and signal scores. Analysts investigate and progress findings through audited states with instant database persistence and repeat-scan deduplication locks.',
      points: [
        'Lifecycle states: NEW ➔ UNDER_INVESTIGATION ➔ CONFIRMED_THREAT / FALSE_POSITIVE ➔ RESOLVED',
        'Relational evidence records preserved across investigations',
        'Repeat scan deduplication prevents alert noise and database bloat',
      ],
      codeSnippet: `// Analyst Triage State Transition
POST /api/v1/findings/:id/status
Payload: { "review_status": "CONFIRMED_THREAT", "notes": "Spoofed publisher" }`,
    },
  ];

  return (
    <section id="capabilities" className="py-24 relative border-t border-cyan-500/20 bg-[#040816]/30 backdrop-blur-xs">
      {/* Background radial highlight */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-3/4 h-96 bg-cyber-accent/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyber-accent/30 bg-cyber-accent/5 text-cyber-accent font-mono text-[11px] uppercase tracking-wider mb-4">
            <Layers className="w-3.5 h-3.5" />
            Core Architectural Capabilities
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white font-mono">
            Engineered for <span className="text-cyber-accent">Deterministic</span> Threat Detection
          </h2>
          <p className="mt-4 text-base text-cyber-textMuted leading-relaxed">
            SURAKSHA rejects non-deterministic black-box hallucinations. Every detection is mathematically calculated, validated against organizational ground truth, and backed by verifiable ecosystem records.
          </p>
        </div>

        {/* 4 Capability Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {capabilities.map((cap) => {
            const Icon = cap.icon;
            return (
              <div
                key={cap.id}
                className="group relative rounded-2xl border border-cyber-border bg-cyber-dark/80 p-8 hover:border-cyber-accent/40 transition-all duration-300 hover:shadow-glow flex flex-col justify-between"
              >
                <div>
                  {/* Card top badge */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-12 h-12 rounded-xl bg-cyber-surface border border-cyber-border flex items-center justify-center text-cyber-accent group-hover:border-cyber-accent/50 transition-colors">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className={`px-2.5 py-1 rounded text-[10px] font-mono tracking-wider font-semibold border ${cap.badgeColor}`}>
                      {cap.badge}
                    </span>
                  </div>

                  {/* Title & Tagline */}
                  <h3 className="text-xl font-bold text-white font-mono tracking-wide mb-2 group-hover:text-cyber-accent transition-colors">
                    {cap.title}
                  </h3>
                  <div className="text-xs font-mono text-cyber-accent/90 mb-4">
                    {cap.tagline}
                  </div>
                  <p className="text-sm text-cyber-textMuted leading-relaxed mb-6">
                    {cap.description}
                  </p>

                  {/* Bullet points */}
                  <ul className="space-y-2.5 mb-6">
                    {cap.points.map((pt, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-300">
                        <CheckCircle2 className="w-4 h-4 text-cyber-emerald shrink-0 mt-0.5" />
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Cyber Code/Architecture Box */}
                <div className="mt-4 rounded-xl bg-cyber-darkest border border-cyber-border/80 p-3.5 font-mono text-[11px] text-cyber-textMuted overflow-x-auto select-all">
                  <pre className="text-cyber-accent/80 font-mono text-[11px] leading-tight">
                    {cap.codeSnippet}
                  </pre>
                </div>
              </div>
            );
          })}
        </div>

        {/* Mid-page Launch CTA Banner */}
        <div className="mt-16 rounded-2xl border border-cyber-accent/30 bg-gradient-to-r from-cyber-darkest via-cyber-surface/60 to-cyber-darkest p-8 sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-glow">
          <div className="max-w-xl text-center sm:text-left">
            <h4 className="text-xl sm:text-2xl font-bold text-white font-mono">
              Ready to protect your brand identity?
            </h4>
            <p className="mt-2 text-xs sm:text-sm text-cyber-textMuted">
              Add your verified domains and mobile app package IDs to run live Apple App Store detection in seconds.
            </p>
          </div>
          <button
            onClick={onLaunchDashboard}
            className="px-6 py-3.5 rounded-xl bg-cyber-accent text-cyber-darkest font-semibold text-xs tracking-wider uppercase font-mono shadow-glow hover:bg-cyber-accentHover transition-all flex items-center gap-2 shrink-0 active:scale-95"
          >
            <span>Launch Platform</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
