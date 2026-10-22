import type { BrandProfile, CandidateAsset, RiskLevel, StringSignal } from '../types';

export interface CharacterDiff {
  original: string;
  substituted: string;
  index: number;
  type: 'homoglyph' | 'substitution' | 'insertion' | 'deletion' | 'transposition' | 'accent';
  explanation: string;
}

export interface DomainAnalysisDetails {
  candidateRaw: string;
  normalizedHostname: string;
  extractedSLD: string; // Second Level Domain e.g. "sentinelpay" in "sentinelpay.com"
  extractedTLD: string; // Top Level Domain e.g. "com", "io", "xyz"
  subdomains: string[];
  isSubdomainAbuse: boolean;
  isDeceptiveTLD: boolean;
  matchedOfficialDomain?: string;
  isOfficialMatch: boolean;
  isPartnerMatch: boolean;
  domainSimilarityScore: number;
}

export interface DetailedSignal {
  id: string;
  category: 'Exact & Normalization' | 'Edit Distance' | 'Homoglyphs & Unicode' | 'Lure Words & Combos' | 'Domain & TLD' | 'Subdomain Abuse';
  type: string;
  title: string;
  detail: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  mitigatingFactor?: string;
}

export interface LookalikeAnalysisResult {
  candidateName: string;
  candidateDomain: string;
  candidateDescription?: string;
  officialBrand: string;
  officialDomains: string[];

  // Algorithmic Metrics
  overallRiskCategory: RiskLevel;
  overallScore: number; // 0 - 100
  nameSimilarityScore: number; // 0 - 100
  domainSimilarityScore: number; // 0 - 100
  levenshteinDistance: number;
  damerauDistance: number;

  // Signal breakdowns
  signals: DetailedSignal[];
  characterDiffs: CharacterDiff[];
  detectedLureWords: string[];
  scriptCategories: { script: string; count: number; characters: string[] }[];
  isMixedScript: boolean;

  // Domain specifics
  domainDetails?: DomainAnalysisDetails;

  // Explainability
  analyzedAt: string;
  isExactNameMatch: boolean;
  isExactDomainMatch: boolean;
  isOfficialAsset: boolean;
  isAuthorizedPartner: boolean;
  
  evidenceSupporting: string[];
  evidenceAgainst: string[];
  counterEvidence: string[];
  recommendedAction: string;
  recommendedNextSteps: string[];
  executiveSummary: string;
}

// ----------------------------------------------------
// HOMOGLYPH & UNICODE LOOK-ALIKE DICTIONARIES
// ----------------------------------------------------

