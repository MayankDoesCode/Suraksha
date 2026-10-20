import React, { useState, useMemo } from 'react';
import {
  ArrowRight,
  ShieldCheck,
  Share2,
  Smartphone,
  Globe,
  AlertTriangle,
  Check,
  X,
  Play,
  Scale,
  Cpu,
  ScanSearch,
  FileCheck2,
  UserCheck,
  Building2,
} from 'lucide-react';
import { ShieldMark } from '../ShieldMark';
import GetApp from './GetApp';
import HomoglyphSpecimen from './HomoglyphSpecimen';
import { Reveal, CountUp } from './Reveal';
import { runFullLookalikeAnalysis } from '../../utils/lookalikeEngine';
import { INITIAL_BRAND_PROFILE } from '../../data/demoData';

/**
 * Public landing page ("night watch" theme).
 * One bold moment (the homoglyph scanner in the hero); every section after it is quiet and factual.
 * The scanner section runs the real client-side lookalike engine against the demo brand profile.
 */

const ICON = { strokeWidth: 1.75 };

const SANDBOX_PRESETS = [
  { label: 'Cyrillic homoglyph', domain: 'аcme.com', name: 'Acme Secure Portal', desc: 'Spoofs Latin "a" with Cyrillic U+0430 to mimic official login portal' },
  { label: 'Subdomain abuse', domain: 'acme.claims-portal.com', name: 'Acme Claims Desk', desc: 'Embeds brand name as subdomain prefix under rogue host claims-portal.com' },
  { label: 'Combosquat lure', domain: 'acme-refund-desk.xyz', name: 'Acme Customer Support', desc: 'Appends urgency lure keywords with cheap high-risk TLD' },
  { label: 'Typosquat', domain: 'acmee.com', name: 'Acme Access', desc: 'Omission or character duplication typo with Damerau-Levenshtein edit distance of 1' },
  { label: 'Official asset', domain: 'acme.com', name: 'Acme Official', desc: 'Verified registered domain in the protected brand profile' },
];

// Examples the demo workspace detects. Shown once, in the ticker under the hero.
const TICKER = [
  { text: 'аcme.com', kind: 'Cyrillic homoglyph', sev: 'danger' },
  { text: '@acme_refund_helpdesk', kind: 'Fake support account', sev: 'danger' },
  { text: 'com.acme.instant.wallet', kind: 'Copycat app', sev: 'danger' },
  { text: 'acme-refund-desk.xyz', kind: 'Lure keywords', sev: 'high' },
  { text: '@acrne_official', kind: 'rn reads as m', sev: 'high' },
  { text: 'acme.claims-portal.com', kind: 'Brand in subdomain', sev: 'high' },
  { text: 'Acme Pro: Fast Cash Loan', kind: 'Logo copied on icon', sev: 'danger' },
  { text: 'acmee.com', kind: 'One-letter typo', sev: 'warn' },
];
const SEV = { danger: 'text-danger', high: 'text-high', warn: 'text-warn' };

const MEASURED = [
  { value: '42%', label: 'of phishing hosts caught by the URL model at 95% precision', note: 'Frozen test set of 2,210 bare-domain hosts.' },
  { value: '0.87 F1', label: 'from a format-only baseline with no content at all', note: 'The trained model scores 0.90. We publish the gap.' },
  { value: '0', label: 'verified social-impersonation training labels exist', note: 'So social verdicts come from rules and the brand registry, not a guess.' },
  { value: '0', label: 'verified malicious app clones in public benchmarks', note: 'App checks use publisher, package id, icon and description evidence.' },
];

const STEPS = [
  { icon: Building2, title: 'Register what is really yours', body: 'Official domains, handles, apps, logo and partners become the ground truth. They are excluded before any check runs.' },
  { icon: ScanSearch, title: 'Detect look-alikes', body: 'Handles, store listings and domains are compared character by character, icon by icon, against that ground truth.' },
  { icon: FileCheck2, title: 'Read the evidence', body: 'Every point of a score is a named signal. Counter-evidence, like a parody disclaimer, is shown next to it.' },
  { icon: UserCheck, title: 'Act with a person in charge', body: 'An analyst confirms the case, keeps notes, and drafts the platform or registrar report. Nothing is sent automatically.' },
];

