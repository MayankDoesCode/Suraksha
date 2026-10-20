import React from 'react';
import { AnimatePresence, motion, useInView, useReducedMotion } from 'framer-motion';
import { ArrowRight, Home, ListChecks, ScanSearch, Building2, ShieldCheck, Smartphone, Globe, AtSign, Search, FileText, Send } from 'lucide-react';
import { ShieldMark } from '../ShieldMark';

const SEV = {
  High: 'border-high/40 bg-high/10 text-high',
  Medium: 'border-warn/40 bg-warn/10 text-warn',
  Critical: 'border-danger/40 bg-danger/10 text-danger',
};
const Pill = ({ level }) => <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-medium ${SEV[level]}`}>{level}</span>;

const FINDINGS = [
  { icon: AtSign, name: '@acrne_official', meta: 'Social handle · one letter from @acme_official', level: 'High' },
  { icon: Smartphone, name: 'Acme Pay Rewards', meta: 'App listing · publisher does not match', level: 'Critical' },
  { icon: Globe, name: 'acme-support-login.com', meta: 'Domain · brand name plus a login lure', level: 'Medium' },
];

const STAGES = [
  { key: 'Detect', lines: ['Checked 12 official assets', 'Handle one letter off', 'Flagged: High'] },
  { key: 'Explain', lines: ['Look-alike handle +38', 'Logo 98.8% match +22', 'Not on verified list +10'] },
  { key: 'Act', lines: ['Report drafted', 'Evidence fingerprint added', 'Waiting for analyst'] },
  { key: 'Measure', lines: ['Same logo on 2 accounts', 'Grouped as one campaign', '1 draft counted'] },
];

const still = () => typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Detect, Explain, Act, Measure: cycles every few seconds, click to jump. */
function CycleCard({ stage }) {
  const [auto, setI] = React.useState(0);
  const i = stage ?? auto;
  React.useEffect(() => {
    if (stage !== undefined || still()) return undefined;
    const t = setInterval(() => setI((n) => (n + 1) % STAGES.length), 3000);
    return () => clearInterval(t);
  }, [stage]);
  const st = STAGES[i];
  return (
    <div className="mt-3 rounded-xl border border-line bg-surface2 p-2.5">
      <div role="tablist" aria-label="Stages" className="flex gap-0.5 rounded-lg bg-surface p-0.5 text-[10px]">
        {STAGES.map((s, n) => (
          <button key={s.key} role="tab" aria-selected={n === i} onClick={() => setI(n)} className={`flex-1 rounded-md py-1 ${n === i ? 'bg-surface3 text-fg' : 'text-fgSubtle'}`}>{s.key}</button>
        ))}
      </div>
      <ul key={st.key} className="mt-2 space-y-1.5" aria-live="polite">
        {st.lines.map((l, n) => (
          <li key={l} className="lp-drop flex items-center gap-2 text-[11px] text-fgMuted" style={{ animationDelay: `${n * 110}ms` }}>
            <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />{l}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Scan ring fills while the findings drop into the list one by one. */
function ScanRing() {
  return (
    <svg viewBox="0 0 36 36" className="h-7 w-7 -rotate-90" aria-hidden>
      <circle cx="18" cy="18" r="14" fill="none" stroke="rgb(var(--c-line))" strokeWidth="3" />
      <circle cx="18" cy="18" r="14" fill="none" stroke="rgb(var(--c-accent))" strokeWidth="3" strokeLinecap="round" strokeDasharray="88" className="lp-ring-fill" />
    </svg>
  );
}

/** The Suraksha phone layout: same cards and bottom tab bar as the mobile app. Illustrative sample data. */
export function PhoneApp({ onOpen, stage }) {
  return (
    <div data-theme="dark" className="lp-float w-full max-w-[272px] rounded-[2.4rem] border border-line bg-canvas p-2.5 shadow-2xl" aria-label="Suraksha mobile app, illustrative sample">
      <div className="relative overflow-hidden rounded-[1.9rem] border border-line bg-surface">
        <span aria-hidden className="absolute left-1/2 top-2 z-10 h-1.5 w-16 -translate-x-1/2 rounded-full bg-surface3" />
        <div className="px-4 pb-3 pt-7">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-[13px] font-semibold"><ShieldMark size={20} />Suraksha</span>
            <span className="flex items-center gap-1.5 text-[9px] text-fgSubtle"><ScanRing />Scanning</span>
          </div>
          <p className="mt-3 font-display text-[19px] font-medium leading-[1.05] tracking-[-0.03em]">Spot the fake before your customers do.</p>
          <CycleCard stage={stage} />
          <ul className="mt-3 space-y-2">
            {FINDINGS.map((f, n) => {
              const Icon = f.icon;
              return (
                <li key={f.name} className="lp-drop flex items-start gap-2.5 rounded-xl border border-line bg-surface2 p-2.5" style={{ animationDelay: `${1.4 + n * 0.45}s` }}>
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface3"><Icon className="h-3.5 w-3.5 text-fgMuted" aria-hidden /></span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2"><span className="truncate font-mono text-[11px] text-fg">{f.name}</span><Pill level={f.level} /></span>
                    <span className="mt-0.5 block text-[10px] leading-snug text-fgSubtle">{f.meta}</span>
                  </span>
                </li>
              );
            })}
          </ul>
          <button type="button" onClick={onOpen} className="lp-sweep mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-accent py-2.5 text-[12px] font-semibold text-onAccent hover:bg-accentHover">
            Get started <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
        <nav aria-hidden className="grid grid-cols-4 border-t border-line bg-surface2 px-1 py-2 text-center text-[9px] text-fgSubtle">
          {[[Home, 'Overview', true], [ListChecks, 'Findings'], [ScanSearch, 'Scan'], [Building2, 'Brand']].map(([I, t, on]) => (
            <span key={t} className={`flex flex-col items-center gap-0.5 ${on ? 'text-accent' : ''}`}><I className="h-4 w-4" />{t}</span>
          ))}
        </nav>
      </div>
    </div>
  );
}

const ROLES = ['Analyst', 'Legal', 'Lead'];

/** "Ask in plain English" typing, then filter chips. */
function AskBox() {
  const chips = ['type: social', 'severity: high', 'since: 7 days'];
  return (
    <div className="rounded-lg border border-line bg-surface p-3">
      <p className="text-[10px] text-fgSubtle">Ask in plain English</p>
      <p className="mt-1.5 flex items-center gap-2 text-[12px]"><Search className="h-3 w-3 shrink-0 text-fgSubtle" aria-hidden /><span className="lp-type font-mono">high risk social accounts this week</span></p>
      <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] text-fgMuted">
        {chips.map((c, n) => <span key={c} className="lp-drop rounded border border-line px-1.5 py-0.5" style={{ animationDelay: `${3.2 + n * 0.2}s` }}>{c}</span>)}
      </div>
    </div>
  );
}

function RolePanel({ role }) {
  if (role === 'Legal') {
    return (
      <div key="legal" className="mt-3 space-y-2">
        <div className="lp-drop rounded-lg border border-line bg-surface p-3">
          <p className="flex items-center gap-1.5 text-[10px] text-fgSubtle"><Send className="h-3 w-3" aria-hidden />Notice drafted, not sent</p>
          <p className="mt-1.5 font-mono text-[11px]">To: abuse contact from the registry record</p>
          <p className="mt-1 text-[11px] leading-relaxed text-fgMuted">Subject: Brand impersonation: @acrne_official. An evidence fingerprint is attached so nothing can change after it is drafted.</p>
          <p className="mt-2 text-[10px] text-fgSubtle">Download as .eml or PDF after an analyst verifies it.</p>
        </div>
        <div className="lp-drop rounded-lg border border-line bg-surface px-3 py-2 text-[11px] text-fgMuted" style={{ animationDelay: '0.2s' }}>Evidence: 3 records, fingerprint shown on the notice</div>
      </div>
    );
  }
  if (role === 'Lead') {
    return (
      <div key="lead" className="mt-3 space-y-2">
        <div className="rounded-lg border border-line bg-surface p-3">
          <p className="text-[10px] text-fgSubtle">Findings by severity</p>
          <div className="mt-2 flex h-2.5 overflow-hidden rounded-full bg-surface3" role="img" aria-label="1 critical, 2 high, 4 medium">
            <span className="lp-grow-x bg-danger" style={{ width: '14%' }} /><span className="lp-grow-x bg-high" style={{ width: '29%', animationDelay: '0.1s' }} /><span className="lp-grow-x bg-warn" style={{ width: '57%', animationDelay: '0.2s' }} />
          </div>
          <p className="mt-2 text-[10px] text-fgSubtle">1 critical · 2 high · 4 medium</p>
        </div>
        <div className="lp-drop rounded-lg border border-line bg-surface px-3 py-2 text-[11px] text-fgMuted" style={{ animationDelay: '0.2s' }}>Same logo on 2 accounts, grouped as 1 campaign</div>
      </div>
    );
  }
  return (
    <div key="analyst" className="mt-3 space-y-2">
      <ul className="space-y-2">
        {FINDINGS.map((f, n) => {
          const Icon = f.icon;
          return (
            <li key={f.name} className="lp-drop flex items-center gap-3 rounded-lg border border-line bg-surface p-3" style={{ animationDelay: `${n * 0.12}s` }}>
              <Icon className="h-4 w-4 shrink-0 text-fgMuted" aria-hidden />
              <span className="min-w-0 flex-1"><span className="block truncate font-mono text-[12px]">{f.name}</span><span className="block truncate text-[10px] text-fgSubtle">{f.meta}</span></span>
              <Pill level={f.level} />
            </li>
          );
        })}
      </ul>
      <div className="grid gap-2 sm:grid-cols-2">
        <p className="rounded-lg border border-line bg-surface px-3 py-2 text-[11px] leading-relaxed text-fgMuted"><span className="font-mono">@acme_official</span><br /><span className="font-mono">@ac<span className="lp-pulse rounded bg-danger/20 px-0.5 text-danger">rn</span>e_official</span><br />“rn” reads as “m”.</p>
        <div className="rounded-lg border border-line bg-surface px-3 py-2 text-[11px] text-fgMuted">
          Logo match, edited copy <span className="font-medium text-fg">98.8%</span>
          <div className="mt-1 h-1.5 overflow-hidden rounded bg-surface3"><span className="lp-grow-x block h-full bg-accent" style={{ width: '98.8%' }} /></div>
          <span className="mt-1 block">Unrelated logo <span className="font-medium text-fg">62.7%</span></span>
          <div className="mt-1 h-1.5 overflow-hidden rounded bg-surface3"><span className="lp-grow-x block h-full bg-fgSubtle" style={{ width: '62.7%', animationDelay: '0.15s' }} /></div>
        </div>
      </div>
    </div>
  );
}

/** The Suraksha desktop console in a window frame. The role switch changes what it shows. Illustrative sample. */
export function DesktopWindow({ role = 'Analyst', wide = false }) {
  const nav = [[Home, 'Overview', true], [ListChecks, 'Findings'], [ScanSearch, 'Scanner'], [FileText, 'Evidence'], [Building2, 'Brand assets']];
  const stats = [['Open findings', '7'], ['High severity', '2'], ['Assets watched', '12'], ['Reviewed', '5']];
  return (
    <div data-theme="dark" className="overflow-hidden rounded-2xl border border-line bg-canvas shadow-2xl" role="img" aria-label={`Suraksha desktop console, ${role} view, illustrative sample`}>
      <div className="flex items-center gap-2 border-b border-line bg-surface2 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-danger/70" /><span className="h-2.5 w-2.5 rounded-full bg-warn/70" /><span className="h-2.5 w-2.5 rounded-full bg-ok/70" />
        <span className="ml-3 rounded-md bg-surface px-3 py-0.5 text-[11px] text-fgSubtle">suraksha.app / overview</span>
      </div>
      <div className={`grid grid-cols-[168px_1fr] sm:grid-cols-[200px_1fr] ${wide ? "min-h-[420px]" : "min-h-[380px]"}`}>
        <aside className="hidden border-r border-line bg-surface2/60 p-3 sm:block">
          <p className="flex items-center gap-2 px-2 pb-3 text-[13px] font-semibold"><ShieldMark size={18} />Suraksha</p>
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[11px] text-fgSubtle"><Search className="h-3 w-3" aria-hidden />Search</div>
          <ul className="space-y-0.5 text-[12px]">
            {nav.map(([I, t, on]) => (
              <li key={t} className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 ${on ? 'bg-surface3 text-fg' : 'text-fgMuted'}`}><I className="h-3.5 w-3.5" aria-hidden />{t}</li>
            ))}
          </ul>
        </aside>
        <div className={`col-span-2 min-w-0 p-5 sm:col-span-1 ${wide ? "lg:p-6" : "lg:pr-40"}`}>
          <div className="rounded-xl border border-line bg-surface p-4">
            <p className="flex items-center gap-1.5 text-[11px] text-fgSubtle"><ShieldCheck className="h-3 w-3 text-accent" aria-hidden />Brand protection</p>
            <p className="mt-1 font-display text-2xl font-semibold tracking-[-0.03em]">Good morning, analyst</p>
            <p className="mt-1 max-w-md text-[12px] leading-relaxed text-fgMuted">7 findings need a decision. Two are high severity and both come from one account family.</p>
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {stats.map(([k, v]) => <div key={k} className="rounded-lg border border-line bg-surface p-3"><dd className="text-xl font-semibold tabular-nums">{v}</dd><dt className="text-[10px] text-fgSubtle">{k}</dt></div>)}
          </dl>
          <div className={wide ? "lg:grid lg:grid-cols-[1.35fr_1fr] lg:gap-4" : ""}>
            <RolePanel role={role} />
            <div className="mt-2 lg:mt-3"><AskBox /></div>
          </div>
          <p className="mt-3 text-[10px] text-fgSubtle">Illustrative sample. Names and counts are examples.</p>
        </div>
      </div>
    </div>
  );
}

