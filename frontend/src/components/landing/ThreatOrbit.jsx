import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, AtSign, Check, FileText, Globe, RotateCcw, Smartphone } from 'lucide-react';
import { ShieldMark } from '../ShieldMark';
import { analyzeSocialCandidate } from '../../utils/socialEngine';
import { analyzeAppCandidate } from '../../utils/appEngine';
import { runFullLookalikeAnalysis } from '../../utils/lookalikeEngine';
import { INITIAL_BRAND_PROFILE } from '../../data/demoData';
import { PlateCaption } from './Editorial';

/**
 * "Defend Acme": the hero's interactive piece. Six sample impersonators orbit the brand shield. Pick one, read the real
 * engines' reasons, draft the report, and watch it get contained. Everything is scored live by the same engines as the
 * workspace, against a demo brand. Drafts only: a person reviews every case.
 */
const BRAND = INITIAL_BRAND_PROFILE;
const social = (c) => { const r = analyzeSocialCandidate(c, BRAND); return { level: r.riskCategory, score: r.heuristicScore, signals: r.signals }; };
const app = (c) => { const r = analyzeAppCandidate(c, BRAND); return { level: r.riskCategory, score: r.heuristicScore, signals: r.signals }; };
const dom = (n, d, t) => { const r = runFullLookalikeAnalysis(n, d, BRAND, t); return { level: r.overallRiskCategory, score: r.overallScore, signals: r.signals }; };

const THREATS = [
  { id: 't1', Icon: AtSign, kind: 'Social handle', name: '@acrne_official', ring: 0, a: 24, to: 'the platform’s trust & safety team',
    run: () => social({ name: 'Acme Corp Official', username: '@acrne_official', platform: 'X', url: 'https://x.com/acrne_official', bio: 'Official support. DM us your OTP to verify your account.', followerCount: 120, creationDate: '2026-10-01' }) },
  { id: 't2', Icon: Smartphone, kind: 'App listing', name: 'Acme Pay Rewards', ring: 0, a: 144, to: 'the app store’s developer-policy team',
    run: () => app({ name: 'Acme Pay Rewards', developer: 'Unknown Rewards Technologies', store: 'Google Play Store', packageId: 'com.acmepay.rewards', description: 'Earn ₹5,000 cashback instantly. Verify your bank account and enter your UPI PIN to claim.', observedBranding: 'Copies Acme branding and colours' }) },
  { id: 't3', Icon: Globe, kind: 'Domain', name: 'acme-support-login.com', ring: 0, a: 264, to: 'the registrar’s abuse desk',
    run: () => dom('Acme Support', 'acme-support-login.com', 'Sign in to your Acme account to claim your refund.') },
  { id: 't4', Icon: AtSign, kind: 'Social handle', name: '@acme.rewards', ring: 1, a: 84, to: 'the platform’s trust & safety team',
    run: () => social({ name: 'Acme Rewards Club', username: '@acme.rewards', platform: 'X', url: 'https://x.com/acme.rewards', bio: 'Win ₹10,000 cashback. Pay a ₹99 fee to claim your prize.', followerCount: 40, creationDate: '2026-10-10' }) },
  { id: 't5', Icon: Smartphone, kind: 'App listing', name: 'Acme Wallet Pro', ring: 1, a: 204, to: 'the app store’s developer-policy team',
    run: () => app({ name: 'Acme Wallet Pro', developer: 'Wallet Studio', store: 'Third-party APK site', packageId: 'com.acme.wa1let', description: 'Free premium wallet. Enter your card details to unlock.', observedBranding: 'Copies the Acme logo' }) },
  { id: 't6', Icon: Globe, kind: 'Domain', name: 'acme-pay-verify.co', ring: 1, a: 324, to: 'the registrar’s abuse desk',
    run: () => dom('Acme Pay', 'acme-pay-verify.co', 'Verify your account and enter your OTP to avoid suspension.') },
];

const RINGS = [{ r: 43, dur: 80, dir: 1 }, { r: 25, dur: 56, dir: -1 }];
const tone = (lvl) => {
  const l = String(lvl).toLowerCase();
  if (l.includes('crit')) return { text: 'text-danger', bar: 'bg-danger', chip: 'bg-danger/15 text-danger', c: 'rgb(var(--c-danger))' };
  if (l.includes('high')) return { text: 'text-high', bar: 'bg-high', chip: 'bg-high/15 text-high', c: 'rgb(var(--c-high))' };
  if (l.includes('med')) return { text: 'text-warn', bar: 'bg-warn', chip: 'bg-warn/15 text-warn', c: 'rgb(var(--c-warn))' };
  return { text: 'text-ok', bar: 'bg-ok', chip: 'bg-ok/15 text-ok', c: 'rgb(var(--c-ok))' };
};
const RANK = { critical: 3, high: 2, medium: 1, low: 0 };

