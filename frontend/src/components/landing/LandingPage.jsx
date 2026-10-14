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
import CyberGlobe3DBackground from './CyberGlobe3DBackground';
import DigitalGlobeCanvas from './DigitalGlobeCanvas';
import ThreatNetworkCanvas from './ThreatNetworkCanvas';
import CapabilitiesSection from './CapabilitiesSection';
import ProductPreviewSection from './ProductPreviewSection';
import LandingFooter from './LandingFooter';

export default function LandingPage({ onLaunchDashboard, onReplayIntro }) {
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
    <div className="relative min-h-screen bg-[#080F1D] text-cyber-textMain select-none flex flex-col font-sans overflow-x-hidden">
      {/* ========================================================= */}
      {/* SHARED FULL-PAGE CONTINUOUS CYBERSECURITY BACKGROUND LAYER */}
      {/* Covers edge-to-edge across entire scroll (Hero to Footer)  */}
      {/* ========================================================= */}
      <div
        className="fixed inset-0 w-full h-full pointer-events-none z-0 overflow-hidden"
        aria-hidden="true"
      >
        {/* 1. Base Digital Earth & Cyber Cosmos Image */}
        <div
          className="absolute inset-0 w-full h-full bg-cover bg-no-repeat bg-[center_top] sm:bg-[center_right] lg:bg-[85%_center] opacity-20 transition-all duration-700"
          style={{
            backgroundImage: "url('/cyber_hero_bg.jpg')",
          }}
        />

        {/* 2. Global Geometric Mesh Overlay across full page height */}
        <div className="absolute inset-0 w-full h-full bg-[radial-gradient(#1E314F_1px,transparent_1px)] [background-size:32px_32px] opacity-35" />

        {/* 3. Obsidian Navy Gradient Overlays protecting text contrast */}
        <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-[#080F1D] via-[#080F1D]/90 via-50% to-transparent sm:via-55% lg:via-50% lg:to-transparent" />
        <div className="absolute inset-0 w-full h-full bg-gradient-to-b from-[#080F1D]/70 via-transparent to-[#080F1D]" />

        {/* 4. Restrained Ambient Depth */}
        <div
          className="absolute top-[20%] right-[15%] w-[420px] h-[420px] bg-[#45C8E8]/5 rounded-full blur-[140px] pointer-events-none"
        />
        <div
          className="absolute top-[45%] right-[12%] w-[380px] h-[380px] bg-[#9B8AFB]/5 rounded-full blur-[160px] pointer-events-none"
        />
      </div>

      {/* ========================================================= */}
      {/* FOREGROUND DOCUMENT CONTENT (relative z-10)               */}
      {/* ========================================================= */}
      <div className="relative z-10 flex flex-col flex-1 w-full">
        {/* 1. Header Navigation */}
        <LandingNav onLaunchDashboard={handleLaunch} />

        {/* 2. Full-Screen Hero Section */}
        <section className="relative min-h-[calc(100svh-5rem)] flex items-center justify-center py-8 sm:py-12 lg:py-16 overflow-hidden">
          {/* Interactive 3D Cybersecurity Hero Background */}
          <CyberGlobe3DBackground />

          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-8 items-center w-full">
              {/* Left Hero Content: ~54% width (7 of 12 cols) */}
              <div className="lg:col-span-7 space-y-6 text-center lg:text-left z-10">
                {/* Eyebrow Label */}
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#1E314F] bg-[#111D30]/80 text-[#45C8E8] font-mono text-[11px] sm:text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#45C8E8]" />
                  <span className="font-medium tracking-wider uppercase">
                    BRAND PROTECTION · THREAT INTELLIGENCE · ENTERPRISE DRP
                  </span>
                </div>

                {/* Main Headline */}
                <h1 className="text-4xl sm:text-5xl lg:text-[52px] xl:text-[58px] font-extrabold tracking-tight leading-[1.08] max-w-[580px] mx-auto lg:mx-0">
                  <span className="block text-white">Protect Your Brand.</span>
                  <span className="block text-[#45C8E8] mt-1">Detect Threats</span>
                  <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#45C8E8] via-[#8EA2C6] to-[#9B8AFB] mt-1">
                    Before They Spread.
                  </span>
                </h1>

                {/* Supporting Description */}
                <p className="text-base sm:text-lg text-[#8EA2C6] leading-relaxed max-w-[560px] mx-auto lg:mx-0 font-sans font-normal">
                  Suraksha helps enterprise security teams identify suspicious social profiles, assess potential impersonation risks, and support brand-protection investigations — all in one unified platform.
                </p>

                {/* CTAs */}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                  <button
                    onClick={() => handleLaunch({ tab: 'overview' })}
                    className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-[#45C8E8] text-[#080F1D] font-mono font-bold text-xs sm:text-sm uppercase tracking-wider hover:bg-[#38B2D0] shadow-panel hover:shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2.5 group cursor-pointer"
                    aria-label="Explore Threat Intelligence Dashboard"
                  >
                    <span>Explore Threat Intelligence</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </button>

                  <button
                    onClick={() => scrollToSection('capabilities')}
                    className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-[#111D30] border border-[#1E314F] text-[#8EA2C6] font-mono text-xs tracking-wider uppercase hover:border-[#45C8E8]/40 hover:text-white hover:bg-[#16253D] transition-all flex items-center justify-center gap-2 cursor-pointer"
                    aria-label="Explore Capabilities"
                  >
                    <span>Explore Capabilities</span>
                    <ChevronDown className="w-4 h-4 text-[#45C8E8]" />
                  </button>
                </div>

                {/* Verified Trust Badges */}
                <div className="pt-4 flex flex-wrap items-center justify-center lg:justify-start gap-x-6 gap-y-2 text-xs font-mono text-[#8EA2C6]">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#45C8E8] shrink-0" />
                    <span>Live Apple Store API</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981] shrink-0" />
                    <span>Ground Truth Whitelist</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#9B8AFB] shrink-0" />
                    <span>Explainable AI Assistant</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Clean visual space framing the Digital Earth Globe */}
              <div className="lg:col-span-5 w-full relative min-h-[320px] sm:min-h-[420px] lg:min-h-[500px] flex items-end justify-center lg:justify-end pointer-events-none">
                <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#111D30]/90 backdrop-blur-md border border-[#1E314F] shadow-panel text-[11px] font-mono text-[#8EA2C6] mb-4 lg:mb-8 pointer-events-auto">
                  <span className="w-2 h-2 rounded-full bg-[#10B981]" />
                  <span>Global Perimeter Monitoring Active</span>
                </div>
              </div>
            </div>
          </main>
        </section>

        {/* 3. Feature & Capability Strip */}
        <section className="border-y border-[#1E314F] bg-[#0E1726]/90 backdrop-blur-md py-8 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div
              onClick={() => scrollToSection('capabilities')}
              className="p-4 rounded-xl bg-[#111D30] border border-[#1E314F] hover:border-[#45C8E8]/40 hover:bg-[#16253D] transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-2 mb-2">
                <Crosshair className="w-4 h-4 text-[#45C8E8] group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold text-white font-mono group-hover:text-[#45C8E8] transition-colors">
                  Detect & Monitor
                </span>
              </div>
              <p className="text-[11px] text-[#8EA2C6] leading-relaxed">
                Continuous external scanning across mobile stores and social ecosystems for lookalikes.
              </p>
            </div>

            <div
              onClick={() => scrollToSection('scoring')}
              className="p-4 rounded-xl bg-[#111D30] border border-[#1E314F] hover:border-[#9B8AFB]/40 hover:bg-[#16253D] transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-2 mb-2">
                <Cpu className="w-4 h-4 text-[#9B8AFB] group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold text-white font-mono group-hover:text-[#9B8AFB] transition-colors">
                  Deterministic Scoring
                </span>
              </div>
              <p className="text-[11px] text-[#8EA2C6] leading-relaxed">
                Multi-signal Levenshtein distance & entropy calculations with bounded 0–100 risk scores.
              </p>
            </div>

            <div
              onClick={() => scrollToSection('capabilities')}
              className="p-4 rounded-xl bg-[#111D30] border border-[#1E314F] hover:border-[#10B981]/40 hover:bg-[#16253D] transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-[#10B981] group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold text-white font-mono group-hover:text-[#10B981] transition-colors">
                  Brand Intelligence
                </span>
              </div>
              <p className="text-[11px] text-[#8EA2C6] leading-relaxed">
                Ground truth asset whitelisting guarantees zero false positives for verified brand entities.
              </p>
            </div>

            <div
              onClick={() => scrollToSection('architecture')}
              className="p-4 rounded-xl bg-[#111D30] border border-[#1E314F] hover:border-[#45C8E8]/40 hover:bg-[#16253D] transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-2 mb-2">
                <Layers className="w-4 h-4 text-[#45C8E8] group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold text-white font-mono group-hover:text-[#45C8E8] transition-colors">
                  Audited Investigations
                </span>
              </div>
              <p className="text-[11px] text-[#8EA2C6] leading-relaxed">
                5-stage audited triage lifecycle with persisted forensic evidence dossiers for analysts.
              </p>
            </div>
          </div>

          {/* Telemetry metrics bar */}
          <div className="pt-6 border-t border-[#1E314F] grid grid-cols-2 md:grid-cols-4 gap-6 text-center md:text-left">
            <div className="space-y-1">
              <div className="text-[11px] font-mono text-[#8EA2C6] uppercase tracking-wider">
                External Ingestion
              </div>
              <div className="text-sm sm:text-base font-bold text-white font-mono flex items-center justify-center md:justify-start gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#45C8E8]" />
                Apple Store Search API
              </div>
              <div className="text-[10px] text-[#45C8E8] font-mono">Live iOS Store Metadata</div>
            </div>

            <div className="space-y-1">
              <div className="text-[11px] font-mono text-[#8EA2C6] uppercase tracking-wider">
                Risk Engine
              </div>
              <div className="text-sm sm:text-base font-bold text-white font-mono">
                0.0 – 100.0 Bounded
              </div>
              <div className="text-[10px] text-[#10B981] font-mono">Deterministic Weights</div>
            </div>

            <div className="space-y-1">
              <div className="text-[11px] font-mono text-[#8EA2C6] uppercase tracking-wider">
                False Positive Rate
              </div>
              <div className="text-sm sm:text-base font-bold text-white font-mono">
                0% On Whitelisted Assets
              </div>
              <div className="text-[10px] text-[#10B981] font-mono">Exact Match Exclusion</div>
            </div>

            <div className="space-y-1">
              <div className="text-[11px] font-mono text-[#8EA2C6] uppercase tracking-wider">
                Analyst Workflow
              </div>
              <div className="text-sm sm:text-base font-bold text-white font-mono">
                5-Stage Triage Cycle
              </div>
              <div className="text-[10px] text-[#F59E0B] font-mono">Audited State Machine</div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Core Capabilities Section */}
      <CapabilitiesSection onLaunchDashboard={handleLaunch} />

      {/* 5. End-to-End Threat Architecture Pipeline */}
      <section id="architecture" className="py-24 relative border-t border-[#1E314F] bg-[#080F1D]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#1E314F] bg-[#111D30] text-[#45C8E8] font-mono text-[11px] uppercase tracking-wider mb-4">
              <Cpu className="w-3.5 h-3.5" />
              End-to-End Pipeline
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white font-mono">
              From Ingestion to <span className="text-[#45C8E8]">Mitigation</span>
            </h2>
            <p className="mt-4 text-base text-[#8EA2C6] leading-relaxed">
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
                className="rounded-xl border border-[#1E314F] bg-[#111D30] p-5 relative space-y-3 flex flex-col justify-between hover:border-[#45C8E8]/40 hover:bg-[#16253D] transition-all shadow-card"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold font-mono text-[#45C8E8]">
                      {st.step}
                    </span>
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-[#0E1726] border border-[#1E314F] text-[#8EA2C6]">
                      {st.tag}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-white font-mono mt-3">
                    {st.title}
                  </h3>
                  <p className="text-xs text-[#8EA2C6] leading-relaxed mt-2">
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
      <section id="scoring" className="py-24 relative border-t border-[#1E314F] bg-[#0E1726]/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-6 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#1E314F] bg-[#111D30] text-[#45C8E8] font-mono text-[11px] uppercase tracking-wider">
                <Shield className="w-3.5 h-3.5" />
                Mathematical Explainability
              </div>

              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white font-mono">
                Why Deterministic Scoring Beats <span className="text-[#45C8E8]">Generative Guesses</span>
              </h2>

              <p className="text-sm sm:text-base text-[#8EA2C6] leading-relaxed">
                In critical cybersecurity operations, false accusations destroy developer trust and hallucinations distract analyst teams. SURAKSHA guarantees explainable scoring weights:
              </p>

              <div className="space-y-3 font-mono text-xs">
                <div className="p-3.5 rounded-xl border border-[#1E314F] bg-[#111D30] flex items-center justify-between">
                  <span className="text-white">Title & Keyword Levenshtein Distance</span>
                  <span className="text-[#45C8E8] font-bold">40% Weight</span>
                </div>
                <div className="p-3.5 rounded-xl border border-[#1E314F] bg-[#111D30] flex items-center justify-between">
                  <span className="text-white">Publisher Name & Authority Mismatch</span>
                  <span className="text-[#45C8E8] font-bold">35% Weight</span>
                </div>
                <div className="p-3.5 rounded-xl border border-[#1E314F] bg-[#111D30] flex items-center justify-between">
                  <span className="text-white">Mobile Package ID Entropy & Divergence</span>
                  <span className="text-[#45C8E8] font-bold">15% Weight</span>
                </div>
                <div className="p-3.5 rounded-xl border border-[#1E314F] bg-[#111D30] flex items-center justify-between">
                  <span className="text-white">High-Risk Suspicious Keywords</span>
                  <span className="text-[#45C8E8] font-bold">10% Weight</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="rounded-xl border border-[#1E314F] bg-[#111D30] p-6 space-y-4 font-mono text-xs shadow-panel">
                <div className="flex items-center justify-between border-b border-[#1E314F] pb-3 text-[#8EA2C6]">
                  <span>SCORING AUDIT MATRIX</span>
                  <span className="text-[#10B981] font-semibold">BOUNDED 0.0 - 100.0</span>
                </div>

                <div className="space-y-3 text-[11px]">
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#0E1726] border border-[#1E314F]">
                    <span className="text-[#10B981] font-medium">LOW RISK (0.0 – 39.9)</span>
                    <span className="text-[#8EA2C6]">Marginal keyword coincidence</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#0E1726] border border-[#1E314F]">
                    <span className="text-[#F59E0B] font-medium">MEDIUM RISK (40.0 – 69.9)</span>
                    <span className="text-[#8EA2C6]">Possible lookalike, needs evaluation</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#0E1726] border border-[#1E314F]">
                    <span className="text-[#F97316] font-medium">HIGH RISK (70.0 – 89.9)</span>
                    <span className="text-[#8EA2C6]">Publisher mismatch with severe brand match</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/30">
                    <span className="text-[#EF4444] font-bold">CRITICAL RISK (90.0 – 100.0)</span>
                    <span className="text-[#EF4444]/90">Blatant spoofing with fraudulent claims</span>
                  </div>
                </div>

                <div className="pt-2 text-[10px] text-[#8EA2C6] leading-relaxed">
                  * Note: Real discovered candidates are initially marked <code>Potential Risk / Needs Review</code> until an analyst marks them <code>CONFIRMED_THREAT</code>.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Footer */}
      <LandingFooter onLaunchDashboard={handleLaunch} onReplayIntro={onReplayIntro} />
    </div>
  </div>
  );
}
