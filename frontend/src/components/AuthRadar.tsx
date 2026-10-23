import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { AtSign, Globe, Smartphone } from 'lucide-react';
import { SurakshaLogo } from './SurakshaLogo';

/**
 * Sign-in showpiece: a radar with the Suraksha mark at its centre. A sweep circles every few seconds and each sample
 * threat lights up, gets labelled and is "caught" the moment the beam passes it. Sample data, drawn with CSS and SVG only.
 */
const T = 7; // seconds per sweep
const BLIPS = [
  { a: 38, r: 36, Icon: AtSign, label: '@acrne_official', sub: 'one letter off', sev: 'High', c: 'rgb(var(--c-warn))', side: 'r' },
  { a: 128, r: 41, Icon: Smartphone, label: 'Acme Pay Rewards', sub: 'publisher mismatch', sev: 'Critical', c: 'rgb(var(--c-danger))', side: 'r' },
  { a: 214, r: 38, Icon: Globe, label: 'acme-support-login.com', sub: 'login lure', sev: 'Medium', c: 'rgb(var(--c-accent))', side: 'l' },
  { a: 305, r: 42, Icon: AtSign, label: '@acme.help_desk', sub: 'asks for OTPs', sev: 'High', c: 'rgb(var(--c-warn))', side: 'l' },
];

const AuthRadar: React.FC = () => {
  const reduce = useReducedMotion();
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[400px]" aria-hidden>
      {/* glow + rings */}
      <div className="absolute inset-[-12%] rounded-full bg-accent/[0.08] blur-3xl" />
      {[100, 74, 48, 22].map((s, i) => (
        <div key={s} className="absolute rounded-full border border-line" style={{ inset: `${(100 - s) / 2}%`, borderStyle: i === 1 ? 'dashed' : 'solid', opacity: 0.35 + i * 0.15 }} />
      ))}
      <div className="absolute left-1/2 top-0 h-full w-px bg-line/60" /><div className="absolute left-0 top-1/2 h-px w-full bg-line/60" />

      {/* ticks */}
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 200 200" fill="none">
        {Array.from({ length: 72 }).map((_, i) => {
          const ang = (i * 5 * Math.PI) / 180; const long = i % 6 === 0;
          const r1 = 99; const r2 = long ? 94 : 96.5;
          return <line key={i} x1={100 + r1 * Math.sin(ang)} y1={100 - r1 * Math.cos(ang)} x2={100 + r2 * Math.sin(ang)} y2={100 - r2 * Math.cos(ang)} stroke="rgb(var(--c-fg-subtle))" strokeWidth={long ? 0.9 : 0.5} opacity={long ? 0.8 : 0.45} />;
        })}
      </svg>

      {/* sweep */}
      {!reduce && (
        <div className="absolute inset-0 rounded-full" style={{ animation: `auth-sweep ${T}s linear infinite`, background: 'conic-gradient(from 0deg, transparent 0deg, transparent 262deg, rgb(var(--c-accent) / 0.0) 262deg, rgb(var(--c-accent) / 0.30) 360deg)', maskImage: 'radial-gradient(circle, #000 69%, transparent 70%)', WebkitMaskImage: 'radial-gradient(circle, #000 69%, transparent 70%)' }} />
      )}
      {!reduce && <div className="absolute left-1/2 top-0 h-1/2 w-px origin-bottom bg-gradient-to-b from-accent to-transparent" style={{ animation: `auth-sweep ${T}s linear infinite` }} />}

      {/* centre mark */}
      <div className="absolute left-1/2 top-1/2 grid h-[26%] w-[26%] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-accent/40 bg-canvas/90 shadow-[0_0_60px_-8px_rgb(var(--c-accent)/0.55)]">
        <motion.div animate={reduce ? undefined : { scale: [1, 1.06, 1] }} transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}><SurakshaLogo size={52} /></motion.div>
      </div>

      {/* threats */}
      {BLIPS.map((b, i) => {
        const rad = (b.a * Math.PI) / 180; const x = 50 + b.r * Math.sin(rad); const y = 50 - b.r * Math.cos(rad);
        const delay = (b.a / 360) * T;
        const loop = { duration: T, repeat: Infinity, delay: reduce ? 0 : delay - T, ease: 'easeOut' as const, times: [0, 0.03, 0.55, 0.75, 1] };
        return (
          <div key={b.label} className="absolute" style={{ left: `${x}%`, top: `${y}%` }}>
            <motion.span className="absolute -left-2.5 -top-2.5 h-5 w-5 rounded-full" style={{ background: b.c }}
              initial={{ opacity: reduce ? 0.9 : 0 }} animate={reduce ? undefined : { opacity: [0, 0.5, 0.0, 0, 0], scale: [0.4, 2.8, 3.4, 3.4, 0.4] }} transition={loop} />
            <motion.span className="absolute -left-1.5 -top-1.5 h-3 w-3 rounded-full border-2 border-canvas" style={{ background: b.c, boxShadow: `0 0 14px ${b.c}` }}
              initial={{ opacity: reduce ? 1 : 0 }} animate={reduce ? undefined : { opacity: [0, 1, 1, 0.25, 0], scale: [0.2, 1.4, 1, 1, 0.2] }} transition={loop} />
            <motion.div className={`absolute top-1/2 w-max -translate-y-1/2 ${b.side === 'r' ? 'left-4' : 'right-4'}`}
              initial={{ opacity: reduce ? 1 : 0 }} animate={reduce ? undefined : { opacity: [0, 1, 1, 0, 0], x: b.side === 'r' ? [-8, 0, 0, 4, 4] : [8, 0, 0, -4, -4] }} transition={{ ...loop, delay: reduce ? 0 : delay - T + 0.1 }}>
              <div className="rounded-xl border border-line bg-canvas/90 px-2.5 py-1.5 shadow-xl backdrop-blur">
                <p className="flex items-center gap-1.5 font-mono text-[11px] text-fg"><b.Icon className="h-3 w-3 shrink-0" style={{ color: b.c }} />{b.label}</p>
                <p className="mt-0.5 text-[10px] text-fgSubtle"><span style={{ color: b.c }} className="font-semibold">{b.sev}</span> · {b.sub}</p>
              </div>
            </motion.div>
          </div>
        );
      })}
    </div>
  );
};

export default AuthRadar;
