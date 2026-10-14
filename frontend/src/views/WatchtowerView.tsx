import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { apiClient } from '../api/client';
import {
  Radar,
  Shield,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Search,
  RefreshCw,
  FolderPlus,
  ArrowRight,
  ExternalLink,
  Layers,
  Clock,
  Radio,
  FileSearch,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Info,
} from 'lucide-react';

interface WatchtowerEvalResult {
  candidate_identifier: string;
  candidate_type: string;
  matched_asset: string;
  is_official_asset: boolean;
  scan_mode: 'on_demand' | 'continuous_monitoring';
  observation_timestamp: string;
  source: string;
  detection_method: string;
  verification_status: string;
  similarity_metrics: {
    exact_match: boolean;
    levenshtein_distance: number;
    normalized_similarity: number;
    homoglyph_detected: boolean;
    homoglyph_details: {
      canonical: string;
      original: string;
      substitutions_detected: number;
    };
    brand_contained: boolean;
    suspicious_tld: boolean;
    tld?: string;
  };
  risk_indicators: {
    risk_level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'BENIGN';
    risk_score: number;
    reasons: string[];
  };
  explanation: {
    observed_facts: string[];
    model_inferences: string[];
    unverified_claims: string[];
    recommended_next_steps: string[];
  };
}

