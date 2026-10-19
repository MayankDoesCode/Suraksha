import React, { useCallback, useEffect, useRef, useState } from 'react';
import './BrandIntro.css';

interface BrandIntroProps {
  onComplete: () => void;
}

export const INTRO_HOLD_MS = 4900; // time on screen before the fade-out starts
const FADE_MS = 500;

const OUTLINE = 'M24 3 5 10v15c0 13 8 23 19 28 11-5 19-15 19-28V10L24 3Z';

/** Five plates that make up the shield, each arriving from a different direction. */
const PLATES: { id: string; d: string; fill: string; dx: number; dy: number; r: number; delay: number }[] = [
  { id: 'tl', d: 'M24 3 5 10v15h19Z', fill: 'url(#bi-steel)', dx: -34, dy: -26, r: -14, delay: 0.35 },
  { id: 'tr', d: 'M24 3l19 7v15H24Z', fill: 'url(#bi-indigo)', dx: 34, dy: -26, r: 14, delay: 0.5 },
  { id: 'bl', d: 'M5 25h19v28C13 48 5 38 5 25Z', fill: 'url(#bi-steel-dark)', dx: -30, dy: 34, r: 10, delay: 0.65 },
  { id: 'br', d: 'M24 25h19c0 13-8 23-19 28Z', fill: 'url(#bi-indigo-dark)', dx: 30, dy: 34, r: -10, delay: 0.8 },
];

/**
 * Opening title. Pure black. A shield assembles from five plates, catches one pass of light, then slides left
 * as the wordmark and the Hindi line are revealed beside it. A hairline progress bar runs along the bottom.
 * About 5.4 seconds; "Skip Intro" or any key ends it; reduced-motion users skip it entirely.
 */
export const BrandIntro: React.FC<BrandIntroProps> = ({ onComplete }) => {
  const [leaving, setLeaving] = useState(false);
  const done = useRef(false);
  const timers = useRef<number[]>([]);

  const finish = useCallback(() => {
    if (done.current) return;
    done.current = true;
    timers.current.forEach(clearTimeout);
    setLeaving(true);
    timers.current = [window.setTimeout(onComplete, FADE_MS)];
  }, [onComplete]);

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      onComplete();
      return;
    }
    timers.current = [window.setTimeout(finish, INTRO_HOLD_MS)];
    const onKey = () => finish();
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      timers.current.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`bi ${leaving ? 'bi--leaving' : ''}`} role="status" aria-label="SURAKSHA, digital brand protection">
      <button className="bi__skip" onClick={finish}>
        Skip Intro <kbd>Esc</kbd>
      </button>

      <div className="bi__lockup">
        <svg className="bi__shield" viewBox="0 0 48 56" fill="none" aria-hidden="true">
          <defs>
            <clipPath id="bi-clip"><path d={OUTLINE} /></clipPath>
            <linearGradient id="bi-steel" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#f2f4ff" stopOpacity="0.9" />
              <stop offset="1" stopColor="#8b93b8" stopOpacity="0.55" />
            </linearGradient>
            <linearGradient id="bi-steel-dark" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#aab0d0" stopOpacity="0.6" />
              <stop offset="1" stopColor="#3a3f5c" stopOpacity="0.7" />
            </linearGradient>
            <linearGradient id="bi-indigo" x1="1" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#a8b1ff" />
              <stop offset="1" stopColor="#5e6ad2" />
            </linearGradient>
            <linearGradient id="bi-indigo-dark" x1="1" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#6f7be0" />
              <stop offset="1" stopColor="#2b3278" />
            </linearGradient>
            <linearGradient id="bi-glint" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#fff" stopOpacity="0" />
              <stop offset="0.5" stopColor="#fff" stopOpacity="0.85" />
              <stop offset="1" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
          </defs>

          {PLATES.map((p) => (
            <path
              key={p.id}
              className="bi__plate"
              d={p.d}
              fill={p.fill}
              style={{ ['--dx' as string]: `${p.dx}px`, ['--dy' as string]: `${p.dy}px`, ['--r' as string]: `${p.r}deg`, animationDelay: `${p.delay}s` }}
            />
          ))}
          {/* Centre gem: the last piece to lock in */}
          <path className="bi__gem" d="M24 17l6 8-6 9-6-9Z" />
          <path className="bi__outline" d={OUTLINE} />
          <g clipPath="url(#bi-clip)">
            <rect className="bi__glint" x="-22" y="-6" width="14" height="70" fill="url(#bi-glint)" />
          </g>
        </svg>

        <div className="bi__text">
          <div className="bi__wipe">
            <span className="bi__word">SURAKSHA</span>
            <span className="bi__rule" />
            <span className="bi__slogan" lang="hi">आपकी सुरक्षा, हमारा साथ</span>
            <span className="bi__tag">Digital brand protection</span>
          </div>
        </div>
      </div>

      <div className="bi__progress" aria-hidden="true" />
    </div>
  );
};

export default BrandIntro;
