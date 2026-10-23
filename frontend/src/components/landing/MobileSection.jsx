import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { BellRing, CheckCircle2, WifiOff, Download } from 'lucide-react';
import { Reveal } from './Reveal';
import { PhoneApp } from './ProductShowcase';
import GetApp from './GetApp';
import { SectionHead } from './Editorial';

const EASE = [0.16, 1, 0.3, 1];

function Float({ className = '', delay = 0, children }) {
  const reduce = useReducedMotion();
  return (
    <motion.div className={`absolute z-20 ${className}`} initial={reduce ? false : { opacity: 0, y: 24, scale: 0.94 }} whileInView={{ opacity: 1, y: 0, scale: 1 }} viewport={{ once: true, amount: 0.4 }} transition={{ duration: 0.8, delay, ease: EASE }}>
      <motion.div animate={reduce ? undefined : { y: [0, -8, 0] }} transition={{ duration: 6 + delay * 2, repeat: Infinity, ease: 'easeInOut' }}>{children}</motion.div>
    </motion.div>
  );
}

const POINTS = [
  [BellRing, 'Alerts where you already look', 'New findings appear in the same list as on the web, sorted by severity.'],
  [CheckCircle2, 'Same evidence, same reports', 'Open a finding, read the reasons, draft the report. Nothing is sent without you.'],
  [WifiOff, 'Try it offline', 'The demo workspace runs on the phone with no connection.'],
];

/** Mobile app section: gradient stage with the phone and floating status cards, plus the real install actions. */
export default function MobileSection({ container }) {
  return (
    <section id="mobile" className={`${container} scroll-mt-20 pt-28`}>
      <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.05fr]">
        <div>
          <SectionHead index="06" label="Mobile app" />
          <Reveal delay={60}><h2 className="mt-3 max-w-lg font-display text-4xl font-semibold leading-[1.05] tracking-[-0.035em] sm:text-5xl"><span className="lp-gradient-text">Your brand watch,</span> <span className="font-serif-display italic">in your pocket.</span></h2></Reveal>
          <Reveal delay={120}><p className="mt-4 max-w-md text-lg leading-relaxed text-fgMuted">The Android app and the installable web app show the same findings, reasons and drafts as the console, laid out for one hand.</p></Reveal>
          <ul className="mt-8 space-y-4">
            {POINTS.map(([Icon, t, d], i) => (
              <Reveal as="li" key={t} delay={160 + i * 70} className="flex gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-line bg-surface"><Icon className="h-4 w-4 text-accent" aria-hidden /></span>
                <span><span className="block text-[15px] font-medium">{t}</span><span className="block text-sm leading-relaxed text-fgSubtle">{d}</span></span>
              </Reveal>
            ))}
          </ul>
          <Reveal delay={400}><div className="mt-8 max-w-md"><GetApp /></div></Reveal>
        </div>

        <div className="lp-mobile-stage relative isolate mx-auto flex min-h-[560px] w-full max-w-[560px] items-center justify-center overflow-hidden rounded-[2rem] border border-line">
          <div aria-hidden className="lp-mobile-grid pointer-events-none absolute inset-0 -z-10" />
          <div aria-hidden className="lp-orb pointer-events-none absolute -z-10 h-[420px] w-[420px] rounded-full opacity-35 blur-3xl" />
          <Float className="left-4 top-14 sm:left-8" delay={0.1}>
            <div className="flex items-center gap-2.5 rounded-2xl lp-mobile-card px-3.5 py-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-orange-100 text-orange-600"><BellRing className="h-4 w-4" aria-hidden /></span>
              <span><span className="block text-[12px] font-medium">New finding</span><span className="block font-mono text-[11px] text-[#4b5a7a]">@acrne_official · High</span></span>
            </div>
          </Float>
          <Float className="bottom-16 right-3 sm:right-8" delay={0.3}>
            <div className="flex items-center gap-2.5 rounded-2xl lp-mobile-card px-3.5 py-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-100 text-blue-600"><CheckCircle2 className="h-4 w-4" aria-hidden /></span>
              <span><span className="block text-[12px] font-medium">Report drafted</span><span className="block text-[11px] text-[#4b5a7a]">Not sent. Needs your check.</span></span>
            </div>
          </Float>
          <Float className="bottom-6 left-6 sm:left-12" delay={0.5}>
            <span className="inline-flex items-center gap-2 rounded-full lp-mobile-card px-3 py-1.5 text-[12px]"><Download className="h-3.5 w-3.5 text-blue-600" aria-hidden />Installs like an app</span>
          </Float>
          <div className="relative z-10 py-10"><PhoneApp /></div>
        </div>
      </div>
    </section>
  );
}
