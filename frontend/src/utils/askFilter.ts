import type { AssetType, InvestigationStatus, RiskLevel } from '../types';

/**
 * "Ask in plain English": turns a question into a small, validated set of filters.
 * Deterministic and local: no language model, no query language, nothing is sent anywhere.
 * Whatever it understood is shown back as chips, and whatever it could not use is reported,
 * so the user can always see exactly what was applied.
 */
export interface AskFilters {
  severity?: RiskLevel[];
  status?: InvestigationStatus[];
  notDismissed?: boolean;
  type?: AssetType[];
  maxAgeDays?: number; // newer than
  minAgeDays?: number; // older than
  linked?: boolean;
  text: string[]; // every term must appear in the title, identifier, platform or summary
}

export interface AskResult {
  filters: AskFilters;
  chips: string[];
  ignored: string[];
}

const SEVERITY: Record<string, RiskLevel[]> = {
  critical: ['Critical'], high: ['High'], medium: ['Medium'], moderate: ['Medium'], low: ['Low'], severe: ['Critical', 'High'],
};
const TYPE: Record<string, AssetType> = {
  domain: 'domain', domains: 'domain', url: 'domain', urls: 'domain', lookalike: 'domain', lookalikes: 'domain', website: 'domain', websites: 'domain',
  social: 'social', profile: 'social', profiles: 'social', account: 'social', accounts: 'social', handle: 'social', handles: 'social',
  app: 'app', apps: 'app', mobile: 'app', package: 'app', packages: 'app',
};
const STOP = new Set([
  'show', 'me', 'find', 'list', 'get', 'all', 'the', 'a', 'an', 'any', 'findings', 'finding', 'with', 'that', 'are', 'is', 'of', 'in', 'for', 'and', 'or', 'which',
  'have', 'has', 'been', 'were', 'was', 'from', 'to', 'on', 'only', 'items', 'threats', 'threat', 'issues', 'cases', 'case', 'please', 'what', 'whats', 'new', 'recent',
]);
const UNIT_DAYS: Record<string, number> = { hour: 1 / 24, hours: 1 / 24, day: 1, days: 1, week: 7, weeks: 7, month: 30, months: 30 };

const uniq = <T,>(a: T[]) => Array.from(new Set(a));

export function parseAsk(question: string): AskResult {
  const original = question.trim();
  let q = ` ${original.toLowerCase().replace(/[?!.,;]/g, ' ')} `;
  const f: AskFilters = { text: [] };
  const chips: string[] = [];

  const take = (re: RegExp, fn: (m: RegExpMatchArray) => void) => {
    const m = q.match(re);
    if (m) { fn(m); q = q.replace(re, ' '); }
  };

  // Time: "last 7 days", "past 2 weeks", "older than 30 days", "today", "this week"
  take(/\b(?:older than|more than)\s+(\d+)\s+(hours?|days?|weeks?|months?)(?:\s+old)?\b/, (m) => { f.minAgeDays = +m[1] * UNIT_DAYS[m[2]]; chips.push(`older than ${m[1]} ${m[2]}`); });
  take(/\b(?:in the |from the )?(?:last|past)\s+(\d+)\s+(hours?|days?|weeks?|months?)\b/, (m) => { f.maxAgeDays = +m[1] * UNIT_DAYS[m[2]]; chips.push(`last ${m[1]} ${m[2]}`); });
  take(/\b(?:in the |from the )?(?:last|past)\s+(day|week|month)\b/, (m) => { f.maxAgeDays = UNIT_DAYS[m[1]]; chips.push(`last ${m[1]}`); });
  take(/\btoday\b/, () => { f.maxAgeDays = 1; chips.push('today'); });
  take(/\bthis week\b/, () => { f.maxAgeDays = 7; chips.push('this week'); });

  // Status
  take(/\b(?:unreviewed|untriaged|not (?:yet )?(?:reviewed|investigated|triaged))\b/, () => { f.status = uniq([...(f.status || []), 'New']); chips.push('status: New'); });
  take(/\b(?:investigating|in progress|under investigation)\b/, () => { f.status = uniq([...(f.status || []), 'Investigating']); chips.push('status: Investigating'); });
  take(/\bconfirmed(?: suspicious)?\b/, () => { f.status = uniq([...(f.status || []), 'Confirmed Suspicious']); chips.push('status: Confirmed'); });
  take(/\b(?:dismissed|false positives?)\b/, () => { f.status = uniq([...(f.status || []), 'Dismissed']); chips.push('status: Dismissed'); });
  take(/\b(?:open|unresolved|active)\b/, () => { f.notDismissed = true; chips.push('not dismissed'); });

  // Connectedness
  take(/\b(?:linked|connected|related|with links)\b/, () => { f.linked = true; chips.push('has observed links'); });

  // Severity and type are single words, possibly several
  const rest: string[] = [];
  for (const raw of q.split(/\s+/).filter(Boolean)) {
    const w = raw.replace(/^"|"$/g, '');
    if (SEVERITY[w]) { f.severity = uniq([...(f.severity || []), ...SEVERITY[w]]); continue; }
    if (TYPE[w]) { f.type = uniq([...(f.type || []), TYPE[w]]); continue; }
    if (STOP.has(w)) continue;
    rest.push(w);
  }
  if (f.severity) chips.push(`severity: ${f.severity.join(' or ')}`);
  if (f.type) chips.push(`type: ${f.type.join(' or ')}`);

  // Anything left is treated as a text search term; very short fragments are reported as ignored.
  const ignored: string[] = [];
  for (const w of rest) (w.length >= 3 ? f.text : ignored).push(w);
  if (f.text.length) chips.push(`text: ${f.text.join(' ')}`);
  return { filters: f, chips, ignored };
}

interface Row {
  title: string; identifier: string; platform: string; summary: string; type: AssetType;
  riskCategory: RiskLevel; status: InvestigationStatus; createdDate: string;
}

export function matchesAsk(c: Row, f: AskFilters, linkedCount = 0, now = Date.now()): boolean {
  if (f.severity && !f.severity.includes(c.riskCategory)) return false;
  if (f.status && !f.status.includes(c.status)) return false;
  if (f.notDismissed && c.status === 'Dismissed') return false;
  if (f.type && !f.type.includes(c.type)) return false;
  if (f.linked && linkedCount === 0) return false;
  const t = Date.parse(c.createdDate);
  if ((f.maxAgeDays !== undefined || f.minAgeDays !== undefined) && Number.isNaN(t)) return false;
  const ageDays = (now - t) / 86400000;
  if (f.maxAgeDays !== undefined && ageDays > f.maxAgeDays) return false;
  if (f.minAgeDays !== undefined && ageDays < f.minAgeDays) return false;
  if (f.text.length) {
    const hay = `${c.title} ${c.identifier} ${c.platform} ${c.summary}`.toLowerCase();
    if (!f.text.every((w) => hay.includes(w))) return false;
  }
  return true;
}
