import type { BrandProfile, CandidateAsset, ThreatEdge, ThreatNode } from '../types';

export const INITIAL_BRAND_PROFILE: BrandProfile = {
  id: 'brand-apexpay-001',
  brandName: 'ApexPay',
  officialWebsite: 'https://apexpay.com',
  officialDomains: ['apexpay.com', 'apexpay.io', 'api.apexpay.com', 'auth.apexpay.com'],
  officialSocialUrls: [
    {
      id: 'soc-01',
      platform: 'Twitter / X',
      handle: '@apexpay_official',
      url: 'https://x.com/apexpay_official',
      verificationStatus: 'verified_platform',
      notes: 'Verified Organization Gold Badge',
    },
    {
      id: 'soc-02',
      platform: 'Instagram',
      handle: '@apexpay.fintech',
      url: 'https://instagram.com/apexpay.fintech',
      verificationStatus: 'verified_platform',
      notes: 'Verified Meta Blue Check',
    },
    {
      id: 'soc-03',
      platform: 'LinkedIn',
      handle: 'company/apexpay-technologies',
      url: 'https://linkedin.com/company/apexpay-technologies',
      verificationStatus: 'user_declared',
      notes: 'Corporate Company Page',
    },
  ],
  officialApps: [
    {
      id: 'app-01',
      name: 'ApexPay: Mobile Wallet & Pay',
      developer: 'ApexPay Technologies Inc.',
      store: 'Google Play & Apple App Store',
      storeUrl: 'https://play.google.com/store/apps/details?id=com.apexpay.wallet',
      appId: 'com.apexpay.wallet',
      verificationStatus: 'verified_store',
    },
  ],
  authorizedPartners: [
    {
      id: 'part-01',
      name: 'FinTech Daily News Network',
      websiteUrl: 'https://fintechdaily.example/apexpay-merchant',
      relationshipType: 'Merchant Partner',
      authorizedMarks: 'ApexPay Merchant Showcase Logo License #PMA-441',
      verificationStatus: 'contract_verified',
      agreementReference: 'PMA-2025-08',
    },
    {
      id: 'part-02',
      name: 'VeriPay Hardware Solutions GmbH',
      websiteUrl: 'https://veripay-pos.example',
      relationshipType: 'Hardware / POS Partner',
      authorizedMarks: 'Certified Terminal Integration Co-Branding',
      verificationStatus: 'contract_verified',
      agreementReference: 'POS-TECH-998',
    },
  ],
  brandDescription:
    'ApexPay is a regulated enterprise digital payments provider facilitating cross-border business payments, virtual debit card issuance, and instant peer-to-peer transfers.',
  logoUrl: '',
  protectedKeywords: ['apexpay', 'apex pay', 'apex wallet', 'apex card'],
  lastUpdated: new Date().toISOString(),
  isCustomBrand: false,
};

