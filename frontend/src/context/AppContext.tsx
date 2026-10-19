import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import type {
  BrandProfile,
  CandidateAsset,
  InvestigationStatus,
  ThreatNode,
  ThreatEdge,
  RiskLevel,
} from '../types';
import {
  INITIAL_BRAND_PROFILE,
  DEMO_CANDIDATES,
  INITIAL_THREAT_NODES,
  INITIAL_THREAT_EDGES,
} from '../data/demoData';
import api from '../api/client';

export interface BackendBrandOption {
  id: string;
  name: string;
  description: string;
}

export const EMPTY_BRAND_PROFILE: BrandProfile = {
  id: '',
  brandName: '',
  officialWebsite: '',
  officialDomains: [],
  officialSocialUrls: [],
  officialApps: [],
  authorizedPartners: [],
  brandDescription: '',
  logoUrl: '',
  protectedKeywords: [],
  lastUpdated: new Date().toISOString(),
  isCustomBrand: false,
};

/** Outcome of a status change. `saved` is false when the change exists only in this browser session. */
export interface StatusUpdateResult {
  ok: boolean;
  saved: boolean;
  message?: string;
}

interface AppContextType {
  brandProfile: BrandProfile;
  setBrandProfile: React.Dispatch<React.SetStateAction<BrandProfile>>;
  updateBrandProfile: (updates: Partial<BrandProfile>) => void;
  resetBrandProfileToDefault: () => void;

  candidates: CandidateAsset[];
  addCandidate: (candidateData: Partial<CandidateAsset>) => CandidateAsset;
  updateCandidateStatus: (
    id: string,
    newStatus: InvestigationStatus,
    analyst: string,
    note?: string
  ) => Promise<StatusUpdateResult>;
  addAnalystNote: (candidateId: string, author: string, text: string) => void;
  deleteCandidate: (id: string) => void;

  threatNodes: ThreatNode[];
  threatEdges: ThreatEdge[];
  addThreatNode: (node: ThreatNode) => void;
  addThreatEdge: (edge: ThreatEdge) => void;

  activeTab: string;
  setActiveTab: (tab: string) => void;

  selectedCandidateId: string | null;
  /** Finding shown in the Investigations detail panel. Opening a finding from any page sets this and switches there. */
  focusedFindingId: string | null;
  setFocusedFindingId: (id: string | null) => void;
  setSelectedCandidateId: (id: string | null) => void;

  isAnalyzing: boolean;
  setIsAnalyzing: (val: boolean) => void;

  resetAllToDemoData: () => void;

  // Backend synchronization
  backendOnline: boolean;
  backendBrands: BackendBrandOption[];
  selectedBackendBrandId: string | null;
  selectBrandById: (brandId: string) => Promise<void>;
  refreshBackendData: () => Promise<void>;
  isBackendLoading: boolean;

  // Isolated Demo Mode
  isDemoMode: boolean;
  enterDemoMode: () => void;
  exitDemoMode: () => void;

  // Derived metrics
  stats: {
    totalAnalyzed: number;
    activeAlerts: number;
    highRiskCount: number;
    criticalRiskCount: number;
    investigatingCount: number;
    confirmedSuspiciousCount: number;
    dismissedCount: number;
    benignOrOfficialCount: number;
  };
}

const AppContext = createContext<AppContextType | undefined>(undefined);


