import React from 'react';
import { Globe, Share2, Smartphone, Network } from 'lucide-react';
import { RadarScope, type RadarBlip } from '../visuals/RadarScope';
import type { AssetType, CandidateAsset, RiskLevel } from '../../types';

/*
 * Overview visuals. Every mark is drawn from the findings passed in: no projection, smoothing or
 * invented points. Empty data renders an honest empty state.
 */

const SEV_ORDER: RiskLevel[] = ['Critical', 'High', 'Medium', 'Low'];
const SEV_TONE: Record<RiskLevel, RadarBlip['tone']> = { Critical: 'danger', High: 'high', Medium: 'warn', Low: 'ok' };
const SEV_BG: Record<RiskLevel, string> = { Critical: 'bg-danger', High: 'bg-high', Medium: 'bg-warn', Low: 'bg-ok' };
const SEV_DISTANCE: Record<RiskLevel, number> = { Critical: 0.2, High: 0.45, Medium: 0.68, Low: 0.9 };

const CHANNELS: { type: AssetType; label: string; icon: React.ElementType; start: number }[] = [
  { type: 'social', label: 'Social', icon: Share2, start: 0 },
  { type: 'app', label: 'Apps', icon: Smartphone, start: 120 },
  { type: 'domain', label: 'Domains', icon: Globe, start: 240 },
];

/** Stable 0-1 value from an id, so a finding keeps its place on the radar between renders. */
const spread = (id: string) => {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return ((h >>> 0) % 1000) / 1000;
};

const card = 'h-full rounded-3xl border border-line bg-surface p-6';

