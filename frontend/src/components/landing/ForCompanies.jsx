import React from 'react';
import { ArrowRight, Building2, Check, FileText, Scale, ShieldCheck, Users } from 'lucide-react';
import { Reveal } from './Reveal';
import { SectionHead } from './Editorial';

/**
 * Company-facing section: who buys Suraksha inside a company, what each team gets, how a rollout works, and plans.
 * Plans are indicative (no invented prices): the free pilot is real, paid tiers are "talk to us".
 */
const TEAMS = [
  { Icon: ShieldCheck, team: 'Security & SOC', pain: 'Phishing domains and fake support accounts reach customers before anyone notices.',
    gets: ['Look-alike domains, handles and apps in one queue', 'Every flag explained signal by signal', 'Attack simulation and live triage'] },
  { Icon: Building2, team: 'Brand & marketing', pain: 'Fake pages copy your logo and name, and customers blame the brand.',
    gets: ['Logo-copy detection on avatars, icons and pages', 'Official assets excluded, never flagged', 'Bulk checks of any list of URLs'] },
  { Icon: Scale, team: 'Legal & compliance', pain: 'Takedowns stall without clean evidence and the right recipient.',
    gets: ['Drafted takedown notices per platform', 'Evidence log with timestamps', 'A person approves every case'] },
  { Icon: Users, team: 'Leadership', pain: 'No clear picture of exposure or whether the problem is shrinking.',
    gets: ['Executive dashboard by channel and severity', 'One-click executive PDF report', 'Trend across weeks, not anecdotes'] },
];

const STEPS = [
  ['Day 1', 'Register the company', 'Official domains, social pages, apps and logo. These are protected and never flagged.'],
  ['Week 1', 'First sweep', 'Domains, social, app stores and websites are checked; High and Critical results open cases automatically.'],
  ['Week 2', 'Act on evidence', 'Analysts confirm cases and send drafted takedowns. Nothing is sent without a person approving it.'],
  ['Monthly', 'Report to leadership', 'An executive PDF shows exposure, actions taken and what changed.'],
];

const PLANS = [
  { name: 'Pilot', price: 'Free', note: '30 days, one brand', items: ['1 protected brand', 'All four checks + logo check', 'Cases and drafted takedowns', 'Executive PDF report'], cta: 'Start the pilot', primary: false },
  { name: 'Team', price: 'Talk to us', note: 'For one company', items: ['Up to 5 brands or sub-brands', 'Team members and roles', 'Weekly sweeps and alerts', 'Email support'], cta: 'Book a demo', primary: true },
  { name: 'Enterprise', price: 'Talk to us', note: 'Groups and regulated firms', items: ['Unlimited brands', 'SSO and audit export', 'Custom data retention', 'Dedicated analyst onboarding'], cta: 'Contact sales', primary: false },
];

const DEMO_MAIL = 'mailto:itzmayank1211@gmail.com?subject=Suraksha%20demo%20request&body=Company%3A%0ATeam%3A%0ABrands%20to%20protect%3A%0A';

export default function ForCompanies({ container, onDemo }) {
  return (
    <section id="companies" className={`${container} scroll-mt-20 pt-28`}>
      <SectionHead index="05" label="For companies" />
      <Reveal>
        <h2 className="mt-6 max-w-4xl font-display text-[2.2rem] font-semibold leading-[1.05] tracking-[-0.035em] sm:text-5xl">
          One place for every team that deals with <span className="font-serif-display italic lp-gradient-text">fake versions of your company.</span>
        </h2>
        <p className="mt-4 max-w-2xl text-lg text-fgMuted">Security finds them, brand recognises them, legal removes them, leadership sees the trend. Suraksha gives each team the part it needs.</p>
      </Reveal>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {TEAMS.map(({ Icon, team, pain, gets }, i) => (
          <Reveal key={team} delay={i * 60}>
            <article className="h-full rounded-2xl border border-line bg-surface/70 p-5">
              <span className="grid h-10 w-10 place-items-center rounded-xl border border-accent/30 bg-accent/10 text-accent"><Icon className="h-5 w-5" aria-hidden /></span>
              <h3 className="mt-4 text-lg font-semibold text-fg">{team}</h3>
              <p className="mt-1 text-sm text-fgMuted">{pain}</p>
              <ul className="mt-4 space-y-2">
                {gets.map((g) => <li key={g} className="flex gap-2 text-sm text-fg"><Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />{g}</li>)}
              </ul>
            </article>
          </Reveal>
        ))}
      </div>

      <Reveal>
        <div className="mt-16 rounded-3xl border border-line bg-surface/60 p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">How a rollout works</p>
          <ol className="mt-5 grid gap-5 md:grid-cols-4">
            {STEPS.map(([when, title, text], i) => (
              <li key={title} className="relative">
                <p className="font-mono text-xs text-fgSubtle">{String(i + 1).padStart(2, '0')} · {when}</p>
                <p className="mt-1 font-semibold text-fg">{title}</p>
                <p className="mt-1 text-sm text-fgMuted">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </Reveal>

      <div id="pricing" className="mt-16 scroll-mt-24">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">Plans</p>
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {PLANS.map((p) => (
            <Reveal key={p.name}>
              <article className={`flex h-full flex-col rounded-3xl border p-6 ${p.primary ? 'border-accent/60 bg-accent/[0.06] shadow-[0_30px_80px_-40px_rgb(var(--c-accent)/0.6)]' : 'border-line bg-surface/60'}`}>
                <p className="text-sm font-semibold text-fg">{p.name}</p>
                <p className="mt-2 font-display text-3xl font-semibold tracking-tight text-fg">{p.price}</p>
                <p className="text-xs text-fgSubtle">{p.note}</p>
                <ul className="mt-5 flex-1 space-y-2">
                  {p.items.map((it) => <li key={it} className="flex gap-2 text-sm text-fgMuted"><Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />{it}</li>)}
                </ul>
                {p.name === 'Pilot' ? (
                  <button type="button" onClick={onDemo} className="mt-6 inline-flex items-center justify-center gap-2 rounded-full border border-line px-4 py-2.5 text-sm font-semibold text-fg hover:border-accent">{p.cta}<ArrowRight className="h-4 w-4" aria-hidden /></button>
                ) : (
                  <a href={DEMO_MAIL} className={`mt-6 inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold ${p.primary ? 'bg-accent text-onAccent hover:bg-accentHover' : 'border border-line text-fg hover:border-accent'}`}>{p.cta}<ArrowRight className="h-4 w-4" aria-hidden /></a>
                )}
              </article>
            </Reveal>
          ))}
        </div>
        <p className="mt-4 flex items-center gap-2 text-xs text-fgSubtle"><FileText className="h-3.5 w-3.5" aria-hidden />Paid plans are priced per company after a short call. Findings are advisory; a person approves every case and takedown.</p>
      </div>
    </section>
  );
}
