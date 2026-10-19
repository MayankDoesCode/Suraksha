import type { BrandProfile, OfficialSocial, AuthorizedPartner, RiskLevel } from '../types';

export type SocialPlatform = 'Instagram' | 'Facebook' | 'X' | 'LinkedIn' | 'YouTube' | 'Telegram' | 'TikTok' | 'Discord' | 'Other';

export interface SocialCandidateInput {
  name: string;
  username: string;
  platform: SocialPlatform;
  url: string;
  bio: string;
  followerCount?: number | string;
  creationDate?: string;
  observedBranding?: string;
  evidence?: string;
}

export type SocialSignalCategory = 
  | 'Identity & Handle' 
  | 'Bio & Content' 
  | 'Credential & Phishing Risks' 
  | 'Platform & Metadata';

export interface SocialSignal {
  id: string;
  category: SocialSignalCategory;
  type: string;
  title: string;
  detail: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  mitigatingFactor?: string;
}

export interface SocialAnalysisResult {
  candidate: SocialCandidateInput;
  protectedBrandName: string;
  riskCategory: RiskLevel;
  heuristicScore: number; // 0 - 100
  scoreDisclaimer: string;
  analyzedAt: string;
  
  // High-level verdict flags
  isExactOfficialMatch: boolean;
  isAuthorizedPartner: boolean;
  isParodyOrCommentary: boolean;
  isUnrelatedEntity: boolean;
  
  matchedOfficialAsset?: OfficialSocial;
  matchedPartner?: AuthorizedPartner;
  
  // Categorized signals
  signals: SocialSignal[];
  
  // Evidence lists
  evidenceSupporting: string[];
  evidenceAgainst: string[];
  counterEvidence: string[];
  
  // Actions
  recommendedAction: string;
  recommendedNextSteps: string[];
  executiveSummary: string;
  
  // Algorithmic string distance metrics
  stringSimilarity: number;
  levenshteinDistance: number;
}

// ----------------------------------------------------
// HOMOGLYPH & SENSITIVE PHRASES DICTIONARIES
// ----------------------------------------------------

const CYRILLIC_LOOKALIKES: Record<string, string> = {
  '\u0430': 'a', // Cyrillic small a
  '\u0410': 'A',
  '\u0435': 'e', // Cyrillic small e
  '\u0415': 'E',
  '\u043E': 'o', // Cyrillic small o
  '\u041E': 'O',
  '\u0440': 'p', // Cyrillic small er
  '\u0420': 'P',
  '\u0441': 'c', // Cyrillic small es
  '\u0421': 'C',
  '\u0443': 'y', // Cyrillic small u
  '\u0423': 'Y',
  '\u0445': 'x', // Cyrillic small ha
  '\u0425': 'X',
  '\u0456': 'i', // Ukrainian i
  '\u0406': 'I',
};

const LEETSPEAK_MAP: Record<string, string> = {
  '0': 'o',
  '1': 'l',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
  '8': 'b',
  '@': 'a',
  '$': 's',
  'vv': 'w',
};

const LURE_KEYWORDS = [
  'support', 'helpdesk', 'help', 'care', 'desk', 'service',
  'security', 'claim', 'claims', 'refund', 'refunds', 'reimbursement',
  'verify', 'verification', 'verified', 'official', 'team', 'admin',
  'rewards', 'airdrop', 'bonus', 'recovery', 'unlock', 'portal', 'auth',
  'billing', 'dispute', 'hotline', 'representative', 'customer'
];

const CREDENTIAL_HARVESTING_PATTERNS = [
  /\b(seed\s*phrase|secret\s*phrase|recovery\s*phrase|12[-\s]*words?|24[-\s]*words?)\b/i,
  /\b(otp|one[-\s]*time[-\s]*passcode|verification\s*code|auth\s*code)\b/i,
  /\b(private\s*key|wallet\s*key|keystore)\b/i,
  /\b(pin|password|passcode|passphrase|login\s*credentials)\b/i,
  /\b(cvv|cvc|card\s*details|credit\s*card\s*number|debit\s*card\s*number)\b/i,
  /\b(dm\s*(me|us)\s*your|direct\s*message\s*for\s*(help|refund|unlock))\b/i,
  /\b(send\s*(eth|btc|usdt|crypto|funds|money)\s*to\s*verify)\b/i,
  /\b(unlock\s*(stuck|pending)\s*(transaction|transfer|balance))\b/i,
];

