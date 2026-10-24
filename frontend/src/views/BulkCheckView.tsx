import React, { useEffect, useMemo, useState } from 'react';
import { FileDown, ListChecks, QrCode } from 'lucide-react';
import QRCode from 'qrcode';
import { runFullLookalikeAnalysis } from '../utils/lookalikeEngine';
import type { BrandProfile } from '../types';

/**
 * Bulk check: paste one "Company, URL[, official domain]" per line. Each URL is examined against the company it claims to
 * be, and every misleading or risky detail is listed. "Download PDF" opens a clean printable report (Save as PDF).
 * Everything runs in the browser; no URL is visited. Findings are triage evidence, not verdicts.
 */
const EXAMPLE = `Acme Corp, https://acme-secure-login.top/verify?account=suspended, acme.com
Paytm, http://paytm-kyc-update.in/login, paytm.com
State Bank of India, https://onlinesbi.sbi, onlinesbi.sbi
Amazon, http://amaz0n-refund.xyz/claim, amazon.in
Netflix, bit.ly/netflix-free-month
Google, https://accounts.google.com, google.com`;

const RISKY_TLDS = ['top', 'xyz', 'click', 'icu', 'shop', 'live', 'online', 'site', 'vip', 'buzz', 'rest', 'cfd', 'sbs', 'monster', 'tk', 'ml', 'ga', 'cf', 'gq'];
const SHORTENERS = ['bit.ly', 'tinyurl.com', 'cutt.ly', 'rb.gy', 'is.gd', 't.co', 'shorturl.at', 'goo.gl', 'ow.ly'];
const LURE_WORDS = ['login', 'signin', 'verify', 'kyc', 'update', 'secure', 'account', 'refund', 'claim', 'reward', 'bonus', 'free', 'gift', 'wallet', 'suspend', 'unlock', 'support', 'helpdesk'];

type Finding = { severity: 'critical' | 'high' | 'medium' | 'info'; text: string };
type Row = { company: string; url: string; official: string; note?: string; host: string; verdict: string; score: number; findings: Finding[]; error?: string };

type Item = { company: string; url: string; official: string; note: string };
const URL_RE = /\bhttps?:\/\/[^\s,;)"'<>]+|\b(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}(?:\/[^\s,;)"'<>]*)?/gi;
const clean = (u: string) => u.replace(/[.—–-]+$/, '');

/** Accepts strict "Company, URL, official" lines AND free text (numbered lists, descriptions after a dash...). */
function parse(text: string, defaultCompany: string, officials: string[]): Item[] {
  const items: Item[] = [];
  for (const line of text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)) {
    const parts = line.split(/\s*[,|\t]\s*/);
    if (parts.length >= 2 && !parts[0].includes('.') && new RegExp(URL_RE.source, 'i').test(parts[1])) { // strict CSV line
      items.push({ company: defaultCompany || parts[0], url: clean(parts[1]), official: [parts[2] || '', ...officials].join(' ').trim(), note: parts.slice(3).join(', ') });
      continue;
    }
    const found = [...line.matchAll(new RegExp(URL_RE.source, 'gi'))];
    found.forEach((m, i) => {
      const end = (m.index || 0) + m[0].length;
      const note = line.slice(end, i + 1 < found.length ? found[i + 1].index : undefined)
        .replace(/^[\s—–:-]+/, '').replace(/\(\d+\)\s*$/, '').trim();
      const host = clean(m[0]).replace(/^https?:\/\//i, '').replace(/^www\./i, '').split(/[/.]/)[0];
      items.push({ company: defaultCompany || '', url: clean(m[0]), official: officials.join(' '), note: note || host });
    });
  }
  // No company typed: use the capitalised name that both appears in the descriptions AND inside the URLs (e.g. "Paytm"),
  // so words like "Associated" or "Previously" are never mistaken for the company.
  if (!defaultCompany && items.some((it) => !it.company)) {
    const hosts = items.map((it) => it.url.toLowerCase()).join(' ');
    const counts = new Map<string, number>();
    for (const it of items) for (const w of it.note.match(/\b[A-Z][A-Za-z0-9&]{2,}/g) || []) {
      if (hosts.includes(w.toLowerCase())) counts.set(w, (counts.get(w) || 0) + 1);
    }
    const best = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    for (const it of items) if (!it.company) it.company = best || it.url.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split(/[/.]/)[0];
  }
  return items;
}

