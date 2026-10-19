import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Check, Copy, ExternalLink, FolderSearch, Search } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { bySeverityThenNewest } from '../components/FindingsTable';
import { deriveThreatGraph, type GraphEdge } from '../utils/threatGraph';
import type { CandidateAsset, InvestigationStatus, RiskLevel } from '../types';

const STATUSES: InvestigationStatus[] = ['New', 'Investigating', 'Confirmed Suspicious', 'Dismissed'];
const BAR: Record<RiskLevel, string> = { Critical: 'bg-danger', High: 'bg-high', Medium: 'bg-warn', Low: 'bg-ok' };
const TEXT: Record<RiskLevel, string> = { Critical: 'text-danger', High: 'text-high', Medium: 'text-warn', Low: 'text-ok' };
const TABS = ['Overview', 'Evidence', 'Activity', 'Related'] as const;
type Tab = (typeof TABS)[number];

const time = (iso: string) => { const t = Date.parse(iso); return Number.isNaN(t) ? 0 : t; };
const ago = (iso: string) => {
  const m = Math.max(0, (Date.now() - time(iso)) / 60000);
  if (!time(iso)) return '—';
  if (m < 60) return `${Math.max(1, Math.round(m))}m`;
  if (m < 1440) return `${Math.round(m / 60)}h`;
  return `${Math.round(m / 1440)}d`;
};
const full = (iso: string) => (time(iso) ? new Date(time(iso)).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'unknown time');

