import { useEffect, useRef } from 'react';

/** True for the levels that should become a case without a click. */
export const isCaseWorthy = (level: unknown) => /^(high|critical)$/i.test(String(level || '').trim());

/**
 * Run `send` once for each new High or Critical result. `key` identifies the checked asset, so re-rendering the
 * same result (or re-checking the same asset) never creates a duplicate case.
 */
export function useAutoCase(result: unknown, level: unknown, key: string, send: () => void, delayMs = 0) {
  const done = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!result || !isCaseWorthy(level) || !key) return undefined;
    const k = `${String(level).toLowerCase()}|${key.toLowerCase()}`;
    if (done.current.has(k)) return undefined;
    const fire = () => { done.current.add(k); send(); };
    if (!delayMs) { fire(); return undefined; }
    // live-typing forms: wait until the inputs settle, so a half-typed entry never becomes a case
    const t = setTimeout(fire, delayMs);
    return () => clearTimeout(t);
    // send is intentionally not a dependency: it changes every render; result/level/key decide when to fire
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, level, key]);
}
