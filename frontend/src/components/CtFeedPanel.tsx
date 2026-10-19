import React, { useCallback, useEffect, useState } from 'react';
import api from '../api/client';

type Status = { mode: string; running: boolean; seen: number; prefiltered: number; findings: number; errors: number; finished: boolean; last_error?: string; note: string };

export const CtFeedPanel: React.FC<{ onDone?: () => Promise<void> | void }> = ({ onDone }) => {
  const [st, setSt] = useState<Status | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const poll = useCallback(async () => {
    try { setSt((await api.request('/ct/status')).data); setErr(null); } catch (e: any) { setErr(e?.message || 'Could not read feed status.'); }
  }, []);
  useEffect(() => { poll(); }, [poll]);
  useEffect(() => {
    if (!st?.running) return;
    const t = setInterval(poll, 800);
    return () => clearInterval(t);
  }, [st?.running, poll]);
  useEffect(() => { if (st?.finished && !st.running) onDone?.(); }, [st?.finished, st?.running]); // eslint-disable-line react-hooks/exhaustive-deps

  const start = async () => {
    setErr(null);
    try { await api.request('/ct/start', { method: 'POST', body: '{}' }); await poll(); } catch (e: any) { setErr(e?.message || 'Could not start the feed.'); }
  };
  const pct = st && st.seen ? Math.min(100, Math.round((st.seen / 205) * 100)) : 0;

  return (
    <section className="mt-6 rounded-lg border border-line bg-surface p-4" aria-labelledby="ct-h">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="ct-h" className="text-sm font-medium text-fg">Certificate feed (replay)</h2>
          <p className="mt-1 max-w-xl text-xs text-fgMuted">Replays a bundled list of newly issued certificate names and keeps only those close to your verified domains. This is a recorded sample, not live traffic.</p>
        </div>
        <button onClick={start} disabled={st?.running} className="rounded-md bg-accent px-3 py-1 text-[13px] font-medium text-onAccent hover:bg-accentHover disabled:opacity-40">{st?.running ? 'Replaying…' : 'Replay feed'}</button>
      </div>
      {err && <p role="alert" className="mt-3 text-sm text-danger">{err}</p>}
      {st && (st.seen > 0 || st.running) && (
        <div className="mt-4" aria-live="polite">
          <div className="h-1 overflow-hidden rounded bg-surface3"><div className="h-full bg-accent transition-[width] duration-300" style={{ width: `${pct}%` }} /></div>
          <p className="mt-2 text-sm text-fg">{st.seen} names checked, {st.prefiltered} close to your brands, {st.findings} saved as findings{st.errors ? `, ${st.errors} errors` : ''}.</p>
          {st.last_error && <p className="mt-1 text-xs text-danger">{st.last_error}</p>}
        </div>
      )}
    </section>
  );
};
