import React, { useMemo } from 'react';
import { FileDown, ShieldAlert, TrendingDown, TrendingUp } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { CandidateAsset } from '../types';

/**
 * Executive report for company leadership: exposure by channel and severity, what was acted on, the top open risks,
 * and the trend over the last weeks. Everything is computed from the cases in this workspace; nothing is estimated.
 * "Download PDF" opens a printable one-page report.
 */
const CHANNEL: Record<string, string> = { domain: 'Websites & domains', social: 'Social media', app: 'Mobile apps', infrastructure: 'Infrastructure' };
const SEV = ['Critical', 'High', 'Medium', 'Low'] as const;
const SEV_TONE: Record<string, string> = { Critical: 'bg-danger', High: 'bg-high', Medium: 'bg-warn', Low: 'bg-ok' };
const esc = (s: string) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

function weeksAgo(iso: string) {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? null : Math.floor((Date.now() - t) / (7 * 864e5));
}

function summarize(cases: CandidateAsset[]) {
  const open = cases.filter((c) => c.status === 'New' || c.status === 'Investigating');
  const confirmed = cases.filter((c) => c.status === 'Confirmed Suspicious');
  const dismissed = cases.filter((c) => c.status === 'Dismissed');
  const bySev = Object.fromEntries(SEV.map((s) => [s, cases.filter((c) => c.riskCategory === s).length])) as Record<string, number>;
  const byChannel = Object.entries(cases.reduce<Record<string, number>>((m, c) => ({ ...m, [c.type]: (m[c.type] || 0) + 1 }), {}))
    .sort((a, b) => b[1] - a[1]);
  const weeks = [3, 2, 1, 0].map((w) => ({ label: w === 0 ? 'This week' : `${w}w ago`, n: cases.filter((c) => weeksAgo(c.createdDate) === w).length }));
  const rank = (c: CandidateAsset) => SEV.indexOf(c.riskCategory as typeof SEV[number]);
  const top = [...open].sort((a, b) => rank(a) - rank(b)).slice(0, 5);
  const highOpen = open.filter((c) => c.riskCategory === 'Critical' || c.riskCategory === 'High').length;
  return { open, confirmed, dismissed, bySev, byChannel, weeks, top, highOpen };
}

