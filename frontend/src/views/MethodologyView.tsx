import React from 'react';
import { CheckCircle2, MinusCircle } from 'lucide-react';

const PIPELINE = [
  ['1. Collect', 'Public search (Bluesky, Mastodon, GitHub, Reddit, Apple App Store), certificate-transparency feed, analyst imports for platforms without an open API.'],
  ['2. Normalise', 'Each account, listing or domain becomes one candidate record with name, handle or package id, publisher, bio, icon and links.'],
  ['3. Exclude official', 'Your verified domains, handles and app ids are removed before any scoring, so official assets are never flagged.'],
  ['4. Detect', 'Named, explainable signals run on each candidate. No single signal decides the outcome.'],
  ['5. Score', 'Signals combine into a 0 to 100 score: 25+ Medium, 50+ High, 80+ Critical.'],
  ['6. Triage and report', 'Findings go to a review queue with status history, evidence and next steps, and export as CSV or a printable report.'],
];

const SIGNALS = [
  ['Look-alike names', 'Character swaps, added words, spacing and separators, homoglyphs (UTS #39 confusables)'],
  ['Logo and icon similarity', 'Perceptual hash of the official logo against profile pictures and app icons'],
  ['Scam wording', 'OTP, wallet recovery, refund or claim lures in bios, only when brand-associated'],
  ['Publisher and package mismatch', 'App name or package imitates the brand but the publisher is not a verified one'],
  ['Account age', 'New, unverified accounts add a small amount of risk'],
  ['Description similarity', 'Text overlap with official app or profile descriptions'],
];

const COVERAGE: [string, string, boolean][] = [
  ['Brand profile: official domains, handles, apps, logo, partners', 'Protected assets', true],
  ['Social media monitoring: live public search plus imports', 'Check a social profile', true],
  ['App store monitoring: App Store search plus Google Play imports', 'Check a mobile app', true],
  ['Look-alike detection: swaps, added words, spacing, homoglyphs', 'Check a domain / detectors', true],
  ['Official accounts and apps never flagged', 'Allowlist applied before scoring', true],
  ['Unavailable sources handled without breaking the scan', 'Source status on every scan', true],
  ['Evidence and report for takedown', 'Findings and Brand report (PDF)', true],
  ['Live Google Play and X search', 'Needs vendor credentials; imports cover it', false],
];

const LIMITS = [
  'Live results come from public search, which is not exhaustive. A clean scan means nothing was found in the sources searched.',
  'The look-alike model is trained on synthetic data. It is supporting evidence only and is never used to decide a finding.',
  'Google Play and X have no free search API, so those listings arrive through analyst import.',
  'Scores are leads for an analyst. Missing information is shown on each finding instead of being guessed.',
];

export const MethodologyView: React.FC = () => (
  <div className="mx-auto max-w-4xl space-y-8">
    <header>
      <h1 className="text-xl font-semibold tracking-tight text-fg">How Suraksha works</h1>
      <p className="mt-1 max-w-2xl text-sm text-fgMuted">The pipeline from data source to finding, what each signal looks for, and what is and is not covered.</p>
    </header>

    <section>
      <h2 className="mb-3 text-sm font-semibold text-fg">Detection pipeline</h2>
      <ol className="grid gap-2 md:grid-cols-2">
        {PIPELINE.map(([t, d]) => (
          <li key={t} className="rounded-lg border border-line bg-surface p-3">
            <p className="text-sm font-medium text-fg">{t}</p>
            <p className="mt-1 text-xs leading-relaxed text-fgMuted">{d}</p>
          </li>
        ))}
      </ol>
    </section>

    <section>
      <h2 className="mb-3 text-sm font-semibold text-fg">Signals</h2>
      <dl className="divide-y divide-line rounded-lg border border-line bg-surface">
        {SIGNALS.map(([t, d]) => (
          <div key={t} className="grid gap-1 p-3 md:grid-cols-3">
            <dt className="text-sm font-medium text-fg">{t}</dt>
            <dd className="text-xs leading-relaxed text-fgMuted md:col-span-2">{d}</dd>
          </div>
        ))}
      </dl>
    </section>

    <section>
      <h2 className="mb-3 text-sm font-semibold text-fg">Coverage of the challenge</h2>
      <ul className="space-y-1.5">
        {COVERAGE.map(([req, where, done]) => (
          <li key={req} className="flex items-start gap-2 rounded-lg border border-line bg-surface p-3 text-xs">
            {done ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-ok" /> : <MinusCircle className="mt-0.5 h-4 w-4 shrink-0 text-fgSubtle" />}
            <span className="min-w-0"><span className="block text-sm text-fg">{req}</span><span className="text-fgSubtle">{where}</span></span>
          </li>
        ))}
      </ul>
    </section>

    <section>
      <h2 className="mb-3 text-sm font-semibold text-fg">Limitations</h2>
      <ul className="list-disc space-y-1.5 pl-5 text-xs leading-relaxed text-fgMuted">
        {LIMITS.map((l) => <li key={l}>{l}</li>)}
      </ul>
    </section>
  </div>
);

export default MethodologyView;
