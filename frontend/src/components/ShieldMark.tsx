import React from 'react';

interface ShieldMarkProps {
  size?: number;
  /** Draw the outline and tick on mount. Static (fully drawn) when false or for reduced-motion users. */
  animate?: boolean;
  className?: string;
}

/** The SURAKSHA shield: a quiet outline that draws itself, then the tick, then a soft fill. */
export const ShieldMark: React.FC<ShieldMarkProps> = ({ size = 44, animate = true, className = '' }) => (
  <svg
    width={size}
    height={Math.round(size * 1.17)}
    viewBox="0 0 48 56"
    fill="none"
    aria-hidden="true"
    className={`${animate ? 'sk-shield' : ''} ${className}`}
  >
    <path className="sk-shield__fill" d="M24 3 5 10v15c0 13 8 23 19 28 11-5 19-15 19-28V10L24 3Z" />
    <path className="sk-shield__line" pathLength={1} d="M24 3 5 10v15c0 13 8 23 19 28 11-5 19-15 19-28V10L24 3Z" />
    <path className="sk-shield__tick" pathLength={1} d="m16 27 6 6 11-13" />
  </svg>
);

export default ShieldMark;
