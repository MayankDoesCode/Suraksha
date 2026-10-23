import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, AtSign, Check, Globe, Pause, Play, RotateCcw, Smartphone } from 'lucide-react';
import { analyzeSocialCandidate } from '../../utils/socialEngine';
import { analyzeAppCandidate } from '../../utils/appEngine';
import { runFullLookalikeAnalysis } from '../../utils/lookalikeEngine';
import { INITIAL_BRAND_PROFILE } from '../../data/demoData';
import { ProgressRing, CountUp } from '../motion';

/**
 * The Case Desk: the product's four stages (detect, explain, act, measure) running for real.
 * Each case below is evaluated by the same engines the workspace uses, against the demo brand, and the stage panels show what
 * those engines actually returned. Nothing is scripted except the choice of three sample inputs.
 */

const EASE = [0.16, 1, 0.3, 1];
const STAGES = [
  { key: 'detect', label: 'Detect', hint: 'Compare with your official assets' },
  { key: 'explain', label: 'Explain', hint: 'List every reason, with severity' },
  { key: 'act', label: 'Act', hint: 'Draft the report with its evidence' },
  { key: 'measure', label: 'Measure', hint: 'Score it and keep the record' },
];
const SEV_STYLE = {
  critical: 'border-danger/40 bg-danger/10 text-danger', high: 'border-high/40 bg-high/10 text-high',
  medium: 'border-warn/40 bg-warn/10 text-warn', low: 'border-ok/40 bg-ok/10 text-ok',
};
const LEVEL_COLOR = { Critical: 'var(--c-danger)', High: 'var(--c-high)', Medium: 'var(--c-warn)', Low: 'var(--c-ok)' };
const BRAND = INITIAL_BRAND_PROFILE;

const CASES = [
  {
    key: 'social', label: 'Fake handle', icon: AtSign, official: '@acme_official', reported: '@acrne_official', kind: 'X account', to: 'X trust and safety',
    run: () => {
      const r = analyzeSocialCandidate({ name: 'Acme Corp Official', username: '@acrne_official', platform: 'X', url: 'https://x.com/acrne_official', bio: 'Official support. DM us your OTP to verify your account.', followerCount: 120, creationDate: '2026-10-01' }, BRAND);
      return { level: r.riskCategory, score: r.heuristicScore, signals: r.signals };
    },
  },
  {
    key: 'app', label: 'Fake app', icon: Smartphone, official: 'Acme Mobile Banking', reported: 'Acme Pay Rewards', sub: ['Acme Financial Services Ltd', 'Unknown Rewards Technologies'], kind: 'Android listing', to: 'Google Play review team',
    run: () => {
      const r = analyzeAppCandidate({ name: 'Acme Pay Rewards', developer: 'Unknown Rewards Technologies', store: 'Google Play Store', packageId: 'com.acmepay.rewards', description: 'Earn ₹5,000 cashback instantly. Verify your bank account and enter your UPI PIN to claim.', observedBranding: 'Copies Acme branding and colours' }, BRAND);
      return { level: r.riskCategory, score: r.heuristicScore, signals: r.signals };
    },
  },
  {
    key: 'domain', label: 'Look-alike domain', icon: Globe, official: 'acme.com', reported: 'acme-support-login.com', kind: 'Website', to: 'the registrar abuse contact',
    run: () => {
      const r = runFullLookalikeAnalysis('Acme Support', 'acme-support-login.com', BRAND, 'Sign in to your Acme account to claim your refund.');
      return { level: r.overallRiskCategory, score: r.overallScore, signals: r.signals };
    },
  },
];

/** Marks the characters of `b` that are not part of the longest common subsequence with `a`. */
function diffMarks(a, b) {
  const n = a.length; const m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const keep = new Array(m).fill(false);
  let i = 0; let j = 0;
  while (i < n && j < m) { if (a[i] === b[j]) { keep[j] = true; i++; j++; } else if (dp[i + 1][j] >= dp[i][j + 1]) i++; else j++; }
  return keep;
}

