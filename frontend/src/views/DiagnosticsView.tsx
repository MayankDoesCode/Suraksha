import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import api from '../api/client';

type Loaded<T> = { state: 'loading' } | { state: 'error'; message: string } | { state: 'ok'; data: T };

const COMPONENT_LABEL: Record<string, string> = {
  url_phishing: 'URL / domain model',
  social_fake_account: 'Social fake-account model',
  mobile_app: 'Mobile app assessment',
  candidate: 'Candidate model',
};

const pct = (v: unknown) => (typeof v === 'number' ? `${(v * 100).toFixed(1)}%` : null);

const Dot: React.FC<{ tone: 'ok' | 'warn' | 'danger' | 'idle' }> = ({ tone }) => (
  <span className={`inline-block h-1.5 w-1.5 rounded-full ${tone === 'ok' ? 'bg-ok' : tone === 'warn' ? 'bg-warn' : tone === 'danger' ? 'bg-danger' : 'bg-fgSubtle'}`} aria-hidden />
);

export const DiagnosticsView: React.FC = () => {
  const [health, setHealth] = useState<Loaded<any>>({ state: 'loading' });
  const [ml, setMl] = useState<Loaded<any>>({ state: 'loading' });
  const [integrations, setIntegrations] = useState<Loaded<any[]>>({ state: 'loading' });

  const [url, setUrl] = useState('');
  const [prediction, setPrediction] = useState<Loaded<any> | null>(null);

  const load = useCallback(async () => {
    setHealth({ state: 'loading' });
    setMl({ state: 'loading' });
    setIntegrations({ state: 'loading' });
    const ask = async <T,>(fn: () => Promise<any>, pick: (r: any) => T, set: (l: Loaded<T>) => void) => {
      try { set({ state: 'ok', data: pick(await fn()) }); } catch (e: any) { set({ state: 'error', message: e?.message || 'Request failed' }); }
    };
    await Promise.all([
      ask(() => api.getHealth(), (r) => r, setHealth),
      ask(() => api.getMLStatus(), (r) => r?.data ?? r, setMl),
      ask(
        () => api.getIntegrationsStatus(),
        // The API returns providers keyed by id ({ itunes_app_store: {...} }); older builds sent an array.
        (r) => {
          const p = r?.providers ?? r?.data?.providers ?? [];
          return Array.isArray(p) ? p : Object.entries(p).map(([id, v]: [string, any]) => ({ id, ...v }));
        },
        setIntegrations
      ),
    ]);
  }, []);
  useEffect(() => { load(); }, [load]);

  const runUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    setPrediction({ state: 'loading' });
    try { setPrediction({ state: 'ok', data: (await api.predictURLRisk(url.trim()))?.data }); }
    catch (err: any) { setPrediction({ state: 'error', message: err?.message || 'Request failed' }); }
  };

  const h = health.state === 'ok' ? health.data : null;
  const components: [string, any][] = ml.state === 'ok' ? Object.entries(ml.data?.components || {}) : [];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <p className="max-w-2xl text-sm text-fgMuted">What is running, which models are loaded, and what has actually been measured. Nothing here is estimated: unavailable data is shown as unavailable.</p>
        <button onClick={load} className="inline-flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1 text-[13px] text-fgMuted hover:bg-surface3 hover:text-fg">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      <section aria-labelledby="be">
        <h2 id="be" className="text-sm font-medium">Backend</h2>
        <div className="mt-2 rounded-md border border-line px-4 py-3 text-sm">
          {health.state === 'loading' && <span className="text-fgSubtle">Checking…</span>}
          {health.state === 'error' && <span className="flex items-center gap-2 text-danger"><Dot tone="danger" /> Unreachable: {health.message}</span>}
          {h && (
            <dl className="flex flex-wrap gap-x-8 gap-y-2">
              <div><dt className="text-xs text-fgSubtle">Status</dt><dd className="flex items-center gap-1.5"><Dot tone={h.status === 'healthy' ? 'ok' : 'warn'} />{h.status}</dd></div>
              <div><dt className="text-xs text-fgSubtle">Database</dt><dd className="flex items-center gap-1.5"><Dot tone={h.database?.connected ? 'ok' : 'danger'} />{h.database?.connected ? 'connected' : h.database?.status || 'not connected'}</dd></div>
              <div><dt className="text-xs text-fgSubtle">Version</dt><dd>{h.version}</dd></div>
              <div><dt className="text-xs text-fgSubtle">Environment</dt><dd>{h.environment}</dd></div>
            </dl>
          )}
        </div>
      </section>

      <section aria-labelledby="models">
        <h2 id="models" className="text-sm font-medium">Models</h2>
        {ml.state === 'loading' && <p className="mt-2 text-sm text-fgSubtle">Loading…</p>}
        {ml.state === 'error' && <p role="alert" className="mt-2 text-sm text-danger">Could not load model status: {ml.message}</p>}
        {ml.state === 'ok' && (
          <>
            <div className="mt-2 overflow-x-auto rounded-md border border-line">
              <table className="w-full min-w-[40rem] text-left text-[13px]">
                <thead className="border-b border-line bg-surface2 text-xs text-fgMuted">
                  <tr><th className="px-3 py-2 font-medium">Component</th><th className="px-3 py-2 font-medium">State</th><th className="px-3 py-2 font-medium">Trained on</th><th className="px-3 py-2 font-medium">Offline metrics (as reported)</th></tr>
                </thead>
                <tbody className="divide-y divide-line align-top">
                  {components.map(([key, c]) => {
                    const m = c.metrics || {};
                    const metrics = [['Precision', pct(m.precision)], ['Recall', pct(m.recall)], ['F1', pct(m.f1)], ['Accuracy', pct(m.accuracy)]].filter(([, v]) => v);
                    const compat = ml.data?.artifact_compatibility?.[key];
                    return (
                      <tr key={key}>
                        <td className="px-3 py-2.5"><p className="font-medium text-fg">{COMPONENT_LABEL[key] || key}</p>{c.model_version && <p className="text-xs text-fgSubtle">v{c.model_version}</p>}</td>
                        <td className="px-3 py-2.5">
                          <span className="flex items-center gap-1.5"><Dot tone={c.available ? 'ok' : 'idle'} />{c.available ? 'Loaded' : 'Not loaded'}</span>
                          {compat && compat.status !== 'verified' && <p className="mt-0.5 text-xs text-warn">{compat.status.replace(/_/g, ' ')}</p>}
                          {!c.available && <p className="mt-0.5 max-w-[14rem] text-xs text-fgSubtle">{c.reason || 'Rule-based only; no trained model.'}</p>}
                        </td>
                        <td className="px-3 py-2.5 text-xs text-fgMuted">
                          {c.dataset_source ? <>{c.dataset_source}{c.license && <span className="text-fgSubtle"> · {c.license}</span>}{c.total_samples && <span className="text-fgSubtle"> · {c.total_samples.toLocaleString()} samples</span>}</> : <span className="text-fgSubtle">None</span>}
                        </td>
                        <td className="px-3 py-2.5 text-xs">
                          {metrics.length ? <span className="text-fgMuted">{metrics.map(([k, v]) => `${k} ${v}`).join(' · ')}</span> : <span className="text-fgSubtle">None measured</span>}
                          {c.scope_boundary && <p className="mt-1 max-w-sm text-fgSubtle">{c.scope_boundary}</p>}
                        </td>
                      </tr>
                    );
                  })}
                  {components.length === 0 && <tr><td colSpan={4} className="px-3 py-6 text-center text-fgSubtle">The backend reported no model components.</td></tr>}
                </tbody>
              </table>
            </div>
            <p className="mt-3 max-w-3xl rounded-md border border-line bg-surface2 px-3 py-2.5 text-xs text-fgMuted">
              <span className="font-medium text-fg">Known limitation.</span> The URL model’s reported accuracy is inflated by input format: benign training rows were bare domains while many
              phishing rows were full URLs. In a leakage-safe re-evaluation (October 2026, 2,210 held-out hosts), scoring bare hostnames, the shipped model caught about 42% of phishing hosts at
              about 95% precision. Model output is therefore shown as supporting evidence and never sets a finding’s severity. Source: docs/PHASE0_AUDIT.md.
            </p>
          </>
        )}
      </section>

      <section aria-labelledby="url">
        <h2 id="url" className="text-sm font-medium">Try the URL model</h2>
        <form onSubmit={runUrl} className="mt-2 flex flex-wrap gap-2">
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="e.g. secure-login-example.xyz" aria-label="URL or domain to score" className="min-w-[14rem] flex-1 rounded-md border border-line bg-surface2 px-3 py-1.5 font-mono text-[13px] placeholder:font-sans placeholder:text-fgSubtle focus:border-accent" />
          <button type="submit" disabled={!url.trim() || prediction?.state === 'loading'} className="rounded-md bg-accent px-3 py-1.5 text-[13px] font-medium text-onAccent hover:bg-accentHover disabled:opacity-40">Score</button>
        </form>
        {prediction?.state === 'error' && <p role="alert" className="mt-2 text-sm text-danger">Could not score: {prediction.message}</p>}
        {prediction?.state === 'ok' && (
          <div className="mt-2 rounded-md border border-line px-4 py-3 text-sm">
            {prediction.data?.available === false ? (
              <p className="text-fgMuted">The model is not loaded: {prediction.data.reason || prediction.data.error || 'no reason given'}.</p>
            ) : (
              <>
                <p>Uncalibrated score <span className="font-semibold tabular-nums">{prediction.data?.risk_score}</span> / 100 for <span className="font-mono">{prediction.data?.scored_input || prediction.data?.indicator}</span></p>
                <p className="mt-1 text-xs text-fgSubtle">Only the hostname is scored. This is a lexical signal, not a verdict, and a low score does not mean the domain is safe.</p>
              </>
            )}
          </div>
        )}
      </section>

      <section aria-labelledby="int">
        <h2 id="int" className="text-sm font-medium">Data providers</h2>
        {integrations.state === 'loading' && <p className="mt-2 text-sm text-fgSubtle">Loading…</p>}
        {integrations.state === 'error' && <p role="alert" className="mt-2 text-sm text-danger">Could not load providers: {integrations.message}</p>}
        {integrations.state === 'ok' && (
          integrations.data.length === 0 ? <p className="mt-2 text-sm text-fgSubtle">No providers reported.</p> : (
            <ul className="mt-2 divide-y divide-line rounded-md border border-line text-[13px]">
              {integrations.data.map((p: any, i: number) => {
                const name = p.provider_name || p.source_name || p.name || p.provider_id || `Provider ${i + 1}`;
                const state = String(p.status || p.state || (p.configured === false ? 'not configured' : p.configured ? 'configured' : 'unknown'));
                const note = p.diagnostic?.message || p.diagnostic || p.message || '';
                return (
                  <li key={i} className="flex flex-wrap items-baseline gap-x-3 px-4 py-2.5">
                    <span className="font-medium text-fg">{name}</span>
                    <span className="flex items-center gap-1.5 text-fgMuted"><Dot tone={/ok|ready|operational|active|configured$/i.test(state) && !/not/i.test(state) ? 'ok' : 'warn'} />{state}</span>
                    {typeof note === 'string' && note && <span className="basis-full text-xs text-fgSubtle">{note}</span>}
                  </li>
                );
              })}
            </ul>
          )
        )}
      </section>
    </div>
  );
};

export default DiagnosticsView;
