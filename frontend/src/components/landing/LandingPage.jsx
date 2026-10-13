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
  ChevronDown,
  Sparkles,
  Share2
} from 'lucide-react';
import LandingNav from './LandingNav';
import DigitalGlobeCanvas from './DigitalGlobeCanvas';
import ThreatNetworkCanvas from './ThreatNetworkCanvas';
import CapabilitiesSection from './CapabilitiesSection';
import ProductPreviewSection from './ProductPreviewSection';
import LandingFooter from './LandingFooter';

export default function LandingPage({ onLaunchDashboard }) {
  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const handleLaunch = (options) => {
    if (onLaunchDashboard) {
      onLaunchDashboard(options || { tab: 'overview' });
    }
  };

  return (
    <div className="relative min-h-screen bg-[#030712] text-cyber-textMain select-none flex flex-col font-sans overflow-x-hidden">
      {/* ========================================================= */}
      {/* SHARED FULL-PAGE CONTINUOUS CYBERSECURITY BACKGROUND LAYER */}
      {/* Covers edge-to-edge across entire scroll (Hero to Footer)  */}
      {/* ========================================================= */}
      <div
        className="fixed inset-0 w-full h-full pointer-events-none z-0 overflow-hidden"
        aria-hidden="true"
      >
        {/* 1. Base High-Definition Digital Earth & Cyber Cosmos Image */}
        <div
          className="absolute inset-0 w-full h-full bg-cover bg-no-repeat bg-[center_top] sm:bg-[center_right] lg:bg-[85%_center] opacity-90 transition-all duration-700"
          style={{
            backgroundImage: "url('/cyber_hero_bg.jpg')",
          }}
        />

        {/* 2. Global Geometric Mesh Overlay across full page height */}
        <div className="absolute inset-0 w-full h-full bg-[radial-gradient(#0e1933_1px,transparent_1px)] [background-size:36px_36px] opacity-20" />

        {/* 3. Deep Navy Gradient Overlays protecting text contrast and separating globe */}
        {/* Left-to-right contrast gradient protecting headline and left column */}
        <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-[#030712] via-[#030712]/92 via-50% to-transparent sm:via-55% lg:via-50% lg:to-transparent" />
        {/* Vertical subtle vignette preserving depth */}
        <div className="absolute inset-0 w-full h-full bg-gradient-to-b from-[#030712]/60 via-transparent to-[#030712]/90" />

        {/* 4. Restrained Ambient Glows (no excessive neon bloom) */}
        <div
          className="absolute top-[20%] right-[15%] w-[420px] h-[420px] bg-cyan-500/10 rounded-full blur-[160px] pointer-events-none"
        />
        <div
          className="absolute top-[45%] right-[12%] w-[380px] h-[380px] bg-purple-600/8 rounded-full blur-[180px] pointer-events-none"
        />
      </div>

      {/* ========================================================= */}
      {/* FOREGROUND DOCUMENT CONTENT (relative z-10)               */}
      {/* ========================================================= */}
      <div className="relative z-10 flex flex-col flex-1 w-full">
        {/* 1. Header Navigation - Translucent glass allows background to flow through */}
        <LandingNav onLaunchDashboard={handleLaunch} />

        {/* 2. Full-Screen Hero Section */}
        <section className="relative min-h-[calc(100svh-5rem)] flex items-center justify-center py-8 sm:py-12 lg:py-16">
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-8 items-center w-full">
              {/* Left Hero Content: ~54% width (7 of 12 cols) */}
              <div className="lg:col-span-7 space-y-6 text-center lg:text-left z-10">
                {/* Eyebrow Label */}
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-cyan-500/20 bg-cyan-950/30 text-cyan-400 font-mono text-[11px] sm:text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(0,240,255,0.7)] animate-pulse" />
                  <span className="font-medium tracking-wider uppercase">
                    BRAND PROTECTION · THREAT INTELLIGENCE · AI POWERED
                  </span>
                </div>

                {/* Main Headline */}
                <h1 className="text-4xl sm:text-5xl lg:text-[52px] xl:text-[60px] font-extrabold tracking-tight leading-[1.08] max-w-[580px] mx-auto lg:mx-0">
                  <span className="block text-white">Protect Your Brand.</span>
                  <span className="block text-cyan-400 mt-1">Detect Threats</span>
                  <span className="block text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-300 mt-1">
                    Before They Spread.
                  </span>
                </h1>

                {/* Supporting Description */}
                <p className="text-base sm:text-lg text-slate-300/85 leading-relaxed max-w-[560px] mx-auto lg:mx-0 font-sans font-normal">
                  Suraksha helps you identify suspicious social profiles, assess potential impersonation risks, and support brand-protection investigations — all in one platform.
                </p>

                {/* CTAs */}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                  <button
                    onClick={() => handleLaunch({ tab: 'overview' })}
                    className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 via-cyan-400 to-blue-500 text-cyber-darkest font-mono font-bold text-xs sm:text-sm uppercase tracking-wider shadow-[0_0_20px_rgba(0,240,255,0.35)] hover:shadow-[0_0_30px_rgba(0,240,255,0.55)] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2.5 group cursor-pointer"
                    aria-label="Explore Threat Intelligence Dashboard"
                  >
                    <span>Explore Threat Intelligence</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </button>

                  <button
                    onClick={() => scrollToSection('capabilities')}
                    className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-[#0c1427]/80 border border-slate-700/60 text-slate-200 font-mono text-xs tracking-wider uppercase hover:border-cyan-500/40 hover:bg-[#111c38] hover:text-cyan-300 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    aria-label="Explore Capabilities"
                  >
                    <span>Explore Capabilities</span>
                    <ChevronDown className="w-4 h-4 text-cyan-400" />
                  </button>
                </div>

                {/* Verified Trust Badges */}
                <div className="pt-4 flex flex-wrap items-center justify-center lg:justify-start gap-x-6 gap-y-2 text-xs font-mono text-slate-400">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span>Zero-Hallucination Scoring</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span>Live Apple iTunes API</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Ground Truth Whitelist</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Clean visual space framing the Digital Earth Globe (5 of 12 cols, ~42-45% width) */}
              <div className="lg:col-span-5 w-full relative min-h-[320px] sm:min-h-[420px] lg:min-h-[500px] flex items-end justify-center lg:justify-end pointer-events-none">
                {/* Subtle, restrained floating live telemetry chip anchored at bottom right */}
                <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#040816]/70 backdrop-blur-md border border-cyan-500/20 shadow-xl text-[11px] font-mono text-slate-300 mb-4 lg:mb-8 pointer-events-auto">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />
                  <span>Global Risk Surface Monitoring Active</span>
                </div>
              </div>
            </div>
          </main>
        </section>

        {/* 3. Feature & Capability Strip + Real-Time Telemetry Bar */}
        <section className="border-y border-cyan-500/20 bg-[#060c1d]/60 backdrop-blur-md py-8 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* 4 Feature capability cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div
              onClick={() => scrollToSection('capabilities')}
              className="p-4 rounded-xl bg-cyber-surface/50 border border-cyber-border/70 hover:border-cyan-500/50 hover:bg-cyber-surface/80 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-2 mb-2">
                <Crosshair className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold text-white font-mono group-hover:text-cyan-400 transition-colors">
                  Detect & Monitor
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Continuous external scanning across mobile stores and social ecosystems for lookalikes.
              </p>
            </div>

            <div
              onClick={() => scrollToSection('scoring')}
              className="p-4 rounded-xl bg-cyber-surface/50 border border-cyber-border/70 hover:border-violet-500/50 hover:bg-cyber-surface/80 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-2 mb-2">
                <Cpu className="w-4 h-4 text-violet-400 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold text-white font-mono group-hover:text-violet-400 transition-colors">
                  AI-Powered Analysis
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Multi-signal Levenshtein distance & entropy calculations with bounded 0–100 risk scores.
              </p>
            </div>

            <div
              onClick={() => scrollToSection('capabilities')}
              className="p-4 rounded-xl bg-cyber-surface/50 border border-cyber-border/70 hover:border-emerald-500/50 hover:bg-cyber-surface/80 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold text-white font-mono group-hover:text-emerald-400 transition-colors">
                  Brand Intelligence
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Ground truth asset whitelisting guarantees zero false positives for verified brand entities.
              </p>
            </div>

            <div
              onClick={() => scrollToSection('architecture')}
              className="p-4 rounded-xl bg-cyber-surface/50 border border-cyber-border/70 hover:border-sky-500/50 hover:bg-cyber-surface/80 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-2 mb-2">
                <Layers className="w-4 h-4 text-sky-400 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold text-white font-mono group-hover:text-sky-400 transition-colors">
                  Actionable Insights
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                5-stage audited triage lifecycle with persisted forensic evidence dossiers for analysts.
              </p>
            </div>
          </div>

          {/* Real-time telemetry metrics */}
          <div className="pt-6 border-t border-cyber-border/60 grid grid-cols-2 md:grid-cols-4 gap-6 text-center md:text-left">
            <div className="space-y-1">
              <div className="text-[11px] font-mono text-cyber-textMuted uppercase tracking-wider">
                External Ingestion
              </div>
              <div className="text-sm sm:text-base font-bold text-white font-mono flex items-center justify-center md:justify-start gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(0,240,255,0.8)] animate-pulse" />
                Apple Store Search API
              </div>
              <div className="text-[10px] text-cyan-400 font-mono">Live iOS Store Metadata</div>
            </div>

            <div className="space-y-1">
              <div className="text-[11px] font-mono text-cyber-textMuted uppercase tracking-wider">
                Risk Engine
              </div>
              <div className="text-sm sm:text-base font-bold text-white font-mono">
                0.0 – 100.0 Bounded
              </div>
              <div className="text-[10px] text-emerald-400 font-mono">Deterministic Weights</div>
            </div>

            <div className="space-y-1">
              <div className="text-[11px] font-mono text-cyber-textMuted uppercase tracking-wider">
                False Positive Rate
              </div>
              <div className="text-sm sm:text-base font-bold text-white font-mono">
                0% On Whitelisted Assets
              </div>
              <div className="text-[10px] text-emerald-400 font-mono">Exact Match Exclusion</div>
            </div>

            <div className="space-y-1">
              <div className="text-[11px] font-mono text-cyber-textMuted uppercase tracking-wider">
                Analyst Workflow
              </div>
              <div className="text-sm sm:text-base font-bold text-white font-mono">
                5-Stage Triage Cycle
              </div>
              <div className="text-[10px] text-amber-400 font-mono">Audited State Machine</div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Core Capabilities Section */}
      <CapabilitiesSection onLaunchDashboard={handleLaunch} />

      {/* 5. End-to-End Threat Architecture Pipeline */}
      <section id="architecture" className="py-24 relative border-t border-cyan-500/20 bg-[#040817]/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/30 bg-cyan-950/40 text-cyan-400 font-mono text-[11px] uppercase tracking-wider mb-4">
              <Cpu className="w-3.5 h-3.5" />
              End-to-End Pipeline
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white font-mono">
              From Ingestion to <span className="text-cyan-400">Mitigation</span>
            </h2>
            <p className="mt-4 text-base text-slate-300 leading-relaxed">
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
                className="rounded-2xl border border-cyan-500/20 bg-[#060c1e]/75 backdrop-blur-md p-5 relative space-y-3 flex flex-col justify-between hover:border-cyan-400/50 transition-all hover:shadow-glow"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold font-mono text-cyan-400">
                      {st.step}
                    </span>
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30 text-cyan-300">
                      {st.tag}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-white font-mono mt-3">
                    {st.title}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed mt-2">
                    {st.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Product Preview Section */}
      <ProductPreviewSection onLaunchDashboard={handleLaunch} />

      {/* 7. Deterministic Scoring Breakdown Section */}
      <section id="scoring" className="py-24 relative border-t border-cyan-500/20 bg-[#040816]/40 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-6 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/30 bg-cyan-950/40 text-cyan-400 font-mono text-[11px] uppercase tracking-wider">
                <Shield className="w-3.5 h-3.5" />
                Mathematical Explainability
              </div>

              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white font-mono">
                Why Deterministic Scoring Beats <span className="text-cyan-400">Generative Guesses</span>
              </h2>

              <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                In critical cybersecurity operations, false accusations destroy developer trust and hallucinations distract analyst teams. SURAKSHA guarantees explainable scoring weights:
              </p>

              <div className="space-y-3 font-mono text-xs">
                <div className="p-3.5 rounded-xl border border-cyan-500/20 bg-[#060c1e]/75 backdrop-blur-md flex items-center justify-between">
                  <span className="text-white">Title & Keyword Levenshtein Distance</span>
                  <span className="text-cyan-400 font-bold">40% Weight</span>
                </div>
                <div className="p-3.5 rounded-xl border border-cyan-500/20 bg-[#060c1e]/75 backdrop-blur-md flex items-center justify-between">
                  <span className="text-white">Publisher Name & Authority Mismatch</span>
                  <span className="text-cyan-400 font-bold">35% Weight</span>
                </div>
                <div className="p-3.5 rounded-xl border border-cyan-500/20 bg-[#060c1e]/75 backdrop-blur-md flex items-center justify-between">
                  <span className="text-white">Mobile Package ID Entropy & Divergence</span>
                  <span className="text-cyan-400 font-bold">15% Weight</span>
                </div>
                <div className="p-3.5 rounded-xl border border-cyan-500/20 bg-[#060c1e]/75 backdrop-blur-md flex items-center justify-between">
                  <span className="text-white">High-Risk Suspicious Keywords</span>
                  <span className="text-cyan-400 font-bold">10% Weight</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="rounded-2xl border border-cyan-500/25 bg-[#040817]/85 backdrop-blur-xl p-6 space-y-4 font-mono text-xs shadow-2xl">
                <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3 text-slate-400">
                  <span>SCORING AUDIT MATRIX</span>
                  <span className="text-emerald-400 font-semibold">BOUNDED 0.0 - 100.0</span>
                </div>

                <div className="space-y-3 text-[11px]">
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#060c1e]/60 border border-slate-800">
                    <span className="text-emerald-400 font-medium">LOW RISK (0.0 – 39.9)</span>
                    <span className="text-slate-400">Marginal keyword coincidence</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#060c1e]/60 border border-slate-800">
                    <span className="text-amber-400 font-medium">MEDIUM RISK (40.0 – 69.9)</span>
                    <span className="text-slate-400">Possible lookalike, needs evaluation</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#060c1e]/60 border border-slate-800">
                    <span className="text-rose-400 font-medium">HIGH RISK (70.0 – 89.9)</span>
                    <span className="text-slate-400">Publisher mismatch with severe brand match</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30">
                    <span className="text-rose-400 font-bold">CRITICAL RISK (90.0 – 100.0)</span>
                    <span className="text-rose-300">Blatant spoofing with fraudulent claims</span>
                  </div>
                </div>

                <div className="pt-2 text-[10px] text-slate-400 leading-relaxed">
                  * Note: Real discovered candidates are initially marked <code>Potential Risk / Needs Review</code> until an analyst marks them <code>CONFIRMED_THREAT</code>.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Footer */}
      <LandingFooter onLaunchDashboard={handleLaunch} />
    </div>
  </div>
  );
}
