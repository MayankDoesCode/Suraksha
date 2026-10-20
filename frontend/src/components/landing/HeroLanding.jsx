import React, { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion';
import { ArrowRight, ScanSearch, ShieldCheck } from 'lucide-react';
import { PhoneApp, DesktopWindow } from './ProductShowcase';

/**
 * First screen. The product is the hero: the console lies on a tilted plane that flattens as the visitor scrolls,
 * with the phone app overlapping it from above. Copy and buttons load with one CSS sequence (hero-line, hero-fade,
 * hero-plane in index.css); only the scroll-linked depth needs JavaScript.
 */
export default function HeroLanding({ onDemo, container }) {
  const reduce = useReducedMotion();
  const stage = useRef(null);
  const { scrollYProgress } = useScroll({ target: stage, offset: ['start 0.72', 'start 0.12'] });
  const p = useSpring(scrollYProgress, { stiffness: 120, damping: 26, mass: 0.4 });
  const rotateX = useTransform(p, [0, 1], reduce ? [0, 0] : [22, 0]);
  const scale = useTransform(p, [0, 1], reduce ? [1, 1] : [0.9, 1]);
  const phoneY = useTransform(p, [0, 1], reduce ? [0, 0] : [90, -30]);
  const glow = useTransform(p, [0, 1], [0.55, 1]);

  return (
    <section aria-labelledby="hero-title" className="relative isolate overflow-hidden">
      <motion.div aria-hidden style={{ opacity: glow }} className="lp-horizon pointer-events-none absolute inset-x-0 top-[44%] -z-10 mx-auto h-[720px] max-w-6xl" />
      <div aria-hidden className="lp-hero-grid pointer-events-none absolute inset-0 -z-10" />

      <div className={`${container} pt-28 lg:pt-32`}>
        <div className="grid items-end gap-10 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <p className="hero-fade inline-flex items-center gap-2 rounded-full border border-line bg-surface/70 px-3 py-1 text-sm text-fgMuted" style={{ '--d': '60ms' }}>
              <ShieldCheck className="h-4 w-4 text-accent" aria-hidden />Brand impersonation defence
            </p>
            <h1 id="hero-title" className="mt-5 font-display text-[2.6rem] font-medium leading-[0.98] tracking-[-0.045em] sm:text-6xl lg:text-[4.6rem] xl:text-[5rem]">
              <span className="hero-line"><span className="lp-gradient-text" style={{ '--d': '120ms' }}>Spot the fake</span></span>
              <span className="hero-line"><span className="lp-gradient-text" style={{ '--d': '220ms' }}>before your customers do.</span></span>
            </h1>
            <p className="hero-fade mt-7 max-w-[34rem] text-lg leading-relaxed text-fgMuted" style={{ '--d': '420ms' }}>
              Suraksha watches social media, app stores and domains for impersonators of your brand, and shows the evidence behind every flag.
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
              <div className="hero-plane" style={{ '--d': '650ms' }}><PhoneApp onOpen={onDemo} /></div>
            </motion.div>
          </div>
        </div>

        {/* console plane */}
        <div ref={stage} className="relative mt-16 [perspective:2200px] lg:mt-20">
          <div className="hero-plane" style={{ '--d': '380ms' }}>
            <motion.div style={{ rotateX, scale, transformOrigin: '50% 0%' }} className="lp-plane relative will-change-transform">
              <DesktopWindow role="Analyst" wide />
            </motion.div>
          </div>
          <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-canvas to-transparent" />
        </div>
      </div>
    </section>
  );
}
