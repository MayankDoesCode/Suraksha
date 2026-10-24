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
import HeroLanding from './HeroLanding';
import Specimen from './Specimen';
import SiteNav from './SiteNav';
import { SectionHead, GlowText } from './Editorial';
import MobileSection from './MobileSection';
import CaseDesk from './CaseDesk';
import ForCompanies from './ForCompanies';
import { PlatformSection, ProofStrip, Bento, ClosingCta } from './Sections';
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
    <div className="lp-grain min-h-[100dvh] overflow-x-clip bg-canvas text-fg">
      <a href="#main" className="sr-only z-50 rounded-xl bg-accent px-4 py-2 font-semibold text-onAccent focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Skip to content
      </a>
      {/* Navigation */}
      <SiteNav onLogin={() => open({ mode: 'login' })} onDemo={openDemo} onReplayIntro={onReplayIntro} container={container} />

      <main id="main">
        {/* Hero */}
        <HeroLanding onDemo={openDemo} container={container} />
        <Specimen container={container} />
        <PlatformSection onDemo={openDemo} container={container} />
        <ProofStrip container={container} />
        <div id="how" className={`${container} pt-28`}>
          <SectionHead index="03" label="The loop" />
          <p className="mt-3 max-w-3xl font-display text-3xl font-semibold tracking-[-0.03em] sm:text-5xl">Most tools stop at the red flag. Suraksha starts there.</p>
        </div>

        {/* Ticker: the single marquee on the page */}



        {/* Coverage bento */}


        {/* Scanner */}
        <CaseDesk container={container} onDemo={openDemo} />

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

        <section id="product" className={`${container} scroll-mt-20 pt-28`}>
          <SectionHead index="05" label="For every role" />
          <h2 className="mt-3 max-w-3xl font-display text-3xl font-semibold tracking-[-0.03em] sm:text-5xl">Built for the people who act on it</h2>
          <p className="mt-4 max-w-2xl text-lg text-fgMuted">Analysts triage, legal teams send reports, leads see the pattern. Everyone works from the same evidence.</p>
          <div className="mt-12"><Bento /></div>
        </section>

        <MobileSection container={container} />
        <ForCompanies container={container} onDemo={openDemo} />
        <ClosingCta onDemo={openDemo} container={container} />

        {/* Rules vs models */}


        {/* Workflow: a real sequence, so it is numbered */}



        {/* Product view */}


        {/* Benchmarks */}


        {/* Closing: CTA + get the app */}



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
