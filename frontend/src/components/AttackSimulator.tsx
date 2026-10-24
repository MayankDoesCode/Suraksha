import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { AtSign, Globe, Smartphone, Volume2, VolumeX, X, Zap } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { analyzeSocialCandidate } from '../utils/socialEngine';
import { analyzeAppCandidate } from '../utils/appEngine';
import { runFullLookalikeAnalysis } from '../utils/lookalikeEngine';
import type { AssetType, RiskLevel } from '../types';

/**
 * Live-demo helper: "Simulate an attack" drops a fresh sample impersonator into the workspace. The screen flashes, the
 * identifier types itself out, the real engines score it, and it lands in the queue with a toast that opens its dossier.
 * Everything it creates is labelled as a simulation. Shortcut: Shift + A.
 */

type Scenario = { type: AssetType; Icon: typeof AtSign; platform: string; identifier: string; title: string; url: string; description: string; run: (brand: any) => { level: string; score: number; reasons: string[] } };

function getScenarios(brand: any): Scenario[] {
  const brandName = brand?.brandName || 'Acme';
  const brandToken = brandName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'acme';
  return [
    {
      type: 'social',
      Icon: AtSign,
      platform: 'X (Twitter)',
      identifier: `@${brandToken}_supp0rt`,
      title: `${brandName} Support Desk`,
      url: `https://x.com/${brandToken}_supp0rt`,
      description: 'Official help desk. DM your registered mobile number and OTP to unlock your account.',
      run: (b) => {
        const r = analyzeSocialCandidate({
          name: `${brandName} Support Desk`,
          username: `@${brandToken}_supp0rt`,
          platform: 'X',
          url: `https://x.com/${brandToken}_supp0rt`,
          bio: 'Official help desk. DM your registered mobile number and OTP to unlock your account.',
          followerCount: 64,
          creationDate: new Date(Date.now() - 2 * 864e5).toISOString().slice(0, 10),
        } as any, b);
        return { level: r.riskCategory, score: r.heuristicScore, reasons: r.signals.map((s: any) => s.title) };
      },
    },
    {
      type: 'app',
      Icon: Smartphone,
      platform: 'Third-party APK site',
      identifier: `com.${brandToken}.rewardz`,
      title: `${brandName} Rewardz`,
      url: `https://apk-mirror.example/${brandToken}-rewardz`,
      description: 'Claim ₹2,000 cashback. Enter your UPI PIN to verify.',
      run: (b) => {
        const r = analyzeAppCandidate({
          name: `${brandName} Rewardz`,
          developer: `${brandName} Labs Unverified`,
          store: 'Third-party APK site',
          packageId: `com.${brandToken}.rewardz`,
          description: 'Claim ₹2,000 cashback. Enter your UPI PIN to verify.',
          observedBranding: `Copies the authentic ${brandName} logo and corporate styling`,
        } as any, b);
        return { level: r.riskCategory, score: r.heuristicScore, reasons: r.signals.map((s: any) => s.title) };
      },
    },
    {
      type: 'domain',
      Icon: Globe,
      platform: 'Newly registered domain',
      identifier: `${brandToken}-kyc-update.in`,
      title: `${brandToken}-kyc-update.in`,
      url: `https://${brandToken}-kyc-update.in`,
      description: 'Update your KYC credentials within 24 hours or your account will be blocked.',
      run: (b) => {
        const r = runFullLookalikeAnalysis(`${brandName} KYC`, `${brandToken}-kyc-update.in`, b, 'Update your KYC credentials within 24 hours or your account will be blocked.');
        return { level: r.overallRiskCategory, score: r.overallScore, reasons: r.signals.map((s: any) => s.title) };
      },
    },
  ];
}

