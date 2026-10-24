import React, { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Presentation, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ShieldMark } from './ShieldMark';

/**
 * Presenter mode for live pitches: Shift + P (or the button) starts a guided walkthrough. Each step switches the workspace
 * to the right screen and shows a large caption with the talking point; one step fires a simulated attack live.
 * Arrow keys / Space / click move through it, Esc leaves.
 */
type Step = { tab?: string; kicker: string; title: string; points: string[]; cover?: boolean; attack?: boolean };

const STEPS: Step[] = [
  { cover: true, kicker: 'Suraksha', title: 'Spot the fake before your customers do.', points: ['Brand impersonation defence for social media, app stores and domains.'] },
  { tab: 'overview', kicker: 'The problem', title: 'One swapped letter is all a scammer needs.', points: ['Fake support handles, cloned apps and look-alike domains copy a brand closely enough to fool customers.', 'Brands usually hear about it from a customer who already lost money.'] },
  { tab: 'lookalike-engine', kicker: '01 · Detect', title: 'We read every character.', points: ['Homoglyphs, swapped letters, brand + lure words, risky TLDs.', 'Your official assets are excluded first, so they are never flagged.'] },
  { tab: 'social-monitoring', kicker: '02 · Social', title: 'Fake accounts, caught early.', points: ['Handle similarity, copied logos, new accounts asking for OTPs.'] },
  { tab: 'app-monitoring', kicker: '03 · Apps', title: 'Cloned apps and APK mirrors.', points: ['Publisher mismatch, package mimicry, payment-secret requests.'] },
  { tab: 'overview', attack: true, kicker: 'Live', title: 'Watch an attack land.', points: ['A new impersonator appears, gets scored by the real engines, and lands in the queue.'] },
  { tab: 'investigation-center', kicker: '04 · Explain', title: 'Every flag comes with its reasons.', points: ['Signal by signal, with what counts against it. No black-box scores.'] },
  { tab: 'threat-graph', kicker: '05 · Connect', title: 'Campaigns, not one-offs.', points: ['Shared infrastructure links fakes into one operation, so you act on the whole campaign.'] },
  { tab: 'reports', kicker: '06 · Act', title: 'From flag to drafted report.', points: ['Takedown drafts addressed to the right desk, with evidence attached.', 'A person approves every case before anything is sent.'] },
  { cover: true, kicker: 'Suraksha', title: 'Spot the fake before your customers do.', points: ['Thank you. Questions?'] },
];

