import React from 'react';

/** The chart draws only the counts it is given: no smoothing, projection or invented points. */
export interface DonutPart { label: string; value: number; color: string }

export const Donut: React.FC<{ parts: DonutPart[]; size?: number; thickness?: number; centre: React.ReactNode; caption?: string }> = ({
  parts, size = 200, thickness = 14, centre, caption,
}) => {
  const total = parts.reduce((a, p) => a + p.value, 0);
  const r = (size - thickness) / 2;
  const gap = parts.filter((p) => p.value).length > 1 ? 1.6 : 0; // percent of the ring left between segments
  let acc = 0;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img" aria-label={parts.map((p) => `${p.label} ${p.value}`).join(', ')}>
        <defs>
          <radialGradient id="donut-halo" cx="50%" cy="50%" r="50%">
            <stop offset="62%" stopColor="rgb(var(--c-accent))" stopOpacity="0" />
            <stop offset="100%" stopColor="rgb(var(--c-accent))" stopOpacity="0.10" />
          </radialGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r + thickness * 0.9} fill="url(#donut-halo)" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(var(--c-surface-3))" strokeWidth={thickness} />
        {total > 0 &&
          parts.filter((p) => p.value > 0).map((p, i) => {
            const len = Math.max(0, (p.value / total) * 100 - gap);
            const start = acc;
            acc += (p.value / total) * 100;
            return (
              <circle
                key={p.label}
                cx={size / 2} cy={size / 2} r={r}
                fill="none" stroke={p.color} strokeWidth={thickness} strokeLinecap="butt"
                pathLength={100}
                strokeDashoffset={-start}
                className="sk-seg"
                style={{ ['--len' as string]: len, animationDelay: `${0.2 + i * 0.12}s`, transform: 'rotate(-90deg)', transformOrigin: 'center' }}
              />
            );
          })}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        {centre}
        {caption && <span className="mt-1 text-xs text-fgSubtle">{caption}</span>}
      </div>
    </div>
  );
};