function check(company: string, url: string, official: string, note = ''): Row {
  const base = { company, url, official, note, host: '', verdict: 'Unknown', score: 0, findings: [] as Finding[] };
  if (!company || !url) return { ...base, error: 'Each line needs a company name and a URL.' };
  let u: URL;
  try { u = new URL(/^[a-z]+:\/\//i.test(url) ? url : `http://${url}`); } catch { return { ...base, error: 'Not a valid URL.' }; }
  const host = u.hostname.toLowerCase().replace(/^www\./, '');
  const f: Finding[] = [];
  const officialHosts = official.toLowerCase().split(/[\s,]+/).filter(Boolean).map((o) => o.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]);
  const isOfficial = officialHosts.some((o) => host === o || host.endsWith(`.${o}`));
  const officialHost = officialHosts.find((o) => host === o || host.endsWith(`.${o}`)) || officialHosts.join(', ');
  if (/\bofficial\b/i.test(note) && !isOfficial) {
    f.push(officialHosts.length
      ? { severity: 'high', text: `Described as official, but ${host} is not on the official domain list (${officialHosts.join(', ')}).` }
      : { severity: 'info', text: 'Described as official, but no official domain was given, so the claim cannot be verified. Add official domains above.' });
  }
  if (isOfficial) f.push({ severity: 'info', text: `Matches the official domain ${officialHost}.` });

  const tld = host.split('.').pop() || '';
  const labels = host.split('.');
  const compact = company.toLowerCase().replace(/[^a-z0-9]/g, '');
  const first = company.toLowerCase().split(/\s+/)[0].replace(/[^a-z0-9]/g, '');
  const hostCompact = labels.slice(0, -1).join('').replace(/[^a-z0-9]/g, '');

  if (!isOfficial) {
    if (SHORTENERS.includes(host)) f.push({ severity: 'high', text: `Link shortener (${host}) hides the real destination.` });
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) f.push({ severity: 'high', text: 'Uses a raw IP address instead of a company domain.' });
    if (host.startsWith('xn--') || host.includes('.xn--')) f.push({ severity: 'critical', text: 'Punycode domain: may use look-alike letters from other alphabets.' });
    if (u.username || url.includes('@')) f.push({ severity: 'critical', text: 'Contains "@": the browser ignores everything before it, a classic disguise.' });
    if (RISKY_TLDS.includes(tld)) f.push({ severity: 'medium', text: `Ending ".${tld}" is cheap and common in phishing.` });
    if (labels.length > 4) f.push({ severity: 'medium', text: `Many sub-domains (${labels.length - 2}) can push the real domain out of view.` });
    if (u.protocol === 'http:') f.push({ severity: 'medium', text: 'No HTTPS: anything typed travels unencrypted.' });
    const token = [compact, first].find((t) => t.length >= 3 && hostCompact.includes(t));
    if (token) f.push({ severity: 'high', text: `"${token}" is built into ${host}, but this is not ${company}'s official domain${officialHost ? ` (${officialHost})` : ''}.` });
    const words = LURE_WORDS.filter((w) => `${host}${u.pathname}${u.search}`.toLowerCase().includes(w));
    if (words.length) f.push({ severity: words.length > 1 ? 'high' : 'medium', text: `Lure words in the address: ${words.join(', ')}.` });
  }

  const profile: BrandProfile = { id: 'bulk', brandName: company, officialWebsite: officialHost ? `https://${officialHost}` : '', officialDomains: officialHosts,
    officialSocialUrls: [], officialApps: [], authorizedPartners: [], brandDescription: '', protectedKeywords: [], lastUpdated: '' };
  let engineScore = 0;
  if (!isOfficial) try {
    const r = runFullLookalikeAnalysis(company, host, profile, '');
    engineScore = r.isOfficialAsset ? 0 : r.overallScore;
    if (!r.isOfficialAsset) {
      for (const s of r.signals.filter((x) => x.severity === 'critical' || x.severity === 'high').slice(0, 3)) {
        if (!f.some((x) => x.text.includes(s.title))) f.push({ severity: s.severity as Finding['severity'], text: `${s.title}: ${s.detail}` });
      }
    }
  } catch { /* engine is optional here */ }

  const pts = f.reduce((n, x) => n + ({ critical: 35, high: 20, medium: 10, info: 0 } as const)[x.severity], 0);
  const score = isOfficial ? 0 : Math.min(100, Math.max(engineScore, pts));
  const verdict = isOfficial ? 'Official' : score >= 70 ? 'Very likely fake' : score >= 40 ? 'Suspicious' : score >= 15 ? 'Some warning signs' : 'No strong signs';
  return { ...base, host, verdict, score, findings: f.length ? f : [{ severity: 'info', text: 'No misleading details found in the address.' }] };
}

