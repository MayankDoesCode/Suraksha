import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion';
import { ArrowRight, ScanSearch, ShieldCheck } from 'lucide-react';
import { PhoneApp, DesktopWindow } from './ProductShowcase';
import { PlateCaption } from './Editorial';

/**
 * First screen. The console lies on a tilted plane that flattens as the visitor scrolls, with the phone app overlapping it
 * from above. Extras sit on the devices only: a light that travels the console's rim, a scan line, cursor lean, a glow behind
 * the phone, and alert toasts that slide out of the phone onto the console. Copy loads with one CSS sequence (index.css).
 */

const ALERTS = [
  { kind: 'Social', name: '@acrne_official', why: 'One letter off the official handle', sev: 'High', tone: 'text-warn' },
  { kind: 'App', name: 'Acme Pay Rewards', why: 'Publisher does not match', sev: 'Critical', tone: 'text-danger' },
  { kind: 'Domain', name: 'acme-support-login.com', why: 'Brand name plus a login lure', sev: 'Medium', tone: 'text-accent' },
  { kind: 'Social', name: '@acme.help_desk', why: 'Asks followers for OTPs', sev: 'High', tone: 'text-warn' },
];

/** Toasts that slide out of the phone's left edge onto the console, linger, and leave. */
function PhoneToasts({ reduce }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (reduce) return undefined;
    const t = setInterval(() => setI((n) => (n + 1) % ALERTS.length), 3600);
    return () => clearInterval(t);
  }, [reduce]);
  const a = ALERTS[i];
  return (
    <div aria-hidden className="pointer-events-none absolute right-full top-[42%] z-30 mr-4 w-[17.5rem]">
      <AnimatePresence mode="wait">
        <motion.div key={i} initial={{ opacity: 0, x: 40, scale: 0.94 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 24, scale: 0.97 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-2xl border border-line bg-canvas/90 p-3.5 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.22em] text-fgSubtle">
            <span className="flex items-center gap-2"><span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent/70" /><span className="relative inline-flex h-2 w-2 rounded-full bg-accent" /></span>Sent to your phone</span>
            <span>{a.kind}</span>
          </div>
          <p className="mt-2 truncate font-mono text-sm text-fg">{a.name}</p>
          <div className="mt-1 flex items-center justify-between gap-3 text-xs"><span className="text-fgMuted">{a.why}</span><span className={`font-semibold ${a.tone}`}>{a.sev}</span></div>
          <span className="mt-3 block h-px origin-left bg-accent/60" style={{ animation: reduce ? undefined : 'hero-alert-bar 3.6s linear' }} />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default function HeroLanding({ onDemo, container }) {
  const reduce = useReducedMotion();
  const stage = useRef(null);
  const tilt = useRef(null);
  const { scrollYProgress } = useScroll({ target: stage, offset: ['start 0.72', 'start 0.12'] });
  const p = useSpring(scrollYProgress, { stiffness: 120, damping: 26, mass: 0.4 });
  const rotateX = useTransform(p, [0, 1], reduce ? [0, 0] : [22, 0]);
  const scale = useTransform(p, [0, 1], reduce ? [1, 1] : [0.9, 1]);
  const phoneY = useTransform(p, [0, 1], reduce ? [0, 0] : [90, -30]);
  const glow = useTransform(p, [0, 1], [0.55, 1]);

  const onMove = (e) => {
    if (reduce || !tilt.current) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5; const y = (e.clientY - r.top) / r.height - 0.5;
    tilt.current.style.transform = `rotateY(${x * 4}deg) rotateX(${-y * 3}deg)`;
  };
  const onLeave = () => { if (tilt.current) tilt.current.style.transform = ''; };

  return (
    <section aria-labelledby="hero-title" className="relative isolate overflow-hidden">
      <motion.div aria-hidden style={{ opacity: glow }} className="lp-horizon pointer-events-none absolute inset-x-0 top-[44%] -z-10 mx-auto h-[720px] max-w-6xl" />
      <div aria-hidden className="lp-hero-grid pointer-events-none absolute inset-0 -z-10" />

      <div className={`${container} pt-28 lg:pt-32`}>
        <div className="grid items-end gap-10 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <p className="hero-fade inline-flex items-center gap-2 rounded-full border border-line bg-surface/70 px-3 py-1 text-sm text-fgMuted" style={{ '--d': '60ms' }}>
              <ShieldCheck className="h-4 w-4 text-accent" aria-hidden />Brand protection for companies
            </p>
            <h1 id="hero-title" className="mt-5 font-display text-[2.6rem] font-medium leading-[0.98] tracking-[-0.045em] sm:text-6xl lg:text-[4.6rem] xl:text-[5rem]">
              <span className="hero-line"><span className="lp-gradient-text" style={{ '--d': '120ms' }}>Spot the fake</span></span>
              <span className="hero-line"><span className="lp-gradient-text" style={{ '--d': '220ms' }}>before your customers do.</span></span>
            </h1>
            <p className="hero-fade mt-7 max-w-[34rem] text-lg leading-relaxed text-fgMuted" style={{ '--d': '420ms' }}>
              Fake websites, support accounts and apps that pretend to be your company cost you customers and trust. Suraksha finds them across domains, social media and app stores, explains every flag, and drafts the takedown for your team to approve.
            </p>
            <div className="hero-fade mt-9 flex flex-wrap items-center gap-3" style={{ '--d': '540ms' }}>
              <button type="button" onClick={onDemo} className="lp-sweep group inline-flex h-12 items-center gap-2 rounded-full bg-accent pl-6 pr-5 text-[15px] font-semibold text-onAccent transition-[transform,background-color] duration-200 hover:bg-accentHover active:scale-[0.98]">
                Open the live demo
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden />
              </button>
              <a href="#sandbox" className="inline-flex h-12 items-center gap-2 rounded-full border border-line px-5 text-[15px] font-medium text-fg transition-[transform,border-color,background-color] duration-200 hover:border-fgSubtle hover:bg-surface3/50 active:scale-[0.98]">
                <ScanSearch className="h-4 w-4" aria-hidden />Try the scanner
              </a>
            </div>
          </div>

          {/* the phone sits in the right column and overlaps the console plane below it */}
          <div className="relative hidden lg:col-span-4 lg:block">
            <motion.div style={{ y: phoneY }} className="relative z-20 ml-auto -mb-56 w-[15.5rem] xl:w-[17rem]">
              <div className="hero-plane" style={{ '--d': '650ms' }}>
                <div className="relative">
                  <div aria-hidden className="absolute -inset-8 -z-10 rounded-[3.5rem] bg-accent/25 blur-3xl" />
                  <PhoneApp onOpen={onDemo} />
                  <PhoneToasts reduce={reduce} />
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* console plane */}
        <div ref={stage} onPointerMove={onMove} onPointerLeave={onLeave} className="relative mt-16 [perspective:2200px] lg:mt-20">
          <div className="hero-fade" style={{ '--d': '300ms' }}><PlateCaption left="The console" right="Sample data, live layout" /></div>
          <div className="hero-plane" style={{ '--d': '380ms' }}>
            <motion.div style={{ rotateX, scale, transformOrigin: '50% 0%' }} className="lp-plane relative will-change-transform">
              <div ref={tilt} className="relative transition-transform duration-300 ease-out [transform-style:preserve-3d]">
                {/* a light travels around the console's rim */}
                <div className="relative overflow-hidden rounded-[1.1rem] p-px">
                  {!reduce && <span aria-hidden className="absolute left-1/2 top-1/2 aspect-square w-[180%] -translate-x-1/2 -translate-y-1/2" style={{ background: 'conic-gradient(from 0deg, transparent 0deg, rgb(var(--c-accent) / 0.85) 35deg, transparent 80deg, transparent 360deg)', animation: 'auth-sweep 10s linear infinite' }} />}
                  <div className="relative rounded-2xl"><DesktopWindow role="Analyst" wide /></div>
                </div>
                {/* a thin scan line drifts down the console, as if it were reading it */}
                {!reduce && <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-transparent via-accent/10 to-transparent" style={{ animation: 'hero-scan 7s ease-in-out infinite' }} />}
              </div>
            </motion.div>
          </div>
          <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-canvas to-transparent" />
        </div>
      </div>
    </section>
  );
}
