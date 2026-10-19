import React, { useMemo, useState } from 'react';
import { ArrowRight, Network, ZoomIn, ZoomOut } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { deriveThreatGraph, type GraphEdge, type GraphNode } from '../utils/threatGraph';
import { RiskBadge } from '../components/RiskBadge';
import { StatusBadge } from '../components/StatusBadge';

const W = 800;
const H = 520;
const CX = W / 2;
const CY = H / 2;
const RING: Record<string, number> = { Critical: 120, High: 165, Medium: 205, Low: 235 };
const RANK: Record<string, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 };
const FILL: Record<string, string> = { Critical: 'fill-danger', High: 'fill-high', Medium: 'fill-warn', Low: 'fill-ok' };

const Basis: React.FC<{ basis: GraphEdge['basis']; strength?: number }> = ({ basis, strength }) => (
  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${basis === 'observed' ? 'bg-accent/15 text-accent' : 'bg-surface3 text-fgMuted'}`}>
    {basis === 'observed' ? 'Observed' : `Inferred${strength !== undefined ? ` ${Math.round(strength * 100)}%` : ''}`}
  </span>
);

export const ThreatGraphView: React.FC = () => {
  const { candidates, brandProfile, setSelectedCandidateId, setActiveTab } = useApp();

  const [showInferred, setShowInferred] = useState(true);
  const [includeDismissed, setIncludeDismissed] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [selected, setSelected] = useState<string>('brand');

  const { nodes, edges } = useMemo(
    () => deriveThreatGraph(candidates, brandProfile.brandName, { includeDismissed }),
    [candidates, brandProfile.brandName, includeDismissed],
  );
  const shownEdges = edges.filter((e) => showInferred || e.basis === 'observed');
  const linkEdges = shownEdges.filter((e) => e.kind !== 'TARGETS_BRAND').sort((a, b) => (a.basis === b.basis ? 0 : a.basis === 'observed' ? -1 : 1));

  // Deterministic layout: the brand at the centre, findings on rings by severity, spread evenly by angle.
  const positions = useMemo(() => {
    const findings = nodes.filter((n) => n.kind === 'finding').sort((a, b) => (RANK[b.risk || 'Low'] - RANK[a.risk || 'Low']) || a.id.localeCompare(b.id));
    const pos: Record<string, { x: number; y: number }> = { brand: { x: CX, y: CY } };
    findings.forEach((n, i) => {
      const angle = (2 * Math.PI * i) / Math.max(findings.length, 1) - Math.PI / 2;
      const r = RING[n.risk || 'Low'] ?? 220;
      pos[n.id] = { x: CX + r * Math.cos(angle), y: CY + r * Math.sin(angle) };
    });
    return pos;
  }, [nodes]);

  const focus = useMemo(() => {
    const near = new Set<string>([selected]);
    if (selected !== 'brand') shownEdges.filter((e) => e.kind !== 'TARGETS_BRAND' && (e.source === selected || e.target === selected)).forEach((e) => { near.add(e.source); near.add(e.target); });
    return near;
  }, [selected, shownEdges]);
  const dim = (id: string) => (selected === 'brand' || focus.has(id) || id === 'brand' ? 1 : 0.25);
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const sel = byId.get(selected) || byId.get('brand')!;
  const selEdges = shownEdges.filter((e) => e.kind !== 'TARGETS_BRAND' && (e.source === sel.id || e.target === sel.id));
  const nameOf = (id: string) => byId.get(id)?.label || id;

  if (candidates.length === 0) {
    return (
      <div className="mx-auto max-w-md rounded-lg border border-line bg-surface p-8 text-center">
        <Network className="mx-auto h-8 w-8 text-accent" />
        <h2 className="mt-3 text-lg font-semibold">Nothing to connect yet</h2>
        <p className="mt-1 text-sm text-fgMuted">The graph is built from your findings. Assess a suspected asset to create the first one.</p>
        <button onClick={() => setActiveTab('lookalike-engine')} className="mt-5 inline-flex items-center gap-2 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-onAccent hover:bg-accentHover">
          Assess a domain <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    );
  }

  const observedCount = linkEdges.filter((e) => e.basis === 'observed').length;
  const inferredCount = linkEdges.length - observedCount;

  return (
    <div className="space-y-5">
      <p className="max-w-3xl text-sm text-fgMuted">
        Built from the findings loaded for <span className="text-fg">{brandProfile.brandName}</span>. A link is drawn only when the data supports it, and every
        link says why. <span className="text-fg">Observed</span> links come from the finding data. <span className="text-fg">Inferred</span> links are guesses
        and are dashed.
      </p>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        <label className="flex items-center gap-2 text-fgMuted">
          <input type="checkbox" checked={showInferred} onChange={(e) => setShowInferred(e.target.checked)} className="h-4 w-4 accent-[rgb(var(--c-accent))]" />
          Show inferred links
        </label>
        <label className="flex items-center gap-2 text-fgMuted">
          <input type="checkbox" checked={includeDismissed} onChange={(e) => setIncludeDismissed(e.target.checked)} className="h-4 w-4 accent-[rgb(var(--c-accent))]" />
          Include dismissed findings
        </label>
        <span className="text-fgSubtle">{nodes.length - 1} findings · {observedCount} observed · {inferredCount} inferred links between findings</span>
        <span className="ml-auto flex items-center gap-1">
          <button onClick={() => setZoom((z) => Math.max(0.6, +(z - 0.2).toFixed(1)))} aria-label="Zoom out" className="rounded-md border border-line p-1.5 text-fgMuted hover:bg-surface3"><ZoomOut className="h-4 w-4" /></button>
          <button onClick={() => setZoom(1)} className="rounded-md border border-line px-2 py-1 text-xs text-fgMuted hover:bg-surface3" aria-label="Reset zoom">{Math.round(zoom * 100)}%</button>
          <button onClick={() => setZoom((z) => Math.min(2, +(z + 0.2).toFixed(1)))} aria-label="Zoom in" className="rounded-md border border-line p-1.5 text-fgMuted hover:bg-surface3"><ZoomIn className="h-4 w-4" /></button>
        </span>
      </div>

      <ul className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-fgMuted" aria-label="Legend">
        <li className="flex items-center gap-1.5"><svg width="22" height="6" aria-hidden><line x1="0" y1="3" x2="22" y2="3" className="stroke-accent" strokeWidth="2" /></svg> Observed link</li>
        <li className="flex items-center gap-1.5"><svg width="22" height="6" aria-hidden><line x1="0" y1="3" x2="22" y2="3" className="stroke-fgSubtle" strokeWidth="2" strokeDasharray="4 3" /></svg> Inferred link</li>
        {(['Critical', 'High', 'Medium', 'Low'] as const).map((k) => (<li key={k} className="flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${k === 'Critical' ? 'bg-danger' : k === 'High' ? 'bg-high' : k === 'Medium' ? 'bg-warn' : 'bg-ok'}`} aria-hidden />{k}</li>))}
        <li className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-accent" aria-hidden />Brand</li>
      </ul>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="overflow-auto rounded-lg border border-line bg-surface lg:col-span-2" style={{ maxHeight: 560 }}>
          <svg
            width={W * zoom}
            height={H * zoom}
            viewBox={`0 0 ${W} ${H}`}
            role="group"
            aria-label="Relationship graph. Use the relationships table below for a text version."
            className="block"
          >
            {shownEdges.map((e) => {
              const a = positions[e.source];
              const b = positions[e.target];
              if (!a || !b) return null;
              const isBrand = e.kind === 'TARGETS_BRAND';
              const hot = selected === e.source || selected === e.target;
              return (
                <g key={e.id}>
                  {isBrand ? (
                    <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="stroke-line" strokeWidth={1} opacity={0.5 * dim(e.target)} />
                  ) : (
                    // Curved so a link between findings never runs through the brand node in the middle.
                    <path
                      d={`M ${a.x} ${a.y} Q ${(a.x + b.x) / 2 - (b.y - a.y) * 0.3} ${(a.y + b.y) / 2 + (b.x - a.x) * 0.3} ${b.x} ${b.y}`}
                      fill="none"
                      className={e.basis === 'observed' ? 'stroke-accent' : 'stroke-fgSubtle'}
                      strokeWidth={hot ? 3 : 2}
                      strokeDasharray={e.basis === 'inferred' ? '6 5' : undefined}
                      opacity={selected === 'brand' || hot ? 1 : 0.2}
                    />
                  )}
                </g>
              );
            })}
            {nodes.map((n: GraphNode) => {
              const p = positions[n.id];
              if (!p) return null;
              const isBrand = n.kind === 'brand';
              const active = n.id === selected;
              return (
                <g
                  key={n.id}
                  transform={`translate(${p.x} ${p.y})`}
                  tabIndex={0}
                  role="button"
                  aria-label={`${isBrand ? 'Brand' : 'Finding'} ${n.label}`}
                  aria-pressed={active}
                  onClick={() => setSelected(n.id)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelected(n.id); } }}
                  className="cursor-pointer outline-none"
                  opacity={dim(n.id)}
                >
                  <circle r={isBrand ? 20 : 11} className={isBrand ? 'fill-accent' : FILL[n.risk || 'Low']} stroke="currentColor" strokeWidth={active ? 3 : 0} style={{ color: 'rgb(var(--c-fg))' }} />
                  <text y={isBrand ? 36 : 25} textAnchor="middle" className="fill-fgMuted" fontSize={11}>
                    {n.label.length > 22 ? `${n.label.slice(0, 20)}…` : n.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <aside className="space-y-4 rounded-lg border border-line bg-surface p-5" aria-live="polite">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-fgSubtle">{sel.kind === 'brand' ? 'Brand' : 'Selected finding'}</p>
            <p className="mt-1 break-words text-base font-medium">{sel.label}</p>
            {sel.sub && <p className="break-all font-mono text-xs text-fgMuted">{sel.sub}</p>}
          </div>
          {sel.kind === 'finding' ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                {sel.risk && <RiskBadge level={sel.risk} size="sm" />}
                {sel.status && <StatusBadge status={sel.status} size="sm" />}
                <span className="text-xs capitalize text-fgSubtle">{sel.type}</span>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-fgSubtle">Links to other findings</p>
                {selEdges.length === 0 ? (
                  <p className="mt-1.5 text-sm text-fgMuted">None found. It is linked only to the brand it was recorded against.</p>
                ) : (
                  <ul className="mt-2 space-y-3">
                    {selEdges.map((e) => (
                      <li key={e.id} className="text-sm">
                        <div className="flex flex-wrap items-center gap-2">
                          <Basis basis={e.basis} strength={e.strength} />
                          <span className="text-fg">{e.label}</span>
                        </div>
                        <p className="mt-1 text-fgMuted">with {nameOf(e.source === sel.id ? e.target : e.source)}</p>
                        <p className="mt-0.5 text-xs text-fgSubtle">{e.evidence}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <button onClick={() => sel.candidateId && setSelectedCandidateId(sel.candidateId)} className="rounded-md border border-line px-3 py-1 text-[13px] hover:bg-surface3">
                Open finding
              </button>
            </>
          ) : (
            <p className="text-sm text-fgMuted">Select a finding to see why it is linked to others.</p>
          )}
        </aside>
      </div>

      <section className="rounded-lg border border-line bg-surface">
        <h2 className="px-5 pt-4 text-sm font-semibold">Relationships between findings</h2>
        {linkEdges.length === 0 ? (
          <p className="px-5 pb-5 pt-2 text-sm text-fgMuted">None. Findings are linked only when their evidence supports it (shared developer or host, or an explicit reference).</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="mt-2 w-full min-w-[36rem] text-left text-sm">
              <thead className="border-y border-line bg-surface2 text-xs text-fgMuted">
                <tr><th className="px-5 py-2 font-medium">Basis</th><th className="px-3 py-2 font-medium">Relationship</th><th className="px-3 py-2 font-medium">Between</th><th className="px-3 py-2 font-medium">Why</th></tr>
              </thead>
              <tbody className="divide-y divide-line align-top">
                {linkEdges.map((e) => (
                  <tr key={e.id}>
                    <td className="px-5 py-2.5"><Basis basis={e.basis} strength={e.strength} /></td>
                    <td className="px-3 py-2.5 text-fg">{e.label}</td>
                    <td className="px-3 py-2.5 text-fgMuted">{nameOf(e.source)} ↔ {nameOf(e.target)}</td>
                    <td className="px-3 py-2.5 text-xs text-fgSubtle">{e.evidence}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="text-xs text-fgSubtle">
        Links are recomputed from the current findings each time and are not stored. The “recorded against brand” links are shown faintly because every finding has one.
        An inferred link is a lead for an analyst to check, not evidence.
      </p>
    </div>
  );
};

export default ThreatGraphView;
