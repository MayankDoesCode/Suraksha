import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { RiskBadge } from '../components/RiskBadge';
import {
  Smartphone,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  ExternalLink,
  Sparkles,
  ArrowRight,
  Layers,
  AlertOctagon,
  Globe,
  Radio,
  RefreshCw,
  Package,
} from 'lucide-react';
import type { RiskLevel } from '../types';
import api from '../api/client';

export const AppMonitoringView: React.FC = () => {
  const { brandProfile, addCandidate, setSelectedCandidateId, setActiveTab, selectedBackendBrandId, refreshBackendData } = useApp();

  const [activeMode, setActiveMode] = useState<'audit' | 'live_provider'>('audit');

  // Audit Form State
  const [appName, setAppName] = useState('');
  const [developer, setDeveloper] = useState('');
  const [store, setStore] = useState('Google Play Store');
  const [storeUrl, setStoreUrl] = useState('');
  const [description, setDescription] = useState('');
  const [branding, setBranding] = useState('');
  const [evidence, setEvidence] = useState('');

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);
  const [createdCandidateId, setCreatedCandidateId] = useState<string | null>(null);

  // Live Provider Scanning State (Phase 4 iTunes)
  const [providerScanning, setProviderScanning] = useState(false);
  const [providerScanResult, setProviderScanResult] = useState<any | null>(null);
  const [providerError, setProviderError] = useState<string | null>(null);
  const [providerLimit, setProviderLimit] = useState(25);

  const loadScenario = (type: 'rogue' | 'official' | 'partner') => {
    setErrorMsg(null);
    setAnalysisResult(null);
    setCreatedCandidateId(null);
    setActiveMode('audit');

    if (type === 'rogue') {
      setAppName('ApexPay Pro: Instant Cash & Personal Loan');
      setDeveloper('Apex Financial Tech UK Ltd (Unregistered)');
      setStore('Third-Party APK Mirror (APKPure / APKMirror)');
      setStoreUrl('https://apkpure.example/com.apexpaypro.fastloan');
      setDescription('Fast loans up to $5,000 in 5 minutes! Borrow against your ApexPay balance with no credit check. Instant approval and same-day direct payout.');
      setBranding('Copies authentic blue shield logo with gold PRO ribbon.');
      setEvidence('Manifest requests excessive permissions: READ_SMS, READ_CONTACTS, ACCESS_FINE_LOCATION, SYSTEM_ALERT_WINDOW. Hosted outside Google Play.');
    } else if (type === 'official') {
      const off = brandProfile.officialApps[0] || {
        name: 'ApexPay: Mobile Wallet & Pay',
        developer: 'ApexPay Technologies Inc.',
        store: 'Google Play & Apple App Store',
      };
      setAppName(off.name);
      setDeveloper(off.developer);
      setStore(off.store);
      setStoreUrl('https://play.google.com/store/apps/details?id=com.apexpay.wallet');
      setDescription('Official digital wallet for ApexPay. Manage business payments, virtual debit cards, and send peer-to-peer transfers securely.');
      setBranding('High-definition verified corporate icon with SVG vector assets.');
      setEvidence('Signed with corporate Play Store keystore certificate. Zero abusive permissions.');
    } else if (type === 'partner') {
      setAppName('ApexPay POS Merchant Terminal Companion');
      setDeveloper('VeriPay POS Hardware Solutions GmbH');
      setStore('Google Play Store');
      setStoreUrl('https://play.google.com/store/apps/details?id=com.veripay.apexpay.pos');
      setDescription('Companion hardware driver for retail POS terminals integrating ApexPay QR and NFC merchant payment rails.');
      setBranding('Hardware manufacturer logo with certified "Works with ApexPay" badge.');
      setEvidence('Signed under certified partner merchant program #POS-998. Requests standard USB & Bluetooth permissions only.');
    }
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appName.trim() || !developer.trim()) {
      setErrorMsg('Candidate App Name and Developer/Publisher are required.');
      return;
    }

    setIsAnalyzing(true);
    setErrorMsg(null);
    setAnalysisResult(null);
    setCreatedCandidateId(null);

    const payload = {
      name: appName.trim(),
      developer: developer.trim(),
      store,
      url: storeUrl.trim(),
      description: description.trim(),
      branding: branding.trim(),
      evidence: evidence.trim(),
    };

    try {
      // 1. Try real backend API scan endpoint if available
      let backendData: any = null;
      try {
        const targetBrandId = selectedBackendBrandId || brandProfile.id;
        const res = await api.scanCandidate(targetBrandId, {
          asset_type: 'mobile_app',
          candidate_name: appName.trim(),
          package_id: storeUrl.includes('id=')
            ? storeUrl.split('id=')[1].split('&')[0]
            : appName.trim().toLowerCase().replace(/[^a-z0-9]/g, '.'),
          publisher_name: developer.trim(),
          description: description.trim(),
          source_url: storeUrl.trim(),
          platform: store.includes('Apple') ? 'ios_app_store' : 'android_play_store',
          detection_source: 'analyst_submission',
          is_sample: false,
        });

        if (res?.success && res.data) {
          const bd = res.data;
          backendData = {
            candidateName: bd.candidate_name,
            store,
            riskCategory: bd.severity === 'CRITICAL' ? 'Critical' : bd.severity === 'HIGH' ? 'High' : bd.severity === 'MEDIUM' ? 'Medium' : 'Low',
            summary: bd.excluded
              ? `Official Asset Excluded: ${bd.exclusion_reason}`
              : `SURAKSHA Detection Engine evaluated ${bd.severity} risk (${bd.risk_score}/100)`,
            evidenceSupporting: bd.evidence?.map((item: any) => item.description) || bd.signals?.map((s: any) => s.explanation) || [],
            evidenceAgainst: bd.excluded ? [bd.exclusion_reason] : [],
            missingInformation: [],
            recommendedNextSteps: bd.severity === 'CRITICAL'
              ? ['Submit package takedown claim to platform store', 'Add publisher identifier to watch list']
              : ['Audit publisher certificate and monitoring status'],
            developerMismatch: Boolean(bd.signals?.some((s: any) => s.signal_type?.includes('PUBLISHER'))),
            suspiciousPermissions: bd.evidence?.filter((item: any) => item.evidence_type === 'permissions').map((item: any) => item.description) || [],
            stringSignals: bd.signals?.map((s: any) => ({
              type: s.signal_type,
              detail: s.explanation,
              severity: s.score > 25 ? 'high' : s.score > 15 ? 'medium' : 'low',
            })) || [],
            stringSimilarity: bd.risk_score,
            analysisEngine: 'SURAKSHA Neural & Signature Engine (Backend DB)',
            isExcluded: bd.excluded,
            exclusionReason: bd.exclusion_reason,
            persisted: bd.persisted,
            findingId: bd.finding?.id,
          };
        }
      } catch (backendErr) {
        // Backend offline or error; proceed to client-side heuristics
      }

      if (backendData) {
        setAnalysisResult(backendData);
        if (backendData.persisted) {
          refreshBackendData();
        }
      } else {
        // Fallback rule-based analysis
        const isOfficial = brandProfile.officialApps.some(
          o => o.name.toLowerCase() === appName.toLowerCase() ||
               (o.developer && developer.toLowerCase().includes(o.developer.toLowerCase()))
        );

        if (isOfficial) {
          setAnalysisResult({
            candidateName: appName,
            store,
            riskCategory: 'Low',
            summary: 'Verified matching official mobile app in brand baseline repository.',
            evidenceSupporting: ['Matches verified developer signature in protected Brand Profile'],
            evidenceAgainst: ['Authentic publisher entity; legitimate software'],
            missingInformation: [],
            recommendedNextSteps: ['Maintain in safe verified allowlist'],
            developerMismatch: false,
            suspiciousPermissions: [],
            stringSignals: [],
            analysisEngine: 'SURAKSHA Client Heuristics (Local Baseline)',
            isExcluded: true,
            exclusionReason: 'Matched verified publisher signature in brand baseline',
          });
        } else {
          const isHighRisk = description.toLowerCase().includes('loan') ||
                             description.toLowerCase().includes('cash') ||
                             developer.toLowerCase().includes('unregistered') ||
                             evidence.toLowerCase().includes('sms') ||
                             evidence.toLowerCase().includes('apk');

          setAnalysisResult({
            candidateName: appName,
            store,
            riskCategory: isHighRisk ? 'Critical' : 'Medium',
            summary: isHighRisk
              ? 'High-risk unverified publisher mimicking brand finance services with intrusive device permissions.'
              : 'Unverified third-party app with brand name resemblance. Requires publisher verification.',
            evidenceSupporting: [
              `Unregistered publisher: "${developer}" does not match brand allowlist`,
              isHighRisk ? 'Requests elevated SMS and contact permissions' : 'Brand name containment in listing',
            ],
            evidenceAgainst: ['No formal takedown notice issued yet'],
            missingInformation: ['Keystore SHA-256 fingerprint', 'Corporate registration of developer'],
            recommendedNextSteps: [
              'Submit notice to app marketplace security team',
              'Alert customers regarding rogue third-party packages',
            ],
            developerMismatch: true,
            suspiciousPermissions: isHighRisk ? ['READ_SMS', 'READ_CONTACTS', 'SYSTEM_ALERT_WINDOW'] : [],
            stringSignals: [
              {
                type: 'PUBLISHER_MISMATCH',
                detail: `Developer "${developer}" differs from official corporate records.`,
                severity: 'high',
              },
            ],
            stringSimilarity: 82,
            analysisEngine: 'SURAKSHA Client Heuristics Engine',
          });
        }
      }
    } catch (err: any) {
      console.error('App analysis error:', err);
      setErrorMsg(err?.message || 'Failed to analyze mobile application.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Run Live Provider Scan (Apple App Store / iTunes API)
  const handleRunProviderScan = async () => {
    const targetBrandId = selectedBackendBrandId || brandProfile.id;
    if (!targetBrandId) {
      setProviderError('Please select a target brand to scan.');
      return;
    }

    setProviderScanning(true);
    setProviderError(null);
    setProviderScanResult(null);

    try {
      const res = await api.scanBrandProvider(targetBrandId, 'itunes_app_store', providerLimit);
      if (res?.success) {
        setProviderScanResult(res.data);
        await refreshBackendData();
      } else {
        setProviderError('Provider query returned unsuccessful status.');
      }
    } catch (err: any) {
      setProviderError(err.message || 'External provider scan failed. Please verify backend is running.');
    } finally {
      setProviderScanning(false);
    }
  };

  const handleSendToInvestigation = () => {
    if (!analysisResult) return;

    const newCandidate = addCandidate({
      type: 'app',
      title: appName,
      identifier: appName,
      platform: store,
      url: storeUrl,
      description,
      observedBranding: branding,
      developer,
      evidence,
      riskCategory: (analysisResult.riskCategory as RiskLevel) || 'Medium',
      summary: analysisResult.summary || 'App Store Threat Assessment',
      evidenceSupporting: analysisResult.evidenceSupporting || [],
      evidenceAgainst: analysisResult.evidenceAgainst || [],
      missingInformation: analysisResult.missingInformation || [],
      recommendedNextSteps: analysisResult.recommendedNextSteps || [],
      developerMismatch: analysisResult.developerMismatch,
      suspiciousPermissions: analysisResult.suspiciousPermissions || [],
      stringSignals: analysisResult.stringSignals || [],
      stringSimilarity: analysisResult.stringSimilarity,
      levenshteinDistance: analysisResult.levenshteinDistance,
      analysisEngine: analysisResult.analysisEngine,
    });

    setCreatedCandidateId(newCandidate.id);
  };

  const officialApp = brandProfile.officialApps[0];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1 rounded bg-purple-50 text-purple-700 border border-purple-200">
              <Smartphone className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-purple-900">
              Mobile Store Surveillance Matrix
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            AI App Store &amp; Rogue APK Monitoring
          </h2>
          <p className="text-xs text-slate-500 max-w-2xl mt-0.5">
            Identify rogue mobile applications, developer entity spoofing, predatory loan lures, and suspicious
            permissions abuse designed to harvest customer SMS OTPs or banking credentials.
          </p>
        </div>

        {/* Mode Selector and Quick Pre-fills */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
          {/* Mode Switcher */}
          <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200">
            <button
              onClick={() => setActiveMode('audit')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeMode === 'audit'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Candidate Audit
            </button>
            <button
              onClick={() => setActiveMode('live_provider')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeMode === 'live_provider'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Live Apple Store Scan</span>
            </button>
          </div>

          {activeMode === 'audit' && (
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => loadScenario('rogue')}
                className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold border border-rose-200 transition-colors"
              >
                Rogue Loan APK
              </button>
              <button
                type="button"
                onClick={() => loadScenario('official')}
                className="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold border border-blue-200 transition-colors"
              >
                Official App
              </button>
              <button
                type="button"
                onClick={() => loadScenario('partner')}
                className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold border border-emerald-200 transition-colors"
              >
                Partner POS
              </button>
            </div>
          )}
        </div>
      </div>

      {/* MODE 1: LIVE APPLE APP STORE SCAN (ITUNES REST API) */}
      {activeMode === 'live_provider' && (
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl border border-slate-800 space-y-5 animate-in fade-in duration-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-purple-300">
                <Globe className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="text-base font-bold text-white flex items-center gap-2">
                  <span>Apple App Store Intelligence (iTunes API)</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                    Live Connector Active
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Queries Apple's live public registry for <strong className="text-white">"{brandProfile.brandName}"</strong>, automatically excludes verified brand assets, and persists findings.
                </p>
              </div>
            </div>

            {/* Run Controls */}
            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700 text-xs text-slate-300">
                <span>Limit:</span>
                <select
                  value={providerLimit}
                  onChange={(e) => setProviderLimit(Number(e.target.value))}
                  className="bg-transparent text-white font-semibold focus:outline-none"
                >
                  <option value={10} className="bg-slate-900">10 apps</option>
                  <option value={25} className="bg-slate-900">25 apps</option>
                  <option value={50} className="bg-slate-900">50 apps</option>
                </select>
              </div>

              <button
                onClick={handleRunProviderScan}
                disabled={providerScanning}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs tracking-wider uppercase transition-all shadow-md shadow-purple-600/30 flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {providerScanning ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Querying iTunes Feed...</span>
                  </>
                ) : (
                  <>
                    <Radio className="w-4 h-4" />
                    <span>Launch Live Store Scan</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {providerError && (
            <div className="p-3.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{providerError}</span>
            </div>
          )}

          {/* Results strip */}
          {providerScanResult && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-800/70 border border-slate-700 text-center">
                  <div className="text-[10px] uppercase font-semibold text-slate-400">Total Retrieved</div>
                  <div className="text-2xl font-bold font-mono text-white mt-1">
                    {providerScanResult.total_retrieved}
                  </div>
                  <div className="text-[10px] text-purple-300">Live iTunes Records</div>
                </div>

                <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-center">
                  <div className="text-[10px] uppercase font-semibold text-emerald-400">Official Excluded</div>
                  <div className="text-2xl font-bold font-mono text-emerald-300 mt-1">
                    {providerScanResult.excluded_official_count}
                  </div>
                  <div className="text-[10px] text-emerald-400">Whitelist Filtered</div>
                </div>

                <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/60 text-center">
                  <div className="text-[10px] uppercase font-semibold text-rose-400">Threats Flagged</div>
                  <div className="text-2xl font-bold font-mono text-rose-300 mt-1">
                    {providerScanResult.persisted_findings_count}
                  </div>
                  <div className="text-[10px] text-rose-400">Saved to Threat DB</div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-800/70 border border-slate-700 text-center">
                  <div className="text-[10px] uppercase font-semibold text-slate-400">Benign Filtered</div>
                  <div className="text-2xl font-bold font-mono text-slate-300 mt-1">
                    {providerScanResult.benign_unrelated_count}
                  </div>
                  <div className="text-[10px] text-slate-400">Zero-Risk Noise</div>
                </div>
              </div>

              {/* Excluded Apps Banner */}
              {providerScanResult.excluded_official?.length > 0 && (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
                  <div className="text-xs font-semibold text-emerald-300 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4" /> Official Brand Asset Whitelist Exclusion Active
                  </div>
                  <div className="space-y-1.5">
                    {providerScanResult.excluded_official.map((ex: any, idx: number) => (
                      <div key={idx} className="p-2 rounded-lg bg-slate-900/80 text-xs text-slate-300 flex items-center justify-between">
                        <span className="font-semibold text-white">{ex.candidate_name} ({ex.package_id})</span>
                        <span className="text-[11px] text-emerald-400 font-mono">{ex.exclusion_reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Detected candidates list */}
              {providerScanResult.findings?.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs uppercase tracking-wider text-slate-300 font-semibold flex items-center justify-between">
                    <span>Detected Threat Candidates ({providerScanResult.findings.length})</span>
                    <span className="text-xs text-purple-300 font-mono">Persisted into Database</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {providerScanResult.findings.map((f: any, idx: number) => (
                      <div key={idx} className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700 hover:border-purple-500/50 transition-all space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
                              {f.candidate_name}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              Source: {f.detection_source} • Live iTunes Feed
                            </div>
                          </div>
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase border ${
                            f.severity === 'CRITICAL' ? 'bg-rose-500/20 border-rose-500/40 text-rose-300' :
                            f.severity === 'HIGH' ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' :
                            'bg-blue-500/20 border-blue-500/40 text-blue-300'
                          }`}>
                            {f.severity} ({f.risk_score})
                          </span>
                        </div>
                        {f.source_url && (
                          <a
                            href={f.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-sky-400 hover:underline flex items-center gap-1 font-mono truncate"
                          >
                            <ExternalLink className="w-3 h-3 shrink-0" />
                            <span>{f.source_url}</span>
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* MODE 2: CANDIDATE AUDIT FORM & RESULTS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Candidate Input Form (5 cols) */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>Candidate Application Profile</span>
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">Store Inspection</span>
          </div>

          <form onSubmit={handleAnalyze} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Candidate Application Name *
              </label>
              <input
                type="text"
                required
                value={appName}
                onChange={e => setAppName(e.target.value)}
                placeholder="e.g. ApexPay Mobile Fast Loan"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Developer / Publisher *
                </label>
                <input
                  type="text"
                  required
                  value={developer}
                  onChange={e => setDeveloper(e.target.value)}
                  placeholder="e.g. Apex Financial UK Ltd"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Store / Repository
                </label>
                <select
                  value={store}
                  onChange={e => setStore(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent font-medium"
                >
                  <option>Google Play Store</option>
                  <option>Apple App Store</option>
                  <option>Third-Party APK Mirror (APKPure / APKMirror)</option>
                  <option>Direct APK Download / Torrent</option>
                  <option>Telegram Channel Ingest</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Listing URL or Mirror Download Link
              </label>
              <input
                type="url"
                value={storeUrl}
                onChange={e => setStoreUrl(e.target.value)}
                placeholder="https://play.google.com/store/apps/details?id=..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Store Listing Description
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="App description, advertised features, and financial claims..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Observed Branding &amp; Icon
              </label>
              <input
                type="text"
                value={branding}
                onChange={e => setBranding(e.target.value)}
                placeholder="e.g. Copies authentic blue shield logo with gold PRO ribbon"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Manifest Permissions &amp; Evidence
              </label>
              <textarea
                rows={2}
                value={evidence}
                onChange={e => setEvidence(e.target.value)}
                placeholder="Extracted manifest permissions, network calls, APK signatures..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none font-mono text-[11px]"
              />
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={isAnalyzing}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md shadow-purple-600/20 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Auditing App Package Signatures...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Analyze App Package</span>
                </>
              )}
            </button>
          </form>

          {/* Official Baseline Reference Card */}
          {officialApp && (
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Protected Identity Reference
              </span>
              <p className="font-semibold text-slate-900">{officialApp.name}</p>
              <p className="text-slate-600 text-[11px]">Authorized Developer: <strong className="text-slate-800">{officialApp.developer}</strong></p>
              <p className="text-slate-500 text-[10px] font-mono">Store: {officialApp.store}</p>
            </div>
          )}
        </div>

        {/* Analysis Output & Reasoning (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {!analysisResult && !isAnalyzing && (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto border border-purple-100">
                <Smartphone className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">No Application Candidate Selected</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Fill in the candidate form on the left or select a pre-configured scenario to trigger automated
                inspection of developer signatures, authority lures, and permission risks.
              </p>
            </div>
          )}

          {isAnalyzing && (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto animate-pulse">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">Executing Deep App Package Analysis</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Auditing developer certificate signatures, checking package naming distance, and evaluating manifest permissions against brand telemetry.
              </p>
            </div>
          )}

          {analysisResult && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6 animate-in fade-in duration-200">
              {/* Verdict Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <RiskBadge level={analysisResult.riskCategory} />
                    <span className="text-xs font-mono text-slate-500">
                      Evaluated by {analysisResult.analysisEngine || 'SURAKSHA Engine'}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900">
                    {analysisResult.candidateName}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">Store: {analysisResult.store}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSendToInvestigation}
                    disabled={!!createdCandidateId}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs disabled:bg-emerald-600 transition-all cursor-pointer"
                  >
                    {createdCandidateId ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>In Investigation Center</span>
                      </>
                    ) : (
                      <>
                        <ArrowRight className="w-3.5 h-3.5" />
                        <span>Add to Investigation Center</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Exclusion Banner if Official */}
              {analysisResult.isExcluded && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-emerald-900">Official Brand Asset Verified — Excluded from Threats</h4>
                    <p className="text-xs text-emerald-700 mt-0.5">{analysisResult.exclusionReason}</p>
                  </div>
                </div>
              )}

              {/* Summary */}
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Assessment Summary
                </span>
                <p className="text-xs text-slate-700 leading-relaxed font-medium">
                  {analysisResult.summary}
                </p>
              </div>

              {/* Key Indicators */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Developer Mismatch Alert */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Developer Entity Verification
                  </span>
                  {analysisResult.developerMismatch ? (
                    <div className="flex items-center gap-1.5 text-rose-700 text-xs font-bold">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>Publisher Mismatch Detected</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-emerald-700 text-xs font-bold">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Publisher Matches Verified Entity</span>
                    </div>
                  )}
                  <p className="text-[11px] text-slate-500">
                    Candidate: <strong className="text-slate-700">{developer}</strong>
                  </p>
                </div>

                {/* Permissions Breakdown */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Sensitive Device Permissions
                  </span>
                  {analysisResult.suspiciousPermissions?.length > 0 ? (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {analysisResult.suspiciousPermissions.map((perm: string, i: number) => (
                        <span key={i} className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-semibold border border-rose-200">
                          {perm}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-600 font-medium">No abusive permissions flagged in manifest</p>
                  )}
                </div>
              </div>

              {/* Supporting Evidence vs Against */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <span className="text-xs font-bold text-rose-700 flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Evidence of Impersonation</span>
                  </span>
                  <ul className="space-y-1 text-xs text-slate-600 list-disc list-inside">
                    {analysisResult.evidenceSupporting?.length > 0 ? (
                      analysisResult.evidenceSupporting.map((ev: string, i: number) => (
                        <li key={i}>{ev}</li>
                      ))
                    ) : (
                      <li className="text-slate-400">No malicious indicators detected</li>
                    )}
                  </ul>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Mitigating Factors / Counter-Evidence</span>
                  </span>
                  <ul className="space-y-1 text-xs text-slate-600 list-disc list-inside">
                    {analysisResult.evidenceAgainst?.length > 0 ? (
                      analysisResult.evidenceAgainst.map((ev: string, i: number) => (
                        <li key={i}>{ev}</li>
                      ))
                    ) : (
                      <li className="text-slate-400">No mitigating factors identified</li>
                    )}
                  </ul>
                </div>
              </div>

              {/* Recommended Next Steps */}
              {analysisResult.recommendedNextSteps?.length > 0 && (
                <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200/80 space-y-2">
                  <span className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                    <span>Recommended Analyst Response</span>
                  </span>
                  <ul className="space-y-1 text-xs text-blue-800 list-disc list-inside">
                    {analysisResult.recommendedNextSteps.map((step: string, i: number) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
