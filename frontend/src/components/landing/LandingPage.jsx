import React, { useState, useMemo } from 'react';
import {
  ArrowRight,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Globe,
  Share2,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  Search,
  FileText,
  Terminal,
  ExternalLink,
  Lock,
  Activity,
  Sparkles,
  Layers,
  Network,
  ChevronRight,
  Play,
  Check,
  Zap,
  KeyRound,
  LayoutDashboard,
  Eye,
  Sliders,
  ShieldX,
  Compass,
} from 'lucide-react';
import { ShieldMark } from '../ShieldMark';
import { Reveal, CountUp } from './Reveal';
import { runFullLookalikeAnalysis } from '../../utils/lookalikeEngine';
import { INITIAL_BRAND_PROFILE } from '../../data/demoData';

/**
 * Enterprise Brand Protection Landing Page
 * Combines modern Linear-inspired dark aesthetics, interactive threat vector previews,
 * dedicated login portal & inner dashboard showcases with images, and a live client-side sandbox.
 */

const HERO_TABS = [
  {
    id: 'domain',
    label: 'Domain Lookalike',
    icon: Globe,
    badge: 'Critical Threat #7104',
    badgeColor: 'text-danger bg-danger/10 border-danger/30',
    target: 'Acme Corp',
    candidate: 'xn--cme-portal-12a.com',
    display: 'аcme-portal.com (Cyrillic \'а\' U+0430)',
    riskLevel: 'Critical (Score 92/100)',
    signals: [
      { type: 'danger', text: 'UTS #39 Homoglyph skeleton collision with official domain acme.com' },
      { type: 'high', text: 'Active port 443 with self-signed TLS cert issued 2 hours ago' },
      { type: 'ai', text: 'URL Model inference: 0.96 Phishing (uncalibrated probability)' },
    ],
    epistemic: '2 Verified Structural Facts · 1 Statistical Inference',
    action: 'Generate RFC 2142 Registrar Abuse Notice',
  },
  {
    id: 'social',
    label: 'Social Impersonation',
    icon: Share2,
    badge: 'High Risk #7105',
    badgeColor: 'text-high bg-high/10 border-high/30',
    target: 'Acme Corp',
    candidate: '@acme_support_helpdesk',
    display: 'X / Twitter profile claiming 24/7 refund desk',
    riskLevel: 'High severity (illustrative)',
    signals: [
      { type: 'danger', text: 'Profile URL conflicts with registered official handle @acme_official' },
      { type: 'high', text: 'External link directs users to unauthorized Telegram bot t.me/acme_claims' },
      { type: 'ai', text: 'Lure keyword density: "urgent unlock", "account suspension", "refund"' },
    ],
    epistemic: '2 Verified Registry Conflicts · 1 Content Heuristic',
    action: 'Submit Impersonation Report to Platform Trust & Safety',
  },
  {
    id: 'mobile',
    label: 'Rogue Mobile APK',
    icon: Smartphone,
    badge: 'Critical Threat #7106',
    badgeColor: 'text-danger bg-danger/10 border-danger/30',
    target: 'Acme Corp',
    candidate: 'com.acme.instant.wallet',
    display: 'Acme Pro: Fast Cash Loan (Sideload APK)',
    riskLevel: 'Critical severity (illustrative)',
    signals: [
      { type: 'danger', text: 'Developer certificate signed by unverified entity "Rogue Financial Tech Ltd"' },
      { type: 'high', text: 'Package namespace mirrors official app com.acme.wallet' },
      { type: 'ai', text: 'Publisher name does not match the developer registered for the official app' },
    ],
    epistemic: '3 Recorded Facts · Analyst-verified',
    action: 'Issue DMCA & Malware Takedown to Hosting Mirror',
  },
  {
    id: 'graph',
    label: 'Threat Correlation',
    icon: Network,
    badge: 'Syndicate Matrix #9021',
    badgeColor: 'text-ai bg-ai/10 border-ai/30',
    target: 'Acme Corp',
    candidate: 'Campaign Infrastructure Cluster',
    display: '1 Domain + 2 Phishing Hosts + 1 Telegram Bot',
    riskLevel: 'Severe Coordinated Attack',
    signals: [
      { type: 'danger', text: 'Shared registrar & ASN: AS16276 across 3 deceptive domains' },
      { type: 'high', text: 'Same hosting IP and TLS certificate recorded on both findings' },
      { type: 'ai', text: 'Correlated attack timing: all assets provisioned within 48-hour window' },
    ],
    epistemic: 'Cross-Entity Evidence Graph · Unified Adversary Profiling',
    action: 'Export Coordinated Syndicate Dossier (STIX / JSON)',
  },
];

const SANDBOX_PRESETS = [
  {
    label: 'Cyrillic Homoglyph',
    domain: 'аcme.com',
    name: 'Acme Secure Portal',
    desc: 'Spoofs Latin "a" with Cyrillic U+0430 to mimic official login portal',
  },
  {
    label: 'Subdomain Abuse',
    domain: 'acme.claims-portal.com',
    name: 'Acme Claims Desk',
    desc: 'Embeds brand name as subdomain prefix under rogue host claims-portal.com',
  },
  {
    label: 'Combosquatting Lure',
    domain: 'acme-refund-desk.xyz',
    name: 'Acme Customer Support',
    desc: 'Appends urgency lure keywords with cheap high-risk TLD',
  },
  {
    label: 'Typosquatting',
    domain: 'acmee.com',
    name: 'Acme Access',
    desc: 'Omission or character duplication typo with Damerau-Levenshtein edit distance of 1',
  },
  {
    label: 'Official Asset',
    domain: 'acme.com',
    name: 'Acme Official',
    desc: 'Verified registered domain in the protected brand profile',
  },
];