export const DEMO_CANDIDATES: CandidateAsset[] = [
  // 1. Official Account (Must NOT be flagged - False Positive Avoidance)
  {
    id: 'cand-001',
    type: 'social',
    title: 'ApexPay Verified Official',
    identifier: '@apexpay_official',
    platform: 'Twitter / X',
    url: 'https://x.com/apexpay_official',
    description: 'The official handle for ApexPay Global. Fast, secure enterprise payment infrastructure and smart digital wallets.',
    observedBranding: 'Official blue and cyan corporate mark, verified organization checkmark, points to apexpay.com.',
    evidence: 'Links directly to apexpay.com/security. DNS TXT record cross-verifies account ownership.',
    riskCategory: 'Low',
    summary: 'Authenticated official brand asset. Matches registered handle and official corporate domain in brand profile.',
    evidenceSupporting: [],
    evidenceAgainst: [
      'Handle exactly matches official profile registry',
      'Bio links to authenticated root domain apexpay.com',
      'No credential harvesting or unauthorized lures observed'
    ],
    missingInformation: ['None - Asset matches authenticated profile'],
    recommendedNextSteps: [
      'Maintain in safe allowlist',
      'Ensure account 2FA enforcement and platform organization verification remains active'
    ],
    impersonationIndicators: [],
    conflictingEvidence: ['Authorized official communications channel'],
    isBenignExplanationPossible: true,
    benignExplanation: 'This is the genuine, officially managed brand account.',
    status: 'Dismissed',
    statusHistory: [
      {
        from: 'New',
        to: 'Dismissed',
        timestamp: '2026-10-12T14:30:00.000Z',
        analyst: 'System (Auto-Allowlist)',
        note: 'Confirmed match with official brand registry. White-listed asset.',
      },
    ],
    analystNotes: [
      {
        id: 'note-001',
        author: 'Lead Analyst (Tier 3)',
        text: 'Automated allowlist verification passed. Verified corporate handle.',
        timestamp: '2026-10-12T14:31:00.000Z',
      },
    ],
    createdDate: '2026-10-12T14:28:00.000Z',
    isFictionalDemo: true,
    scenarioType: 'official',
    stringSignals: [
      {
        type: 'EXACT_MATCH',
        detail: 'Candidate string matches registered official social handle.',
        severity: 'low',
      },
    ],
    stringSimilarity: 100,
    levenshteinDistance: 0,
    analysisEngine: 'Suraksha Allowlist Engine',
    tags: ['Official', 'Allowlisted', 'Verified'],
  },

  // 2. Suspicious Look-alike Profile (Critical Phishing Lure)
  {
    id: 'cand-002',
    type: 'social',
    title: 'ApexPay Helpdesk & Refund Claims',
    identifier: '@apexpay_support_claims',
    platform: 'Telegram / X',
    url: 'https://t.me/apexpay_support_claims',
    description: '🚨 ApexPay 24/7 Live Support & Instant Refund Assistance. Fix pending transactions, account locks, and claim gas rebates. Direct message our senior admin now!',
    observedBranding: 'Low-resolution copy of ApexPay logo, unofficial "Support" badge watermark, urgency banners.',
    evidence: 'Directs users to click t.me/apexpay_refund_bot and prompts for 12-word seed phrase or payment auth code to "unlock stuck transfers".',
    riskCategory: 'Critical',
    summary: 'Critical threat: High-fidelity brand impersonation soliciting customer credentials and unauthorized fund transfers under false emergency support pretenses.',
    evidenceSupporting: [
      'Handle combines protected brand name with high-risk lure keywords ("support", "claims")',
      'Unsolicited claims of transaction refunds and urgent account unlock',
      'Requests private seed phrases and personal authentication credentials via unmonitored Telegram bot',
      'No affiliation with apexpay.com corporate infrastructure'
    ],
    evidenceAgainst: ['None found. Clear phishing payload and deceitful intent.'],
    missingInformation: [
      'Domain WHOIS and hoster for external shortened links in bio',
      'Telegram channel operator IP attribution'
    ],
    recommendedNextSteps: [
      'Issue immediate trademark and phishing takedown notice to Telegram Abuse & hosting provider',
      'Publish customer threat advisory warning against fake refund support handles',
      'Block associated destination URLs on corporate firewall and browser threat lists'
    ],
    impersonationIndicators: [
      'Credential harvesting lure',
      'Logo trademark infringement without license',
      'Fake urgency / panic induction ("🚨 Account locked")'
    ],
    conflictingEvidence: [],
    isBenignExplanationPossible: false,
    benignExplanation: 'No valid commercial justification exists for soliciting customer secrets outside official portal.',
    status: 'Investigating',
    statusHistory: [
      {
        from: 'New',
        to: 'Investigating',
        timestamp: '2026-10-13T01:10:00.000Z',
        analyst: 'Sarah Jenkins (Threat Intel)',
        note: 'Escalated to Tier 2. Confirmed credential harvesting link in bio.',
      },
    ],
    analystNotes: [
      {
        id: 'note-002',
        author: 'Sarah Jenkins (Threat Intel)',
        text: 'Examined Telegram bot. It prompts for private key inputs via a mocked web form hosted at apexpay-wallet-recovery.xyz. Takedown ticket #BS-9841 queued.',
        timestamp: '2026-10-13T01:15:00.000Z',
      },
    ],
    createdDate: '2026-10-13T00:55:00.000Z',
    isFictionalDemo: true,
    scenarioType: 'impersonator',
    stringSignals: [
      {
        type: 'BRAND_CONTAINMENT',
        detail: 'Candidate string embeds brand name "ApexPay" with suffix.',
        severity: 'high',
      },
      {
        type: 'SUSPICIOUS_KEYWORD_COMPOUND',
        detail: 'Contains high-risk lure keywords: "support", "claims".',
        severity: 'high',
      },
      {
        type: 'SEPARATOR_MANIPULATION',
        detail: 'Separates words with underscores to evade simple blacklist filters.',
        severity: 'medium',
      },
    ],
    stringSimilarity: 55,
    levenshteinDistance: 15,
    analysisEngine: 'Gemini 3.8 Flash + Threat Heuristics',
    tags: ['Phishing', 'Credential Lure', 'Impersonator', 'High Priority'],
  },

  // 3. Legitimate Third-Party Partner (Requires Review, Not Auto-Ban)
  {
    id: 'cand-003',
    type: 'social',
    title: 'FinTech Daily - ApexPay Partner Network',
    identifier: '@fintech_daily_apexpay_partner',
    platform: 'LinkedIn',
    url: 'https://linkedin.com/company/fintech-daily-apexpay-partner',
    description: 'FinTech Daily news hub & certified merchant showcase. Official affiliate partner spotlighting ApexPay payment integrations for European retail e-commerce.',
    observedBranding: 'Dual branding featuring FinTech Daily masthead alongside "Powered by ApexPay Merchant Partner" banner badge.',
    evidence: 'Promotes an enterprise webinar about integrating the ApexPay API. Directs attendees to a legitimate Eventbrite page and registered merchant portal.',
    riskCategory: 'Medium',
    summary: 'Moderate compliance review needed. Legitimate partner/affiliate displaying brand trademarks. Not malicious, but requires branding agreement validation.',
    evidenceSupporting: [
      'Uses registered trademark "ApexPay" in title and promotional materials',
      'Account is not registered in central Brand Profile directory'
    ],
    evidenceAgainst: [
      'Bio explicitly clarifies independent media & merchant partner status',
      'No credential prompts, fees, or deceptive account recovery claims',
      'Promotes legitimate verified developer webinar'
    ],
    missingInformation: [
      'Verification from Business Development regarding active Partner Co-Marketing Agreement #PMA-2025-08',
      'Confirmation of approved logo usage guidelines'
    ],
    recommendedNextSteps: [
      'Check internal CRM partner agreement database for FinTech Daily media rights',
      'Contact account manager to request explicit "Authorized Merchant" badge styling per brand guidelines',
      'Do NOT submit an abuse takedown as this appears to be a commercially cooperative relationship'
    ],
    impersonationIndicators: [
      'Uncataloged brand name usage in handle without official verification link'
    ],
    conflictingEvidence: [
      'Transparent disclosure of affiliate/partner identity',
      'Educational webinars pointing to official developer docs'
    ],
    isBenignExplanationPossible: true,
    benignExplanation: 'Authorized partner or media syndicator conducting co-marketing per commercial distribution contract.',
    status: 'Investigating',
    statusHistory: [
      {
        from: 'New',
        to: 'Investigating',
        timestamp: '2026-10-12T16:00:00.000Z',
        analyst: 'Marcus Vance (Compliance)',
        note: 'Flagged for trademark partner verification review. BD team pinged.',
      },
    ],
    analystNotes: [
      {
        id: 'note-003',
        author: 'Marcus Vance (Compliance)',
        text: 'Checked with Partner Ops. FinTech Daily is an authorized regional affiliate under contract #PMA-441, but their handle needs standard partner disclaimer wording.',
        timestamp: '2026-10-12T16:15:00.000Z',
      },
    ],
    createdDate: '2026-10-12T15:45:00.000Z',
    isFictionalDemo: true,
    scenarioType: 'partner',
    stringSignals: [
      {
        type: 'BRAND_CONTAINMENT',
        detail: 'Candidate string contains "apexpay" in multi-word compound.',
        severity: 'medium',
      },
      {
        type: 'PARTNER_KEYWORD',
        detail: 'Includes "partner" designator indicating commercial relationship.',
        severity: 'low',
      },
    ],
    stringSimilarity: 42,
    levenshteinDistance: 19,
    analysisEngine: 'Gemini 3.8 Flash + Brand Policy Engine',
    tags: ['Partner', 'Compliance Review', 'False Positive Risk'],
  },

  // 4. Suspicious App with Different Developer (High/Critical Rogue App)
  {
    id: 'cand-004',
    type: 'app',
    title: 'ApexPay Pro: Instant Cash & Personal Loan',
    identifier: 'com.apexpaypro.fastloan.instantcash',
    platform: 'Third-Party Android Store (APKMirror / APKPure)',
    url: 'https://apkpure.example/com.apexpaypro.fastloan.instantcash',
    description: 'Fast loans up to $5,000 in 5 minutes! Borrow against your ApexPay balance with no credit check. Instant approval and same-day direct payout.',
    observedBranding: 'Exact replica of ApexPay icon overlaid with a gold "PRO" ribbon. Mismatched color palette in screenshots.',
    developer: 'Apex Financial Tech UK Ltd (Unregistered)',
    evidence: 'Manifest requests excessive permissions: READ_SMS, READ_CONTACTS, ACCESS_FINE_LOCATION, SYSTEM_ALERT_WINDOW. Hosted outside official Google Play Store.',
    riskCategory: 'Critical',
    summary: 'Critical rogue application: Publisher is an unauthorized third party ("Apex Financial Tech UK Ltd"). Demands invasive SMS and contacts harvesting.',
    evidenceSupporting: [
      'Publisher "Apex Financial Tech UK Ltd" does not match registered corporate entity "ApexPay Technologies Inc."',
      'Requests predatory permissions (READ_SMS, READ_CONTACTS) commonly used in predatory loan malware & OTP interception',
      'Distributed via unofficial third-party APK mirror outside verified store safeguards',
      'Deceptively leverages "ApexPay" brand mark to lure retail banking customers'
    ],
    evidenceAgainst: ['None - Classic predatory rogue loan application signature.'],
    missingInformation: [
      'APK SHA-256 certificate signature details',
      'Command-and-control server IP embedded in APK resources'
    ],
    recommendedNextSteps: [
      'Dispatch immediate DMCA and rogue application cease-and-desist to APK hoster and CDN',
      'Extract APK binary for mobile sandbox analysis and telemetry blacklisting',
      'Submit fraud report to Google Play Protect team to flag package signature globally'
    ],
    developerMismatch: true,
    suspiciousPermissions: ['READ_SMS', 'READ_CONTACTS', 'ACCESS_FINE_LOCATION', 'SYSTEM_ALERT_WINDOW'],
    impersonationIndicators: [
      'Developer identity spoofing',
      'Invasive SMS/OTP surveillance permissions',
      'Predatory financial lending claims'
    ],
    conflictingEvidence: [],
    isBenignExplanationPossible: false,
    benignExplanation: 'No authorized subsidiary operates predatory loan APKs under unverified UK shell companies.',
    status: 'Confirmed Suspicious',
    statusHistory: [
      {
        from: 'New',
        to: 'Investigating',
        timestamp: '2026-10-12T18:00:00.000Z',
        analyst: 'Dmitri Rostov (Mobile Sec)',
        note: 'APK reverse engineered. Suspicious SMS relay observed.',
      },
      {
        from: 'Investigating',
        to: 'Confirmed Suspicious',
        timestamp: '2026-10-12T19:30:00.000Z',
        analyst: 'Dmitri Rostov (Mobile Sec)',
        note: 'Confirmed rogue APK. C2 exfiltrates SMS OTP codes to rogue endpoint. Takedown requested.',
      },
    ],
    analystNotes: [
      {
        id: 'note-004',
        author: 'Dmitri Rostov (Mobile Sec)',
        text: 'Static analysis shows dex payload reading incoming 2FA SMS messages and POSTing them to 185.220.101.45/gate.php. High severity.',
        timestamp: '2026-10-12T19:35:00.000Z',
      },
    ],
    createdDate: '2026-10-12T17:50:00.000Z',
    isFictionalDemo: true,
    scenarioType: 'rogue_app',
    stringSignals: [
      {
        type: 'BRAND_CONTAINMENT',
        detail: 'Candidate app name starts with "ApexPay" followed by "Pro: Instant Cash".',
        severity: 'high',
      },
      {
        type: 'DEVELOPER_MISMATCH',
        detail: 'Publisher "Apex Financial Tech UK Ltd" does not match "ApexPay Technologies Inc."',
        severity: 'high',
      },
    ],
    stringSimilarity: 68,
    levenshteinDistance: 8,
    analysisEngine: 'Gemini 3.8 Flash + Mobile Defense Sandbox',
    tags: ['Rogue App', 'SMS Stealer', 'Predatory Loan', 'Critical'],
  },

  // 5. Unrelated Benign Account (Demonstrates False-Positive Avoidance)
  {
    id: 'cand-005',
    type: 'social',
    title: 'Apex Payne — Concept Art & 3D Design',
    identifier: '@apex_payne_art',
    platform: 'Instagram / ArtStation',
    url: 'https://instagram.com/apex_payne_art',
    description: 'Apex Payne 🎨 Freelance 3D environment artist & concept designer. Unreal Engine 5 worlds, blender tutorials, sci-fi landscapes. Open for commissions!',
    observedBranding: 'Personal artist avatar, digital matte paintings, zero fintech or financial graphics.',
    evidence: 'Portfolio consists entirely of cyberpunk concept paintings and 3D modeling reels. Links to personal ArtStation and Gumroad 3D asset store.',
    riskCategory: 'Low',
    summary: 'Benign entity: Genuine personal surname/handle with coincidental phonetic similarity ("Apex Payne"). Zero commercial or deceptive overlap.',
    evidenceSupporting: [],
    evidenceAgainst: [
      'Account belongs to individual artist with legitimate creative portfolio',
      'Zero financial, banking, or payment terminology in bio or posts',
      'Distinct visual identity with no trademark elements or logo similarity',
      'ArtStation and Gumroad links verify authentic digital design activity'
    ],
    missingInformation: ['None - Clear independent creative domain'],
    recommendedNextSteps: [
      'Dismiss alert immediately and mark as benign false positive',
      'Add handle pattern to benign noise filter to prevent repeat alerts'
    ],
    impersonationIndicators: [],
    conflictingEvidence: [
      'Completely different commercial industry (Game art & 3D illustration)',
      'Natural personal name "Payne" combined with gaming alias "Apex"'
    ],
    isBenignExplanationPossible: true,
    benignExplanation: 'Coincidental homophone and natural personal name in an entirely separate creative domain.',
    status: 'Dismissed',
    statusHistory: [
      {
        from: 'New',
        to: 'Dismissed',
        timestamp: '2026-10-12T20:00:00.000Z',
        analyst: 'Sarah Jenkins (Threat Intel)',
        note: 'False positive confirmed. Legitimate 3D artist with coincidental handle.',
      },
    ],
    analystNotes: [
      {
        id: 'note-005',
        author: 'Sarah Jenkins (Threat Intel)',
        text: 'Checked portfolio. Legitimate concept artist. No trademark overlap. Dismissed.',
        timestamp: '2026-10-12T20:05:00.000Z',
      },
    ],
    createdDate: '2026-10-12T19:55:00.000Z',
    isFictionalDemo: true,
    scenarioType: 'unrelated',
    stringSignals: [
      {
        type: 'PHONETIC_SIMILARITY',
        detail: 'Contains words "apex" and "payne" with underscore separation.',
        severity: 'low',
      },
    ],
    stringSimilarity: 48,
    levenshteinDistance: 8,
    analysisEngine: 'Gemini 3.8 Flash + Contextual Semantic Engine',
    tags: ['Benign', 'False Positive Avoidance', 'Dismissed'],
  },

  // 6. Phishing Domain Node (For Threat Graph linkage)
  {
    id: 'cand-006',
    type: 'domain',
    title: 'apexpay-wallet-recovery.xyz',
    identifier: 'apexpay-wallet-recovery.xyz',
    platform: 'Web / DNS',
    url: 'https://apexpay-wallet-recovery.xyz',
    description: 'Phishing landing page spoofing ApexPay login and wallet recovery. Registered via privacy proxy.',
    observedBranding: 'Exact clone of official CSS and brand stylesheet.',
    evidence: 'Linked directly in bio of @apexpay_support_claims. Resolves to IP 185.220.101.45.',
    riskCategory: 'Critical',
    summary: 'Credential harvesting credential trap directly linked to rogue social handle @apexpay_support_claims.',
    evidenceSupporting: [
      'Direct hyperlink from rogue social account bio',
      'Resolves to known bulletproof hosting network',
      'Duplicates corporate login interface without authorization'
    ],
    evidenceAgainst: ['None'],
    missingInformation: ['Registrant true WHOIS identity'],
    recommendedNextSteps: ['Submit registrar abuse request to Namecheap / Cloudflare'],
    status: 'Confirmed Suspicious',
    statusHistory: [
      {
        from: 'New',
        to: 'Confirmed Suspicious',
        timestamp: '2026-10-13T01:20:00.000Z',
        analyst: 'Sarah Jenkins',
        note: 'Confirmed credential harvesting target.',
      },
    ],
    analystNotes: [],
    createdDate: '2026-10-13T01:00:00.000Z',
    isFictionalDemo: true,
    scenarioType: 'impersonator',
    tags: ['Phishing Domain', 'Shared Infra', 'Critical'],
  },
];