const asLevel = (l: string): RiskLevel => (/crit/i.test(l) ? 'Critical' : /high/i.test(l) ? 'High' : /med/i.test(l) ? 'Medium' : 'Low');
// full class strings so Tailwind keeps them
const TONES = {
  Critical: { border: 'border-danger/40', icon: 'bg-danger/15 text-danger', text: 'text-danger', bar: 'bg-danger' },
  High: { border: 'border-high/40', icon: 'bg-high/15 text-high', text: 'text-high', bar: 'bg-high' },
  Medium: { border: 'border-warn/40', icon: 'bg-warn/15 text-warn', text: 'text-warn', bar: 'bg-warn' },
  Low: { border: 'border-ok/40', icon: 'bg-ok/15 text-ok', text: 'text-ok', bar: 'bg-ok' },
} as const;

// two short tones made in the browser, no audio files
function chirp() {
  try {
    const Ctx = (window.AudioContext || (window as any).webkitAudioContext); const ctx = new Ctx();
    [[880, 0], [660, 0.13]].forEach(([f, t]) => {
      const o = ctx.createOscillator(); const g = ctx.createGain(); o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + t); g.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.16);
      o.connect(g).connect(ctx.destination); o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.2);
    });
    setTimeout(() => ctx.close(), 600);
  } catch { /* audio not available */ }
}

type Toast = { id: string; candId: string; s: Scenario; level: RiskLevel; score: number; reasons: string[] };