const LOOP = [
  {
    step: '01',
    title: 'Register & Whitelist',
    desc: 'Enroll your official hostnames, social handles, and mobile bundle IDs. Verified assets are mathematically excluded from every finding to prevent false alarms.',
    icon: ShieldCheck,
  },
  {
    step: '02',
    title: 'Continuous Vector Sweep',
    desc: 'SURAKSHA evaluates candidate domains, social accounts, and APK stores using Unicode decomposition, typosquatting algorithms, and lure dictionaries.',
    icon: Globe,
  },
  {
    step: '03',
    title: 'Epistemic Signal Isolation',
    desc: 'Every finding categorizes observed deterministic facts separately from statistical ML inferences. No opaque black boxes—analysts see the exact rule that fired.',
    icon: Terminal,
  },
  {
    step: '04',
    title: 'Analyst Investigation Dossier',
    desc: 'Correlate findings across the threat graph, record notes, review DNS records, and maintain an immutable audit trail of analyst decisions.',
    icon: FileText,
  },
  {
    step: '05',
    title: 'RFC 2142 Automated Takedown',
    desc: 'Generate court-admissible takedown notices, registrar abuse emails, and export structured evidence for ICANN UDRP dispute resolution.',
    icon: Zap,
  },
];

const MEASURED = [
  {
    label: 'URL model, bare domains',
    value: '42%',
    sub: 'True Positive Recall',
    note: 'of phishing hosts caught at 95% precision on a frozen test set of 2,210 hosts.',
    badge: 'Frozen Test Set',
  },
  {
    label: 'Format-only baseline',
    value: '0.87 F1',
    sub: 'Benchmark Reference',
    note: 'A model with zero content scored this on raw URLs, close to the 0.90 of the trained model. We declare this openly.',
    badge: 'Baseline Provenance',
  },
  {
    label: 'Social impersonation labels',
    value: '0',
    sub: 'Honest Disclosure',
    note: 'verified brand-impersonation training labels exist. The social module relies on deterministic registry verification, not unproven ML.',
    badge: 'Evidence only',
  },
  {
    label: 'Mobile app labels',
    value: '0',
    sub: 'Rule-Based Guard',
    note: 'verified malicious brand clones exist in public benchmarks. App assessment is cryptographic and manifest-based.',
    badge: 'Strict Verification',
  },
];

const Section = ({ eyebrow, title, subtitle, id, children }) => (
  <section id={id} className="mx-auto w-full max-w-[1720px] px-6 sm:px-10 lg:px-12 2xl:px-16 py-16 sm:py-24">
    <Reveal>
      <div className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-accent" />
        <p className="text-xs font-semibold uppercase tracking-widest text-accent">{eyebrow}</p>
      </div>
      <h2 className="mt-3 max-w-3xl text-2xl font-semibold text-fg sm:text-3xl lg:text-4xl tracking-tight">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-3 max-w-2xl text-sm sm:text-base text-fgMuted leading-relaxed">
          {subtitle}
        </p>
      )}
    </Reveal>
    <div className="mt-10">{children}</div>
  </section>
);

