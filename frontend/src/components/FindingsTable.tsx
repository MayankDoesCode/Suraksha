import React from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Globe, Search, Share2, Smartphone, Server, X } from 'lucide-react';
import type { AssetType, CandidateAsset, InvestigationStatus, RiskLevel } from '../types';
import { matchesAsk, parseAsk, type AskResult } from '../utils/askFilter';
import { deriveThreatGraph } from '../utils/threatGraph';

export const SEVERITY_RANK: Record<RiskLevel, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 };
const SEVERITIES: RiskLevel[] = ['Critical', 'High', 'Medium', 'Low'];
const STATUSES: InvestigationStatus[] = ['New', 'Investigating', 'Confirmed Suspicious', 'Dismissed'];
const DOT: Record<RiskLevel, string> = { Critical: 'bg-danger', High: 'bg-high', Medium: 'bg-warn', Low: 'bg-ok' };
const TONE: Record<RiskLevel, string> = { Critical: 'text-danger', High: 'text-high', Medium: 'text-warn', Low: 'text-ok' };
const TYPES: AssetType[] = ['domain', 'social', 'app', 'infrastructure'];
const TYPE_LABEL: Record<AssetType, string> = { domain: 'Domain', social: 'Social', app: 'Mobile app', infrastructure: 'Infrastructure' };
const TYPE_ICON: Record<AssetType, React.ComponentType<{ className?: string }>> = {
  domain: Globe, social: Share2, app: Smartphone, infrastructure: Server,
};

type SortKey = 'severity' | 'title' | 'type' | 'status' | 'observed';
type SortDir = 'asc' | 'desc';