const SUSPICIOUS_URL_PATTERNS = [
  /t\.me\//i,
  /telegram\.me\//i,
  /wa\.me\//i,
  /bit\.ly\//i,
  /tinyurl\.com\//i,
  /is\.gd\//i,
  /cutt\.ly\//i,
  /linktr\.ee\//i,
  /campsite\.bio\//i,
  /forms\.gle\//i,
  /docs\.google\.com\/forms/i,
  /typeform\.com/i,
];

const PARODY_KEYWORDS = [
  'parody', 'satire', 'fan account', 'fanpage', 'fan page',
  'commentary', 'not affiliated', 'unofficial fan', 'unaffiliated',
  'humor', 'memes', 'meme account', 'tribute'
];

// Helper: Normalize username (strip @, lower-case, remove trailing slashes)
export function normalizeHandle(h: string): string {
  return h.trim().toLowerCase().replace(/^@+/, '').replace(/\/+$/, '');
}

/**
 * Normalizes supported social media profile URLs into canonical format for comparison.
 * For X / Twitter, standardizes:
 * - Protocols (http, https)
 * - Domain aliases (twitter.com, mobile.twitter.com, mobile.x.com, www.x.com, www.twitter.com -> x.com)
 * - Path variants (/@handle, /handle, trailing slashes)
 * - Query strings and URL fragments
 * - Casing
 */
export function normalizeSocialUrl(rawUrl: string): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';

  try {
    const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const parsed = new URL(withProto);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    const pathname = parsed.pathname.trim().replace(/\/+$/, '');

    // Normalize X / Twitter domains to x.com
    if (
      host === 'x.com' ||
      host === 'twitter.com' ||
      host === 'mobile.twitter.com' ||
      host === 'mobile.x.com'
    ) {
      const segments = pathname.split('/').filter(Boolean);
      if (segments.length > 0) {
        const handle = segments[0].replace(/^@+/, '').toLowerCase();
        return `x.com/${handle}`;
      }
      return 'x.com';
    }

    // Other platforms (Instagram, LinkedIn, etc.)
    return `${host}${pathname.toLowerCase()}`;
  } catch {
    const xMatch = trimmed.match(/(?:x\.com|twitter\.com)\/(?:@)?([a-zA-Z0-9_]{1,50})/i);
    if (xMatch) {
      return `x.com/${xMatch[1].toLowerCase()}`;
    }
    return trimmed.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/+$/, '');
  }
}

/**
 * Extracts normalized account handle from supported platform profile URLs.
 * Returns null if the URL is not a profile URL or handle cannot be extracted.
 */
export function extractHandleFromUrl(rawUrl: string): string | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const normalized = normalizeSocialUrl(rawUrl);
  if (normalized.startsWith('x.com/')) {
    const handle = normalized.slice('x.com/'.length).split('/')[0];
    return handle ? normalizeHandle(handle) : null;
  }
  return null;
}

// Helper: Damerau-Levenshtein distance
function computeDamerauLevenshtein(s1: string, s2: string): number {
  const len1 = s1.length;
  const len2 = s2.length;
  const d: number[][] = Array(len1 + 1)
    .fill(null)
    .map(() => Array(len2 + 1).fill(0));

  for (let i = 0; i <= len1; i++) d[i][0] = i;
  for (let j = 0; j <= len2; j++) d[0][j] = j;

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1, // deletion
        d[i][j - 1] + 1, // insertion
        d[i - 1][j - 1] + cost // substitution
      );

      // Transposition
      if (
        i > 1 &&
        j > 1 &&
        s1[i - 1] === s2[j - 2] &&
        s1[i - 2] === s2[j - 1]
      ) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }

  return d[len1][len2];
}

// ----------------------------------------------------
// MAIN SOCIAL MEDIA DETECTION ENGINE
// ----------------------------------------------------

