import React, { useMemo } from 'react';
import {
  ArrowRight,
  Building2,
  ChevronRight,
  CloudOff,
  Link2,
  ShieldCheck,
  Globe,
  Share2,
  Smartphone,
  Network,
  Activity,
  CheckCircle2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Donut } from '../components/dashboard/charts';
import { CountUp } from '../components/landing/Reveal';
import { deriveThreatGraph } from '../utils/threatGraph';
import type { CandidateAsset, InvestigationStatus, RiskLevel } from '../types';

const SEV: { key: RiskLevel; color: string; bar: string; text: string }[] = [
  { key: 'Critical', color: 'rgb(var(--c-danger))', bar: 'bg-danger', text: 'text-danger' },
  { key: 'High', color: 'rgb(var(--c-high))', bar: 'bg-high', text: 'text-high' },
  { key: 'Medium', color: 'rgb(var(--c-warn))', bar: 'bg-warn', text: 'text-warn' },
  { key: 'Low', color: 'rgb(var(--c-ok))', bar: 'bg-ok', text: 'text-ok' },
];

const STAGES: { key: InvestigationStatus; label: string; bar: string }[] = [
  { key: 'New', label: 'New', bar: 'bg-accent' },
  { key: 'Investigating', label: 'Investigating', bar: 'bg-warn' },
  { key: 'Confirmed Suspicious', label: 'Confirmed', bar: 'bg-danger' },
  { key: 'Dismissed', label: 'Dismissed', bar: 'bg-fgSubtle' },
];

const time = (iso: string) => {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? 0 : t;
};

const ago = (iso: string) => {
  if (!time(iso)) return '—';
  const m = Math.max(0, (Date.now() - time(iso)) / 60000);
  return m < 60 ? `${Math.max(1, Math.round(m))}m` : m < 1440 ? `${Math.round(m / 60)}h` : `${Math.round(m / 1440)}d`;
};

const greeting = () => {
  const h = new Date().getHours();
  return h < 5 ? 'Working late' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
};

const SEVERITY_RANK: Record<RiskLevel, number> = {
  Critical: 4,
  High: 3,
  Medium: 2,
  Low: 1,
};

