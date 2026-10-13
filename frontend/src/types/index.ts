export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Critical';

export type InvestigationStatus = 'New' | 'Investigating' | 'Confirmed Suspicious' | 'Dismissed';

export type AssetType = 'social' | 'app' | 'domain' | 'infrastructure';

export type AssetVerificationTier = 'verified_dns' | 'verified_platform' | 'verified_store' | 'contract_verified' | 'user_declared' | 'unverified';

export interface OfficialSocial {
  id?: string;
  platform: string;
  handle: string;
  url: string;
  verificationStatus: AssetVerificationTier;
  notes?: string;
}

export interface OfficialApp {
  id?: string;
  name: string;
  developer: string;
  store: string;
  storeUrl?: string;
  appId?: string;
  verificationStatus: AssetVerificationTier;
}

export interface AuthorizedPartner {
  id: string;
  name: string;
  websiteUrl: string;
  relationshipType: 'Merchant Partner' | 'Affiliate Network' | 'Distribution Partner' | 'Hardware / POS Partner' | 'Technology Integration';
  authorizedMarks: string;
  verificationStatus: AssetVerificationTier;
  agreementReference?: string;
}

export interface BrandProfile {
  id: string;
  brandName: string;
  officialWebsite: string;
  officialDomains: string[];
  officialSocialUrls: OfficialSocial[];
  officialApps: OfficialApp[];
  authorizedPartners: AuthorizedPartner[];
  brandDescription: string;
  logoUrl?: string;
  protectedKeywords: string[];
  lastUpdated: string;
  isCustomBrand?: boolean;
}

export interface AnalystNote {
  id: string;
  author: string;
  text: string;
  timestamp: string;
}

export interface StatusHistoryEntry {
  from: InvestigationStatus;
  to: InvestigationStatus;
  timestamp: string;
  analyst: string;
  note?: string;
}

export interface StringSignal {
  type: string;
  detail: string;
  severity: 'low' | 'medium' | 'high';
}

export interface CandidateAsset {
  id: string;
  type: AssetType;
  title: string;
  identifier: string; // e.g. @handle or app bundle or domain
  platform: string;
  url: string;
  description: string;
  observedBranding?: string;
  developer?: string;
  evidence: string;
  
  // AI and Threat Analysis
  riskCategory: RiskLevel;
  summary: string;
  evidenceSupporting: string[];
  evidenceAgainst: string[];
  missingInformation: string[];
  recommendedNextSteps: string[];
  impersonationIndicators?: string[];
  conflictingEvidence?: string[];
  isBenignExplanationPossible?: boolean;
  benignExplanation?: string;
  
  // Specific checks
  developerMismatch?: boolean;
  suspiciousPermissions?: string[];
  stringSignals?: StringSignal[];
  stringSimilarity?: number;
  levenshteinDistance?: number;
  analysisEngine?: string;

  // Investigation & Workflow
  status: InvestigationStatus;
  statusHistory: StatusHistoryEntry[];
  analystNotes: AnalystNote[];
  createdDate: string;
  isFictionalDemo?: boolean;
  scenarioType?: 'official' | 'impersonator' | 'partner' | 'rogue_app' | 'unrelated' | 'custom';
  tags?: string[];
}

export interface ThreatNode {
  id: string;
  label: string;
  type: 'brand' | 'official_asset' | 'social_candidate' | 'app_candidate' | 'domain_candidate' | 'shared_infra';
  riskCategory: RiskLevel | 'Safe';
  details: string;
  isInferred?: boolean;
  x?: number;
  y?: number;
}

export interface ThreatEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  isInferred: boolean;
  evidenceDetail: string;
  type: 'OFFICIAL_ASSET' | 'SHARED_PAYMENT' | 'CROSS_PROMOTION' | 'SHARED_DEVELOPER' | 'REDIRECT_LINK' | 'INFERRED_CLUSTER';
}