const COMPARE = [
  { q: 'Decides the severity', rules: true, models: false },
  { q: 'Names the exact reason it fired', rules: true, models: false },
  { q: 'Same input, same answer, every time', rules: true, models: true },
  { q: 'Can overrule an official asset', rules: false, models: false },
  { q: 'Helps sort the review queue', rules: true, models: true },
];

const container = 'mx-auto w-full max-w-[1320px] px-4 sm:px-8 lg:px-10';

const sevStyle = (cat) =>
  cat === 'Critical' ? 'text-danger border-danger/30 bg-danger/10'
    : cat === 'High' ? 'text-high border-high/30 bg-high/10'
      : cat === 'Medium' ? 'text-warn border-warn/30 bg-warn/10'
        : 'text-ok border-ok/30 bg-ok/10';
const sevStroke = (cat) =>
  cat === 'Critical' ? 'rgb(var(--c-danger))' : cat === 'High' ? 'rgb(var(--c-high))' : cat === 'Medium' ? 'rgb(var(--c-warn))' : 'rgb(var(--c-ok))';

function ScoreDial({ score, category }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score)) / 100;
  return (
    <div className="relative h-36 w-36 shrink-0">
      <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90" aria-hidden>
        <circle cx="64" cy="64" r={r} fill="none" stroke="rgb(var(--c-line))" strokeWidth="10" />
        <circle
          cx="64" cy="64" r={r} fill="none" stroke={sevStroke(category)} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={`${c * pct} ${c}`} style={{ transition: 'stroke-dasharray 0.6s cubic-bezier(0.2,0.7,0.2,1), stroke 0.3s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-4xl font-medium tabular-nums text-fg">{score}</span>
        <span className="text-xs text-fgSubtle">of 100</span>
      </div>
    </div>
  );
}

export default function LandingPage({ onLaunchDashboard, onReplayIntro }) {
  const open = (options) => onLaunchDashboard && onLaunchDashboard(options || { mode: 'login' });
  const openDemo = () => open({ mode: 'demo' });

  const [sandboxDomain, setSandboxDomain] = useState('аcme.com');
  const [sandboxName, setSandboxName] = useState('Acme Secure Portal');
  const [sandboxDesc, setSandboxDesc] = useState('Spoofs Latin "a" with Cyrillic U+0430');

  // Client-side real-time analysis using the actual lookalike engine.
  const sandboxAnalysis = useMemo(() => {
    try {
      return runFullLookalikeAnalysis(sandboxName, sandboxDomain, INITIAL_BRAND_PROFILE, sandboxDesc);
    } catch {
      return null;
    }
  }, [sandboxDomain, sandboxName, sandboxDesc]);

  const handleSelectPreset = (preset) => {
    setSandboxDomain(preset.domain);
    setSandboxName(preset.name);
    setSandboxDesc(preset.desc);
  };

  return (
    <div className="lp-grain min-h-[100dvh] overflow-x-hidden bg-canvas text-fg">
      <a href="#main" className="sr-only z-50 rounded-xl bg-accent px-4 py-2 font-semibold text-onAccent focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Skip to content
      </a>
      {/* Navigation */}
      <header className="sticky top-0 z-40 border-b border-line/70 bg-canvas/80 backdrop-blur-md">
        <div className={`${container} flex h-16 items-center justify-between gap-4`}>
          <a href="/" className="flex items-center gap-2.5" aria-label="Suraksha home">
            <ShieldMark size={26} />
            <span className="text-[17px] font-semibold tracking-tight">Suraksha</span>
            <span className="hidden font-deva text-sm text-fgSubtle sm:inline" lang="hi">सुरक्षा</span>
          </a>

          <nav className="hidden items-center gap-7 text-sm text-fgMuted lg:flex" aria-label="Sections">
            <a href="#vectors" className="transition-colors hover:text-fg">Coverage</a>
            <a href="#sandbox" className="transition-colors hover:text-fg">Scanner</a>
            <a href="#epistemic" className="transition-colors hover:text-fg">Evidence</a>
            <a href="#lifecycle" className="transition-colors hover:text-fg">How it works</a>
            <a href="#measured" className="transition-colors hover:text-fg">Benchmarks</a>
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={() => open({ mode: 'login' })}
              className="hidden rounded-xl px-3.5 py-2 text-sm font-medium text-fgMuted transition-colors hover:bg-surface3 hover:text-fg sm:inline-flex"
            >
              Sign in
            </button>
            <button
              onClick={openDemo}
              className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-onAccent transition-[transform,background-color] duration-150 hover:bg-accentHover active:scale-[0.98]"
            >
              Open the live demo
            </button>
          </div>
        </div>
      </header>

      <main id="main">
        {/* Hero */}
        <section className="relative isolate">
          <div aria-hidden className="lp-grid pointer-events-none absolute inset-0 -z-10" />
          <div aria-hidden className="pointer-events-none absolute -top-40 right-[-10%] -z-10 h-[620px] w-[720px] rounded-full bg-accent/[0.07] blur-[140px]" />
          <div className={`${container} grid items-center gap-12 py-14 lg:min-h-[min(calc(100dvh-7.5rem),820px)] lg:grid-cols-12 lg:gap-10 lg:py-16`}>
            <div className="min-w-0 sk-stagger lg:col-span-6">
              <p className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/70 px-3 py-1 text-sm text-fgMuted">
                <ShieldCheck className="h-4 w-4 text-accent" {...ICON} />
                Brand impersonation defence
              </p>
              <h1 className="mt-6 max-w-[14ch] text-[2.75rem] font-semibold leading-[1.02] tracking-[-0.035em] text-fg sm:text-6xl lg:text-[4.4rem]">
                Spot the fake before your customers do.
              </h1>
              <p className="mt-6 max-w-[50ch] text-lg leading-relaxed text-fgMuted">
                Suraksha watches social media, app stores and domains for impersonators of your brand, and shows the evidence behind every flag.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <button
                  onClick={openDemo}
                  className="group inline-flex items-center gap-2 whitespace-nowrap rounded-xl bg-accent px-6 py-3.5 text-[15px] font-semibold text-onAccent transition-[transform,background-color] duration-150 hover:bg-accentHover active:scale-[0.98]"
                >
                  Open the live demo
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" {...ICON} />
                </button>
                <a
                  href="#sandbox"
                  className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl border border-line bg-surface/60 px-6 py-3.5 text-[15px] font-medium text-fg transition-colors hover:border-fgSubtle/60 hover:bg-surface3"
                >
                  Try the scanner
                </a>
              </div>
            </div>

            <div className="min-w-0 lg:col-span-6">
              <HomoglyphSpecimen />
            </div>
          </div>
        </section>

        {/* Ticker: the single marquee on the page */}
        <section aria-label="Examples the demo workspace detects" className="border-y border-line/70 bg-surface2/60">
          <div className="relative overflow-hidden py-4 [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
            <div className="lp-marquee flex w-max gap-10">
              {[...TICKER, ...TICKER].map((t, i) => (
                <span key={i} className="flex shrink-0 items-center gap-3 text-sm" aria-hidden={i >= TICKER.length}>
                  <AlertTriangle className={`h-4 w-4 ${SEV[t.sev]}`} {...ICON} />
                  <span className="font-mono text-fg">{t.text}</span>
                  <span className="text-fgSubtle">{t.kind}</span>
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Coverage bento */}
        <section id="vectors" className={`${container} py-24 sm:py-32`}>
          <Reveal>
            <h2 className="max-w-[20ch] text-3xl font-semibold tracking-[-0.03em] text-fg sm:text-[2.6rem] sm:leading-[1.1]">
              Impostors show up where your customers already are.
            </h2>
            <p className="mt-4 max-w-[60ch] text-base leading-relaxed text-fgMuted">
              Fake helpdesks on social media, copycat apps in stores and look-alike domains. Suraksha checks all three against the same brand profile.
            </p>
          </Reveal>

          <div className="mt-14 grid gap-4 lg:grid-cols-5 lg:grid-rows-2">
            {/* Social: the large tile */}
            <Reveal className="relative overflow-hidden rounded-3xl border border-line bg-surface p-7 sm:p-9 lg:col-span-3 lg:row-span-2">
              <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-[420px] w-[420px] opacity-70">
                <svg viewBox="0 0 200 200" className="h-full w-full">
                  {[90, 66, 42, 18].map((r) => (
                    <circle key={r} cx="100" cy="100" r={r} fill="none" stroke="rgb(var(--c-line))" strokeWidth="0.6" />
                  ))}
                  <line x1="100" y1="10" x2="100" y2="190" stroke="rgb(var(--c-line))" strokeWidth="0.6" />
                  <line x1="10" y1="100" x2="190" y2="100" stroke="rgb(var(--c-line))" strokeWidth="0.6" />
                  <g className="lp-radar">
                    <path d="M100 100 L100 10 A90 90 0 0 1 163.6 36.4 Z" fill="rgb(var(--c-accent) / 0.12)" />
                    <line x1="100" y1="100" x2="100" y2="10" stroke="rgb(var(--c-accent) / 0.7)" strokeWidth="0.8" />
                  </g>
                  <circle cx="132" cy="58" r="3" fill="rgb(var(--c-danger))" />
                  <circle cx="64" cy="128" r="2.5" fill="rgb(var(--c-high))" />
                  <circle cx="145" cy="138" r="2.5" fill="rgb(var(--c-ok))" />
                </svg>
              </div>
              <div className="relative flex h-full flex-col">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-accent/25 bg-accent/10 text-accent">
                  <Share2 className="h-5 w-5" {...ICON} />
                </span>
                <h3 className="mt-6 text-2xl font-semibold tracking-tight text-fg">Fake support accounts</h3>
                <p className="mt-3 max-w-[44ch] leading-relaxed text-fgMuted">
                  The account offering refunds in your name, with your logo as its avatar and an OTP request in the bio. Suraksha scores the handle, the copied picture and the scam wording, and leaves your verified accounts alone.
                </p>
                <ul className="mt-auto grid gap-3 pt-10 text-sm text-fgMuted sm:grid-cols-2">
                  {['Look-alike handles and display names', 'Avatar compared with your logo', 'OTP, refund and KYC scam wording', 'Parody and fan pages scored down'].map((t) => (
                    <li key={t} className="flex items-start gap-2.5">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-ok" {...ICON} />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>

            {/* Apps */}
            <Reveal delay={80} className="rounded-3xl border border-line bg-gradient-to-br from-ai/[0.10] via-surface to-surface p-7 lg:col-span-2">
              <div className="flex items-start justify-between gap-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-ai/25 bg-ai/10 text-ai">
                  <Smartphone className="h-5 w-5" {...ICON} />
                </span>
                <div className="text-right">
                  <p className="font-mono text-3xl font-medium text-fg">98.8%</p>
                  <p className="text-xs text-fgSubtle">icon match on an edited logo copy</p>
                </div>
              </div>
              <h3 className="mt-5 text-xl font-semibold tracking-tight text-fg">Copycat apps</h3>
              <p className="mt-2 text-sm leading-relaxed text-fgMuted">
                Store listings that reuse your icon, your name in the title or a package id one character off. Authorised partners are marked, not hidden.
              </p>
            </Reveal>

            {/* Domains */}
            <Reveal delay={160} className="rounded-3xl border border-line bg-surface p-7 lg:col-span-2">
              <div className="flex items-start justify-between gap-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-high/25 bg-high/10 text-high">
                  <Globe className="h-5 w-5" {...ICON} />
                </span>
                <p className="font-mono text-2xl text-fgMuted" aria-label="Latin a beside Cyrillic a">
                  a <span className="text-fgSubtle">/</span> <span className="text-danger">{'а'}</span>
                </p>
              </div>
              <h3 className="mt-5 text-xl font-semibold tracking-tight text-fg">Look-alike domains</h3>
              <p className="mt-2 text-sm leading-relaxed text-fgMuted">
                Homoglyphs, typos, brand-plus-keyword combos and brand names hidden in subdomains, all measured against your registered domains.
              </p>
            </Reveal>
          </div>
        </section>

        {/* Scanner */}
        <section id="sandbox" className="border-y border-line/70 bg-surface2/50">
          <div className={`${container} py-24 sm:py-32`}>
            <Reveal className="max-w-[62ch]">
              <p className="text-sm font-medium text-accent">Runs in your browser</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-fg sm:text-[2.6rem] sm:leading-[1.1]">
                Type a domain. Get a verdict with reasons.
              </h2>
              <p className="mt-4 leading-relaxed text-fgMuted">
                This is the same rule engine the workspace uses, checking against the demo brand, Acme Corp, and its four official domains.
              </p>
            </Reveal>

            <div className="mt-14 grid items-start gap-5 lg:grid-cols-12">
              <div className="space-y-5 rounded-3xl border border-line bg-surface p-6 sm:p-7 lg:col-span-5">
                <div className="flex flex-col gap-2">
                  <label htmlFor="lp-domain" className="text-sm font-medium text-fg">Domain to check</label>
                  <input
                    id="lp-domain"
                    type="text"
                    spellCheck={false}
                    autoComplete="off"
                    value={sandboxDomain}
                    onChange={(e) => setSandboxDomain(e.target.value)}
                    placeholder="acme-login.com"
                    className="w-full rounded-xl border border-line bg-surface2 px-4 py-3 font-mono text-lg text-fg placeholder:text-fgSubtle focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label htmlFor="lp-name" className="text-sm font-medium text-fg">Name shown on the site <span className="font-normal text-fgSubtle">(optional)</span></label>
                  <input
                    id="lp-name"
                    type="text"
                    value={sandboxName}
                    onChange={(e) => setSandboxName(e.target.value)}
                    placeholder="Acme Support Desk"
                    className="w-full rounded-xl border border-line bg-surface2 px-4 py-2.5 text-fg placeholder:text-fgSubtle focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
                  />
                </div>
                <div>
                  <p className="text-sm font-medium text-fg">Or load an example</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {SANDBOX_PRESETS.map((preset) => {
                      const active = sandboxDomain === preset.domain;
                      return (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => handleSelectPreset(preset)}
                          aria-pressed={active}
                          className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                            active ? 'border-accent/50 bg-accent/10 text-accent' : 'border-line text-fgMuted hover:border-fgSubtle/60 hover:text-fg'
                          }`}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-7" aria-live="polite">
                {sandboxAnalysis ? (
                  <div className="rounded-3xl border border-line bg-surface p-6 sm:p-8">
                    <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                      <ScoreDial score={sandboxAnalysis.overallScore} category={sandboxAnalysis.overallRiskCategory} />
                      <div className="min-w-0">
                        <span className={`inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${sevStyle(sandboxAnalysis.overallRiskCategory)}`}>
                          {sandboxAnalysis.overallRiskCategory} risk
                        </span>
                        <p className="mt-3 truncate font-mono text-xl text-fg" title={sandboxDomain}>{sandboxDomain || 'No domain yet'}</p>
                        <p className="mt-1 text-sm text-fgMuted">
                          Suggested next step: <span className="text-fg">{sandboxAnalysis.recommendedAction}</span>
                        </p>
                      </div>
                    </div>

                    {sandboxAnalysis.characterDiffs?.length > 0 && (
                      <div className="mt-7 rounded-2xl border border-danger/25 bg-danger/[0.06] p-4">
                        <p className="flex items-center gap-2 text-sm font-medium text-danger">
                          <AlertTriangle className="h-4 w-4" {...ICON} />
                          {sandboxAnalysis.characterDiffs.length === 1 ? 'One character is an impostor' : `${sandboxAnalysis.characterDiffs.length} characters are impostors`}
                        </p>
                        <ul className="mt-3 space-y-1.5">
                          {sandboxAnalysis.characterDiffs.map((diff, idx) => (
                            <li key={idx} className="flex flex-wrap items-baseline gap-x-3 text-sm text-fgMuted">
                              <span className="font-mono text-base">
                                <span className="text-danger">{diff.substituted}</span>
                                <span className="px-1.5 text-fgSubtle">for</span>
                                <span className="text-ok">{diff.original}</span>
                              </span>
                              <span>{diff.explanation}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="mt-7">
                      <p className="text-sm font-medium text-fg">Why ({sandboxAnalysis.signals.length} {sandboxAnalysis.signals.length === 1 ? 'signal' : 'signals'})</p>
                      {sandboxAnalysis.signals.length === 0 ? (
                        <p className="mt-3 rounded-2xl border border-line bg-surface2 p-4 text-sm text-fgMuted">
                          No impersonation signals. Official domains are excluded before any rule runs.
                        </p>
                      ) : (
                        <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">
                          {sandboxAnalysis.signals.map((sig) => (
                            <li key={sig.id} className="rounded-2xl border border-line bg-surface2 p-4">
                              <div className="flex items-start justify-between gap-3">
                                <p className="text-sm font-medium text-fg">{sig.title}</p>
                                <span className={`shrink-0 text-xs font-medium capitalize ${sig.severity === 'critical' ? 'text-danger' : sig.severity === 'high' ? 'text-high' : 'text-warn'}`}>
                                  {sig.severity}
                                </span>
                              </div>
                              <p className="mt-1 text-sm leading-relaxed text-fgMuted">{sig.detail}</p>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div className="mt-7 grid grid-cols-3 gap-3 border-t border-line pt-5 text-sm">
                      <div>
                        <p className="font-mono text-lg text-fg">{sandboxAnalysis.damerauDistance}</p>
                        <p className="text-xs text-fgSubtle">edits from official</p>
                      </div>
                      <div>
                        <p className="font-mono text-lg text-fg">{sandboxAnalysis.domainSimilarityScore}%</p>
                        <p className="text-xs text-fgSubtle">domain similarity</p>
                      </div>
                      <div>
                        <p className="font-mono text-lg text-fg">{sandboxAnalysis.nameSimilarityScore}%</p>
                        <p className="text-xs text-fgSubtle">name similarity</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-3xl border border-dashed border-line bg-surface p-10 text-center text-fgMuted">
                    Type a domain on the left to see the verdict and the signals behind it.
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Rules vs models */}
        <section id="epistemic" className={`${container} py-24 sm:py-32`}>
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
            <Reveal className="lg:col-span-5">
              <h2 className="text-3xl font-semibold tracking-[-0.03em] text-fg sm:text-[2.6rem] sm:leading-[1.1]">
                Rules decide. Models advise.
              </h2>
              <p className="mt-5 max-w-[48ch] leading-relaxed text-fgMuted">
                A flag you cannot explain is a flag nobody can act on. Severity comes from rules that name what they saw. Model scores sit beside them as context, and neither can ever flag an asset you registered as official.
              </p>
              <div className="mt-8 flex flex-wrap gap-6 text-sm">
                <span className="flex items-center gap-2 text-fgMuted"><Scale className="h-5 w-5 text-accent" {...ICON} /> Rule engine</span>
                <span className="flex items-center gap-2 text-fgMuted"><Cpu className="h-5 w-5 text-ai" {...ICON} /> ML models</span>
              </div>
            </Reveal>

            <Reveal delay={100} className="lg:col-span-7">
              <div className="overflow-hidden rounded-3xl border border-line bg-surface">
                <div className="grid grid-cols-[1fr,5.5rem,5.5rem] items-center gap-2 border-b border-line bg-surface2 px-5 py-4 text-sm font-medium sm:grid-cols-[1fr,7rem,7rem] sm:px-7">
                  <span className="text-fgMuted">What it does</span>
                  <span className="text-center text-accent">Rules</span>
                  <span className="text-center text-ai">Models</span>
                </div>
                {COMPARE.map((row, i) => (
                  <div key={row.q} className={`grid grid-cols-[1fr,5.5rem,5.5rem] items-center gap-2 px-5 py-4 sm:grid-cols-[1fr,7rem,7rem] sm:px-7 ${i % 2 ? 'bg-surface2/40' : ''}`}>
                    <span className="text-[15px] text-fg">{row.q}</span>
                    {[row.rules, row.models].map((yes, j) => (
                      <span key={j} className="flex justify-center">
                        {yes ? (
                          <Check className={`h-5 w-5 ${j === 0 ? 'text-accent' : 'text-ai'}`} {...ICON} aria-label="Yes" />
                        ) : (
                          <X className="h-5 w-5 text-fgSubtle/70" {...ICON} aria-label="No" />
                        )}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        {/* Workflow: a real sequence, so it is numbered */}
        <section id="lifecycle" className="border-t border-line/70">
          <div className={`${container} py-24 sm:py-32`}>
            <Reveal>
              <h2 className="max-w-[22ch] text-3xl font-semibold tracking-[-0.03em] text-fg sm:text-[2.6rem] sm:leading-[1.1]">
                From a suspicious handle to a report you can file.
              </h2>
            </Reveal>
            <ol className="relative mt-16 grid gap-10 md:grid-cols-4 md:gap-6">
              <span aria-hidden className="sk-grow-x absolute left-0 right-0 top-[22px] hidden h-px bg-gradient-to-r from-accent/70 via-line to-line md:block" />
              {STEPS.map((s, i) => {
                const Icon = s.icon;
                return (
                  <Reveal as="li" key={s.title} delay={i * 90} className="relative">
                    <span className="relative z-10 flex h-11 w-11 items-center justify-center rounded-2xl border border-line bg-canvas text-accent">
                      <Icon className="h-5 w-5" {...ICON} />
                    </span>
                    <p className="mt-6 font-mono text-sm text-fgSubtle">{i + 1}</p>
                    <h3 className="mt-1 text-lg font-semibold tracking-tight text-fg">{s.title}</h3>
                    <p className="mt-2 max-w-[34ch] text-sm leading-relaxed text-fgMuted">{s.body}</p>
                  </Reveal>
                );
              })}
            </ol>
          </div>
        </section>

        {/* Product view */}
        <section id="inner-workspace" className="relative isolate overflow-hidden border-y border-line/70 bg-surface2/50">
          <div aria-hidden className="pointer-events-none absolute left-1/2 top-24 -z-10 h-[480px] w-[900px] -translate-x-1/2 rounded-full bg-accent/[0.06] blur-[140px]" />
          <div className={`${container} pt-24 sm:pt-32`}>
            <Reveal className="mx-auto max-w-[60ch] text-center">
              <h2 className="text-3xl font-semibold tracking-[-0.03em] text-fg sm:text-[2.6rem] sm:leading-[1.1]">
                One queue for every impostor.
              </h2>
              <p className="mt-4 leading-relaxed text-fgMuted">
                Open findings, review progress and the cases that need a decision first, for one brand or many.
              </p>
            </Reveal>
            <Reveal delay={120} className="mx-auto mt-14 max-w-[1120px]">
              <div className="rounded-t-3xl border border-b-0 border-line bg-surface p-2 pb-0 shadow-elevated sm:p-3 sm:pb-0">
                <img
                  src="/suraksha_inner_dashboard.png"
                  alt="The Suraksha overview: open findings by severity, the review pipeline and the cases that need attention"
                  className="w-full rounded-t-2xl border border-b-0 border-line"
                  loading="lazy"
                  width="1600"
                  height="1000"
                />
              </div>
            </Reveal>
          </div>
        </section>

        {/* Benchmarks */}
        <section id="measured" className={`${container} py-24 sm:py-32`}>
          <Reveal className="max-w-[62ch]">
            <p className="text-sm font-medium text-accent">Measured, including the unflattering parts</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-fg sm:text-[2.6rem] sm:leading-[1.1]">
              Numbers you can check.
            </h2>
          </Reveal>
          <div className="mt-14 grid gap-px overflow-hidden rounded-3xl border border-line bg-line sm:grid-cols-2">
            {MEASURED.map((m, i) => (
              <Reveal key={m.label} delay={i * 70} className="bg-surface p-7 sm:p-9">
                <p className="font-mono text-5xl font-medium tracking-tight text-fg sm:text-6xl">
                  <CountUp value={m.value} />
                </p>
                <p className="mt-4 max-w-[34ch] text-[15px] leading-relaxed text-fg">{m.label}</p>
                <p className="mt-2 max-w-[40ch] text-sm leading-relaxed text-fgSubtle">{m.note}</p>
              </Reveal>
            ))}
          </div>
          <p className="mt-6 max-w-[80ch] text-sm leading-relaxed text-fgSubtle">
            URL results come from an offline, domain-grouped evaluation, so no site in the test set was seen in training. Social and app detection rely on the verified brand registry and named rules.
          </p>
        </section>

        {/* Closing: CTA + get the app */}
        <section className="border-t border-line/70">
          <div className={`${container} grid items-center gap-12 py-24 sm:py-28 lg:grid-cols-12`}>
            <Reveal className="lg:col-span-7">
              <p className="font-deva text-2xl text-accent" lang="hi">सुरक्षा</p>
              <h2 className="mt-3 max-w-[18ch] text-4xl font-semibold tracking-[-0.035em] text-fg sm:text-5xl sm:leading-[1.05]">
                See it catch a fake in under a minute.
              </h2>
              <p className="mt-5 max-w-[50ch] leading-relaxed text-fgMuted">
                The demo opens with a sample brand, its official assets and a queue of realistic impostors. No sign-up needed.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  onClick={openDemo}
                  className="group inline-flex items-center gap-2 whitespace-nowrap rounded-xl bg-accent px-6 py-3.5 text-[15px] font-semibold text-onAccent transition-[transform,background-color] duration-150 hover:bg-accentHover active:scale-[0.98]"
                >
                  Open the live demo
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" {...ICON} />
                </button>
                <button
                  onClick={() => open({ mode: 'signup' })}
                  className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl border border-line px-6 py-3.5 text-[15px] font-medium text-fg transition-colors hover:border-fgSubtle/60 hover:bg-surface3"
                >
                  Create an account
                </button>
              </div>
            </Reveal>
            <Reveal delay={100} className="lg:col-span-5">
              <GetApp />
            </Reveal>
          </div>
        </section>
      </main>

      <footer className="border-t border-line/70">
        <div className={`${container} flex flex-col gap-8 py-12 md:flex-row md:items-start md:justify-between`}>
          <div className="max-w-sm">
            <div className="flex items-center gap-2.5">
              <ShieldMark size={22} animate={false} />
              <span className="font-semibold tracking-tight">Suraksha</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-fgSubtle">
              Findings are advisory. A person reviews every case before anything is reported.
            </p>
          </div>
          <nav className="grid grid-cols-2 gap-x-10 gap-y-3 whitespace-nowrap text-sm text-fgMuted sm:grid-cols-3" aria-label="Footer">
            <a href="#vectors" className="hover:text-fg">Coverage</a>
            <a href="#sandbox" className="hover:text-fg">Scanner</a>
            <a href="#epistemic" className="hover:text-fg">Evidence</a>
            <a href="#lifecycle" className="hover:text-fg">How it works</a>
            <a href="#measured" className="hover:text-fg">Benchmarks</a>
            <a href="#get-app" className="hover:text-fg">Get the app</a>
            <button onClick={() => open({ mode: 'login' })} className="text-left hover:text-fg">Sign in</button>
            <button onClick={() => open({ mode: 'login', tab: 'investigation-center' })} className="text-left hover:text-fg">Investigations</button>
            {onReplayIntro && (
              <button onClick={onReplayIntro} className="inline-flex items-center gap-1.5 text-left hover:text-fg">
                <Play className="h-3.5 w-3.5" {...ICON} /> Replay intro
              </button>
            )}
          </nav>
        </div>
        <div className={`${container} border-t border-line/60 py-6 text-xs text-fgSubtle`}>
          © 2026 Suraksha
        </div>
      </footer>
    </div>
  );
}
