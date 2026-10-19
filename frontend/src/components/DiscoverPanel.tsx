import React, { useState } from 'react';
import api from '../api/client';

type Row = { domain: string; technique?: string; severity?: string | null; risk_score?: number | null; finding_id?: string | null; ips?: string[] };
type Result = { candidates_generated: number; resolved: number; findings_created: number; findings_updated: number; lookup_errors: number; duration_seconds: number; results: Row[]; disclaimer: string };

export const DiscoverPanel: React.FC<{ brandId: string; onDone?: () => Promise<void> | void }> = ({ brandId, onDone }) => {
  const [busy, setBusy] = useState(false);
  const [enrich, setEnrich] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setBusy(true); setError(null);
    try {
      const res = await api.discoverLookalikes(brandId, { limit: 150, enrich });
      setResult(res.data);
      await onDone?.();
    } catch (e: any) {
      setError(e?.message || 'Discovery failed. You can retry.');
    } finally { setBusy(false); }
  };

  return (
    <section className="mt-8 rounded-lg border border-line bg-surface p-4" aria-labelledby="discover-h">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="discover-h" className="text-sm font-medium text-fg">Discover lookalikes</h2>
          <p className="mt-1 max-w-xl text-xs text-fgMuted">Generates typo, homoglyph and keyword variants of your verified domains, checks which exist in public DNS, and runs them through the rule engine. Existing names are registered, not necessarily malicious.</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs text-fgMuted"><input type="checkbox" checked={enrich} onChange={(e) => setEnrich(e.target.checked)} />Add registration and certificate data</label>
          <button onClick={run} disabled={busy} className="rounded-md bg-accent px-3 py-1 text-[13px] font-medium text-onAccent hover:bg-accentHover disabled:opacity-40">{busy ? 'Scanning…' : 'Run discovery'}</button>
        </div>
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
      {result && (
        <div className="mt-4" aria-live="polite">
          <p className="text-sm text-fg">{result.candidates_generated} names generated, {result.resolved} exist, {result.findings_created} new and {result.findings_updated} updated findings ({result.duration_seconds}s{result.lookup_errors ? `, ${result.lookup_errors} lookups failed` : ''}).</p>
          {result.results.length === 0 ? <p className="mt-2 text-xs text-fgSubtle">None of the generated names resolved.</p> : (
            <ul className="mt-2 divide-y divide-line text-[13px]">
              {result.results.slice(0, 15).map((r) => (
                <li key={r.domain} className="flex items-center justify-between gap-3 py-1.5">
                  <span className="truncate font-mono text-fg">{r.domain}</span>
                  <span className="shrink-0 text-xs text-fgSubtle">{r.technique} · {r.severity ?? 'not flagged'}{r.risk_score != null ? ` · ${r.risk_score}` : ''}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-xs text-fgSubtle">{result.disclaimer}</p>
        </div>
      )}
    </section>
  );
};