export const INITIAL_THREAT_NODES: ThreatNode[] = [
  {
    id: 'node-brand',
    label: 'ApexPay (Brand Core)',
    type: 'brand',
    riskCategory: 'Safe',
    details: 'Protected Brand Identity (FinTech Payments)',
    x: 400,
    y: 280,
  },
  {
    id: 'node-official-social',
    label: '@apexpay_official (X)',
    type: 'official_asset',
    riskCategory: 'Safe',
    details: 'Verified Official Social Profile',
    x: 220,
    y: 160,
  },
  {
    id: 'node-official-app',
    label: 'ApexPay Wallet (App Store)',
    type: 'official_asset',
    riskCategory: 'Safe',
    details: 'Verified Mobile App (ApexPay Tech Inc.)',
    x: 580,
    y: 160,
  },
  {
    id: 'node-official-domain',
    label: 'apexpay.com (Domain)',
    type: 'official_asset',
    riskCategory: 'Safe',
    details: 'Official Root Corporate Domain',
    x: 400,
    y: 120,
  },
  {
    id: 'node-rogue-social',
    label: '@apexpay_support_claims',
    type: 'social_candidate',
    riskCategory: 'Critical',
    details: 'Rogue Phishing Support Account (Telegram/X)',
    x: 200,
    y: 400,
  },
  {
    id: 'node-phish-domain',
    label: 'apexpay-wallet-recovery.xyz',
    type: 'domain_candidate',
    riskCategory: 'Critical',
    details: 'Credential Harvesting Target',
    x: 350,
    y: 470,
  },
  {
    id: 'node-shared-ip',
    label: 'Host: 185.220.101.45',
    type: 'shared_infra',
    riskCategory: 'Critical',
    details: 'Bulletproof Hosting IP (Shared C2)',
    isInferred: false,
    x: 480,
    y: 520,
  },
  {
    id: 'node-rogue-app',
    label: 'ApexPay Pro: Instant Cash',
    type: 'app_candidate',
    riskCategory: 'Critical',
    details: 'Rogue APK (Apex Financial Tech UK)',
    x: 620,
    y: 420,
  },
  {
    id: 'node-partner',
    label: 'FinTech Daily Partner',
    type: 'social_candidate',
    riskCategory: 'Medium',
    details: 'Authorized Media/Affiliate Showcase',
    x: 680,
    y: 270,
  },
  {
    id: 'node-unrelated',
    label: '@apex_payne_art',
    type: 'social_candidate',
    riskCategory: 'Low',
    details: '3D Artist (Benign Coincidental Name)',
    x: 120,
    y: 280,
  },
];