const Section: React.FC<{ title: string; items?: string[]; empty: string; limit?: number }> = ({ title, items, empty, limit = 4 }) => {
  const [all, setAll] = useState(false);
  const list = items || [];
  const shown = all ? list : list.slice(0, limit);
  return (
    <section>
      <h3 className="text-xs font-medium text-fgSubtle">{title}</h3>
      {list.length === 0 ? (
        <p className="mt-1 text-sm text-fgSubtle">{empty}</p>
      ) : (
        <>
          <ul className="mt-1.5 space-y-1 text-sm text-fgMuted">
            {shown.map((x, i) => <li key={i} className="flex gap-2"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-fgSubtle" />{x}</li>)}
          </ul>
          {list.length > limit && (
            <button onClick={() => setAll(!all)} className="mt-1 text-xs text-accent hover:underline">{all ? 'Show less' : `Show all ${list.length}`}</button>
          )}
        </>
      )}
    </section>
  );
};

export const InvestigationCenterView: React.FC = () => {
  const {
    candidates, brandProfile, updateCandidateStatus, addAnalystNote, setSelectedCandidateId, deleteCandidate,
    focusedFindingId, setFocusedFindingId, isDemoMode, setActiveTab,
  } = useApp();

  const [status, setStatus] = useState<'all' | InvestigationStatus>('all');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('Overview');
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'ok' | 'warn' | 'error'; text: string } | null>(null);
  const [note, setNote] = useState('');
  const [copied, setCopied] = useState(false);
  const [confirmHide, setConfirmHide] = useState(false);
  const listRef = useRef<HTMLUListElement>(null);

  const graph = useMemo(() => deriveThreatGraph(candidates, brandProfile.brandName, { includeDismissed: true }), [candidates, brandProfile.brandName]);
  const linkCount = useMemo(() => {
    const n: Record<string, number> = {};
    graph.edges.filter((e) => e.basis === 'observed' && e.kind !== 'TARGETS_BRAND').forEach((e) => {
      [e.source, e.target].forEach((id) => { n[id] = (n[id] || 0) + 1; });
    });
    return n;
  }, [graph]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: candidates.length };
    STATUSES.forEach((s) => (c[s] = candidates.filter((x) => x.status === s).length));
    return c;
  }, [candidates]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return candidates
      .filter((c) => (status === 'all' || c.status === status) && (!q || [c.title, c.identifier, c.platform].some((f) => (f || '').toLowerCase().includes(q))))
      .sort(bySeverityThenNewest);
  }, [candidates, status, query]);

  // A finding opened from elsewhere (queue, table, graph, palette) arrives here.
  useEffect(() => {
    if (focusedFindingId) {
      setSelected(focusedFindingId);
      setStatus('all');
      setQuery('');
      setTab('Overview');
      setFocusedFindingId(null);
    }
  }, [focusedFindingId, setFocusedFindingId]);

  // Default to the most urgent finding on desktop; keep the selection valid as filters change.
  const current: CandidateAsset | undefined = candidates.find((c) => c.id === selected);
  useEffect(() => {
    if (!selected && rows.length && window.matchMedia('(min-width: 1024px)').matches) setSelected(rows[0].id);
  }, [selected, rows]);
  useEffect(() => { setNotice(null); setNote(''); setConfirmHide(false); }, [selected]);

  const move = (delta: number) => {
    const i = rows.findIndex((r) => r.id === selected);
    const next = rows[Math.min(rows.length - 1, Math.max(0, (i < 0 ? -1 : i) + delta))];
    if (next) { setSelected(next.id); setTab('Overview'); }
  };
  const onListKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'j') { e.preventDefault(); move(1); }
    else if (e.key === 'ArrowUp' || e.key === 'k') { e.preventDefault(); move(-1); }
  };

  const changeStatus = async (c: CandidateAsset, next: InvestigationStatus) => {
    setPending(true);
    setNotice(null);
    const res = await updateCandidateStatus(c.id, next, '', `Status set to ${next} from Investigations.`);
    setPending(false);
    setNotice(!res.ok ? { tone: 'error', text: `Status not changed: ${res.message}` } : !res.saved ? { tone: 'warn', text: res.message || 'Changed in this session only.' } : { tone: 'ok', text: 'Status saved.' });
  };

  const related = useMemo<{ edge: GraphEdge; other?: CandidateAsset }[]>(() => {
    if (!current) return [];
    const nid = `f:${current.id}`;
    return graph.edges
      .filter((e) => e.kind !== 'TARGETS_BRAND' && (e.source === nid || e.target === nid))
      .map((edge) => ({ edge, other: candidates.find((c) => `f:${c.id}` === (edge.source === nid ? edge.target : edge.source)) }));
  }, [graph, current, candidates]);

  if (candidates.length === 0) {
    return (
      <div className="mx-auto max-w-sm py-16 text-center">
        <FolderSearch className="mx-auto h-6 w-6 text-fgSubtle" />
        <h2 className="mt-3 text-sm font-medium">No investigations yet</h2>
        <p className="mt-1 text-sm text-fgMuted">Findings appear here after you check a suspected domain, profile or app.</p>
        <button onClick={() => setActiveTab('lookalike-engine')} className="mt-4 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-onAccent hover:bg-accentHover">Check a domain</button>
      </div>
    );
  }

  const activity = current
    ? [
        ...current.statusHistory.map((h) => ({ at: h.timestamp, kind: 'status' as const, who: h.analyst, text: `${h.from} → ${h.to}${h.note ? `: ${h.note}` : ''}` })),
        ...current.analystNotes.map((n) => ({ at: n.timestamp, kind: 'note' as const, who: n.author, text: n.text })),
      ].sort((a, b) => time(b.at) - time(a.at))
    : [];

  return (
    <div className="-m-4 grid min-h-[calc(100vh-4.5rem)] sm:-m-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
      {/* Issue list */}
      <div className={`${current ? 'hidden lg:flex' : 'flex'} flex-col border-line lg:border-r`}>
        <div className="space-y-2 border-b border-line p-3">
          <label className="relative block">
            <span className="sr-only">Search investigations</span>
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fgSubtle" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" className="w-full rounded-md border border-line bg-surface2 py-1.5 pl-8 pr-2 text-[13px] placeholder:text-fgSubtle focus:border-accent" />
          </label>
          <div role="tablist" aria-label="Filter by status" className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
            {(['all', ...STATUSES] as const).map((s) => (
              <button key={s} role="tab" aria-selected={status === s} onClick={() => setStatus(s)} className={status === s ? 'font-medium text-fg' : 'text-fgSubtle hover:text-fgMuted'}>
                {s === 'all' ? 'All' : s === 'Confirmed Suspicious' ? 'Confirmed' : s} <span className="tabular-nums">{counts[s]}</span>
              </button>
            ))}
          </div>
        </div>
        <ul ref={listRef} role="listbox" aria-label="Findings" tabIndex={0} onKeyDown={onListKey} className="flex-1 overflow-y-auto focus:outline-none">
          {rows.length === 0 && <li className="px-4 py-8 text-center text-sm text-fgMuted">No matches. <button onClick={() => { setStatus('all'); setQuery(''); }} className="text-accent hover:underline">Clear</button></li>}
          {rows.map((c) => {
            const active = c.id === selected;
            const links = linkCount[`f:${c.id}`];
            return (
              <li key={c.id} role="option" aria-selected={active}>
                <button onClick={() => { setSelected(c.id); setTab('Overview'); }} className={`relative flex w-full flex-col gap-0.5 border-b border-line/60 py-2.5 pl-4 pr-3 text-left ${active ? 'bg-surface3' : 'hover:bg-surface2'}`}>
                  <span className={`absolute inset-y-0 left-0 w-[3px] ${BAR[c.riskCategory]} ${active ? '' : 'opacity-70'}`} aria-hidden />
                  <span className="truncate text-[13px] font-medium text-fg" title={c.title}>{c.title}</span>
                  <span className="truncate font-mono text-[11px] text-fgSubtle" title={c.identifier}>{c.identifier}</span>
                  <span className="mt-0.5 flex items-center gap-2 text-[11px] text-fgSubtle">
                    <span className={TEXT[c.riskCategory]}>{c.riskCategory}</span>
                    <span>{c.status === 'Confirmed Suspicious' ? 'Confirmed' : c.status}</span>
                    <span className="capitalize">{c.type}</span>
                    {links ? <span className="text-accent">{links} linked</span> : null}
                    <span className="ml-auto tabular-nums">{ago(c.createdDate)}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Detail panel */}
      <div className={`${current ? 'block' : 'hidden lg:block'} min-w-0 overflow-y-auto`}>
        {!current ? (
          <p className="p-10 text-center text-sm text-fgSubtle">Select a finding to see its evidence and history.</p>
        ) : (
          <article className="mx-auto max-w-3xl p-4 sm:p-6">
            <button onClick={() => setSelected(null)} className="mb-3 inline-flex items-center gap-1 text-xs text-fgMuted hover:text-fg lg:hidden"><ArrowLeft className="h-3 w-3" /> All findings</button>

            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="break-words text-lg font-semibold leading-snug">{current.title}</h2>
                <p className="mt-0.5 flex items-center gap-1.5 break-all font-mono text-xs text-fgMuted">
                  {current.identifier}
                  <button
                    onClick={() => { navigator.clipboard?.writeText(current.identifier).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(() => undefined); }}
                    aria-label="Copy identifier" className="rounded p-0.5 text-fgSubtle hover:text-fg"
                  >
                    {copied ? <Check className="h-3 w-3 text-ok" /> : <Copy className="h-3 w-3" />}
                  </button>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  aria-label="Status" value={current.status} disabled={pending}
                  onChange={(e) => changeStatus(current, e.target.value as InvestigationStatus)}
                  className="rounded-md border border-line bg-surface2 px-2 py-1 text-[13px] focus:border-accent disabled:opacity-50"
                >
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <button onClick={() => setSelectedCandidateId(current.id)} className="rounded-md border border-line px-2.5 py-1 text-[13px] text-fgMuted hover:bg-surface3 hover:text-fg" title="Full dossier with the AI explanation assistant">
                  Full dossier
                </button>
              </div>
            </div>

            {notice && (
              <p role={notice.tone === 'error' ? 'alert' : 'status'} className={`mt-3 rounded-md px-3 py-1.5 text-xs ${notice.tone === 'ok' ? 'bg-ok/10 text-ok' : notice.tone === 'warn' ? 'bg-warn/10 text-warn' : 'bg-danger/10 text-danger'}`}>{notice.text}</p>
            )}

            {/* Key facts */}
            <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 border-y border-line py-3 text-[13px] sm:grid-cols-4">
              {[
                ['Severity', <span key="s" className={`font-medium ${TEXT[current.riskCategory]}`}>{current.riskCategory}</span>],
                ['Type', <span key="t" className="capitalize">{current.type}</span>],
                ['First seen', full(current.createdDate)],
                ['Assessed by', current.analysisEngine || 'Rules engine'],
              ].map(([k, v]) => (
                <div key={k as string}><dt className="text-[11px] text-fgSubtle">{k}</dt><dd className="mt-0.5 truncate text-fg" title={typeof v === 'string' ? v : undefined}>{v}</dd></div>
              ))}
            </dl>

            <div role="tablist" aria-label="Finding sections" className="mt-4 flex gap-4 border-b border-line text-[13px]">
              {TABS.map((t) => (
                <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`-mb-px border-b-2 pb-2 ${tab === t ? 'border-accent font-medium text-fg' : 'border-transparent text-fgMuted hover:text-fg'}`}>
                  {t}{t === 'Related' && related.length ? <span className="ml-1 tabular-nums text-fgSubtle">{related.length}</span> : null}
                </button>
              ))}
            </div>

            <div className="mt-4 space-y-5">
              {tab === 'Overview' && (
                <>
                  <section>
                    <h3 className="text-xs font-medium text-fgSubtle">Assessment</h3>
                    <p className="mt-1 text-sm text-fgMuted">{current.summary || 'No summary recorded.'}</p>
                  </section>
                  <Section title="Why it was flagged" items={current.evidenceSupporting} empty="No supporting evidence recorded." />
                  <Section title="Evidence against" items={current.evidenceAgainst} empty="None recorded." />
                  <Section title="Not established" items={current.missingInformation} empty="Nothing flagged as missing." />
                  <Section title="Suggested next steps" items={current.recommendedNextSteps} empty="No next steps recorded." />
                </>
              )}

              {tab === 'Evidence' && (
                <>
                  {current.url && (
                    <section>
                      <h3 className="text-xs font-medium text-fgSubtle">Source</h3>
                      <a href={current.url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex max-w-full items-center gap-1 break-all font-mono text-xs text-accent hover:underline">
                        {current.url} <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                      <p className="mt-1 text-xs text-fgSubtle">Opens the live page. It may be malicious; SURAKSHA never fetches it for you.</p>
                    </section>
                  )}
                  <section>
                    <h3 className="text-xs font-medium text-fgSubtle">Recorded evidence</h3>
                    <p className="mt-1 whitespace-pre-wrap break-words text-sm text-fgMuted">{current.evidence || 'No evidence text recorded.'}</p>
                  </section>
                  {current.stringSignals && current.stringSignals.length > 0 && (
                    <section>
                      <h3 className="text-xs font-medium text-fgSubtle">Signals</h3>
                      <ul className="mt-1.5 divide-y divide-line rounded-md border border-line text-sm">
                        {current.stringSignals.map((s, i) => (
                          <li key={i} className="flex flex-wrap items-baseline gap-x-3 px-3 py-2"><span className="font-medium text-fg">{s.type}</span><span className="text-fgMuted">{s.detail}</span><span className="ml-auto text-xs capitalize text-fgSubtle">{s.severity}</span></li>
                        ))}
                      </ul>
                    </section>
                  )}
                </>
              )}

              {tab === 'Activity' && (
                <>
                  <form
                    onSubmit={(e) => { e.preventDefault(); if (note.trim()) { addAnalystNote(current.id, '', note.trim()); setNote(''); } }}
                    className="space-y-2"
                  >
                    <label className="block text-xs font-medium text-fgSubtle" htmlFor="note">Add a note</label>
                    <textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="What did you check, and what did you decide?" className="w-full rounded-md border border-line bg-surface2 px-3 py-2 text-sm placeholder:text-fgSubtle focus:border-accent" />
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs text-fgSubtle">{isDemoMode ? 'Demo data: notes stay in this session.' : 'Notes are kept in this browser session only; the server does not store them yet.'}</p>
                      <button type="submit" disabled={!note.trim()} className="rounded-md bg-accent px-3 py-1 text-[13px] font-medium text-onAccent hover:bg-accentHover disabled:opacity-40">Add note</button>
                    </div>
                  </form>
                  <ol className="space-y-3 border-l border-line pl-4">
                    {activity.length === 0 && <li className="text-sm text-fgSubtle">No activity recorded yet.</li>}
                    {activity.map((a, i) => (
                      <li key={i} className="relative text-sm">
                        <span className={`absolute -left-[1.3rem] top-1.5 h-1.5 w-1.5 rounded-full ${a.kind === 'note' ? 'bg-accent' : 'bg-fgSubtle'}`} aria-hidden />
                        <p className="text-fgMuted">{a.text}</p>
                        <p className="text-xs text-fgSubtle">{a.kind === 'note' ? 'Note' : 'Status'} · {a.who} · {full(a.at)}</p>
                      </li>
                    ))}
                  </ol>
                </>
              )}

              {tab === 'Related' && (
                <>
                  {related.length === 0 ? (
                    <p className="text-sm text-fgMuted">No links to other findings. It is connected only to the brand it was recorded against.</p>
                  ) : (
                    <ul className="divide-y divide-line rounded-md border border-line">
                      {related.map(({ edge, other }) => (
                        <li key={edge.id} className="px-3 py-2.5 text-sm">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${edge.basis === 'observed' ? 'bg-accent/15 text-accent' : 'bg-surface3 text-fgMuted'}`}>
                              {edge.basis === 'observed' ? 'Observed' : `Inferred ${Math.round((edge.strength || 0) * 100)}%`}
                            </span>
                            <span className="text-fg">{edge.label}</span>
                            {other && <button onClick={() => { setSelected(other.id); setTab('Overview'); }} className="ml-auto max-w-[50%] truncate text-xs text-accent hover:underline" title={other.title}>{other.title}</button>}
                          </div>
                          <p className="mt-1 text-xs text-fgSubtle">{edge.evidence}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                  <button onClick={() => setActiveTab('threat-graph')} className="text-sm text-accent hover:underline">Open the threat graph</button>
                </>
              )}
            </div>

            <div className="mt-8 border-t border-line pt-3 text-xs text-fgSubtle">
              {confirmHide ? (
                <span className="flex items-center gap-2">
                  Hide this finding from the view? It is not deleted on the server.
                  <button onClick={() => { deleteCandidate(current.id); setSelected(null); setConfirmHide(false); }} className="text-danger hover:underline">Hide</button>
                  <button onClick={() => setConfirmHide(false)} className="hover:underline">Cancel</button>
                </span>
              ) : (
                <button onClick={() => setConfirmHide(true)} className="hover:text-fgMuted">Hide from this view</button>
              )}
            </div>
          </article>
        )}
      </div>
    </div>
  );
};

export default InvestigationCenterView;
