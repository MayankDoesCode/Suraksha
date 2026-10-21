import React, { useState } from 'react';
import { CheckCircle2, XCircle, Download, ExternalLink, Plus } from 'lucide-react';
import { RiskBadge } from './RiskBadge';

export type ScanData = {
  brand?: string;
  scanned: number;
  official_excluded: number;
  flagged: any[];
  sources: { source: string; ok: boolean; reason?: string; count?: number; query?: string }[];
};

const LEVELS = ['Critical', 'High', 'Medium', 'Low'] as const;
const level = (s: string) => (LEVELS.find((l) => l.toUpperCase() === String(s).toUpperCase()) || 'Low') as (typeof LEVELS)[number];
const label = (s: string) => s.toLowerCase().split('_').map((w) => w[0]?.toUpperCase() + w.slice(1)).join(' ');
const bar: Record<string, string> = { Critical: 'bg-danger', High: 'bg-high', Medium: 'bg-warn', Low: 'bg-ok' };

function exportCsv(kind: string, data: ScanData) {
  const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const head = ['rank', 'asset', 'platform', 'publisher_or_name', 'severity', 'score', 'signals', 'url'];
  const rows = data.flagged.map((h, i) => [i + 1, h.handle || h.title, h.platform, h.publisher || h.display_name || '', h.severity, h.score, (h.signals || []).join('; '), h.profile_url || h.listing_url || '']);
  const csv = [head, ...rows].map((r) => r.map(esc).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = `suraksha-${kind}-scan.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

/** Structured, report-style results for a live scan: four summary tiles, ranked findings, source status. */
export function ScanResults({ kind, data, onTrack }: { kind: 'social' | 'app'; data: ScanData; onTrack?: (hit: any) => void }) {
  const [tracked, setTracked] = useState<Set<string>>(new Set());
  const okSources = new Set(data.sources.filter((s) => s.ok).map((s) => s.source));
  const allSources = new Set(data.sources.map((s) => s.source));
  const counts = LEVELS.map((l) => ({ l, n: data.flagged.filter((h) => level(h.severity) === l).length }));
  const tiles = [
    { k: 'Scanned', v: data.scanned, sub: kind === 'social' ? 'accounts reviewed' : 'listings reviewed' },
    { k: 'Official excluded', v: data.official_excluded, sub: 'on your allowlist' },
    { k: 'Flagged', v: data.flagged.length, sub: 'need analyst review' },
    { k: 'Sources online', v: `${okSources.size}/${allSources.size || 0}`, sub: 'connected this scan' },
  ];

  return (
    <div className="space-y-4 text-xs">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.k} className="rounded-lg border border-line bg-surface2/60 p-3">
            <p className="text-[11px] text-fgSubtle">{t.k}</p>
            <p className="mt-1 font-mono text-xl font-semibold tabular-nums text-fg">{t.v}</p>
            <p className="text-[11px] text-fgSubtle">{t.sub}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {counts.filter((c) => c.n > 0).map((c) => (<span key={c.l} className="flex items-center gap-1"><RiskBadge level={c.l} size="sm" showIcon={false} /><span className="font-mono text-fg">{c.n}</span></span>))}
        </div>
        {data.flagged.length > 0 && (
          <button onClick={() => exportCsv(kind, data)} className="inline-flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 text-[11px] font-medium text-fgSubtle hover:bg-surface2 hover:text-fg">
            <Download className="h-3.5 w-3.5" /> Export CSV
          </button>
        )}
      </div>

      {data.flagged.length === 0 ? (
        <p className="rounded-lg border border-line/60 p-3 text-fgSubtle">No look-alikes found in the sources searched. Public search is not exhaustive, so this is not proof of safety.</p>
      ) : (
        <ol className="space-y-2">
          {data.flagged.slice(0, 15).map((h, i) => {
            const lv = level(h.severity);
            const title = h.handle || h.title;
            const url = h.profile_url || h.listing_url;
            const sub = kind === 'social'
              ? [h.platform, h.display_name].filter(Boolean).join(' · ')
              : [h.store || h.platform, h.publisher || 'publisher unknown', h.package_id].filter(Boolean).join(' · ');
            return (
              <li key={`${h.platform}-${title}-${i}`} className="rounded-lg border border-line bg-surface p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-surface2 font-mono text-[11px] text-fgSubtle">{i + 1}</span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-fg">{title}</p>
                      <p className="truncate text-[11px] text-fgSubtle">{sub}</p>
                    </div>
                  </div>
                  <span className="shrink-0 [&>*]:whitespace-nowrap"><RiskBadge level={lv} size="sm" /></span>
                </div>
                <div className="mt-2.5 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface3">
                    <div className={`h-full rounded-full ${bar[lv]}`} style={{ width: `${Math.min(100, h.score)}%` }} />
                  </div>
                  <span className="font-mono text-[11px] tabular-nums text-fg">{h.score}/100</span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {(h.signals || []).map((s: string) => (<span key={s} className="rounded border border-line/70 bg-surface2 px-1.5 py-0.5 text-[10px] text-fgSubtle">{label(s)}</span>))}
                  {onTrack && (
                    <button
                      type="button"
                      disabled={tracked.has(`${i}-${title}`)}
                      onClick={() => { onTrack(h); setTracked(new Set(tracked).add(`${i}-${title}`)); }}
                      className="ml-auto inline-flex items-center gap-1 rounded border border-line px-2 py-0.5 text-[11px] text-fg hover:bg-surface2 disabled:opacity-60"
                    >
                      {tracked.has(`${i}-${title}`) ? <><CheckCircle2 className="h-3 w-3 text-ok" /> In findings</> : <><Plus className="h-3 w-3" /> Add to findings</>}
                    </button>
                  )}
                  {url && (<a href={url} target="_blank" rel="noreferrer" className={`${onTrack ? "" : "ml-auto "}inline-flex items-center gap-1 text-[11px] text-accent hover:underline`}>Open <ExternalLink className="h-3 w-3" /></a>)}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <div>
        <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-fgSubtle">Source status</p>
        <div className="flex flex-wrap gap-1.5">
          {[...allSources].map((s) => {
            const ok = okSources.has(s);
            const why = data.sources.find((x) => x.source === s && !x.ok)?.reason;
            return (
              <span key={s} className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] ${ok ? 'border-ok/30 text-ok' : 'border-danger/30 text-danger'}`}>
                {ok ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}{label(s)}{!ok && why ? ` · ${why}` : ''}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