const TONE: Record<string, string> = { Official: 'text-ok', 'Very likely fake': 'text-danger', Suspicious: 'text-high', 'Some warning signs': 'text-warn', 'No strong signs': 'text-fgMuted', Unknown: 'text-fgMuted' };
const SEV: Record<string, string> = { critical: 'bg-danger/15 text-danger', high: 'bg-high/15 text-high', medium: 'bg-warn/15 text-warn', info: 'bg-fg/10 text-fgMuted' };
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

function openPdf(rows: Row[], qr: string) {
  const when = new Date().toLocaleString();
  const counts = rows.reduce<Record<string, number>>((m, r) => ({ ...m, [r.verdict]: (m[r.verdict] || 0) + 1 }), {});
  const color: Record<string, string> = { Official: '#059669', 'Very likely fake': '#dc2626', Suspicious: '#ea580c', 'Some warning signs': '#d97706', 'No strong signs': '#475569', Unknown: '#475569' };
  const body = rows.map((r, i) => `
    <section><h2>${i + 1}. ${esc(r.company)} <span style="color:${color[r.verdict]}">· ${esc(r.verdict)}${r.verdict !== 'Official' ? ` (${r.score}/100)` : ''}</span></h2>
    <p class="url">${esc(r.url)}${r.note ? `<br><i style="font-family:system-ui">“${esc(r.note)}”</i>` : ''}${r.official ? ` &nbsp;·&nbsp; official: ${esc(r.official)}` : ''}</p>
    ${r.error ? `<p class="err">${esc(r.error)}</p>` : `<ul>${r.findings.map((f) => `<li><b class="${f.severity}">${f.severity}</b> ${esc(f.text)}</li>`).join('')}</ul>`}</section>`).join('');
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Suraksha bulk check ${esc(when)}</title><style>
    body{font:13px/1.5 system-ui,Segoe UI,Arial;color:#0f172a;margin:32px} h1{margin:0;font-size:22px} .meta{color:#475569;margin:4px 0 16px}
    header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #0f172a;padding-bottom:12px;margin-bottom:12px}
    .sum span{display:inline-block;margin:0 12px 4px 0} section{break-inside:avoid;border-bottom:1px solid #e2e8f0;padding:8px 0}
    h2{font-size:15px;margin:0} .url{font-family:Consolas,monospace;color:#334155;margin:2px 0 6px;word-break:break-all} ul{margin:0;padding-left:18px}
    b{font-size:10px;text-transform:uppercase;padding:1px 5px;border-radius:4px;margin-right:4px} .critical{background:#fee2e2;color:#b91c1c}.high{background:#ffedd5;color:#c2410c}
    .medium{background:#fef3c7;color:#b45309}.info{background:#f1f5f9;color:#475569} .err{color:#b91c1c} footer{margin-top:16px;color:#64748b;font-size:11px}
    img{width:96px;height:96px}</style></head><body>
    <header><div><h1>Suraksha · Bulk impersonation check</h1><p class="meta">${esc(when)} · ${rows.length} URLs</p>
    <div class="sum">${Object.entries(counts).map(([k, v]) => `<span style="color:${color[k]}">${esc(k)}: <b style="background:none;font-size:13px">${v}</b></span>`).join('')}</div></div>
    ${qr ? `<div style="text-align:center"><img src="${qr}" alt="QR code"><div class="meta" style="font-size:10px">Open Suraksha</div></div>` : ''}</header>
    ${body}
    <footer>Automated triage from the address only: the pages were not visited. A person should confirm each case before any report or takedown.</footer>
    <script>window.onload=()=>setTimeout(()=>window.print(),300)</script></body></html>`;
  const w = window.open(URL.createObjectURL(new Blob([html], { type: 'text/html' })), '_blank');
  if (!w) alert('Allow pop-ups to download the PDF report.');
}

export const BulkCheckView: React.FC = () => {
  const [text, setText] = useState(EXAMPLE);
  const [company, setCompany] = useState('');
  const [officials, setOfficials] = useState('');
  const [qr, setQr] = useState('');
  const rows = useMemo(() => parse(text, company.trim(), officials.split(/[\s,]+/).filter(Boolean)).slice(0, 200)
    .map((r) => check(r.company, r.url, r.official, r.note)), [text, company, officials]);
  const siteUrl = typeof window !== 'undefined' ? window.location.origin : '';

  useEffect(() => { QRCode.toDataURL(siteUrl, { margin: 1, width: 240 }).then(setQr).catch(() => setQr('')); }, [siteUrl]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-accent">Bulk check</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-fg">Check a list of companies and URLs</h1>
          <p className="mt-1 max-w-2xl text-sm text-fgMuted">Paste any list: <span className="font-mono text-fg">Company, URL</span> lines, or free text with links and descriptions. Adding the official domains makes results far more accurate. Every misleading detail is listed, and you can download it all as a PDF.</p>
        </div>
        {qr && (
          <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3">
            <img src={qr} alt={`QR code for ${siteUrl}`} className="h-20 w-20 rounded bg-white p-1" />
            <div className="text-xs text-fgMuted"><p className="flex items-center gap-1 font-semibold text-fg"><QrCode className="h-3.5 w-3.5" aria-hidden />Scan to open</p><p className="font-mono">{siteUrl.replace(/^https?:\/\//, '')}</p></div>
          </div>
        )}
      </header>

      <section className="rounded-2xl border border-line bg-surface p-5">
        <div className="mb-3 grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-medium text-fgMuted">Company being checked (optional, used for every URL)
            <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="e.g. Paytm" className="mt-1 w-full rounded-lg border border-line bg-surface2 px-3 py-2 text-sm text-fg outline-none focus:border-accent" />
          </label>
          <label className="text-xs font-medium text-fgMuted">Its official domains (optional, comma separated)
            <input value={officials} onChange={(e) => setOfficials(e.target.value)} placeholder="e.g. paytm.com, paytmbank.com" className="mt-1 w-full rounded-lg border border-line bg-surface2 px-3 py-2 font-mono text-sm text-fg outline-none focus:border-accent" />
          </label>
        </div>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={7} spellCheck={false} aria-label="Companies and URLs, one per line"
          className="w-full resize-y rounded-xl border border-line bg-surface2 p-3 font-mono text-sm text-fg outline-none focus:border-accent" />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => openPdf(rows, qr)} disabled={!rows.length}
            className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-onAccent hover:bg-accentHover disabled:opacity-40"><FileDown className="h-4 w-4" aria-hidden />Download PDF report</button>
          <button type="button" onClick={() => setText(EXAMPLE)} className="rounded-full border border-line px-3 py-2 text-xs text-fgMuted hover:text-fg">Load example</button>
          <span className="flex items-center gap-1 text-xs text-fgSubtle"><ListChecks className="h-3.5 w-3.5" aria-hidden />{rows.length} URLs found (max 200). Nothing is visited or sent anywhere.</span>
        </div>
      </section>

      {!officials.trim() && rows.some((r) => !r.error && r.verdict !== 'Official' && r.score >= 40) && (
        <p className="rounded-xl border border-warn/40 bg-warn/10 px-4 py-3 text-sm text-fgMuted">
          <span className="font-semibold text-fg">No official domains given.</span> Without them, every address that contains the company name looks suspicious, including the company's real sites. Add the genuine domains above to separate real from fake.
        </p>
      )}
      <div className="space-y-3" aria-live="polite">
        {rows.map((r, i) => (
          <article key={`${r.url}-${i}`} className="rounded-2xl border border-line bg-surface p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div><p className="text-base font-semibold text-fg">{r.company || '(no company)'} <span className="ml-2 break-all font-mono text-xs font-normal text-fgSubtle">{r.url}</span></p>
                {r.note && <p className="mt-0.5 text-xs text-fgSubtle">“{r.note}”</p>}</div>
              <p className={`text-sm font-semibold ${TONE[r.verdict]}`}>{r.error ? 'Could not check' : r.verdict}{!r.error && r.verdict !== 'Official' ? ` · ${r.score}/100` : ''}</p>
            </div>
            {r.error ? <p className="mt-2 text-sm text-danger">{r.error}</p> : (
              <ul className="mt-2 space-y-1.5">
                {r.findings.map((f, k) => (
                  <li key={k} className="flex items-start gap-2 text-sm"><span className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium uppercase ${SEV[f.severity]}`}>{f.severity}</span><span className="text-fgMuted">{f.text}</span></li>
                ))}
              </ul>
            )}
          </article>
        ))}
      </div>
    </div>
  );
};