function mapFindingToCandidate(finding: any): CandidateAsset {
  const riskMap: Record<string, RiskLevel> = {
    CRITICAL: 'Critical',
    HIGH: 'High',
    MEDIUM: 'Medium',
    LOW: 'Low',
  };
  const statusMap: Record<string, InvestigationStatus> = {
    NEW: 'New',
    UNDER_INVESTIGATION: 'Investigating',
    CONFIRMED_THREAT: 'Confirmed Suspicious',
    FALSE_POSITIVE: 'Dismissed',
    RESOLVED: 'Dismissed',
  };

  const riskCategory: RiskLevel = riskMap[finding.severity?.toUpperCase()] || 'Medium';
  const status: InvestigationStatus = statusMap[finding.review_status?.toUpperCase()] || 'New';
  const isApp = finding.asset_type === 'mobile_app' || finding.asset_type === 'app';
  const isDomain = finding.asset_type === 'domain';

  return {
    id: finding.id,
    type: isApp ? 'app' : isDomain ? 'domain' : 'social',
    title: finding.candidate_name || 'Suspicious Asset',
    identifier: finding.candidate_name || '',
    platform: isApp ? 'Mobile App Store' : isDomain ? 'DNS / Web Domain' : 'Social Network',
    url: finding.source_url || '',
    description: `Detected by ${finding.detection_source || 'SURAKSHA Engine'}. Risk score: ${finding.risk_score}/100.`,
    observedBranding: finding.candidate_name,
    evidence: finding.evidence?.map((e: any) => e.description).join('; ') || 'Automated finding evidence',
    riskCategory,
    summary: finding.signals?.[0]?.explanation || `Threat score evaluated at ${finding.risk_score}/100.`,
    evidenceSupporting: finding.evidence?.map((e: any) => e.description) || [finding.signals?.[0]?.explanation || 'Suspicious identifier matching protected brand'],
    evidenceAgainst: finding.is_sample ? ['Demonstration sample telemetry record'] : [],
    missingInformation: [],
    recommendedNextSteps: [
      status === 'Confirmed Suspicious'
        ? 'Initiate takedown request with platform host'
        : 'Perform analyst investigation of registration records',
    ],
    stringSignals: finding.signals?.map((s: any) => ({
      type: s.signal_type,
      detail: s.explanation,
      severity: (s.score > 25 ? 'high' : s.score > 15 ? 'medium' : 'low') as 'high' | 'medium' | 'low',
    })) || [],
    analysisEngine: 'SURAKSHA Detection Engine',
    status,
    statusHistory: [
      {
        from: 'New',
        to: status,
        timestamp: finding.created_at || new Date().toISOString(),
        analyst: 'SURAKSHA Engine',
        note: `Initial risk score evaluated at ${finding.risk_score} (${finding.severity}).`,
      },
    ],
    analystNotes: [],
    createdDate: finding.created_at || new Date().toISOString(),
    isFictionalDemo: Boolean(finding.is_sample),
    scenarioType: 'impersonator',
    tags: [finding.asset_type, finding.severity],
  };
}

