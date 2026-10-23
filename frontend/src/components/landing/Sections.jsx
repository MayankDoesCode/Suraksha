import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useInView, useReducedMotion } from 'framer-motion';
import { ArrowRight, ArrowUpRight, AtSign, Smartphone, Globe, Image as ImageIcon, UserRound, Package, FileText, Layers, TriangleAlert, MessageSquareText, CalendarCheck2, Sparkles, Fingerprint, EyeOff, ScrollText, LockKeyhole } from 'lucide-react';
import { Reveal, CountUp } from './Reveal';
import { DesktopWindow } from './ProductShowcase';
import { GlowText, SectionHead } from './Editorial';
import { ShieldMark } from '../ShieldMark';

const EASE = [0.16, 1, 0.3, 1];
const SCENE_MS = 9000;

/* ------------------------------------------------------------------ platform section: word-by-word headline + four auto scenes */

export function Headline({ lead, accent }) {
  const word = (w, i, cls) => (
    <span key={`${w}-${i}`} className="inline-block overflow-hidden pb-[0.12em] align-bottom">
      <motion.span className={`inline-block ${cls || ''}`} initial={{ y: '105%', opacity: 0, filter: 'blur(10px)' }} whileInView={{ y: 0, opacity: 1, filter: 'blur(0px)' }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.12 + i * 0.07, ease: EASE }}>{w}&nbsp;</motion.span>
    </span>
  );
  const a = lead.split(' '); const b = accent.split(' ');
  return <>{a.map((w, i) => word(w, i))}{b.map((w, i) => word(w, a.length + i, 'lp-gradient-text font-serif-display italic'))}</>;
}

const SOURCES = [
  [AtSign, 'Social handles'], [Smartphone, 'App listings'], [Globe, 'Domains'], [ImageIcon, 'Logos and icons'], [UserRound, 'Publisher names'], [Package, 'Package IDs'], [FileText, 'Descriptions'],
];

function Join() {
  return (
    <div className="w-full rounded-3xl border border-line bg-surface/85 p-5 shadow-[0_40px_100px_-30px_rgb(var(--c-accent)/0.35)] backdrop-blur-xl">
      <p className="flex items-center gap-2 text-[11px] text-fgSubtle"><Layers className="h-3.5 w-3.5 text-accent" aria-hidden />Seven signals, one brand profile</p>
      <div className="relative mt-4 h-56" aria-hidden>
        {SOURCES.map(([Icon, label], i) => {
          const ang = (i / SOURCES.length) * Math.PI * 2 - Math.PI / 2;
          const x = Math.cos(ang) * 150; const y = Math.sin(ang) * 82;
          return (
            <motion.span key={label} className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 rounded-full border border-line bg-surface2 px-2.5 py-1 text-[11px] text-fgMuted"
              initial={{ x, y, opacity: 0 }} animate={{ x: [x, x, x * 0.2], y: [y, y, y * 0.2], opacity: [0, 1, 0.15] }} transition={{ duration: 2.6, times: [0, 0.4, 1], delay: i * 0.08, ease: EASE }}>
              <Icon className="h-3 w-3" />{label}
            </motion.span>
          );
        })}
        <motion.div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-line bg-surface3 px-5 py-3 text-center shadow-[0_0_60px_-10px_rgb(var(--c-accent)/0.5)]" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 1.7, duration: 0.6, ease: EASE }}>
          <p className="font-display text-base font-semibold">Your brand, one view</p>
          <p className="text-[11px] text-fgSubtle">official assets excluded first</p>
        </motion.div>
      </div>
    </div>
  );
}

const WEEKS = 12;
const WAVE = [[1, 1, 2, 1, 1, 2, 3, 5, 6, 6, 5, 3], [1, 1, 1, 2, 2, 3, 4, 4, 5, 6, 4, 3], [2, 1, 1, 1, 2, 2, 2, 3, 3, 4, 3, 2], [1, 1, 1, 1, 1, 2, 2, 2, 3, 3, 2, 2]];
const ROWS = ['Social', 'Apps', 'Domains', 'Logos'];
const tile = (v) => (v >= 5 ? { background: 'rgb(var(--c-accent))', boxShadow: '0 0 14px -3px rgb(var(--c-accent))' } : { backgroundColor: `rgb(var(--c-accent) / ${v >= 3 ? 0.35 : 0.14})` });