export const HOMOGLYPH_MAP: Record<string, { char: string; name: string; script: string }[]> = {
  a: [
    { char: 'а', name: 'Cyrillic Small Letter A (U+0430)', script: 'Cyrillic' },
    { char: 'ä', name: 'Latin Small Letter A with Diaeresis (U+00E4)', script: 'Latin-Ext' },
    { char: 'á', name: 'Latin Small Letter A with Acute (U+00E1)', script: 'Latin-Ext' },
    { char: 'à', name: 'Latin Small Letter A with Grave (U+00E0)', script: 'Latin-Ext' },
    { char: 'â', name: 'Latin Small Letter A with Circumflex (U+00E2)', script: 'Latin-Ext' },
    { char: 'ã', name: 'Latin Small Letter A with Tilde (U+00E3)', script: 'Latin-Ext' },
    { char: 'å', name: 'Latin Small Letter A with Ring Above (U+00E5)', script: 'Latin-Ext' },
    { char: 'ɑ', name: 'Latin Small Letter Alpha (U+0251)', script: 'IPA' },
    { char: '4', name: 'Digit Four', script: 'ASCII Digit' },
    { char: '@', name: 'At Symbol', script: 'ASCII Symbol' },
  ],
  b: [
    { char: 'Ь', name: 'Cyrillic Soft Sign (U+042C)', script: 'Cyrillic' },
    { char: 'Ꮟ', name: 'Cherokee Letter Si (U+13F1)', script: 'Cherokee' },
    { char: '8', name: 'Digit Eight', script: 'ASCII Digit' },
  ],
  c: [
    { char: 'с', name: 'Cyrillic Small Letter Es (U+0441)', script: 'Cyrillic' },
    { char: 'ç', name: 'Latin Small Letter C with Cedilla (U+00E7)', script: 'Latin-Ext' },
    { char: 'ć', name: 'Latin Small Letter C with Acute (U+0107)', script: 'Latin-Ext' },
    { char: '(', name: 'Open Parenthesis', script: 'ASCII Symbol' },
  ],
  d: [
    { char: 'ԁ', name: 'Cyrillic Small Letter Komi De (U+0501)', script: 'Cyrillic' },
    { char: 'cl', name: 'Digraph c + l', script: 'Compound' },
  ],
  e: [
    { char: 'е', name: 'Cyrillic Small Letter Ie (U+0435)', script: 'Cyrillic' },
    { char: 'é', name: 'Latin Small Letter E with Acute (U+00E9)', script: 'Latin-Ext' },
    { char: 'è', name: 'Latin Small Letter E with Grave (U+00E8)', script: 'Latin-Ext' },
    { char: 'ê', name: 'Latin Small Letter E with Circumflex (U+00EA)', script: 'Latin-Ext' },
    { char: 'ë', name: 'Latin Small Letter E with Diaeresis (U+00EB)', script: 'Latin-Ext' },
    { char: '3', name: 'Digit Three', script: 'ASCII Digit' },
    { char: 'ε', name: 'Greek Small Letter Epsilon (U+03B5)', script: 'Greek' },
  ],
  i: [
    { char: 'і', name: 'Cyrillic Small Letter Byelorussian-Ukrainian I (U+0456)', script: 'Cyrillic' },
    { char: 'í', name: 'Latin Small Letter I with Acute (U+00ED)', script: 'Latin-Ext' },
    { char: 'ì', name: 'Latin Small Letter I with Grave (U+00EC)', script: 'Latin-Ext' },
    { char: 'ï', name: 'Latin Small Letter I with Diaeresis (U+00EF)', script: 'Latin-Ext' },
    { char: '1', name: 'Digit One', script: 'ASCII Digit' },
    { char: '|', name: 'Vertical Line', script: 'ASCII Symbol' },
    { char: '!', name: 'Exclamation Mark', script: 'ASCII Symbol' },
  ],
  l: [
    { char: '1', name: 'Digit One', script: 'ASCII Digit' },
    { char: '|', name: 'Vertical Line', script: 'ASCII Symbol' },
    { char: 'ӏ', name: 'Cyrillic Small Letter Palochka (U+04CF)', script: 'Cyrillic' },
  ],
  m: [
    { char: 'rn', name: 'Digraph r + n', script: 'Compound' },
    { char: 'nn', name: 'Digraph n + n', script: 'Compound' },
    { char: 'м', name: 'Cyrillic Small Letter Em (U+043C)', script: 'Cyrillic' },
  ],
  n: [
    { char: 'п', name: 'Cyrillic Small Letter Pe (U+043F)', script: 'Cyrillic' },
    { char: 'ñ', name: 'Latin Small Letter N with Tilde (U+00F1)', script: 'Latin-Ext' },
  ],
  o: [
    { char: 'о', name: 'Cyrillic Small Letter O (U+043E)', script: 'Cyrillic' },
    { char: '0', name: 'Digit Zero', script: 'ASCII Digit' },
    { char: 'ö', name: 'Latin Small Letter O with Diaeresis (U+00F6)', script: 'Latin-Ext' },
    { char: 'ó', name: 'Latin Small Letter O with Acute (U+00F3)', script: 'Latin-Ext' },
    { char: 'ò', name: 'Latin Small Letter O with Grave (U+00F2)', script: 'Latin-Ext' },
    { char: 'ô', name: 'Latin Small Letter O with Circumflex (U+00F4)', script: 'Latin-Ext' },
    { char: 'ο', name: 'Greek Small Letter Omicron (U+03BF)', script: 'Greek' },
  ],
  p: [
    { char: 'р', name: 'Cyrillic Small Letter Er (U+0440)', script: 'Cyrillic' },
    { char: 'ρ', name: 'Greek Small Letter Rho (U+03C1)', script: 'Greek' },
  ],
  r: [
    { char: 'г', name: 'Cyrillic Small Letter Ghe (U+0433)', script: 'Cyrillic' },
  ],
  s: [
    { char: 'ѕ', name: 'Cyrillic Small Letter Dze (U+0455)', script: 'Cyrillic' },
    { char: '5', name: 'Digit Five', script: 'ASCII Digit' },
    { char: '$', name: 'Dollar Sign', script: 'ASCII Symbol' },
    { char: 'ş', name: 'Latin Small Letter S with Cedilla (U+015F)', script: 'Latin-Ext' },
  ],
  t: [
    { char: '7', name: 'Digit Seven', script: 'ASCII Digit' },
    { char: '+', name: 'Plus Sign', script: 'ASCII Symbol' },
    { char: 'т', name: 'Cyrillic Small Letter Te (U+0442)', script: 'Cyrillic' },
  ],
  u: [
    { char: 'μ', name: 'Greek Small Letter Mu (U+03BC)', script: 'Greek' },
    { char: 'ü', name: 'Latin Small Letter U with Diaeresis (U+00FC)', script: 'Latin-Ext' },
    { char: 'ú', name: 'Latin Small Letter U with Acute (U+00FA)', script: 'Latin-Ext' },
  ],
  v: [
    { char: 'ν', name: 'Greek Small Letter Nu (U+03BD)', script: 'Greek' },
  ],
  w: [
    { char: 'vv', name: 'Digraph v + v', script: 'Compound' },
    { char: 'ш', name: 'Cyrillic Small Letter Sha (U+0448)', script: 'Cyrillic' },
    { char: 'ω', name: 'Greek Small Letter Omega (U+03C9)', script: 'Greek' },
  ],
  x: [
    { char: 'х', name: 'Cyrillic Small Letter Kha (U+0445)', script: 'Cyrillic' },
    { char: '×', name: 'Multiplication Sign (U+00D7)', script: 'Math' },
  ],
  y: [
    { char: 'у', name: 'Cyrillic Small Letter U (U+0443)', script: 'Cyrillic' },
    { char: 'ý', name: 'Latin Small Letter Y with Acute (U+00FD)', script: 'Latin-Ext' },
  ],
};