function mapBackendBrandToProfile(b: any): BrandProfile {
  return {
    id: b.id,
    brandName: b.name,
    officialWebsite: b.domains?.[0]?.domain ? `https://${b.domains[0].domain}` : '',
    officialDomains: b.domains?.map((d: any) => d.domain) || [],
    officialSocialUrls: b.social_handles?.map((s: any) => ({
      id: `soc-${s.id}`,
      platform: s.platform,
      handle: s.handle,
      url: s.url || '',
      verificationStatus: 'verified_platform',
    })) || [],
    officialApps: b.app_identifiers?.map((a: any) => ({
      id: `app-${a.id}`,
      name: a.app_name || a.identifier,
      developer: b.publishers?.[0]?.publisher_name || 'Official Publisher',
      store: a.platform,
      appId: a.identifier,
      verificationStatus: 'verified_store',
    })) || [],
    authorizedPartners: [],
    brandDescription: b.description || '',
    logoUrl: b.logo_url || '',
    protectedKeywords: [b.name.toLowerCase()],
    lastUpdated: b.updated_at || new Date().toISOString(),
    isCustomBrand: true,
  };
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, userProfile } = useAuth();
  const analystName = userProfile?.displayName || currentUser?.displayName || currentUser?.email || 'SecOps Analyst';

  // Demo mode is explicitly active only for demo accounts or when user clicks "Try Demo"
  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => {
    return currentUser?.uid === 'analyst-demo-001';
  });

  const getStorageKey = (key: string) => {
    return isDemoMode
      ? `suraksha_demo_${key}`
      : `suraksha_user_${currentUser?.uid || 'guest'}_${key}`;
  };

  const [brandProfile, setBrandProfile] = useState<BrandProfile>(() => {
    if (currentUser?.uid === 'analyst-demo-001') {
      return INITIAL_BRAND_PROFILE;
    }
    try {
      const saved = sessionStorage.getItem(`suraksha_user_${currentUser?.uid || 'guest'}_profile`);
      return saved ? JSON.parse(saved) : EMPTY_BRAND_PROFILE;
    } catch {
      return EMPTY_BRAND_PROFILE;
    }
  });

  const [candidates, setCandidates] = useState<CandidateAsset[]>(() => {
    if (currentUser?.uid === 'analyst-demo-001') {
      return DEMO_CANDIDATES;
    }
    try {
      const saved = sessionStorage.getItem(`suraksha_user_${currentUser?.uid || 'guest'}_candidates`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [threatNodes, setThreatNodes] = useState<ThreatNode[]>(() => {
    if (currentUser?.uid === 'analyst-demo-001') {
      return INITIAL_THREAT_NODES;
    }
    try {
      const saved = sessionStorage.getItem(`suraksha_user_${currentUser?.uid || 'guest'}_nodes`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [threatEdges, setThreatEdges] = useState<ThreatEdge[]>(() => {
    if (currentUser?.uid === 'analyst-demo-001') {
      return INITIAL_THREAT_EDGES;
    }
    try {
      const saved = sessionStorage.getItem(`suraksha_user_${currentUser?.uid || 'guest'}_edges`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [activeTab, setActiveTab] = useState<string>('overview');
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [focusedFindingId, setFocusedFindingId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

  // Backend state
  const [backendOnline, setBackendOnline] = useState<boolean>(false);
  const [backendBrands, setBackendBrands] = useState<BackendBrandOption[]>([]);
  const [selectedBackendBrandId, setSelectedBackendBrandId] = useState<string | null>(null);
  const [isBackendLoading, setIsBackendLoading] = useState<boolean>(false);

  // Sync state to scoped sessionStorage
  useEffect(() => {
    if (isDemoMode) return;
    try {
      const uid = currentUser?.uid || 'guest';
      sessionStorage.setItem(`suraksha_user_${uid}_profile`, JSON.stringify(brandProfile));
    } catch (e) {
      console.warn('Failed saving profile to session storage', e);
    }
  }, [brandProfile, isDemoMode, currentUser?.uid]);

  useEffect(() => {
    if (isDemoMode) return;
    try {
      const uid = currentUser?.uid || 'guest';
      sessionStorage.setItem(`suraksha_user_${uid}_candidates`, JSON.stringify(candidates));
    } catch (e) {
      console.warn('Failed saving candidates to session storage', e);
    }
  }, [candidates, isDemoMode, currentUser?.uid]);

  useEffect(() => {
    if (isDemoMode) return;
    try {
      const uid = currentUser?.uid || 'guest';
      sessionStorage.setItem(`suraksha_user_${uid}_nodes`, JSON.stringify(threatNodes));
      sessionStorage.setItem(`suraksha_user_${uid}_edges`, JSON.stringify(threatEdges));
    } catch (e) {
      console.warn('Failed saving threat graph', e);
    }
  }, [threatNodes, threatEdges, isDemoMode, currentUser?.uid]);

  // Demo mode toggles
  const enterDemoMode = useCallback(() => {
    setIsDemoMode(true);
    setSelectedBackendBrandId('demo-apexpay');
    setBrandProfile(INITIAL_BRAND_PROFILE);
    setCandidates(DEMO_CANDIDATES);
    setThreatNodes(INITIAL_THREAT_NODES);
    setThreatEdges(INITIAL_THREAT_EDGES);
  }, []);

  const exitDemoMode = useCallback(() => {
    setIsDemoMode(false);
    setSelectedBackendBrandId(null);
    setBrandProfile(EMPTY_BRAND_PROFILE);
    setCandidates([]);
    setThreatNodes([]);
    setThreatEdges([]);
  }, []);

  // Backend brand and telemetry synchronization
  const refreshBackendData = useCallback(async () => {
    setIsBackendLoading(true);
    try {
      const health = await api.getHealth();
      setBackendOnline(Boolean(health?.success && health?.database?.connected));

      if (isDemoMode) {
        // Query sample demo brands
        const brandRes = await api.listBrands({ isSample: true });
        if (brandRes?.success && Array.isArray(brandRes.data) && brandRes.data.length > 0) {
          setBackendBrands(
            brandRes.data.map((b: any) => ({
              id: b.id,
              name: b.name,
              description: b.description || '',
            }))
          );
        } else {
          setBackendBrands([
            { id: 'demo-apexpay', name: 'ApexPay Global (Demo)', description: 'Simulated Fintech Platform' }
          ]);
        }
        return;
      }

      // Real user workspace: strictly query genuine user records (is_sample=False)
      const brandRes = await api.listBrands({ isSample: false });
      if (brandRes?.success && Array.isArray(brandRes.data)) {
        const userBrands = brandRes.data.map((b: any) => ({
          id: b.id,
          name: b.name,
          description: b.description || '',
        }));
        setBackendBrands(userBrands);

        if (userBrands.length === 0) {
          // Accurate, pristine empty workspace for new real user
          setBrandProfile(EMPTY_BRAND_PROFILE);
          setCandidates([]);
          setThreatNodes([]);
          setThreatEdges([]);
          setSelectedBackendBrandId(null);
        } else {
          // Select existing active brand or first owned brand
          const currentId =
            selectedBackendBrandId && userBrands.some((b: any) => b.id === selectedBackendBrandId)
              ? selectedBackendBrandId
              : userBrands[0].id;

          setSelectedBackendBrandId(currentId);
          const brandDetail = await api.getBrand(currentId);
          if (brandDetail?.success && brandDetail.data) {
            setBrandProfile(mapBackendBrandToProfile(brandDetail.data));
          }

          const findingsRes = await api.listFindings({ brandId: currentId, isSample: false, perPage: 100 });
          if (findingsRes?.success && Array.isArray(findingsRes.data)) {
            setCandidates(findingsRes.data.map(mapFindingToCandidate));
          } else {
            setCandidates([]);
          }
        }
      }
    } catch (err) {
      console.warn('[SURAKSHA] Backend sync notice:', err);
      setBackendOnline(false);
    } finally {
      setIsBackendLoading(false);
    }
  }, [isDemoMode, selectedBackendBrandId]);

  useEffect(() => {
    refreshBackendData();
  }, [refreshBackendData]);

  const selectBrandById = async (brandId: string) => {
    if (brandId === 'demo-apexpay') {
      enterDemoMode();
      return;
    }

    try {
      setIsBackendLoading(true);
      if (isDemoMode) {
        setIsDemoMode(false);
      }
      const res = await api.getBrand(brandId);
      if (res?.success && res.data) {
        const mapped = mapBackendBrandToProfile(res.data);
        setBrandProfile(mapped);
        setSelectedBackendBrandId(brandId);

        // Fetch brand-specific findings without demo data leakage
        const findingsRes = await api.listFindings({ brandId, isSample: false, perPage: 100 });
        if (findingsRes?.success && Array.isArray(findingsRes.data)) {
          setCandidates(findingsRes.data.map(mapFindingToCandidate));
        } else {
          setCandidates([]);
        }
      }
    } catch (err) {
      console.warn('Failed loading brand details from API:', err);
    } finally {
      setIsBackendLoading(false);
    }
  };

  const updateBrandProfile = (updates: Partial<BrandProfile>) => {
    setBrandProfile(prev => {
      const next = {
        ...prev,
        ...updates,
        lastUpdated: new Date().toISOString(),
      };

      // Try syncing to backend if it is a registered backend brand
      if (selectedBackendBrandId) {
        api.updateBrand(selectedBackendBrandId, {
          name: next.brandName,
          description: next.brandDescription,
          domains: next.officialDomains.map((d, i) => ({ domain: d, is_primary: i === 0 })),
          social_handles: next.officialSocialUrls.map(s => ({ platform: s.platform, handle: s.handle, url: s.url })),
          app_identifiers: next.officialApps.map(a => ({ platform: a.store || 'android_play_store', identifier: a.appId || a.name, app_name: a.name })),
          publishers: next.officialApps.map(a => ({ publisher_name: a.developer, platform: a.store })),
        }).catch(err => console.warn('Could not update backend brand:', err));
      }

      return next;
    });
  };

  const resetBrandProfileToDefault = () => {
    setBrandProfile(isDemoMode ? INITIAL_BRAND_PROFILE : EMPTY_BRAND_PROFILE);
  };

  const resetAllToDemoData = () => {
    if (!isDemoMode) {
      console.warn('[SURAKSHA Security] resetAllToDemoData rejected: not in demo mode.');
      return;
    }
    setBrandProfile(INITIAL_BRAND_PROFILE);
    setCandidates(DEMO_CANDIDATES);
    setThreatNodes(INITIAL_THREAT_NODES);
    setThreatEdges(INITIAL_THREAT_EDGES);
    setSelectedCandidateId(null);
    setSelectedBackendBrandId('demo-apexpay');
  };

  const addCandidate = (candidateData: Partial<CandidateAsset>): CandidateAsset => {
    const newId = `cand-${Date.now().toString().slice(-5)}`;
    const fullCandidate: CandidateAsset = {
      id: newId,
      type: candidateData.type || 'social',
      title: candidateData.title || 'Untitled Candidate',
      identifier: candidateData.identifier || '',
      platform: candidateData.platform || 'General Platform',
      url: candidateData.url || '',
      description: candidateData.description || '',
      observedBranding: candidateData.observedBranding || '',
      developer: candidateData.developer,
      evidence: candidateData.evidence || '',
      riskCategory: candidateData.riskCategory || 'Low',
      summary: candidateData.summary || 'Initial triage completed.',
      evidenceSupporting: candidateData.evidenceSupporting || [],
      evidenceAgainst: candidateData.evidenceAgainst || [],
      missingInformation: candidateData.missingInformation || [],
      recommendedNextSteps: candidateData.recommendedNextSteps || ['Verify account credentials'],
      impersonationIndicators: candidateData.impersonationIndicators || [],
      conflictingEvidence: candidateData.conflictingEvidence || [],
      isBenignExplanationPossible: candidateData.isBenignExplanationPossible,
      benignExplanation: candidateData.benignExplanation,
      developerMismatch: candidateData.developerMismatch,
      suspiciousPermissions: candidateData.suspiciousPermissions,
      stringSignals: candidateData.stringSignals,
      stringSimilarity: candidateData.stringSimilarity,
      levenshteinDistance: candidateData.levenshteinDistance,
      analysisEngine: candidateData.analysisEngine || 'SURAKSHA Detection Engine',
      status: 'New',
      statusHistory: [
        {
          from: 'New',
          to: 'New',
          timestamp: new Date().toISOString(),
          analyst: analystName || 'System (AI Intake)',
          note: 'Candidate asset ingested into Suraksha AI.',
        },
      ],
      analystNotes: [],
      createdDate: new Date().toISOString(),
      isFictionalDemo: false,
      scenarioType: 'custom',
      tags: [candidateData.type || 'asset', candidateData.riskCategory || 'Low'],
    };

    setCandidates(prev => [fullCandidate, ...prev]);

    // Also inject node into threat graph
    const newNode: ThreatNode = {
      id: `node-${newId}`,
      label: fullCandidate.title.length > 20 ? fullCandidate.title.slice(0, 18) + '...' : fullCandidate.title,
      type: fullCandidate.type === 'app' ? 'app_candidate' : fullCandidate.type === 'domain' ? 'domain_candidate' : 'social_candidate',
      riskCategory: fullCandidate.riskCategory,
      details: `${fullCandidate.identifier} (${fullCandidate.platform})`,
      x: 300 + Math.floor(Math.random() * 300),
      y: 350 + Math.floor(Math.random() * 150),
    };

    setThreatNodes(prev => [...prev, newNode]);

    // If high or critical, link inferred edge
    if (fullCandidate.riskCategory === 'Critical' || fullCandidate.riskCategory === 'High') {
      const newEdge: ThreatEdge = {
        id: `edge-${Date.now()}`,
        source: 'node-brand',
        target: `node-${newId}`,
        label: 'Impersonation Suspect [Inferred]',
        isInferred: true,
        evidenceDetail: `AI threat score flagged as ${fullCandidate.riskCategory} based on observed assets.`,
        type: 'INFERRED_CLUSTER',
      };
      setThreatEdges(prev => [...prev, newEdge]);
    }

    // Persist to backend database if connected to a real brand
    if (selectedBackendBrandId) {
      api.scanCandidate(selectedBackendBrandId, {
        asset_type: fullCandidate.type === 'app' ? 'mobile_app' : fullCandidate.type,
        candidate_name: fullCandidate.identifier || fullCandidate.title,
        source_url: fullCandidate.url,
        description: fullCandidate.description,
        is_sample: false,
        detection_source: 'analyst_submission',
      }).catch(err => console.warn('Could not persist candidate to backend:', err));
    }

    return fullCandidate;
  };

  const updateCandidateStatus = async (
    id: string,
    newStatus: InvestigationStatus,
    analyst: string,
    note?: string
  ): Promise<StatusUpdateResult> => {
    // Map to backend status enum
    const backendStatusMap: Record<InvestigationStatus, string> = {
      'New': 'NEW',
      'Investigating': 'UNDER_INVESTIGATION',
      'Confirmed Suspicious': 'CONFIRMED_THREAT',
      'Dismissed': 'FALSE_POSITIVE',
    };

    const previous = candidates.find(c => c.id === id);
    if (!previous) return { ok: false, saved: false, message: 'Finding not found.' };

    const entry = {
      from: previous.status,
      to: newStatus,
      timestamp: new Date().toISOString(),
      analyst: analyst || analystName || 'Security Analyst',
      note: note || `Status transitioned to ${newStatus}.`,
    };
    setCandidates(prev =>
      prev.map(c => (c.id === id ? { ...c, status: newStatus, statusHistory: [...c.statusHistory, entry] } : c))
    );

    // Demo findings never touch the backend.
    if (isDemoMode) return { ok: true, saved: false, message: 'Demo data: changed in this session only.' };

    try {
      await api.updateFindingStatus(id, backendStatusMap[newStatus]);
      return { ok: true, saved: true };
    } catch (err: any) {
      // Roll back so the screen never shows a status the server does not have.
      setCandidates(prev =>
        prev.map(c => (c.id === id ? { ...c, status: previous.status, statusHistory: c.statusHistory.filter(h => h !== entry) } : c))
      );
      return { ok: false, saved: false, message: err?.message || 'The server did not accept the change.' };
    }
  };

  const addAnalystNote = (candidateId: string, author: string, text: string) => {
    setCandidates(prev =>
      prev.map(c => {
        if (c.id === candidateId) {
          const newNote = {
            id: `note-${Date.now()}`,
            author: author || analystName || 'Security Analyst',
            text,
            timestamp: new Date().toISOString(),
          };
          return {
            ...c,
            analystNotes: [newNote, ...c.analystNotes],
          };
        }
        return c;
      })
    );
  };

  const deleteCandidate = (id: string) => {
    setCandidates(prev => prev.filter(c => c.id !== id));
    setThreatNodes(prev => prev.filter(n => n.id !== `node-${id}`));
    setThreatEdges(prev => prev.filter(e => e.source !== `node-${id}` && e.target !== `node-${id}`));
    if (selectedCandidateId === id) {
      setSelectedCandidateId(null);
    }
  };

  const addThreatNode = (node: ThreatNode) => {
    setThreatNodes(prev => [...prev, node]);
  };

  const addThreatEdge = (edge: ThreatEdge) => {
    setThreatEdges(prev => [...prev, edge]);
  };

  // Compute live metrics
  const stats = {
    totalAnalyzed: candidates.length,
    activeAlerts: candidates.filter(
      c => (c.riskCategory === 'Critical' || c.riskCategory === 'High') && c.status !== 'Dismissed'
    ).length,
    highRiskCount: candidates.filter(c => c.riskCategory === 'High').length,
    criticalRiskCount: candidates.filter(c => c.riskCategory === 'Critical').length,
    investigatingCount: candidates.filter(c => c.status === 'Investigating').length,
    confirmedSuspiciousCount: candidates.filter(c => c.status === 'Confirmed Suspicious').length,
    dismissedCount: candidates.filter(c => c.status === 'Dismissed').length,
    benignOrOfficialCount: candidates.filter(
      c => c.riskCategory === 'Low' || c.scenarioType === 'official' || c.scenarioType === 'unrelated'
    ).length,
  };

  return (
    <AppContext.Provider
      value={{
        brandProfile,
        setBrandProfile,
        updateBrandProfile,
        resetBrandProfileToDefault,
        candidates,
        addCandidate,
        updateCandidateStatus,
        addAnalystNote,
        deleteCandidate,
        threatNodes,
        threatEdges,
        addThreatNode,
        addThreatEdge,
        activeTab,
        setActiveTab,
        selectedCandidateId,
        focusedFindingId,
        setFocusedFindingId,
        setSelectedCandidateId,
        isAnalyzing,
        setIsAnalyzing,
        resetAllToDemoData,
        backendOnline,
        backendBrands,
        selectedBackendBrandId,
        selectBrandById,
        refreshBackendData,
        isBackendLoading,
        isDemoMode,
        enterDemoMode,
        exitDemoMode,
        stats,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