function Watch() {
  return (
    <div className="w-full rounded-3xl border border-line bg-surface/85 p-5 shadow-[0_40px_100px_-30px_rgb(var(--c-ai)/0.4)] backdrop-blur-xl">
      <div className="flex items-center justify-between"><p className="font-display text-base font-semibold">Weekly look-alikes</p><span className="text-[11px] text-fgSubtle">New per week, weeks 1 to 12 (sample)</span></div>
      <div className="mt-4 grid grid-cols-[56px_repeat(12,1fr)] gap-1.5">
        {WAVE.map((row, r) => (
          <div key={ROWS[r]} className="contents">
            <span className="self-center text-[11px] text-fgSubtle">{ROWS[r]}</span>
            {row.map((v, i) => <motion.span key={i} className="aspect-[1.1] rounded-[6px]" style={tile(v)} initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.45, delay: 0.04 * (i + r * 2), ease: EASE }} />)}
          </div>
        ))}
        <span />
        {Array.from({ length: WEEKS }, (_, i) => <span key={i} className={`text-center text-[10px] ${i >= 7 ? 'text-danger' : 'text-fgSubtle'}`}>{i + 1}</span>)}
      </div>
      <motion.div className="mt-5 flex items-start gap-2.5 rounded-xl bg-danger/10 px-3 py-2.5 text-xs leading-snug text-danger" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.6, duration: 0.6, ease: EASE }}>
        <TriangleAlert className="mt-px h-4 w-4 shrink-0" aria-hidden /><span>Look-alikes cluster after a launch or a campaign. Suraksha flags them while there is time to act.</span>
      </motion.div>
    </div>
  );
}

const QUESTION = 'high risk social accounts this week';
function Ask() {
  const [typed, setTyped] = useState(0);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (reduce) { setTyped(QUESTION.length); return undefined; }
    const id = setInterval(() => setTyped((t) => (t >= QUESTION.length ? t : t + 1)), 42);
    return () => clearInterval(id);
  }, [reduce]);
  const done = typed >= QUESTION.length;
  const rows = [['@acrne_official', 'Handle one letter off', 71], ['@acme_support_help', 'Logo match 98.8%', 64], ['@acme.rewards', 'Scam wording', 52]];
  return (
    <div className="w-full rounded-3xl border border-line bg-surface/85 p-5 shadow-[0_40px_100px_-30px_rgb(var(--c-ai)/0.4)] backdrop-blur-xl">
      <div className="flex items-center gap-2 text-[11px] text-fgSubtle"><Sparkles className="h-3.5 w-3.5 text-ai" aria-hidden />Ask Suraksha</div>
      <div className="mt-3 rounded-2xl border border-line bg-surface2 px-4 py-3 text-sm">{QUESTION.slice(0, typed)}{!done && <span className="ml-px inline-block h-4 w-px translate-y-0.5 animate-pulse bg-fg" aria-hidden />}</div>
      <motion.p className="mt-4 text-xs text-fgSubtle" initial={{ opacity: 0 }} animate={{ opacity: done ? 1 : 0 }} transition={{ duration: 0.4 }}>7 match, 3 of them high risk. Highest scores first:</motion.p>
      <ul className="mt-3 space-y-2">
        {rows.map(([n, why, s], i) => (
          <motion.li key={n} className="flex items-center gap-3 rounded-xl bg-surface2 px-3 py-2.5" initial={{ opacity: 0, x: 18 }} animate={{ opacity: done ? 1 : 0, x: done ? 0 : 18 }} transition={{ delay: done ? 0.15 * i : 0, duration: 0.5, ease: EASE }}>
            <span className="w-8 text-center font-display text-lg font-semibold text-high">{s}</span>
            <span className="min-w-0 flex-1 truncate font-mono text-sm">{n}</span>
            <span className="hidden text-xs text-fgSubtle sm:inline">{why}</span>
            <span className="rounded-md bg-high/15 px-1.5 py-0.5 text-[10px] text-high">High</span>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}

function Act() {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const cards = [['@acrne_official', 'Platform report', 'Today', 'rgb(var(--c-high))'], ['Acme Pay Rewards', 'App store request', 'Thu', 'rgb(var(--c-warn))'], ['acme-support-login.com', 'Registrar notice', 'Sat', 'rgb(var(--c-ok))']];
  return (
    <div className="w-full rounded-3xl border border-line bg-surface/85 p-5 shadow-[0_40px_100px_-30px_rgb(var(--c-ok)/0.3)] backdrop-blur-xl">
      <div className="grid grid-cols-6 gap-1 text-center">
        {days.map((d, i) => (
          <motion.div key={d} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i, duration: 0.4, ease: EASE }}>
            <p className="text-[10px] text-fgSubtle">{d}</p>
            <span className={i === 2 ? 'mx-auto mt-1 grid h-8 w-8 place-items-center rounded-full bg-accent text-sm font-semibold text-onAccent' : 'mx-auto mt-1 grid h-8 w-8 place-items-center rounded-full text-sm text-fgMuted'}>{14 + i}</span>
          </motion.div>
        ))}
      </div>
      <ul className="mt-5 space-y-2.5">
        {cards.map(([t, s, d, c], i) => (
          <motion.li key={t} className="rounded-2xl border border-line bg-surface2 p-3.5" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 + 0.35 * i, duration: 0.6, ease: EASE }}>
            <div className="flex items-center justify-between"><p className="font-mono text-sm">{t}</p><span className="h-2 w-2 rounded-full" style={{ background: c, boxShadow: `0 0 10px ${c}` }} /></div>
            <div className="mt-1 flex items-center justify-between text-[11px] text-fgSubtle"><span>{s}, drafted not sent</span><span className="flex items-center gap-1"><CalendarCheck2 className="h-3 w-3" aria-hidden />{d}</span></div>
          </motion.li>
        ))}
      </ul>
      <motion.p className="mt-4 text-center text-xs text-fgSubtle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.9 }}>Every report is logged with its evidence, so you can see if it worked.</motion.p>
    </div>
  );
}

