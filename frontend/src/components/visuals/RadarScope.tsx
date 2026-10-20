import React from 'react';

export interface RadarBlip {
  /** 0-360, clockwise from north. */
  angle: number;
  /** 0-1 from the centre. */
  distance: number;
  tone: 'danger' | 'high' | 'warn' | 'ok' | 'accent';
  label?: string;
}

const TONE: Record<RadarBlip['tone'], string> = {
  danger: 'rgb(var(--c-danger))',
  high: 'rgb(var(--c-high))',
  warn: 'rgb(var(--c-warn))',
  ok: 'rgb(var(--c-ok))',
  accent: 'rgb(var(--c-accent))',
};

export interface RadarSector {
  label: string;
  /** Degrees clockwise from north where the sector starts. */
  start: number;
  end: number;
}

const point = (deg: number, r: number) => {
  const a = ((deg - 90) * Math.PI) / 180;
  return [100 + r * Math.cos(a), 100 + r * Math.sin(a)];
};

/**
 * A radar scope with a rotating sweep. Blips are placed from real data by the caller; with none it is
 * an empty scope. The sweep stops for reduced-motion users (see .lp-radar in index.css).
 */
export const RadarScope: React.FC<{ blips?: RadarBlip[]; sectors?: RadarSector[]; size?: number; className?: string; label?: string }> = ({
  blips = [],
  sectors,
  size = 220,
  className = '',
  label,
}) => (
  <svg
    viewBox="0 0 200 200"
    width={size}
    height={size}
    className={className}
    role="img"
    aria-label={label || (blips.length ? `${blips.length} findings plotted by severity` : 'Empty radar')}
  >
    <defs>
      <radialGradient id="rs-bg" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="rgb(var(--c-accent))" stopOpacity="0.10" />
        <stop offset="100%" stopColor="rgb(var(--c-accent))" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="rs-sweep" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="rgb(var(--c-accent))" stopOpacity="0" />
        <stop offset="100%" stopColor="rgb(var(--c-accent))" stopOpacity="0.28" />
      </linearGradient>
    </defs>
    <circle cx="100" cy="100" r="96" fill="url(#rs-bg)" />
    {[96, 72, 48, 24].map((r) => (
      <circle key={r} cx="100" cy="100" r={r} fill="none" stroke="rgb(var(--c-line))" strokeWidth="0.8" />
    ))}
    {sectors ? (
      sectors.map((sec) => {
        const [x, y] = point(sec.start, 96);
        const [lx, ly] = point((sec.start + sec.end) / 2, 84);
        return (
          <g key={sec.label}>
            <line x1="100" y1="100" x2={x} y2={y} stroke="rgb(var(--c-line))" strokeWidth="0.8" />
            <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fontSize="8.5" fill="rgb(var(--c-fg-subtle))" style={{ fontFamily: 'inherit' }}>
              {sec.label}
            </text>
          </g>
        );
      })
    ) : (
      <>
        <line x1="100" y1="4" x2="100" y2="196" stroke="rgb(var(--c-line))" strokeWidth="0.6" />
        <line x1="4" y1="100" x2="196" y2="100" stroke="rgb(var(--c-line))" strokeWidth="0.6" />
      </>
    )}
    <g className="lp-radar">
      <path d="M100 100 L100 4 A96 96 0 0 1 183.1 52 Z" fill="url(#rs-sweep)" />
      <line x1="100" y1="100" x2="100" y2="4" stroke="rgb(var(--c-accent))" strokeOpacity="0.8" strokeWidth="1" />
    </g>
    {blips.map((b, i) => {
      const a = ((b.angle - 90) * Math.PI) / 180;
      const r = 14 + Math.max(0, Math.min(1, b.distance)) * 78;
      const x = 100 + r * Math.cos(a);
      const y = 100 + r * Math.sin(a);
      return (
        <g key={i}>
          <circle cx={x} cy={y} r="7" fill={TONE[b.tone]} opacity="0.18" />
          <circle cx={x} cy={y} r="3.2" fill={TONE[b.tone]}>
            {b.label && <title>{b.label}</title>}
          </circle>
        </g>
      );
    })}
    <circle cx="100" cy="100" r="3" fill="rgb(var(--c-accent))" />
  </svg>
);

export default RadarScope;
