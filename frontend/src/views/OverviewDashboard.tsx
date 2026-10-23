import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  AlertTriangle, ArrowRight, Building2, CalendarCheck2, ChevronLeft, ChevronRight, ClipboardCheck, Layers, Link2, ShieldCheck,
  Sparkles, Info, Eye, X, Gauge, Undo2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { CountUp as LandCount } from '../components/landing/Reveal';
import { Stagger, StaggerItem, ProgressRing } from '../components/motion';
import { ShieldMark } from '../components/ShieldMark';
import { GlowText } from '../components/landing/Editorial';
import { deriveThreatGraph } from '../utils/threatGraph';
import type { CandidateAsset, InvestigationStatus, RiskLevel } from '../types';

const EASE = [0.16, 1, 0.3, 1] as const;
const SEVERITY_RANK: Record<RiskLevel, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 };
const SEV: { key: RiskLevel; bar: string; text: string; soft: string }[] = [
  { key: 'Critical', bar: 'bg-danger', text: 'text-danger', soft: 'bg-danger/15' },
  { key: 'High', bar: 'bg-high', text: 'text-high', soft: 'bg-high/15' },
  { key: 'Medium', bar: 'bg-warn', text: 'text-warn', soft: 'bg-warn/15' },
  { key: 'Low', bar: 'bg-ok', text: 'text-ok', soft: 'bg-ok/15' },
];
const sevOf = (k: RiskLevel) => SEV.find((s) => s.key === k) || SEV[3];
const TYPE_LABEL: Record<string, string> = { social: 'Social', app: 'Apps', domain: 'Domains', infrastructure: 'Infrastructure' };
const OPEN_STATUSES: InvestigationStatus[] = ['New', 'Investigating'];

const time = (iso: string) => { const t = Date.parse(iso); return Number.isNaN(t) ? 0 : t; };
const greeting = () => { const h = new Date().getHours(); return h < 5 ? 'Working late' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; };
const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const weekStart = (t: number) => { const d = new Date(t); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.getTime(); };

/* ------------------------------------------------------------------ building blocks (same shapes as the reference kit) */

function Panel({ title, description, action, children, className = '', flush = false }: { title: string; description?: string; action?: React.ReactNode; children: React.ReactNode; className?: string; flush?: boolean }) {
  return (
    <section className={`rounded-3xl border border-line bg-surface ${className}`}>
      <header className="flex items-start justify-between gap-3 px-6 pt-5">
        <div className="min-w-0"><h2 className="font-display text-base font-semibold tracking-tight">{title}</h2>{description && <p className="mt-0.5 text-xs text-fgSubtle">{description}</p>}</div>
        {action}
      </header>
      <div className={flush ? 'pb-2 pt-3' : 'px-6 pb-6 pt-4'}>{children}</div>
    </section>
  );
}

function Stat({ label, value, hint, icon: Icon, tone, onClick }: { label: string; value: number; hint: string; icon: React.ElementType; tone?: 'high' | 'medium'; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} className="press group h-full w-full rounded-3xl border border-line bg-surface p-5 text-left transition-colors hover:border-fgSubtle hover:bg-surface3/40">
      <div className="flex items-center justify-between text-xs text-fgSubtle"><span>{label}</span><Icon className={`h-4 w-4 ${tone === 'high' ? 'text-high' : tone === 'medium' ? 'text-warn' : 'text-fgSubtle'}`} aria-hidden /></div>
      <p className="mt-3 font-display text-4xl font-semibold tracking-tight tabular-nums"><LandCount value={String(value)} /></p>
      <p className="mt-1 text-xs text-fgSubtle">{hint}</p>
    </button>
  );
}

function CampusHero({ greetingText, summary, onPrimary, primaryLabel, chips, radarItems }: { radarItems: RadarItem[]; greetingText: string; summary: React.ReactNode; onPrimary: () => void; primaryLabel: string; chips: { label: string; onClick: () => void }[] }) {
  return (
    <section data-theme="dark" className="relative isolate overflow-hidden rounded-3xl border border-line bg-[#0a0a0d] p-6 text-white shadow-[0_30px_80px_-40px_rgb(var(--c-accent)/0.6)] sm:p-8">
      <ShieldOrb />
      <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(600px circle at 0% 100%, rgb(var(--c-accent)/0.22), transparent 60%)' }} />
      <div aria-hidden className="lp-hero-grid pointer-events-none absolute inset-0 opacity-70" />
      <div className="relative max-w-xl pr-24 sm:pr-40 md:pr-56 lg:pr-0">
        <p className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/70 backdrop-blur"><Sparkles className="h-3 w-3" aria-hidden />Brand intelligence</p>
        <h1 className="mt-4 font-display text-3xl font-semibold tracking-[-0.02em] sm:text-[2.4rem] sm:leading-[1.08]"><GlowText radius={240}>{greetingText}</GlowText></h1>
        <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-white/65">{summary}</p>
        <div className="mt-6 flex flex-wrap items-center gap-2.5">
          <button type="button" onClick={onPrimary} className="press lp-sweep group inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-onAccent hover:bg-accentHover">{primaryLabel}<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden /></button>
          {chips.map((c) => <button key={c.label} type="button" onClick={c.onClick} className="press rounded-full border border-white/15 bg-white/5 px-3.5 py-2 text-sm text-white/80 backdrop-blur hover:bg-white/10 hover:text-white">{c.label}</button>)}
        </div>
      </div>
    </section>
  );
}