// High-Risk Trust / Credential Lure Keywords
export const LURE_KEYWORDS: { word: string; category: string; severity: 'high' | 'medium' }[] = [
  // Support & Helpdesk
  { word: 'support', category: 'Helpdesk & Assistance', severity: 'high' },
  { word: 'helpdesk', category: 'Helpdesk & Assistance', severity: 'high' },
  { word: 'help', category: 'Helpdesk & Assistance', severity: 'medium' },
  { word: 'care', category: 'Customer Care', severity: 'medium' },
  { word: 'assist', category: 'Helpdesk & Assistance', severity: 'medium' },
  { word: 'agent', category: 'Impersonation Role', severity: 'high' },
  { word: 'bot', category: 'Automated Service', severity: 'medium' },
  { word: 'desk', category: 'Helpdesk & Assistance', severity: 'medium' },
  // Security & Authentication
  { word: 'security', category: 'Security & Auth', severity: 'high' },
  { word: 'login', category: 'Credential Access', severity: 'high' },
  { word: 'signin', category: 'Credential Access', severity: 'high' },
  { word: 'verify', category: 'Verification Phishing', severity: 'high' },
  { word: 'auth', category: 'Credential Access', severity: 'high' },
  { word: 'portal', category: 'Access Gate', severity: 'high' },
  { word: 'secure', category: 'Trust Lure', severity: 'medium' },
  { word: 'recovery', category: 'Account Recovery Lure', severity: 'high' },
  { word: 'unlock', category: 'Account Recovery Lure', severity: 'high' },
  { word: '2fa', category: 'Credential Access', severity: 'high' },
  // Finance, Claims, Rewards & Crypto
  { word: 'wallet', category: 'Asset Storage', severity: 'high' },
  { word: 'claim', category: 'Financial Incentive', severity: 'high' },
  { word: 'claims', category: 'Financial Incentive', severity: 'high' },
  { word: 'refund', category: 'Financial Incentive', severity: 'high' },
  { word: 'rewards', category: 'Financial Incentive', severity: 'high' },
  { word: 'airdrop', category: 'Crypto Lure', severity: 'high' },
  { word: 'bonus', category: 'Financial Incentive', severity: 'high' },
  { word: 'payment', category: 'Financial Transaction', severity: 'high' },
  { word: 'token', category: 'Crypto Asset', severity: 'medium' },
  { word: 'cash', category: 'Financial Asset', severity: 'medium' },
  // Authority & Status
  { word: 'official', category: 'Authority Claim', severity: 'high' },
  { word: 'app', category: 'Client Application', severity: 'medium' },
  { word: 'team', category: 'Staff Impersonation', severity: 'medium' },
  { word: 'global', category: 'Corporate Lure', severity: 'medium' },
  { word: 'center', category: 'Corporate Lure', severity: 'medium' },
  { word: 'hq', category: 'Corporate Lure', severity: 'medium' },
  { word: 'direct', category: 'Direct Access', severity: 'medium' },
];

// Suspicious / Deceptive TLDs frequently abused in typosquatting campaigns
export const DECEPTIVE_TLDS = [
  'xyz', 'top', 'online', 'live', 'support', 'app', 'site', 'club',
  'cc', 'tk', 'ml', 'ga', 'cf', 'gq', 'vip', 'work', 'link', 'click',
  'co', 'cm', 'pw', 'su', 'buzz', 'icu', 'rest', 'kim', 'loan'
];

// ----------------------------------------------------
// NORMALIZATION & EXTRACTION HELPERS
// ----------------------------------------------------

/**
 * Normalizes strings by lowercasing, trimming, removing zero-width characters,
 * and normalizing Unicode (NFKC).
 */
export function normalizeString(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFKC')
    .toLowerCase()
    .trim()
    .replace(/[\u200B-\u200D\uFEFF]/g, ''); // strip zero-width spaces
}

/**
 * Normalizes domain strings and extracts hostname, subdomains, SLD, and TLD.
 * Strips URL protocol, query strings, and trailing slashes.
 */
export function normalizeDomain(rawDomain: string): DomainAnalysisDetails {
  const cleanInput = (rawDomain || '').trim().toLowerCase();
  
  // Strip protocols
  let stripped = cleanInput
    .replace(/^https?:\/\//i, '')
    .replace(/^ftp:\/\//i, '')
    .replace(/^\/\//, '');

  // Strip path, query string, hash
  stripped = stripped.split('/')[0].split('?')[0].split('#')[0].split(':')[0].trim();

  // Strip leading www.
  const withoutWww = stripped.replace(/^www\./i, '');

  const parts = withoutWww.split('.').filter(Boolean);
  let sld = '';
  let tld = '';
  const subdomains: string[] = [];

  if (parts.length >= 2) {
    // Handle compound TLDs like co.uk, com.au, org.uk
    const lastPart = parts[parts.length - 1];
    const secondLast = parts[parts.length - 2];
    const isCompound = ['co', 'com', 'org', 'net', 'edu', 'gov'].includes(secondLast) && parts.length > 2;

    if (isCompound) {
      tld = `${secondLast}.${lastPart}`;
      sld = parts[parts.length - 3] || '';
      for (let i = 0; i < parts.length - 3; i++) {
        subdomains.push(parts[i]);
      }
    } else {
      tld = lastPart;
      sld = secondLast;
      for (let i = 0; i < parts.length - 2; i++) {
        subdomains.push(parts[i]);
      }
    }
  } else if (parts.length === 1) {
    sld = parts[0];
    tld = '';
  }

  return {
    candidateRaw: rawDomain,
    normalizedHostname: withoutWww,
    extractedSLD: sld,
    extractedTLD: tld,
    subdomains,
    isSubdomainAbuse: false,
    isDeceptiveTLD: false,
    isOfficialMatch: false,
    isPartnerMatch: false,
    domainSimilarityScore: 0,
  };
}

// ----------------------------------------------------
// ALGORITHMIC DISTANCE FUNCTIONS
// ----------------------------------------------------

/**
 * Standard Levenshtein Distance
 */
export function computeLevenshtein(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,       // deletion
        dp[i][j - 1] + 1,       // insertion
        dp[i - 1][j - 1] + cost // substitution
      );
    }
  }
  return dp[m][n];
}

