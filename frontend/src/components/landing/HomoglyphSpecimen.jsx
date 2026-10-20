import React, { useEffect, useMemo, useState } from 'react';
import { RotateCcw, ShieldCheck, ShieldAlert } from 'lucide-react';
import { runFullLookalikeAnalysis } from '../../utils/lookalikeEngine';
import { INITIAL_BRAND_PROFILE } from '../../data/demoData';

/**
 * Hero instrument: two strings that look identical, then a scan reveals which characters are impostors.
 * Codepoints are computed from the strings themselves, and the domain verdict comes from the real
 * client-side lookalike engine run against the demo brand profile (Acme Corp).
 */
const SPECIMENS = [
  {
    id: 'domain',
    tab: 'Domain',
    short: 'Domain',
    official: 'acme.com',
    impostor: 'аcme.com', // Cyrillic small a
    marks: [0],
    explain: 'A Cyrillic letter stands in for the Latin one. Browsers and people read both as "a".',
  },
  {
    id: 'handle',
    tab: 'Social handle',
    short: 'Handle',
    official: '@acme_official',
    impostor: '@acrne_official',
    marks: [3, 4],
    explain: 'An "r" and an "n" side by side read as "m" at a glance, especially on a phone.',
  },
  {
    id: 'app',
    tab: 'App package',
    short: 'App',
    official: 'com.acme.wallet',
    impostor: 'com.acme.wa1let',
    marks: [11],
    explain: 'The digit 1 replaces the letter l inside an otherwise exact copy of the official package id.',
  },
];

const SCRIPT = (cp) => {
  if (cp >= 0x0400 && cp <= 0x04ff) return 'Cyrillic';
  if (cp >= 0x0370 && cp <= 0x03ff) return 'Greek';
  if (cp >= 0x30 && cp <= 0x39) return 'Digit';
  return 'Latin';
};
const codepoint = (ch) => `U+${ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}`;