export default function LandingPage({ onLaunchDashboard, onReplayIntro }) {
  const open = (options) => onLaunchDashboard && onLaunchDashboard(options || { mode: 'login' });

  // Hero interactive state
  const [activeHeroTab, setActiveHeroTab] = useState(0);

  // Live sandbox state
  const [sandboxDomain, setSandboxDomain] = useState('аcme.com');
  const [sandboxName, setSandboxName] = useState('Acme Secure Portal');
  const [sandboxDesc, setSandboxDesc] = useState('Spoofs Latin "a" with Cyrillic U+0430');

  // Client-side real-time analysis using actual lookalike engine
  const sandboxAnalysis = useMemo(() => {
    try {
      return runFullLookalikeAnalysis(
        sandboxName,
        sandboxDomain,
        INITIAL_BRAND_PROFILE,
        sandboxDesc
      );
    } catch {
      return null;
    }
  }, [sandboxDomain, sandboxName, sandboxDesc]);

  const handleSelectPreset = (preset) => {
    setSandboxDomain(preset.domain);
    setSandboxName(preset.name);
    setSandboxDesc(preset.desc);
  };

  const heroItem = HERO_TABS[activeHeroTab];

  return (
    <div className="min-h-screen bg-canvas text-fg selection:bg-accent/30 selection:text-fg">
      {/* Subtle background ambient mesh */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[1200px] h-[600px] bg-accent/8 blur-[140px] rounded-full" />
        <div className="absolute top-[35%] right-[-10%] w-[700px] h-[450px] bg-ai/5 blur-[130px] rounded-full" />
        <div className="absolute bottom-[20%] left-[-10%] w-[600px] h-[400px] bg-ok/5 blur-[120px] rounded-full" />
      </div>

      {/* Navigation Header */}
      <header className="sticky top-0 z-40 border-b border-line bg-canvas/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-[1720px] items-center justify-between px-6 sm:px-10 lg:px-12 2xl:px-16">
          <div className="flex items-center gap-6">
            <a href="/" className="flex items-center gap-2.5 text-sm font-semibold tracking-tight hover:opacity-90 transition-opacity">
              <ShieldMark size={24} />
              <span className="font-bold tracking-wider text-base">SURAKSHA</span>
              <span className="hidden sm:inline-flex items-center rounded-full border border-ok/30 bg-ok/10 px-2 py-0.5 text-[10px] font-medium text-ok tracking-wide">
                <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-ok animate-pulse" />
                DEFENSE MATRIX ACTIVE
              </span>
            </a>
          </div>

          <nav className="hidden lg:flex items-center gap-7 text-xs font-medium text-fgMuted">
            <a href="#vectors" className="hover:text-fg transition-colors">Attack Vectors</a>
            <a href="#sandbox" className="hover:text-fg transition-colors">Live Sandbox</a>
            <a href="#login-gateway" className="hover:text-fg transition-colors">Login Gateway</a>
            <a href="#inner-workspace" className="hover:text-fg transition-colors">Inner Command Center</a>
            <a href="#epistemic" className="hover:text-fg transition-colors">Rules vs ML</a>
            <a href="#lifecycle" className="hover:text-fg transition-colors">Analyst Loop</a>
            <a href="#measured" className="hover:text-fg transition-colors">Audit Benchmarks</a>
          </nav>

          <div className="flex items-center gap-3">
            {onReplayIntro && (
              <button
                onClick={onReplayIntro}
                title="Replay Brand Intro"
                className="hidden sm:inline-flex items-center gap-1.5 text-xs text-fgSubtle hover:text-fg transition-colors px-2.5 py-1.5 rounded border border-line bg-surface hover:bg-surface3"
              >
                <Play className="h-3 w-3" />
                Intro
              </button>
            )}
            <button
              onClick={() => open({ mode: 'login' })}
              className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-xs font-semibold text-onAccent shadow-sm transition-[transform,background-color] duration-150 hover:bg-accentHover active:scale-95"
            >
              Launch Workspace
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        {/* HERO SECTION */}
        <section className="mx-auto w-full max-w-[1720px] px-6 sm:px-10 lg:px-12 2xl:px-16 pb-16 pt-16 sm:pt-24 lg:pt-28">
          <div className="grid lg:grid-cols-12 gap-10 xl:gap-14 items-center">
            {/* Left Hero Pitch */}
            <div className="lg:col-span-7 xl:col-span-7 sk-stagger">
              <div className="inline-flex items-center gap-2 rounded-full border border-line bg-surface2/80 px-3 py-1 text-xs font-medium text-fgMuted">
                <Shield className="h-3.5 w-3.5 text-accent" />
                <span className="text-fg font-semibold">Autonomous Brand Defense</span>
                <span className="text-fgSubtle">·</span>
                <span className="text-fgSubtle">Evidence-based verification</span>
              </div>

              <h1 className="mt-4 text-4xl sm:text-6xl xl:text-7xl font-bold leading-[1.08] tracking-tight text-fg">
                Find Brand Impersonators.{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent via-ai to-ok">
                  Prove Every Finding.
                </span>
              </h1>

              <p className="mt-5 max-w-2xl text-base sm:text-lg text-fgMuted leading-relaxed">
                SURAKSHA continuously safeguards your registered domains, social accounts, and mobile apps against deceptive lookalikes—delivering mathematical homoglyph decomposition, deterministic asset exclusion, and court-ready evidence.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <button
                  onClick={() => open({ mode: 'login' })}
                  className="group inline-flex items-center gap-2 rounded-md bg-accent px-6 py-3.5 text-sm font-semibold text-onAccent shadow-md transition-[transform,background-color] duration-150 hover:bg-accentHover active:scale-[0.98]"
                >
                  Launch Workspace Console
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                </button>
                <a
                  href="#sandbox"
                  className="inline-flex items-center gap-2 rounded-md border border-line bg-surface/70 px-6 py-3.5 text-sm font-medium text-fgMuted transition-colors hover:bg-surface3 hover:text-fg"
                >
                  <Terminal className="h-4 w-4 text-fgSubtle" />
                  Try Live Sandbox
                </a>
                <a
                  href="#login-gateway"
                  className="inline-flex items-center gap-2 rounded-md border border-line/60 bg-surface2/50 px-5 py-3.5 text-sm font-medium text-fgSubtle transition-colors hover:bg-surface3 hover:text-fg"
                >
                  <KeyRound className="h-4 w-4 text-accent" />
                  View Login Portal
                </a>
              </div>

              {/* Trust Indicators */}
              <div className="mt-10 grid grid-cols-3 gap-4 border-t border-line/70 pt-6">
                <div>
                  <p className="text-xs font-semibold text-fg">100% Deterministic</p>
                  <p className="text-[11px] text-fgSubtle mt-0.5">Verified asset exclusion</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-fg">UTS #39 Homoglyphs</p>
                  <p className="text-[11px] text-fgSubtle mt-0.5">Unicode confusable analysis</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-fg">RFC 2142 Ready</p>
                  <p className="text-[11px] text-fgSubtle mt-0.5">Instant abuse takedown export</p>
                </div>
              </div>
            </div>

            {/* Right Hero: Interactive Threat Dossier Console */}
            <div className="lg:col-span-5 xl:col-span-5">
              <div className="rounded-xl border border-line bg-surface/95 p-5 shadow-2xl backdrop-blur-md space-y-4">
                {/* Console Tab Selector */}
                <div className="flex items-center justify-between border-b border-line pb-3">
                  <div className="flex items-center gap-1.5 overflow-x-auto">
                    {HERO_TABS.map((tab, idx) => {
                      const Icon = tab.icon;
                      const active = activeHeroTab === idx;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setActiveHeroTab(idx)}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                            active
                              ? 'bg-surface3 text-fg font-semibold shadow-sm'
                              : 'text-fgSubtle hover:text-fg hover:bg-surface2'
                          }`}
                        >
                          <Icon className="h-3 w-3" />
                          <span>{tab.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  <span className="text-[10px] font-mono text-fgSubtle shrink-0 ml-2">SIMULATED DOSSIER</span>
                </div>

                {/* Threat Header */}
                <div className="flex items-center justify-between">
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-semibold border ${heroItem.badgeColor}`}>
                    <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
                    {heroItem.badge}
                  </span>
                  <span className="text-xs font-mono text-fgSubtle">Target: <strong className="text-fg">{heroItem.target}</strong></span>
                </div>

                {/* Candidate Information */}
                <div className="rounded-lg border border-line bg-surface2/80 p-3 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-fgSubtle font-medium">Candidate Asset:</span>
                    <span className="font-mono font-semibold text-fg truncate max-w-[240px]">{heroItem.candidate}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-fgSubtle font-medium">Observed Display:</span>
                    <span className="font-mono text-danger font-medium truncate max-w-[240px]">{heroItem.display}</span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-line/60">
                    <span className="text-fgSubtle font-medium">Engine Severity:</span>
                    <span className="font-semibold text-fg">{heroItem.riskLevel}</span>
                  </div>
                </div>

                {/* Fired Signals Box */}
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between text-[11px] font-medium uppercase tracking-wider text-fgSubtle">
                    <span>Evidence Signals Fired</span>
                    <span className="text-[10px] text-ai font-mono">UTS#39 + ML</span>
                  </div>
                  <div className="space-y-1.5 rounded-lg border border-line bg-surface2/50 p-2.5">
                    {heroItem.signals.map((sig, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-fgMuted">
                        <span className={`mt-0.5 text-xs ${sig.type === 'danger' ? 'text-danger' : sig.type === 'high' ? 'text-high' : 'text-ai'}`}>
                          ●
                        </span>
                        <span className="leading-snug">{sig.text}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Epistemic Provenance Footer */}
                <div className="pt-2 border-t border-line flex items-center justify-between text-xs">
                  <span className="text-[11px] text-fgSubtle font-medium truncate max-w-[220px]" title={heroItem.epistemic}>
                    {heroItem.epistemic}
                  </span>
                  <button
                    onClick={() => open({ mode: 'login' })}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline cursor-pointer"
                  >
                    Investigate →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3 CORE DEFENSE PILLARS */}
        <Section
          id="vectors"
          eyebrow="Coverage Matrix"
          title="Three pillars of digital brand defense."
          subtitle="Modern adversaries exploit domains, social handles, and mobile apps in synchronized campaigns. SURAKSHA monitors all three vectors through unified telemetry."
        >
          <div className="grid gap-6 md:grid-cols-3">
            <Reveal className="rounded-2xl border border-line bg-surface p-6 sm:p-8 sk-lift flex flex-col justify-between">
              <div>
                <div className="h-10 w-10 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent mb-4">
                  <Globe className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold text-fg">Domain & Lookalike Engine</h3>
                <p className="mt-2 text-sm text-fgMuted leading-relaxed">
                  Deep inspection of lookalike domains, punycode IDNs, deceptive TLD combinations, and combosquatting stems. Detects sub-character Unicode homoglyphs that evade traditional string matching.
                </p>
              </div>
              <ul className="mt-6 space-y-2 border-t border-line/60 pt-4 text-xs text-fgMuted">
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-ok" /> UTS #39 Unicode confusable tables</li>
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-ok" /> Levenshtein & Damerau edit distance</li>
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-ok" /> Subdomain brand prefix hijack alerts</li>
              </ul>
            </Reveal>

            <Reveal delay={90} className="rounded-2xl border border-line bg-surface p-6 sm:p-8 sk-lift flex flex-col justify-between">
              <div>
                <div className="h-10 w-10 rounded-lg bg-high/10 border border-high/20 flex items-center justify-center text-high mb-4">
                  <Share2 className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold text-fg">Social Media Sentinel</h3>
                <p className="mt-2 text-sm text-fgMuted leading-relaxed">
                  Cross-references suspected social accounts across X, Instagram, LinkedIn, and YouTube against your verified brand profile. Flags dangerous redirect links to Telegram bots and unverified payment gateways.
                </p>
              </div>
              <ul className="mt-6 space-y-2 border-t border-line/60 pt-4 text-xs text-fgMuted">
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-ok" /> Handle vs registered URL mismatch traps</li>
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-ok" /> High-risk lure phrase pattern mining</li>
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-ok" /> Zero false positives on registered channels</li>
              </ul>
            </Reveal>

            <Reveal delay={180} className="rounded-2xl border border-line bg-surface p-6 sm:p-8 sk-lift flex flex-col justify-between">
              <div>
                <div className="h-10 w-10 rounded-lg bg-ai/10 border border-ai/20 flex items-center justify-center text-ai mb-4">
                  <Smartphone className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold text-fg">Rogue Mobile App Guard</h3>
                <p className="mt-2 text-sm text-fgMuted leading-relaxed">
                  Audits sideloaded Android APK packages and alternative app stores for brand spoofing. Compares cryptographic developer signatures and package names to protect users from credential-stealing trojans.
                </p>
              </div>
              <ul className="mt-6 space-y-2 border-t border-line/60 pt-4 text-xs text-fgMuted">
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-ok" /> Package namespace spoofing checks</li>
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-ok" /> Developer certificate verification</li>
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-ok" /> Store metadata & trademark scrutiny</li>
              </ul>
            </Reveal>
          </div>
        </Section>

        {/* SECTION 1: LOGIN & IDENTITY GATEWAY (SHOWCASING LOGIN PORTAL IMAGE) */}
        <Section
          id="login-gateway"
          eyebrow="Authentication & Access Control"
          title="Enterprise login portal with zero data leakage."
          subtitle="Engineered for threat intelligence teams and cyber risk analysts. Instant Google Workspace SSO, role-based access control, and a zero-credential isolated demo sandbox."
        >
          <div className="grid lg:grid-cols-12 gap-8 xl:gap-12 items-center">
            {/* Left: Login Features & Details */}
            <div className="lg:col-span-5 space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-accent">
                  <KeyRound className="h-4 w-4" />
                  <span>Secure Analyst Authentication</span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-fg">
                  Frictionless Sign-In. Enterprise Session Security.
                </h3>
                <p className="text-sm text-fgMuted leading-relaxed">
                  SURAKSHA's identity gateway enforces enterprise security policies while giving security researchers instant access to isolated sandbox environments without risking production brand assets.
                </p>
              </div>

              <div className="space-y-3.5">
                <div className="rounded-xl border border-line bg-surface p-4 flex items-start gap-3.5">
                  <div className="h-8 w-8 rounded-lg bg-accent/15 border border-accent/25 flex items-center justify-center text-accent shrink-0 mt-0.5">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-fg">Google & SAML Enterprise SSO</h4>
                    <p className="text-xs text-fgMuted mt-0.5 leading-relaxed">
                      Authenticate with your organization's Google Workspace or SAML 2.0 identity provider with one click.
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-line bg-surface p-4 flex items-start gap-3.5">
                  <div className="h-8 w-8 rounded-lg bg-ok/15 border border-ok/25 flex items-center justify-center text-ok shrink-0 mt-0.5">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-fg">Isolated Demo Sandbox Mode</h4>
                    <p className="text-xs text-fgMuted mt-0.5 leading-relaxed">
                      Evaluate full platform capabilities without credentials. Populates pre-configured synthetic findings in an isolated session.
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-line bg-surface p-4 flex items-start gap-3.5">
                  <div className="h-8 w-8 rounded-lg bg-ai/15 border border-ai/25 flex items-center justify-center text-ai shrink-0 mt-0.5">
                    <Lock className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-fg">Zero-Leakage Session Storage</h4>
                    <p className="text-xs text-fgMuted mt-0.5 leading-relaxed">
                      Local-first session security. Cryptographically signed tokens expire automatically, protecting analyst workstations.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap gap-3">
                <button
                  onClick={() => open({ mode: 'login' })}
                  className="inline-flex items-center gap-2 rounded-md bg-accent px-5 py-3 text-xs font-semibold text-onAccent shadow-md hover:bg-accentHover transition-colors"
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  Open Login Portal
                </button>
                <button
                  onClick={() => open({ mode: 'signup' })}
                  className="inline-flex items-center gap-2 rounded-md border border-line bg-surface2 px-5 py-3 text-xs font-medium text-fg hover:bg-surface3 transition-colors"
                >
                  Create Analyst Account
                </button>
              </div>
            </div>

            {/* Right: Actual UI Image of the Login Portal */}
            <div className="lg:col-span-7">
              <div className="relative rounded-2xl border border-line bg-surface/90 p-2 shadow-2xl overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-tr from-accent/10 via-transparent to-ai/10 pointer-events-none" />
                <div className="overflow-hidden rounded-xl border border-line/80">
                  <img
                    src="/suraksha_login_portal.png"
                    alt="SURAKSHA Secure Authentication & Login Portal Interface"
                    className="w-full h-auto object-cover transform transition-transform duration-500 group-hover:scale-[1.02]"
                    loading="lazy"
                  />
                </div>
                {/* Floating overlay chip */}
                <div className="absolute bottom-5 left-5 right-5 sm:right-auto flex items-center gap-2 rounded-lg border border-line/90 bg-surface/95 px-3 py-2 text-xs backdrop-blur-md shadow-lg">
                  <span className="h-2 w-2 rounded-full bg-ok animate-pulse" />
                  <span className="text-fg font-medium">Authentication Gateway</span>
                  <span className="text-fgSubtle">·</span>
                  <span className="text-fgSubtle font-mono text-[11px]">OAuth 2.0 / Firebase Auth</span>
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* SECTION 2: THE INNER PART (SHOWCASING INNER DASHBOARD / DETECT DOMAIN IMAGE) */}
        <Section
          id="inner-workspace"
          eyebrow="Authenticated Workspace View"
          title="The Analyst Command Center: Inside the Workspace."
          subtitle="Explore the inner cockpit of SURAKSHA after login: Candidate Asset Test Bench, Levenshtein edit distance heuristics, Unicode homoglyph detection, and protected allowlist baselines."
        >
          <div className="grid lg:grid-cols-12 gap-8 xl:gap-12 items-center">
            {/* Left: Actual UI Image of the Inner Dashboard */}
            <div className="lg:col-span-7 order-2 lg:order-1">
              <div className="relative rounded-2xl border border-line bg-surface/90 p-2 shadow-2xl overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-tr from-ok/10 via-transparent to-accent/10 pointer-events-none" />
                <div className="overflow-hidden rounded-xl border border-line/80">
                  <img
                    src="/suraksha_inner_dashboard.png"
                    alt="SURAKSHA Command Center Inner Workspace Interface"
                    className="w-full h-auto object-cover transform transition-transform duration-500 group-hover:scale-[1.02]"
                    loading="lazy"
                  />
                </div>
                {/* Floating overlay chip */}
                <div className="absolute bottom-5 left-5 right-5 sm:right-auto flex items-center gap-2 rounded-lg border border-line/90 bg-surface/95 px-3 py-2 text-xs backdrop-blur-md shadow-lg">
                  <span className="h-2 w-2 rounded-full bg-ok animate-pulse" />
                  <span className="text-fg font-medium">Workspace Active</span>
                  <span className="text-fgSubtle">·</span>
                  <span className="text-fgSubtle font-mono text-[11px]">Detect › Check a domain</span>
                </div>
              </div>
            </div>

            {/* Right: Inner Part Modules & Capabilities */}
            <div className="lg:col-span-5 order-1 lg:order-2 space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ok">
                  <LayoutDashboard className="h-4 w-4" />
                  <span>Inner Operational Cockpit</span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-fg">
                  Unified Domain Similarity & Heuristic Analysis
                </h3>
                <p className="text-sm text-fgMuted leading-relaxed">
                  Inside SURAKSHA after sign in, analysts interact directly with the multi-vector detection engine. Suspected domains and brand assets are evaluated locally in real-time against verified corporate allowlists.
                </p>
              </div>

              <div className="space-y-3.5">
                <div className="rounded-xl border border-line bg-surface p-4 flex items-start gap-3.5">
                  <div className="h-8 w-8 rounded-lg bg-accent/15 border border-accent/25 flex items-center justify-center text-accent shrink-0 mt-0.5">
                    <Activity className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-fg">Candidate Asset Test Bench</h4>
                    <p className="text-xs text-fgMuted mt-0.5 leading-relaxed">
                      Instant evaluation of Levenshtein edit distance, Cyrillic homoglyphs, subdomain abuse, and lure keywords.
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-line bg-surface p-4 flex items-start gap-3.5">
                  <div className="h-8 w-8 rounded-lg bg-ok/15 border border-ok/25 flex items-center justify-center text-ok shrink-0 mt-0.5">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-fg">Protected Brand Baseline</h4>
                    <p className="text-xs text-fgMuted mt-0.5 leading-relaxed">
                      Verified corporate domains and social handles are registered and excluded from false-positive alert queues.
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-line bg-surface p-4 flex items-start gap-3.5">
                  <div className="h-8 w-8 rounded-lg bg-ai/15 border border-ai/25 flex items-center justify-center text-ai shrink-0 mt-0.5">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-fg">Explainable Evidence & Signals</h4>
                    <p className="text-xs text-fgMuted mt-0.5 leading-relaxed">
                      Every verdict provides granular signals supporting or contradicting malicious impersonation.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap gap-3">
                <button
                  onClick={() => open({ mode: 'login' })}
                  className="inline-flex items-center gap-2 rounded-md bg-accent px-5 py-3 text-xs font-semibold text-onAccent shadow-md hover:bg-accentHover transition-colors"
                >
                  <LayoutDashboard className="h-3.5 w-3.5" />
                  Launch Inner Workspace
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </Section>

        {/* INTERACTIVE DETECTION SANDBOX SECTION */}
        <Section
          id="sandbox"
          eyebrow="Interactive Threat Sandbox"
          title="Test any candidate domain in real time."
          subtitle="Experience SURAKSHA's client-side rule evaluation engine. No static mockups—this executes the actual homoglyph decomposition and typosquatting pipeline directly in your browser."
        >
          <div className="grid lg:grid-cols-12 gap-8 items-start">
            {/* Input & Presets Column */}
            <div className="lg:col-span-5 space-y-4">
              <div className="rounded-xl border border-line bg-surface p-5 space-y-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-fgSubtle">
                    Candidate Domain to Inspect
                  </label>
                  <div className="relative mt-2">
                    <input
                      type="text"
                      value={sandboxDomain}
                      onChange={(e) => setSandboxDomain(e.target.value)}
                      placeholder="e.g. аcme-portal.com"
                      className="w-full rounded-md border border-line bg-surface2 px-3.5 py-2.5 text-sm font-mono text-fg placeholder:text-fgSubtle focus:border-accent focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-fgSubtle">
                    Candidate Display Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={sandboxName}
                    onChange={(e) => setSandboxName(e.target.value)}
                    placeholder="e.g. Acme Support Desk"
                    className="mt-2 w-full rounded-md border border-line bg-surface2 px-3.5 py-2 text-sm text-fg placeholder:text-fgSubtle focus:border-accent focus:outline-none"
                  />
                </div>

                {/* Benchmark Presets */}
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-fgSubtle block mb-2">
                    Quick Benchmark Scenarios
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {SANDBOX_PRESETS.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => handleSelectPreset(preset)}
                        className={`text-xs px-2.5 py-1.5 rounded-md border transition-colors ${
                          sandboxDomain === preset.domain
                            ? 'border-accent bg-accent/15 text-accent font-semibold'
                            : 'border-line bg-surface2 text-fgMuted hover:text-fg hover:border-fgSubtle'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="text-[11px] text-fgSubtle border-t border-line/60 pt-3 flex items-center justify-between">
                  <span>Protected Brand: <strong className="text-fg font-mono">Acme Corp</strong></span>
                  <span>Evaluated against 4 official domains</span>
                </div>
              </div>
            </div>

            {/* Live Engine Output Card */}
            <div className="lg:col-span-7">
              {sandboxAnalysis ? (
                <div className="rounded-xl border border-line bg-surface p-6 shadow-xl space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-mono font-bold ${
                          sandboxAnalysis.overallRiskCategory === 'Critical'
                            ? 'bg-danger/15 text-danger border border-danger/30'
                            : sandboxAnalysis.overallRiskCategory === 'High'
                            ? 'bg-high/15 text-high border border-high/30'
                            : sandboxAnalysis.overallRiskCategory === 'Medium'
                            ? 'bg-warn/15 text-warn border border-warn/30'
                            : 'bg-ok/15 text-ok border border-ok/30'
                        }`}>
                          {sandboxAnalysis.overallRiskCategory.toUpperCase()} RISK
                        </span>
                        <span className="text-xs font-mono text-fgSubtle">
                          Threat Score: <strong className="text-fg text-sm">{sandboxAnalysis.overallScore}/100</strong>
                        </span>
                      </div>
                      <p className="text-xs text-fgMuted mt-1">
                        Recommended Action: <strong className="text-fg">{sandboxAnalysis.recommendedAction}</strong>
                      </p>
                    </div>

                    <button
                      onClick={() => open({ mode: 'login' })}
                      className="inline-flex items-center gap-1.5 rounded bg-accent px-3 py-1.5 text-xs font-semibold text-onAccent hover:bg-accentHover transition-colors"
                    >
                      Dossier in Workspace <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>

                  {/* Character Diffs / Homoglyph Breakdown */}
                  {sandboxAnalysis.characterDiffs && sandboxAnalysis.characterDiffs.length > 0 && (
                    <div className="rounded-lg border border-danger/30 bg-danger/5 p-3.5 space-y-2">
                      <div className="flex items-center justify-between text-xs font-semibold text-danger">
                        <span className="flex items-center gap-1.5">
                          <AlertTriangle className="h-4 w-4" />
                          Unicode Homoglyph Substitution Detected
                        </span>
                        <span className="font-mono text-[11px]">{sandboxAnalysis.characterDiffs.length} confusable glyph(s)</span>
                      </div>
                      <div className="space-y-1 text-xs">
                        {sandboxAnalysis.characterDiffs.map((diff, idx) => (
                          <div key={idx} className="flex items-center justify-between bg-surface/80 rounded px-2.5 py-1 font-mono text-[11px]">
                            <span>
                              Char <span className="text-danger font-bold">'{diff.substituted}'</span> replaces Latin <span className="text-ok font-bold">'{diff.original}'</span>
                            </span>
                            <span className="text-fgSubtle">{diff.explanation}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Fired Signals List */}
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-fgSubtle mb-2">
                      Deterministic Signals Triggered ({sandboxAnalysis.signals.length})
                    </h4>
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {sandboxAnalysis.signals.map((sig) => (
                        <div key={sig.id} className="rounded-md border border-line bg-surface2/60 p-3 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-fg flex items-center gap-1.5">
                              <span className={`h-1.5 w-1.5 rounded-full ${
                                sig.severity === 'critical' ? 'bg-danger' : sig.severity === 'high' ? 'bg-high' : 'bg-warn'
                              }`} />
                              {sig.title}
                            </span>
                            <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-surface3 text-fgSubtle">
                              {sig.category}
                            </span>
                          </div>
                          <p className="text-fgMuted leading-relaxed">{sig.detail}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Summary Provenance */}
                  <div className="text-[11px] text-fgSubtle border-t border-line/60 pt-3 flex items-center justify-between">
                    <span>Damerau-Levenshtein: <strong className="text-fg font-mono">{sandboxAnalysis.damerauDistance}</strong></span>
                    <span>Name Similarity: <strong className="text-fg font-mono">{sandboxAnalysis.nameSimilarityScore}%</strong></span>
                    <span>Domain Similarity: <strong className="text-fg font-mono">{sandboxAnalysis.domainSimilarityScore}%</strong></span>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-line bg-surface p-8 text-center text-fgMuted">
                  Type a candidate domain on the left to run live signal analysis.
                </div>
              )}
            </div>
          </div>
        </Section>

        {/* EPISTEMIC ARCHITECTURE SECTION */}
        <Section
          id="epistemic"
          eyebrow="Epistemic Architecture"
          title="Two kinds of signal, never blended."
          subtitle="Rules decide severity. Machine learning is supporting context. Official assets are categorically whitelisted. We never let probabilistic models make unchecked verdicts."
        >
          <div className="grid gap-6 md:grid-cols-2">
            <Reveal className="rounded-2xl border border-line bg-surface p-6 sm:p-8 sk-lift space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-semibold text-accent uppercase tracking-wider">Deterministic Engine</span>
                <span className="text-[11px] font-mono text-fgSubtle">Verdicts & Severity</span>
              </div>
              <h3 className="text-xl font-bold text-fg">Rule-Based Engines</h3>
              <p className="text-sm text-fgMuted leading-relaxed">
                Lookalike similarity, homoglyphs and punycode, lure words, URL structure, and verified-asset exclusion. Every signal names the exact rule that fired, so an analyst or legal officer can inspect and prove it in court.
              </p>
              <div className="rounded-lg border border-line bg-surface2/60 p-4 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-fg">
                  <CheckCircle2 className="h-4 w-4 text-ok" />
                  <span>100% reproducible and verifiable by an analyst</span>
                </div>
                <div className="flex items-center gap-2 text-fg">
                  <CheckCircle2 className="h-4 w-4 text-ok" />
                  <span>Legally sound for ICANN UDRP and DMCA filings</span>
                </div>
                <div className="flex items-center gap-2 text-fg">
                  <CheckCircle2 className="h-4 w-4 text-ok" />
                  <span>Guaranteed zero false alarms for registered assets</span>
                </div>
              </div>
            </Reveal>

            <Reveal delay={120} className="rounded-2xl border border-line bg-surface p-6 sm:p-8 sk-lift space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-semibold text-ai uppercase tracking-wider">Supporting Context</span>
                <span className="text-[11px] font-mono text-fgSubtle">Triage & Prioritization</span>
              </div>
              <h3 className="text-xl font-bold text-fg">Trained Statistical Models</h3>
              <p className="text-sm text-fgMuted leading-relaxed">
                Reported alongside findings as uncalibrated supporting evidence. A model score helps sort queue priority, but never overrides a verified official asset and never alters an epistemic fact.
              </p>
              <div className="rounded-lg border border-line bg-surface2/60 p-4 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-fg">
                  <CheckCircle2 className="h-4 w-4 text-ai" />
                  <span>Deep neural representations of lexical URL structure</span>
                </div>
                <div className="flex items-center gap-2 text-fg">
                  <CheckCircle2 className="h-4 w-4 text-ai" />
                  <span>Probability weights for analyst triage queue ranking</span>
                </div>
                <div className="flex items-center gap-2 text-fg">
                  <CheckCircle2 className="h-4 w-4 text-ai" />
                  <span>Openly documented offline benchmarks and baselines</span>
                </div>
              </div>
            </Reveal>
          </div>
        </Section>

        {/* THE 5-STEP LIFECYCLE */}
        <Section
          id="lifecycle"
          eyebrow="The Defense Loop"
          title="Most tools stop at the alert. SURAKSHA starts there."
          subtitle="From initial discovery to evidence dossier and registrar takedown, SURAKSHA provides an unbroken chain of custody for security analysts."
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {LOOP.map((step, i) => {
              const Icon = step.icon;
              return (
                <Reveal as="div" key={step.step} delay={i * 80} className="rounded-2xl border border-line bg-surface p-5 sk-lift flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-accent">{step.step}</span>
                      <Icon className="h-4 w-4 text-fgSubtle" />
                    </div>
                    <h3 className="mt-3 text-base font-semibold text-fg">{step.title}</h3>
                    <p className="mt-2 text-xs text-fgMuted leading-relaxed">{step.desc}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </Section>

        {/* FROZEN AUDIT BENCHMARKS SECTION */}
        <Section
          id="measured"
          eyebrow="Frozen Benchmark Evaluation"
          title="Numbers you can check, including the unflattering ones."
          subtitle="We believe digital brand protection demands complete scientific honesty. These figures are from a leakage-safe, domain-grouped evaluation on frozen October 2026 test sets."
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {MEASURED.map((m, i) => (
              <Reveal key={m.label} delay={i * 90} className="rounded-2xl border border-line bg-surface p-5 sk-lift flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-fgSubtle">{m.label}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface2 text-accent border border-accent/20">
                      {m.badge}
                    </span>
                  </div>
                  <p className="mt-3 text-3xl sm:text-4xl font-bold font-mono text-fg tracking-tight">
                    <CountUp value={m.value} />
                  </p>
                  <p className="mt-1 text-xs font-medium text-fg">{m.sub}</p>
                  <p className="mt-2 text-xs text-fgMuted leading-relaxed">{m.note}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <div className="mt-6 rounded-lg border border-line bg-surface2/60 p-4 text-xs text-fgMuted leading-relaxed flex items-start gap-2.5">
            <Lock className="h-4 w-4 text-fgSubtle shrink-0 mt-0.5" />
            <span>
              URL results are derived from an offline frozen test set of 2,210 hosts evaluated under strictly disjoint domain grouping. Social media and mobile app detection operates through verified asset registries and deterministic rule engines rather than speculative synthetic labels.
            </span>
          </div>
        </Section>

        {/* CALL TO ACTION SECTION */}
        <section className="border-t border-line bg-surface/40">
          <div className="mx-auto max-w-[1720px] px-6 sm:px-10 lg:px-12 2xl:px-16 py-16 sm:py-20">
            <Reveal className="rounded-3xl border border-line bg-gradient-to-b from-surface to-surface2 p-8 sm:p-12 text-center max-w-4xl mx-auto shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-32 bg-accent/15 blur-3xl pointer-events-none" />
              
              <div className="relative z-10 space-y-4">
                <ShieldMark size={48} className="mx-auto" />
                <h2 className="text-3xl sm:text-4xl font-bold text-fg tracking-tight">
                  Protect Your Brand Infrastructure Today
                </h2>
                <p className="max-w-xl mx-auto text-sm sm:text-base text-fgMuted leading-relaxed">
                  Start by registering the domains, handles, and apps that are really yours. Eliminate blind spots and automate your threat response workflow.
                </p>
                <div className="pt-4 flex flex-wrap justify-center gap-3">
                  <button
                    onClick={() => open({ mode: 'login' })}
                    className="group inline-flex items-center gap-2 rounded-md bg-accent px-7 py-3.5 text-sm font-semibold text-onAccent shadow-lg transition-[transform,background-color] duration-150 hover:bg-accentHover active:scale-[0.98]"
                  >
                    Open SURAKSHA Console
                    <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                  </button>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-line bg-canvas">
        <div className="mx-auto max-w-[1720px] px-6 sm:px-10 lg:px-12 2xl:px-16 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8 text-xs">
            <div>
              <div className="flex items-center gap-2 font-bold text-sm tracking-tight text-fg mb-3">
                <ShieldMark size={20} />
                SURAKSHA
              </div>
              <p className="text-fgSubtle leading-relaxed">
                Autonomous Digital Brand Protection & Epistemic Verification for enterprise security analysts.
              </p>
            </div>
            <div>
              <h5 className="font-semibold text-fg uppercase tracking-wider text-[11px] mb-3">Capabilities</h5>
              <ul className="space-y-2 text-fgMuted">
                <li><a href="#vectors" className="hover:text-fg transition-colors">Lookalike Domain Engine</a></li>
                <li><a href="#vectors" className="hover:text-fg transition-colors">Social Impersonator Guard</a></li>
                <li><a href="#vectors" className="hover:text-fg transition-colors">Rogue Mobile App Scanner</a></li>
                <li><a href="#sandbox" className="hover:text-fg transition-colors">Live Interactive Sandbox</a></li>
              </ul>
            </div>
            <div>
              <h5 className="font-semibold text-fg uppercase tracking-wider text-[11px] mb-3">Methodology & Gateway</h5>
              <ul className="space-y-2 text-fgMuted">
                <li><a href="#login-gateway" className="hover:text-fg transition-colors">Authentication Gateway</a></li>
                <li><a href="#inner-workspace" className="hover:text-fg transition-colors">Inner Command Center</a></li>
                <li><a href="#epistemic" className="hover:text-fg transition-colors">Epistemic Rule Engine</a></li>
                <li><a href="#measured" className="hover:text-fg transition-colors">Frozen Evaluation Sets</a></li>
              </ul>
            </div>
            <div>
              <h5 className="font-semibold text-fg uppercase tracking-wider text-[11px] mb-3">Workspace</h5>
              <ul className="space-y-2 text-fgMuted">
                <li><button onClick={() => open({ mode: 'login' })} className="hover:text-fg transition-colors">Sign In / Register</button></li>
                <li><button onClick={() => open({ mode: 'login', tab: 'lookalike' })} className="hover:text-fg transition-colors">Domain Watchtower</button></li>
                <li><button onClick={() => open({ mode: 'login', tab: 'investigations' })} className="hover:text-fg transition-colors">Investigation Center</button></li>
                {onReplayIntro && (
                  <li><button onClick={onReplayIntro} className="hover:text-fg transition-colors">Replay Brand Intro</button></li>
                )}
              </ul>
            </div>
          </div>

          <div className="border-t border-line/60 pt-6 flex flex-wrap items-center justify-between gap-4 text-xs text-fgSubtle">
            <span>© 2026 SURAKSHA Brand Protection Platform. Findings are advisory and support human analyst decision-making.</span>
            <div className="flex items-center gap-4">
              <span className="font-mono">v2.0.4-freeze</span>
              <span className="h-1 w-1 rounded-full bg-fgSubtle" />
              <span>Leakage-Safe Architecture</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