export const PresenterMode: React.FC = () => {
  const { setActiveTab } = useApp() as any;
  const [on, setOn] = useState(false);
  const [i, setI] = useState(0);
  const s = STEPS[i];

  const go = useCallback((n: number) => setI((cur) => Math.max(0, Math.min(STEPS.length - 1, typeof n === 'number' ? n : cur))), []);

  // drive the workspace from the current step
  useEffect(() => {
    if (!on) return undefined;
    if (s.tab) setActiveTab(s.tab);
    if (!s.attack) return undefined;
    const t = setTimeout(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'A', shiftKey: true })), 900);
    return () => clearTimeout(t);
  }, [on, i, s, setActiveTab]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.shiftKey && e.key.toLowerCase() === 'p') { e.preventDefault(); setOn((v) => !v); setI(0); return; }
      if (!on) return;
      if (['ArrowRight', 'PageDown', ' ', 'Enter'].includes(e.key)) { e.preventDefault(); go(i + 1); }
      else if (['ArrowLeft', 'PageUp', 'Backspace'].includes(e.key)) { e.preventDefault(); go(i - 1); }
      else if (e.key === 'Escape') setOn(false);
    };
    const onCustom = () => { setI(0); setOn(true); };
    window.addEventListener('keydown', onKey);
    window.addEventListener('start-presenter', onCustom);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('start-presenter', onCustom);
    };
  }, [on, i, go]);

  useEffect(() => {
    if (!on) return;
    document.documentElement.requestFullscreen?.().catch(() => {});
    return () => { if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {}); };
  }, [on]);

  return (
    <>
      {!on && (
        <button type="button" onClick={() => { setI(0); setOn(true); }} title="Presenter mode (Shift + P)"
          className="fixed right-4 top-20 z-40 hidden items-center gap-2 rounded-full border border-line bg-canvas/80 px-3.5 py-2 text-xs font-semibold text-fgMuted shadow-xl backdrop-blur-xl hover:border-accent hover:text-fg lg:inline-flex">
          <Presentation className="h-3.5 w-3.5 text-accent" />Present<kbd className="rounded border border-line px-1 font-mono text-[9px] text-fgSubtle">⇧P</kbd>
        </button>
      )}

      <AnimatePresence>
        {on && (
          <motion.div key="presenter" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pointer-events-none fixed inset-0 z-[58]">
            {/* cover slides take the whole screen; content steps leave the app visible */}
            <AnimatePresence mode="wait">
              {s.cover ? (
                <motion.div key={`c${i}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }} className="pointer-events-auto absolute inset-0 grid place-items-center bg-black">
                  <div aria-hidden className="absolute left-1/2 top-1/2 h-[640px] w-[640px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/15 blur-[140px]" />
                  <div className="relative px-6 text-center">
                    <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 160, damping: 16 }} className="mx-auto w-fit"><ShieldMark size={96} /></motion.div>
                    <p className="mt-8 text-sm uppercase tracking-[0.5em] text-accent">{s.kicker}</p>
                    <motion.h1 initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2, duration: 0.7 }} className="mx-auto mt-5 max-w-4xl font-display text-5xl font-semibold leading-[1.02] tracking-[-0.04em] text-fg sm:text-7xl">{s.title}</motion.h1>
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mx-auto mt-6 max-w-xl text-lg text-fgMuted">{s.points[0]}</motion.p>
                  </div>
                </motion.div>
              ) : (
                <motion.div key={`s${i}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0">
                  <div className="absolute inset-0 shadow-[inset_0_0_160px_40px_rgb(0_0_0/0.75)]" />
                  <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 26 }}
                    className="pointer-events-auto absolute bottom-6 left-1/2 w-[min(980px,calc(100vw-2rem))] -translate-x-1/2 overflow-hidden rounded-3xl border border-accent/30 bg-black/85 p-6 shadow-[0_30px_120px_-20px_rgb(var(--c-accent)/0.45)] backdrop-blur-2xl sm:p-8">
                    <p className="text-xs font-semibold uppercase tracking-[0.4em] text-accent">{s.kicker}</p>
                    <h2 className="mt-2 font-display text-3xl font-semibold tracking-[-0.03em] text-fg sm:text-5xl">{s.title}</h2>
                    <ul className="mt-4 space-y-1.5">{s.points.map((p, k) => <motion.li key={p} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + k * 0.12 }} className="text-base text-fgMuted sm:text-lg">{p}</motion.li>)}</ul>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* controls */}
            <div className="pointer-events-auto absolute right-4 top-4 flex items-center gap-2">
              <span className="rounded-full border border-line bg-black/70 px-3 py-1.5 font-mono text-xs text-fgSubtle">{i + 1} / {STEPS.length}</span>
              <button type="button" onClick={() => go(i - 1)} disabled={i === 0} aria-label="Previous" className="grid h-9 w-9 place-items-center rounded-full border border-line bg-black/70 text-fg disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button>
              <button type="button" onClick={() => go(i + 1)} disabled={i === STEPS.length - 1} aria-label="Next" className="grid h-9 w-9 place-items-center rounded-full bg-accent text-onAccent disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
              <button type="button" onClick={() => setOn(false)} aria-label="Exit presenter mode" className="grid h-9 w-9 place-items-center rounded-full border border-line bg-black/70 text-fgSubtle hover:text-fg"><X className="h-4 w-4" /></button>
            </div>
            <div className="absolute inset-x-0 top-0 h-1 bg-white/5"><motion.div className="h-full bg-accent" animate={{ width: `${((i + 1) / STEPS.length) * 100}%` }} transition={{ duration: 0.5 }} /></div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
