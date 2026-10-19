import React, { useEffect, useRef, useState } from 'react';

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * True once the element has scrolled into view (or immediately for reduced-motion users).
 * Uses a position check on scroll and resize rather than IntersectionObserver, so it also works when the
 * page is rendered in a throttled or background surface where observer callbacks may never fire.
 */
function useInView(ref, threshold = 0.15) {
  const [seen, setSeen] = useState(() => reducedMotion());
  useEffect(() => {
    if (seen) return undefined;
    const check = () => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const visible = Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0);
      if (r.height > 0 && visible >= Math.min(r.height * threshold, window.innerHeight * 0.3)) setSeen(true);
    };
    check();
    window.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check);
    return () => {
      window.removeEventListener('scroll', check);
      window.removeEventListener('resize', check);
    };
  }, [ref, seen, threshold]);
  return seen;
}

/** Fades and lifts its children into place when scrolled into view. */
export function Reveal({ as: Tag = 'div', delay = 0, className = '', children, ...rest }) {
  const ref = useRef(null);
  const seen = useInView(ref);
  return (
    <Tag ref={ref} style={{ transitionDelay: seen ? `${delay}ms` : '0ms' }} className={`sk-reveal ${seen ? 'sk-reveal--in' : ''} ${className}`} {...rest}>
      {children}
    </Tag>
  );
}

/** Counts a leading number up from zero when scrolled into view, e.g. "42%" or "0.87 F1". Other text is left as is. */
export function CountUp({ value, duration = 1100, className = '' }) {
  const ref = useRef(null);
  const seen = useInView(ref, 0.4);
  const match = String(value).match(/^(\d+(?:\.\d+)?)(.*)$/);
  const target = match ? parseFloat(match[1]) : null;
  const decimals = match && match[1].includes('.') ? match[1].split('.')[1].length : 0;
  const [shown, setShown] = useState(target === null || reducedMotion() ? target : 0);

  useEffect(() => {
    if (!seen || target === null || reducedMotion()) {
      if (seen) setShown(target);
      return undefined;
    }
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      setShown(target * (1 - Math.pow(1 - t, 3))); // ease-out cubic
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [seen, target, duration]);

  if (target === null) return <span ref={ref} className={className}>{value}</span>;
  return (
    <span ref={ref} className={`tabular-nums ${className}`} aria-label={String(value)}>
      {shown === null ? value : shown.toFixed(decimals)}
      {match[2]}
    </span>
  );
}