/** Short checksum of the evidence (FNV-1a). It shows the record is tamper-evident in spirit; it is not a cryptographic signature. */
function checksum(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}

const Chip = ({ sev }) => <span className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-medium capitalize ${SEV_STYLE[sev] || SEV_STYLE.low}`}>{sev}</span>;

function Detect({ c }) {
  const keep = useMemo(() => diffMarks(c.official, c.reported), [c]);
  const Row = ({ tag, tone, children, sub }) => (
    <div className="rounded-2xl border border-line bg-canvas/50 px-4 py-3.5">
      <p className={`text-[10px] uppercase tracking-[0.26em] ${tone}`}>{tag}</p>
      <p className="mt-1.5 break-all font-mono text-xl leading-tight sm:text-2xl">{children}</p>
      {sub && <p className="mt-1 text-xs text-fgSubtle">{sub}</p>}
    </div>
  );
  return (
    <div className="space-y-3">
      <Row tag="Your official asset" tone="text-fgSubtle" sub={c.sub?.[0]}>{c.official}</Row>
      <Row tag={`Found: ${c.kind}`} tone="text-danger/90" sub={c.sub?.[1]}>
        {c.reported.split('').map((ch, i) => <span key={i} className={keep[i] ? '' : 'rounded-sm bg-danger/20 text-danger'}>{ch}</span>)}
      </Row>
      <p className="px-1 text-sm text-fgMuted">Checked against {BRAND.officialDomains.length + BRAND.officialSocialUrls.length + (BRAND.officialApps?.length || 0)} registered assets. Characters that do not match the official asset are marked.</p>
    </div>
  );
}

function Explain({ res }) {
  const top = [...res.signals].sort((a, b) => ['critical', 'high', 'medium', 'low'].indexOf(a.severity) - ['critical', 'high', 'medium', 'low'].indexOf(b.severity)).slice(0, 4);
  return (
    <ul className="space-y-2.5">
      {top.map((s, i) => (
        <motion.li key={s.id || s.title} className="rounded-2xl border border-line bg-canvas/50 px-4 py-3" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: i * 0.14, ease: EASE }}>
          <div className="flex items-center justify-between gap-3"><p className="text-sm font-medium">{s.title}</p><Chip sev={s.severity} /></div>
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-fgSubtle">{s.detail}</p>
        </motion.li>
      ))}
      {top.length === 0 && <li className="rounded-2xl border border-line px-4 py-3 text-sm text-fgMuted">No signals fired.</li>}
    </ul>
  );
}

function Act({ c, res }) {
  const reasons = res.signals.filter((s) => s.severity !== 'low').slice(0, 3).map((s) => s.title);
  const sum = checksum(`${c.reported}|${res.signals.map((s) => s.title).join('|')}`);
  const lines = [
    [`To`, c.to],
    [`Subject`, `Brand impersonation report: ${c.reported}`],
  ];
  return (
    <div className="rounded-2xl border border-line bg-canvas/50 p-4 font-mono text-[12.5px] leading-relaxed">
      {lines.map(([k, v], i) => (
        <motion.p key={k} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.18 }}><span className="text-fgSubtle">{k}: </span>{v}</motion.p>
      ))}
      <motion.div className="mt-3 border-t border-line pt-3 font-sans text-sm text-fgMuted" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}>
        <p>We believe <span className="font-mono text-fg">{c.reported}</span> is impersonating Acme Corp, because of:</p>
        <ul className="mt-2 space-y-1">{reasons.map((r) => <li key={r} className="flex gap-2"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent" />{r}</li>)}</ul>
      </motion.div>
      <motion.p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 font-sans text-[11px] text-fgSubtle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>
        <span className="rounded border border-line px-1.5 py-0.5 font-mono text-fg">checksum {sum}</span>
        <span>Draft only. A named analyst verifies it before anything is sent.</span>
      </motion.p>
    </div>
  );
}

function Measure({ res }) {
  const color = LEVEL_COLOR[res.level] || 'var(--c-accent)';
  const high = res.signals.filter((s) => s.severity === 'critical' || s.severity === 'high').length;
  return (
    <div className="flex flex-wrap items-center gap-8 rounded-2xl border border-line bg-canvas/50 p-5">
      <ProgressRing value={res.score} size={148} stroke={11} color={color} label={`${res.level}`} />
      <dl className="grid flex-1 grid-cols-2 gap-x-6 gap-y-4 text-sm">
        <div><dt className="text-[10px] uppercase tracking-[0.24em] text-fgSubtle">Score</dt><dd className="font-display text-2xl font-semibold tabular-nums"><CountUp value={res.score} />/100</dd></div>
        <div><dt className="text-[10px] uppercase tracking-[0.24em] text-fgSubtle">Signals</dt><dd className="font-display text-2xl font-semibold tabular-nums">{res.signals.length}<span className="ml-1 text-xs text-fgSubtle">{high} high or critical</span></dd></div>
        <p className="col-span-2 text-xs leading-relaxed text-fgSubtle">The score comes from rules you can read. It is saved with the evidence, and findings that share a logo or infrastructure are grouped into one campaign.</p>
      </dl>
    </div>
  );
}

/** True once the element has scrolled into view. A position check (not IntersectionObserver), so it also works in throttled or background surfaces. */
function useSeen(ref) {
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    if (seen) return undefined;
    const check = () => {
      const r = ref.current?.getBoundingClientRect();
      if (r && r.top < window.innerHeight * 0.75 && r.bottom > window.innerHeight * 0.15) setSeen(true);
    };
    check();
    window.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check);
    const t = setInterval(check, 400);
    return () => { window.removeEventListener('scroll', check); window.removeEventListener('resize', check); clearInterval(t); };
  }, [seen, ref]);
  return seen;
}

export default function CaseDesk({ container, onDemo }) {
  const reduce = useReducedMotion();
  const wrap = useRef(null);
  const seen = useSeen(wrap);
  const [ci, setCi] = useState(0);
  const [stage, setStage] = useState(0);
  const [playing, setPlaying] = useState(true);
  const results = useMemo(() => CASES.map((c) => c.run()), []);
  const c = CASES[ci]; const res = results[ci];

  useEffect(() => {
    if (!seen || !playing || reduce) return undefined;
    if (stage >= STAGES.length - 1) { setPlaying(false); return undefined; }
    const t = setTimeout(() => setStage((s) => s + 1), 3200);
    return () => clearTimeout(t);
  }, [seen, playing, stage, reduce]);

  const pick = (i) => { setCi(i); setStage(0); setPlaying(true); };
  const replay = () => { setStage(0); setPlaying(true); };
  const jump = (i) => { setStage(i); setPlaying(false); };
  const done = stage >= STAGES.length - 1 && !playing;

  return (
    <section ref={wrap} id="loop" aria-label="The case desk" className={`${container} pt-10`}>
      <div role="tablist" aria-label="Sample case" className="relative inline-flex gap-1 rounded-full border border-line bg-surface/70 p-1 text-sm">
        {CASES.map((k, i) => {
          const Icon = k.icon; const on = i === ci;
          return (
            <button key={k.key} role="tab" aria-selected={on} onClick={() => pick(i)} className={`press relative flex items-center gap-2 rounded-full px-4 py-1.5 transition-colors ${on ? 'text-onAccent' : 'text-fgMuted hover:text-fg'}`}>
              {on && <motion.span layoutId="case-pill" className="absolute inset-0 rounded-full bg-accent" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
              <Icon className="relative h-3.5 w-3.5" aria-hidden /><span className="relative">{k.label}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-5 grid gap-5 rounded-[2rem] border border-line bg-surface/60 p-4 backdrop-blur sm:p-6 lg:grid-cols-[320px_1fr]">
        {/* stage rail: the line fills as each stage completes */}
        <ol className="relative space-y-1" aria-label="Stages">
          <span aria-hidden className="absolute bottom-6 left-[19px] top-6 w-px bg-line" />
          <motion.span aria-hidden className="absolute left-[19px] top-6 w-px origin-top bg-gradient-to-b from-accent to-ai" style={{ bottom: 24 }} initial={false} animate={{ scaleY: stage / (STAGES.length - 1) }} transition={{ duration: 0.7, ease: EASE }} />
          {STAGES.map((s, i) => {
            const state = i < stage || (done && i === stage) ? 'done' : i === stage ? 'now' : 'todo';
            return (
              <li key={s.key}>
                <button type="button" onClick={() => jump(i)} aria-current={i === stage} className={`press relative flex w-full items-center gap-4 rounded-2xl px-2 py-3.5 text-left transition-colors ${i === stage ? 'bg-surface3/60' : 'hover:bg-surface3/30'}`}>
                  <span className={`relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-full border text-sm font-semibold transition-colors ${state === 'done' ? 'border-accent bg-accent text-onAccent' : state === 'now' ? 'border-accent text-accent' : 'border-line bg-canvas text-fgSubtle'}`}>
                    {state === 'now' && !reduce && <span aria-hidden className="absolute inset-0 animate-ping rounded-full border border-accent/60" />}
                    {state === 'done' ? <Check className="h-4 w-4" aria-hidden /> : i + 1}
                  </span>
                  <span><span className={`block font-display text-lg font-semibold tracking-tight ${state === 'todo' ? 'text-fgMuted' : ''}`}>{s.label}</span><span className="block text-xs text-fgSubtle">{s.hint}</span></span>
                </button>
              </li>
            );
          })}
        </ol>

        {/* the case file */}
        <div className="min-w-0 rounded-3xl border border-line bg-canvas/40 p-4 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="min-w-0 truncate font-mono text-sm"><span className="mr-2 text-fgSubtle">Case</span>{c.reported}</p>
            <div className="flex items-center gap-1.5">
              <button type="button" onClick={() => setPlaying((p) => !p)} disabled={done} aria-label={playing ? 'Pause' : 'Play'} className="press grid h-8 w-8 place-items-center rounded-full border border-line text-fgMuted hover:text-fg disabled:opacity-30">{playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}</button>
              <button type="button" onClick={replay} aria-label="Replay the case" className="press grid h-8 w-8 place-items-center rounded-full border border-line text-fgMuted hover:text-fg"><RotateCcw className="h-3.5 w-3.5" /></button>
            </div>
          </div>
          <div className="relative min-h-[300px]">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={`${c.key}-${stage}`} initial={{ opacity: 0, y: 18, filter: 'blur(6px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, y: -12, filter: 'blur(6px)' }} transition={{ duration: 0.45, ease: EASE }}>
                {stage === 0 && <Detect c={c} />}
                {stage === 1 && <Explain res={res} />}
                {stage === 2 && <Act c={c} res={res} />}
                {stage === 3 && <Measure res={res} />}
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="mt-4 h-0.5 overflow-hidden rounded bg-line" aria-hidden>
            <motion.div key={`${ci}-${stage}-${playing}`} className="h-full bg-accent" initial={{ width: playing && !reduce ? '0%' : '100%' }} animate={{ width: '100%' }} transition={{ duration: playing && !reduce ? 3.2 : 0, ease: 'linear' }} />
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-fgMuted">
        <p>Run by the same engines as the workspace, on a demo brand. Sample inputs, real checks.</p>
        <button type="button" onClick={onDemo} className="press group inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-fg hover:border-fgSubtle hover:bg-surface3/50">Try it with your own<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden /></button>
      </div>
    </section>
  );
}
