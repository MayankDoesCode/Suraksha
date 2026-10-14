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
  ) => void;
  addAnalystNote: (candidateId: string, author: string, text: string) => void;
  deleteCandidate: (id: string) => void;

  threatNodes: ThreatNode[];
  threatEdges: ThreatEdge[];
  addThreatNode: (node: ThreatNode) => void;
  addThreatEdge: (edge: ThreatEdge) => void;

  activeTab: string;
  setActiveTab: (tab: string) => void;

  selectedCandidateId: string | null;
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

const STORAGE_KEY_PROFILE = 'brandshield_profile_v1';
const STORAGE_KEY_CANDIDATES = 'brandshield_candidates_v1';
const STORAGE_KEY_NODES = 'brandshield_nodes_v1';
const STORAGE_KEY_EDGES = 'brandshield_edges_v1';

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

  const [brandProfile, setBrandProfile] = useState<BrandProfile>(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY_PROFILE);
      return saved ? JSON.parse(saved) : INITIAL_BRAND_PROFILE;
    } catch {
      return INITIAL_BRAND_PROFILE;
    }
  });

  const [candidates, setCandidates] = useState<CandidateAsset[]>(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY_CANDIDATES);
      return saved ? JSON.parse(saved) : DEMO_CANDIDATES;
    } catch {
      return DEMO_CANDIDATES;
    }
  });

  const [threatNodes, setThreatNodes] = useState<ThreatNode[]>(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY_NODES);
      return saved ? JSON.parse(saved) : INITIAL_THREAT_NODES;
    } catch {
      return INITIAL_THREAT_NODES;
    }
  });

  const [threatEdges, setThreatEdges] = useState<ThreatEdge[]>(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY_EDGES);
      return saved ? JSON.parse(saved) : INITIAL_THREAT_EDGES;
    } catch {
      return INITIAL_THREAT_EDGES;
    }
  });

  const [activeTab, setActiveTab] = useState<string>('overview');
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

  // Backend state
  const [backendOnline, setBackendOnline] = useState<boolean>(false);
  const [backendBrands, setBackendBrands] = useState<BackendBrandOption[]>([]);
  const [selectedBackendBrandId, setSelectedBackendBrandId] = useState<string | null>(null);
  const [isBackendLoading, setIsBackendLoading] = useState<boolean>(false);

  // Sync state to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(brandProfile));
    } catch (e) {
      console.warn('Failed saving profile to session storage', e);
    }
  }, [brandProfile]);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY_CANDIDATES, JSON.stringify(candidates));
    } catch (e) {
      console.warn('Failed saving candidates to session storage', e);
    }
  }, [candidates]);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY_NODES, JSON.stringify(threatNodes));
      sessionStorage.setItem(STORAGE_KEY_EDGES, JSON.stringify(threatEdges));
    } catch (e) {
      console.warn('Failed saving threat graph', e);
    }
  }, [threatNodes, threatEdges]);

  // Initial backend health and brand synchronization
  const refreshBackendData = useCallback(async () => {
    setIsBackendLoading(true);
    try {
      const health = await api.getHealth();
      setBackendOnline(Boolean(health?.success && health?.database?.connected));

      const brandRes = await api.listBrands();
      if (brandRes?.success && Array.isArray(brandRes.data)) {
        setBackendBrands(
          brandRes.data.map((b: any) => ({
            id: b.id,
            name: b.name,
            description: b.description || '',
          }))
        );

        // If user hasn't selected a brand or active brand matches backend
        if (brandRes.data.length > 0) {
          const currentMatchesBackend = brandRes.data.find((b: any) => b.id === brandProfile.id);
          if (currentMatchesBackend) {
            setSelectedBackendBrandId(currentMatchesBackend.id);
          }
        }
      }

      // Fetch real findings if brand id matches
      const findingsRes = await api.listFindings({ brandId: brandProfile.id, perPage: 100 });
      if (findingsRes?.success && Array.isArray(findingsRes.data) && findingsRes.data.length > 0) {
        const backendCandidates = findingsRes.data.map(mapFindingToCandidate);
        // Combine backend findings with non-persisted custom ones
        setCandidates(prev => {
          const nonBackend = prev.filter(c => !findingsRes.data.some((f: any) => f.id === c.id));
          return [...backendCandidates, ...nonBackend];
        });
      }
    } catch (err) {
      // Backend may be offline during standalone dev; fall back gracefully to demo context
      setBackendOnline(false);
    } finally {
      setIsBackendLoading(false);
    }
  }, [brandProfile.id]);

  useEffect(() => {
    refreshBackendData();
  }, [refreshBackendData]);

  const selectBrandById = async (brandId: string) => {
    if (brandId === 'demo-apexpay') {
      setSelectedBackendBrandId(null);
      setBrandProfile(INITIAL_BRAND_PROFILE);
      setCandidates(DEMO_CANDIDATES);
      return;
    }

    try {
      setIsBackendLoading(true);
      const res = await api.getBrand(brandId);
      if (res?.success && res.data) {
        const mapped = mapBackendBrandToProfile(res.data);
        setBrandProfile(mapped);
        setSelectedBackendBrandId(brandId);

        // Fetch brand-specific findings
        const findingsRes = await api.listFindings({ brandId, perPage: 100 });
        if (findingsRes?.success && Array.isArray(findingsRes.data)) {
          if (findingsRes.data.length > 0) {
            setCandidates(findingsRes.data.map(mapFindingToCandidate));
          } else {
            setCandidates([]);
          }
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
    setBrandProfile(INITIAL_BRAND_PROFILE);
  };

  const resetAllToDemoData = () => {
    setBrandProfile(INITIAL_BRAND_PROFILE);
    setCandidates(DEMO_CANDIDATES);
    setThreatNodes(INITIAL_THREAT_NODES);
    setThreatEdges(INITIAL_THREAT_EDGES);
    setSelectedCandidateId(null);
    setSelectedBackendBrandId(null);
    try {
      sessionStorage.removeItem(STORAGE_KEY_PROFILE);
      sessionStorage.removeItem(STORAGE_KEY_CANDIDATES);
      sessionStorage.removeItem(STORAGE_KEY_NODES);
      sessionStorage.removeItem(STORAGE_KEY_EDGES);
    } catch (e) {
      console.warn(e);
    }
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

  const updateCandidateStatus = (
    id: string,
    newStatus: InvestigationStatus,
    analyst: string,
    note?: string
  ) => {
    // Map to backend status enum
    const backendStatusMap: Record<InvestigationStatus, string> = {
      'New': 'NEW',
      'Investigating': 'UNDER_INVESTIGATION',
      'Confirmed Suspicious': 'CONFIRMED_THREAT',
      'Dismissed': 'FALSE_POSITIVE',
    };

    setCandidates(prev =>
      prev.map(c => {
        if (c.id === id) {
          const newHistory = [
            ...c.statusHistory,
            {
              from: c.status,
              to: newStatus,
              timestamp: new Date().toISOString(),
              analyst: analyst || analystName || 'Security Analyst',
              note: note || `Status transitioned to ${newStatus}.`,
            },
          ];
          return {
            ...c,
            status: newStatus,
            statusHistory: newHistory,
          };
        }
        return c;
      })
    );

    // Persist review status change to backend if it's a backend finding UUID
    const mapped = backendStatusMap[newStatus];
    if (mapped) {
      api.updateFindingStatus(id, mapped).catch(err => {
        console.warn('Backend status update note (ignorable for demo records):', err.message);
      });
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