export default function ThreatOrbit({ container, onDemo }) {
  const reduce = useReducedMotion();
  const data = useMemo(() => THREATS.map((t) => { try { return t.run(); } catch { return { level: 'Medium', score: 50, signals: [] }; } }), []);
  const [sel, setSel] = useState(0);
  const [done, setDone] = useState({});
  const [burst, setBurst] = useState(0);
  const spot = React.useRef(null);
  const onMove = (e) => { const el = spot.current; if (!el || reduce) return; const r = el.getBoundingClientRect(); el.style.setProperty('--sx', `${e.clientX - r.left}px`); el.style.setProperty('--sy', `${e.clientY - r.top}px`); };
  const count = Object.keys(done).length;
  const t = THREATS[sel]; const d = data[sel]; const tn = tone(d.level);
  const top = [...d.signals].sort((a, b) => (RANK[String(b.severity).toLowerCase()] ?? 0) - (RANK[String(a.severity).toLowerCase()] ?? 0)).slice(0, 3);
  const contain = () => {
    setDone((o) => ({ ...o, [t.id]: true }));
    setBurst((b) => b + 1);
    const next = THREATS.findIndex((x, i) => !done[x.id] && i !== sel);
    if (next >= 0) setTimeout(() => setSel(next), 900);
  };
  const all = count === THREATS.length;

  return (
    <div className={`${container} relative mt-16 lg:mt-20`}>
      <div className="hero-fade" style={{ '--d': '300ms' }}><PlateCaption left="Defend Acme" right="Pick a threat · sample brand, real checks" /></div>
      <div ref={spot} onPointerMove={onMove} className="hero-plane relative mt-5 overflow-hidden rounded-[2rem] border border-line bg-surface/50" style={{ '--d': '380ms' }}>
        <div aria-hidden className="pointer-events-none absolute inset-0 z-0" style={{ background: 'radial-gradient(420px circle at var(--sx, 30%) var(--sy, 40%), rgb(var(--c-accent) / 0.10), transparent 60%)' }} />
        <div aria-hidden className="lp-hero-grid pointer-events-none absolute inset-0 opacity-60" />
        <div aria-hidden className="pointer-events-none absolute left-[26%] top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/[0.10] blur-3xl" />
        <div className="relative grid lg:grid-cols-12">
          {/* orbit */}
          <div className="group relative lg:col-span-7">
            <div className="relative mx-auto aspect-square w-full max-w-[560px] p-4 sm:p-8">
              <div className="relative h-full w-full">
                {[100, 86, 50].map((s, i) => <div key={s} aria-hidden className="absolute rounded-full border border-line" style={{ inset: `${(100 - s) / 2}%`, borderStyle: i === 1 ? 'dashed' : 'solid', opacity: 0.6 + i * 0.15 }} />)}
                {/* centre shield: pulses harder as threats are contained */}
                <div className="absolute left-1/2 top-1/2 grid h-[22%] w-[22%] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-accent/40 bg-canvas/90" style={{ boxShadow: `0 0 ${30 + count * 14}px -4px rgb(var(--c-accent) / ${0.35 + count * 0.08})` }}>
                  <motion.div animate={reduce ? undefined : { scale: [1, 1.07, 1] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}><ShieldMark size={44} animate={false} /></motion.div>
                </div>
                {burst > 0 && !reduce && [0, 0.18].map((d) => (
                  <motion.span key={`${burst}-${d}`} aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 h-[22%] w-[22%] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-accent"
                    initial={{ scale: 1, opacity: 0.8 }} animate={{ scale: 4.6, opacity: 0 }} transition={{ duration: 1.3, delay: d, ease: 'easeOut' }} />
                ))}
                {RINGS.map((ring, ri) => (
                  <div key={ri} className="absolute inset-0 group-hover:[animation-play-state:paused]" style={reduce ? undefined : { animation: `${ring.dir > 0 ? 'auth-sweep' : 'orbit-rev'} ${ring.dur}s linear infinite` }}>
                    {THREATS.map((th, i) => th.ring !== ri ? null : (() => {
                      const rad = (th.a * Math.PI) / 180; const x = 50 + ring.r * Math.sin(rad); const y = 50 - ring.r * Math.cos(rad);
                      const isDone = done[th.id]; const on = i === sel; const c = isDone ? 'rgb(var(--c-ok))' : tone(data[i].level).c;
                      return (
                        <div key={th.id} className="absolute" style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}>
                          <div className="group-hover:[animation-play-state:paused]" style={reduce ? undefined : { animation: `${ring.dir > 0 ? 'orbit-rev' : 'auth-sweep'} ${ring.dur}s linear infinite` }}>
                            <button type="button" onClick={() => setSel(i)} aria-label={`${th.kind}: ${th.name}`} aria-pressed={on}
                              className={`relative grid h-12 w-12 place-items-center rounded-full border bg-canvas transition-transform duration-300 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:h-14 sm:w-14 ${on ? 'scale-110' : ''}`}
                              style={{ borderColor: c, boxShadow: on ? `0 0 0 4px ${c.replace(')', ' / 0.18)')}, 0 0 28px ${c.replace(')', ' / 0.5)')}` : `0 0 14px ${c.replace(')', ' / 0.25)')}` }}>
                              {!isDone && !reduce && <span aria-hidden className="absolute inset-0 animate-ping rounded-full opacity-30" style={{ background: c }} />}
                              {isDone ? <Check className="relative h-5 w-5 text-ok" aria-hidden /> : <th.Icon className="relative h-5 w-5" style={{ color: c }} aria-hidden />}
                            </button>
                          </div>
                        </div>
                      );
                    })())}
                  </div>
                ))}
              </div>
            </div>
            <p className="pointer-events-none absolute bottom-4 left-0 right-0 text-center text-[11px] uppercase tracking-[0.24em] text-fgSubtle">{all ? 'Everything contained' : 'Hover to pause · click a threat'}</p>
          </div>

          {/* case panel */}
          <div className="relative border-t border-line p-6 sm:p-8 lg:col-span-5 lg:border-l lg:border-t-0">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.24em] text-fgSubtle">
              <span>Case {sel + 1} of {THREATS.length}</span>
              <span className="flex items-center gap-2"><span className="flex gap-1">{THREATS.map((x) => <span key={x.id} className={`h-1.5 w-5 rounded-full ${done[x.id] ? 'bg-ok' : 'bg-line'}`} />)}</span>{count}/{THREATS.length} drafted</span>
            </div>
            <AnimatePresence mode="wait">
              <motion.div key={t.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }} className="mt-5 min-h-[330px]">
                <p className="flex items-center gap-2 text-sm text-fgMuted"><t.Icon className="h-4 w-4" aria-hidden />{t.kind}</p>
                <p className="mt-1 truncate font-mono text-xl text-fg sm:text-2xl">{t.name}</p>
                <div className="mt-5 flex items-end justify-between">
                  <p className={`font-display text-2xl font-semibold tracking-tight ${done[t.id] ? 'text-ok' : tn.text}`}>{done[t.id] ? 'Report drafted' : `${d.level} risk`}</p>
                  <p className="font-display text-4xl font-semibold tabular-nums">{Math.round(d.score)}<span className="text-base text-fgSubtle">/100</span></p>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line"><motion.div className={`h-full rounded-full ${done[t.id] ? 'bg-ok' : tn.bar}`} initial={{ width: 0 }} animate={{ width: `${Math.max(3, Math.min(100, d.score))}%` }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }} /></div>
                <p className="mt-6 text-[10px] uppercase tracking-[0.24em] text-fgSubtle">Why it was flagged</p>
                <ul className="mt-3 space-y-2.5">
                  {top.map((s, i) => (
                    <motion.li key={`${s.id || s.title}-${i}`} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.12 * i + 0.15 }} className="flex items-start gap-2.5 text-sm">
                      <span className={`mt-0.5 shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium capitalize ${tone(String(s.severity)).chip}`}>{String(s.severity)}</span>
                      <span className="min-w-0 text-fgMuted"><span className="text-fg">{s.title}</span></span>
                    </motion.li>
                  ))}
                </ul>
                <div className="mt-7">
                  {done[t.id] ? (
                    <p className="flex items-start gap-2 rounded-xl border border-ok/30 bg-ok/10 px-3.5 py-3 text-sm text-fgMuted"><FileText className="mt-0.5 h-4 w-4 shrink-0 text-ok" aria-hidden />Draft addressed to {t.to}. It waits for an analyst to review it before anything is sent.</p>
                  ) : (
                    <button type="button" onClick={contain} className="lp-sweep press group inline-flex h-11 items-center gap-2 rounded-full bg-accent pl-5 pr-4 text-sm font-semibold text-onAccent hover:bg-accentHover">Draft the report<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden /></button>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>

            <AnimatePresence>
              {all && (
                <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute inset-3 z-10 grid place-items-center rounded-[1.4rem] border border-accent/40 bg-canvas/95 p-6 text-center backdrop-blur">
                  <div>
                    <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-ok/40 bg-ok/10"><Check className="h-7 w-7 text-ok" aria-hidden /></div>
                    <p className="mt-4 font-display text-2xl font-semibold tracking-tight">All six drafted.</p>
                    <p className="mx-auto mt-2 max-w-[26ch] text-sm text-fgMuted">That took a few clicks. In the workspace, each one also keeps its evidence.</p>
                    <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                      <button type="button" onClick={onDemo} className="lp-sweep press inline-flex h-10 items-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-onAccent hover:bg-accentHover">Open the live demo<ArrowRight className="h-4 w-4" aria-hidden /></button>
                      <button type="button" onClick={() => { setDone({}); setSel(0); }} className="press inline-flex h-10 items-center gap-1.5 rounded-full border border-line px-4 text-sm text-fgMuted hover:text-fg"><RotateCcw className="h-3.5 w-3.5" aria-hidden />Again</button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
