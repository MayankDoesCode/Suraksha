import type { BrandProfile, RiskLevel } from '../types';
const LOGO_MATCH_STRONG = 0.88; // keep in sync with imageHash.ts
const LOGO_MATCH_LIKELY = 0.80;

// Rule-based mobile-app impersonation engine. Official apps are excluded first; every other
// verdict is explained by named signals. Missing information is reported, never guessed.

export interface AppCandidateInput {
  name: string;
  developer: string;
  store: string;
  storeUrl?: string;
  packageId?: string;
  description?: string;
  observedBranding?: string;
  evidence?: string;
  /** 0..1 icon-vs-official-logo similarity, when an icon was supplied and comparable. */
  logoSimilarity?: number;
  logoNote?: string; // why the icon check was skipped
}

export interface AppSignal {
  type: string;
  title: string;
  detail: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface AppAnalysis {
  candidateName: string;
  developer: string;
  store: string;
  riskCategory: RiskLevel;
  heuristicScore: number;
  summary: string;
  developerMismatch: boolean;
  suspiciousPermissions: string[];
  evidenceSupporting: string[];
  evidenceAgainst: string[];
  missingInformation: string[];
  isExcluded: boolean;
  exclusionReason?: string;
  recommendedNextSteps: string[];
  analysisEngine: string;
  signals: AppSignal[];
  nameSimilarity: number;
  descriptionSimilarity: number;
}

const GENERIC_WORDS = new Set([
  'bank', 'banking', 'pay', 'payments', 'payment', 'app', 'group', 'official', 'india', 'limited', 'ltd',
  'technologies', 'technology', 'tech', 'finance', 'financial', 'mobile', 'wallet', 'online', 'digital',
  'services', 'service', 'global', 'international', 'company', 'corp', 'corporation', 'inc', 'store', 'shop',
  'money', 'card', 'cards', 'insurance', 'capital', 'holdings', 'the', 'and',
]);
const STOP = new Set(['the', 'and', 'for', 'with', 'your', 'you', 'our', 'are', 'app', 'apps', 'this', 'that', 'from', 'all', 'can', 'get', 'use', 'new', 'more', 'now', 'has', 'have', 'will', 'not', 'its', 'any', 'per', 'via', 'also', 'into', 'out', 'one']);
const LURE = /\b(loan|loans|instant|cash|cashback|rewards?|free|bonus|claim|refund|lottery|giveaway|prize|earn)\b/i;
const CONFUSABLES: Record<string, string> = { 'а': 'a', 'е': 'e', 'о': 'o', 'р': 'p', 'с': 'c', 'х': 'x', 'ѕ': 's', 'і': 'i', 'ј': 'j', 'α': 'a', 'ο': 'o', 'ν': 'v' };
const LEET: Record<string, string> = { '0': 'o', '1': 'l', '3': 'e', '4': 'a', '5': 's', '7': 't', '$': 's', '@': 'a' };
const TRUSTED_STORE = /google play|app store|apple|appgallery|galaxy store/i;
const UNTRUSTED_STORE = /third-party|direct apk|apk mirror|sideload|apkpure|mirror/i;

export function fold(text: string): string {
  const base = (text || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase();
  let out = '';
  for (const ch of base) out += CONFUSABLES[ch] ?? ch;
  return out;
}
function deleet(text: string): string {
  return fold(text).replace(/[013457$@]/g, c => LEET[c] ?? c);
}
export function compact(text: string): string {
  return fold(text).replace(/[^a-z0-9]/g, '');
}
function compactDeleet(text: string): string {
  return deleet(text).replace(/[^a-z0-9]/g, '');
}
function words(text: string): string[] {
  return deleet(text).split(/[^a-z0-9]+/).filter(Boolean);
}

function damerau(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) d[i][0] = i;
  for (let j = 0; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}
export function similarity(a: string, b: string): number {
  const ca = compactDeleet(a), cb = compactDeleet(b);
  if (!ca || !cb) return 0;
  if (ca === cb) return 1;
  return 1 - damerau(ca, cb) / Math.max(ca.length, cb.length);
}
export function textCosine(a: string, b: string): number {
  const tok = (t: string) => (fold(t).match(/[a-z0-9]{3,}/g) || []).filter(w => !STOP.has(w));
  const count = (ws: string[]) => ws.reduce<Record<string, number>>((m, w) => ((m[w] = (m[w] || 0) + 1), m), {});
  const ca = count(tok(a)), cb = count(tok(b));
  const keys = Object.keys(ca).filter(k => k in cb);
  const dot = keys.reduce((s, k) => s + ca[k] * cb[k], 0);
  const na = Math.sqrt(Object.values(ca).reduce((s, v) => s + v * v, 0));
  const nb = Math.sqrt(Object.values(cb).reduce((s, v) => s + v * v, 0));
  return na && nb ? Math.round((dot / (na * nb)) * 1000) / 1000 : 0;
}

function distinctiveTokens(brandName: string, keywords: string[] = []): string[] {
  const set = new Set<string>();
  for (const w of words(brandName)) if (w.length >= 4 && !GENERIC_WORDS.has(w)) set.add(w);
  for (const k of keywords) { const c = compactDeleet(k); if (c.length >= 4 && !GENERIC_WORDS.has(c)) set.add(c); }
  return [...set];
}

export function analyzeAppCandidate(input: AppCandidateInput, brand: BrandProfile): AppAnalysis {
  const analysisEngine = 'Suraksha App Impersonation Engine v2 (rules + logo match)';
  const name = input.name.trim();
  const developer = (input.developer || '').trim();
  const store = input.store || '';
  const officialApps = brand.officialApps || [];
  const brandName = brand.brandName || '';
  const untrustedStore = UNTRUSTED_STORE.test(store);
  const trustedStore = TRUSTED_STORE.test(store) && !untrustedStore;

  const base = {
    candidateName: name, developer, store, analysisEngine,
    suspiciousPermissions: [] as string[], missingInformation: [] as string[],
    signals: [] as AppSignal[], nameSimilarity: 0, descriptionSimilarity: 0,
  };

  // ---------- 1. Official exclusion (before any scoring) ----------
  const officialDevs = officialApps.map(a => compact(a.developer)).filter(Boolean);
  const devCompact = compact(developer);
  const pkg = (input.packageId || '').trim().toLowerCase();

  for (const off of officialApps) {
    const samePackage = !!pkg && !!off.appId && pkg === off.appId.trim().toLowerCase();
    const sameNameAndDev = compact(name) === compact(off.name) && devCompact !== '' && devCompact === compact(off.developer);
    if ((samePackage || sameNameAndDev) && !untrustedStore) {
      return {
        ...base, riskCategory: 'Low', heuristicScore: 5, developerMismatch: false,
        summary: 'Matches a verified official application in the brand profile.',
        evidenceSupporting: [], evidenceAgainst: [
          samePackage ? `Package ID ${off.appId} matches the verified official app.` : 'Name and publisher match the verified official app.',
          'Official assets are excluded from detection.',
        ],
        isExcluded: true, exclusionReason: 'Allowlisted in Official Brand Profile',
        recommendedNextSteps: ['Keep monitoring the listing for unexpected version or publisher changes.'],
      };
    }
  }
  const publisherVerified = devCompact !== '' && officialDevs.some(d => d === devCompact || (d.length >= 6 && devCompact.length >= 6 && (d.includes(devCompact) || devCompact.includes(d)) && Math.abs(d.length - devCompact.length) <= 4));
  if (publisherVerified && trustedStore) {
    return {
      ...base, riskCategory: 'Low', heuristicScore: 8, developerMismatch: false,
      summary: 'Published by a registered official developer on a trusted store.',
      evidenceSupporting: [], evidenceAgainst: [`Developer "${developer}" is a registered official publisher.`, 'Other apps from a verified publisher are not treated as impersonation.'],
      isExcluded: true, exclusionReason: 'Verified publisher family on a trusted store',
      recommendedNextSteps: ['Add this app to the official catalog if it is a genuine product.'],
    };
  }

  // Authorized partner (contracted co-branding): mitigates name/publisher signals, never hides them.
  const partner = (brand.authorizedPartners || []).find(p => {
    const lead = words(p.name).find(w => w.length >= 5 && !GENERIC_WORDS.has(w));
    return devCompact !== '' && (similarity(developer, p.name) >= 0.75 || (!!lead && devCompact.includes(lead)));
  });
  const partnerOk = !!partner && !untrustedStore;

  // ---------- 2. Signals ----------
  const signals: AppSignal[] = [];
  const add = (type: string, title: string, detail: string, severity: AppSignal['severity']) => signals.push({ type, title, detail, severity });

  const tokens = distinctiveTokens(brandName, brand.protectedKeywords);
  const titleWords = new Set(words(name));
  const titleCompact = compactDeleet(name);
  const brandCompact = compactDeleet(brandName);
  const targets = [brandName, ...officialApps.map(a => a.name)].filter(Boolean);
  const nameSim = Math.max(0, ...targets.map(t => similarity(name, t)));
  const exactNameClone = targets.some(t => compactDeleet(t) && compactDeleet(t) === titleCompact);
  const containsBrand = brandCompact.length >= 4 && titleCompact.includes(brandCompact);
  const tokenHit = tokens.filter(t => titleWords.has(t) || titleCompact.startsWith(t) || titleCompact.includes(t));

  if (exactNameClone) {
    add('IDENTICAL_APP_NAME', 'Identical app name', `"${name}" is identical to a verified official app or the brand name, but the publisher/package is not verified.`, 'critical');
  } else if (nameSim >= 0.8 || containsBrand) {
    add('APP_NAME_SIMILARITY', 'Look-alike app name', `Title resembles the brand (${Math.round(nameSim * 100)}% similar${containsBrand ? '; contains the full brand name' : ''}) - covers character swaps, spacing and added words.`, partnerOk ? 'medium' : 'high');
  } else if (tokenHit.length > 0) {
    add('BRAND_WORD_IN_TITLE', 'Brand word reused in title', `Title reuses the distinctive brand word(s) ${tokenHit.map(t => `"${t}"`).join(', ')} with extra words; developer is not an authorized publisher.`, 'medium');
  }
  const nameAssociated = signals.length > 0;

  // package id
  if (pkg) {
    const segs = pkg.split(/[._]/).filter(Boolean);
    const pkgMimic = (brandCompact.length >= 4 && compact(pkg).includes(brandCompact)) || tokens.some(t => segs.some(s => s.startsWith(t)));
    if (pkgMimic) add('PACKAGE_ID_MIMICRY', 'Package ID mimics the brand', `Package "${pkg}" embeds the brand name but does not match any verified official package ID.`, 'high');
  } else {
    base.missingInformation.push('Package ID not provided - package-level checks skipped.');
  }

  // icon
  const iconSim = input.logoSimilarity;
  const iconStrong = typeof iconSim === 'number' && iconSim >= LOGO_MATCH_STRONG;
  const iconLikely = typeof iconSim === 'number' && iconSim >= LOGO_MATCH_LIKELY;
  if (iconLikely) {
    add('ICON_SIMILARITY', 'Icon copies the official logo', `App icon is ${iconStrong ? 'nearly identical' : 'visually very similar'} to the official logo (${Math.round((iconSim as number) * 100)}% visual similarity).`, iconStrong ? 'high' : 'medium');
  } else if (input.logoNote) {
    base.missingInformation.push(`Icon comparison skipped: ${input.logoNote}`);
  }

  // description
  const desc = (input.description || '').trim();
  const refText = [brand.brandDescription || '', brandName, ...officialApps.map(a => a.name)].join(' ');
  const descSim = desc ? textCosine(desc, refText) : 0;
  const namesBrand = brandCompact.length >= 4 && compactDeleet(desc).includes(brandCompact);
  if (desc && (descSim >= 0.45 || (namesBrand && (nameAssociated || iconLikely)))) {
    add('DESCRIPTION_SIMILARITY', 'Description resembles the brand', `Listing text is ${Math.round(descSim * 100)}% similar to the brand's own wording${namesBrand ? ' and names the brand while the developer is unverified' : ''}.`, descSim >= 0.6 ? 'high' : 'medium');
  }
  if (!desc) base.missingInformation.push('Store description not provided - description checks skipped.');

  const brandAssociated = signals.length > 0;

  // publisher
  if (developer) {
    const closest = Math.max(0, ...officialApps.map(a => similarity(developer, a.developer)));
    if (closest >= 0.8 && closest < 1) {
      add('PUBLISHER_IMITATION', 'Developer name imitates an authorized publisher', `"${developer}" is ${Math.round(closest * 100)}% similar to a registered publisher but not identical.`, 'high');
    } else if (brandAssociated && !partnerOk) {
      add('PUBLISHER_MISMATCH', 'Unverified publisher', `Developer "${developer}" is not a registered publisher for ${brandName}. A mismatch alone is not proof; it matters because the app also resembles the brand.`, 'high');
    }
  } else {
    base.missingInformation.push('Developer name not provided - publisher check skipped (missing is not treated as a mismatch).');
  }

  if (partnerOk && partner) {
    add('AUTHORIZED_PARTNER', 'Authorized partner', `Developer matches registered partner "${partner.name}" (${partner.relationshipType}). Co-branding is expected; review it against the partner agreement${partner.agreementReference ? ` (${partner.agreementReference})` : ''}.`, 'low');
  }

  // store + lure + permissions (only escalate when brand-associated, except permissions)
  if (untrustedStore && brandAssociated) add('UNTRUSTED_DISTRIBUTION', 'Untrusted distribution channel', `Distributed via ${store} rather than an official store.`, 'high');
  if (brandAssociated && LURE.test(`${name} ${desc}`)) add('LURE_TERMS', 'Financial lure terms', 'Title/description uses lure terms (loan, instant cash, rewards, bonus) alongside brand identity.', 'medium');

  const evidenceText = input.evidence || '';
  const perms: string[] = [];
  if (/read_sms/i.test(evidenceText)) perms.push('android.permission.READ_SMS');
  if (/read_contacts/i.test(evidenceText)) perms.push('android.permission.READ_CONTACTS');
  if (/system_alert_window/i.test(evidenceText)) perms.push('android.permission.SYSTEM_ALERT_WINDOW');
  if (perms.length) add('ABUSIVE_PERMISSIONS', 'High-risk permissions', `Manifest requests ${perms.join(', ')} (SMS/contacts interception or overlay risk).`, brandAssociated ? 'high' : 'medium');

  // ---------- 3. Score ----------
  const weight = { critical: 40, high: 22, medium: 11, low: 3 } as const;
  let score = signals.reduce((s, x) => s + weight[x.severity], 0);
  if (!signals.length) score = 4;
  score = Math.min(100, score);
  let riskCategory: RiskLevel = 'Low';
  if (score >= 70 || signals.some(s => s.severity === 'critical')) riskCategory = 'Critical';
  else if (score >= 45 || signals.some(s => s.severity === 'high')) riskCategory = 'High';
  else if (score >= 20 || signals.some(s => s.severity === 'medium')) riskCategory = 'Medium';

  const unrelated = !brandAssociated && perms.length === 0;
  const evidenceSupporting = signals.map(s => `${s.title}: ${s.detail}`);
  const evidenceAgainst: string[] = [];
  if (unrelated) evidenceAgainst.push('No resemblance to the brand name, icon, description or package was found.');
  if (partnerOk && partner) evidenceAgainst.push(`Developer is an authorized partner (${partner.relationshipType}).`);
  if (publisherVerified && !trustedStore) evidenceAgainst.push('Publisher name matches an official developer, but the store is not a trusted one.');

  const next = riskCategory === 'Critical' || riskCategory === 'High'
    ? ['Submit a trademark / impersonation report to the store operator.', 'Capture store listing, icon and publisher page as evidence.', 'Block the package ID / signing certificate on managed devices and warn customers.']
    : riskCategory === 'Medium'
      ? ['Keep under surveillance and re-check the listing for changes.', 'Verify the developer\'s relationship to the brand.']
      : ['No action needed. Keep the snapshot to avoid re-alerting.'];

  const summary = unrelated
    ? 'Low risk: the app does not resemble the brand.'
    : `${riskCategory} risk: ${signals.filter(s => s.severity !== 'low').map(s => s.title.toLowerCase()).slice(0, 3).join('; ')}.`;

  return {
    ...base, riskCategory, heuristicScore: score, summary,
    developerMismatch: signals.some(s => s.type === 'PUBLISHER_MISMATCH' || s.type === 'PUBLISHER_IMITATION'),
    suspiciousPermissions: perms, evidenceSupporting, evidenceAgainst,
    isExcluded: false, recommendedNextSteps: next, signals,
    nameSimilarity: Math.round(nameSim * 100) / 100, descriptionSimilarity: descSim,
  };
}