/**
 * Damerau-Levenshtein Distance (includes transpositions of adjacent characters)
 */
export function computeDamerauLevenshtein(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,       // deletion
        dp[i][j - 1] + 1,       // insertion
        dp[i - 1][j - 1] + cost // substitution
      );

      // Transposition check
      if (i > 1 && j > 1 && s1[i - 1] === s2[j - 2] && s1[i - 2] === s2[j - 1]) {
        dp[i][j] = Math.min(dp[i][j], dp[i - 2][j - 2] + 1);
      }
    }
  }
  return dp[m][n];
}

// ----------------------------------------------------
// UNICODE SCRIPT ANALYSIS
// ----------------------------------------------------

export function detectUnicodeScripts(input: string): {
  scripts: { script: string; count: number; characters: string[] }[];
  isMixedScript: boolean;
} {
  const scriptMap: Record<string, string[]> = {};

  for (const char of input) {
    const code = char.codePointAt(0) || 0;
    let script = 'Common';

    if (code >= 0x0041 && code <= 0x005a) script = 'Latin';
    else if (code >= 0x0061 && code <= 0x007a) script = 'Latin';
    else if (code >= 0x00c0 && code <= 0x024f) script = 'Latin Extended';
    else if (code >= 0x0400 && code <= 0x04ff) script = 'Cyrillic';
    else if (code >= 0x0370 && code <= 0x03ff) script = 'Greek';
    else if (code >= 0x0590 && code <= 0x05ff) script = 'Hebrew';
    else if (code >= 0x0600 && code <= 0x06ff) script = 'Arabic';
    else if (code >= 0x3040 && code <= 0x309f) script = 'Hiragana';
    else if (code >= 0x30a0 && code <= 0x30ff) script = 'Katakana';
    else if (code >= 0x4e00 && code <= 0x9fff) script = 'CJK';
    else if (code >= 0xff00 && code <= 0xffef) script = 'Fullwidth';
    else if (code >= 0x30 && code <= 0x39) script = 'Digit';
    else script = 'Punctuation/Symbol';

    if (!scriptMap[script]) scriptMap[script] = [];
    scriptMap[script].push(char);
  }

  const scripts = Object.entries(scriptMap).map(([script, characters]) => ({
    script,
    count: characters.length,
    characters: Array.from(new Set(characters)),
  }));

  // Mixed-script occurs when alphabetic scripts are combined (e.g. Latin + Cyrillic or Latin + Greek)
  const alphabeticScripts = scripts.filter(s =>
    ['Latin', 'Latin Extended', 'Cyrillic', 'Greek', 'Hebrew', 'Arabic'].includes(s.script)
  );

  const isMixedScript = alphabeticScripts.length > 1;

  return { scripts, isMixedScript };
}

// ----------------------------------------------------
// CORE ENGINE: LOOKALIKE & DOMAIN ANALYSIS
// ----------------------------------------------------