/** Window and phone overlap as one stage. Pointer movement shifts the two layers by different amounts (parallax). */
export function HeroStage({ onOpen }) {
  const ref = React.useRef(null);
  const [role, setRole] = React.useState('Analyst');
  const move = (e) => {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--px', ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
    el.style.setProperty('--py', ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
  };
  const reset = () => { const el = ref.current; if (el) { el.style.setProperty('--px', 0); el.style.setProperty('--py', 0); } };
  return (
    <div>
      <div role="tablist" aria-label="View as" className="mb-3 inline-flex gap-1 rounded-full border border-line bg-surface/70 p-1 text-[12px]">
        {ROLES.map((r) => (
          <button key={r} role="tab" aria-selected={role === r} onClick={() => setRole(r)} className={`rounded-full px-3 py-1 transition-colors ${role === r ? 'bg-accent text-onAccent' : 'text-fgMuted hover:text-fg'}`}>{r}</button>
        ))}
      </div>
      <div ref={ref} onPointerMove={move} onPointerLeave={reset} className="lp-stage relative pb-24 lg:-mr-10 xl:-mr-24">
        <div className="lp-stage-window"><DesktopWindow role={role} /></div>
        <div className="lp-stage-phone absolute -bottom-2 right-0 z-10 origin-bottom-right scale-[0.82] sm:scale-90 xl:scale-95"><PhoneApp onOpen={onOpen} /></div>
      </div>
    </div>
  );
}

/** What Suraksha reads, as a slow marquee. */
export function SignalMarquee() {
  const items = ['Social handles', 'App store listings', 'Domains', 'Profile pictures', 'App icons', 'Publisher names', 'Package IDs', 'Descriptions', 'Official asset list', 'Scam wording'];
  return (
    <div className="lp-marquee-wrap overflow-hidden border-y border-line/70 bg-surface2/40 py-4" aria-label="What Suraksha reads" style={{ maskImage: 'linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)' }}>
      <ul className="lp-marquee flex w-max gap-3">
        {[...items, ...items].map((x, i) => <li key={i} aria-hidden={i >= items.length} className="shrink-0 rounded-full border border-line bg-surface px-4 py-1.5 text-[13px] text-fgMuted">{x}</li>)}
      </ul>
    </div>
  );
}

const STEPS = [
  { key: 'Detect', role: 'Analyst', body: 'Suraksha checks handles, app listings and domains against your official assets and flags the ones that copy them.' },
  { key: 'Explain', role: 'Analyst', body: 'Every flag lists its reasons in plain language: the swapped letters, the matching logo, the publisher that does not match.' },
  { key: 'Act', role: 'Legal', body: 'A report is drafted with the evidence attached and fingerprinted. Nothing is sent until an analyst verifies it.' },
  { key: 'Measure', role: 'Lead', body: 'Findings that share a logo or infrastructure are grouped, and every count comes from recorded data.' },
];
const EASE = [0.16, 1, 0.3, 1];

function Step({ i, active, onActive }) {
  const ref = React.useRef(null);
  const inView = useInView(ref, { margin: '-45% 0px -45% 0px' });
  React.useEffect(() => { if (inView) onActive(i); }, [inView, i, onActive]);
  const s = STEPS[i];
  return (
    <div ref={ref} className="flex min-h-[60vh] items-center lg:min-h-[78vh]">
      <div className={`max-w-md transition-opacity duration-500 ${active ? 'opacity-100' : 'opacity-70'}`}>
        <p className="mb-3 font-mono text-xs text-accent">{i + 1} of {STEPS.length}</p>
        <h3 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">{s.key}</h3>
        <p className="mt-4 text-lg leading-relaxed text-fgMuted">{s.body}</p>
        <div className="mt-6 lg:hidden"><DesktopWindow role={s.role} /></div>
      </div>
    </div>
  );
}

/** Pinned walkthrough (same pattern as the reference): the frame stays put while the step beside it changes; the frame content
 *  cross-fades with a small blur. Steps are detected with useInView, so nothing depends on scroll maths. */
export function LoopScrolly({ onOpen }) {
  const [active, setActive] = React.useState(0);
  const reduce = useReducedMotion();
  const set = React.useCallback((i) => setActive(i), []);
  return (
    <section id="loop" aria-label="From alert to takedown" className="mx-auto w-full max-w-[1320px] px-4 py-16 sm:px-8 lg:px-10">
      <div className="mt-2 grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
        <div>{STEPS.map((_, i) => <Step key={STEPS[i].key} i={i} active={active === i} onActive={set} />)}</div>
        <div className="relative hidden lg:block">
          <div className="sticky top-[12vh] h-[76vh]">
            <div className="relative h-full overflow-hidden rounded-2xl border border-line bg-canvas shadow-[0_40px_120px_-30px_rgb(var(--c-accent)/0.25)]">
              <div className="flex h-9 items-center gap-1.5 border-b border-line px-4" aria-hidden>
                <span className="h-2.5 w-2.5 rounded-full bg-fgSubtle/30" /><span className="h-2.5 w-2.5 rounded-full bg-fgSubtle/30" /><span className="h-2.5 w-2.5 rounded-full bg-fgSubtle/30" />
                <span className="ml-3 truncate font-mono text-[11px] text-fgSubtle">suraksha.app / {STEPS[active].key.toLowerCase()}</span>
              </div>
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.div
                  key={STEPS[active].key}
                  className="absolute inset-x-0 bottom-0 top-9 overflow-hidden"
                  initial={{ opacity: 0, scale: 1.02, filter: 'blur(6px)' }}
                  animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                  exit={reduce ? undefined : { opacity: 0, scale: 0.99, filter: 'blur(6px)' }}
                  transition={{ duration: 0.6, ease: EASE }}
                >
                  <DesktopWindow role={STEPS[active].role} wide />
                  <div className="absolute bottom-3 right-4 z-10 w-[190px] origin-bottom-right"><PhoneApp onOpen={onOpen} stage={active} /></div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
