import React from 'react';
import { ArrowRight } from 'lucide-react';
import { ShieldMark } from '../ShieldMark';
import { Reveal, CountUp } from './Reveal';

/**
 * Public landing page. Deliberately plain: what the product does, how an analyst works in it,
 * and an honest account of what has and has not been measured.
 * The numbers below come from docs/PHASE0_AUDIT.md (frozen, leakage-safe evaluation, October 2026).
 */

const LOOP = [
  ['Monitor', 'Register your verified domains, profiles and apps. They are excluded from every finding.'],
  ['Detect', 'Submit a suspected domain, social profile or app. Rule-based engines compare it with your assets.'],
  ['Explain', 'Every finding lists the exact signals that fired, what is missing, and what is uncertain.'],
  ['Investigate', 'Open the evidence, add notes and set a status. The audit trail records who decided what.'],
  ['Respond', 'Export findings as CSV for takedown requests and reporting.'],
];

const MEASURED = [
  { label: 'URL model, bare domains', value: '42%', note: 'of phishing hosts caught, at 95% precision, on a frozen test set of 2,210 hosts.' },
  { label: 'Format-only baseline', value: '0.87 F1', note: 'A model with no content scored this on raw URLs, close to the 0.90 of the trained one. We say so.' },
  { label: 'Social impersonation labels', value: '0', note: 'verified brand-impersonation examples exist yet. The social model detects generic fake accounts only.' },
  { label: 'Mobile app labels', value: '0', note: 'verified impersonating apps exist yet. App assessment is rule-based, not a trained model.' },
];

const Section = ({ eyebrow, title, children }) => (
  <section className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
    <Reveal>
      <p className="text-xs font-medium uppercase tracking-widest text-fgSubtle">{eyebrow}</p>
      <h2 className="mt-2 max-w-3xl text-2xl font-semibold text-fg sm:text-3xl">{title}</h2>
    </Reveal>
    <div className="mt-8">{children}</div>
  </section>
);

export default function LandingPage({ onLaunchDashboard, onReplayIntro }) {
  const open = (options) => onLaunchDashboard && onLaunchDashboard(options || { mode: 'login' });

  return (
    <div className="min-h-screen bg-canvas text-fg">
      <header className="sticky top-0 z-30 border-b border-line bg-canvas/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5 sm:px-8">
          <span className="flex items-center gap-2 text-sm font-semibold tracking-tight">
            <ShieldMark size={22} />
            SURAKSHA
          </span>
          <button onClick={() => open({ mode: 'login' })} className="rounded-md bg-accent px-4 py-1.5 text-sm font-medium text-onAccent transition-[transform,background-color] duration-150 hover:bg-accentHover active:scale-95">
            Open SURAKSHA
          </button>
        </div>
      </header>

      <main>
        <section className="mx-auto w-full max-w-6xl px-5 pb-8 pt-20 sm:px-8 sm:pt-32">
          <div className="sk-stagger">
            <div><ShieldMark size={64} /></div>
            <p className="mt-6 text-xs font-medium uppercase tracking-widest text-fgSubtle">Digital brand protection</p>
            <h1 className="mt-3 max-w-4xl text-4xl font-semibold leading-[1.05] text-fg sm:text-7xl">
              Find the impersonators. Show your work.
            </h1>
            <p className="mt-5 max-w-xl text-base text-fgMuted sm:text-lg">
              SURAKSHA checks lookalike domains, social profiles and mobile apps against your verified assets, and explains every finding in plain language, with its evidence and its uncertainty.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button onClick={() => open({ mode: 'login' })} className="group inline-flex items-center gap-2 rounded-md bg-accent px-6 py-3 text-sm font-medium text-onAccent transition-[transform,background-color] duration-150 hover:bg-accentHover active:scale-[0.98]">
                Open SURAKSHA <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
              </button>
              <a href="#measured" className="inline-flex items-center rounded-md border border-line px-6 py-3 text-sm text-fgMuted transition-colors hover:bg-surface3 hover:text-fg">
                What we measured
              </a>
            </div>
          </div>

        </section>

        <Section eyebrow="The loop" title="Most tools stop at the alert. SURAKSHA starts there.">
          <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {LOOP.map(([name, text], i) => (
              <Reveal as="li" key={name} delay={i * 90} className="sk-lift rounded-2xl border border-line bg-surface p-5">
                <p className="text-xs tabular-nums text-fgSubtle">{String(i + 1).padStart(2, '0')}</p>
                <h3 className="mt-2 text-base font-semibold text-fg">{name}</h3>
                <p className="mt-1.5 text-sm text-fgMuted">{text}</p>
              </Reveal>
            ))}
          </ol>
        </Section>

        <Section eyebrow="Two kinds of signal, never blended" title="Rules decide severity. Machine learning is evidence, not a verdict.">
          <div className="grid gap-3 md:grid-cols-2">
            <Reveal className="sk-lift rounded-2xl border border-line bg-surface p-6">
              <h3 className="text-base font-semibold">Rule-based engines</h3>
              <p className="mt-2 text-sm text-fgMuted">
                Lookalike similarity, homoglyphs and punycode, lure words, URL structure and verified-asset exclusion. Each signal names the rule that fired, so an analyst can check it by eye.
              </p>
            </Reveal>
            <Reveal delay={120} className="sk-lift rounded-2xl border border-line bg-surface p-6">
              <h3 className="text-base font-semibold">Trained models</h3>
              <p className="mt-2 text-sm text-fgMuted">
                Reported next to a finding as uncalibrated supporting evidence. A model score never overrides a verified official asset, and never changes a finding’s severity.
              </p>
            </Reveal>
          </div>
        </Section>

        <div id="measured" />
        <Section eyebrow="What we measured, and what we have not" title="Numbers you can check, including the unflattering ones.">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {MEASURED.map((m, i) => (
              <Reveal key={m.label} delay={i * 90} className="sk-lift rounded-2xl border border-line bg-surface p-5">
                <p className="text-xs text-fgSubtle">{m.label}</p>
                <p className="mt-2 text-3xl font-semibold text-fg"><CountUp value={m.value} /></p>
                <p className="mt-2 text-sm text-fgMuted">{m.note}</p>
              </Reveal>
            ))}
          </div>
          <p className="mt-4 max-w-3xl text-xs text-fgSubtle">
            URL results are from a leakage-safe, domain-grouped evaluation (October 2026) and are offline measurements, not production accuracy. Detection of social and app impersonation will be measured once verified labels exist.
          </p>
        </Section>

        <section className="border-t border-line">
          <Reveal className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-14 sm:px-8">
            <h2 className="max-w-xl text-2xl font-semibold sm:text-3xl">Start with the assets that are really yours.</h2>
            <button onClick={() => open({ mode: 'login' })} className="group inline-flex items-center gap-2 rounded-md bg-accent px-6 py-3 text-sm font-medium text-onAccent transition-[transform,background-color] duration-150 hover:bg-accentHover active:scale-[0.98]">
              Open SURAKSHA <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
            </button>
          </Reveal>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-6 text-xs text-fgSubtle sm:px-8">
          <span>SURAKSHA. Findings are advisory and need analyst review.</span>
          {onReplayIntro && (
            <button onClick={onReplayIntro} className="hover:text-fg">Replay intro</button>
          )}
        </div>
      </footer>
    </div>
  );
}
