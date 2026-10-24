import React, { useMemo, useState } from 'react';
import { Globe, Building2, ShieldCheck, ShieldAlert } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { runFullLookalikeAnalysis } from '../utils/lookalikeEngine';
import { analyzeSocialCandidate } from '../utils/socialEngine';

/**
 * Fake websites and fake company pages. Websites run through the domain engine (look-alike name, lure words, risky
 * TLDs, page wording); company pages (LinkedIn, Facebook, Google Business, X, Instagram…) run through the social engine
 * against the brand's official pages. Runs in the browser. Results are triage evidence for an analyst.
 */
type Kind = 'website' | 'page';
const SAMPLES: Record<Kind, { label: string; url: string; title: string; text: string }[]> = {
  website: [
    { label: 'Login lure', url: 'https://acme-secure-login.top/verify', title: 'Acme Corp | Sign in', text: 'Your account is suspended. Verify your password and OTP within 24 hours.' },
    { label: 'Refund page', url: 'http://acmecorp-refund.in', title: 'Acme Refund Centre', text: 'Enter your card details to receive your pending refund.' },
    { label: 'Unrelated site', url: 'https://gardenrecipes.com', title: 'Garden Recipes', text: 'Seasonal recipes from our kitchen garden.' },
  ],
  page: [
    { label: 'Fake LinkedIn page', url: 'https://www.linkedin.com/company/acme-corp-careers-official', title: 'Acme Corp Careers (Official)', text: 'Hiring now! Pay a refundable registration fee to confirm your interview slot.' },
    { label: 'Fake Facebook support page', url: 'https://www.facebook.com/acmecorp.support.help', title: 'Acme Corp Customer Support', text: 'Official help page. DM us your account number and OTP for instant refunds.' },
    { label: 'Fan page (disclosed)', url: 'https://www.facebook.com/acmefanclub', title: 'Acme Fans', text: 'Fan community. Not affiliated with Acme Corp.' },
  ],
};

const PLATFORMS: [RegExp, string][] = [[/linkedin\./, 'LinkedIn'], [/facebook\.|fb\.com/, 'Facebook'], [/instagram\./, 'Instagram'], [/(x|twitter)\.com/, 'Twitter / X'],
  [/google\.|g\.page|maps\./, 'Google Business'], [/youtube\./, 'YouTube'], [/t\.me|telegram\./, 'Telegram']];

const TONE: Record<string, string> = { Critical: 'text-danger', High: 'text-high', Medium: 'text-warn', Low: 'text-ok' };
const BAR: Record<string, string> = { Critical: 'bg-danger', High: 'bg-high', Medium: 'bg-warn', Low: 'bg-ok' };
const CHIP: Record<string, string> = { critical: 'bg-danger/15 text-danger', high: 'bg-high/15 text-high', medium: 'bg-warn/15 text-warn', low: 'bg-fg/10 text-fgMuted' };

// Extra website signals the domain engine does not cover: the brand name glued into the domain, and lure wording on the page.
const LURES: { re: RegExp; title: string; detail: string; severity: 'critical' | 'high' | 'medium'; points: number }[] = [
  { re: /\b(password|passcode|otp|one[- ]time (password|code)|upi pin|\bpin\b|cvv|card (details|number)|login details|bank details)\b/i, title: 'Page asks for secrets or payment details', detail: 'Asks for passwords, OTPs, PINs or card/bank details.', severity: 'critical', points: 35 },
  { re: /\b(suspended|blocked|deactivated|locked|within \d+ ?(hours?|hrs|days?)|immediately|urgent|final notice|expires?)\b/i, title: 'Pressure to act now', detail: 'Threatens suspension or sets a short deadline.', severity: 'high', points: 15 },
  { re: /\b(refund|cashback|reward|prize|claim|processing fee|registration fee)\b/i, title: 'Money bait', detail: 'Promises refunds, rewards or asks for a fee.', severity: 'medium', points: 15 },
];
const RANK_LEVEL = ['Low', 'Medium', 'High', 'Critical'];
const levelFromScore = (n: number) => (n >= 75 ? 'Critical' : n >= 50 ? 'High' : n >= 25 ? 'Medium' : 'Low');

