import React from 'react';
import {
  Shield,
  Layers,
  Globe,
  Smartphone,
  Share2,
  Crosshair,
  AlertTriangle,
  ArrowRight,
  Code2,
  FileCheck2,
  Lock
} from 'lucide-react';

export default function PlannedModuleView({ moduleId, brandCount, onSwitchToBrands }) {
  const moduleConfig = {
    social: {
      title: 'Social Media Impersonation Watch',
      icon: Share2,
      phase: 'Phase 2 Architecture Target',
      status: 'Planned for Phase 2 Implementation',
      objective: 'Discover and flag spoofed social media accounts, impersonator profiles, bio cloning, and executive impersonation across major social networks.',
      pipelineSteps: [
        'Connectors: Query official Graph/REST APIs with authorized client credentials',
        'Data Ingestion: Normalize social candidate profiles into unified candidate schema',
        'Signal Detection: Calculate name distance (Levenshtein / Jaro-Winkler) against verified brand handles',
        'Logo & Visual Hashing: Compute perceptual hashes (pHash) against verified corporate logos',
        'Explainable Scoring: Output composite risk score (0-100) with supporting evidentiary signals',
      ],
      readiness: `Anchored by ${brandCount} registered brand profile(s). Awaiting Phase 2 approval for connector integration.`
    },
    domains: {
      title: 'Lookalike Domains & URL Intelligence',
      icon: Globe,
      phase: 'Phase 2 Architecture Target',
      status: 'Planned for Phase 2 Implementation',
      objective: 'Continuously track domain registries, newly observed domains (NOD), Certificate Transparency logs, and typosquatting permutations.',
      pipelineSteps: [
        'Domain Permutation Generator: Generate bitsquatting, homoglyph (IDN), hyphenation, and transposition variations of verified domains',
        'DNS & MX Resolution: Query live NS, A, and MX records to detect active mail servers and landing pages',
        'HTTP Threat Fingerprinting: Capture screenshots and DOM snapshots for credential harvester forms',
        'Registrar & WHOIS Pivot: Identify bulletproof hosting providers and adversary infrastructure',
        'Risk Evaluation: Flag active lookalikes with high severity and immediate takedown evidence packets',
      ],
      readiness: `Anchored by ${brandCount} registered brand profile(s). Awaiting Phase 2 approval for DNS and Certificate Transparency crawlers.`
    },
    apps: {
      title: 'Mobile Application Guard',
      icon: Smartphone,
      phase: 'Phase 2 Architecture Target',
      status: 'Planned for Phase 2 Implementation',
      objective: 'Identify malicious APKs, copycat listings, unauthorized app store uploads, and trojanized apps abusing corporate brand trademarks.',
      pipelineSteps: [
        'App Store Metadata Collection: Monitor Google Play, Apple App Store, and alternative third-party APK repositories',
        'Package ID Verification: Compare against verified brand package signatures (e.g. com.brand.app)',
        'Publisher Authentication: Verify developer certificates against known brand publishers',
        'Icon & Asset Extraction: Reverse-image search application icons against verified brand asset URLs',
        'Evidence Archiving: Preserve APK hash (SHA256), store link, and developer contact for investigation',
      ],
      readiness: `Anchored by ${brandCount} registered brand profile(s). Awaiting Phase 2 approval for app store metadata feeds.`
    },
    campaigns: {
      title: 'Cross-Platform Threat Campaigns & Correlation',
      icon: Crosshair,
      phase: 'Phase 2 Architecture Target',
      status: 'Planned for Phase 2 Implementation',
      objective: 'Correlate disparate domain, social, and mobile app impersonation sightings into cohesive adversary threat clusters.',
      pipelineSteps: [
        'Entity Linking: Correlate findings sharing identical WHOIS emails, registrant names, or server IPs',
        'Phishing Kit Signature Matching: Detect shared landing page kits and credential exfiltration endpoints',
        'Threat Actor Clustering: Build temporal timelines showing first-seen and last-seen activity',
        'Investigation Dossiers: Compile evidence packets for legal takedowns (DMCA, UDRP) and registrar abuse reports',
      ],
      readiness: `Requires Phase 2 detection ingestion to populate candidate evidence registry.`
    }
  };

  const current = moduleConfig[moduleId] || moduleConfig.social;
  const Icon = current.icon;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Planned Header Banner */}
      <div className="cyber-panel p-8 rounded-2xl border border-cyber-border space-y-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Icon className="w-64 h-64 text-cyber-accent" />
        </div>

        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-cyber-accent/10 border border-cyber-accent/30 flex items-center justify-center text-cyber-accent shadow-glow">
            <Icon className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-white tracking-wide">
                {current.title}
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-cyber-amber/40 bg-cyber-amber/10 text-cyber-amber font-semibold uppercase">
                {current.phase}
              </span>
            </div>
            <p className="text-xs text-cyber-textMuted mt-1">
              {current.status}
            </p>
          </div>
        </div>

        {/* Non-negotiable Transparency Notice */}
        <div className="p-4 rounded-xl bg-cyber-surface border border-cyber-border space-y-2">
          <div className="flex items-center gap-2 text-xs font-mono text-white font-semibold">
            <Lock className="w-4 h-4 text-cyber-accent" />
            <span>ARCHITECTURE INTEGRITY & ZERO-FABRICATION POLICY</span>
          </div>
          <p className="text-xs text-cyber-textMuted leading-relaxed">
            In compliance with SURAKSHA cybersecurity engineering standards, this module displays zero fabricated threat findings. Detection signals and automated candidate ingestion are scheduled for Phase 2. The underlying interface boundaries (<code>connectors/base.py</code>, <code>detection/base.py</code>, <code>monitoring/base.py</code>) have already been engineered into the backend foundation.
          </p>
        </div>

        {/* Objective */}
        <div>
          <div className="text-xs font-mono uppercase tracking-wider text-cyber-accent font-semibold mb-2">
            Module Architecture & Scope
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            {current.objective}
          </p>
        </div>

        {/* Planned Pipeline Steps */}
        <div className="space-y-3">
          <div className="text-xs font-mono uppercase tracking-wider text-cyber-accent font-semibold">
            Planned Pipeline Architecture
          </div>
          <div className="space-y-2">
            {current.pipelineSteps.map((step, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg bg-cyber-darkest border border-cyber-border/80 text-xs font-mono text-slate-300 flex items-start gap-3"
              >
                <span className="text-cyber-accent font-bold">0{idx + 1}.</span>
                <span>{step}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Current Anchor Baseline */}
        <div className="pt-4 border-t border-cyber-border flex items-center justify-between">
          <div className="text-xs font-mono text-cyber-textMuted">
            Anchor State: <span className="text-white">{current.readiness}</span>
          </div>
          <button
            onClick={onSwitchToBrands}
            className="flex items-center gap-1.5 text-xs font-semibold text-cyber-accent hover:underline"
          >
            Manage Brand Profiles <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