const SCENES = [{ key: 'join', label: 'Join', icon: Layers, View: Join }, { key: 'watch', label: 'Watch', icon: TriangleAlert, View: Watch }, { key: 'ask', label: 'Ask', icon: MessageSquareText, View: Ask }, { key: 'act', label: 'Act', icon: CalendarCheck2, View: Act }];

export function HeroStage() {
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (reduce || paused) return undefined;
    const t = setTimeout(() => setI((x) => (x + 1) % SCENES.length), SCENE_MS);
    return () => clearTimeout(t);
  }, [i, paused, reduce]);
  const Scene = SCENES[i].View;
  return (
    <div onPointerEnter={() => setPaused(true)} onPointerLeave={() => setPaused(false)} onFocusCapture={() => setPaused(true)} onBlurCapture={() => setPaused(false)}>
      <div className="relative mx-auto flex min-h-[420px] w-full max-w-[560px] items-center sm:min-h-[460px]">
        <div aria-hidden className="lp-orb pointer-events-none absolute inset-0 -z-10 m-auto h-[420px] w-[420px] rounded-full blur-3xl" />
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={SCENES[i].key} className="w-full" initial={{ opacity: 0, y: 24, scale: 0.97, filter: 'blur(8px)' }} animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }} exit={{ opacity: 0, y: -18, scale: 0.98, filter: 'blur(8px)' }} transition={{ duration: 0.55, ease: EASE }}>
            <Scene />
          </motion.div>
        </AnimatePresence>
      </div>
      <div role="tablist" aria-label="Product tour" className="mx-auto mt-6 flex max-w-[560px] gap-2">
        {SCENES.map((s, n) => (
          <button key={s.key} type="button" role="tab" aria-selected={n === i} onClick={() => setI(n)} className="group flex-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-accent">
            <span className="relative block h-1 overflow-hidden rounded-full bg-fgSubtle/20">
              {n < i && <span className="absolute inset-0 bg-fgSubtle/60" />}
              {n === i && <motion.span key={`${i}-${paused}`} className="absolute inset-y-0 left-0 bg-accent" initial={{ width: reduce || paused ? '100%' : '0%' }} animate={{ width: '100%' }} transition={{ duration: reduce || paused ? 0 : SCENE_MS / 1000, ease: 'linear' }} />}
            </span>
            <span className={`mt-2 flex items-center gap-1.5 text-xs ${n === i ? 'text-fg' : 'text-fgSubtle group-hover:text-fgMuted'}`}><s.icon className="h-3 w-3" aria-hidden />{s.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function PlatformSection({ onDemo, container }) {
  return (
    <section id="platform" className="relative isolate overflow-hidden border-t border-line/70">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="lp-aurora -left-40 -top-56 h-[560px] w-[560px]" /><div className="lp-aurora -right-32 top-10 h-[480px] w-[480px]" style={{ animationDuration: '28s' }} />
        {[['8%', '22%', '9s'], ['42%', '14%', '11s'], ['88%', '30%', '10s'], ['30%', '82%', '12s'], ['72%', '88%', '9s']].map(([l, t, d], i) => <span key={i} className="lp-dot" style={{ left: l, top: t, animationDuration: d, animationDelay: `${-i * 2}s` }} />)}
      </div>
      <div className={`${container} grid items-center gap-14 pb-20 pt-24 lg:grid-cols-[1.1fr_1fr] lg:pb-24`}>
        <div>
          <SectionHead index="01" label="Social and app monitoring" />
          <Reveal delay={60}><h2 className="mt-6 font-display text-[2.6rem] font-semibold leading-[1.02] tracking-[-0.035em] sm:text-6xl lg:text-[3.9rem] xl:text-[4.25rem]"><Headline lead="Catch the fake early." accent="Then do something about it." /></h2></Reveal>
          <Reveal delay={140}><p className="mt-6 max-w-[34rem] text-lg leading-relaxed text-fgMuted">Suraksha reads handles, app listings, domains and logos as one, shows analysts what is suspicious and why, and tracks what happens next.</p></Reveal>
          <Reveal delay={220}>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <button type="button" onClick={onDemo} className="lp-sweep press group inline-flex h-12 items-center gap-2 rounded-full bg-accent pl-6 pr-5 text-[15px] font-semibold text-onAccent hover:bg-accentHover">Open the live demo<ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden /></button>
              <a href="#how" className="press inline-flex h-12 items-center rounded-full border border-line px-5 text-[15px] font-medium hover:border-fgSubtle hover:bg-surface3/50">See how it works</a>
            </div>
          </Reveal>
          <Reveal delay={300}><ul className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm text-fgSubtle"><li>Explainable scores</li><li>Reports drafted, never sent</li><li>Role-based access</li></ul></Reveal>
        </div>
        <div className="relative"><HeroStage /></div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ marquee with icons + measured proof */

export function IconMarquee() {
  return (
    <section aria-label="What Suraksha reads" className="relative border-y border-line/70 bg-surface2/40 py-6">
      <div className="overflow-hidden" style={{ maskImage: 'linear-gradient(to right, transparent, #000 12%, #000 88%, transparent)' }}>
        <ul className="lp-marquee flex w-max gap-4">
          {[...SOURCES, ...SOURCES].map(([Icon, label], i) => (
            <li key={i} aria-hidden={i >= SOURCES.length} className="flex items-center gap-2.5 rounded-full border border-line bg-surface px-4 py-2 text-sm text-fgMuted"><Icon className="h-4 w-4 text-accent" aria-hidden />{label}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}

const PROOF = [
  { v: '98.8%', label: 'logo match, edited copy', note: 'perceptual hash of a recoloured, resized copy of the official logo' },
  { v: '62.7%', label: 'logo match, unrelated logo', note: 'the gap between these two is what separates a copy from a coincidence' },
  { v: '83%', label: 'phishing root domains caught', note: '88 domains from a public feed, none seen in training' },
  { v: '0', label: 'labelled impersonation sets', note: 'for social and apps, so those stay rule-based' },
];

export function ProofStrip({ container }) {
  return (
    <section aria-label="Measured results" className={`${container} pt-20`}>
      <div className="mb-8"><SectionHead index="02" label="Measured, not claimed" /></div>
      <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {PROOF.map((p, i) => (
          <li key={p.label}>
            <Reveal delay={i * 60} className="h-full">
              <div className="h-full rounded-3xl border border-line bg-gradient-to-b from-surface to-transparent p-6">
                <p className="font-display text-4xl font-semibold tracking-tight sm:text-5xl"><CountUp value={p.v} /></p>
                <p className="mt-2 text-sm">{p.label}</p>
                <p className="mt-1 text-xs text-fgSubtle">{p.note}</p>
              </div>
            </Reveal>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-fgSubtle">Logo figures were measured in a browser on sample images. The domain figure is one public feed on one day. Model output is supporting evidence only.</p>
    </section>
  );
}

/* ------------------------------------------------------------------ bento: tiles that light up under the cursor */

function Tile({ className = '', children }) {
  const ref = useRef(null);
  return (
    <div ref={ref} onPointerMove={(e) => { const r = ref.current.getBoundingClientRect(); ref.current.style.setProperty('--mx', `${e.clientX - r.left}px`); ref.current.style.setProperty('--my', `${e.clientY - r.top}px`); }} className={`lp-tile group relative overflow-hidden rounded-3xl border border-line bg-surface p-6 sm:p-8 ${className}`}>{children}</div>
  );
}

function MergeVisual() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const chips = ['Handles', 'Apps', 'Domains', 'Logos', 'Publishers', 'Packages', 'Wording'];
  return (
    <div ref={ref} className="relative mt-8 h-40" aria-hidden>
      {chips.map((s, i) => {
        const ang = (i / chips.length) * Math.PI * 2; const x = Math.cos(ang) * 150; const y = Math.sin(ang) * 58;
        return <motion.span key={s} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-line bg-surface2 px-2.5 py-1 text-xs text-fgMuted" initial={{ x, y, opacity: 0 }} animate={inView ? { x: [x, x, x * 0.18], y: [y, y, y * 0.18], opacity: [0, 1, 0] } : {}} transition={{ duration: 2.2, times: [0, 0.45, 1], delay: i * 0.06, ease: EASE }}>{s}</motion.span>;
      })}
      <motion.div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-line bg-surface3 px-4 py-3 text-center shadow-[0_0_60px_-10px_rgb(var(--c-accent)/0.5)]" initial={{ scale: 0.6, opacity: 0 }} animate={inView ? { scale: 1, opacity: 1 } : {}} transition={{ delay: 1.55, duration: 0.6, ease: EASE }}>
        <p className="font-display text-sm font-semibold">1 brand, 1 view</p><p className="text-[11px] text-fgSubtle">every flag traced to its evidence</p>
      </motion.div>
    </div>
  );
}

const ASK = 'app listings that copy our icon and have a new publisher';
function AskPreview() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduce = useReducedMotion();
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!inView) return undefined;
    if (reduce) { setN(ASK.length); return undefined; }
    const id = setInterval(() => setN((v) => (v >= ASK.length ? (clearInterval(id), v) : v + 1)), 28);
    return () => clearInterval(id);
  }, [inView, reduce]);
  const done = n >= ASK.length;
  return (
    <div ref={ref} className="mt-6 space-y-3 font-mono text-[12px]">
      <div className="rounded-xl border border-line bg-canvas/60 px-3 py-2.5">{ASK.slice(0, n)}{!done && <span className="ml-px inline-block h-3.5 w-1.5 translate-y-0.5 animate-pulse bg-accent" />}</div>
      <motion.pre className="overflow-hidden rounded-xl border border-line bg-canvas/60 px-3 py-2.5 leading-relaxed text-fgMuted" initial={{ opacity: 0, y: 6 }} animate={done ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5 }}>
        <span className="text-accent">type</span>: [&quot;app&quot;]{'\n'}<span className="text-accent">icon_match</span>: &quot;high&quot;{'\n'}<span className="text-accent">publisher</span>: &quot;new&quot;
      </motion.pre>
    </div>
  );
}

export function Bento() {
  return (
    <div className="grid gap-4 lg:grid-cols-6">
      <Tile className="lg:col-span-4">
        <h3 className="font-display text-2xl font-semibold tracking-tight">Messy names, one brand</h3>
        <p className="mt-2 max-w-md text-fgMuted">Swapped letters, look-alike characters from other alphabets, a new publisher with the same icon. Suraksha reads them against your official assets and sends the ambiguous ones to a person.</p>
        <MergeVisual />
      </Tile>
      <Tile className="lg:col-span-2">
        <h3 className="font-display text-2xl font-semibold tracking-tight">Two kinds of evidence, never blended</h3>
        <p className="mt-2 text-fgMuted">Rules set severity. The model adds a small, capped, labelled contribution.</p>
        <div className="mt-8 space-y-3">
          {[['Rules decide severity', 'up to 100', 'rgb(var(--c-high))', 1], ['Model contribution, capped', 'up to 8 points', 'rgb(var(--c-ai))', 0.08]].map(([l, v, c, w]) => (
            <div key={l}>
              <div className="mb-1.5 flex justify-between text-sm"><span>{l}</span><span className="tabular-nums text-fgSubtle">{v}</span></div>
              <motion.div className="h-1.5 rounded-full" style={{ background: c, transformOrigin: 'left' }} initial={{ scaleX: 0 }} whileInView={{ scaleX: w }} viewport={{ once: true }} transition={{ duration: 1.2, ease: EASE }} />
            </div>
          ))}
          <p className="pt-1 text-xs text-fgSubtle">The model can support a flag. It can never raise one on its own.</p>
        </div>
      </Tile>
      <Tile className="lg:col-span-2">
        <h3 className="font-display text-2xl font-semibold tracking-tight">Ask in plain English</h3>
        <p className="mt-2 text-fgMuted">A question becomes a validated filter. Never raw queries.</p>
        <AskPreview />
      </Tile>
      <Tile className="p-0 sm:p-0 lg:col-span-4">
        <div className="p-6 pb-0 sm:p-8 sm:pb-0">
          <h3 className="font-display text-2xl font-semibold tracking-tight">Campaigns, not single alerts</h3>
          <p className="mt-2 max-w-lg text-fgMuted">Accounts and apps that share a logo or infrastructure are grouped, so one takedown can cover the whole set.</p>
        </div>
        <div className="relative mt-6 h-56 overflow-hidden">
          <div className="absolute left-6 top-0 w-[115%] origin-top-left scale-[0.82] transition-transform duration-700 group-hover:-translate-y-6"><DesktopWindow role="Lead" wide /></div>
          <div aria-hidden className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-surface to-transparent" />
        </div>
      </Tile>
      <Tile className="lg:col-span-6">
        <div className="grid gap-8 lg:grid-cols-[1fr_2fr] lg:items-center">
          <div><h3 className="font-display text-2xl font-semibold tracking-tight">Honest by design</h3><p className="mt-2 text-fgMuted">Support, never guesswork. You can always see why something was flagged.</p></div>
          <ul className="grid gap-4 sm:grid-cols-2">
            {[[Fingerprint, 'Official assets excluded', 'Your verified handles, apps and domains never become findings.'], [EyeOff, 'AI never sets severity', 'Model output sits beside the rules, not inside the score.'], [ScrollText, 'Reports are drafts', 'A named analyst verifies each one before it leaves.'], [LockKeyhole, 'Every figure names its test', 'Samples and limits are stated next to the number.']].map(([I, t, d]) => (
              <li key={t} className="flex gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-line bg-surface2"><I className="h-4 w-4 text-accent" aria-hidden /></span>
                <span><span className="block text-sm font-medium">{t}</span><span className="block text-sm text-fgSubtle">{d}</span></span>
              </li>
            ))}
          </ul>
        </div>
      </Tile>
    </div>
  );
}

/* ------------------------------------------------------------------ why, go deeper, closing */

export function WhyCard({ container }) {
  return (
    <section className={`${container} pt-28`}>
      <div className="grid gap-10 rounded-3xl border border-line bg-gradient-to-br from-surface to-transparent p-8 sm:p-12 lg:grid-cols-2">
        <Reveal><h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">An alert alone doesn&apos;t remove a fake. A report does.</h2></Reveal>
        <Reveal delay={100}>
          <div className="space-y-4 text-fgMuted">
            <p>Most tools end at the red flag, and the analyst is left to find the evidence, the contact and the wording by hand.</p>
            <p>So Suraksha is built around the step after the flag: a reason, the evidence, a draft report, an owner, and a way to check whether it worked.</p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

const EXPLORE = [
  ['Scanner', 'Paste a handle, app or domain and see the evidence.', '#sandbox'],
  ['How it works', 'From official assets to a verified report, step by step.', '#how'],
  ['Trust', 'What is excluded, what is capped and what is only a draft.', '#product'],
  ['Measured', 'Every figure with its test and its limits.', '#measured'],
];

export function GoDeeper({ container }) {
  return (
    <section className={`${container} pt-28`}>
      <div className="mb-6"><SectionHead index="07" label="Go deeper" /></div>
      <Reveal><h2 className="max-w-2xl font-display text-3xl font-semibold tracking-tight sm:text-4xl"><GlowText radius={260}>Everything an analyst, a lawyer or a judge would ask</GlowText></h2></Reveal>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {EXPLORE.map(([t, b, h], i) => (
          <Reveal key={t} delay={i * 60}>
            <a href={h} className="lp-edge group flex h-full flex-col rounded-3xl border border-line bg-surface p-6 transition-colors hover:bg-surface3/60">
              <span className="flex items-center justify-between font-display text-xl font-semibold">{t}<ArrowUpRight className="h-5 w-5 text-fgSubtle transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-fg" aria-hidden /></span>
              <span className="mt-3 text-sm leading-relaxed text-fgSubtle">{b}</span>
            </a>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/** Logo that materialises, holds, dissolves and returns on a loop. Static when reduced motion is on. */
function BlinkLogo() {
  const reduce = useReducedMotion();
  return (
    <div aria-hidden className="relative mx-auto mb-8 grid h-24 w-24 place-items-center">
      <motion.span className="absolute inset-0 rounded-full border border-accent/40"
        animate={reduce ? undefined : { scale: [0.6, 1.5], opacity: [0.7, 0] }} transition={{ duration: 4.8, repeat: Infinity, ease: 'easeOut' }} />
      <motion.span className="absolute inset-3 rounded-full bg-accent/15 blur-xl"
        animate={reduce ? undefined : { opacity: [0, 0.9, 0.9, 0, 0] }} transition={{ duration: 4.8, repeat: Infinity, times: [0, 0.25, 0.65, 0.85, 1] }} />
      <motion.div
        animate={reduce ? undefined : { opacity: [0, 1, 1, 0, 0], scale: [0.6, 1, 1.04, 0.8, 0.6], filter: ['blur(10px)', 'blur(0px)', 'blur(0px)', 'blur(8px)', 'blur(10px)'] }}
        transition={{ duration: 4.8, repeat: Infinity, times: [0, 0.25, 0.65, 0.85, 1], ease: 'easeInOut' }}>
        <ShieldMark size={64} animate={false} />
      </motion.div>
    </div>
  );
}

export function ClosingCta({ onDemo, container }) {
  return (
    <section className="relative isolate mt-28 overflow-hidden border-t border-line/70">
      <div aria-hidden className="lp-aurora left-1/4 -top-40 -z-10 h-[420px] w-[620px]" />
      <div className={`${container} py-28 text-center`}>
        <BlinkLogo />
        <Reveal><h2 className="mx-auto max-w-3xl font-display text-4xl font-semibold leading-[1.05] tracking-[-0.035em] sm:text-6xl">From early warning to a <span className="lp-gradient-text font-serif-display italic">verified report.</span></h2></Reveal>
        <Reveal delay={100}><p className="mx-auto mt-5 max-w-xl text-lg text-fgMuted">Open the demo workspace and follow one fake from the first flag to a drafted report.</p></Reveal>
        <Reveal delay={200}>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <button type="button" onClick={onDemo} className="lp-sweep press group inline-flex h-12 items-center gap-2 rounded-full bg-accent pl-6 pr-5 text-[15px] font-semibold text-onAccent hover:bg-accentHover">Open the live demo<ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden /></button>
            <a href="#sandbox" className="press inline-flex h-12 items-center rounded-full border border-line px-5 text-[15px] font-medium hover:border-fgSubtle hover:bg-surface3/50">Try the scanner</a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