function websiteExtras(host: string, text: string, brandName: string, officialDomains: string[]) {
  const signals: { title: string; detail: string; severity: string }[] = [];
  let points = 0;
  const label = host.split('.').slice(0, -1).join('').replace(/[^a-z0-9]/g, '');
  const official = officialDomains.some((d) => host === d.toLowerCase() || host.endsWith(`.${d.toLowerCase()}`));
  const compact = brandName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const first = brandName.toLowerCase().split(/\s+/)[0].replace(/[^a-z0-9]/g, '');
  const token = [compact, first].find((t) => t.length >= 3 && label.includes(t));
  if (!official && token) {
    signals.push({ title: 'Brand name built into the domain', detail: `"${token}" appears inside ${host}, which is not one of your official domains.`, severity: 'high' });
    points += 30;
  }
  for (const l of LURES) {
    const m = text.match(l.re);
    if (m) { signals.push({ title: l.title, detail: `${l.detail} Found: "${m[0]}".`, severity: l.severity }); points += l.points; }
  }
  return { signals, points };
}

function hostAndSlug(url: string) {
  try {
    const u = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`);
    const slug = u.pathname.split('/').filter(Boolean).filter((p) => !['company', 'pages', 'in', 'p', 'c', 'channel'].includes(p.toLowerCase()))[0] || '';
    return { host: u.hostname.replace(/^www\./, '').toLowerCase(), slug };
  } catch {
    return { host: url.trim().toLowerCase(), slug: '' };
  }
}

export const WebsiteCheckView: React.FC = () => {
  const { brandProfile } = useApp();
  const [kind, setKind] = useState<Kind>('website');
  const [form, setForm] = useState(SAMPLES.website[0]);

  const result = useMemo(() => {
    if (!brandProfile || !form.url.trim()) return null;
    const { host, slug } = hostAndSlug(form.url);
    try {
      if (kind === 'website') {
        const r = runFullLookalikeAnalysis(form.title || host.split('.')[0], host, brandProfile, form.text);
        if (r.isOfficialAsset) return { official: true, level: 'Low', score: 0, signals: [], next: '', what: host };
        const extra = websiteExtras(host, `${form.title} ${form.text}`, brandProfile.brandName || '', brandProfile.officialDomains || []);
        const score = Math.min(100, r.overallScore + extra.points);
        const engineLevel = /crit/i.test(String(r.overallRiskCategory)) ? 'Critical' : /high/i.test(String(r.overallRiskCategory)) ? 'High' : /med/i.test(String(r.overallRiskCategory)) ? 'Medium' : 'Low';
        const level = RANK_LEVEL[Math.max(RANK_LEVEL.indexOf(engineLevel), RANK_LEVEL.indexOf(levelFromScore(score)))];
        const seen = new Set(extra.signals.map((x) => x.title));
        return { official: false, level, score, signals: [...extra.signals, ...r.signals.filter((x: any) => !seen.has(x.title))], next: r.recommendedAction, what: host };
      }
      const platform = PLATFORMS.find(([re]) => re.test(host))?.[1] || host;
      const r: any = analyzeSocialCandidate({ name: form.title || slug, username: slug ? `@${slug}` : form.title, platform, url: form.url, bio: form.text } as any, brandProfile);
      return { official: !!r.isExactOfficialMatch, level: String(r.riskCategory), score: r.heuristicScore, signals: r.signals || [], next: '', what: `${platform} page${slug ? ` /${slug}` : ''}` };
    } catch {
      return null;
    }
  }, [brandProfile, form, kind]);

  const level = result ? (/crit/i.test(result.level) ? 'Critical' : /high/i.test(result.level) ? 'High' : /med/i.test(result.level) ? 'Medium' : 'Low') : 'Low';
  const top = result ? [...result.signals].slice(0, 5) : [];
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-accent">Fake websites & company pages</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-fg">Is this site or page pretending to be {brandProfile?.brandName || 'your brand'}?</h1>
        <p className="mt-1 max-w-2xl text-sm text-fgMuted">Paste the address, the page title and a little of its text. Your official domains and pages from the Brand profile are recognised and never flagged.</p>
      </header>

      <div className="inline-flex rounded-xl border border-line bg-surface p-1">
        {([['website', 'Website', Globe], ['page', 'Company page', Building2]] as const).map(([k, label, Icon]) => (
          <button key={k} type="button" onClick={() => { setKind(k); setForm(SAMPLES[k][0]); }}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm ${kind === k ? 'bg-accent text-onAccent' : 'text-fgMuted hover:text-fg'}`}>
            <Icon className="h-4 w-4" aria-hidden />{label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="space-y-3 rounded-2xl border border-line bg-surface p-5">
          <label className="block text-xs font-medium text-fgMuted">{kind === 'website' ? 'Website address' : 'Page address (LinkedIn, Facebook, Google Business, X…)'}
            <input value={form.url} onChange={set('url')} className="mt-1 w-full rounded-lg border border-line bg-surface2 px-3 py-2 font-mono text-sm text-fg outline-none focus:border-accent" />
          </label>
          <label className="block text-xs font-medium text-fgMuted">{kind === 'website' ? 'Page title' : 'Page name'}
            <input value={form.title} onChange={set('title')} className="mt-1 w-full rounded-lg border border-line bg-surface2 px-3 py-2 text-sm text-fg outline-none focus:border-accent" />
          </label>
          <label className="block text-xs font-medium text-fgMuted">{kind === 'website' ? 'Text on the page (optional)' : 'About / description (optional)'}
            <textarea value={form.text} onChange={set('text')} rows={4} className="mt-1 w-full resize-none rounded-lg border border-line bg-surface2 px-3 py-2 text-sm text-fg outline-none focus:border-accent" />
          </label>
          <div className="flex flex-wrap gap-2 pt-1">
            {SAMPLES[kind].map((s) => (
              <button key={s.label} type="button" onClick={() => setForm(s)} className={`rounded-full border px-3 py-1 text-xs ${form.label === s.label ? 'border-accent/70 text-fg' : 'border-line text-fgMuted hover:text-fg'}`}>{s.label}</button>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-line bg-surface p-5" aria-live="polite">
          {!result ? <p className="text-sm text-fgMuted">Enter an address to check.</p> : result.official ? (
            <div className="flex items-start gap-3">
              <ShieldCheck className="h-6 w-6 shrink-0 text-ok" aria-hidden />
              <div><p className="text-lg font-semibold text-ok">Official {kind === 'website' ? 'website' : 'page'}</p><p className="text-sm text-fgMuted">{result.what} is listed in your Brand profile, so it is excluded from flagging.</p></div>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  {level === 'Low' ? <ShieldCheck className="h-6 w-6 shrink-0 text-ok" aria-hidden /> : <ShieldAlert className={`h-6 w-6 shrink-0 ${TONE[level]}`} aria-hidden />}
                  <div>
                    <p className={`text-lg font-semibold ${TONE[level]}`}>{level === 'Low' ? 'No strong impersonation signs' : `${level} risk of impersonation`}</p>
                    <p className="text-sm text-fgMuted">{result.what}</p>
                  </div>
                </div>
                <p className="font-display text-3xl font-semibold tabular-nums text-fg">{Math.round(result.score)}<span className="text-sm text-fgSubtle">/100</span></p>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-line"><div className={`h-full rounded-full ${BAR[level]}`} style={{ width: `${Math.max(3, Math.min(100, result.score))}%` }} /></div>
              <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-fgSubtle">Why</p>
              <ul className="mt-2 space-y-2">
                {top.length ? top.map((s: any, i: number) => (
                  <li key={`${s.title}-${i}`} className="flex items-start gap-2.5 text-sm">
                    <span className={`mt-0.5 shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-medium capitalize ${CHIP[String(s.severity).toLowerCase()] || CHIP.low}`}>{String(s.severity)}</span>
                    <span className="min-w-0"><span className="text-fg">{s.title}</span>{s.detail ? <span className="block text-xs text-fgSubtle">{s.detail}</span> : null}</span>
                  </li>
                )) : <li className="text-sm text-fgMuted">Nothing here resembles the brand.</li>}
              </ul>
              {result.next && <p className="mt-4 border-t border-line pt-3 text-xs text-fgMuted"><span className="font-semibold text-fg">Next step: </span>{result.next}</p>}
            </>
          )}
          <p className="mt-4 text-[11px] text-fgSubtle">Triage evidence for an analyst, not a verdict. Pair it with the Logo check if the page uses your logo.</p>
        </section>
      </div>
    </div>
  );
};