export const INITIAL_THREAT_EDGES: ThreatEdge[] = [
  // Official Asset relationships (solid, verified)
  {
    id: 'edge-01',
    source: 'node-brand',
    target: 'node-official-social',
    label: 'Official Handle',
    isInferred: false,
    evidenceDetail: 'Account verified via corporate DNS TXT and brand profile configuration.',
    type: 'OFFICIAL_ASSET',
  },
  {
    id: 'edge-02',
    source: 'node-brand',
    target: 'node-official-app',
    label: 'Authorized App',
    isInferred: false,
    evidenceDetail: 'Publisher signature matches enterprise Google Play developer account.',
    type: 'OFFICIAL_ASSET',
  },
  {
    id: 'edge-03',
    source: 'node-brand',
    target: 'node-official-domain',
    label: 'Primary Domain',
    isInferred: false,
    evidenceDetail: 'Corporate DNS ownership verified.',
    type: 'OFFICIAL_ASSET',
  },
  // Threat Cluster 1: Observed Link between rogue social and phishing domain
  {
    id: 'edge-04',
    source: 'node-rogue-social',
    target: 'node-phish-domain',
    label: 'Direct Bio Link',
    isInferred: false,
    evidenceDetail: 'Observed link in profile bio directing victims to credential harvest form.',
    type: 'REDIRECT_LINK',
  },
  // Observed hosting DNS resolution
  {
    id: 'edge-05',
    source: 'node-phish-domain',
    target: 'node-shared-ip',
    label: 'A-Record Resolution',
    isInferred: false,
    evidenceDetail: 'DNS A-record points to bulletproof proxy IP 185.220.101.45.',
    type: 'SHARED_PAYMENT',
  },
  // Inferred relationship: Rogue app communicates with the same C2 server IP
  {
    id: 'edge-06',
    source: 'node-rogue-app',
    target: 'node-shared-ip',
    label: 'Shared C2 Endpoint [Inferred]',
    isInferred: true,
    evidenceDetail: 'Static analysis shows APK dex decompiled code communicates with 185.220.101.45/gate.php. Inferred shared actor infrastructure.',
    type: 'INFERRED_CLUSTER',
  },
  // Partner relationship
  {
    id: 'edge-07',
    source: 'node-brand',
    target: 'node-partner',
    label: 'Affiliate Agreement',
    isInferred: false,
    evidenceDetail: 'Registered under regional marketing agreement PMA-441.',
    type: 'CROSS_PROMOTION',
  },
];
