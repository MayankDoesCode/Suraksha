import React, { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { ScanSearch } from 'lucide-react';
import { Reveal } from './Reveal';
import { GlowText, SectionHead } from './Editorial';

/**
 * "The idea": the whole product in one object. Two handles, one letter pair apart, set at plate size.
 * A loupe follows the cursor (or sweeps by itself on touch screens and when idle), and when it reaches the swapped letters
 * the callouts draw in: what it reads as, how far it is from the official handle, how new the account is.
 * Everything is sample data, labelled as such.
 */

const ZOOM = 2.1;

function Lines({ marked = false }) {
  return (
    <div className="text-center font-mono leading-none tracking-tight" style={{ fontSize: 'clamp(1.9rem, 6.4vw, 5.8rem)' }}>
      <p className="mb-[0.5em] font-sans text-[0.14em] uppercase tracking-[0.34em] text-fgSubtle">Official</p>
      <p className="whitespace-nowrap">@acme_official</p>
      <p className="mb-[0.5em] mt-[0.9em] font-sans text-[0.14em] uppercase tracking-[0.34em] text-danger/90">Reported</p>
      <p className="whitespace-nowrap">
        @ac<span data-glyph className={marked ? 'rounded-[0.12em] bg-danger/25 px-[0.04em] text-danger shadow-[0_0_0_2px_rgb(var(--c-danger)/0.75)]' : 'text-danger'}>rn</span>e_official
      </p>
    </div>
  );
}

const ease = (t) => 0.5 - 0.5 * Math.cos(Math.PI * Math.max(0, Math.min(1, t)));
const lerp = (a, b, t) => a + (b - a) * t;

export default function Specimen({ container }) {
  const plate = useRef(null);
  const base = useRef(null);
  const lens = useRef(null);
  const clone = useRef(null);
  const reduce = useReducedMotion();
  const [box, setBox] = useState({ w: 900, h: 520, gx: 650, gy: 330 });

  // measure the plate and where the swapped letters sit inside it
  useEffect(() => {
    const el = plate.current; if (!el) return undefined;
    const measure = () => {
      const r = el.getBoundingClientRect();
      const g = base.current?.querySelector('[data-glyph]')?.getBoundingClientRect();
      setBox({ w: r.width, h: r.height, gx: g ? g.left - r.left + g.width / 2 : r.width * 0.7, gy: g ? g.top - r.top + g.height / 2 : r.height * 0.6 });
    };
    measure();
    const ro = new ResizeObserver(measure); ro.observe(el);
    if (document.fonts?.ready) document.fonts.ready.then(measure);
    return () => ro.disconnect();
  }, []);

  const lensSize = Math.round(Math.max(150, Math.min(250, box.w * 0.3)));

  // lens motion: pointer when present, otherwise a slow sweep that lingers on the swapped letters
  useEffect(() => {
    const el = plate.current; if (!el) return undefined;
    let ptr = null; let raf = 0; const t0 = performance.now();
    const place = (x, y) => {
      if (!lens.current || !clone.current) return;
      lens.current.style.transform = `translate3d(${x - lensSize / 2}px, ${y - lensSize / 2}px, 0)`;
      clone.current.style.transform = `translate3d(${lensSize / 2 - x * ZOOM}px, ${lensSize / 2 - y * ZOOM}px, 0) scale(${ZOOM})`;
      const near = Math.hypot(x - box.gx, y - box.gy) < lensSize * 0.8;
      if (near !== (el.dataset.near === '1')) el.dataset.near = near ? '1' : '0';
    };
    const frame = (t) => {
      if (ptr) {
        const r = el.getBoundingClientRect();
        place(Math.max(0, Math.min(r.width, ptr.x - r.left)), Math.max(0, Math.min(r.height, ptr.y - r.top)));
      } else if (reduce) {
        place(box.gx, box.gy);
      } else {
        const u = ((t - t0) / 9000) % 1;
        const p0 = [box.w * 0.2, box.h * 0.42]; const p1 = [box.w * 0.8, box.h * 0.36]; const g = [box.gx, box.gy];
        let x; let y;
        if (u < 0.25) { const k = ease(u / 0.25); x = lerp(p0[0], p1[0], k); y = lerp(p0[1], p1[1], k); }
        else if (u < 0.45) { const k = ease((u - 0.25) / 0.2); x = lerp(p1[0], g[0], k); y = lerp(p1[1], g[1], k); }
        else if (u < 0.82) { const w = (u - 0.45) * 40; x = g[0] + Math.sin(w) * 6; y = g[1] + Math.cos(w * 0.8) * 4; }
        else { const k = ease((u - 0.82) / 0.18); x = lerp(g[0], p0[0], k); y = lerp(g[1], p0[1], k); }
        place(x, y);
      }
      if (!reduce || ptr) raf = requestAnimationFrame(frame);
    };
    const move = (e) => { ptr = { x: e.clientX, y: e.clientY }; if (reduce && !raf) raf = requestAnimationFrame(frame); };
    const leave = () => { ptr = null; };
    el.addEventListener('pointermove', move); el.addEventListener('pointerleave', leave);
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); el.removeEventListener('pointermove', move); el.removeEventListener('pointerleave', leave); };
  }, [box, lensSize, reduce]);

  const { gx, gy, w, h } = box;
  const callouts = [
    { x: Math.max(8, gx - 250), y: Math.max(8, gy - 150), label: 'Reads as “m”', sub: 'r + n close together', side: 'r' },
    { x: Math.min(w - 230, gx + 90), y: Math.max(8, gy - 120), label: '1 edit from official', sub: 'handle similarity 93%', side: 'l' },
    { x: Math.min(w - 250, gx + 70), y: Math.min(h - 70, gy + 90), label: 'Created 4 days ago', sub: '120 followers · logo copied', side: 'l' },
  ];

  return (
    <section id="idea" aria-label="The idea" className={`${container} scroll-mt-20 pt-24`}>
      <SectionHead index="00" label="The idea" />
      <Reveal delay={60}>
        <h2 className="mt-6 max-w-4xl font-display text-[2.4rem] font-semibold leading-[1.02] tracking-[-0.035em] sm:text-6xl lg:text-[4.4rem]">
          <GlowText radius={300}>One letter is all it takes.</GlowText>{' '}
          <span className="font-serif-display italic lp-gradient-text">We read every one.</span>
        </h2>
      </Reveal>
      <Reveal delay={120}><p className="mt-5 max-w-xl text-lg leading-relaxed text-fgMuted">Move the lens over the second handle. Fake accounts, listings and domains copy a name down to one swapped character, so that is where Suraksha looks.</p></Reveal>

      <Reveal delay={160} y={30}>
        <div ref={plate} data-near="0" className="sp-plate relative mt-10 min-h-[430px] cursor-none touch-none select-none overflow-hidden rounded-[2rem] border border-line bg-surface/60 sm:min-h-[540px]"
          role="img" aria-label="Two handles: @acme_official and @acrne_official. The second swaps the letter m for r and n.">
          <div aria-hidden className="lp-hero-grid pointer-events-none absolute inset-0 opacity-70" />
          <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(60% 50% at 50% 55%, rgb(var(--c-accent) / 0.10), transparent 70%)' }} />
          <div ref={base} className="absolute inset-0 grid place-items-center px-4"><Lines /></div>

          {/* callouts: leader lines and cards draw in only when the lens reaches the swapped letters */}
          <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" fill="none">
            {callouts.map((c) => (
              <line key={c.label} className="sp-leader" x1={gx} y1={gy} x2={c.side === 'r' ? c.x + 200 : c.x} y2={c.y + 24} stroke="rgb(var(--c-accent))" strokeWidth="1" strokeDasharray="4 4" />
            ))}
          </svg>
          {callouts.map((c, i) => (
            <div key={c.label} className="sp-callout pointer-events-none absolute w-[200px] rounded-xl border border-accent/40 bg-canvas/85 px-3 py-2 backdrop-blur" style={{ left: c.x, top: c.y, transitionDelay: `${i * 70}ms` }}>
              <p className="text-[13px] font-medium text-fg">{c.label}</p>
              <p className="text-[11px] text-fgSubtle">{c.sub}</p>
            </div>
          ))}

          <div ref={lens} className="sp-lens pointer-events-none absolute left-0 top-0 overflow-hidden rounded-full border-2 border-accent bg-canvas" style={{ width: lensSize, height: lensSize, willChange: 'transform' }}>
            <div ref={clone} className="absolute left-0 top-0 origin-top-left" style={{ width: w, height: h, willChange: 'transform' }}>
              <div className="absolute inset-0 grid place-items-center px-4"><Lines marked /></div>
            </div>
            <span aria-hidden className="absolute left-1/2 top-1/2 h-px w-5 -translate-x-1/2 bg-accent/70" /><span aria-hidden className="absolute left-1/2 top-1/2 h-5 w-px -translate-y-1/2 bg-accent/70" />
          </div>

          <div className="absolute bottom-4 left-5 right-5 flex items-center justify-between text-[10px] uppercase tracking-[0.26em] text-fgSubtle">
            <span className="flex items-center gap-2"><ScanSearch className="h-3.5 w-3.5 text-accent" aria-hidden />Plate 01 · look-alike handle</span>
            <span>{ZOOM}x · sample data</span>
          </div>
        </div>
      </Reveal>

      <Reveal delay={80}>
        <ul className="mt-5 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-4">
          {[['Glyph swap', 'rn → m'], ['Edit distance', '1 character'], ['Logo match', '98.8%'], ['Verdict', 'High · reasons shown']].map(([k, v]) => (
            <li key={k} className="bg-canvas px-5 py-4"><p className="text-[10px] uppercase tracking-[0.26em] text-fgSubtle">{k}</p><p className="mt-1.5 font-display text-xl font-semibold tracking-tight">{v}</p></li>
          ))}
        </ul>
      </Reveal>
    </section>
  );
}