export function analyzeSocialCandidate(
  candidate: SocialCandidateInput,
  brandProfile: BrandProfile
): SocialAnalysisResult {
  const normCandidateName = candidate.name.trim().toLowerCase();
  const normCandidateHandle = normalizeHandle(candidate.username);
  const normBrandName = brandProfile.brandName.trim().toLowerCase();
  const brandKeywords = [
    normBrandName,
    ...(brandProfile.protectedKeywords || []).map(k => k.trim().toLowerCase())
  ];

  const signals: SocialSignal[] = [];
  const evidenceSupporting: string[] = [];
  const evidenceAgainst: string[] = [];
  const counterEvidence: string[] = [];

  let isExactOfficialMatch = false;
  let matchedOfficialAsset: OfficialSocial | undefined = undefined;

  let isAuthorizedPartner = false;
  let matchedPartner: AuthorizedPartner | undefined = undefined;

  let isParodyOrCommentary = false;
  let isUnrelatedEntity = false;

  // 1. OFFICIAL ASSET CHECK (False Positive Protection)
  const officialSocials = brandProfile.officialSocialUrls || [];
  let identityConflict: {
    matchedOfficial: OfficialSocial;
    candidateUrl: string;
    extractedUrlHandle: string | null;
    reason: string;
  } | null = null;

  for (const official of officialSocials) {
    const normOfficialHandle = normalizeHandle(official.handle || '');
    const normOfficialUrl = normalizeSocialUrl(official.url || '');
    const candidateUrl = (candidate.url || '').trim();
    const normCandidateUrl = normalizeSocialUrl(candidateUrl);

    const handleMatches = Boolean(normCandidateHandle && normOfficialHandle && normCandidateHandle === normOfficialHandle);
    const urlMatches = Boolean(normCandidateUrl && normOfficialUrl && normCandidateUrl === normOfficialUrl);

    // Check if platform is compatible
    const platformMatch = 
      !official.platform ||
      candidate.platform.toLowerCase().includes(official.platform.toLowerCase()) ||
      official.platform.toLowerCase().includes(candidate.platform.toLowerCase()) ||
      (candidate.platform === 'X' && official.platform.toLowerCase().includes('twitter'));

    if (handleMatches && platformMatch) {
      // Candidate handle matches official registry.
      // If a candidate URL was provided, verify whether it conflicts with the registered identity.
      if (candidateUrl) {
        const candidateUrlHandle = extractHandleFromUrl(candidateUrl);

        // Check 1: Does candidate URL resolve to a different account? (e.g. @microsoft vs @sentinelpay_official)
        const resolvesToDifferentAccount = Boolean(candidateUrlHandle && candidateUrlHandle !== normCandidateHandle);
        // Check 2: If official registered URL exists, does candidate URL conflict with it?
        const urlConflictsWithRegistry = Boolean(normOfficialUrl && !urlMatches && resolvesToDifferentAccount);

        if (resolvesToDifferentAccount || urlConflictsWithRegistry) {
          identityConflict = {
            matchedOfficial: official,
            candidateUrl,
            extractedUrlHandle: candidateUrlHandle,
            reason: candidateUrlHandle
              ? `Supplied profile URL resolves to account "@${candidateUrlHandle}", conflicting with candidate handle "@${normCandidateHandle}" and official registered URL "${official.url}".`
              : `Supplied profile URL "${candidateUrl}" does not match registered official URL "${official.url}".`
          };
          // Do not grant official allowlist exemption when identity evidence conflicts
          continue;
        }
      }

      // Handle matches and supplied URL (if any) is consistent with official registration
      isExactOfficialMatch = true;
      matchedOfficialAsset = official;
      break;
    } else if (urlMatches && !normCandidateHandle) {
      // Fallback: only URL was provided and it matches official registry
      isExactOfficialMatch = true;
      matchedOfficialAsset = official;
      break;
    }
  }

  // If candidate handle matched an official record but the supplied profile URL pointed elsewhere:
  if (identityConflict) {
    signals.push({
      id: 'sig-official-identity-url-mismatch',
      category: 'Identity & Handle',
      type: 'OFFICIAL_IDENTITY_URL_MISMATCH',
      title: 'Official Identity & Profile URL Conflict',
      detail: identityConflict.reason,
      severity: 'high',
    });
    evidenceSupporting.push(
      `Identity Conflict Detected: Candidate handle matches registered official channel (@${normalizeHandle(identityConflict.matchedOfficial.handle || '')}), but supplied profile URL "${identityConflict.candidateUrl}" resolves to a conflicting asset.`
    );
  }

  if (isExactOfficialMatch && matchedOfficialAsset) {
    const verTier = matchedOfficialAsset.verificationStatus;
    const isStronglyVerified = verTier === 'verified_platform' || verTier === 'verified_dns';

    evidenceAgainst.push(
      `Handle exactly matches registered official profile in Brand Profile directory (${matchedOfficialAsset.handle}).`
    );
    evidenceAgainst.push(
      `Asset verification tier: "${verTier}". No evidence of credential hijacking or malicious redirect observed.`
    );
    if (matchedOfficialAsset.notes) {
      evidenceAgainst.push(`Registered verification record: ${matchedOfficialAsset.notes}`);
    }

    signals.push({
      id: 'sig-official-whitelisted',
      category: 'Identity & Handle',
      type: 'OFFICIAL_REGISTERED_HANDLE',
      title: 'Verified Official Brand Channel',
      detail: `The candidate handle "@${normCandidateHandle}" is officially cataloged in the brand profile under ${matchedOfficialAsset.platform}.`,
      severity: 'low',
      mitigatingFactor: 'Whitelisted asset owned and operated by protected brand.'
    });

    return {
      candidate,
      protectedBrandName: brandProfile.brandName,
      riskCategory: 'Low',
      heuristicScore: 0,
      scoreDisclaimer: 'Heuristic indicator based on deterministic threat signals; not an empirical probability of fraud.',
      analyzedAt: new Date().toISOString(),
      isExactOfficialMatch: true,
      isAuthorizedPartner: false,
      isParodyOrCommentary: false,
      isUnrelatedEntity: false,
      matchedOfficialAsset,
      signals,
      evidenceSupporting: [],
      evidenceAgainst,
      counterEvidence: [
        'Asset is registered in the official corporate Brand Profile repository.',
        isStronglyVerified ? 'Platform identity verification badges match corporate registration.' : 'User-declared official asset.'
      ],
      recommendedAction: 'Mark Benign & Allowlist',
      recommendedNextSteps: [
        'Maintain in safe allowlist; exempt from automated takedown actions.',
        'Ensure continuous monitoring of 2FA posture and account administrative access.'
      ],
      executiveSummary: `Verified authentic official asset. The social media profile "${candidate.username.startsWith('@') ? candidate.username : '@' + candidate.username}" on ${candidate.platform} is registered in the active ${brandProfile.brandName || 'official'} brand profile repository.`,
      stringSimilarity: 100,
      levenshteinDistance: 0,
    };
  }

  // 2. AUTHORIZED PARTNER CHECK
  const partners = brandProfile.authorizedPartners || [];
  for (const partner of partners) {
    const normPartnerName = partner.name.toLowerCase();
    const partnerSite = (partner.websiteUrl || '').toLowerCase();

    if (
      normCandidateName.includes(normPartnerName) ||
      normCandidateHandle.includes(normPartnerName.replace(/\s+/g, '')) ||
      (candidate.bio && candidate.bio.toLowerCase().includes(normPartnerName)) ||
      (candidate.url && partnerSite && candidate.url.toLowerCase().includes(partnerSite))
    ) {
      isAuthorizedPartner = true;
      matchedPartner = partner;
      break;
    }
  }

  // 3. PARODY & SATIRE CHECK
  const combinedBioAndName = `${candidate.name} ${candidate.bio || ''} ${candidate.observedBranding || ''}`.toLowerCase();
  for (const keyword of PARODY_KEYWORDS) {
    if (combinedBioAndName.includes(keyword)) {
      isParodyOrCommentary = true;
      counterEvidence.push(
        `Profile bio or title contains explicit parody/commentary disclaimer ("${keyword}").`
      );
      break;
    }
  }

  // 4. STRING SIMILARITY & HOMOGLYPH DETECTION
  // Check display name and handle against brand name
  let levDistance = computeDamerauLevenshtein(normCandidateHandle, normBrandName);
  let maxLen = Math.max(normCandidateHandle.length, normBrandName.length);
  let stringSimilarity = maxLen > 0 ? Math.round(((maxLen - levDistance) / maxLen) * 100) : 0;

  // Also check candidate display name
  const nameLev = computeDamerauLevenshtein(normCandidateName, normBrandName);
  const nameMaxLen = Math.max(normCandidateName.length, normBrandName.length);
  const nameSimilarity = nameMaxLen > 0 ? Math.round(((nameMaxLen - nameLev) / nameMaxLen) * 100) : 0;
  if (nameSimilarity > stringSimilarity) {
    stringSimilarity = nameSimilarity;
    levDistance = nameLev;
  }

  // Homoglyphs (Cyrillic lookalikes)
  const detectedCyrillic: string[] = [];
  for (const char of candidate.name + candidate.username) {
    if (CYRILLIC_LOOKALIKES[char]) {
      detectedCyrillic.push(`${char} (resembles '${CYRILLIC_LOOKALIKES[char]}')`);
    }
  }

  if (detectedCyrillic.length > 0) {
    const detail = `Detected ${detectedCyrillic.length} deceptive Unicode homoglyph character(s): ${detectedCyrillic.join(', ')}.`;
    signals.push({
      id: 'sig-homoglyph',
      category: 'Identity & Handle',
      type: 'UNICODE_HOMOGLYPH_SPOOF',
      title: 'Unicode Homoglyph Substitution Detected',
      detail,
      severity: 'critical'
    });
    evidenceSupporting.push(detail);
  }

  // Leetspeak substitutions in handle
  let deobfuscatedHandle = normCandidateHandle;
  const leetMatches: string[] = [];
  for (const [leet, normal] of Object.entries(LEETSPEAK_MAP)) {
    if (normCandidateHandle.includes(leet)) {
      leetMatches.push(`'${leet}' for '${normal}'`);
      deobfuscatedHandle = deobfuscatedHandle.replaceAll(leet, normal);
    }
  }
  if (leetMatches.length > 0 && deobfuscatedHandle.includes(normBrandName)) {
    const detail = `Handle utilizes leetspeak substitutions (${leetMatches.join(', ')}) to construct brand name "${brandProfile.brandName}".`;
    signals.push({
      id: 'sig-leetspeak',
      category: 'Identity & Handle',
      type: 'LEETSPEAK_BRAND_SPOOF',
      title: 'Leetspeak Character Substitution',
      detail,
      severity: 'high'
    });
    evidenceSupporting.push(detail);
  }

  // Added lure words in handle or name
  const detectedLureWords: string[] = [];
  for (const lure of LURE_KEYWORDS) {
    // Word boundary or underscore/hyphen check
    const regex = new RegExp(`(^|[._\\-\\s])${lure}([._\\-\\s]|$)`, 'i');
    if (regex.test(candidate.name) || regex.test(normCandidateHandle)) {
      detectedLureWords.push(lure);
    }
  }

  const brandNameInHandleOrName = 
    normCandidateHandle.includes(normBrandName) || 
    normCandidateName.includes(normBrandName) ||
    deobfuscatedHandle.includes(normBrandName);

  if (detectedLureWords.length > 0 && brandNameInHandleOrName) {
    const detail = `Candidate combines protected brand name with deceptive lure words: ${detectedLureWords.map(w => `"${w}"`).join(', ')}.`;
    signals.push({
      id: 'sig-lure-keywords',
      category: 'Identity & Handle',
      type: 'BRAND_LURE_COMPOUND',
      title: 'High-Risk Brand + Lure Combination',
      detail,
      severity: 'high'
    });
    evidenceSupporting.push(detail);
  }

  // Spoofed verified checkmarks in display name
  const fakeBadgeRegex = /[✓✔☑🔘✅Ⓜ️]|(\bverified\b)/i;
  if (fakeBadgeRegex.test(candidate.name)) {
    const detail = `Display name incorporates simulated verification glyphs or "Verified" wording directly in the text field.`;
    signals.push({
      id: 'sig-fake-badge',
      category: 'Identity & Handle',
      type: 'SIMULATED_VERIFICATION_BADGE',
      title: 'Simulated Verification Badge in Display Name',
      detail,
      severity: 'high'
    });
    evidenceSupporting.push(detail);
  }

  // Unregistered official claim in handle or name
  if (
    (normCandidateName.includes('official') || normCandidateHandle.includes('official') || normCandidateName.includes('hq')) &&
    !isExactOfficialMatch
  ) {
    const detail = `Profile claims to be the "Official" representation or headquarters, but is NOT listed in the registered Brand Profile.`;
    signals.push({
      id: 'sig-unregistered-official',
      category: 'Identity & Handle',
      type: 'UNREGISTERED_OFFICIAL_CLAIM',
      title: 'Unregistered Claim of Official Status',
      detail,
      severity: 'high'
    });
    evidenceSupporting.push(detail);
  }

  // 5. BIO & CONTENT SIGNALS (Credential harvesting, urgency, payment lures)
  const bioText = (candidate.bio || '').toLowerCase();
  const evidenceText = (candidate.evidence || '').toLowerCase();
  const fullContent = `${bioText} ${evidenceText}`;

  for (const pattern of CREDENTIAL_HARVESTING_PATTERNS) {
    const match = fullContent.match(pattern);
    if (match) {
      const detail = `Detected credential solicitation pattern in bio/evidence: "${match[0]}".`;
      signals.push({
        id: `sig-credential-${signals.length}`,
        category: 'Credential & Phishing Risks',
        type: 'CREDENTIAL_HARVESTING_PATTERN',
        title: 'Credential or Sensitive Key Solicitation',
        detail,
        severity: 'critical'
      });
      evidenceSupporting.push(detail);
    }
  }

  // Direct DM solicitation for account recovery
  if (
    (fullContent.includes('dm') || fullContent.includes('direct message') || fullContent.includes('inbox')) &&
    (fullContent.includes('support') || fullContent.includes('refund') || fullContent.includes('unlock') || fullContent.includes('fix'))
  ) {
    const detail = `Bio directs users to private unmonitored DMs for customer support, payment fixes, or account recovery.`;
    signals.push({
      id: 'sig-dm-lure',
      category: 'Credential & Phishing Risks',
      type: 'UNMONITORED_COMMUNICATION_LURE',
      title: 'Private Messaging Support Lure',
      detail,
      severity: 'high'
    });
    evidenceSupporting.push(detail);
  }

  // 6. SUSPICIOUS EXTERNAL LINKS & REDIRECTS
  let hasSuspiciousLink = false;
  for (const pattern of SUSPICIOUS_URL_PATTERNS) {
    if (pattern.test(candidate.url) || pattern.test(candidate.bio || '')) {
      hasSuspiciousLink = true;
      const detail = `Contains redirection service or unmonitored messaging channel link matching pattern: ${pattern.toString().replace(/\//g, '')}.`;
      signals.push({
        id: 'sig-suspicious-link',
        category: 'Credential & Phishing Risks',
        type: 'SUSPICIOUS_EXTERNAL_REDIRECT',
        title: 'Unverified External Redirection Link',
        detail,
        severity: 'high'
      });
      evidenceSupporting.push(detail);
      break;
    }
  }

  // Check if link claims to be brand domain but is not in officialDomains
  const urlMatchesDomain = (candidate.url || '').match(/https?:\/\/([^/\s]+)/i);
  if (urlMatchesDomain) {
    const domainHost = urlMatchesDomain[1].toLowerCase();
    const isDomainOfficial = (brandProfile.officialDomains || []).some(
      od => domainHost === od.toLowerCase() || domainHost.endsWith('.' + od.toLowerCase())
    );

    if (domainHost.includes(normBrandName) && !isDomainOfficial) {
      const detail = `External link domain "${domainHost}" embeds the brand name but is NOT in the official registered domains list.`;
      signals.push({
        id: 'sig-unregistered-domain-link',
        category: 'Credential & Phishing Risks',
        type: 'UNREGISTERED_BRAND_DOMAIN',
        title: 'Look-Alike External Domain in Profile',
        detail,
        severity: 'critical'
      });
      evidenceSupporting.push(detail);
    }
  }

  // 7. PLATFORM & METADATA SIGNALS (Follower count & Creation date anomalies)
  const followerNum = typeof candidate.followerCount === 'string' ? parseInt(candidate.followerCount, 10) : candidate.followerCount;
  if (followerNum !== undefined && !isNaN(followerNum)) {
    if (followerNum < 150 && (brandNameInHandleOrName || normCandidateName.includes('support'))) {
      const detail = `Suspiciously low audience count (${followerNum} followers) for an account purporting to offer official brand customer support.`;
      signals.push({
        id: 'sig-low-followers',
        category: 'Platform & Metadata',
        type: 'AUDIENCE_ANOMALY',
        title: 'Audience / Follower Count Anomaly',
        detail,
        severity: 'medium'
      });
      evidenceSupporting.push(detail);
    } else if (followerNum > 10000 && isParodyOrCommentary) {
      evidenceAgainst.push(`Established audience (${followerNum.toLocaleString()} followers) with transparent public commentary profile.`);
    }
  }

  // Account creation date check
  if (candidate.creationDate) {
    const createdTimestamp = Date.parse(candidate.creationDate);
    if (!isNaN(createdTimestamp)) {
      const ageDays = Math.floor((Date.now() - createdTimestamp) / (1000 * 60 * 60 * 24));
      if (ageDays < 60 && brandNameInHandleOrName) {
        const detail = `Newly minted profile (${ageDays} days old, created on ${candidate.creationDate}) claiming enterprise brand association.`;
        signals.push({
          id: 'sig-recent-account',
          category: 'Platform & Metadata',
          type: 'RECENT_ACCOUNT_CREATION',
          title: 'Recently Created Profile (< 60 Days)',
          detail,
          severity: 'high'
        });
        evidenceSupporting.push(detail);
      } else if (ageDays > 730) {
        evidenceAgainst.push(`Established profile history (created ${candidate.creationDate}, ~${Math.round(ageDays / 365)} years active).`);
      }
    }
  }

  // 8. UNRELATED BUSINESS OR ARTIST DETECTION
  const hasArtOrTechKeywords = 
    /\b(artist|art|freelance|portfolio|blender|3d|photographer|musician|gaming|author|chef|fitness)\b/i.test(fullContent);
  const mentionsFintechOrPayments = 
    /\b(payment|fintech|wallet|bank|crypto|transaction|card|money|funds|transfer|p2p)\b/i.test(fullContent);

  if (hasArtOrTechKeywords && !mentionsFintechOrPayments && !detectedCyrillic.length && !hasSuspiciousLink) {
    isUnrelatedEntity = true;
    counterEvidence.push(
      'Profile bio and published content represent an independent creative or non-competing trade identity (e.g. 3D artist, photographer, gaming).'
    );
    counterEvidence.push('Zero financial services, wallet, or payment terminology referenced.');
  }

  // 9. PARTNER MITIGATION
  if (isAuthorizedPartner && matchedPartner) {
    counterEvidence.push(
      `Matches registered authorized partner in Brand Profile directory ("${matchedPartner.name}").`
    );
    counterEvidence.push(
      `Relationship type: ${matchedPartner.relationshipType}. Authorized marks: ${matchedPartner.authorizedMarks}.`
    );
    signals.push({
      id: 'sig-partner-match',
      category: 'Identity & Handle',
      type: 'AUTHORIZED_PARTNER_AFFILIATION',
      title: 'Authorized Partner Network Match',
      detail: `Candidate exhibits co-branding corresponding to registered partner "${matchedPartner.name}".`,
      severity: 'medium',
      mitigatingFactor: 'Authorized business relationship cataloged in Brand Profile.'
    });
  }

  // 10. SCORING & RISK LEVEL AGGREGATION
  let score = 0;

  // Tally severities
  for (const s of signals) {
    if (s.severity === 'critical') score += 35;
    else if (s.severity === 'high') score += 20;
    else if (s.severity === 'medium') score += 10;
    else if (s.severity === 'low') score += 2;
  }

  // Base proximity score if brand name is contained
  if (brandNameInHandleOrName && score === 0) {
    score += 15;
  }

  // Mitigations
  if (isParodyOrCommentary) {
    score = Math.max(15, score - 40);
  }
  if (isAuthorizedPartner) {
    score = Math.max(20, score - 35);
  }
  if (isUnrelatedEntity) {
    score = Math.max(5, score - 50);
  }

  // Clamping
  score = Math.min(100, Math.max(0, score));

  // Determine Risk Category
  let riskCategory: RiskLevel;
  if (score >= 70 || signals.some(s => s.severity === 'critical')) {
    riskCategory = 'Critical';
  } else if (score >= 45 || signals.some(s => s.severity === 'high')) {
    riskCategory = 'High';
  } else if (score >= 20 || signals.some(s => s.severity === 'medium')) {
    riskCategory = 'Medium';
  } else {
    riskCategory = 'Low';
  }

  // If unrelated entity, force Low or Medium
  if (isUnrelatedEntity && !signals.some(s => s.severity === 'critical')) {
    riskCategory = 'Low';
    score = Math.min(score, 18);
  }

  // Determine Recommended Action & Next Steps
  let recommendedAction: string;
  const recommendedNextSteps: string[] = [];

  if (riskCategory === 'Critical') {
    recommendedAction = 'Escalate to Immediate Platform Takedown';
    recommendedNextSteps.push('Submit priority trademark and impersonation takedown notice to platform Trust & Safety.');
    recommendedNextSteps.push('Add associated external URLs and cryptocurrency addresses to corporate threat intelligence blocklist.');
    recommendedNextSteps.push('Issue customer advisory warning regarding active credential harvesting impersonators.');
  } else if (riskCategory === 'High') {
    recommendedAction = 'Escalate to Brand Protection Investigation';
    recommendedNextSteps.push('Capture automated evidentiary screenshot archive and WHOIS history.');
    recommendedNextSteps.push('Conduct out-of-band inquiry or cease-and-desist warning regarding unauthorized brand trademark usage.');
    recommendedNextSteps.push('Monitor handle for changes in bio links, cryptocurrency lures, or private messaging solicitation.');
  } else if (riskCategory === 'Medium') {
    recommendedAction = isAuthorizedPartner 
      ? 'Perform Partner Compliance Audit' 
      : isParodyOrCommentary 
        ? 'Monitor for Disclaimer Retention' 
        : 'Active Automated Surveillance';
    recommendedNextSteps.push('Verify trademark license parameters or partner branding guidelines.');
    recommendedNextSteps.push('Request clear prominent "Not Affiliated" disclaimer on the profile page.');
    recommendedNextSteps.push('Log in quarterly brand safety audit log.');
  } else {
    recommendedAction = 'Dismiss Alert / Mark as Benign';
    recommendedNextSteps.push('No immediate remediation required.');
    recommendedNextSteps.push('Retain snapshot in benign reference baseline to avoid duplicate re-alerts.');
  }

  // Executive summary
  let executiveSummary = '';
  if (riskCategory === 'Critical') {
    executiveSummary = `Critical threat detected. Profile "${candidate.name}" (${candidate.username.startsWith('@') ? candidate.username : '@' + candidate.username}) on ${candidate.platform} actively misrepresents protected brand "${brandProfile.brandName}" with high-risk credential harvesting lures or deceptive Unicode homoglyphs. Immediate takedown recommended.`;
  } else if (riskCategory === 'High') {
    executiveSummary = identityConflict
      ? `High-risk identity conflict. Profile claims official handle "${candidate.username.startsWith('@') ? candidate.username : '@' + candidate.username}" on ${candidate.platform}, but provided profile URL "${candidate.url}" resolves to a conflicting account or domain. Investigation required.`
      : `High probability of unauthorized brand impersonation. Profile combines protected brand identity with unverified customer support lures and unregistered external links.`;
  } else if (riskCategory === 'Medium') {
    executiveSummary = isAuthorizedPartner
      ? `Medium risk: Matches authorized partner directory for "${matchedPartner?.name}". Co-branding observed; requires compliance review.`
      : isParodyOrCommentary
        ? `Moderate risk: Profile references brand name but carries an explicit parody or commentary disclaimer.`
        : `Moderate risk: Contains name similarities without overt malicious payload. Continued surveillance advised.`;
  } else {
    executiveSummary = isUnrelatedEntity
      ? `Low risk: Candidate represents an independent entity or artist with coincidental syllable overlap. Benign classification.`
      : `Low risk: Minimal threat indicators observed. Does not meet actionable criteria for brand impersonation.`;
  }

  return {
    candidate,
    protectedBrandName: brandProfile.brandName,
    riskCategory,
    heuristicScore: score,
    scoreDisclaimer: 'Heuristic indicator based on deterministic threat signals; not an empirical probability of fraud.',
    analyzedAt: new Date().toISOString(),
    isExactOfficialMatch: false,
    isAuthorizedPartner,
    isParodyOrCommentary,
    isUnrelatedEntity,
    matchedOfficialAsset: undefined,
    matchedPartner,
    signals,
    evidenceSupporting,
    evidenceAgainst,
    counterEvidence,
    recommendedAction,
    recommendedNextSteps,
    executiveSummary,
    stringSimilarity,
    levenshteinDistance: levDistance,
  };
}