export const OverviewDashboard: React.FC = () => {
  const {
    candidates,
    brandProfile,
    setActiveTab,
    setSelectedCandidateId,
    backendOnline,
    isBackendLoading,
    isDemoMode,
    enterDemoMode,
    backendBrands,
  } = useApp();
  const { currentUser, userProfile } = useAuth();

  const hasBrand = !!brandProfile.brandName && brandProfile.brandName !== 'No Brand Registered';
  const open = useMemo(() => candidates.filter((c) => c.status !== 'Dismissed'), [candidates]);
  const verifiedAssets =
    (brandProfile.officialDomains?.length || 0) +
    (brandProfile.officialSocialUrls?.length || 0) +
    (brandProfile.officialApps?.length || 0);
  const first = (userProfile?.displayName || currentUser?.displayName || '').split(/[ (]/)[0];

  const graph = useMemo(
    () => deriveThreatGraph(candidates, brandProfile.brandName),
    [candidates, brandProfile.brandName]
  );

  const queue = useMemo(() => {
    const links = new Map<string, { n: number; first?: string }>();
    graph.edges
      .filter((e) => e.basis === 'observed' && e.kind !== 'TARGETS_BRAND')
      .forEach((e) => {
        [e.source, e.target].forEach((id) => {
          const cur = links.get(id) || { n: 0 };
          const other = graph.nodes.find((x) => x.id === (id === e.source ? e.target : e.source))?.label;
          links.set(id, { n: cur.n + 1, first: cur.first || `${e.label.toLowerCase()} with ${other}` });
        });
      });
    return open
      .filter((c) => c.status === 'New' || c.status === 'Investigating')
      .map((c) => ({ c, link: links.get(`f:${c.id}`) }))
      .sort(
        (a, b) =>
          SEVERITY_RANK[b.c.riskCategory] - SEVERITY_RANK[a.c.riskCategory] ||
          (b.link?.n || 0) - (a.link?.n || 0) ||
          time(b.c.createdDate) - time(a.c.createdDate)
      )
      .slice(0, 8);
  }, [open, graph]);

  if (isBackendLoading && candidates.length === 0) {
    return (
      <div aria-busy="true" aria-label="Loading overview" className="w-full max-w-[1720px] mx-auto space-y-6">
        <div className="h-64 animate-pulse rounded-2xl bg-surface3" />
        <div className="h-56 animate-pulse rounded-2xl bg-surface3" />
      </div>
    );
  }

  if (!hasBrand && !isDemoMode && backendBrands.length === 0 && candidates.length === 0) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center rounded-2xl border border-line bg-surface p-8 shadow-xl">
        <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl border border-line bg-surface2 text-accent">
          <Building2 className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-bold text-fg">Register the enterprise brand to protect</h2>
        <p className="mt-1.5 text-xs text-fgMuted leading-relaxed max-w-sm mx-auto">
          Add your official domains, profiles and apps. They are excluded from findings, and all detected anomalies are judged against them.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            onClick={() => setActiveTab('brand-profile')}
            className="rounded-xl bg-accent px-4 py-2 text-xs font-semibold text-onAccent hover:bg-accentHover transition-colors cursor-pointer"
          >
            Configure Brand Assets
          </button>
        </div>
      </div>
    );
  }

  const bySev = SEV.map((s) => ({
    label: s.key,
    value: open.filter((c) => c.riskCategory === s.key).length,
    color: s.color,
    text: s.text,
    bar: s.bar,
  }));
  const byStage = STAGES.map((s) => ({
    ...s,
    n: candidates.filter((c) => c.status === s.key).length,
  }));
  const waiting = byStage[0].n + byStage[1].n;
  const reviewed = candidates.length - byStage[0].n;
  const urgent = open.filter((c) => c.riskCategory === 'Critical' || c.riskCategory === 'High').length;

  return (
    <div className="sk-stagger w-full max-w-[1720px] mx-auto space-y-6 pb-6">
      {/* Executive Telemetry Header */}
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line/60 pb-5">
        <div>
          <p className="flex items-center gap-2 text-sm text-fgMuted">
            <span className={`h-2 w-2 rounded-full ${isDemoMode ? 'bg-warn' : backendOnline ? 'bg-ok' : 'bg-fgSubtle'}`} aria-hidden />
            {brandProfile.brandName || 'Acme Corp'}
            <span className="text-fgSubtle">{isDemoMode ? 'demo workspace' : 'workspace active'}</span>
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-fg sm:text-[2.4rem] sm:leading-[1.1]">
            {first ? `${greeting()}, ${first}` : greeting()}
          </h1>
          <p className="mt-2 text-sm sm:text-base text-fgMuted leading-relaxed max-w-2xl">
            {candidates.length === 0
              ? `Nothing open for ${brandProfile.brandName || 'Acme Corp'}. Check a profile, app or domain to start.`
              : waiting === 0
              ? `Every open finding for ${brandProfile.brandName || 'Acme Corp'} has been triaged.`
              : `${waiting} ${waiting === 1 ? 'impostor is' : 'impostors are'} waiting for an analyst decision.`}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setActiveTab('watchtower')}
            className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-medium text-fg transition-colors hover:border-fgSubtle/60 hover:bg-surface3 cursor-pointer"
          >
            <Activity className="h-4 w-4 text-accent" strokeWidth={1.75} />
            <span>Watchtower</span>
          </button>
          <button
            onClick={() => setActiveTab('lookalike-engine')}
            className="group inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-onAccent transition-[transform,background-color] hover:bg-accentHover active:scale-[0.98] cursor-pointer"
          >
            <span>Check a domain</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </header>

      {/* Grid: Full Widescreen Fill with Exposure Cards & Fast Attack Vectors */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
        {/* Left Section: Exposure Ring + Breakdown */}
        <section
          aria-label="Threat exposure"
          className="xl:col-span-8 relative overflow-hidden rounded-3xl border border-line bg-surface p-6 sm:p-8 flex flex-col justify-between"
        >
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-10 lg:gap-12">
            <Donut
              size={180}
              thickness={13}
              parts={bySev.map((s) => ({ label: s.label, value: s.value, color: s.color }))}
              centre={
                <span className="text-4xl sm:text-5xl font-semibold tabular-nums tracking-tight text-fg">
                  <CountUp value={String(open.length)} />
                </span>
              }
              caption="open findings"
            />
            <div className="w-full flex-1">
              <ul className="grid grid-cols-2 gap-x-6 gap-y-2.5 text-xs sm:text-sm">
                {bySev.map((s) => (
                  <li key={s.label} className="flex items-center gap-2 text-fgMuted">
                    <span className={`h-2 w-2 rounded-full ${s.bar}`} aria-hidden="true" />
                    <span>{s.label}</span>
                    <span className="ml-auto font-mono text-xs tabular-nums text-fg font-medium">
                      {s.value}
                    </span>
                  </li>
                ))}
              </ul>

              <dl className="mt-6 grid grid-cols-3 divide-x divide-line border-t border-line/80 pt-5">
                {[
                  ['Critical or high', urgent, urgent > 0 ? 'text-danger' : 'text-fg'],
                  ['Investigating', byStage[1].n, 'text-fg'],
                  ['Verified assets', verifiedAssets, 'text-fg'],
                ].map(([label, value, tone], i) => (
                  <div key={label as string} className={i === 0 ? 'pr-2 sm:pr-4' : 'px-2 sm:px-4'}>
                    <dd className={`text-2xl sm:text-3xl font-semibold tabular-nums tracking-tight ${tone}`}>
                      <CountUp value={String(value)} />
                    </dd>
                    <dt className="mt-1 text-[11px] sm:text-xs text-fgSubtle leading-snug font-medium">
                      {label}
                    </dt>
                  </div>
                ))}
              </dl>
            </div>
          </div>

          {/* Review pipeline bar */}
          {candidates.length > 0 && (
            <div className="mt-6 border-t border-line/80 pt-5">
              <div className="flex items-baseline justify-between text-xs text-fgSubtle">
                <span className="font-medium text-fgMuted">Review pipeline</span>
                <span className="tabular-nums font-mono text-fg">
                  {reviewed} of {candidates.length} reviewed
                </span>
              </div>
              <div
                className="mt-2.5 flex h-2 gap-1 overflow-hidden rounded-full bg-surface3"
                role="img"
                aria-label={byStage.map((s) => `${s.label} ${s.n}`).join(', ')}
              >
                {byStage
                  .filter((s) => s.n > 0)
                  .map((s) => (
                    <div
                      key={s.key}
                      className={`${s.bar} sk-grow-x transition-all duration-300`}
                      style={{ flex: s.n }}
                    />
                  ))}
              </div>
              <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-fgMuted">
                {byStage.map((s) => (
                  <li key={s.key} className="flex items-center gap-1.5">
                    <span className={`h-1.5 w-1.5 rounded-full ${s.bar}`} aria-hidden="true" />
                    <span>{s.label}</span>
                    <span className="font-mono tabular-nums text-fg font-medium">{s.n}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* Right Section: Brand Vectors Quick Launcher */}
        <section className="xl:col-span-4 rounded-3xl border border-line bg-surface p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-line/80 pb-3">
              <span className="text-sm font-semibold text-fg">Check something new</span>
            </div>

            <div className="mt-3.5 space-y-2.5">
              <button
                onClick={() => setActiveTab('lookalike-engine')}
                className="w-full flex items-center justify-between rounded-2xl border border-line bg-surface2/60 p-3.5 text-left transition-colors hover:bg-surface3/60 hover:border-accent/40 group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-accent/15 border border-accent/25 flex items-center justify-center text-accent">
                    <Globe className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="block text-sm font-semibold text-fg group-hover:text-accent transition-colors">
                      Look-alike domain
                    </span>
                    <span className="block text-xs text-fgSubtle">Homoglyphs, typos and combos</span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-fgSubtle group-hover:text-fg group-hover:translate-x-0.5 transition-transform" />
              </button>

              <button
                onClick={() => setActiveTab('social-monitoring')}
                className="w-full flex items-center justify-between rounded-2xl border border-line bg-surface2/60 p-3.5 text-left transition-colors hover:bg-surface3/60 hover:border-high/40 group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-high/15 border border-high/25 flex items-center justify-center text-high">
                    <Share2 className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="block text-sm font-semibold text-fg group-hover:text-high transition-colors">
                      Social profile
                    </span>
                    <span className="block text-xs text-fgSubtle">Fake support and copied logos</span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-fgSubtle group-hover:text-fg group-hover:translate-x-0.5 transition-transform" />
              </button>

              <button
                onClick={() => setActiveTab('app-monitoring')}
                className="w-full flex items-center justify-between rounded-2xl border border-line bg-surface2/60 p-3.5 text-left transition-colors hover:bg-surface3/60 hover:border-ai/40 group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-ai/15 border border-ai/25 flex items-center justify-center text-ai">
                    <Smartphone className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="block text-sm font-semibold text-fg group-hover:text-ai transition-colors">
                      Mobile app
                    </span>
                    <span className="block text-xs text-fgSubtle">Copycat listings and packages</span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-fgSubtle group-hover:text-fg group-hover:translate-x-0.5 transition-transform" />
              </button>

              <button
                onClick={() => setActiveTab('threat-graph')}
                className="w-full flex items-center justify-between rounded-2xl border border-line bg-surface2/60 p-3.5 text-left transition-colors hover:bg-surface3/60 hover:border-accent/40 group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-surface3 border border-line flex items-center justify-center text-fg">
                    <Network className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="block text-sm font-semibold text-fg group-hover:text-accent transition-colors">
                      Threat graph
                    </span>
                    <span className="block text-xs text-fgSubtle">How findings connect</span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-fgSubtle group-hover:text-fg group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-line/60 flex items-center justify-between text-[11px] text-fgSubtle">
            <span>
              Target: <strong className="text-fg font-mono">{brandProfile.brandName || 'Acme Corp'}</strong>
            </span>
            <button
              onClick={() => setActiveTab('brand-profile')}
              className="text-accent hover:underline font-medium cursor-pointer"
            >
              Protected assets
            </button>
          </div>
        </section>
      </div>

      {/* Full-Width "Needs Attention" Triage Table / Queue */}
      <section aria-labelledby="queue-h" className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 id="queue-h" className="text-lg font-semibold tracking-tight text-fg">
              Needs a decision
            </h2>
            {queue.length > 0 && (
              <span className="rounded-full bg-surface2 border border-line px-2 py-0.5 text-[11px] font-mono font-medium tabular-nums text-fgSubtle">
                {queue.length} open
              </span>
            )}
          </div>
          {queue.length > 0 && (
            <button
              onClick={() => setActiveTab('investigation-center')}
              className="text-xs font-semibold text-accent hover:underline cursor-pointer transition-colors"
            >
              All investigations
            </button>
          )}
        </div>

        {queue.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-surface/50 px-6 py-10 text-center">
            <ShieldCheck className="mx-auto h-7 w-7 text-ok/80" />
            <h3 className="mt-3 text-sm font-medium text-fg">
              {candidates.length === 0 ? 'No active assessments' : 'Queue clear'}
            </h3>
            <p className="mx-auto mt-1 max-w-md text-xs text-fgMuted leading-relaxed">
              {candidates.length === 0
                ? 'Findings appear here when you evaluate a suspected domain, profile, or app clone.'
                : 'Every open finding for this brand has been triaged and assigned.'}
            </p>
          </div>
        ) : (
          <ul className="overflow-hidden rounded-3xl border border-line bg-surface divide-y divide-line/70">
            {queue.map(({ c, link }: { c: CandidateAsset; link?: { n: number; first?: string } }) => {
              const sev = SEV.find((s) => s.key === c.riskCategory) || SEV[3];
              return (
                <li key={c.id}>
                  <button
                    onClick={() => setSelectedCandidateId(c.id)}
                    className="group relative flex w-full items-center gap-4 py-3.5 pl-4 pr-4 text-left transition-all hover:bg-surface2/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent cursor-pointer"
                  >
                    <span
                      className={`absolute inset-y-2 left-0 w-[3px] rounded-r-full ${sev.bar}`}
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="truncate text-sm font-semibold text-fg group-hover:text-accent transition-colors"
                          title={c.title}
                        >
                          {c.title}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs">
                        {link ? (
                          <span className="flex items-center gap-1 font-medium text-accent truncate">
                            <Link2 className="h-3 w-3 shrink-0" />
                            <span>Connected: {link.first}</span>
                          </span>
                        ) : (
                          <span className="font-mono text-fgSubtle truncate">{c.identifier}</span>
                        )}
                      </div>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${sev.text} bg-surface2 border border-line`}
                    >
                      {c.riskCategory}
                    </span>
                    <span className="hidden w-24 shrink-0 whitespace-nowrap text-right text-xs text-fgSubtle sm:block font-medium">
                      {c.status === 'Investigating' ? 'Investigating' : 'New'}
                    </span>
                    <span className="w-12 shrink-0 text-right font-mono text-xs tabular-nums text-fgSubtle">
                      {ago(c.createdDate)}
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-fgSubtle transition-transform group-hover:translate-x-0.5 group-hover:text-fg" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line/60 pt-4 text-xs text-fgSubtle">
        <span>Severity comes from named rules. Model scores are shown as context only.</span>
        <button
          onClick={() => setActiveTab('reports')}
          className="text-accent hover:underline font-sans cursor-pointer font-medium"
        >
          All findings
        </button>
      </footer>
    </div>
  );
};

export default OverviewDashboard;
