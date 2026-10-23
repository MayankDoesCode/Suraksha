import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { ShieldMark } from '../ShieldMark';

const LINKS = [
  { id: 'platform', label: 'Product' },
  { id: 'how', label: 'How it works' },
  { id: 'sandbox', label: 'Scanner' },
  { id: 'product', label: 'Trust' },
  { id: 'mobile', label: 'Mobile app' },
];

/**
 * Fixed top bar (same pattern as the reference): transparent at the top, blurred and bordered once you scroll,
 * with a pill that glides under whichever section you are reading. Below md it collapses to a menu that animates open.
 */
export default function SiteNav({ onLogin, onDemo, onReplayIntro, container }) {
  const { scrollY, scrollYProgress } = useScroll();
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(null);
  useMotionValueEvent(scrollY, 'change', (v) => setSolid(v > 24));

  useEffect(() => {
    const on = () => {
      const probe = window.innerHeight * 0.35;
      let cur = null;
      for (const l of LINKS) {
        const el = document.getElementById(l.id);
        if (el && el.getBoundingClientRect().top <= probe) cur = l.id;
      }
      setActive(cur);
    };
    on();
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    return () => { window.removeEventListener('scroll', on); window.removeEventListener('resize', on); };
  }, []);

  const go = (e, id) => {
    const el = document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    el.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    setOpen(false);
  };

  return (
    <header className={`fixed inset-x-0 top-0 z-40 transition-[background-color,border-color] duration-300 ${solid || open ? 'border-b border-line/70 bg-canvas/75 backdrop-blur-xl' : 'border-b border-transparent'}`}>
      <nav className={`${container} flex h-16 items-center gap-8`} aria-label="Main">
        <a href="/" className="flex items-center gap-2.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-accent" aria-label="Suraksha home">
          <ShieldMark size={24} />
          <span className="font-display text-lg font-semibold tracking-tight">Suraksha</span>
        </a>

        <div className="relative hidden items-center gap-1 text-sm md:flex">
          {LINKS.map((l) => {
            const on = active === l.id;
            return (
              <a key={l.id} href={`#${l.id}`} onClick={(e) => go(e, l.id)} aria-current={on ? 'true' : undefined} className={`relative rounded-full px-3.5 py-1.5 transition-colors ${on ? 'text-fg' : 'text-fgMuted hover:text-fg'}`}>
                {on && <motion.span layoutId="site-nav" className="absolute inset-0 rounded-full bg-fg/[0.08]" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
                <span className="relative">{l.label}</span>
              </a>
            );
          })}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {onReplayIntro && <button type="button" onClick={onReplayIntro} className="press hidden rounded-full px-3 py-2 text-sm text-fgSubtle hover:text-fg lg:inline-block">Replay intro</button>}
          <button type="button" onClick={onLogin} className="press hidden rounded-full px-4 py-2 text-sm text-fgMuted hover:text-fg sm:inline-block">Sign in</button>
          <button type="button" onClick={onDemo} className="press lp-sweep hidden rounded-full bg-accent px-4 py-2 text-sm font-semibold text-onAccent hover:bg-accentHover sm:inline-block">Open the live demo</button>
          <button type="button" className="grid h-9 w-9 place-items-center rounded-full text-fgMuted hover:bg-fg/10 md:hidden" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>
      <motion.span aria-hidden className="absolute bottom-0 left-0 h-px w-full origin-left bg-gradient-to-r from-accent via-ai to-accent" style={{ scaleX: scrollYProgress }} />

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden border-t border-line/70 md:hidden">
            <div className="grid gap-1 px-4 py-4">
              {LINKS.map((l) => <a key={l.id} href={`#${l.id}`} onClick={(e) => go(e, l.id)} className="rounded-xl px-3 py-3 text-base text-fg/85 hover:bg-fg/5">{l.label}</a>)}
              <button type="button" onClick={() => { setOpen(false); onLogin(); }} className="rounded-xl px-3 py-3 text-left text-base text-fg/85 hover:bg-fg/5">Sign in</button>
              <button type="button" onClick={() => { setOpen(false); onDemo(); }} className="rounded-xl bg-accent px-3 py-3 text-left text-base font-semibold text-onAccent">Open the live demo</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