export const ThreatRadarCard: React.FC<{ open: CandidateAsset[]; onOpen?: () => void }> = ({ open, onOpen }) => {
  const blips: RadarBlip[] = open.map((c) => {
    const ch = CHANNELS.find((x) => x.type === c.type);
    const start = ch ? ch.start : 0;
    return {
      angle: start + 12 + spread(c.id) * 96,
      distance: SEV_DISTANCE[c.riskCategory] + (spread(c.id + 'r') - 0.5) * 0.12,
      tone: SEV_TONE[c.riskCategory] || 'accent',
      label: `${c.title} (${c.riskCategory})`,
    };
  });

  return (
    <section aria-labelledby="radar-h" className={`${card} flex flex-col`}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="radar-h" className="text-sm font-semibold text-fg">Threat radar</h2>
        {onOpen && (
          <button onClick={onOpen} className="text-xs font-medium text-accent hover:underline">Threat graph</button>
        )}
      </div>
      <p className="mt-1 text-xs text-fgSubtle">Closer to the centre means more severe. Each sector is a channel.</p>
      <div className="relative mx-auto mt-4 w-full max-w-[260px]">
        <RadarScope
          blips={blips}
          sectors={CHANNELS.map((c) => ({ label: c.label, start: c.start, end: c.start + 120 }))}
          size={260}
          className="h-auto w-full"
        />
      </div>
      <ul className="mt-auto flex flex-wrap justify-center gap-x-4 gap-y-1 pt-5 text-xs text-fgMuted">
        {SEV_ORDER.map((s) => (
          <li key={s} className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${SEV_BG[s]}`} aria-hidden />
            {s}
          </li>
        ))}
      </ul>
    </section>
  );
};

/** Recorded, still open, being reviewed, confirmed: shows how much the queue narrows at each step. */
export const FunnelCard: React.FC<{ candidates: CandidateAsset[] }> = ({ candidates }) => {
  const total = candidates.length;
  const steps = [
    { label: 'Findings recorded', n: total },
    { label: 'Still open', n: candidates.filter((c) => c.status !== 'Dismissed').length },
    { label: 'Under review', n: candidates.filter((c) => c.status === 'Investigating' || c.status === 'Confirmed Suspicious').length },
    { label: 'Confirmed impostors', n: candidates.filter((c) => c.status === 'Confirmed Suspicious').length },
  ];
  return (
    <section aria-labelledby="funnel-h" className={card}>
      <h2 id="funnel-h" className="text-sm font-semibold text-fg">From finding to confirmed</h2>
      <ol className="mt-5 space-y-3">
        {steps.map((s, i) => {
          const pct = total ? (s.n / total) * 100 : 0;
          return (
            <li key={s.label}>
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-fgMuted">{s.label}</span>
                <span className="font-mono tabular-nums text-fg">{s.n}</span>
              </div>
              <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-surface3/70">
                <div
                  className="sk-grow-x h-full rounded-full"
                  style={{
                    width: `${Math.max(pct, s.n ? 4 : 0)}%`,
                    background: `rgb(var(--c-accent) / ${1 - i * 0.2})`,
                    animationDelay: `${0.1 + i * 0.08}s`,
                  }}
                />
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
};

/** Open findings per channel, split by severity. */
export const ChannelCard: React.FC<{ open: CandidateAsset[]; onPick?: (type: AssetType) => void }> = ({ open, onPick }) => {
  const rows = CHANNELS.map((ch) => {
    const items = open.filter((c) => c.type === ch.type);
    return { ...ch, items, bySev: SEV_ORDER.map((s) => ({ s, n: items.filter((c) => c.riskCategory === s).length })) };
  });
  const other = open.filter((c) => !CHANNELS.some((ch) => ch.type === c.type)).length;
  const max = Math.max(1, ...rows.map((r) => r.items.length));
  return (
    <section aria-labelledby="channel-h" className={card}>
      <h2 id="channel-h" className="text-sm font-semibold text-fg">Open findings by channel</h2>
      <ul className="mt-5 space-y-4">
        {rows.map((r) => {
          const Icon = r.icon;
          return (
            <li key={r.type}>
              <button
                type="button"
                onClick={() => onPick?.(r.type)}
                className="group flex w-full items-center gap-3 text-left"
                aria-label={`${r.label}: ${r.items.length} open`}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-line bg-surface2 text-fgMuted group-hover:text-accent">
                  <Icon className="h-4 w-4" strokeWidth={1.75} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between text-sm">
                    <span className="text-fg">{r.label}</span>
                    <span className="font-mono tabular-nums text-fgMuted">{r.items.length}</span>
                  </span>
                  <span className="mt-1.5 flex h-2 gap-0.5 overflow-hidden rounded-full bg-surface3/70" style={{ width: `${Math.max((r.items.length / max) * 100, 8)}%` }}>
                    {r.bySev.filter((x) => x.n).map((x) => (
                      <span key={x.s} className={`${SEV_BG[x.s]} sk-grow-x`} style={{ flex: x.n }} />
                    ))}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {other > 0 && (
        <p className="mt-4 flex items-center gap-2 text-xs text-fgSubtle">
          <Network className="h-3.5 w-3.5" strokeWidth={1.75} /> {other} more on shared infrastructure
        </p>
      )}
    </section>
  );
};

/** Findings recorded per day for the last 14 days. */
export const ActivityCard: React.FC<{ candidates: CandidateAsset[] }> = ({ candidates }) => {
  const DAYS = 14;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Array.from({ length: DAYS }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (DAYS - 1 - i));
    return d;
  });
  const counts = days.map((d) => {
    const next = d.getTime() + 86_400_000;
    return candidates.filter((c) => {
      const t = Date.parse(c.createdDate);
      return !Number.isNaN(t) && t >= d.getTime() && t < next;
    });
  });
  const max = Math.max(1, ...counts.map((c) => c.length));
  const total = counts.reduce((a, c) => a + c.length, 0);
  const fmt = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' });

  return (
    <section aria-labelledby="activity-h" className={card}>
      <div className="flex items-baseline justify-between">
        <h2 id="activity-h" className="text-sm font-semibold text-fg">New findings, last 14 days</h2>
        <span className="font-mono text-sm tabular-nums text-fgMuted">{total}</span>
      </div>
      {total === 0 ? (
        <p className="mt-6 text-sm text-fgSubtle">Nothing new in the last two weeks.</p>
      ) : (
        <>
          <div className="mt-5 flex h-24 items-end gap-1" role="img" aria-label={`${total} findings in the last 14 days`}>
            {counts.map((c, i) => {
              const worst = SEV_ORDER.find((s) => c.some((x) => x.riskCategory === s));
              return (
                <div key={i} className="flex h-full flex-1 items-end" title={`${fmt.format(days[i])}: ${c.length}`}>
                  <div
                    className={`sk-grow w-full origin-bottom rounded-t-md ${c.length ? (worst ? SEV_BG[worst] : 'bg-accent') : 'bg-surface3/70'}`}
                    style={{ height: c.length ? `${(c.length / max) * 100}%` : '4px', animationDelay: `${i * 0.025}s` }}
                  />
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex justify-between text-[11px] text-fgSubtle">
            <span>{fmt.format(days[0])}</span>
            <span>Today</span>
          </div>
        </>
      )}
    </section>
  );
};
