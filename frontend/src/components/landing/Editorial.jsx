import React, { useEffect, useRef, useState } from 'react';
import { Reveal } from './Reveal';

/**
 * Editorial helpers ported from the second repo's landing system and re-toned to this palette:
 *  - GlowText: type that carries a pool of light where the cursor is (one background-clip gradient per element,
 *    two CSS variables, no per-letter spans, nothing re-rendered after mount).
 *  - SectionHead: the numbered hairline every section opens with, so the page reads as a sequence, not a stack of panels.
 *  - PlateCaption: a caption line set above a product screen, the way a plate is captioned in a magazine.
 */

const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const finePointer = () => typeof window !== 'undefined' && window.matchMedia?.('(hover: hover) and (pointer: fine)').matches;

const pool = new Set();
let raf = 0;
let px = -9999;
let py = -9999;
let bound = false;

function pump() {
  raf = 0;
  const reads = [];
  pool.forEach((g) => reads.push([g, g.el.getBoundingClientRect()])); // read every rect first, then write
  reads.forEach(([g, r]) => {
    const near = px > r.left - g.radius && px < r.right + g.radius && py > r.top - g.radius && py < r.bottom + g.radius;
    if (near) {
      g.el.style.setProperty('--gx', `${(px - r.left).toFixed(1)}px`);
      g.el.style.setProperty('--gy', `${(py - r.top).toFixed(1)}px`);
    } else {
      g.el.style.setProperty('--gx', '-9999px');
    }
  });
}
const schedule = () => { if (!raf) raf = requestAnimationFrame(pump); };

function register(el, radius) {
  const g = { el, radius };
  pool.add(g);
  if (!bound) {
    window.addEventListener('pointermove', (e) => { px = e.clientX; py = e.clientY; schedule(); }, { passive: true });
    window.addEventListener('pointerleave', () => { px = -9999; py = -9999; schedule(); }, { passive: true });
    window.addEventListener('scroll', () => { if (px > -9000) schedule(); }, { passive: true }); // the pool follows words moving under a still cursor
    bound = true;
  }
  return () => pool.delete(g);
}

const TONES = {
  /** headings: foreground colour that lifts to the accent and then violet under the cursor */
  fg: { base: 'rgb(var(--c-fg))', lit: 'rgb(var(--c-accent-hover))', core: 'rgb(var(--c-ai))' },
  /** quiet labels */
  muted: { base: 'rgb(var(--c-fg-subtle))', lit: 'rgb(var(--c-fg-muted))', core: 'rgb(var(--c-accent))' },
  accent: { base: 'rgb(var(--c-accent))', lit: 'rgb(var(--c-accent-hover))', core: 'rgb(var(--c-fg))' },
};

/** Touch and reduced-motion get the resting colour and no listener at all. */
export function GlowText({ as: Tag = 'span', tone = 'fg', radius = 190, className = '', style, children }) {
  const ref = useRef(null);
  const [lit, setLit] = useState(false);
  const t = TONES[tone] || TONES.fg;
  useEffect(() => {
    if (!finePointer() || reduced() || !ref.current) return undefined;
    setLit(true);
    return register(ref.current, radius);
  }, [radius]);
  return (
    <Tag
      ref={ref}
      className={className}
      style={lit
        ? { '--gx': '-9999px', '--gy': '-9999px', backgroundImage: `radial-gradient(${radius}px circle at var(--gx) var(--gy), ${t.core} 0%, ${t.lit} 34%, ${t.base} 72%)`, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', ...style }
        : { color: t.base, ...style }}
    >
      {children}
    </Tag>
  );
}

export function SectionHead({ index, label }) {
  return (
    <Reveal y={0}>
      <div className="flex items-center gap-5">
        <GlowText tone="accent" radius={140} className="font-mono text-[0.68rem] font-semibold tabular-nums tracking-[0.3em]">{index}</GlowText>
        <GlowText tone="muted" radius={220} className="text-[0.68rem] font-semibold uppercase tracking-[0.3em]">{label}</GlowText>
        <span aria-hidden className="h-px flex-1 bg-gradient-to-r from-line to-transparent" />
      </div>
    </Reveal>
  );
}

export function PlateCaption({ left, right }) {
  return (
    <div className="mb-5 flex items-center gap-3 sm:gap-4">
      <span className="whitespace-nowrap text-[0.58rem] uppercase tracking-[0.24em] text-accent/80 sm:text-[0.62rem] sm:tracking-[0.3em]">{left}</span>
      <span aria-hidden className="h-px min-w-4 flex-1 bg-gradient-to-r from-transparent via-line to-transparent" />
      <span className="whitespace-nowrap text-[0.58rem] uppercase tracking-[0.24em] text-fgSubtle sm:text-[0.62rem] sm:tracking-[0.3em]">{right}</span>
    </div>
  );
}
