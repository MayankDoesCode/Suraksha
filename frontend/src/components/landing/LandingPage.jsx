import React from 'react';
import {
  Shield,
  ArrowRight,
  Crosshair,
  Lock,
  Cpu,
  Layers,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Database,
  Smartphone,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import LandingNav from './LandingNav';
import ThreatNetworkCanvas from './ThreatNetworkCanvas';
import CapabilitiesSection from './CapabilitiesSection';
import ProductPreviewSection from './ProductPreviewSection';
import LandingFooter from './LandingFooter';

export default function LandingPage({ onLaunchDashboard }) {
  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-cyber-darkest text-cyber-textMain select-none flex flex-col font-sans">
      {/* 1. Header Navigation */}
      <LandingNav onLaunchDashboard={onLaunchDashboard} />

      {/* 2. Hero Section */}
      <section className="relative pt-12 pb-24 lg:pt-20 lg:pb-32 overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-cyber-accent/5 rounded-full blur-[160px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Hero Content (7 Cols) */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              {/* Top Security Pill */}
              <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full border border-cyber-accent/30 bg-cyber-accent/5 text-cyber-accent font-mono text-xs">
                <span className="w-2 h-2 rounded-full bg-cyber-accent animate-pulse" />
                <span className="font-semibold tracking-wider uppercase">
                  Digital Risk Protection Platform
                </span>
                <span className="text-cyber-border hidden sm:inline">•</span>
                <span className="text-cyber-textMuted hidden sm:inline font-mono">
                  Autonomous Intelligence
                </span>
              </div>

              {/* Main Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.1] font-mono">
                See the Threat Before It Becomes a{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyber-accent via-cyan-400 to-blue-500">
                  Breach.
                </span>
              </h1>

              {/* Supporting Copy */}
              <p className="text-base sm:text-lg text-cyber-textMuted leading-relaxed max-w-2xl mx-auto lg:mx-0">
                Detect potential digital impersonation, copycat mobile applications, and unauthorized brand assets across external digital ecosystems — investigated through explainable mathematical scoring and verified ground truth.
              </p>

              {/* CTAs */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                <button
                  onClick={onLaunchDashboard}
                  className="w-full sm:w-auto px-8 py-4 rounded-xl bg-cyber-accent text-cyber-darkest font-mono font-bold text-sm uppercase tracking-wider shadow-glow hover:bg-cyber-accentHover transition-all flex items-center justify-center gap-2.5 active:scale-95 group"
                >
                  <span>Launch Platform</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </button>

                <button
                  onClick={() => scrollToSection('capabilities')}
                  className="w-full sm:w-auto px-6 py-4 rounded-xl bg-cyber-surface/60 border border-cyber-border text-white font-mono text-xs tracking-wider uppercase hover:border-cyber-accent/40 hover:bg-cyber-surface transition-all flex items-center justify-center gap-2"
                >
                  <span>Explore Capabilities</span>
                  <ChevronDown className="w-4 h-4 text-cyber-textMuted" />
                </button>
              </div>

              {/* Verified Trust Badges */}
              <div className="pt-6 border-t border-cyber-border/70 grid grid-cols-2 sm:grid-cols-3 gap-4 text-[11px] font-mono text-cyber-textMuted">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyber-emerald shrink-0" />
                  <span>Zero-Hallucination Scoring</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyber-accent shrink-0" />
                  <span>Live Apple iTunes API</span>
                </div>
                <div className="flex items-center gap-2 col-span-2 sm:col-span-1">
                  <CheckCircle2 className="w-4 h-4 text-cyber-emerald shrink-0" />
                  <span>Ground Truth Whitelist</span>
                </div>
              </div>
            </div>

            {/* Right Interactive Threat Canvas (5 Cols) */}
            <div className="lg:col-span-5 h-[460px] sm:h-[500px] w-full">
              <ThreatNetworkCanvas />
            </div>
          </div>
        </div>
      </section>

      {/* 3. Real-Time Telemetry Bar */}
      <section className="border-y border-cyber-border bg-cyber-dark/40 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center md:text-left">
            <div className="space-y-1">
              <div className="text-[11px] font-mono text-cyber-textMuted uppercase tracking-wider">
                External Ingestion
              </div>
              <div className="text-sm sm:text-base font-bold text-white font-mono flex items-center justify-center md:justify-start gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyber-accent animate-pulse" />
                Apple Store Search API
              </div>
              <div className="text-[10px] text-cyber-accent font-mono">Live iOS Store Metadata</div>
            </div>

            <div className="space-y-1">
              <div className="text-[11px] font-mono text-cyber-textMuted uppercase tracking-wider">
                Risk Engine
              </div>
              <div className="text-sm sm:text-base font-bold text-white font-mono">
                0.0 – 100.0 Bounded
              </div>
              <div className="text-[10px] text-cyber-emerald font-mono">Deterministic Weights</div>
            </div>

            <div className="space-y-1">
              <div className="text-[11px] font-mono text-cyber-textMuted uppercase tracking-wider">
                False Positive Rate
              </div>
              <div className="text-sm sm:text-base font-bold text-white font-mono">
                0% On Whitelisted Assets
              </div>
              <div className="text-[10px] text-cyber-emerald font-mono">Exact Match Exclusion</div>
            </div>

            <div className="space-y-1">
              <div className="text-[11px] font-mono text-cyber-textMuted uppercase tracking-wider">
                Analyst Workflow
              </div>
              <div className="text-sm sm:text-base font-bold text-white font-mono">
                5-Stage Triage Cycle
              </div>
              <div className="text-[10px] text-cyber-amber font-mono">Audited State Machine</div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Core Capabilities Section */}
      <CapabilitiesSection onLaunchDashboard={onLaunchDashboard} />

      {/* 5. End-to-End Threat Architecture Pipeline */}
      <section id="architecture" className="py-24 relative border-t border-cyber-border/60 bg-cyber-dark/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyber-accent/30 bg-cyber-accent/5 text-cyber-accent font-mono text-[11px] uppercase tracking-wider mb-4">
              <Cpu className="w-3.5 h-3.5" />
              End-to-End Pipeline
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white font-mono">
              From Ingestion to <span className="text-cyber-accent">Mitigation</span>
            </h2>
            <p className="mt-4 text-base text-cyber-textMuted leading-relaxed">
              SURAKSHA executes a verifiable 5-step detection lifecycle for every candidate encountered in external digital channels.
            </p>
          </div>

          {/* Architecture Pipeline Steps */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {[
              {
                step: '01',
                title: 'Ground Truth Whitelist',
                desc: 'Organization registers verified domains, social handles, bundle IDs, and publisher signatures.',
                tag: 'ASSET WHITELIST',
              },
              {
                step: '02',
                title: 'Authorized Ingestion',
                desc: 'Backend queries live ecosystem APIs (Apple iTunes API) using authorized public endpoints.',
                tag: 'LIVE FEED',
              },
              {
                step: '03',
                title: 'Exclusion Pipeline',
                desc: 'Exact matches against verified package IDs are identified and safely excluded from threat generation.',
                tag: 'ZERO-FP SHIELD',
              },
              {
                step: '04',
                title: 'Deterministic Scoring',
                desc: 'Multi-signal mathematical evaluation bounds risk from 0.0 to 100.0 without LLM hallucination.',
                tag: 'MATH BOUNDING',
              },
              {
                step: '05',
                title: 'Triage & Deduplication',
                desc: 'Persists findings with raw evidence. Deduplication locks prevent repeat-scan duplicate findings.',
                tag: 'PERSISTED AUDIT',
              },
            ].map((st, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-cyber-border bg-cyber-darkest p-5 relative space-y-3 flex flex-col justify-between hover:border-cyber-accent/40 transition-all hover:shadow-glow"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold font-mono text-cyber-accent/70">
                      {st.step}
                    </span>
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-cyber-surface border border-cyber-border text-cyber-textMuted">
                      {st.tag}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-white font-mono mt-3">
                    {st.title}
                  </h3>
                  <p className="text-xs text-cyber-textMuted leading-relaxed mt-2">
                    {st.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Product Preview Section */}
      <ProductPreviewSection onLaunchDashboard={onLaunchDashboard} />

      {/* 7. Deterministic Scoring Breakdown Section */}
      <section id="scoring" className="py-24 relative border-t border-cyber-border/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-6 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyber-accent/30 bg-cyber-accent/5 text-cyber-accent font-mono text-[11px] uppercase tracking-wider">
                <Shield className="w-3.5 h-3.5" />
                Mathematical Explainability
              </div>

              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white font-mono">
                Why Deterministic Scoring Beats <span className="text-cyber-accent">Generative Guesses</span>
              </h2>

              <p className="text-sm sm:text-base text-cyber-textMuted leading-relaxed">
                In critical cybersecurity operations, false accusations destroy developer trust and hallucinations distract analyst teams. SURAKSHA guarantees explainable scoring weights:
              </p>

              <div className="space-y-3 font-mono text-xs">
                <div className="p-3.5 rounded-xl border border-cyber-border bg-cyber-dark/80 flex items-center justify-between">
                  <span className="text-white">Title & Keyword Levenshtein Distance</span>
                  <span className="text-cyber-accent font-bold">40% Weight</span>
                </div>
                <div className="p-3.5 rounded-xl border border-cyber-border bg-cyber-dark/80 flex items-center justify-between">
                  <span className="text-white">Publisher Name & Authority Mismatch</span>
                  <span className="text-cyber-accent font-bold">35% Weight</span>
                </div>
                <div className="p-3.5 rounded-xl border border-cyber-border bg-cyber-dark/80 flex items-center justify-between">
                  <span className="text-white">Mobile Package ID Entropy & Divergence</span>
                  <span className="text-cyber-accent font-bold">15% Weight</span>
                </div>
                <div className="p-3.5 rounded-xl border border-cyber-border bg-cyber-dark/80 flex items-center justify-between">
                  <span className="text-white">High-Risk Suspicious Keywords</span>
                  <span className="text-cyber-accent font-bold">10% Weight</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="rounded-2xl border border-cyber-border bg-cyber-darkest p-6 space-y-4 font-mono text-xs shadow-2xl">
                <div className="flex items-center justify-between border-b border-cyber-border pb-3 text-cyber-textMuted">
                  <span>SCORING AUDIT MATRIX</span>
                  <span className="text-cyber-emerald">BOUNDED 0.0 - 100.0</span>
                </div>

                <div className="space-y-3 text-[11px]">
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-cyber-surface/60 border border-cyber-border">
                    <span className="text-cyber-emerald">LOW RISK (0.0 – 39.9)</span>
                    <span className="text-cyber-textMuted">Marginal keyword coincidence</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-cyber-surface/60 border border-cyber-border">
                    <span className="text-cyber-amber">MEDIUM RISK (40.0 – 69.9)</span>
                    <span className="text-cyber-textMuted">Possible lookalike, needs evaluation</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-cyber-surface/60 border border-cyber-border">
                    <span className="text-cyber-rose">HIGH RISK (70.0 – 89.9)</span>
                    <span className="text-cyber-textMuted">Publisher mismatch with severe brand match</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-cyber-surface/60 border border-rose-500/40 bg-rose-500/10">
                    <span className="text-rose-400 font-bold">CRITICAL RISK (90.0 – 100.0)</span>
                    <span className="text-rose-300">Blatant spoofing with fraudulent claims</span>
                  </div>
                </div>

                <div className="pt-2 text-[10px] text-cyber-textMuted leading-relaxed">
                  * Note: Real discovered candidates are initially marked <code>Potential Risk / Needs Review</code> until an analyst marks them <code>CONFIRMED_THREAT</code>.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Footer */}
      <LandingFooter onLaunchDashboard={onLaunchDashboard} />
    </div>
  );
}
