import React from 'react';

const toneFor = (score: number, level?: string) => {
  const l = (level || '').toLowerCase();
  if (l.startsWith('crit')) return 'rgb(var(--c-danger))';
  if (l.startsWith('high')) return 'rgb(var(--c-high))';
  if (l.startsWith('med')) return 'rgb(var(--c-warn))';
  if (l.startsWith('low') || l.startsWith('safe') || l.startsWith('official')) return 'rgb(var(--c-ok))';
  return score >= 75 ? 'rgb(var(--c-danger))' : score >= 50 ? 'rgb(var(--c-high))' : score >= 25 ? 'rgb(var(--c-warn))' : 'rgb(var(--c-ok))';
};

/** A 0-100 score drawn as a ring, coloured by the verdict's severity. */
export const ScoreRing: React.FC<{ score: number; level?: string; size?: number; label?: string }> = ({ score, level, size = 72, label = 'Risk score' }) => {
  const value = Math.max(0, Math.min(100, Math.round(Number(score) || 0)));
  const r = 42;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={`${label} ${value} out of 100`}>
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden>
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgb(var(--c-surface-3))" strokeWidth="9" />
        <circle
          cx="50" cy="50" r={r} fill="none" stroke={toneFor(value, level)} strokeWidth="9" strokeLinecap="round"
          strokeDasharray={`${(c * value) / 100} ${c}`}
          style={{ transition: 'stroke-dasharray 0.6s cubic-bezier(0.2,0.7,0.2,1)' }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-mono font-semibold tabular-nums text-fg" style={{ fontSize: size * 0.28 }}>
        {value}
      </span>
    </div>
  );
};

export default ScoreRing;