const reduced = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export default function HomoglyphSpecimen() {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState(() => (reduced() ? 'reveal' : 'idle')); // idle -> scan -> reveal
  const [run, setRun] = useState(0); // bumps to replay the sequence
  const [pinned, setPinned] = useState(false); // user picked a tab: stop auto-advancing
  const [hovered, setHovered] = useState(false); // hold the current specimen while the pointer is on it
  const spec = SPECIMENS[index];

  // One scan sequence per specimen (or replay).
  useEffect(() => {
    if (reduced()) { setPhase('reveal'); return undefined; }
    setPhase('idle');
    const t1 = setTimeout(() => setPhase('scan'), 1100);
    const t2 = setTimeout(() => setPhase('reveal'), 2500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [index, run]);

  // Auto-advance through the three specimens until the visitor takes control.
  useEffect(() => {
    if (pinned || hovered || reduced() || phase !== 'reveal') return undefined;
    const t = setTimeout(() => setIndex((i) => (i + 1) % SPECIMENS.length), 4200);
    return () => clearTimeout(t);
  }, [phase, pinned, hovered, index]);

  const verdict = useMemo(() => {
    if (spec.id !== 'domain') return null;
    try {
      return runFullLookalikeAnalysis('Acme Secure Portal', spec.impostor, INITIAL_BRAND_PROFILE);
    } catch {
      return null;
    }
  }, [spec]);

  const revealed = phase === 'reveal';
  const firstMark = spec.impostor[spec.marks[0]];
  const originalChar = spec.id === 'handle' ? 'm' : spec.official[spec.marks[0]];

  return (
    <figure
      className="relative rounded-3xl border border-line bg-surface/80 shadow-elevated backdrop-blur-sm"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label="Homoglyph detection demonstration"
    >
      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-line px-3 pt-3" role="group" aria-label="Specimen type">
        {SPECIMENS.map((s, i) => (
          <button
            key={s.id}
            aria-pressed={i === index}
            onClick={() => { setPinned(true); setIndex(i); setRun((r) => r + 1); }}
            className={`relative -mb-px whitespace-nowrap rounded-t-lg px-2.5 py-2 text-[13px] sm:px-3 font-medium transition-colors ${
              i === index ? 'text-fg' : 'text-fgSubtle hover:text-fgMuted'
            }`}
          >
            <span className="sm:hidden">{s.short}</span>
            <span className="hidden sm:inline">{s.tab}</span>
            {i === index && <span className="absolute inset-x-2 bottom-0 h-px bg-accent" aria-hidden />}
          </button>
        ))}
        <button
          onClick={() => { setPinned(true); setRun((r) => r + 1); }}
          className="ml-auto mb-1 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-fgSubtle transition-colors hover:bg-surface3 hover:text-fg"
        >
          <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.75} />
          Replay
        </button>
      </div>

      <div className="p-5 sm:p-7">
        <p className="text-sm text-fgMuted">Which one belongs to Acme?</p>

        {/* The two strings */}
        <div className="relative mt-4 overflow-hidden rounded-2xl border border-line bg-surface2">
          {phase === 'scan' && (
            <span
              key={`${index}-${run}`}
              aria-hidden
              className="lp-beam pointer-events-none absolute inset-y-0 left-0 w-[10%] bg-gradient-to-r from-transparent via-accent/25 to-transparent"
            >
              <span className="absolute inset-y-0 right-1/2 w-px bg-accent/80" />
            </span>
          )}

          {[{ text: spec.official, fake: false }, { text: spec.impostor, fake: true }].map((row, r) => (
            <div key={r} className={`flex items-center gap-3 px-3 py-4 sm:gap-4 sm:px-5 sm:py-5 ${r === 0 ? 'border-b border-line' : ''}`}>
              <span className="w-3 shrink-0 text-xs font-medium text-fgSubtle sm:w-5">{r === 0 ? 'A' : 'B'}</span>
              <span className="min-w-0 flex-1 truncate font-mono text-[1.1rem] leading-none tracking-tight text-fg min-[420px]:text-[1.35rem] sm:text-[2rem]" key={`${spec.id}-${run}-${r}`}>
                {Array.from(row.text).map((ch, c) => {
                  const marked = row.fake && spec.marks.includes(c);
                  return (
                    <span
                      key={c}
                      className={marked && revealed ? 'lp-unmask relative rounded-sm bg-danger/10' : ''}
                    >
                      {ch}
                    </span>
                  );
                })}
              </span>
              <span className="shrink-0">
                {revealed ? (
                  row.fake ? (
                    <span className="lp-tag-in inline-flex items-center gap-1.5 rounded-full border border-danger/30 bg-danger/10 px-2.5 py-1 text-xs font-medium text-danger">
                      <ShieldAlert className="h-3.5 w-3.5" strokeWidth={1.75} /><span className="sr-only sm:not-sr-only">Impostor</span>
                    </span>
                  ) : (
                    <span className="lp-tag-in inline-flex items-center gap-1.5 rounded-full border border-ok/30 bg-ok/10 px-2.5 py-1 text-xs font-medium text-ok">
                      <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.75} /><span className="sr-only sm:not-sr-only">Official</span>
                    </span>
                  )
                ) : (
                  <span className="inline-block h-6 w-8 rounded-full bg-surface3/70 sm:w-20" aria-hidden />
                )}
              </span>
            </div>
          ))}
        </div>

        {/* What the engine saw */}
        <div className="mt-5 grid min-h-[7.5rem] gap-4 sm:grid-cols-[auto,1fr]" aria-live="polite">
          {revealed ? (
            <>
              <div className="lp-tag-in flex items-center gap-3 rounded-2xl border border-line bg-surface2 px-4 py-3">
                <span className="font-mono text-4xl leading-none text-danger">{firstMark}</span>
                <span className="text-xs leading-relaxed text-fgMuted">
                  <span className="block font-mono text-fg">{codepoint(firstMark)}</span>
                  {SCRIPT(firstMark.codePointAt(0))}
                  <span className="block text-fgSubtle">
                    looks like <span className="font-mono text-fg">{originalChar}</span>
                  </span>
                </span>
              </div>
              <div className="lp-tag-in min-w-0" style={{ animationDelay: '120ms' }}>
                <p className="text-sm leading-relaxed text-fgMuted">{spec.explain}</p>
                {verdict ? (
                  <p className="mt-2 text-sm text-fg">
                    Engine verdict:{' '}
                    <span className="font-semibold text-danger">{verdict.overallRiskCategory}</span>
                    <span className="text-fgSubtle">, score </span>
                    <span className="font-mono">{verdict.overallScore}/100</span>
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-fg">The official entry is excluded first, so it can never be flagged.</p>
                )}
              </div>
            </>
          ) : (
            <p className="self-center text-sm text-fgSubtle sm:col-span-2">
              {phase === 'scan' ? 'Comparing every character with the official asset…' : 'They look the same to people. Watch what the scanner sees.'}
            </p>
          )}
        </div>
      </div>
    </figure>
  );
}