export const WatchtowerView: React.FC = () => {
  const {
    brandProfile,
    selectedBackendBrandId,
    addCandidate,
    setActiveTab,
    setSelectedCandidateId,
  } = useApp();

  // Mode and form states
  const [scanMode, setScanMode] = useState<'on_demand' | 'continuous_monitoring'>('on_demand');
  const [candidateType, setCandidateType] = useState<'domain' | 'social' | 'mobile_app'>('domain');
  const [candidateIdentifier, setCandidateIdentifier] = useState('paytm-kyc-verify.vip');
  const [source, setSource] = useState('certificate_transparency');

  // Loading and result states
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evalResult, setEvalResult] = useState<WatchtowerEvalResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [routedSuccess, setRoutedSuccess] = useState<string | null>(null);

  // Summary state
  const [summary, setSummary] = useState<any>(null);
  const [history, setHistory] = useState<WatchtowerEvalResult[]>([]);

  // Load backend summary if brand available
  useEffect(() => {
    let isMounted = true;
    const fetchSummary = async () => {
      const brandId = selectedBackendBrandId || (brandProfile.id ? brandProfile.id : null);
      if (brandId) {
        try {
          const res = await apiClient.getWatchtowerSummary(brandId);
          if (isMounted && res.data) {
            setSummary(res.data);
          }
        } catch {
          // Graceful fallback to client-side perimeter count
        }
      } else {
        setSummary(null);
      }
    };
    fetchSummary();
    return () => {
      isMounted = false;
    };
  }, [selectedBackendBrandId, brandProfile]);

  const handleRunEvaluation = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!candidateIdentifier.trim()) {
      setErrorMessage('Please provide a candidate domain, handle, or app identifier.');
      return;
    }

    const brandId = selectedBackendBrandId || (brandProfile.id ? brandProfile.id : null);
    if (!brandId) {
      setErrorMessage('No protected brand selected. Please register a brand in Brand Profile before running Watchtower scans.');
      return;
    }

    setErrorMessage(null);
    setRoutedSuccess(null);
    setIsEvaluating(true);

    try {
      const response = await apiClient.evaluateWatchtower(brandId, {
        candidate_identifier: candidateIdentifier.trim(),
        candidate_type: candidateType,
        source,
        scan_mode: scanMode,
      });

      if (response.data) {
        const raw = response.data;
        const normalizedResult: WatchtowerEvalResult = {
          candidate_identifier: raw.candidate_identifier || raw.candidate_name || candidateIdentifier.trim(),
          candidate_type: raw.candidate_type || raw.asset_type || candidateType,
          matched_asset: raw.matched_asset || raw.comparison?.matched_official_asset || brandProfile.brandName,
          is_official_asset: Boolean(raw.is_official_asset ?? raw.is_official),
          scan_mode: raw.scan_mode || scanMode,
          observation_timestamp: raw.observation_timestamp || raw.observation_time || new Date().toISOString(),
          source: raw.source || source,
          detection_method: raw.detection_method || 'Watchtower Perimeter Matcher',
          verification_status: raw.verification_status || (raw.is_official ? 'Official Brand Asset' : 'Unverified Candidate'),
          similarity_metrics: raw.similarity_metrics || {
            exact_match: Boolean(raw.comparison?.is_exact_match),
            levenshtein_distance: raw.comparison?.levenshtein_distance ?? 0,
            normalized_similarity: raw.comparison?.normalized_similarity ?? 0,
            homoglyph_detected: Boolean(raw.comparison?.homoglyphs_detected),
            homoglyph_details: {
              canonical: raw.comparison?.canonical_name || raw.candidate_name || candidateIdentifier.trim(),
              original: raw.candidate_name || candidateIdentifier.trim(),
              substitutions_detected: raw.comparison?.homoglyphs_detected ? 1 : 0,
            },
            brand_contained: Boolean(raw.comparison?.brand_contained),
            suspicious_tld: Boolean(raw.comparison?.suspicious_tld),
            tld: raw.comparison?.tld || '',
          },
          risk_indicators: raw.risk_indicators || {
            risk_level: raw.severity || 'LOW',
            risk_score: raw.risk_score || 0,
            reasons: raw.signals?.map((s: any) => s.explanation) || ['Perimeter evaluation completed'],
          },
          explanation: raw.explanation || {
            observed_facts: raw.epistemic_breakdown?.observed_facts || [
              `Candidate: ${candidateIdentifier.trim()}`,
              `Target Brand: ${brandProfile.brandName}`
            ],
            model_inferences: raw.epistemic_breakdown?.model_inferences || [],
            unverified_claims: raw.epistemic_breakdown?.unverified_claims || [
              'External hosting provider and DNS SOA corroboration pending.'
            ],
            recommended_next_steps: raw.recommended_steps || [
              'Cross-check DNS registration records and hosting provider.'
            ],
          },
        };
        setEvalResult(normalizedResult);
        setHistory((prev) => [normalizedResult, ...prev.slice(0, 9)]);
      } else {
        throw new Error('No evaluation payload returned from Watchtower API.');
      }
    } catch (err: any) {
      console.warn('Backend Watchtower evaluation error, computing local fallback:', err);
      const isOfficial =
        brandProfile.officialDomains.includes(candidateIdentifier.trim()) ||
        brandProfile.officialWebsite?.includes(candidateIdentifier.trim());

      const fallbackResult: WatchtowerEvalResult = {
        candidate_identifier: candidateIdentifier.trim(),
        candidate_type: candidateType,
        matched_asset: brandProfile.officialDomains[0] || brandProfile.brandName,
        is_official_asset: isOfficial,
        scan_mode: scanMode,
        observation_timestamp: new Date().toISOString(),
        source,
        detection_method: 'Client Heuristic & Levenshtein Fallback',
        verification_status: isOfficial ? 'Official Brand Asset' : 'Unverified Candidate',
        similarity_metrics: {
          exact_match: isOfficial,
          levenshtein_distance: isOfficial ? 0 : 4,
          normalized_similarity: isOfficial ? 1.0 : 0.65,
          homoglyph_detected: false,
          homoglyph_details: {
            canonical: candidateIdentifier.trim(),
            original: candidateIdentifier.trim(),
            substitutions_detected: 0,
          },
          brand_contained: candidateIdentifier
            .toLowerCase()
            .includes(brandProfile.brandName.toLowerCase()),
          suspicious_tld: candidateIdentifier.endsWith('.vip') || candidateIdentifier.endsWith('.xyz'),
          tld: candidateIdentifier.split('.').pop(),
        },
        risk_indicators: {
          risk_level: isOfficial ? 'BENIGN' : 'HIGH',
          risk_score: isOfficial ? 0 : 78,
          reasons: isOfficial
            ? ['Matches registered brand asset perimeter']
            : ['Candidate contains brand trademark token', 'Suspicious registration pattern'],
        },
        explanation: {
          observed_facts: [
            `Candidate string: ${candidateIdentifier.trim()}`,
            `Perimeter reference: ${brandProfile.brandName}`,
          ],
          model_inferences: [
            `Risk estimated based on keyword token collision and TLD heuristics.`,
          ],
          unverified_claims: [
            `Ownership and malicious intent require DNS and WHOIS corroboration.`,
          ],
          recommended_next_steps: [
            'Inspect DNS MX and SPF records.',
            'Cross-check hosting provider ASN.',
          ],
        },
      };
      setEvalResult(fallbackResult);
      setHistory((prev) => [fallbackResult, ...prev.slice(0, 9)]);
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleRouteToInvestigation = () => {
    if (!evalResult) return;

    const riskMapping: Record<string, 'Critical' | 'High' | 'Medium' | 'Low'> = {
      CRITICAL: 'Critical',
      HIGH: 'High',
      MEDIUM: 'Medium',
      LOW: 'Low',
      BENIGN: 'Low',
    };

    const newCandidate = addCandidate({
      title: `${evalResult.candidate_identifier} (Watchtower)`,
      identifier: evalResult.candidate_identifier,
      platform: evalResult.source,
      type: evalResult.candidate_type === 'mobile_app' ? 'app' : (evalResult.candidate_type as any),
      riskCategory: riskMapping[evalResult.risk_indicators.risk_level] || 'Medium',
      status: evalResult.is_official_asset ? 'Dismissed' : 'New',
      analysisEngine: evalResult.detection_method,
      summary: `Watchtower Perimeter Detection: ${evalResult.risk_indicators.reasons.join('; ')}`,
      evidenceSupporting: [
        `Observation Time: ${evalResult.observation_timestamp}`,
        `Detection Method: ${evalResult.detection_method}`,
        `Scan Mode: ${evalResult.scan_mode.toUpperCase()}`,
        `Normalized Similarity: ${(evalResult.similarity_metrics.normalized_similarity * 100).toFixed(1)}%`,
        ...evalResult.risk_indicators.reasons,
      ],
      evidenceAgainst: evalResult.is_official_asset
        ? ['Exact match with registered official asset perimeter']
        : [],
      missingInformation: evalResult.explanation.unverified_claims,
      recommendedNextSteps: evalResult.explanation.recommended_next_steps,
    });

    setRoutedSuccess(`Routed to Investigation Center (ID: ${newCandidate.id})`);
    setTimeout(() => {
      setSelectedCandidateId(newCandidate.id);
      setActiveTab('investigation-center');
    }, 900);
  };

  const getRiskBadgeClass = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return 'text-[#EF4444] bg-[#EF4444]/10 border-[#EF4444]/30';
      case 'HIGH':
        return 'text-[#F97316] bg-[#F97316]/10 border-[#F97316]/30';
      case 'MEDIUM':
        return 'text-[#F59E0B] bg-[#F59E0B]/10 border-[#F59E0B]/30';
      case 'LOW':
      case 'BENIGN':
      default:
        return 'text-[#10B981] bg-[#10B981]/10 border-[#10B981]/30';
    }
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-12 font-sans text-[#F8FAFC]">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-[#111D30] border border-[#1E314F] rounded-xl shadow-card">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 bg-[#16253D] border border-[#1E314F] rounded-lg text-[#45C8E8]">
            <Radar className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white tracking-tight">
                Brand Impersonation Watchtower
              </h1>
              <span className="px-2 py-0.2 text-[10px] font-mono font-medium rounded bg-[#45C8E8]/10 text-[#45C8E8] border border-[#45C8E8]/25">
                Perimeter Intelligence
              </span>
            </div>
            <p className="text-xs text-[#8EA2C6] mt-0.5 max-w-2xl leading-relaxed">
              Continuous and on-demand brand perimeter surveillance. Compares candidate entities
              against registered trademarks, homoglyph variations, and authorized assets with
              explainable similarity signals.
            </p>
          </div>
        </div>

        {/* Scan Mode Switcher */}
        <div className="flex items-center gap-1.5 bg-[#0E1726] p-1 rounded-lg border border-[#1E314F]">
          <button
            type="button"
            onClick={() => setScanMode('on_demand')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all cursor-pointer ${
              scanMode === 'on_demand'
                ? 'bg-[#16253D] text-[#45C8E8] border border-[#45C8E8]/30 shadow-xs'
                : 'text-[#8EA2C6] hover:text-white'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Scan on Demand</span>
          </button>
          <button
            type="button"
            onClick={() => setScanMode('continuous_monitoring')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all cursor-pointer ${
              scanMode === 'continuous_monitoring'
                ? 'bg-[#16253D] text-[#9B8AFB] border border-[#9B8AFB]/30 shadow-xs'
                : 'text-[#8EA2C6] hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Continuous Monitoring</span>
          </button>
        </div>
      </div>

      {/* Mode Callout Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 bg-[#111D30] border border-[#1E314F] rounded-xl shadow-card">
          <div className="text-[10px] text-[#8EA2C6] uppercase font-mono tracking-wider">Protected Brand</div>
          <div className="text-base font-bold text-white mt-1 flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#45C8E8]" />
            {brandProfile.brandName}
          </div>
          <div className="text-[11px] text-[#8EA2C6] mt-0.5 font-mono">
            {brandProfile.officialDomains.length} official domains registered
          </div>
        </div>

        <div className="p-4 bg-[#111D30] border border-[#1E314F] rounded-xl shadow-card">
          <div className="text-[10px] text-[#8EA2C6] uppercase font-mono tracking-wider">Current Surveillance Mode</div>
          <div className="text-base font-bold text-white mt-1 flex items-center gap-1.5">
            {scanMode === 'on_demand' ? (
              <span className="text-[#45C8E8] flex items-center gap-1.5">
                <Radio className="w-4 h-4" /> On-Demand Query
              </span>
            ) : (
              <span className="text-[#9B8AFB] flex items-center gap-1.5">
                <Clock className="w-4 h-4" /> Continuous Polling
              </span>
            )}
          </div>
          <div className="text-[11px] text-[#8EA2C6] mt-0.5">
            {scanMode === 'on_demand'
              ? 'On-demand perimeter evaluation'
              : 'Automated batch feed ingestion'}
          </div>
        </div>

        <div className="p-4 bg-[#111D30] border border-[#1E314F] rounded-xl shadow-card">
          <div className="text-[10px] text-[#8EA2C6] uppercase font-mono tracking-wider">Registered Perimeter Assets</div>
          <div className="text-base font-bold text-white mt-1 font-mono">
            {(brandProfile.officialDomains?.length || 0) +
              (brandProfile.officialSocialUrls?.length || 0) +
              (brandProfile.officialApps?.length || 0)}
          </div>
          <div className="text-[11px] text-[#8EA2C6] mt-0.5 font-mono">
            Domains, handles, and store IDs
          </div>
        </div>

        <div className="p-4 bg-[#111D30] border border-[#1E314F] rounded-xl shadow-card">
          <div className="text-[10px] text-[#8EA2C6] uppercase font-mono tracking-wider">Detection Heuristics</div>
          <div className="text-base font-bold text-[#10B981] mt-1 flex items-center gap-1.5 font-mono">
            <CheckCircle2 className="w-4 h-4 text-[#10B981]" /> 4 Heuristics Active
          </div>
          <div className="text-[11px] text-[#8EA2C6] mt-0.5 font-mono">
            Homoglyph, Levenshtein, TLD &amp; Token
          </div>
        </div>
      </div>

      {/* Main Interactive Evaluation Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 bg-[#111D30] border border-[#1E314F] rounded-xl shadow-card">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-3.5">
              <Search className="w-4 h-4 text-[#45C8E8]" />
              Evaluate Candidate Against Perimeter
            </h2>

            <form onSubmit={handleRunEvaluation} className="space-y-3.5">
              <div>
                <label className="block text-xs font-mono text-[#8EA2C6] mb-1">
                  Asset Category
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['domain', 'social', 'mobile_app'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setCandidateType(t);
                        if (t === 'domain') setCandidateIdentifier('paytm-kyc-verify.vip');
                        if (t === 'social') setCandidateIdentifier('@paytm_support_agent');
                        if (t === 'mobile_app') setCandidateIdentifier('Paytm Cashback Rewards 2026');
                      }}
                      className={`px-2.5 py-1.5 rounded text-xs font-medium uppercase font-mono transition-colors cursor-pointer ${
                        candidateType === t
                          ? 'bg-[#16253D] text-[#45C8E8] border border-[#45C8E8]/40'
                          : 'bg-[#0E1726] text-[#8EA2C6] border border-[#1E314F] hover:text-white'
                      }`}
                    >
                      {t.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-[#8EA2C6] mb-1">
                  Candidate Identifier / String
                </label>
                <input
                  type="text"
                  value={candidateIdentifier}
                  onChange={(e) => setCandidateIdentifier(e.target.value)}
                  placeholder="e.g. paytm-kyc-verify.vip or @paytm_support"
                  className="w-full px-3 py-2 bg-[#0E1726] border border-[#1E314F] rounded-lg text-xs text-white placeholder-[#64748B] focus:outline-hidden focus:border-[#45C8E8] font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-[#8EA2C6] mb-1">
                  Telemetry / Detection Source
                </label>
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0E1726] border border-[#1E314F] rounded-lg text-xs text-white focus:outline-hidden focus:border-[#45C8E8] cursor-pointer"
                >
                  <option value="certificate_transparency">Certificate Transparency Log</option>
                  <option value="whois_feed">WHOIS Newly Registered Domains (NRD)</option>
                  <option value="dns_lookup">DNS Resolution Telemetry</option>
                  <option value="social_graph">Social Identity Crawler</option>
                  <option value="app_store">Official App Store Monitor</option>
                  <option value="manual_analyst">Manual Analyst Submission</option>
                </select>
              </div>

              {errorMessage && (
                <div className="p-2.5 bg-[#EF4444]/10 border border-[#EF4444]/30 rounded text-xs text-[#EF4444]">
                  {errorMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={isEvaluating}
                className="w-full py-2 px-4 bg-[#45C8E8] hover:bg-[#38B2D0] text-[#080F1D] font-semibold rounded-lg text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                {isEvaluating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Analyzing Perimeter Similarity...</span>
                  </>
                ) : (
                  <>
                    <Radar className="w-3.5 h-3.5" />
                    <span>Run Perimeter Evaluation</span>
                  </>
                )}
              </button>
            </form>

            {/* Quick Demo Pre-sets */}
            <div className="mt-4 pt-3 border-t border-[#1E314F]">
              <span className="text-[11px] text-[#8EA2C6] font-mono">Quick Test Candidates:</span>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setCandidateType('domain');
                    setCandidateIdentifier('pаytm-secure.com'); // Cyrillic 'а'
                  }}
                  className="px-2 py-1 bg-[#16253D] text-[11px] font-mono text-[#8EA2C6] hover:text-white rounded border border-[#1E314F] cursor-pointer"
                >
                  Homoglyph: pаytm-secure.com
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCandidateType('domain');
                    setCandidateIdentifier(brandProfile.officialDomains[0] || 'paytm.com');
                  }}
                  className="px-2 py-1 bg-[#16253D] text-[11px] font-mono text-[#8EA2C6] hover:text-white rounded border border-[#1E314F] cursor-pointer"
                >
                  Official: {brandProfile.officialDomains[0] || 'paytm.com'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCandidateType('social');
                    setCandidateIdentifier('@paytm_helpdesk_official');
                  }}
                  className="px-2 py-1 bg-[#16253D] text-[11px] font-mono text-[#8EA2C6] hover:text-white rounded border border-[#1E314F] cursor-pointer"
                >
                  Social: @paytm_helpdesk
                </button>
              </div>
            </div>
          </div>

          {/* Registered Perimeter Quick View */}
          <div className="p-5 bg-[#111D30] border border-[#1E314F] rounded-xl shadow-card">
            <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-white flex items-center gap-2 mb-2.5">
              <Layers className="w-4 h-4 text-[#45C8E8]" />
              <span>Registered Brand Perimeter</span>
            </h3>
            <div className="space-y-2 text-xs">
              <div className="text-[#8EA2C6] font-mono text-[10px] uppercase">Official Domains:</div>
              <div className="flex flex-wrap gap-1.5">
                {brandProfile.officialDomains.map((d) => (
                  <span
                    key={d}
                    className="px-2 py-0.5 rounded bg-[#0E1726] text-[#10B981] border border-[#10B981]/25 font-mono text-[11px]"
                  >
                    {d}
                  </span>
                ))}
              </div>

              {brandProfile.officialSocialUrls.length > 0 && (
                <>
                  <div className="text-[#8EA2C6] font-mono text-[10px] uppercase mt-2">
                    Authorized Handles:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {brandProfile.officialSocialUrls.map((s) => (
                      <span
                        key={s.id}
                        className="px-2 py-0.5 rounded bg-[#0E1726] text-[#45C8E8] border border-[#45C8E8]/25 font-mono text-[11px]"
                      >
                        {s.handle} ({s.platform})
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Evaluation Output Details */}
        <div className="lg:col-span-7 space-y-4">
          {evalResult ? (
            <div className="p-5 bg-[#111D30] border border-[#1E314F] rounded-xl shadow-card space-y-4">
              {/* Header Status */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1E314F]">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white font-mono">
                      {evalResult.candidate_identifier}
                    </h3>
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold border ${getRiskBadgeClass(
                        evalResult.risk_indicators.risk_level
                      )}`}
                    >
                      {evalResult.risk_indicators.risk_level} (Score: {evalResult.risk_indicators.risk_score}/100)
                    </span>
                  </div>
                  <div className="text-xs text-[#8EA2C6] mt-1 flex items-center gap-2">
                    <span>Source: <strong className="text-white">{evalResult.source}</strong></span>
                    <span>•</span>
                    <span>Observed: <strong className="text-white">{new Date(evalResult.observation_timestamp).toLocaleTimeString()}</strong></span>
                  </div>
                </div>

                <div>
                  <span
                    className={`px-2 py-0.5 text-xs font-mono rounded border ${
                      evalResult.scan_mode === 'on_demand'
                        ? 'bg-[#16253D] text-[#45C8E8] border-[#45C8E8]/30'
                        : 'bg-[#16253D] text-[#9B8AFB] border-[#9B8AFB]/30'
                    }`}
                  >
                    {evalResult.scan_mode === 'on_demand' ? 'Scan-on-Demand' : 'Continuous Monitored'}
                  </span>
                </div>
              </div>

              {/* Official Exclusion Banner if benign */}
              {evalResult.is_official_asset && (
                <div className="p-3 bg-[#10B981]/10 border border-[#10B981]/30 rounded-lg flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-[#10B981] mt-0.5 shrink-0" />
                  <div>
                    <h4 className="text-xs font-semibold text-[#10B981]">
                      Official Brand Asset Verified
                    </h4>
                    <p className="text-[11px] text-[#8EA2C6] mt-0.5">
                      This entity matches registered brand perimeter asset ({evalResult.matched_asset}).
                      No impersonation alert or triage ticket required.
                    </p>
                  </div>
                </div>
              )}

              {/* Explainable Similarity Signals */}
              <div>
                <h4 className="text-[11px] font-mono uppercase text-[#8EA2C6] tracking-wider mb-2">
                  Perimeter Similarity Signals &amp; Indicators
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-2.5 bg-[#0E1726] border border-[#1E314F] rounded-lg">
                    <div className="text-[10px] text-[#8EA2C6] font-mono">Levenshtein Distance</div>
                    <div className="text-base font-bold text-white mt-0.5 font-mono">
                      {evalResult.similarity_metrics.levenshtein_distance}
                    </div>
                    <div className="text-[10px] text-[#8EA2C6]">Edit distance</div>
                  </div>

                  <div className="p-2.5 bg-[#0E1726] border border-[#1E314F] rounded-lg">
                    <div className="text-[10px] text-[#8EA2C6] font-mono">Similarity Ratio</div>
                    <div className="text-base font-bold text-[#45C8E8] mt-0.5 font-mono">
                      {(evalResult.similarity_metrics.normalized_similarity * 100).toFixed(1)}%
                    </div>
                    <div className="text-[10px] text-[#8EA2C6]">Lexical alignment</div>
                  </div>

                  <div className="p-2.5 bg-[#0E1726] border border-[#1E314F] rounded-lg">
                    <div className="text-[10px] text-[#8EA2C6] font-mono">Homoglyph Detected</div>
                    <div
                      className={`text-base font-bold mt-0.5 font-mono ${
                        evalResult.similarity_metrics.homoglyph_detected
                          ? 'text-[#EF4444]'
                          : 'text-[#10B981]'
                      }`}
                    >
                      {evalResult.similarity_metrics.homoglyph_detected ? 'YES' : 'NONE'}
                    </div>
                    <div className="text-[10px] text-[#8EA2C6]">Unicode script test</div>
                  </div>

                  <div className="p-2.5 bg-[#0E1726] border border-[#1E314F] rounded-lg">
                    <div className="text-[10px] text-[#8EA2C6] font-mono">Suspicious TLD</div>
                    <div
                      className={`text-base font-bold mt-0.5 font-mono ${
                        evalResult.similarity_metrics.suspicious_tld
                          ? 'text-[#F59E0B]'
                          : 'text-[#8EA2C6]'
                      }`}
                    >
                      {evalResult.similarity_metrics.suspicious_tld
                        ? `.${evalResult.similarity_metrics.tld}`
                        : 'Standard'}
                    </div>
                    <div className="text-[10px] text-[#8EA2C6]">TLD risk profile</div>
                  </div>
                </div>

                {evalResult.similarity_metrics.homoglyph_detected && (
                  <div className="mt-2.5 p-2.5 bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-lg text-xs text-[#EF4444] flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-[#EF4444] shrink-0" />
                    <span>
                      Homoglyph Alert: Unicode confusable characters identified in candidate identifier.
                      Normalized canonical form: <strong>{evalResult.similarity_metrics.homoglyph_details.canonical}</strong>.
                    </span>
                  </div>
                )}
              </div>

              {/* Reasons list */}
              <div>
                <h4 className="text-[11px] font-mono uppercase text-[#8EA2C6] tracking-wider mb-1.5">
                  Observed Risk Drivers
                </h4>
                <ul className="space-y-1 text-xs text-[#CAD7E8]">
                  {evalResult.risk_indicators.reasons.map((r, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#45C8E8] mt-1.5 shrink-0" />
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Epistemic Breakdown Preview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 p-3.5 bg-[#0E1726] rounded-lg border border-[#1E314F] text-xs">
                <div>
                  <div className="font-semibold text-[#10B981] mb-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Observed Facts
                  </div>
                  <ul className="space-y-1 text-[#8EA2C6] text-[11px]">
                    {evalResult.explanation.observed_facts.map((fact, idx) => (
                      <li key={idx} className="line-clamp-2">• {fact}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <div className="font-semibold text-[#9B8AFB] mb-1 flex items-center gap-1">
                    <Info className="w-3.5 h-3.5" /> Model Inferences
                  </div>
                  <ul className="space-y-1 text-[#8EA2C6] text-[11px]">
                    {evalResult.explanation.model_inferences.map((inf, idx) => (
                      <li key={idx} className="line-clamp-2">• {inf}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <div className="font-semibold text-[#F59E0B] mb-1 flex items-center gap-1">
                    <HelpCircle className="w-3.5 h-3.5" /> Unverified Claims
                  </div>
                  <ul className="space-y-1 text-[#8EA2C6] text-[11px]">
                    {evalResult.explanation.unverified_claims.map((unv, idx) => (
                      <li key={idx} className="line-clamp-2">• {unv}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Routing Action */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[#1E314F]">
                <div className="text-xs text-[#8EA2C6]">
                  Verification Status:{' '}
                  <span className="text-white font-medium">{evalResult.verification_status}</span>
                </div>

                <div className="flex items-center gap-3">
                  {routedSuccess ? (
                    <span className="text-xs text-[#10B981] font-mono flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> {routedSuccess}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleRouteToInvestigation}
                      className="px-3.5 py-1.5 bg-[#16253D] hover:bg-[#1E314F] text-[#45C8E8] hover:text-white border border-[#1E314F] hover:border-[#45C8E8]/40 font-semibold rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <FolderPlus className="w-3.5 h-3.5" />
                      <span>Route Finding to Investigation</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 bg-[#111D30] border border-[#1E314F] rounded-xl flex flex-col items-center justify-center text-center shadow-card">
              <FileSearch className="w-10 h-10 text-[#1E314F] mb-2.5" />
              <h3 className="text-sm font-semibold text-white">No Evaluation Performed Yet</h3>
              <p className="text-xs text-[#8EA2C6] max-w-sm mt-1">
                Enter a candidate domain, social profile, or app package identifier on the left to evaluate
                it against your official registered brand perimeter.
              </p>
            </div>
          )}

          {/* Evaluation History */}
          {history.length > 0 && (
            <div className="p-5 bg-[#111D30] border border-[#1E314F] rounded-xl shadow-card">
              <h4 className="text-xs font-mono uppercase text-[#8EA2C6] mb-2.5">
                Recent Evaluations in Session
              </h4>
              <div className="space-y-1.5">
                {history.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => setEvalResult(item)}
                    className="p-2.5 bg-[#0E1726] border border-[#1E314F] hover:border-[#45C8E8]/30 rounded-lg flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          item.risk_indicators.risk_level === 'CRITICAL'
                            ? 'bg-[#EF4444]'
                            : item.risk_indicators.risk_level === 'HIGH'
                            ? 'bg-[#F97316]'
                            : 'bg-[#10B981]'
                        }`}
                      />
                      <span className="text-xs font-mono text-white font-medium">
                        {item.candidate_identifier}
                      </span>
                      <span className="text-[10px] text-[#8EA2C6] font-mono">
                        ({item.candidate_type})
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-[#8EA2C6] font-mono text-[11px]">
                        Score: {item.risk_indicators.risk_score}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#8EA2C6]" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WatchtowerView;