const RiskBadge = ({ level }: { level: RiskLevel }) => { const s = sevOf(level); return <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium ${s.soft} ${s.text}`}>{level}</span>; };

type RadarItem = { id: string; label: string; level: RiskLevel };

/** The hero centrepiece: the Suraksha shield rendered like a glowing glass orb (soft ring, light from the top left, slow float). */
function ShieldOrb(_props: { items?: RadarItem[] }) {
  return (
    <div aria-hidden className="pointer-events-none absolute -right-14 top-1/2 h-[320px] w-[320px] origin-right -translate-y-1/2 scale-[0.5] sm:-right-8 sm:scale-[0.62] md:scale-[0.8] lg:right-8 lg:scale-100">
      <div className="lp-orb absolute inset-0 rounded-full opacity-70 blur-[2px]" />
      <div className="absolute inset-0 rounded-full" style={{ background: 'radial-gradient(closest-side, transparent 58%, #0a0a0d 100%)' }} />
      <div className="lp-float absolute inset-0 grid place-items-center">
        <div style={{ transform: 'perspective(800px) translate3d(calc(var(--hx, 0) * -16px), calc(var(--hy, 0) * -12px), 0) rotateY(calc(var(--hx, 0) * 16deg)) rotateX(calc(var(--hy, 0) * -12deg))', transition: 'transform 0.25s ease-out' }}>
        <svg viewBox="0 0 200 240" className="h-[210px] w-[175px] drop-shadow-[0_24px_50px_rgba(120,170,255,0.45)]">
          <defs>
            <radialGradient id="so-body" cx="30%" cy="22%" r="95%"><stop offset="0%" stopColor="#f2f7ff" /><stop offset="38%" stopColor="rgb(168 200 255)" /><stop offset="78%" stopColor="#3b5fa8" /><stop offset="100%" stopColor="#101a36" /></radialGradient>
            <linearGradient id="so-rim" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" /><stop offset="100%" stopColor="#8fb4ff" stopOpacity="0.15" /></linearGradient>
            <clipPath id="so-clip"><path d="M100 8 L182 38 V108 C182 166 148 208 100 232 C52 208 18 166 18 108 V38 Z" /></clipPath>
          </defs>
          <path d="M100 8 L182 38 V108 C182 166 148 208 100 232 C52 208 18 166 18 108 V38 Z" fill="url(#so-body)" />
          <g clipPath="url(#so-clip)"><ellipse cx="78" cy="58" rx="86" ry="44" fill="#fff" opacity="0.22" transform="rotate(-18 78 58)" /><ellipse cx="130" cy="214" rx="90" ry="40" fill="#000" opacity="0.28" /></g>
          <path d="M100 8 L182 38 V108 C182 166 148 208 100 232 C52 208 18 166 18 108 V38 Z" fill="none" stroke="url(#so-rim)" strokeWidth="2.2" />
          <path d="M100 30 L162 52 V108 C162 152 136 186 100 206 C64 186 38 152 38 108 V52 Z" fill="none" stroke="#fff" strokeOpacity="0.22" strokeWidth="1.4" />
          <path d="M70 116 L93 139 L134 92" fill="none" stroke="#0d1530" strokeOpacity="0.85" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M70 116 L93 139 L134 92" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        </div>
      </div>
    </div>
  );
}

/** "Review first" list with the keyboard and hover actions the reference's planner has: J/K move, Enter opens, I investigates, D dismisses. */
function ReviewList({ items, onOpen, onAct }: { items: CandidateAsset[]; onOpen: (c: CandidateAsset) => void; onAct: (c: CandidateAsset, next: InvestigationStatus) => void }) {
  const [sel, setSel] = useState(0);
  const list = items.slice(0, 5);
  useEffect(() => { if (sel >= list.length) setSel(Math.max(0, list.length - 1)); }, [list.length, sel]);
  const onKey = (e: React.KeyboardEvent) => {
    const c = list[sel]; if (!c) return;
    if (e.key === 'j' || e.key === 'ArrowDown') { e.preventDefault(); setSel((n) => Math.min(list.length - 1, n + 1)); }
    else if (e.key === 'k' || e.key === 'ArrowUp') { e.preventDefault(); setSel((n) => Math.max(0, n - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); onOpen(c); }
    else if (e.key === 'i' && c.status === 'New') onAct(c, 'Investigating');
    else if (e.key === 'd') onAct(c, 'Dismissed');
  };
  if (list.length === 0) return <p className="px-6 pb-4 text-sm text-fgSubtle">Nothing waiting. New findings show up here.</p>;
  return (
    <div>
      <ul role="listbox" aria-label="Findings to review first" tabIndex={0} onKeyDown={onKey} className="divide-y divide-line outline-none focus-visible:ring-2 focus-visible:ring-accent/60">
        <AnimatePresence initial={false}>
          {list.map((c, i) => {
            const on = i === sel;
            return (
              <motion.li key={c.id} layout exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }} role="option" aria-selected={on} onPointerEnter={() => setSel(i)} className={`group relative ${on ? 'bg-surface3/50' : ''}`}>
                {on && <span className="absolute inset-y-2 left-0 w-0.5 rounded bg-accent" aria-hidden />}
                <button type="button" tabIndex={-1} onClick={() => onOpen(c)} className="flex w-full items-center gap-3 px-6 py-3 pr-28 text-left transition-colors">
                  <span className={`w-8 text-center font-display text-lg font-semibold ${sevOf(c.riskCategory).text}`}>{SEVERITY_RANK[c.riskCategory]}</span>
                  <span className="min-w-0 flex-1"><span className="block truncate font-mono text-sm">{c.identifier || c.title}</span><span className="block truncate text-xs text-fgSubtle">{c.evidenceSupporting?.[0] || c.summary || TYPE_LABEL[c.type]}</span></span>
                </button>
                <span className={`absolute right-4 top-1/2 -translate-y-1/2 ${on ? 'hidden' : 'group-hover:hidden'}`}><RiskBadge level={c.riskCategory} /></span>
                <span className={`absolute right-3 top-1/2 -translate-y-1/2 items-center gap-1 ${on ? 'flex' : 'hidden group-hover:flex'}`}>
                  {c.status === 'New' && <button type="button" tabIndex={-1} onClick={() => onAct(c, 'Investigating')} className="press inline-flex items-center gap-1 rounded-full border border-line bg-surface px-2.5 py-1 text-[11px] hover:border-fgSubtle"><Eye className="h-3 w-3" aria-hidden />Investigate</button>}
                  <button type="button" tabIndex={-1} onClick={() => onAct(c, 'Dismissed')} aria-label="Dismiss finding" className="press grid h-6 w-6 place-items-center rounded-full border border-line bg-surface text-fgSubtle hover:text-fg"><X className="h-3 w-3" /></button>
                </span>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>
      <p className="px-6 pb-3 pt-2 text-[11px] text-fgSubtle">Click the list, then J / K to move, Enter to open, I to investigate, D to dismiss.</p>
    </div>
  );
}

/** Slider widget (same pattern as the reference's attendance slider): how many reviews a day clears the backlog, and when. */
function ReviewPlanner({ waiting }: { waiting: number }) {
  const [perDay, setPerDay] = useState(4);
  const days = waiting === 0 ? 0 : Math.ceil(waiting / perDay);
  const done = new Date(); let left = days;
  while (left > 0) { done.setDate(done.getDate() + 1); if (done.getDay() !== 0 && done.getDay() !== 6) left -= 1; }
  const dots = Math.min(waiting, 30);
  return (
    <Panel title="Plan the review" description="Drag to see when the open findings would be cleared">
      <div className="grid gap-6 sm:grid-cols-[1.2fr_1fr] sm:items-center">
        <div>
          <div className="flex items-baseline justify-between text-sm"><label htmlFor="perday" className="text-fgMuted">Reviews per working day</label><span className="font-display text-2xl font-semibold tabular-nums">{perDay}</span></div>
          <input id="perday" type="range" min={1} max={20} value={perDay} onChange={(e) => setPerDay(Number(e.target.value))} className="mt-3 w-full cursor-pointer accent-[rgb(var(--c-accent))]" aria-valuetext={`${perDay} reviews per day`} />
          <div className="mt-4 flex flex-wrap gap-1" aria-hidden>
            {Array.from({ length: dots }, (_, i) => <motion.span key={i} className={`h-2.5 w-2.5 rounded-full ${i < perDay ? 'bg-accent' : 'bg-fg/15'}`} layout transition={{ duration: 0.3 }} />)}
          </div>
          <p className="mt-2 text-[11px] text-fgSubtle">Bright dots are what one day clears. Assumes the same pace each working day and no new findings.</p>
        </div>
        <div className="rounded-2xl border border-line bg-surface2 p-5 text-center">
          <Gauge className="mx-auto h-5 w-5 text-accent" aria-hidden />
          {waiting === 0 ? <p className="mt-2 text-sm text-fgMuted">Nothing waiting. You are clear.</p> : (<>
            <p className="mt-2 font-display text-4xl font-semibold tabular-nums">{days}<span className="ml-1 text-base text-fgSubtle">working day{days === 1 ? '' : 's'}</span></p>
            <p className="mt-1 text-sm text-fgMuted">to clear {waiting} open finding{waiting === 1 ? '' : 's'}, by {done.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</p>
          </>)}
        </div>
      </div>
    </Panel>
  );
}

/** Last 12 weeks x asset type; tile strength is the real count of findings created that week. */
function WeeklyHeat({ candidates, onPick }: { candidates: CandidateAsset[]; onPick: (c: CandidateAsset) => void }) {
  const now = weekStart(Date.now());
  const weeks = Array.from({ length: 12 }, (_, i) => now - (11 - i) * 7 * 864e5);
  const types = ['social', 'app', 'domain'];
  const grid = types.map((t) => weeks.map((w) => candidates.filter((c) => c.type === t && weekStart(time(c.createdDate)) === w).length));
  const max = Math.max(1, ...grid.flat());
  const total = grid.flat().reduce((a, b) => a + b, 0);
  const thisWeek = grid.reduce((a, row) => a + row[11], 0);
  const peakIdx = Math.max(...grid.map((row) => row.indexOf(Math.max(...row))), 0);
  // same tile treatment as the reference: solid + glow when strong, hatched when light, faint hatch when empty
  const tile = (v: number): React.CSSProperties => {
    if (v >= max && v > 0) return { background: 'rgb(var(--c-accent))', boxShadow: '0 0 16px -3px rgb(var(--c-accent))' };
    const a = v === 0 ? 0.05 : 0.18 + 0.4 * (v / max);
    return { backgroundColor: `rgb(var(--c-accent) / ${a})`, backgroundImage: `repeating-linear-gradient(115deg, rgb(var(--c-accent) / ${v === 0 ? 0.08 : a + 0.25}) 0 1.5px, transparent 1.5px 5px)` };
  };
  return (
    <div>
      <div className="grid grid-cols-[64px_repeat(12,1fr)] gap-1.5">
        {grid.map((row, r) => (
          <div key={types[r]} className="contents">
            <span className="self-center text-[11px] text-fgSubtle">{TYPE_LABEL[types[r]]}</span>
            {row.map((v, i) => (
              <motion.span key={i} title={`${v} new finding${v === 1 ? '' : 's'}`} className={`aspect-[1.25] rounded-[7px] transition-transform duration-200 hover:scale-110 ${v ? "cursor-pointer" : ""}`} onClick={() => { const hit = candidates.find((c) => c.type === types[r] && weekStart(time(c.createdDate)) === weeks[i]); if (hit) onPick(hit); }} style={tile(v)} initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.45, delay: 0.035 * (i + r * 2), ease: EASE }} />
            ))}
          </div>
        ))}
        <span />
        {weeks.map((w, i) => <span key={w} className="text-center text-[10px] text-fgSubtle">{i % 3 === 0 ? new Date(w).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''}</span>)}
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 rounded-xl bg-accent/10 px-3 py-2 text-xs text-fgMuted"><span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />{total === 0 ? 'No findings in the last 12 weeks.' : `${thisWeek} new this week, ${total} in 12 weeks. Busiest week was ${new Date(weeks[Math.min(peakIdx, 11)]).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}.`}</p>
        <div className="flex items-center gap-1.5 text-[10px] text-fgSubtle" aria-hidden>Fewer{[0, 1, 2, 3].map((n) => <span key={n} className="h-3 w-3 rounded-[4px]" style={tile(n === 3 ? max : (n / 3) * max)} />)}More</div>
      </div>
    </div>
  );
}

/** Week strip instead of a month grid: seven days at a time, a bar per day sized by findings and coloured by the worst severity.
 *  Pick a day to list what arrived then; the arrows move one week. */
function Agenda({ candidates, onOpen }: { candidates: CandidateAsset[]; onOpen: (c: CandidateAsset) => void }) {
  const todayStart = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); }, []);
  const [offset, setOffset] = useState(0); // weeks back from the current week
  const [picked, setPicked] = useState<string>(dayKey(new Date()));
  const weekEnd = todayStart - offset * 7 * 864e5;
  const days = Array.from({ length: 7 }, (_, i) => new Date(weekEnd - (6 - i) * 864e5));
  const byDay = useMemo(() => {
    const m = new Map<string, CandidateAsset[]>();
    candidates.forEach((c) => { const t = time(c.createdDate); if (!t) return; const k = dayKey(new Date(t)); m.set(k, [...(m.get(k) || []), c]); });
    return m;
  }, [candidates]);
  const maxN = Math.max(1, ...days.map((d) => byDay.get(dayKey(d))?.length || 0));
  const weekTotal = days.reduce((a, d) => a + (byDay.get(dayKey(d))?.length || 0), 0);
  const list = [...(byDay.get(picked) || [])].sort((x, y) => SEVERITY_RANK[y.riskCategory] - SEVERITY_RANK[x.riskCategory]);
  const todayKey = dayKey(new Date());
  const label = `${days[0].toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} to ${days[6].toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
  const move = (n: number) => { const next = Math.max(0, offset + n); setOffset(next); setPicked(dayKey(new Date(todayStart - next * 7 * 864e5))); };
  return (
    <section className="rounded-3xl border border-line bg-surface p-5" aria-label="Activity this week">
      <div className="flex items-center justify-between">
        <div><h2 className="font-display text-base font-semibold">{offset === 0 ? 'This week' : label}</h2><p className="text-xs text-fgSubtle">{weekTotal} new finding{weekTotal === 1 ? '' : 's'}{offset === 0 ? ` · ${label}` : ''}</p></div>
        <div className="flex gap-1">
          <button type="button" aria-label="Previous week" onClick={() => move(1)} className="press rounded-full p-1.5 text-fgSubtle hover:bg-surface3 hover:text-fg"><ChevronLeft className="h-4 w-4" /></button>
          <button type="button" aria-label="Next week" disabled={offset === 0} onClick={() => move(-1)} className="press rounded-full p-1.5 text-fgSubtle hover:bg-surface3 hover:text-fg disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>
      <div role="tablist" aria-label="Days" className="mt-4 grid grid-cols-7 gap-1.5">
        {days.map((d) => {
          const k = dayKey(d); const items = byDay.get(k) || []; const n = items.length;
          const worst = items.reduce<RiskLevel | null>((w, c) => (!w || SEVERITY_RANK[c.riskCategory] > SEVERITY_RANK[w] ? c.riskCategory : w), null);
          const on = picked === k;
          return (
            <button key={k} role="tab" aria-selected={on} onClick={() => setPicked(k)} className="press relative flex flex-col items-center rounded-2xl px-1 pb-2 pt-2 text-center outline-none focus-visible:ring-2 focus-visible:ring-accent">
              {on && <motion.span layoutId="week-pick" className="absolute inset-0 rounded-2xl bg-fg/[0.08] ring-1 ring-line" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
              <span className="relative text-[10px] text-fgSubtle">{d.toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 3)}</span>
              <span className={`relative mt-1 grid h-7 w-7 place-items-center rounded-full text-[13px] ${k === todayKey ? 'bg-accent font-semibold text-onAccent' : 'text-fgMuted'}`}>{d.getDate()}</span>
              <span className="relative mt-2 flex h-10 w-full items-end justify-center" aria-hidden>
                <span className={`w-2.5 rounded-full ${worst ? sevOf(worst).bar : 'bg-fg/10'}`} style={{ height: `${n ? 22 + (n / maxN) * 78 : 8}%` }} />
              </span>
              <span className="sr-only">{n} findings</span>
            </button>
          );
        })}
      </div>
      <h3 className="mt-4 text-xs font-medium text-fgSubtle">{picked === todayKey ? 'Today' : new Date(picked + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</h3>
      <ul className="mt-2 space-y-1.5">
        {list.length === 0 && <li className="rounded-xl bg-surface2 px-3 py-3 text-sm text-fgSubtle">No new findings on this day.</li>}
        {list.slice(0, 4).map((c) => (
          <li key={c.id}>
            <button type="button" onClick={() => onOpen(c)} className="press flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left hover:bg-surface3/60">
              <span className={`h-2 w-2 shrink-0 rounded-full ${sevOf(c.riskCategory).bar}`} aria-hidden />
              <span className="min-w-0 flex-1"><span className="block truncate font-mono text-[13px]">{c.identifier || c.title}</span><span className="block text-[11px] text-fgSubtle">{TYPE_LABEL[c.type] || c.type} · {c.riskCategory}</span></span>
              <ArrowRight className="h-3.5 w-3.5 text-fgSubtle" aria-hidden />
            </button>
          </li>
        ))}
        {list.length > 4 && <li className="px-2 text-xs text-fgSubtle">+{list.length - 4} more on this day</li>}
      </ul>
    </section>
  );
}

function ReviewRing({ reviewed, total }: { reviewed: number; total: number }) {
  const pct = total ? (reviewed / total) * 100 : 0;
  return (
    <section className="rounded-3xl border border-line bg-surface p-5" aria-label="Review progress">
      <h2 className="font-display text-base font-semibold">Review progress</h2>
      <p className="mt-0.5 text-xs text-fgSubtle">Findings an analyst has already looked at</p>
      <div className="mt-4 flex items-center gap-5">
        <ProgressRing value={pct} size={112} stroke={9} label="reviewed" color="var(--c-ok)" />
        <dl className="space-y-2 text-sm">
          <div><dt className="text-xs text-fgSubtle">Reviewed</dt><dd className="font-display text-xl font-semibold tabular-nums">{reviewed}</dd></div>
          <div><dt className="text-xs text-fgSubtle">Waiting</dt><dd className="font-display text-xl font-semibold tabular-nums">{total - reviewed}</dd></div>
        </dl>
      </div>
    </section>
  );
}

function HelpCard({ onAsk }: { onAsk: () => void }) {
  return (
    <section className="rounded-3xl border border-line bg-gradient-to-br from-surface to-transparent p-5">
      <h2 className="font-display text-base font-semibold">Not sure where to start?</h2>
      <p className="mt-1.5 text-sm leading-relaxed text-fgMuted">Ask in plain English, for example “high risk social accounts this week”, and Suraksha turns it into a filter.</p>
      <button type="button" onClick={onAsk} className="press mt-4 inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm hover:border-fgSubtle hover:bg-surface3/50"><Sparkles className="h-4 w-4 text-ai" aria-hidden />Open Investigations</button>
    </section>
  );
}

/* ------------------------------------------------------------------ page */

type Tab = 'focus' | 'trends' | 'groups';

export const OverviewDashboard: React.FC = () => {
  const { candidates, brandProfile, setActiveTab, setSelectedCandidateId, isBackendLoading, isDemoMode, backendOnline, backendBrands, updateCandidateStatus } = useApp();
  const { currentUser, userProfile } = useAuth();
  const [tab, setTab] = useState<Tab>('focus');
  const [toast, setToast] = useState<{ text: string; undo: () => void } | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);
  const act = async (c: CandidateAsset, next: InvestigationStatus) => {
    const prev = c.status;
    await updateCandidateStatus(c.id, next, '', `Status set to ${next} from Overview.`);
    window.clearTimeout(toastTimer.current);
    setToast({ text: `${c.identifier || c.title} marked ${next.toLowerCase()}`, undo: async () => { await updateCandidateStatus(c.id, prev, '', 'Undone from Overview.'); setToast(null); } });
    toastTimer.current = window.setTimeout(() => setToast(null), 6000);
  };

  const hasBrand = !!brandProfile.brandName && brandProfile.brandName !== 'No Brand Registered';
  const first = (userProfile?.displayName || currentUser?.displayName || '').split(/[ (]/)[0];
  const open = useMemo(() => candidates.filter((c) => c.status !== 'Dismissed'), [candidates]);
  const verifiedAssets = (brandProfile.officialDomains?.length || 0) + (brandProfile.officialSocialUrls?.length || 0) + (brandProfile.officialApps?.length || 0);
  const graph = useMemo(() => deriveThreatGraph(candidates, brandProfile.brandName), [candidates, brandProfile.brandName]);

  const queue = useMemo(() => open
    .filter((c) => OPEN_STATUSES.includes(c.status))
    .sort((a, b) => SEVERITY_RANK[b.riskCategory] - SEVERITY_RANK[a.riskCategory] || time(b.createdDate) - time(a.createdDate)), [open]);

  const goFinding = (c: CandidateAsset) => { setSelectedCandidateId(c.id); setActiveTab('investigation-center'); };

  // Hooks must run on every render, so this lives above the early returns below (a changing hook count crashes React: error #300).
  const weekly = useMemo(() => {
    const now = weekStart(Date.now());
    return Array.from({ length: 12 }, (_, i) => candidates.filter((c) => weekStart(time(c.createdDate)) === now - (11 - i) * 7 * 864e5).length);
  }, [candidates]);

  if (isBackendLoading && candidates.length === 0) {
    return <div aria-busy="true" aria-label="Loading overview" className="mx-auto w-full max-w-[1720px] space-y-4"><div className="h-56 sk-shimmer rounded-3xl bg-surface3" /><div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="h-28 sk-shimmer rounded-3xl bg-surface3" />)}</div></div>;
  }
  if (!hasBrand && !isDemoMode && backendBrands.length === 0 && candidates.length === 0) {
    return (
      <div className="mx-auto max-w-lg rounded-3xl border border-line bg-surface p-8 py-12 text-center">
        <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl border border-line bg-surface2 text-accent"><Building2 className="h-6 w-6" /></div>
        <h2 className="font-display text-xl font-semibold">Register the brand to protect</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-fgMuted">Add your official domains, profiles and apps. They are excluded from findings, and everything else is judged against them.</p>
        <button onClick={() => setActiveTab('brand-profile')} className="press mt-6 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-onAccent hover:bg-accentHover">Add brand assets</button>
      </div>
    );
  }

  const bySev = SEV.map((s) => ({ ...s, n: open.filter((c) => c.riskCategory === s.key).length }));
  const urgent = bySev[0].n + bySev[1].n;
  const waiting = candidates.filter((c) => OPEN_STATUSES.includes(c.status)).length;
  const reviewed = candidates.length - candidates.filter((c) => c.status === 'New').length;
  const byType = ['social', 'app', 'domain'].map((t) => ({ t, label: TYPE_LABEL[t], n: open.filter((c) => c.type === t).length }));
  const topType = [...byType].sort((a, b) => b.n - a.n)[0];
  const linked = graph.edges.filter((e) => e.basis === 'observed' && e.kind !== 'TARGETS_BRAND');
  const insights = [
    topType && topType.n > 0 ? { sev: 'warn', title: `${topType.label} is where most look-alikes appear`, body: `${topType.n} of ${open.length} open findings are ${topType.label.toLowerCase()}. Review these first.` } : null,
    linked.length ? { sev: 'critical', title: `${linked.length} observed link${linked.length > 1 ? 's' : ''} between findings`, body: 'Some findings share a developer, host or brand reference, so one report may cover several.' } : null,
    { sev: 'info', title: `${reviewed} of ${candidates.length} findings have been reviewed`, body: waiting ? `${waiting} still need an analyst decision.` : 'Everything has been triaged.' },
  ].filter(Boolean) as { sev: string; title: string; body: string }[];

  const wmax = Math.max(1, ...weekly);
  const spark = weekly.map((v, i) => `${(i / 11) * 100},${36 - (v / wmax) * 32}`).join(' ');

  const summary = candidates.length === 0
    ? `No look-alikes detected for ${brandProfile.brandName || 'your brand'}. ${verifiedAssets} official assets are being watched.`
    : `${urgent} of ${open.length} open findings are high or critical, and ${waiting} still need a decision. ${verifiedAssets} official assets are excluded and watched.`;

  return (
    <div className="mx-auto w-full max-w-[1720px] pb-6">
      <h1 className="sr-only">Overview</h1>
      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-4">
          <CampusHero
            greetingText={greeting()}
            radarItems={queue.slice(0, 3).map((c) => ({ id: c.id, label: c.identifier || c.title, level: c.riskCategory }))}
            summary={summary}
            primaryLabel={queue.length ? 'Review first finding' : 'Open Investigations'}
            onPrimary={() => (queue[0] ? goFinding(queue[0]) : setActiveTab('investigation-center'))}
            chips={[{ label: `${waiting} awaiting review`, onClick: () => setActiveTab('investigation-center') }, ...(urgent ? [{ label: `${urgent} urgent`, onClick: () => queue[0] && goFinding(queue[0]) }] : [])]}
          />


          <Stagger className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StaggerItem><Stat label="Open findings" value={open.length} icon={Layers} hint={`${candidates.length} in total`} onClick={() => setActiveTab('investigation-center')} /></StaggerItem>
            <StaggerItem><Stat label="High or critical" value={urgent} tone="high" icon={AlertTriangle} hint={open.length ? `${Math.round((100 * urgent) / open.length)}% of open findings` : 'None open'} onClick={() => queue[0] && goFinding(queue[0])} /></StaggerItem>
            <StaggerItem><Stat label="Awaiting review" value={waiting} tone="medium" icon={ClipboardCheck} hint="New or investigating" onClick={() => setActiveTab('investigation-center')} /></StaggerItem>
            <StaggerItem><Stat label="Assets watched" value={verifiedAssets} icon={ShieldCheck} hint="Official, never flagged" onClick={() => setActiveTab('brand-profile')} /></StaggerItem>
          </Stagger>

          <div role="tablist" aria-label="Overview sections" className="inline-flex max-w-full gap-1 overflow-x-auto rounded-full border border-line bg-surface p-1 text-sm">
            {([['focus', 'Focus'], ['trends', 'Trends'], ['groups', 'Groups']] as [Tab, string][]).map(([k, l]) => (
              <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`press rounded-full px-4 py-1.5 transition-colors ${tab === k ? 'bg-accent font-medium text-onAccent' : 'text-fgMuted hover:text-fg'}`}>{l}</button>
            ))}
          </div>

          {tab === 'focus' && (
            <Stagger className="grid gap-4 lg:grid-cols-[1fr_1.15fr]">
              <div className="lg:col-span-2"><StaggerItem><Panel title="Weekly look-alikes" description="New findings per week by type, last 12 weeks. Darker means more."><WeeklyHeat candidates={candidates} onPick={goFinding} /></Panel></StaggerItem></div>
              <StaggerItem>
                <Panel title="Review first" description="Hover a row for quick actions" flush action={<button type="button" onClick={() => setActiveTab('investigation-center')} className="press inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs text-fgMuted hover:bg-surface3 hover:text-fg">Open <ArrowRight className="h-3.5 w-3.5" aria-hidden /></button>}>
                  <ReviewList items={queue} onOpen={goFinding} onAct={act} />
                </Panel>
              </StaggerItem>
              <StaggerItem>
                <Panel title="What the data shows" description="Plain-language readouts from your findings">
                  <div className="grid gap-3">
                    {insights.map((ins) => (
                      <article key={ins.title} className={`rounded-xl border-l-2 bg-surface2 px-4 py-3 ${ins.sev === 'critical' ? 'border-l-high' : ins.sev === 'warn' ? 'border-l-warn' : 'border-l-accent'}`}>
                        <h3 className="text-sm font-medium">{ins.title}</h3><p className="mt-1 line-clamp-2 text-sm leading-relaxed text-fgMuted">{ins.body}</p>
                      </article>
                    ))}
                  </div>
                </Panel>
              </StaggerItem>
              <div className="lg:col-span-2"><StaggerItem><ReviewPlanner waiting={waiting} /></StaggerItem></div>
            </Stagger>
          )}

          {tab === 'trends' && (
            <Stagger className="grid gap-4 lg:grid-cols-2">
              <StaggerItem>
                <Panel title="Severity" description="Open findings by severity">
                  <div className="space-y-3">
                    {bySev.map((s) => (
                      <div key={s.key}><div className="mb-1 flex justify-between text-sm"><span>{s.key}</span><span className="tabular-nums text-fgSubtle">{s.n}</span></div>
                        <motion.div className={`h-1.5 rounded-full ${s.bar}`} style={{ transformOrigin: 'left' }} initial={{ scaleX: 0 }} animate={{ scaleX: open.length ? s.n / open.length : 0 }} transition={{ duration: 1, ease: EASE }} /></div>
                    ))}
                  </div>
                </Panel>
              </StaggerItem>
              <StaggerItem>
                <Panel title="New findings per week" description="Last 12 weeks">
                  <svg viewBox="0 0 100 40" className="h-32 w-full" preserveAspectRatio="none" role="img" aria-label="New findings per week"><polyline points={spark} fill="none" stroke="rgb(var(--c-accent))" strokeWidth="1.6" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" /></svg>
                  <p className="mt-2 text-xs text-fgSubtle">Peak: {wmax} in one week. Total shown: {weekly.reduce((a, b) => a + b, 0)}.</p>
                </Panel>
              </StaggerItem>
            </Stagger>
          )}

          {tab === 'groups' && (
            <Stagger className="grid gap-4">
              <StaggerItem>
                <Panel title="Severity by type" description="Where each kind of finding sits">
                  <div className="grid grid-cols-[72px_repeat(4,1fr)] gap-1.5 text-center text-xs">
                    <span />{SEV.map((s) => <span key={s.key} className="text-fgSubtle">{s.key}</span>)}
                    {['social', 'app', 'domain'].map((t) => (
                      <div key={t} className="contents"><span className="self-center text-left text-fgSubtle">{TYPE_LABEL[t]}</span>
                        {SEV.map((s) => { const n = open.filter((c) => c.type === t && c.riskCategory === s.key).length; return <span key={s.key} className={`rounded-lg py-3 text-sm tabular-nums ${n ? `${s.soft} ${s.text}` : 'bg-surface2 text-fgSubtle'}`}>{n}</span>; })}
                      </div>
                    ))}
                  </div>
                </Panel>
              </StaggerItem>
              <StaggerItem>
                <Panel title="Linked findings" description="Observed links only: shared developer, host or brand reference" flush>
                  {linked.length === 0 ? <p className="flex items-center gap-2 px-6 pb-4 text-sm text-fgSubtle"><Info className="h-4 w-4" aria-hidden />No observed links yet.</p> : (
                    <ul className="divide-y divide-line">
                      {linked.slice(0, 6).map((e) => (
                        <li key={e.id} className="flex items-center gap-3 px-6 py-2.5 text-sm"><Link2 className="h-4 w-4 shrink-0 text-accent" aria-hidden /><span className="min-w-0 flex-1 truncate">{e.label}</span><span className="text-xs text-fgSubtle">{e.kind.replace(/_/g, ' ').toLowerCase()}</span></li>
                      ))}
                    </ul>
                  )}
                </Panel>
              </StaggerItem>
            </Stagger>
          )}
        </div>

        <aside className="space-y-4" aria-label="Calendar and help">
          <ReviewRing reviewed={reviewed} total={candidates.length} />
          <Agenda candidates={candidates} onOpen={goFinding} />
          <HelpCard onAsk={() => setActiveTab('investigation-center')} />
        </aside>
      </div>
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }} role="status" className="fixed bottom-20 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full border border-line bg-surface px-4 py-2.5 text-sm shadow-2xl lg:bottom-6">
            <span className="max-w-[60vw] truncate">{toast.text}</span>
            <button type="button" onClick={toast.undo} className="press inline-flex items-center gap-1 rounded-full px-2 py-1 text-accent hover:bg-accent/10"><Undo2 className="h-3.5 w-3.5" aria-hidden />Undo</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default OverviewDashboard;
