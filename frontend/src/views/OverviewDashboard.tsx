import React, { useMemo } from 'react';
import { ArrowRight, Building2, ChevronRight, CloudOff } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { SEVERITY_RANK } from '../components/FindingsTable';
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

const time = (iso: string) => { const t = Date.parse(iso); return Number.isNaN(t) ? 0 : t; };
const ago = (iso: string) => {
  if (!time(iso)) return '—';
  const m = Math.max(0, (Date.now() - time(iso)) / 60000);
  return m < 60 ? `${Math.max(1, Math.round(m))}m` : m < 1440 ? `${Math.round(m / 60)}h` : `${Math.round(m / 1440)}d`;
};
const greeting = () => {
  const h = new Date().getHours();
  return h < 5 ? 'Working late' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
};

export const OverviewDashboard: React.FC = () => {
  const { candidates, brandProfile, setActiveTab, setSelectedCandidateId, backendOnline, isBackendLoading, isDemoMode, enterDemoMode, backendBrands } = useApp();
  const { currentUser, userProfile } = useAuth();

  const hasBrand = !!brandProfile.brandName && brandProfile.brandName !== 'No Brand Registered';
  const open = useMemo(() => candidates.filter((c) => c.status !== 'Dismissed'), [candidates]);
  const verifiedAssets = (brandProfile.officialDomains?.length || 0) + (brandProfile.officialSocialUrls?.length || 0) + (brandProfile.officialApps?.length || 0);
  const first = (userProfile?.displayName || currentUser?.displayName || '').split(/[ (]/)[0];

  // Most severe first, then the most connected evidence.
  const graph = useMemo(() => deriveThreatGraph(candidates, brandProfile.brandName), [candidates, brandProfile.brandName]);
  const queue = useMemo(() => {
    const links = new Map<string, { n: number; first?: string }>();
    graph.edges.filter((e) => e.basis === 'observed' && e.kind !== 'TARGETS_BRAND').forEach((e) => {
      [e.source, e.target].forEach((id) => {
        const cur = links.get(id) || { n: 0 };
        const other = graph.nodes.find((x) => x.id === (id === e.source ? e.target : e.source))?.label;
        links.set(id, { n: cur.n + 1, first: cur.first || `${e.label.toLowerCase()} with ${other}` });
      });
    });
    return open
      .filter((c) => c.status === 'New' || c.status === 'Investigating')
      .map((c) => ({ c, link: links.get(`f:${c.id}`) }))
      .sort((a, b) => SEVERITY_RANK[b.c.riskCategory] - SEVERITY_RANK[a.c.riskCategory] || (b.link?.n || 0) - (a.link?.n || 0) || time(b.c.createdDate) - time(a.c.createdDate))
      .slice(0, 5);
  }, [open, graph]);

  if (isBackendLoading && candidates.length === 0) {
    return <div aria-busy="true" aria-label="Loading overview" className="mx-auto max-w-4xl space-y-4"><div className="h-56 animate-pulse rounded-xl bg-surface3" /><div className="h-48 animate-pulse rounded-xl bg-surface3" /></div>;
  }

  if (!hasBrand && !isDemoMode && backendBrands.length === 0) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <Building2 className="mx-auto h-6 w-6 text-fgSubtle" />
        <h2 className="mt-4 text-lg font-semibold">Register the brand you want to protect</h2>
        <p className="mt-1 text-sm text-fgMuted">Add your official domains, profiles and apps first. They are excluded from findings, and everything else is judged against them.</p>
        <div className="mt-5 flex justify-center gap-2">
          <button onClick={() => setActiveTab('brand-profile')} className="rounded-md bg-accent px-3.5 py-1.5 text-sm font-medium text-onAccent hover:bg-accentHover">Set up a brand</button>
          <button onClick={enterDemoMode} className="rounded-md border border-line px-3.5 py-1.5 text-sm text-fgMuted hover:bg-surface3 hover:text-fg">Explore demo data</button>
        </div>
      </div>
    );
  }

  const bySev = SEV.map((s) => ({ label: s.key, value: open.filter((c) => c.riskCategory === s.key).length, color: s.color, text: s.text, bar: s.bar }));
  const byStage = STAGES.map((s) => ({ ...s, n: candidates.filter((c) => c.status === s.key).length }));
  const waiting = byStage[0].n + byStage[1].n;
  const reviewed = candidates.length - byStage[0].n;
  const urgent = open.filter((c) => c.riskCategory === 'Critical' || c.riskCategory === 'High').length;

  return (
    <div className="sk-stagger mx-auto max-w-4xl space-y-8 pb-6">
      {!backendOnline && !isDemoMode && (
        <p role="alert" className="flex items-center gap-2 rounded-md bg-warn/10 px-3 py-2 text-sm text-warn"><CloudOff className="h-4 w-4" /> Backend unreachable. Showing the findings last loaded.</p>
      )}

      {/* Greeting */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-fgSubtle">{greeting()}{first ? `, ${first}` : ''}</p>
          <h2 className="mt-1 text-[1.65rem] font-semibold leading-tight tracking-tight">
            {candidates.length === 0
              ? `Nothing to review for ${brandProfile.brandName}`
              : waiting === 0
              ? 'Everything has been reviewed'
              : <>{waiting} {waiting === 1 ? 'finding is' : 'findings are'} waiting for a decision</>}
          </h2>
        </div>
        <button onClick={() => setActiveTab('lookalike-engine')} className="group inline-flex items-center gap-1.5 rounded-md bg-accent px-3.5 py-2 text-sm font-medium text-onAccent transition-colors hover:bg-accentHover">
          Check a domain <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </button>
      </header>

      {/* Hero: exposure ring and the three numbers that matter */}
      <section
        aria-label="Exposure"
        className="relative overflow-hidden rounded-xl border border-line bg-surface p-6 sm:p-8"
        style={{ backgroundImage: 'radial-gradient(110% 120% at 0% 0%, rgb(var(--c-accent) / 0.09), transparent 55%)' }}
      >
        <div className="flex flex-col items-center gap-8 sm:flex-row sm:gap-12">
          <Donut
            parts={bySev.map((s) => ({ label: s.label, value: s.value, color: s.color }))}
            centre={<span className="text-5xl font-semibold tabular-nums tracking-tight"><CountUp value={String(open.length)} /></span>}
            caption="open findings"
          />
          <div className="w-full flex-1">
            <ul className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              {bySev.map((s) => (
                <li key={s.label} className="flex items-center gap-2 text-fgMuted">
                  <span className={`h-2 w-2 rounded-full ${s.bar}`} aria-hidden />
                  {s.label}
                  <span className="ml-auto tabular-nums text-fg">{s.value}</span>
                </li>
              ))}
            </ul>

            <dl className="mt-6 grid grid-cols-3 divide-x divide-line border-t border-line pt-5">
              {[
                ['Critical or high', urgent, urgent > 0 ? 'text-danger' : ''],
                ['Investigating', byStage[1].n, ''],
                ['Verified assets', verifiedAssets, ''],
              ].map(([label, value, tone], i) => (
                <div key={label as string} className={i === 0 ? 'pr-4' : 'px-4'}>
                  <dd className={`text-3xl font-semibold tabular-nums ${tone}`}><CountUp value={String(value)} /></dd>
                  <dt className="mt-0.5 text-xs text-fgSubtle">{label}</dt>
                </div>
              ))}
            </dl>
          </div>
        </div>

        {/* Pipeline: where every finding currently stands */}
        {candidates.length > 0 && (
          <div className="mt-7 border-t border-line pt-5">
            <div className="flex items-baseline justify-between text-xs text-fgSubtle">
              <span>Review pipeline</span>
              <span>{reviewed} of {candidates.length} reviewed</span>
            </div>
            <div className="mt-2 flex h-1.5 gap-0.5 overflow-hidden rounded-full" role="img" aria-label={byStage.map((s) => `${s.label} ${s.n}`).join(', ')}>
              {byStage.filter((s) => s.n).map((s) => <div key={s.key} className={`${s.bar} sk-grow-x`} style={{ flex: s.n }} />)}
            </div>
            <ul className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1 text-xs text-fgMuted">
              {byStage.map((s) => <li key={s.key} className="flex items-center gap-1.5"><span className={`h-1.5 w-1.5 rounded-full ${s.bar}`} aria-hidden />{s.label} <span className="tabular-nums text-fg">{s.n}</span></li>)}
            </ul>
          </div>
        )}
      </section>

      {/* Needs attention */}
      <section aria-labelledby="queue-h">
        <div className="flex items-baseline justify-between">
          <h3 id="queue-h" className="text-sm font-medium">Needs attention</h3>
          {queue.length > 0 && <button onClick={() => setActiveTab('investigation-center')} className="text-xs text-accent hover:underline">All investigations</button>}
        </div>
        {queue.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-fgMuted">
            {candidates.length === 0 ? 'Findings appear here after you check a suspected domain, profile or app. Checks run on demand; this is not continuous monitoring.' : 'Nothing is waiting. Every open finding has been reviewed.'}
          </p>
        ) : (
          <ul className="mt-3 overflow-hidden rounded-xl border border-line bg-surface">
            {queue.map(({ c, link }: { c: CandidateAsset; link?: { n: number; first?: string } }, i) => {
              const sev = SEV.find((s) => s.key === c.riskCategory)!;
              return (
                <li key={c.id} className={i ? 'border-t border-line/70' : ''}>
                  <button onClick={() => setSelectedCandidateId(c.id)} className="group relative flex w-full items-center gap-4 py-3.5 pl-5 pr-4 text-left transition-colors hover:bg-surface2">
                    <span className={`absolute inset-y-2 left-0 w-[3px] rounded-r-full ${sev.bar}`} aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium" title={c.title}>{c.title}</span>
                      <span className={`mt-0.5 block truncate text-xs ${link ? 'text-accent' : 'font-mono text-fgSubtle'}`}>
                        {link ? `Connected: ${link.first}` : c.identifier}
                      </span>
                    </span>
                    <span className={`shrink-0 text-xs font-medium ${sev.text}`}>{c.riskCategory}</span>
                    <span className="hidden w-20 shrink-0 whitespace-nowrap text-right text-xs text-fgSubtle sm:block">{c.status === 'Investigating' ? 'In progress' : 'New'}</span>
                    <span className="w-6 shrink-0 text-right text-xs tabular-nums text-fgSubtle">{ago(c.createdDate)}</span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-fgSubtle transition-transform group-hover:translate-x-0.5 group-hover:text-fg" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <p className="text-xs text-fgSubtle">Counted from the findings loaded for this brand. Severity comes from rule-based analysis; model output is supporting evidence only.</p>
    </div>
  );
};

export default OverviewDashboard;