const time = (iso: string) => {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? 0 : t;
};
const formatDate = (iso: string) => {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? 'Unknown' : new Date(t).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

/** Default order: most severe first, newest first within a severity. */
export const bySeverityThenNewest = (a: CandidateAsset, b: CandidateAsset) =>
  SEVERITY_RANK[b.riskCategory] - SEVERITY_RANK[a.riskCategory] || time(b.createdDate) - time(a.createdDate);

interface FindingsTableProps {
  candidates: CandidateAsset[];
  onSelect: (id: string) => void;
  pageSize?: number;
  /** Called with the filtered+sorted rows whenever they change (used for "export what I see"). */
  onVisibleChange?: (rows: CandidateAsset[]) => void;
  emptyMessage?: React.ReactNode;
}

export const FindingsTable: React.FC<FindingsTableProps> = ({ candidates, onSelect, pageSize = 10, onVisibleChange, emptyMessage }) => {
  const [query, setQuery] = React.useState('');
  const [severity, setSeverity] = React.useState<'all' | RiskLevel>('all');
  const [status, setStatus] = React.useState<'all' | InvestigationStatus>('all');
  const [type, setType] = React.useState<'all' | AssetType>('all');
  const [sort, setSort] = React.useState<{ key: SortKey; dir: SortDir } | null>(null);
  const [page, setPage] = React.useState(1);
  const [askText, setAskText] = React.useState('');
  const [asked, setAsked] = React.useState<AskResult | null>(null);

  // Observed links per finding, so questions like "linked critical domains" can be answered.
  const linkCounts = React.useMemo(() => {
    const n: Record<string, number> = {};
    deriveThreatGraph(candidates, '', { includeDismissed: true }).edges
      .filter((e) => e.basis === 'observed' && e.kind !== 'TARGETS_BRAND')
      .forEach((e) => [e.source, e.target].forEach((id) => { n[id.replace(/^f:/, '')] = (n[id.replace(/^f:/, '')] || 0) + 1; }));
    return n;
  }, [candidates]);

  const rows = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = candidates.filter(
      (c) =>
        (severity === 'all' || c.riskCategory === severity) &&
        (status === 'all' || c.status === status) &&
        (type === 'all' || c.type === type) &&
        (!q || [c.title, c.identifier, c.url, c.summary, c.platform].some((f) => (f || '').toLowerCase().includes(q))) &&
        (!asked || matchesAsk(c, asked.filters, linkCounts[c.id] || 0)),
    );
    if (!sort) return [...filtered].sort(bySeverityThenNewest);
    const dir = sort.dir === 'asc' ? 1 : -1;
    const cmp: Record<SortKey, (a: CandidateAsset, b: CandidateAsset) => number> = {
      severity: (a, b) => SEVERITY_RANK[a.riskCategory] - SEVERITY_RANK[b.riskCategory],
      title: (a, b) => a.title.localeCompare(b.title),
      type: (a, b) => a.type.localeCompare(b.type),
      status: (a, b) => STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status),
      observed: (a, b) => time(a.createdDate) - time(b.createdDate),
    };
    return [...filtered].sort((a, b) => dir * cmp[sort.key](a, b) || bySeverityThenNewest(a, b));
  }, [candidates, query, severity, status, type, sort, asked, linkCounts]);

  React.useEffect(() => onVisibleChange?.(rows), [rows, onVisibleChange]);
  React.useEffect(() => setPage(1), [query, severity, status, type, sort, asked]);

  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(page, pages);
  const pageRows = rows.slice((current - 1) * pageSize, current * pageSize);
  const filtersActive = query !== '' || severity !== 'all' || status !== 'all' || type !== 'all' || asked !== null;
  const clear = () => { setQuery(''); setSeverity('all'); setStatus('all'); setType('all'); setAsked(null); setAskText(''); };
  const ask = (e: React.FormEvent) => {
    e.preventDefault();
    setAsked(askText.trim() ? parseAsk(askText) : null);
  };

  const toggleSort = (key: SortKey) =>
    setSort((s) => (!s || s.key !== key ? { key, dir: key === 'title' || key === 'type' ? 'asc' : 'desc' } : s.dir === 'desc' ? { key, dir: 'asc' } : null));

  const Th: React.FC<{ k: SortKey; children: React.ReactNode; className?: string }> = ({ k, children, className = '' }) => {
    const active = sort?.key === k;
    const Icon = !active ? ArrowUpDown : sort!.dir === 'asc' ? ArrowUp : ArrowDown;
    return (
      <th scope="col" aria-sort={active ? (sort!.dir === 'asc' ? 'ascending' : 'descending') : 'none'} className={`px-3 py-2 text-left font-medium ${className}`}>
        <button onClick={() => toggleSort(k)} className={`inline-flex items-center gap-1 rounded text-xs ${active ? 'text-fg' : 'text-fgMuted hover:text-fg'}`}>
          {children}
          <Icon className="h-3 w-3" aria-hidden />
        </button>
      </th>
    );
  };

  const select = 'rounded-md border border-line bg-surface2 py-1 pl-2 pr-6 text-[13px] text-fg hover:bg-surface3 focus:border-accent';

  return (
    <div className="space-y-3">
      <form onSubmit={ask} className="space-y-1.5">
        <div className="flex gap-2">
          <label className="relative flex-1">
            <span className="sr-only">Ask in plain English</span>
            <input
              value={askText}
              onChange={(e) => setAskText(e.target.value)}
              placeholder="Ask in plain English: critical domains from the last 7 days, linked and unreviewed"
              className="w-full rounded-md border border-line bg-surface2 px-3 py-1.5 text-[13px] placeholder:text-fgSubtle focus:border-accent"
            />
          </label>
          <button type="submit" className="rounded-md bg-accent px-3 py-1.5 text-[13px] font-medium text-onAccent hover:bg-accentHover">Ask</button>
        </div>
        {asked && (
          <p className="flex flex-wrap items-center gap-1.5 text-xs" role="status">
            <span className="text-fgSubtle">Understood as</span>
            {asked.chips.length === 0 && <span className="text-fgMuted">no filters (showing everything)</span>}
            {asked.chips.map((c) => <span key={c} className="rounded bg-accent/15 px-1.5 py-0.5 text-accent">{c}</span>)}
            {asked.ignored.length > 0 && <span className="text-fgSubtle">· not used: {asked.ignored.join(', ')}</span>}
            <button type="button" onClick={() => { setAsked(null); setAskText(''); }} className="text-fgSubtle hover:text-fg">clear</button>
          </p>
        )}
      </form>

      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-[12rem] flex-1">
          <span className="sr-only">Search findings</span>
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fgSubtle" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title, identifier, URL, summary"
            className="w-full rounded-md border border-line bg-surface2 py-1 pl-8 pr-3 text-[13px] placeholder:text-fgSubtle focus:border-accent"
          />
        </label>
        <select aria-label="Filter by severity" value={severity} onChange={(e) => setSeverity(e.target.value as typeof severity)} className={select}>
          <option value="all">All severities</option>
          {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className={select}>
          <option value="all">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select aria-label="Filter by asset type" value={type} onChange={(e) => setType(e.target.value as typeof type)} className={select}>
          <option value="all">All asset types</option>
          {TYPES.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
        </select>
        {filtersActive && (
          <button onClick={clear} className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-sm text-fgMuted hover:bg-surface3 hover:text-fg">
            <X className="h-3.5 w-3.5" /> Clear
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-md border border-line">
        <table className="w-full min-w-[40rem] text-sm">
          <thead className="border-b border-line bg-surface2 text-xs">
            <tr>
              <Th k="severity">Severity</Th>
              <Th k="title">Finding</Th>
              <Th k="type" className="hidden sm:table-cell">Type</Th>
              <Th k="status">Status</Th>
              <Th k="observed" className="hidden md:table-cell">Observed</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {pageRows.map((c) => {
              const Icon = TYPE_ICON[c.type] ?? Globe;
              return (
                <tr
                  key={c.id}
                  tabIndex={0}
                  onClick={() => onSelect(c.id)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(c.id); } }}
                  className="cursor-pointer hover:bg-surface2 focus-visible:bg-surface2"
                  aria-label={`Open finding ${c.title}`}
                >
                  <td className="whitespace-nowrap px-3 py-2"><span className={`inline-flex items-center gap-1.5 text-xs ${TONE[c.riskCategory]}`}><span className={`h-1.5 w-1.5 rounded-full ${DOT[c.riskCategory]}`} aria-hidden />{c.riskCategory}</span></td>
                  <td className="max-w-[22rem] px-3 py-2">
                    <p className="truncate font-medium text-fg" title={c.title}>{c.title}</p>
                    <p className="truncate font-mono text-xs text-fgMuted" title={c.identifier}>{c.identifier}</p>
                  </td>
                  <td className="hidden whitespace-nowrap px-3 py-2 text-fgMuted sm:table-cell">
                    <span className="inline-flex items-center gap-1.5"><Icon className="h-3.5 w-3.5" />{TYPE_LABEL[c.type] ?? c.type}</span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-fgMuted">{c.status === 'Confirmed Suspicious' ? 'Confirmed' : c.status}</td>
                  <td className="hidden whitespace-nowrap px-3 py-2 text-fgMuted md:table-cell">{formatDate(c.createdDate)}</td>
                </tr>
              );
            })}
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-10 text-center text-sm text-fgMuted">
                  {filtersActive ? (
                    <>No findings match these filters. <button onClick={clear} className="text-accent hover:underline">Clear filters</button></>
                  ) : (
                    emptyMessage ?? 'No findings yet.'
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-xs text-fgMuted" aria-live="polite">
        <span>
          {rows.length === 0 ? '0 findings' : `${(current - 1) * pageSize + 1}–${Math.min(current * pageSize, rows.length)} of ${rows.length}`}
          {filtersActive && ` (filtered from ${candidates.length})`}
          {!sort && rows.length > 1 && ' · sorted by severity, newest first'}
        </span>
        <div className="flex items-center gap-1">
          <button onClick={() => setPage(current - 1)} disabled={current <= 1} className="rounded-md border border-line p-1.5 hover:bg-surface3 disabled:opacity-40" aria-label="Previous page">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="px-2 tabular-nums">{current} / {pages}</span>
          <button onClick={() => setPage(current + 1)} disabled={current >= pages} className="rounded-md border border-line p-1.5 hover:bg-surface3 disabled:opacity-40" aria-label="Next page">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default FindingsTable;