export const ExecutiveReportView: React.FC = () => {
  const { candidates, brandProfile, setActiveTab, setSelectedCandidateId } = useApp() as any;
  const cases: CandidateAsset[] = candidates || [];
  const s = useMemo(() => summarize(cases), [cases]);
  const company = brandProfile?.brandName || 'Your company';
  const trendUp = s.weeks[3].n > s.weeks[2].n;
  const maxWeek = Math.max(1, ...s.weeks.map((w) => w.n));

  const recommendations = [
    s.highOpen > 0 && `Review the ${s.highOpen} open High/Critical case${s.highOpen === 1 ? '' : 's'} this week and approve takedowns where evidence is clear.`,
    !brandProfile?.logoUrl && 'Upload the official logo so copied logos are detected automatically.',
    (brandProfile?.officialSocialUrls?.length || 0) === 0 && 'Register official social pages so they are never mistaken for fakes.',
    s.byChannel[0] && `Most exposure is on ${CHANNEL[s.byChannel[0][0]] || s.byChannel[0][0]}: schedule a weekly sweep there.`,
    'Share this report monthly with leadership to track whether exposure is shrinking.',
  ].filter(Boolean) as string[];

  const pdf = () => {
    const when = new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
    const row = (c: CandidateAsset) => `<tr><td>${esc(c.title)}</td><td>${esc(CHANNEL[c.type] || c.type)}</td><td><b class="${esc(c.riskCategory)}">${esc(c.riskCategory)}</b></td><td>${esc(c.status)}</td></tr>`;
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(company)} brand protection report ${esc(when)}</title><style>
      body{font:13px/1.5 system-ui,Segoe UI,Arial;color:#0f172a;margin:36px} h1{margin:0;font-size:24px} h2{font-size:15px;margin:22px 0 8px;border-bottom:1px solid #e2e8f0;padding-bottom:4px}
      .meta{color:#475569} .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:16px} .kpi{border:1px solid #e2e8f0;border-radius:10px;padding:10px}
      .kpi b{display:block;font-size:24px} table{width:100%;border-collapse:collapse} td,th{text-align:left;padding:5px 6px;border-bottom:1px solid #f1f5f9}
      b.Critical{color:#b91c1c} b.High{color:#c2410c} b.Medium{color:#b45309} b.Low{color:#047857} li{margin:3px 0} footer{margin-top:24px;color:#64748b;font-size:11px}</style></head><body>
      <h1>${esc(company)} · Brand protection report</h1><p class="meta">${esc(when)} · prepared with Suraksha</p>
      <div class="kpis"><div class="kpi">Total cases<b>${cases.length}</b></div><div class="kpi">Open<b>${s.open.length}</b></div><div class="kpi">Open High/Critical<b>${s.highOpen}</b></div><div class="kpi">Confirmed fakes<b>${s.confirmed.length}</b></div></div>
      <h2>Exposure by channel</h2><table>${s.byChannel.map(([k, n]) => `<tr><td>${esc(CHANNEL[k] || k)}</td><td>${n}</td></tr>`).join('') || '<tr><td>No cases yet</td></tr>'}</table>
      <h2>By severity</h2><table><tr>${SEV.map((x) => `<td>${x}: <b class="${x}">${s.bySev[x]}</b></td>`).join('')}</tr></table>
      <h2>New cases per week</h2><table><tr>${s.weeks.map((w) => `<td>${esc(w.label)}: <b>${w.n}</b></td>`).join('')}</tr></table>
      <h2>Top open risks</h2><table><tr><th>Item</th><th>Channel</th><th>Severity</th><th>Status</th></tr>${s.top.map(row).join('') || '<tr><td colspan="4">No open cases</td></tr>'}</table>
      <h2>Recommended next steps</h2><ol>${recommendations.map((r) => `<li>${esc(r)}</li>`).join('')}</ol>
      <footer>Counts come from the cases in this Suraksha workspace. Findings are advisory; a person confirms every case before any takedown is sent.</footer>
      <script>window.onload=()=>setTimeout(()=>window.print(),300)</script></body></html>`;
    const w = window.open(URL.createObjectURL(new Blob([html], { type: 'text/html' })), '_blank');
    if (!w) alert('Allow pop-ups to download the PDF report.');
  };

  const Kpi = ({ label, value, tone = 'text-fg' }: { label: string; value: number; tone?: string }) => (
    <div className="rounded-2xl border border-line bg-surface p-4"><p className="text-xs text-fgSubtle">{label}</p><p className={`mt-1 font-display text-3xl font-semibold tabular-nums ${tone}`}>{value}</p></div>
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-accent">Executive report</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-fg">{company}: brand protection at a glance</h1>
          <p className="mt-1 max-w-2xl text-sm text-fgMuted">For leadership. Built from the cases in this workspace; no estimates.</p>
        </div>
        <button type="button" onClick={pdf} className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-onAccent hover:bg-accentHover"><FileDown className="h-4 w-4" aria-hidden />Download PDF</button>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Total cases" value={cases.length} />
        <Kpi label="Open" value={s.open.length} />
        <Kpi label="Open High / Critical" value={s.highOpen} tone={s.highOpen ? 'text-danger' : 'text-ok'} />
        <Kpi label="Confirmed fakes" value={s.confirmed.length} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-2xl border border-line bg-surface p-5">
          <p className="text-sm font-semibold text-fg">Exposure by channel</p>
          <ul className="mt-3 space-y-2">
            {s.byChannel.length ? s.byChannel.map(([k, n]) => (
              <li key={k}><div className="flex justify-between text-sm"><span className="text-fgMuted">{CHANNEL[k] || k}</span><span className="tabular-nums text-fg">{n}</span></div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-accent" style={{ width: `${(n / cases.length) * 100}%` }} /></div></li>
            )) : <li className="text-sm text-fgMuted">No cases yet.</li>}
          </ul>
        </section>
        <section className="rounded-2xl border border-line bg-surface p-5">
          <p className="text-sm font-semibold text-fg">By severity</p>
          <ul className="mt-3 space-y-2">
            {SEV.map((x) => (
              <li key={x} className="flex items-center gap-3 text-sm"><span className={`h-2.5 w-2.5 rounded-full ${SEV_TONE[x]}`} /><span className="flex-1 text-fgMuted">{x}</span><span className="tabular-nums text-fg">{s.bySev[x]}</span></li>
            ))}
          </ul>
        </section>
        <section className="rounded-2xl border border-line bg-surface p-5">
          <div className="flex items-center justify-between"><p className="text-sm font-semibold text-fg">New cases per week</p>
            {cases.length > 0 && <span className={`flex items-center gap-1 text-xs ${trendUp ? 'text-danger' : 'text-ok'}`}>{trendUp ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}{trendUp ? 'rising' : 'not rising'}</span>}</div>
          <div className="mt-4 flex h-24 items-end gap-3">
            {s.weeks.map((w) => (
              <div key={w.label} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-[11px] tabular-nums text-fgMuted">{w.n}</span>
                <div className="w-full rounded-t bg-accent/70" style={{ height: `${Math.max(4, (w.n / maxWeek) * 72)}px` }} />
                <span className="text-[10px] text-fgSubtle">{w.label}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-line bg-surface p-5">
          <p className="text-sm font-semibold text-fg">Top open risks</p>
          <ul className="mt-3 divide-y divide-line">
            {s.top.length ? s.top.map((c) => (
              <li key={c.id}>
                <button type="button" onClick={() => { setSelectedCandidateId(c.id); setActiveTab('investigation-center'); }} className="flex w-full items-center gap-3 py-2 text-left hover:text-accent">
                  <ShieldAlert className={`h-4 w-4 shrink-0 ${c.riskCategory === 'Critical' ? 'text-danger' : c.riskCategory === 'High' ? 'text-high' : 'text-warn'}`} aria-hidden />
                  <span className="min-w-0 flex-1 truncate text-sm text-fg">{c.title}</span>
                  <span className="text-xs text-fgSubtle">{CHANNEL[c.type] || c.type}</span>
                </button>
              </li>
            )) : <li className="py-2 text-sm text-fgMuted">No open cases. Run a sweep from Bulk check.</li>}
          </ul>
        </section>
        <section className="rounded-2xl border border-line bg-surface p-5">
          <p className="text-sm font-semibold text-fg">Recommended next steps</p>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-fgMuted">{recommendations.map((r) => <li key={r}>{r}</li>)}</ol>
        </section>
      </div>
    </div>
  );
};