export function runFullLookalikeAnalysis(
  candidateName: string,
  candidateDomainInput: string,
  brandProfile: BrandProfile,
  candidateDescription?: string
): LookalikeAnalysisResult {
  const brandName = brandProfile.brandName || 'Brand';
  const cleanBrand = normalizeString(brandName);
  const cleanCandidateName = normalizeString(candidateName);

  const signals: DetailedSignal[] = [];
  const characterDiffs: CharacterDiff[] = [];
  const detectedLureWords: string[] = [];
  const evidenceSupporting: string[] = [];
  const evidenceAgainst: string[] = [];
  const counterEvidence: string[] = [];
  const nextSteps: string[] = [];

  let overallScore = 0;

  // 1. EXACT MATCH & AUTHORIZED STATUS AUDIT
  const isExactNameMatch = cleanCandidateName === cleanBrand && candidateName.length > 0;
  
  // Check if candidate matches official domains
  const normalizedCandidateDomain = normalizeDomain(candidateDomainInput);
  const officialDomainsNormalized = (brandProfile.officialDomains || []).map(d => normalizeDomain(d));
  
  const isExactDomainMatch = officialDomainsNormalized.some(
    od => od.normalizedHostname === normalizedCandidateDomain.normalizedHostname && od.normalizedHostname.length > 0
  );

  // Check if candidate is an authorized partner
  const isAuthorizedPartner = (brandProfile.authorizedPartners || []).some(p => {
    const pName = normalizeString(p.name);
    const pDom = normalizeDomain(p.websiteUrl || '').normalizedHostname;
    const nameMatch = pName.length >= 3 && cleanCandidateName.length >= 3 && (cleanCandidateName === pName || cleanCandidateName.includes(pName));
    const domMatch = pDom.length >= 3 && normalizedCandidateDomain.normalizedHostname.length >= 3 && (
      normalizedCandidateDomain.normalizedHostname === pDom ||
      normalizedCandidateDomain.normalizedHostname.endsWith(`.${pDom}`)
    );
    return nameMatch || domMatch;
  });

  const isOfficialAsset = isExactDomainMatch || (
    isExactNameMatch &&
    (brandProfile.officialSocialUrls || []).some(s => s.handle.toLowerCase() === candidateName.toLowerCase())
  );

  // If confirmed official asset:
  if (isOfficialAsset) {
    return {
      candidateName,
      candidateDomain: candidateDomainInput,
      candidateDescription,
      officialBrand: brandName,
      officialDomains: brandProfile.officialDomains,
      overallRiskCategory: 'Low',
      overallScore: 0,
      nameSimilarityScore: 100,
      domainSimilarityScore: 100,
      levenshteinDistance: 0,
      damerauDistance: 0,
      signals: [
        {
          id: 'OFFICIAL_ASSET_CONFIRMED',
          category: 'Exact & Normalization',
          type: 'OFFICIAL_REGISTERED_ASSET',
          title: 'Registered Protected Asset',
          detail: `The candidate string exactly matches verified official assets registered in the active Brand Profile for ${brandName}.`,
          severity: 'low',
        },
      ],
      characterDiffs: [],
      detectedLureWords: [],
      scriptCategories: [],
      isMixedScript: false,
      domainDetails: {
        ...normalizedCandidateDomain,
        isOfficialMatch: true,
        domainSimilarityScore: 100,
      },
      isExactNameMatch,
      isExactDomainMatch,
      isOfficialAsset: true,
      isAuthorizedPartner: false,
      analyzedAt: new Date().toISOString(),
      evidenceSupporting: [],
      evidenceAgainst: [
        `Asset matches registered official domain or handle in Brand Profile.`,
        `Asset is cryptographically or organizationally authorized.`,
      ],
      counterEvidence: [
        `Whitelisted legitimate brand asset. No defensive action needed.`,
      ],
      recommendedAction: 'Close / Protected Asset',
      recommendedNextSteps: [
        'Maintain asset registration in Brand Profile',
        'No adversarial action required',
      ],
      executiveSummary: `This candidate matches an official registered asset for ${brandName}. It has been verified and protected from false-positive classification.`,
    };
  }

  // --------------------------------------------------
  // A. EXACT & NORMALIZED NAME MATCHING
  // --------------------------------------------------
  const strippedCandidate = cleanCandidateName.replace(/[-_.\s]/g, '');
  const strippedBrand = cleanBrand.replace(/[-_.\s]/g, '');

  if (isExactNameMatch) {
    signals.push({
      id: 'EXACT_NAME_DUPLICATION',
      category: 'Exact & Normalization',
      type: 'EXACT_NAME_MATCH',
      title: 'Exact Name Duplication',
      detail: `Candidate name exactly duplicates "${brandName}" without authorization markings.`,
      severity: 'high',
      mitigatingFactor: 'Could be an official channel not yet registered in Brand Profile.',
    });
    evidenceSupporting.push(`Candidate claims identical name "${candidateName}" as protected brand "${brandName}".`);
    overallScore += 40;
  } else if (strippedCandidate === strippedBrand && cleanCandidateName.length > 0) {
    signals.push({
      id: 'PUNCTUATION_SEPARATOR_EVASION',
      category: 'Exact & Normalization',
      type: 'SEPARATOR_MANIPULATION',
      title: 'Separator & Punctuation Evasion',
      detail: `Same phonetic character sequence separated by hyphens, underscores, dots, or spaces.`,
      severity: 'high',
    });
    evidenceSupporting.push(`Candidate evades exact filters via separator manipulation ("${candidateName}").`);
    overallScore += 35;
  }

  // --------------------------------------------------
  // B. EDIT-DISTANCE SIMILARITY (LEVENSHTEIN & DAMERAU)
  // --------------------------------------------------
  const lev = computeLevenshtein(cleanCandidateName, cleanBrand);
  const damerau = computeDamerauLevenshtein(cleanCandidateName, cleanBrand);
  const maxLen = Math.max(cleanCandidateName.length, cleanBrand.length);
  const nameSimilarityScore = maxLen > 0 ? Math.max(0, Math.round(((maxLen - damerau) / maxLen) * 100)) : 0;

  if (cleanCandidateName.length > 0 && maxLen > 2) {
    if (damerau === 1) {
      signals.push({
        id: 'SINGLE_CHAR_TYPOSQUAT',
        category: 'Edit Distance',
        type: 'SINGLE_CHAR_MUTATION',
        title: 'Single-Character Typosquatting',
        detail: `Damerau-Levenshtein distance of 1 (${nameSimilarityScore}% similarity). Classic human typo-trapping technique.`,
        severity: 'high',
      });
      evidenceSupporting.push(`Single character mutation detected against "${brandName}" (Distance: 1).`);
      overallScore += 30;
    } else if (damerau === 2 && nameSimilarityScore >= 70) {
      signals.push({
        id: 'NEAR_MISS_TYPOSQUAT',
        category: 'Edit Distance',
        type: 'DOUBLE_CHAR_MUTATION',
        title: 'High-Proximity String Variation',
        detail: `Damerau-Levenshtein distance of 2 (${nameSimilarityScore}% similarity). High likelihood of typo-squatting or intentional misspelling.`,
        severity: 'high',
      });
      evidenceSupporting.push(`Close algorithmic edit distance of 2 (${nameSimilarityScore}% proximity).`);
      overallScore += 20;
    } else if (damerau > 2 && nameSimilarityScore >= 55) {
      signals.push({
        id: 'MODERATE_SIMILARITY',
        category: 'Edit Distance',
        type: 'MODERATE_PROXIMITY',
        title: 'Moderate Name Resemblance',
        detail: `Candidate has moderate phonetic/string resemblance (${nameSimilarityScore}% algorithmic similarity).`,
        severity: 'medium',
        mitigatingFactor: 'Could be an unrelated coincidental brand in a different sector.',
      });
      overallScore += 10;
    }
  }

  // --------------------------------------------------
  // C. HOMOGLYPHS & UNICODE DETECTION
  // --------------------------------------------------
  const { scripts, isMixedScript } = detectUnicodeScripts(candidateName);
  
  if (isMixedScript) {
    signals.push({
      id: 'MIXED_SCRIPT_CONFUSABLE',
      category: 'Homoglyphs & Unicode',
      type: 'MIXED_SCRIPT_ANOMALY',
      title: 'Mixed-Script Unicode Anomaly',
      detail: `Contains glyphs from multiple distinct alphabets (${scripts.map(s => s.script).join(', ')}). Frequently employed in IDN homograph spoofing.`,
      severity: 'critical',
      mitigatingFactor: 'Non-malicious multilingual names or internationalized branding.',
    });
    evidenceSupporting.push(`Mixed-script detected: blends Latin with ${scripts.filter(s => s.script !== 'Latin').map(s => s.script).join(', ')}.`);
    overallScore += 35;
  }

  // Inspect character substitutions
  for (let i = 0; i < candidateName.length; i++) {
    const char = candidateName[i];
    for (const [targetLatin, substitutes] of Object.entries(HOMOGLYPH_MAP)) {
      const match = substitutes.find(sub => sub.char === char);
      if (match) {
        // If cleanBrand contains targetLatin, this is a direct homoglyph substitution!
        const isTargetInBrand = cleanBrand.includes(targetLatin);
        characterDiffs.push({
          original: targetLatin,
          substituted: char,
          index: i,
          type: match.script.includes('Latin-Ext') ? 'accent' : 'homoglyph',
          explanation: `${match.name} visually resembles Latin '${targetLatin}' (${match.script})`,
        });

        if (isTargetInBrand) {
          overallScore += 15;
        }
      }
    }
  }

  // Compound digraphs check ('vv' -> 'w', 'rn' -> 'm')
  if (cleanCandidateName.includes('vv') && cleanBrand.includes('w')) {
    signals.push({
      id: 'DIGRAPH_VV_FOR_W',
      category: 'Homoglyphs & Unicode',
      type: 'DIGRAPH_HOMOGLYPH',
      title: 'Double "vv" Spoofing',
      detail: 'Detected double "vv" visually mimicking letter "w".',
      severity: 'high',
    });
    evidenceSupporting.push('Visual digraph substitution "vv" mimicking "w".');
    overallScore += 25;
  }
  if (cleanCandidateName.includes('rn') && cleanBrand.includes('m')) {
    signals.push({
      id: 'DIGRAPH_RN_FOR_M',
      category: 'Homoglyphs & Unicode',
      type: 'DIGRAPH_HOMOGLYPH',
      title: 'Digraph "rn" Spoofing',
      detail: 'Detected "rn" visually mimicking letter "m".',
      severity: 'high',
    });
    evidenceSupporting.push('Visual digraph substitution "rn" mimicking "m".');
    overallScore += 25;
  }

  if (characterDiffs.length > 0) {
    const homoglyphCount = characterDiffs.filter(d => d.type === 'homoglyph').length;
    if (homoglyphCount > 0) {
      signals.push({
        id: 'HOMOGLYPH_SUBSTITUTIONS',
        category: 'Homoglyphs & Unicode',
        type: 'HOMOGLYPH_DETECTED',
        title: `${homoglyphCount} Homoglyph Character Substitution(s)`,
        detail: `Visual substitutions: ${characterDiffs.map(d => `'${d.substituted}' for '${d.original}'`).join(', ')}.`,
        severity: 'critical',
      });
      evidenceSupporting.push(`Active homoglyphs: ${characterDiffs.map(d => `${d.substituted} (${d.original})`).join(', ')}.`);
    }
  }

  // --------------------------------------------------
  // D. ADDED-WORD & COMBOSQUATTING DETECTION
  // --------------------------------------------------
  const fullTextToInspect = `${cleanCandidateName} ${normalizedCandidateDomain.normalizedHostname} ${normalizeString(candidateDescription || '')}`;

  for (const lure of LURE_KEYWORDS) {
    if (fullTextToInspect.includes(lure.word)) {
      if (!detectedLureWords.includes(lure.word)) {
        detectedLureWords.push(lure.word);
        signals.push({
          id: `LURE_WORD_${lure.word.toUpperCase()}`,
          category: 'Lure Words & Combos',
          type: 'CREDENTIAL_LURE_KEYWORD',
          title: `Lure Keyword "${lure.word}" (${lure.category})`,
          detail: `Contains trust/action trigger "${lure.word}". Commonly leveraged to entice victims into bogus portals or support chats.`,
          severity: lure.severity,
          mitigatingFactor: 'Legitimate helpdesk or authorized branch (e.g. support.brand.com).',
        });
        overallScore += lure.severity === 'high' ? 20 : 10;
      }
    }
  }

  // --------------------------------------------------
  // E. DOMAIN SIMILARITY & SUBDOMAIN ABUSE
  // --------------------------------------------------
  let domainSimilarityScore = 0;
  const domDetails = normalizedCandidateDomain;

  if (domDetails.normalizedHostname.length > 0) {
    // 1. Subdomain abuse: e.g. sentinelpay.claims-portal.com or sentinelpay-login.suspicious.net
    const subdomainsJoined = domDetails.subdomains.join('.');
    const brandInSubdomain =
      domDetails.subdomains.some(sub => sub.includes(cleanBrand) || sub.includes(strippedBrand)) ||
      subdomainsJoined.includes(cleanBrand);

    const isDifferentRootDomain = !officialDomainsNormalized.some(
      od => od.extractedSLD === domDetails.extractedSLD && od.extractedTLD === domDetails.extractedTLD
    );

    if (brandInSubdomain && isDifferentRootDomain) {
      domDetails.isSubdomainAbuse = true;
      signals.push({
        id: 'SUBDOMAIN_BRAND_ABUSE',
        category: 'Subdomain Abuse',
        type: 'SUBDOMAIN_HOSTING_SPOOF',
        title: 'Brand Subdomain Hosting Abuse',
        detail: `The official brand "${brandName}" is used as a subdomain prefix under an unrelated domain "${domDetails.extractedSLD}.${domDetails.extractedTLD}".`,
        severity: 'critical',
      });
      evidenceSupporting.push(
        `Critical subdomain abuse: prepends brand mark "${cleanBrand}" to unrelated root host "${domDetails.extractedSLD}.${domDetails.extractedTLD}".`
      );
      overallScore += 45;
    }

    // 2. Base domain SLD comparison
    const closestOfficialDomain = officialDomainsNormalized[0] || { extractedSLD: cleanBrand, extractedTLD: 'com' };
    const sldDistance = computeDamerauLevenshtein(domDetails.extractedSLD, closestOfficialDomain.extractedSLD);
    const maxSldLen = Math.max(domDetails.extractedSLD.length, closestOfficialDomain.extractedSLD.length);
    domainSimilarityScore = maxSldLen > 0 ? Math.max(0, Math.round(((maxSldLen - sldDistance) / maxSldLen) * 100)) : 0;
    domDetails.domainSimilarityScore = domainSimilarityScore;

    // SLD exact match but deceptive TLD
    if (domDetails.extractedSLD === closestOfficialDomain.extractedSLD) {
      if (domDetails.extractedTLD !== closestOfficialDomain.extractedTLD) {
        const isDeceptive = DECEPTIVE_TLDS.includes(domDetails.extractedTLD);
        domDetails.isDeceptiveTLD = isDeceptive;
        signals.push({
          id: 'DECEPTIVE_TLD_SWAP',
          category: 'Domain & TLD',
          type: 'TLD_REPLACEMENT',
          title: `TLD Replacement (.${domDetails.extractedTLD})`,
          detail: `Identical root label "${domDetails.extractedSLD}" registered under .${domDetails.extractedTLD} instead of official .${closestOfficialDomain.extractedTLD}. ${
            isDeceptive ? 'This TLD is heavily observed in rapid-turnaround phishing campaigns.' : ''
          }`,
          severity: isDeceptive ? 'critical' : 'high',
          mitigatingFactor: 'Company subsidiary, regional TLD, or legitimate defensive registration.',
        });
        evidenceSupporting.push(`Domain hijacking via TLD swapping: .${domDetails.extractedTLD} vs official .${closestOfficialDomain.extractedTLD}.`);
        overallScore += isDeceptive ? 35 : 25;
      }
    } else if (sldDistance <= 2 && domainSimilarityScore >= 70) {
      signals.push({
        id: 'DOMAIN_TYPOSQUATTING',
        category: 'Domain & TLD',
        type: 'SLD_TYPOSQUAT',
        title: `Domain Typosquatting (${domDetails.extractedSLD})`,
        detail: `SLD "${domDetails.extractedSLD}" has an edit distance of ${sldDistance} from official domain SLD "${closestOfficialDomain.extractedSLD}".`,
        severity: 'high',
      });
      evidenceSupporting.push(`Domain typo-squatting on root label (${sldDistance} character difference).`);
      overallScore += 30;
    } else if (domDetails.extractedSLD.includes(cleanBrand) && domDetails.extractedSLD !== cleanBrand) {
      // Combosquatting in SLD: e.g. sentinelpay-security.com or sentinelpaylogin.xyz
      signals.push({
        id: 'DOMAIN_COMBOSQUATTING',
        category: 'Domain & TLD',
        type: 'SLD_COMBOSQUAT',
        title: `Combosquatting in Domain Root ("${domDetails.extractedSLD}")`,
        detail: `Root label embeds full brand name alongside additional terms in the domain stem.`,
        severity: 'high',
      });
      evidenceSupporting.push(`Domain combosquatting: embeds brand inside "${domDetails.extractedSLD}".`);
      overallScore += 25;
    }
  }

  // --------------------------------------------------
  // F. AUTHORIZED PARTNERS & COUNTER-EVIDENCE
  // --------------------------------------------------
  if (isAuthorizedPartner) {
    counterEvidence.push(`Candidate matches registered authorized partner in Brand Profile.`);
    counterEvidence.push(`May be a legitimate affiliate, API integrator, or cobranded entity.`);
    // Mitigate score
    overallScore = Math.min(overallScore, 45);
  }

  // Check for internationalization counter-evidence
  const onlyAccents = characterDiffs.length > 0 && characterDiffs.every(d => d.type === 'accent');
  if (onlyAccents && !isMixedScript) {
    counterEvidence.push('Contains standard accented Latin characters (common in regional languages like French, Spanish, German).');
  }

  // Check generic dictionary or independent context
  if (candidateDescription && candidateDescription.toLowerCase().includes('review')) {
    counterEvidence.push('Description indicates third-party commentary, consumer reviews, or news coverage.');
  }

  if (evidenceSupporting.length === 0) {
    counterEvidence.push('No hostile homoglyphs, deceptive TLD swaps, or lure keywords identified.');
  }

  // --------------------------------------------------
  // G. SCORING CLASSIFICATION & RECOMMENDATIONS
  // --------------------------------------------------
  overallScore = Math.min(100, Math.max(0, overallScore));

  let overallRiskCategory: RiskLevel = 'Low';
  let recommendedAction = 'Dismiss / Routine Logging';
  
  if (overallScore >= 75) {
    overallRiskCategory = 'Critical';
    recommendedAction = 'Immediate Takedown & Domain Suspension';
    nextSteps.push('Generate registrar abuse takedown notification');
    nextSteps.push('Submit domain to Google Safe Browsing and Microsoft SmartScreen');
    nextSteps.push('Add host to enterprise DNS RPZ blocklist');
    nextSteps.push('Query WHOIS/RDAP to identify registrar and abuse contact');
  } else if (overallScore >= 50) {
    overallRiskCategory = 'High';
    recommendedAction = 'Escalate for Active Analyst Investigation';
    nextSteps.push('Investigate MX records to check if active phishing email is deployed');
    nextSteps.push('Capture automated headless screenshot of active landing page');
    nextSteps.push('Audit brand authorization with legal/affiliate team');
    nextSteps.push('Monitor DNS resolution changes via passive DNS feeds');
  } else if (overallScore >= 25) {
    overallRiskCategory = 'Medium';
    recommendedAction = 'Automated Watchlist Surveillance';
    nextSteps.push('Add candidate to hourly look-alike surveillance monitor');
    nextSteps.push('Verify if candidate is an undeclared authorized partner or reseller');
    nextSteps.push('Review candidate description and hosted assets for logo duplication');
  } else {
    overallRiskCategory = 'Low';
    recommendedAction = 'Archive as Benign / Unrelated';
    nextSteps.push('Log candidate in findings history for correlation');
    nextSteps.push('No urgent takedown action indicated');
  }

  // Synthesize executive explanation
  let executiveSummary = '';
  if (overallRiskCategory === 'Critical') {
    executiveSummary = `High-confidence brand impersonation vector detected with ${signals.length} threat signal(s). Exhibits severe deceit patterns including ${signals.map(s => s.title).slice(0, 3).join(', ')}.`;
  } else if (overallRiskCategory === 'High') {
    executiveSummary = `Suspicious look-alike detected with clear adversarial indicators. Edit distance and keyword alignment strongly suggest deceptive intent toward ${brandName} customers.`;
  } else if (overallRiskCategory === 'Medium') {
    executiveSummary = `Moderate structural similarity detected. Contains overlapping brand tokens or lure words, but warrants human analyst review to rule out authorized affiliations.`;
  } else {
    executiveSummary = `Candidate displays low threat risk. Algorithmic signals indicate either an unrelated mark or a benign linguistic coincidence.`;
  }

  return {
    candidateName,
    candidateDomain: candidateDomainInput,
    candidateDescription,
    officialBrand: brandName,
    officialDomains: brandProfile.officialDomains,
    overallRiskCategory,
    overallScore,
    nameSimilarityScore,
    domainSimilarityScore,
    levenshteinDistance: lev,
    damerauDistance: damerau,
    signals,
    characterDiffs,
    detectedLureWords,
    scriptCategories: scripts,
    isMixedScript,
    domainDetails: domDetails,
    isExactNameMatch,
    isExactDomainMatch,
    isOfficialAsset,
    isAuthorizedPartner,
    analyzedAt: new Date().toISOString(),
    evidenceSupporting,
    evidenceAgainst,
    counterEvidence,
    recommendedAction,
    recommendedNextSteps: nextSteps,
    executiveSummary,
  };
}
