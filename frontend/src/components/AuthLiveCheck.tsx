import React, { useMemo, useState } from 'react';
import { AtSign, Globe, ScanSearch } from 'lucide-react';
import { analyzeSocialCandidate } from '../utils/socialEngine';
import { runFullLookalikeAnalysis } from '../utils/lookalikeEngine';
import { INITIAL_BRAND_PROFILE } from '../data/demoData';

/**
 * Working check on the sign-in screen: type any handle or domain and the real engines score it against a demo brand.
 * Nothing is sent anywhere; it runs in the browser.
 */
const BRAND = INITIAL_BRAND_PROFILE;
const EXAMPLES = ['@acrne_official', 'acme-support-login.com', '@acme_official', 'acmе.com'];

const tone = (lvl: string) => {
  const l = String(lvl).toLowerCase();
  if (l.includes('crit')) return { text: 'text-danger', bar: 'bg-danger', chip: 'bg-danger/15 text-danger' };
  if (l.includes('high')) return { text: 'text-high', bar: 'bg-high', chip: 'bg-high/15 text-high' };
  if (l.includes('med')) return { text: 'text-warn', bar: 'bg-warn', chip: 'bg-warn/15 text-warn' };
  return { text: 'text-success', bar: 'bg-success', chip: 'bg-success/15 text-success' };
};
const RANK: Record<string, number> = { critical: 3, high: 2, medium: 1, low: 0 };

function run(raw: string) {
  const v = raw.trim();
  if (!v) return null;
  const social = v.startsWith('@') || !v.includes('.');
  try {
    if (social) {
      const handle = v.startsWith('@') ? v : `@${v}`;
      const r: any = analyzeSocialCandidate({ name: handle.slice(1), username: handle, platform: 'X', url: `https://x.com/${handle.slice(1)}`, bio: '', followerCount: 0, creationDate: '' } as any, BRAND as any);
      return { kind: 'Social handle', level: r.riskCategory as string, score: r.heuristicScore as number, signals: (r.signals || []) as any[] };
    }
    const r: any = runFullLookalikeAnalysis(v.replace(/\..*$/, ''), v, BRAND as any, '');
    return { kind: 'Domain', level: r.overallRiskCategory as string, score: r.overallScore as number, signals: (r.signals || []) as any[] };
  } catch {
    return null;
  }
}

const AuthLiveCheck: React.FC = () => {
  const [value, setValue] = useState('@acrne_official');
  const res = useMemo(() => run(value), [value]);
  const t = res ? tone(res.level) : tone('low');
  const top = res ? [...res.signals].sort((a, b) => (RANK[String(b.severity).toLowerCase()] ?? 0) - (RANK[String(a.severity).toLowerCase()] ?? 0)).slice(0, 3) : [];

  return (
    <div className="rounded-2xl border border-line bg-surface/70 p-5 backdrop-blur">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.24em] text-fgSubtle">
        <span className="flex items-center gap-2"><ScanSearch className="h-3.5 w-3.5 text-accent" aria-hidden />Try it: live check</span>
        <span>vs. @acme_official · acme.com</span>
      </div>

      <label className="mt-4 flex items-center gap-2.5 rounded-xl border border-line bg-canvas/60 px-3.5 py-2.5 transition-colors focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20">
        {value.trim().startsWith('@') || !value.includes('.') ? <AtSign className="h-4 w-4 text-fgSubtle" aria-hidden /> : <Globe className="h-4 w-4 text-fgSubtle" aria-hidden />}
        <input value={value} onChange={(e) => setValue(e.target.value)} spellCheck={false} autoComplete="off" aria-label="Handle or domain to check" placeholder="Paste a handle or domain" className="w-full bg-transparent font-mono text-sm text-fg outline-none placeholder:text-fgSubtle" />
      </label>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {EXAMPLES.map((e) => (
          <button key={e} type="button" onClick={() => setValue(e)} className={`rounded-full border px-2.5 py-1 font-mono text-[11px] transition-colors ${value === e ? 'border-accent/60 text-fg' : 'border-line text-fgSubtle hover:border-fgSubtle hover:text-fg'}`}>{e}</button>
        ))}
      </div>

      <div className="mt-5 min-h-[168px]" aria-live="polite">
        {res ? (
          <>
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.22em] text-fgSubtle">{res.kind}</p>
                <p className={`mt-1 font-display text-2xl font-semibold tracking-tight ${t.text}`}>{res.level} risk</p>
              </div>
              <p className="font-display text-4xl font-semibold tabular-nums tracking-tight">{Math.round(res.score)}<span className="text-base text-fgSubtle">/100</span></p>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line">
              <div className={`h-full rounded-full transition-[width] duration-500 ease-out ${t.bar}`} style={{ width: `${Math.max(3, Math.min(100, res.score))}%` }} />
            </div>
            <ul className="mt-4 space-y-2">
              {top.length ? top.map((s, i) => (
                <li key={`${s.id || s.title}-${i}`} className="flex items-start gap-2.5 text-sm">
                  <span className={`mt-0.5 shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium capitalize ${tone(String(s.severity)).chip}`}>{String(s.severity)}</span>
                  <span className="min-w-0 text-fgMuted"><span className="text-fg">{s.title}</span>{s.detail ? <> · <span className="line-clamp-1 inline">{s.detail}</span></> : null}</span>
                </li>
              )) : <li className="text-sm text-fgMuted">No signals fired. Nothing here resembles the demo brand.</li>}
            </ul>
          </>
        ) : (
          <p className="pt-6 text-sm text-fgMuted">Type a handle like <span className="font-mono text-fg">@acme_help</span> or a domain like <span className="font-mono text-fg">acme-login.com</span>.</p>
        )}
      </div>
      <p className="mt-3 border-t border-line pt-3 text-[11px] text-fgSubtle">Same engines as the workspace, run in your browser. Sample brand, nothing is sent.</p>
    </div>
  );
};

export default AuthLiveCheck;
