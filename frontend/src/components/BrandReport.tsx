import React from 'react';
import { createPortal } from 'react-dom';
import { Printer, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { CandidateAsset, RiskLevel } from '../types';

const ORDER: RiskLevel[] = ['Critical', 'High', 'Medium', 'Low'];
const TYPES: { id: CandidateAsset['type']; label: string }[] = [
  { id: 'domain', label: 'Domains' }, { id: 'social', label: 'Social accounts' }, { id: 'app', label: 'Mobile apps' },
];
const tone: Record<string, string> = { Critical: '#b91c1c', High: '#c2410c', Medium: '#a16207', Low: '#15803d' };

/** Print-ready Brand Protection Report (use the browser's Save as PDF). Always light-themed for paper. */
export function BrandReport({ onClose }: { onClose: () => void }) {
  const { candidates, brandProfile, isDemoMode } = useApp();
  const rows = candidates.filter((c) => isDemoMode || !c.isFictionalDemo);
  const by = (lv: RiskLevel) => rows.filter((c) => c.riskCategory === lv).length;
  const sorted = [...rows].sort((a, b) => ORDER.indexOf(a.riskCategory) - ORDER.indexOf(b.riskCategory));
  const bp: any = brandProfile;

  return createPortal(
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/60 p-4 print:static print:overflow-visible print:bg-transparent print:p-0">
      <div className="mx-auto mb-3 flex max-w-3xl justify-end gap-2 print:hidden">
        <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-2 text-sm font-medium text-onAccent"><Printer className="h-4 w-4" /> Print / Save as PDF</button>
        <button onClick={onClose} className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-3 py-2 text-sm text-fg"><X className="h-4 w-4" /> Close</button>
      </div>

      <article id="brand-report" className="mx-auto max-w-3xl bg-white p-8 text-[13px] leading-relaxed text-neutral-900 shadow-xl print:shadow-none">
        <header className="border-b-2 border-neutral-900 pb-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-neutral-500">SURAKSHA · Digital Risk Protection</p>
          <h1 className="mt-1 text-2xl font-bold">Brand Protection Report: {brandProfile.brandName || 'Brand'}</h1>
          <p className="text-neutral-500">Generated {new Date().toLocaleString()}{isDemoMode ? ' · demo data' : ''}</p>
        </header>

        <section className="mt-5">
          <h2 className="mb-2 text-base font-semibold">1. Executive summary</h2>
          <p>
            {rows.length === 0 ? 'No findings have been recorded.' : `${rows.length} finding${rows.length === 1 ? '' : 's'} recorded: ${ORDER.map((l) => `${by(l)} ${l.toLowerCase()}`).join(', ')}.`}{' '}
            Findings are leads for analyst review. Each lists the signals behind it and what could not be verified.
          </p>
          <table className="mt-3 w-full border-collapse text-left">
            <thead><tr className="border-b border-neutral-300 text-[11px] uppercase text-neutral-500"><th className="py-1">Asset type</th>{ORDER.map((l) => <th key={l} className="py-1">{l}</th>)}<th className="py-1">Total</th></tr></thead>
            <tbody>
              {TYPES.map((t) => (
                <tr key={t.id} className="border-b border-neutral-100">
                  <td className="py-1 font-medium">{t.label}</td>
                  {ORDER.map((l) => <td key={l} className="py-1 font-mono">{rows.filter((c) => c.type === t.id && c.riskCategory === l).length}</td>)}
                  <td className="py-1 font-mono font-semibold">{rows.filter((c) => c.type === t.id).length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="mt-5">
          <h2 className="mb-2 text-base font-semibold">2. Protected assets (excluded from flagging)</h2>
          <ul className="list-disc pl-5">
            <li>Website: {bp.officialWebsite || 'not set'}</li>
            <li>Verified social accounts: {(bp.officialSocialUrls || []).map((s: any) => s.handle || s).join(', ') || 'none'}</li>
            <li>Verified mobile apps: {(bp.officialApps || []).map((a: any) => `${a.name} (${a.appId || 'id n/a'})`).join('; ') || 'none'}</li>
            <li>Authorised partners: {(bp.authorizedPartners || []).map((p: any) => p.name || p.partnerName || p).join(', ') || 'none'}</li>
          </ul>
        </section>

        <section className="mt-5">
          <h2 className="mb-2 text-base font-semibold">3. Findings by priority</h2>
          {sorted.length === 0 && <p className="text-neutral-500">Nothing to report.</p>}
          {sorted.map((c, i) => (
            <div key={c.id} className="mb-3 break-inside-avoid rounded border border-neutral-200 p-3">
              <div className="flex items-start justify-between gap-3">
                <p className="font-semibold">{i + 1}. {c.title}</p>
                <span className="shrink-0 font-mono text-xs font-bold" style={{ color: tone[c.riskCategory] }}>{c.riskCategory.toUpperCase()}</span>
              </div>
              <p className="text-neutral-500">{c.type} · {c.platform} · {c.identifier} · status {c.status}</p>
              <p className="mt-1">{c.summary}</p>
              {c.evidenceSupporting?.length > 0 && <p className="mt-1"><b>Evidence:</b> {c.evidenceSupporting.join('; ')}</p>}
              {c.missingInformation?.length > 0 && <p className="mt-1"><b>Not verified:</b> {c.missingInformation.join('; ')}</p>}
              {c.recommendedNextSteps?.length > 0 && <p className="mt-1"><b>Next steps:</b> {c.recommendedNextSteps.join('; ')}</p>}
            </div>
          ))}
        </section>

        <section className="mt-5 break-inside-avoid">
          <h2 className="mb-2 text-base font-semibold">4. Method and limitations</h2>
          <ul className="list-disc pl-5">
            <li>Official assets are excluded before scoring; partners and parody accounts are scored lower, not ignored.</li>
            <li>Scores combine named, explainable signals (look-alike names, homoglyphs, logo or icon similarity, scam wording, publisher mismatch). Any ML output is supporting evidence only.</li>
            <li>Live sources: public Bluesky, Mastodon, GitHub and Reddit search, Apple App Store search, and analyst-imported listings. Missing data is reported, never guessed.</li>
            <li>A clean result means nothing was found in the sources searched, not that the brand is safe.</li>
          </ul>
        </section>
      </article>
    </div>,
    document.body,
  );
}