export const AttackSimulator: React.FC = () => {
  const { brandProfile, addCandidate, setSelectedCandidateId } = useApp() as any;
  const reduce = useReducedMotion();
  const [flash, setFlash] = useState<Scenario | null>(null);
  const [typed, setTyped] = useState('');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [sound, setSound] = useState(() => { try { return localStorage.getItem('sim-sound') !== '0'; } catch { return true; } });
  const next = useRef(0); const busy = useRef(false);

  const fire = useCallback((vectorIndex?: number) => {
    if (busy.current || !brandProfile) return;
    busy.current = true;
    const scenarios = getScenarios(brandProfile);
    const chosenIndex = typeof vectorIndex === 'number' ? vectorIndex % scenarios.length : next.current % scenarios.length;
    next.current += 1;
    const s = scenarios[chosenIndex];
    setFlash(s); setTyped('');
    if (sound) chirp();
    let i = 0;
    const tick = setInterval(() => { i += 1; setTyped(s.identifier.slice(0, i)); if (i >= s.identifier.length) clearInterval(tick); }, reduce ? 0 : 45);
    setTimeout(() => {
      let res = { level: 'High', score: 70, reasons: [] as string[] };
      try { res = s.run(brandProfile); } catch { /* keep fallback */ }
      const level = asLevel(res.level);
      const c = addCandidate({
        type: s.type, title: s.title, identifier: s.identifier, platform: s.platform, url: s.url, description: s.description,
        riskCategory: level, summary: `Simulated attack for the live demo targeting ${brandProfile?.brandName || 'Brand'}. Scored ${Math.round(res.score)}/100 by the in-browser engines.`,
        evidenceSupporting: res.reasons.slice(0, 5), analysisEngine: 'Simulation (in-browser engines)',
      } as any);
      const id = `t-${Date.now()}`;
      setToasts((t) => [{ id, candId: c.id, s, level, score: Math.round(res.score), reasons: res.reasons.slice(0, 2) }, ...t].slice(0, 3));
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 10000);
      setFlash(null); busy.current = false;
    }, reduce ? 300 : 1700);
  }, [brandProfile, addCandidate, sound, reduce]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (e.shiftKey && e.key.toLowerCase() === 'a' && tag !== 'INPUT' && tag !== 'TEXTAREA') { e.preventDefault(); fire(); }
    };
    const onCustom = () => fire();
    window.addEventListener('keydown', onKey);
    window.addEventListener('simulate-attack', onCustom);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('simulate-attack', onCustom);
    };
  }, [fire]);

  const toggleSound = () => setSound((v) => { try { localStorage.setItem('sim-sound', v ? '0' : '1'); } catch { /* ignore */ } return !v; });

  return (
    <>
      {/* launcher */}
      <div className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] left-4 z-40 flex items-center gap-1.5 lg:bottom-5 lg:left-[16.25rem]">
        <button type="button" onClick={fire} title="Simulate an attack (Shift + A)" className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full border border-danger/40 bg-canvas/80 px-4 py-2.5 text-xs font-semibold text-fg shadow-2xl backdrop-blur-xl transition hover:border-danger hover:shadow-[0_0_30px_-6px_rgb(var(--c-danger)/0.7)]">
          <span className="relative grid h-5 w-5 place-items-center rounded-full bg-danger/15"><Zap className="h-3.5 w-3.5 text-danger" aria-hidden /><span className="absolute inset-0 animate-ping rounded-full bg-danger/20" /></span>
          Simulate attack
          <kbd className="hidden rounded border border-line px-1 font-mono text-[9px] text-fgSubtle sm:inline">⇧A</kbd>
        </button>
        <button type="button" onClick={toggleSound} aria-label={sound ? 'Mute alert sound' : 'Unmute alert sound'} className="grid h-9 w-9 place-items-center rounded-full border border-line bg-canvas/80 text-fgSubtle backdrop-blur-xl hover:text-fg">
          {sound ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* incoming flash */}
      <AnimatePresence>
        {flash && (
          <motion.div key="flash" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} className="pointer-events-none fixed inset-0 z-[60] grid place-items-center" aria-live="assertive">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgb(var(--c-danger)/0.28),rgb(0_0_0/0.75)_70%)]" />
            {!reduce && <div className="absolute inset-x-0 h-24 bg-gradient-to-b from-transparent via-danger/25 to-transparent" style={{ animation: 'sim-scan 1.4s linear infinite' }} />}
            <div className="absolute inset-3 rounded-3xl border-2 border-danger/50" style={{ animation: reduce ? undefined : 'sim-blink 0.5s steps(2) infinite' }} />
            <motion.div initial={{ scale: 0.9, y: 10 }} animate={{ scale: 1, y: 0 }} className="relative text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.5em] text-danger">Incoming · new impersonator</p>
              <p className="mt-4 flex items-center justify-center gap-3 font-mono text-3xl text-fg sm:text-5xl"><flash.Icon className="h-8 w-8 text-danger sm:h-10 sm:w-10" />{typed}<span className="inline-block h-8 w-[3px] animate-pulse bg-danger sm:h-11" /></p>
              <p className="mt-4 text-sm text-fgMuted">{flash.platform} · scoring against {brandProfile?.brandName || 'your brand'}…</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* toasts */}
      <div className="pointer-events-none fixed right-4 top-20 z-[55] flex w-[22rem] max-w-[calc(100vw-2rem)] flex-col gap-2.5">
        <AnimatePresence initial={false}>
          {toasts.map((t) => {
            const c = TONES[t.level];
            return (
              <motion.div key={t.id} layout initial={{ opacity: 0, x: 60, scale: 0.95 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 60 }} transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                className={`pointer-events-auto overflow-hidden rounded-2xl border ${c.border} bg-canvas/90 shadow-2xl backdrop-blur-xl`}>
                <div className="flex items-start gap-3 p-3.5">
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${c.icon}`}><t.s.Icon className="h-4 w-4" /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2"><p className="text-[10px] uppercase tracking-[0.2em] text-fgSubtle">New finding · simulated</p><button type="button" onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))} aria-label="Dismiss" className="text-fgSubtle hover:text-fg"><X className="h-3.5 w-3.5" /></button></div>
                    <p className="mt-0.5 truncate font-mono text-sm text-fg">{t.s.identifier}</p>
                    <p className="mt-1 text-xs text-fgMuted"><span className={`font-semibold ${c.text}`}>{t.level} · {t.score}/100</span>{t.reasons[0] ? ` · ${t.reasons[0]}` : ''}</p>
                    <button type="button" onClick={() => { setSelectedCandidateId(t.candId); setToasts((x) => x.filter((y) => y.id !== t.id)); }} className="mt-2.5 rounded-full bg-accent px-3 py-1 text-[11px] font-semibold text-onAccent hover:bg-accentHover">Open dossier</button>
                  </div>
                </div>
                <span className={`block h-0.5 origin-left ${c.bar}`} style={{ animation: 'hero-alert-bar 10s linear forwards' }} />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </>
  );
};
