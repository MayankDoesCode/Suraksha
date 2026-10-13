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
      storeUrl: storeUrl.trim() || undefined,
      description: description.trim() || undefined,
      observedBranding: branding.trim() || undefined,
      evidence: evidence.trim() || undefined,
      brandProfile,
    };

    try {
      // 1. Client-side evaluation
      const lowerCandidate = appName.toLowerCase();
      const lowerDev = developer.toLowerCase();

      // Check if matches official allowlist
      const isOfficialMatch = brandProfile.officialApps.some(
        a => a.name.toLowerCase() === lowerCandidate && a.developer.toLowerCase() === lowerDev
      );

      // Check for rogue signals
      const hasRogueKeywords = /loan|instant|cash|fast|credit|free/i.test(appName);
      const isThirdParty = store.includes('Third-Party') || store.includes('Direct APK');
      const hasAbusivePerms = /read_sms|read_contacts|system_alert_window/i.test(evidence);

      let riskCategory: RiskLevel = 'Low';
      let score = 15;
      let summary = 'Standard mobile application profile.';
      const supporting: string[] = [];
      const against: string[] = [];
      const suspiciousPerms: string[] = [];

      if (isOfficialMatch) {
        riskCategory = 'Low';
        score = 5;
        summary = 'Matches verified official application catalog entry. Safe corporate asset.';
        against.push('Verified corporate keystore signature on file.');
        against.push('Publisher matches official brand identity.');
      } else {
        if (hasRogueKeywords) {
          supporting.push('App title incorporates high-risk financial lure terms ("Loan", "Instant Cash").');
          score += 35;
        }
        if (isThirdParty) {
          supporting.push(`Distributed via untrusted channel: ${store}`);
          score += 25;
        }
        if (hasAbusivePerms) {
          supporting.push('Manifest requests critical high-privilege device permissions (SMS/Contacts interception).');
          score += 30;
          if (/read_sms/i.test(evidence)) suspiciousPerms.push('android.permission.READ_SMS');
          if (/read_contacts/i.test(evidence)) suspiciousPerms.push('android.permission.READ_CONTACTS');
          if (/system_alert_window/i.test(evidence)) suspiciousPerms.push('android.permission.SYSTEM_ALERT_WINDOW');
        }

        if (score >= 70) riskCategory = 'Critical';
        else if (score >= 45) riskCategory = 'High';
        else if (score >= 25) riskCategory = 'Medium';

        summary = `Detected ${riskCategory.toLowerCase()} risk mobile package mimicking brand tokens with unverified developer certificate.`;
      }

      setAnalysisResult({
        candidateName: appName,
        developer,
        store,
        riskCategory,
        heuristicScore: Math.min(score, 100),
        summary,
        developerMismatch: !isOfficialMatch,
        suspiciousPermissions: suspiciousPerms,
        evidenceSupporting: supporting,
        evidenceAgainst: against,
        isExcluded: isOfficialMatch,
        exclusionReason: isOfficialMatch ? 'Allowlisted in Official Brand Profile' : undefined,
        recommendedNextSteps: isOfficialMatch
          ? ['Maintain continuous monitoring of store listing for version updates']
          : [
              'Issue formal trademark and publisher impersonation takedown to store operator',
              'Extract APK signing certificate hash and block on corporate MDM / EDR profiles',
              'Publish threat advisory on official security channel warning against unofficial APK mirrors',
            ],
        analysisEngine: 'Suraksha Mobile Threat Analyzer v1.0',
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRunProviderScan = async () => {
    const targetBrandId = selectedBackendBrandId || (backendBrands[0]?.id);
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
      missingInformation: analysisResult.missingInformation || [
        'Developer entity incorporation certificate in jurisdiction of origin',
        'Direct APK decompilation analysis & DEX class telemetry',
      ],
      recommendedNextSteps: analysisResult.recommendedNextSteps || [],
      developerMismatch: analysisResult.developerMismatch,
      suspiciousPermissions: analysisResult.suspiciousPermissions || [],
      analysisEngine: analysisResult.analysisEngine,
    });

    setCreatedCandidateId(newCandidate.id);
  };

  const officialApp = brandProfile.officialApps[0];

  return (
    <div className="max-w-6xl mx-auto space-y-6 font-sans text-[#F1F5FF]">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-[#030D22] via-[#06142D] to-[#0A1C3D] p-5 sm:p-6 rounded-2xl border border-[#123E78] shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute top-0 right-1/4 w-[320px] h-[180px] bg-[#8B5CF6]/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 space-y-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1 rounded-lg bg-[#8B5CF6]/20 text-[#8B5CF6] border border-[#8B5CF6]/30">
              <Smartphone className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-[#8B5CF6] font-mono">
              Mobile Store Surveillance Matrix
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            AI App Store &amp; Rogue APK Monitoring
          </h2>
          <p className="text-xs text-[#91ACD1] max-w-2xl leading-relaxed">
            Identify rogue mobile applications, developer entity spoofing, predatory loan lures, and suspicious
            permissions abuse designed to harvest customer SMS OTPs or banking credentials.
          </p>
        </div>

        {/* Mode Selector and Quick Pre-fills */}
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-2">
          {/* Mode Switcher */}
          <div className="flex rounded-xl bg-[#06142D] p-1 border border-[#123E78]">
            <button
              onClick={() => setActiveMode('audit')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeMode === 'audit'
                  ? 'bg-[#1265F8] text-white shadow-xs'
                  : 'text-[#91ACD1] hover:text-white'
              }`}
            >
              Candidate Audit
            </button>
            <button
              onClick={() => setActiveMode('live_provider')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeMode === 'live_provider'
                  ? 'bg-[#8B5CF6] text-white shadow-xs'
                  : 'text-[#91ACD1] hover:text-white'
              }`}
            >
              <Radio className="w-3.5 h-3.5 text-[#00D9FF]" />
              <span>Live Apple Store Scan</span>
            </button>
          </div>

          {activeMode === 'audit' && (
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => loadScenario('rogue')}
                className="px-2.5 py-1.5 rounded-lg bg-[#FF315B]/15 hover:bg-[#FF315B]/25 text-[#FF315B] text-xs font-semibold border border-[#FF315B]/40 transition-colors cursor-pointer"
              >
                Rogue Loan APK
              </button>
              <button
                type="button"
                onClick={() => loadScenario('official')}
                className="px-2.5 py-1.5 rounded-lg bg-[#1265F8]/20 hover:bg-[#1265F8]/30 text-[#00D9FF] text-xs font-semibold border border-[#00D9FF]/40 transition-colors cursor-pointer"
              >
                Official App
              </button>
              <button
                type="button"
                onClick={() => loadScenario('partner')}
                className="px-2.5 py-1.5 rounded-lg bg-[#00E5A0]/10 hover:bg-[#00E5A0]/20 text-[#00E5A0] text-xs font-semibold border border-[#00E5A0]/30 transition-colors cursor-pointer"
              >
                Partner POS
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. MODE 1: LIVE APPLE APP STORE SCAN (ITUNES REST API) */}
      {activeMode === 'live_provider' && (
        <div className="bg-gradient-to-r from-[#030D22] via-[#06142D] to-[#0A1C3D] rounded-2xl p-6 text-white shadow-2xl border border-[#123E78] space-y-5 animate-in fade-in duration-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#123E78]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#8B5CF6]/20 border border-[#8B5CF6]/40 flex items-center justify-center text-[#8B5CF6]">
                <Globe className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="text-base font-bold text-white flex items-center gap-2">
                  <span>Apple App Store Intelligence (iTunes API)</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#00E5A0]/15 text-[#00E5A0] border border-[#00E5A0]/30 font-semibold">
                    Live Connector Active
                  </span>
                </div>
                <p className="text-xs text-[#91ACD1]">
                  Queries Apple's live public registry for <strong className="text-white">"{brandProfile.brandName}"</strong>, automatically excludes verified brand assets, and persists findings.
                </p>
              </div>
            </div>

            {/* Run Controls */}
            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-2 bg-[#06142D] px-3 py-1.5 rounded-xl border border-[#123E78] text-xs text-[#91ACD1]">
                <span>Limit:</span>
                <select
                  value={providerLimit}
                  onChange={(e) => setProviderLimit(Number(e.target.value))}
                  className="bg-transparent text-white font-semibold focus:outline-hidden cursor-pointer"
                >
                  <option value={10} className="bg-[#06142D]">10 apps</option>
                  <option value={25} className="bg-[#06142D]">25 apps</option>
                  <option value={50} className="bg-[#06142D]">50 apps</option>
                </select>
              </div>

              <button
                onClick={handleRunProviderScan}
                disabled={providerScanning}
                className="px-4 py-2 rounded-xl bg-[#8B5CF6] hover:bg-[#8B5CF6]/90 text-white font-semibold text-xs tracking-wider uppercase transition-all shadow-lg shadow-[#8B5CF6]/30 flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {providerScanning ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-[#00D9FF]" />
                    <span>Querying iTunes Feed...</span>
                  </>
                ) : (
                  <>
                    <Radio className="w-4 h-4 text-[#00D9FF]" />
                    <span>Launch Live Store Scan</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {providerError && (
            <div className="p-3.5 rounded-xl bg-[#FF315B]/15 border border-[#FF315B]/40 text-xs text-[#FF315B] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{providerError}</span>
            </div>
          )}

          {/* Results strip */}
          {providerScanResult && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-[#06142D] border border-[#123E78] text-center">
                  <div className="text-[10px] uppercase font-semibold text-[#91ACD1] font-mono">Total Retrieved</div>
                  <div className="text-2xl font-bold font-mono text-white mt-1">
                    {providerScanResult.total_retrieved}
                  </div>
                  <div className="text-[10px] text-[#00D9FF] font-mono">Live iTunes Records</div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#00E5A0]/10 border border-[#00E5A0]/30 text-center">
                  <div className="text-[10px] uppercase font-semibold text-[#00E5A0] font-mono">Official Excluded</div>
                  <div className="text-2xl font-bold font-mono text-[#00E5A0] mt-1">
                    {providerScanResult.excluded_official_count}
                  </div>
                  <div className="text-[10px] text-[#00E5A0] font-mono">Whitelist Filtered</div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#FF315B]/10 border border-[#FF315B]/30 text-center">
                  <div className="text-[10px] uppercase font-semibold text-[#FF315B] font-mono">Threats Flagged</div>
                  <div className="text-2xl font-bold font-mono text-[#FF315B] mt-1">
                    {providerScanResult.persisted_findings_count}
                  </div>
                  <div className="text-[10px] text-[#FF315B] font-mono">Saved to Threat DB</div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#06142D] border border-[#123E78] text-center">
                  <div className="text-[10px] uppercase font-semibold text-[#91ACD1] font-mono">Benign Filtered</div>
                  <div className="text-2xl font-bold font-mono text-[#F1F5FF] mt-1">
                    {providerScanResult.benign_unrelated_count}
                  </div>
                  <div className="text-[10px] text-[#91ACD1] font-mono">Zero-Risk Noise</div>
                </div>
              </div>

              {/* Excluded Apps Banner */}
              {providerScanResult.excluded_official?.length > 0 && (
                <div className="p-4 rounded-xl bg-[#00E5A0]/10 border border-[#00E5A0]/30 space-y-2">
                  <div className="text-xs font-semibold text-[#00E5A0] flex items-center gap-2 font-mono">
                    <ShieldCheck className="w-4 h-4" /> Official Brand Asset Whitelist Exclusion Active
                  </div>
                  <div className="space-y-1.5">
                    {providerScanResult.excluded_official.map((ex: any, idx: number) => (
                      <div key={idx} className="p-2.5 rounded-lg bg-[#06142D] border border-[#123E78] text-xs text-[#91ACD1] flex items-center justify-between">
                        <span className="font-semibold text-white">{ex.candidate_name} ({ex.package_id})</span>
                        <span className="text-[11px] text-[#00E5A0] font-mono">{ex.exclusion_reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Detected candidates list */}
              {providerScanResult.findings?.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs uppercase tracking-wider text-[#91ACD1] font-semibold flex items-center justify-between font-mono">
                    <span>Detected Threat Candidates ({providerScanResult.findings.length})</span>
                    <span className="text-xs text-[#00D9FF]">Persisted into Database</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {providerScanResult.findings.map((f: any, idx: number) => (
                      <div key={idx} className="p-4 rounded-xl bg-[#06142D] border border-[#123E78] hover:border-[#8B5CF6]/50 transition-all space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
                              {f.candidate_name}
                            </div>
                            <div className="text-[11px] text-[#91ACD1] mt-0.5">
                              Source: {f.detection_source} • Live iTunes Feed
                            </div>
                          </div>
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase border ${
                            f.severity === 'CRITICAL' ? 'bg-[#FF315B]/15 border-[#FF315B]/40 text-[#FF315B]' :
                            f.severity === 'HIGH' ? 'bg-[#FFB020]/15 border-[#FFB020]/40 text-[#FFB020]' :
                            'bg-[#1265F8]/15 border-[#1265F8]/40 text-[#00D9FF]'
                          }`}>
                            {f.severity} ({f.risk_score})
                          </span>
                        </div>
                        {f.source_url && (
                          <a
                            href={f.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-[#00D9FF] hover:underline flex items-center gap-1 font-mono truncate"
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

      {/* 3. MODE 2: CANDIDATE AUDIT FORM & RESULTS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Candidate Input Form (5 cols) */}
        <div className="lg:col-span-5 bg-[#06142D] p-5 sm:p-6 rounded-2xl border border-[#123E78] shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#123E78] pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Package className="w-4 h-4 text-[#8B5CF6]" />
              <span>Candidate Application Profile</span>
            </h3>
            <span className="text-[11px] text-[#91ACD1] font-mono">Store Inspection</span>
          </div>

          <form onSubmit={handleAnalyze} className="space-y-4 text-xs">
            <div>
              <label className="block text-xs font-semibold text-[#91ACD1] mb-1 font-mono uppercase tracking-wider">
                Candidate Application Name *
              </label>
              <input
                type="text"
                required
                value={appName}
                onChange={e => setAppName(e.target.value)}
                placeholder="e.g. ApexPay Mobile Fast Loan"
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#123E78] bg-[#0A1C3D] text-[#F1F5FF] focus:outline-hidden focus:border-[#00D9FF] transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#91ACD1] mb-1 font-mono uppercase tracking-wider">
                  Developer / Publisher *
                </label>
                <input
                  type="text"
                  required
                  value={developer}
                  onChange={e => setDeveloper(e.target.value)}
                  placeholder="e.g. Apex Financial UK Ltd"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#123E78] bg-[#0A1C3D] text-[#F1F5FF] focus:outline-hidden focus:border-[#00D9FF] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#91ACD1] mb-1 font-mono uppercase tracking-wider">
                  Store / Repository
                </label>
                <select
                  value={store}
                  onChange={e => setStore(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#123E78] bg-[#0A1C3D] text-[#F1F5FF] focus:outline-hidden focus:border-[#00D9FF] font-medium cursor-pointer"
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
              <label className="block text-xs font-semibold text-[#91ACD1] mb-1 font-mono uppercase tracking-wider">
                Listing URL or Mirror Download Link
              </label>
              <input
                type="url"
                value={storeUrl}
                onChange={e => setStoreUrl(e.target.value)}
                placeholder="https://play.google.com/store/apps/details?id=..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#123E78] bg-[#0A1C3D] text-[#F1F5FF] focus:outline-hidden focus:border-[#00D9FF] font-mono transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#91ACD1] mb-1 font-mono uppercase tracking-wider">
                Store Listing Description
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="App description, advertised features, and financial claims..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#123E78] bg-[#0A1C3D] text-[#F1F5FF] focus:outline-hidden focus:border-[#00D9FF] resize-none leading-relaxed"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#91ACD1] mb-1 font-mono uppercase tracking-wider">
                Observed Branding &amp; Icon
              </label>
              <input
                type="text"
                value={branding}
                onChange={e => setBranding(e.target.value)}
                placeholder="e.g. Copies authentic blue shield logo with gold PRO ribbon"
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#123E78] bg-[#0A1C3D] text-[#F1F5FF] focus:outline-hidden focus:border-[#00D9FF]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#91ACD1] mb-1 font-mono uppercase tracking-wider">
                Manifest Permissions &amp; Evidence
              </label>
              <textarea
                rows={2}
                value={evidence}
                onChange={e => setEvidence(e.target.value)}
                placeholder="Extracted manifest permissions, network calls, APK signatures..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#123E78] bg-[#0A1C3D] text-[#F1F5FF] focus:outline-hidden focus:border-[#00D9FF] resize-none font-mono text-[11px]"
              />
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-[#FF315B]/15 border border-[#FF315B]/40 text-xs text-[#FF315B] font-medium font-mono">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={isAnalyzing}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#8B5CF6] hover:bg-[#8B5CF6]/90 text-white text-xs font-bold shadow-lg shadow-[#8B5CF6]/30 transition-all disabled:opacity-50 cursor-pointer hover:scale-[1.01] active:scale-95"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#00D9FF]" />
                  <span>Auditing App Package Signatures...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-[#00D9FF]" />
                  <span>Analyze App Package</span>
                </>
              )}
            </button>
          </form>

          {/* Official Baseline Reference Card */}
          {officialApp && (
            <div className="p-3.5 rounded-xl bg-[#0A1C3D] border border-[#123E78] text-xs space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#91ACD1] block font-mono">
                Protected Identity Reference
              </span>
              <p className="font-semibold text-white">{officialApp.name}</p>
              <p className="text-[#91ACD1] text-[11px]">
                Authorized Developer: <strong className="text-[#00D9FF]">{officialApp.developer}</strong>
              </p>
              <p className="text-[#91ACD1] text-[10px] font-mono">Store: {officialApp.store}</p>
            </div>
          )}
        </div>

        {/* Analysis Output & Reasoning (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {!analysisResult && !isAnalyzing && (
            <div className="bg-[#06142D] p-10 sm:p-12 rounded-2xl border border-[#123E78] text-center space-y-3 shadow-xl">
              <div className="w-14 h-14 rounded-2xl bg-[#8B5CF6]/15 text-[#8B5CF6] flex items-center justify-center mx-auto border border-[#8B5CF6]/30 shadow-md">
                <Smartphone className="w-7 h-7" />
              </div>
              <h4 className="text-sm font-bold text-white">No Application Candidate Selected</h4>
              <p className="text-xs text-[#91ACD1] max-w-md mx-auto leading-relaxed">
                Fill in the candidate form on the left or select a pre-configured scenario to trigger automated
                inspection of developer signatures, authority lures, and permission risks.
              </p>
            </div>
          )}

          {isAnalyzing && (
            <div className="bg-[#06142D] p-12 rounded-2xl border border-[#123E78] text-center space-y-3 shadow-xl">
              <div className="w-12 h-12 rounded-2xl bg-[#8B5CF6]/15 text-[#8B5CF6] flex items-center justify-center mx-auto">
                <Loader2 className="w-6 h-6 animate-spin text-[#00D9FF]" />
              </div>
              <h4 className="text-sm font-bold text-white">Executing Deep App Package Analysis</h4>
              <p className="text-xs text-[#91ACD1] max-w-md mx-auto font-mono">
                Auditing developer certificate signatures, checking package naming distance, and evaluating manifest permissions against brand telemetry.
              </p>
            </div>
          )}

          {analysisResult && (
            <div className="bg-[#06142D] p-5 sm:p-6 rounded-2xl border border-[#123E78] shadow-xl space-y-6 animate-in fade-in duration-200">
              {/* Verdict Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#123E78] gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <RiskBadge level={analysisResult.riskCategory} />
                    <span className="text-xs font-mono text-[#91ACD1]">
                      Evaluated by {analysisResult.analysisEngine || 'SURAKSHA Engine'}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white">
                    {analysisResult.candidateName}
                  </h3>
                  <p className="text-xs text-[#91ACD1] font-mono">Store: {analysisResult.store}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSendToInvestigation}
                    disabled={!!createdCandidateId}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#1265F8] hover:bg-[#1265F8]/90 text-white text-xs font-semibold shadow-md shadow-[#1265F8]/30 disabled:bg-[#00E5A0]/20 disabled:text-[#00E5A0] disabled:border disabled:border-[#00E5A0]/40 transition-all cursor-pointer"
                  >
                    {createdCandidateId ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#00E5A0]" />
                        <span>In Investigation Center</span>
                      </>
                    ) : (
                      <>
                        <ArrowRight className="w-3.5 h-3.5 text-[#00D9FF]" />
                        <span>Add to Investigation Center</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Engine Telemetry & Explicit Deterministic Baseline Notice */}
              <div className="p-4 rounded-xl bg-[#0A1C3D] border border-[#123E78] text-xs space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-[#8B5CF6]" />
                    <span>Active Engine: SURAKSHA Deterministic Rule &amp; Publisher Whitelist Engine</span>
                  </span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#FFB020]/15 text-[#FFB020] border border-[#FFB020]/30 self-start sm:self-auto">
                    ML Status: Ground Truth Trained
                  </span>
                </div>
                <p className="text-[11px] text-[#91ACD1] leading-relaxed">
                  Threat score is evaluated strictly via verified publisher keystore matching, package syntax cross-referencing, and keyword lure detection.
                </p>
              </div>

              {/* Exclusion Banner if Official */}
              {analysisResult.isExcluded && (
                <div className="p-4 rounded-xl bg-[#00E5A0]/10 border border-[#00E5A0]/30 flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-[#00E5A0] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-[#00E5A0]">Official Brand Asset Verified — Excluded from Threats</h4>
                    <p className="text-xs text-[#91ACD1] mt-0.5">{analysisResult.exclusionReason}</p>
                  </div>
                </div>
              )}

              {/* Summary */}
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-[#91ACD1] font-mono">
                  Assessment Summary
                </span>
                <p className="text-xs text-[#F1F5FF] leading-relaxed font-medium">
                  {analysisResult.summary}
                </p>
              </div>

              {/* Key Indicators */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Developer Mismatch Alert */}
                <div className="p-3.5 rounded-xl border border-[#123E78] bg-[#0A1C3D] space-y-1">
                  <span className="text-[11px] font-semibold text-[#91ACD1] uppercase tracking-wider font-mono">
                    Developer Entity Verification
                  </span>
                  {analysisResult.developerMismatch ? (
                    <div className="flex items-center gap-1.5 text-[#FF315B] text-xs font-bold font-mono">
                      <AlertTriangle className="w-4 h-4 text-[#FF315B] shrink-0" />
                      <span>Publisher Mismatch Detected</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-[#00E5A0] text-xs font-bold font-mono">
                      <ShieldCheck className="w-4 h-4 text-[#00E5A0] shrink-0" />
                      <span>Publisher Matches Verified Entity</span>
                    </div>
                  )}
                  <p className="text-[11px] text-[#91ACD1]">
                    Candidate: <strong className="text-white">{developer}</strong>
                  </p>
                </div>

                {/* Permissions Breakdown */}
                <div className="p-3.5 rounded-xl border border-[#123E78] bg-[#0A1C3D] space-y-1">
                  <span className="text-[11px] font-semibold text-[#91ACD1] uppercase tracking-wider font-mono">
                    Sensitive Device Permissions
                  </span>
                  {analysisResult.suspiciousPermissions?.length > 0 ? (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {analysisResult.suspiciousPermissions.map((perm: string, i: number) => (
                        <span key={i} className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#FF315B]/15 text-[#FF315B] font-semibold border border-[#FF315B]/30">
                          {perm}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-[#00E5A0] font-medium">No abusive permissions flagged in manifest</p>
                  )}
                </div>
              </div>

              {/* Supporting Evidence vs Against */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-[#0A1C3D] border border-[#123E78] space-y-2">
                  <span className="text-xs font-bold text-[#FF315B] flex items-center gap-1.5 font-mono">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Evidence of Impersonation</span>
                  </span>
                  <ul className="space-y-1 text-xs text-[#91ACD1] list-disc list-inside">
                    {analysisResult.evidenceSupporting?.length > 0 ? (
                      analysisResult.evidenceSupporting.map((ev: string, i: number) => (
                        <li key={i}>{ev}</li>
                      ))
                    ) : (
                      <li className="text-[#91ACD1] italic">No malicious indicators detected</li>
                    )}
                  </ul>
                </div>

                <div className="p-4 rounded-xl bg-[#0A1C3D] border border-[#123E78] space-y-2">
                  <span className="text-xs font-bold text-[#00E5A0] flex items-center gap-1.5 font-mono">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Mitigating Factors / Counter-Evidence</span>
                  </span>
                  <ul className="space-y-1 text-xs text-[#91ACD1] list-disc list-inside">
                    {analysisResult.evidenceAgainst?.length > 0 ? (
                      analysisResult.evidenceAgainst.map((ev: string, i: number) => (
                        <li key={i}>{ev}</li>
                      ))
                    ) : (
                      <li className="text-[#91ACD1] italic">No mitigating factors identified</li>
                    )}
                  </ul>
                </div>
              </div>

              {/* Recommended Next Steps */}
              {analysisResult.recommendedNextSteps?.length > 0 && (
                <div className="p-4 rounded-xl bg-gradient-to-r from-[#030D22] via-[#06142D] to-[#0A1C3D] border border-[#123E78] space-y-2 shadow-lg">
                  <span className="text-xs font-bold text-[#00D9FF] uppercase tracking-wider flex items-center gap-1.5 font-mono">
                    <CheckCircle2 className="w-4 h-4 text-[#00D9FF]" />
                    <span>Recommended Analyst Response</span>
                  </span>
                  <ul className="space-y-1 text-xs text-[#91ACD1] list-disc list-inside">
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

export default AppMonitoringView;
