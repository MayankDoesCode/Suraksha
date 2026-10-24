import React, { useState } from 'react';
import { Check, ChevronRight, X } from 'lucide-react';
import { useApp } from '../context/AppContext';

/**
 * Company rollout checklist on the Overview: the steps a company takes from sign-up to a first executive report.
 * Each step is derived from real workspace state, never ticked by hand. Hidden once everything is done or dismissed.
 */
export const CompanySetup: React.FC = () => {
  const { brandProfile, candidates, setActiveTab, isDemoMode } = useApp() as any;
  const [hidden, setHidden] = useState(() => { try { return localStorage.getItem('suraksha.setupHidden') === '1'; } catch { return false; } });
  if (isDemoMode || hidden) return null;

  const steps = [
    { label: 'Register the company', done: !!brandProfile?.isCustomBrand && !!brandProfile?.brandName, tab: 'brand-profile', hint: 'Name and official website' },
    { label: 'Add official domains', done: (brandProfile?.officialDomains?.length || 0) > 0, tab: 'brand-profile', hint: 'Never flagged as fakes' },
    { label: 'Add official social pages', done: (brandProfile?.officialSocialUrls?.length || 0) > 0, tab: 'brand-profile', hint: 'X, Instagram, LinkedIn, Facebook…' },
    { label: 'Add official apps', done: (brandProfile?.officialApps?.length || 0) > 0, tab: 'brand-profile', hint: 'Play Store / App Store IDs' },
    { label: 'Upload the company logo', done: !!brandProfile?.logoUrl, tab: 'brand-profile', hint: 'Enables logo-copy detection' },
    { label: 'Run a first sweep', done: (candidates?.length || 0) > 0, tab: 'bulk-check', hint: 'Paste your suspicious URLs' },
    { label: 'Share an executive report', done: false, tab: 'executive-report', hint: 'PDF for leadership' },
  ];
  const done = steps.filter((s) => s.done).length;
  if (done === steps.length) return null;
  const pct = Math.round((done / steps.length) * 100);

  return (
    <section className="rounded-2xl border border-accent/30 bg-accent/[0.04] p-5" aria-label="Company setup">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-accent">Company setup</p>
          <p className="mt-1 text-lg font-semibold text-fg">{done} of {steps.length} steps done</p>
        </div>
        <button type="button" aria-label="Hide setup checklist" onClick={() => { setHidden(true); try { localStorage.setItem('suraksha.setupHidden', '1'); } catch { /* ignore */ } }} className="text-fgSubtle hover:text-fg"><X className="h-4 w-4" /></button>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${pct}%` }} /></div>
      <ol className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {steps.map((s, i) => (
          <li key={s.label}>
            <button type="button" onClick={() => setActiveTab(s.tab)} className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${s.done ? 'border-line bg-surface/40' : 'border-line bg-surface hover:border-accent'}`}>
              <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold ${s.done ? 'bg-ok/20 text-ok' : 'border border-line text-fgSubtle'}`}>{s.done ? <Check className="h-3.5 w-3.5" /> : i + 1}</span>
              <span className="min-w-0 flex-1"><span className={`block text-sm ${s.done ? 'text-fgSubtle line-through' : 'text-fg'}`}>{s.label}</span><span className="block truncate text-[11px] text-fgSubtle">{s.hint}</span></span>
              {!s.done && <ChevronRight className="h-4 w-4 shrink-0 text-fgSubtle" aria-hidden />}
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
};
