import React, { useEffect, useState } from 'react';
import { AlertCircle, ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { apiClient } from '../api/client';

type AssetKind = 'domain' | 'social' | 'mobile_app';
const KINDS: { id: AssetKind; label: string; placeholder: string }[] = [
  { id: 'domain', label: 'Domain', placeholder: 'e.g. brand-login-secure.xyz' },
  { id: 'social', label: 'Social profile', placeholder: 'e.g. @brand_support_help' },
  { id: 'mobile_app', label: 'Mobile app', placeholder: 'e.g. com.example.brandwallet' },
];

// Shape returned by POST /brands/{id}/watchtower/evaluate. Every field is optional: render only what came back.
interface EvalData {
  candidate_identifier?: string;
  is_official_asset?: boolean;
  exclusion_reason?: string | null;
  matched_asset?: string;
  observation_timestamp?: string;
  detection_method?: string;
  verification_status?: string;
  scan_mode_clarification?: string;
  severity?: string;
  finding_id?: string | null;
  routed_to_investigation?: boolean;
  similarity_metrics?: {
    exact_match?: boolean; levenshtein_distance?: number; normalized_similarity?: number;
    homoglyph_detected?: boolean; brand_contained?: boolean; suspicious_tld?: boolean;
  };
  risk_indicators?: { risk_level?: string; risk_score?: number; reasons?: string[] };
  explanation?: { observed_facts?: string[]; model_inferences?: string[]; unverified_claims?: string[]; recommended_next_steps?: string[] };
}

interface Summary {
  monitored_domains_count?: number;
  monitored_socials_count?: number;
  monitored_apps_count?: number;
  total_screened_findings?: number;
  active_unresolved_threats?: number;
  scheduled_monitoring_jobs_count?: number;
}

const TONE: Record<string, string> = {
  CRITICAL: 'bg-danger/10 text-danger border-danger/30',
  HIGH: 'bg-high/10 text-high border-high/30',
  MEDIUM: 'bg-warn/10 text-warn border-warn/30',
  LOW: 'bg-ok/10 text-ok border-ok/30',
  BENIGN: 'bg-ok/10 text-ok border-ok/30',
};

const Block: React.FC<{ title: string; items?: string[]; empty?: string }> = ({ title, items, empty }) => (
  <div>
    <p className="text-xs font-medium text-fgSubtle">{title}</p>
    {items && items.length > 0 ? (
      <ul className="mt-1.5 list-disc space-y-1 pl-4 text-xs text-fgMuted">{items.map((x, i) => <li key={i}>{x}</li>)}</ul>
    ) : (
      <p className="mt-1 text-xs text-fgSubtle">{empty ?? 'None.'}</p>
    )}
  </div>
);

export const WatchtowerView: React.FC = () => {
  const { selectedBackendBrandId, backendOnline, isDemoMode, brandProfile, refreshBackendData, setActiveTab } = useApp();

  const [kind, setKind] = useState<AssetKind>('domain');
  const [identifier, setIdentifier] = useState('');
  const [provenance, setProvenance] = useState('');
  const [busy, setBusy] = useState<'evaluate' | 'save' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EvalData | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [summaryError, setSummaryError] = useState(false);
  const [recent, setRecent] = useState<{ id: string; level: string; at: string }[]>([]);

  const brandId = isDemoMode ? null : selectedBackendBrandId;

  useEffect(() => {
    let live = true;
    setSummary(null);
    setSummaryError(false);
    if (!brandId) return;
    apiClient
      .getWatchtowerSummary(brandId)
      .then((res: any) => live && setSummary(res?.data ?? null))
      .catch(() => live && setSummaryError(true));
    return () => { live = false; };
  }, [brandId]);

  const run = async (persist: boolean) => {
    const value = identifier.trim();
    if (!value) { setError('Enter the domain, handle or app identifier to check.'); return; }
    if (!brandId) return;
    setError(null);
    setBusy(persist ? 'save' : 'evaluate');
    try {
      const res: any = await apiClient.evaluateWatchtower(brandId, {
        candidate_identifier: value,
        candidate_type: kind,
        asset_type: kind,
        source: provenance.trim() || 'analyst_submission',
        scan_mode: 'on_demand',
        persist_to_investigation: persist,
      });
      const data: EvalData = res?.data;
      if (!data) throw new Error('The server returned no evaluation.');
      setResult(data);
      if (persist) {
        if (data.finding_id) {
          await refreshBackendData();
          setSaved(data.finding_id);
        } else {
          setSaved(null);
          setError('Nothing was saved: the server created no finding for this asset (it may be an official asset or show no signals).');
        }
      } else {
        setSaved(null);
        setRecent((r) => [{ id: value, level: data.risk_indicators?.risk_level || data.severity || 'UNKNOWN', at: new Date().toISOString() }, ...r].slice(0, 8));
      }
    } catch (e: any) {
      // No local guess is substituted for a failed evaluation.
      setResult(null);
      setError(`The check did not run: ${e?.message || 'the backend request failed'}. Nothing was evaluated or saved.`);
    } finally {
      setBusy(null);
    }
  };

  // ---- States where the check cannot run at all
  if (isDemoMode || !brandId) {
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-line bg-surface p-8 text-center shadow-panel">
        <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl border border-line bg-surface2 text-accent">
          <Activity className="h-6 w-6" />
        </div>
        <h2 className="text-base font-semibold text-fg">Watchtower Continuous Perimeter Monitoring</h2>
        <p className="mt-2 text-xs text-fgMuted leading-relaxed">
          Watchtower continuously audits corporate digital touchpoints, lookalike domains, and rogue store packages against verified allowlists. You can launch real-time similarity checks or sync live endpoints.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => setActiveTab('lookalike-engine')}
            className="inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-xs font-medium text-onAccent hover:bg-accentHover transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
          >
            <span>Launch Lookalike Engine</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setActiveTab('brand-profile')}
            className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-4 py-2 text-xs font-medium text-fg hover:bg-surface2 transition-colors cursor-pointer"
          >
            <span>Configure Protected Assets</span>
          </button>
        </div>
      </div>
    );
  }

  const level = result?.risk_indicators?.risk_level || result?.severity;
  const sim = result?.similarity_metrics;
  const jobs = summary?.scheduled_monitoring_jobs_count;

  return (
    <div className="space-y-6">
      {!backendOnline && (
        <div role="alert" className="flex items-center gap-2 rounded-lg border border-warn/30 bg-warn/10 px-3 py-2 text-xs text-warn">
          <AlertCircle className="h-4 w-4 shrink-0" /> Backend unreachable. Checks cannot run until it reconnects.
        </div>
      )}

      {/* 1. Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-fg">Watchtower</h1>
          <p className="max-w-3xl text-xs text-fgMuted mt-1 leading-relaxed">
            Check one suspected asset against the verified assets of <span className="text-fg font-medium">{brandProfile.brandName}</span>. Each check is a single, on-demand evaluation by the backend rules engine. It is not continuous monitoring.
          </p>
        </div>
      </div>

      {/* Scope: real counts from the backend, no status lights */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
        {[
          ['Verified domains', summary?.monitored_domains_count],
          ['Verified profiles', summary?.monitored_socials_count],
          ['Verified apps', summary?.monitored_apps_count],
          ['Findings so far', summary?.total_screened_findings],
          ['Scheduled monitoring jobs', jobs],
        ].map(([label, value]) => (
          <div key={label as string} className="rounded-lg border border-line bg-surface px-3.5 py-2.5">
            <p className="text-[11px] font-medium text-fgSubtle">{label}</p>
            <p className="text-xl font-semibold font-mono text-fg mt-0.5 tabular-nums">{summaryError ? '—' : value ?? '…'}</p>
          </div>
        ))}
      </div>
      {summaryError && <p className="text-xs text-warn">Could not load brand scope from the backend.</p>}
      {jobs === 0 && <p className="text-xs text-fgSubtle">No scheduled monitoring is configured for this brand, so only checks you run here are performed.</p>}

      <form
        onSubmit={(e) => { e.preventDefault(); run(false); }}
        className="space-y-4 rounded-xl border border-line bg-surface p-5"
      >
        <div role="tablist" aria-label="Asset type" className="inline-flex gap-1 rounded-lg border border-line bg-surface2 p-0.5">
          {KINDS.map((k) => (
            <button
              key={k.id}
              type="button"
              role="tab"
              aria-selected={kind === k.id}
              onClick={() => setKind(k.id)}
              className={`rounded-md px-3 py-1 text-xs transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent ${
                kind === k.id ? 'bg-surface font-medium text-fg shadow-xs' : 'text-fgMuted hover:text-fg'
              }`}
            >
              {k.label}
            </button>
          ))}
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="block text-xs font-medium text-fgSubtle">
            Suspected asset
            <input
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder={KINDS.find((k) => k.id === kind)!.placeholder}
              className="mt-1 w-full rounded-md border border-line bg-surface2 px-3 py-2 font-mono text-xs font-normal text-fg placeholder:font-sans placeholder:text-fgSubtle focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
            />
          </label>
          <label className="block text-xs font-medium text-fgSubtle">
            Where did you find it? <span className="font-normal text-fgSubtle/80">(optional provenance)</span>
            <input
              value={provenance}
              onChange={(e) => setProvenance(e.target.value)}
              placeholder="e.g. customer report, phishing email"
              className="mt-1 w-full rounded-md border border-line bg-surface2 px-3 py-2 text-xs font-normal text-fg placeholder:text-fgSubtle focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={busy !== null || !backendOnline}
          className="rounded-md bg-accent px-4 py-2 text-xs font-medium text-onAccent hover:bg-accent/90 disabled:opacity-50 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
        >
          {busy === 'evaluate' ? 'Checking…' : 'Run check'}
        </button>
      </form>

      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> <span>{error}</span>
        </div>
      )}

      {result && (
        <section className="space-y-4 rounded-xl border border-line bg-surface p-5" aria-label="Check result">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-3.5">
            <div className="min-w-0">
              <p className="break-all font-mono text-sm font-medium text-fg">{result.candidate_identifier || identifier}</p>
              <p className="mt-0.5 text-[11px] text-fgSubtle">
                {result.detection_method || 'Rules engine'}
                {result.observation_timestamp && ` · checked ${new Date(result.observation_timestamp).toLocaleString()}`}
              </p>
            </div>
            {result.is_official_asset ? (
              <span className="inline-flex items-center gap-1.5 rounded-md border border-ok/30 bg-ok/10 px-2.5 py-1 text-xs font-medium text-ok">
                <ShieldCheck className="h-3.5 w-3.5" /> Verified official asset
              </span>
            ) : (
              <span className={`rounded-md border px-2.5 py-1 text-xs font-medium ${TONE[(level || '').toUpperCase()] || 'border-line bg-surface2 text-fgMuted'}`}>
                {level ? `${level[0]}${level.slice(1).toLowerCase()} severity` : 'No severity returned'}
                {typeof result.risk_indicators?.risk_score === 'number' && ` · rule score ${result.risk_indicators.risk_score}`}
              </span>
            )}
          </div>

          {result.is_official_asset ? (
            <p className="text-xs text-fgMuted">{result.exclusion_reason || 'This matches a verified asset, so it is excluded from findings.'}</p>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3">
                  <Block title="Why (rules that fired)" items={result.risk_indicators?.reasons} empty="No rule fired." />
                  <Block title="Observed facts" items={result.explanation?.observed_facts} />
                </div>
                <div className="space-y-3">
                  <Block title="Model inferences (not verified)" items={result.explanation?.model_inferences} empty="None reported." />
                  <Block title="Not established" items={result.explanation?.unverified_claims} empty="None reported." />
                  <Block title="Suggested next steps" items={result.explanation?.recommended_next_steps} />
                </div>
              </div>

              {sim && (
                <dl className="grid grid-cols-2 gap-x-6 gap-y-2 border-t border-line pt-3.5 text-xs sm:grid-cols-3">
                  {[
                    ['Compared with', result.matched_asset],
                    ['Exact match', sim.exact_match === undefined ? undefined : sim.exact_match ? 'Yes' : 'No'],
                    ['Edit distance', sim.levenshtein_distance],
                    ['Similarity', typeof sim.normalized_similarity === 'number' ? `${Math.round(sim.normalized_similarity * 100)}%` : undefined],
                    ['Homoglyphs', sim.homoglyph_detected === undefined ? undefined : sim.homoglyph_detected ? 'Detected' : 'None'],
                    ['Brand name contained', sim.brand_contained === undefined ? undefined : sim.brand_contained ? 'Yes' : 'No'],
                    ['Suspicious TLD', sim.suspicious_tld === undefined ? undefined : sim.suspicious_tld ? 'Yes' : 'No'],
                  ]
                    .filter(([, v]) => v !== undefined && v !== '')
                    .map(([k, v]) => (
                      <div key={k as string}>
                        <dt className="text-[11px] text-fgSubtle">{k}</dt>
                        <dd className="font-medium text-fg">{String(v)}</dd>
                      </div>
                    ))}
                </dl>
              )}
            </>
          )}

          <div className="flex flex-wrap items-center gap-3 border-t border-line pt-3.5">
            {!result.is_official_asset && !saved && (
              <button
                onClick={() => run(true)}
                disabled={busy !== null}
                className="rounded-md border border-line bg-surface2 hover:bg-surface3 px-3 py-1.5 text-xs font-medium text-fg transition-colors cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
              >
                {busy === 'save' ? 'Saving…' : 'Save as finding'}
              </button>
            )}
            {saved && (
              <span className="inline-flex items-center gap-2 text-xs text-ok font-medium">
                <CheckCircle2 className="h-4 w-4" /> Saved as a finding.
                <button onClick={() => setActiveTab('investigation-center')} className="underline cursor-pointer">Open investigations</button>
              </span>
            )}
            <p className="text-[11px] text-fgSubtle">{result.scan_mode_clarification || 'On-demand evaluation by an analyst request.'} Findings need analyst review.</p>
          </div>
        </section>
      )}

      {recent.length > 0 && (
        <details className="rounded-xl border border-line bg-surface overflow-hidden">
          <summary className="cursor-pointer px-4 py-2.5 text-xs font-medium text-fg hover:bg-surface2 transition-colors">
            Checks in this session ({recent.length})
          </summary>
          <ul className="divide-y divide-line border-t border-line">
            {recent.map((r, i) => (
              <li key={`${r.id}-${i}`} className="flex flex-wrap items-center gap-3 px-4 py-2 text-xs">
                <span className="min-w-0 flex-1 truncate font-mono text-fg">{r.id}</span>
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium border ${TONE[r.level.toUpperCase()] || 'border-line bg-surface2 text-fgMuted'}`}>{r.level.toLowerCase()}</span>
                <span className="text-[11px] text-fgSubtle">{new Date(r.at).toLocaleTimeString()}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
};

export default WatchtowerView;
