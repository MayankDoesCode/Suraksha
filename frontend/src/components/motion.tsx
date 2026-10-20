import React, { useEffect, useRef } from 'react';
import { animate, motion, useInView, useMotionValue, useReducedMotion, useTransform, type Variants } from 'framer-motion';

/** Shared motion kit (same primitives and timings as the reference app): Reveal, Stagger, CountUp, ProgressRing. */
export const EASE = [0.16, 1, 0.3, 1] as const;

/** Reveal once when scrolled into view. */
export function Reveal({ children, delay = 0, y = 18, className }: { children: React.ReactNode; delay?: number; y?: number; className?: string }) {
  return (
    <motion.div className={className} initial={{ opacity: 0, y }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.7, delay, ease: EASE }}>
      {children}
    </motion.div>
  );
}

const container: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } } };
const item: Variants = {
  hidden: { opacity: 0, y: 14, filter: 'blur(4px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.55, ease: EASE } },
};

/** Children appear in sequence on mount (dashboards) or on scroll. */
export function Stagger({ children, className, onView = false }: { children: React.ReactNode; className?: string; onView?: boolean }) {
  const viewProps = onView ? { whileInView: 'show', viewport: { once: true, amount: 0.15 } } : { animate: 'show' };
  return <motion.div className={className} variants={container} initial="hidden" {...viewProps}>{children}</motion.div>;
}
export function StaggerItem({ children, className }: { children: React.ReactNode; className?: string }) {
  return <motion.div className={className} variants={item}>{children}</motion.div>;
}

/** Number that counts up when it first becomes visible. */
export function CountUp({ value, decimals = 0, duration = 1.1, className = '', suffix = '' }: { value: number; decimals?: number; duration?: number; className?: string; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const mv = useMotionValue(0);
  const text = useTransform(mv, (v) => `${v.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`);
  useEffect(() => {
    if (!inView) return undefined;
    if (reduce) { mv.set(value); return undefined; }
    const c = animate(mv, value, { duration, ease: EASE });
    return () => c.stop();
  }, [inView, value, duration, reduce, mv]);
  return <motion.span ref={ref} className={`tabular-nums ${className}`}>{text}</motion.span>;
}

/** Animated progress ring with a soft glow; the number counts up with it. */
export function ProgressRing({ value, size = 132, stroke = 10, color = 'var(--c-accent)', label }: { value: number; size?: number; stroke?: number; color?: string; label: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }} role="img" aria-label={`${label} ${Math.round(pct)} percent`}>
      <svg width={size} height={size} className="-rotate-90 overflow-visible" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(var(--c-fg) / 0.1)" strokeWidth={stroke} />
        <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`rgb(${color})`} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c}
          initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - pct / 100) }} transition={{ duration: 1.4, ease: EASE, delay: 0.15 }}
          style={{ filter: `drop-shadow(0 0 10px rgb(${color} / 0.45))` }} />
      </svg>
      <div className="absolute text-center">
        <CountUp value={pct} suffix="%" className="block font-display text-3xl font-semibold tracking-tight" />
        <span className="text-[11px] text-fgSubtle">{label}</span>
      </div>
    </div>
  );
}
