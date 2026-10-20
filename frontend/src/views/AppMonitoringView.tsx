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
import { analyzeAppCandidate } from '../utils/appEngine';
import { compareToOfficialLogo, fileToDataUrl } from '../utils/imageHash';
import { ACME_LOGO, ACME_LOGO_COPY, OTHER_LOGO } from '../data/demoLogos';

export const AppMonitoringView: React.FC = () => {
  const { brandProfile, addCandidate, setSelectedCandidateId, setActiveTab, selectedBackendBrandId, refreshBackendData, isDemoMode } = useApp();

  const [activeMode, setActiveMode] = useState<'audit' | 'live_provider'>('audit');

  // Audit Form State
  const [appName, setAppName] = useState('');
  const [developer, setDeveloper] = useState('');
  const [store, setStore] = useState('Google Play Store');
  const [storeUrl, setStoreUrl] = useState('');
  const [description, setDescription] = useState('');
  const [branding, setBranding] = useState('');
  const [evidence, setEvidence] = useState('');
  const [packageId, setPackageId] = useState('');
  const [iconData, setIconData] = useState('');
  const [iconError, setIconError] = useState('');

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
      setAppName('Acme Wallet Pro: Instant Cash & Personal Loan');
      setDeveloper('Rogue Financial Tech UK Ltd (Unregistered)');
      setStore('Third-Party APK Mirror (APKPure / APKMirror)');
      setStoreUrl('https://apkpure.example/com.acmepro.fastloan');
      setDescription('Fast loans up to $5,000 in 5 minutes! Borrow against your balance with no credit check. Instant approval and same-day direct payout.');
      setBranding('Copies authentic blue shield logo with gold PRO ribbon.');
      setIconData(ACME_LOGO_COPY);
      setPackageId('com.acmepro.fastloan');
      setEvidence('Manifest requests excessive permissions: READ_SMS, READ_CONTACTS, ACCESS_FINE_LOCATION, SYSTEM_ALERT_WINDOW. Hosted outside Google Play.');
    } else if (type === 'official') {
      const off = brandProfile.officialApps[0] || {
        name: 'Acme Wallet: Mobile Pay & Authenticator',
        developer: 'Acme Corp Technologies Inc.',
        store: 'Google Play & Apple App Store',
      };
      setAppName(off.name);
      setDeveloper(off.developer);
      setStore(off.store);
      setStoreUrl('https://play.google.com/store/apps/details?id=com.acme.wallet');
      setDescription('Official digital wallet for Acme Corp. Manage enterprise payments, virtual debit cards, and send peer-to-peer transfers securely.');
      setBranding('High-definition verified corporate icon with SVG vector assets.');
      setIconData(ACME_LOGO);
      setPackageId('');
      setEvidence('Signed with corporate Play Store keystore certificate. Zero abusive permissions.');
    } else if (type === 'partner') {
      setAppName('Acme Corp POS Merchant Terminal Companion');
      setDeveloper('VeriPay POS Hardware Solutions GmbH');
      setStore('Google Play Store');
      setStoreUrl('https://play.google.com/store/apps/details?id=com.veripay.acme.pos');
      setDescription('Companion hardware driver for retail POS terminals integrating Acme Corp QR and NFC merchant payment rails.');
      setBranding('Hardware manufacturer logo with certified "Works with Acme Corp" badge.');
      setIconData(OTHER_LOGO);
      setPackageId('');
      setEvidence('Signed under certified partner merchant program #POS-998. Requests standard USB & Bluetooth permissions only.');
    }
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appName.trim()) {
      setErrorMsg('Candidate App Name is required (developer is optional; missing data is reported, not guessed).');
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
      // 1. Client-side evaluation: official-asset exclusion first, then explainable signals
      let logoSimilarity: number | undefined;
      let logoNote: string | undefined;
      if (iconData) {
        const cmp = await compareToOfficialLogo(iconData, brandProfile.logoUrl);
        if (cmp.available) logoSimilarity = cmp.similarity; else logoNote = cmp.reason;
      }
      const result = analyzeAppCandidate(
        { name: appName, developer, store, storeUrl, packageId, description, observedBranding: branding, evidence, logoSimilarity, logoNote },
        brandProfile
      );
      setAnalysisResult({ ...result, iconSimilarity: logoSimilarity });
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
    <div className="w-full max-w-[1720px] mx-auto space-y-6 font-sans text-fg">
      {/* 1. Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-fg">Check a mobile app</h1>
          <p className="max-w-2xl text-xs text-fgMuted mt-1 leading-relaxed">
            Compare an app's title, publisher, and package id with the verified apps of <span className="text-fg font-medium">{brandProfile.brandName}</span>. Assessments are rule-based; there is no trained model for app impersonation yet. A missing publisher match is a reason to look closer, not proof of wrongdoing.
          </p>
        </div>

        {/* Mode Selector and Quick Pre-fills */}
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-2">
          {/* Mode Switcher */}
          <div className="flex rounded-lg bg-surface2 p-0.5 border border-line">
            <button
              onClick={() => setActiveMode('audit')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent ${
                activeMode === 'audit'
                  ? 'bg-accent text-onAccent'
                  : 'text-fgMuted hover:text-fg'
              }`}
            >
              Candidate Audit
            </button>
            <button
              onClick={() => setActiveMode('live_provider')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent ${
                activeMode === 'live_provider'
                  ? 'bg-accent text-onAccent'
                  : 'text-fgMuted hover:text-fg'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Live Apple Store Scan</span>
            </button>
          </div>

          {activeMode === 'audit' && isDemoMode && (
            <div className="flex flex-wrap items-center gap-1.5 bg-surface2 p-1 rounded-lg border border-line">
              <span className="text-[11px] font-medium text-fgSubtle px-1">Demo Scenarios:</span>
              <button
                type="button"
                onClick={() => loadScenario('rogue')}
                className="px-2 py-0.5 rounded-md bg-danger/10 hover:bg-danger/20 text-danger text-xs font-medium border border-danger/30 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
              >
                Rogue Loan APK
              </button>
              <button
                type="button"
                onClick={() => loadScenario('official')}
                className="px-2 py-0.5 rounded-md bg-ok/10 hover:bg-ok/20 text-ok text-xs font-medium border border-ok/30 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
              >
                Official App
              </button>
              <button
                type="button"
                onClick={() => loadScenario('partner')}
                className="px-2 py-0.5 rounded-md bg-warn/10 hover:bg-warn/20 text-warn text-xs font-medium border border-warn/30 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
              >
                Partner POS
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. MODE 1: LIVE APPLE APP STORE SCAN (ITUNES REST API) */}
      {activeMode === 'live_provider' && (
        <div className="bg-surface rounded-xl p-5 text-fg border border-line space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-line">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-surface2 border border-line flex items-center justify-center text-accent">
                <Globe className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-semibold text-fg flex items-center gap-2">
                  <span>Apple App Store Intelligence (iTunes API)</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-ok/10 text-ok border border-ok/30 font-medium">
                    Live Connector Active
                  </span>
                </div>
                <p className="text-xs text-fgMuted mt-0.5">
                  Queries Apple's live public registry for <strong className="text-fg font-medium">"{brandProfile.brandName}"</strong>, automatically excludes verified brand assets, and persists findings.
                </p>
              </div>
            </div>

            {/* Run Controls */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-surface2 px-2.5 py-1.5 rounded-md border border-line text-xs text-fgMuted">
                <span>Limit:</span>
                <select
                  value={providerLimit}
                  onChange={(e) => setProviderLimit(Number(e.target.value))}
                  className="bg-transparent text-fg font-medium focus:outline-none cursor-pointer"
                >
                  <option value={10} className="bg-surface">10 apps</option>
                  <option value={25} className="bg-surface">25 apps</option>
                  <option value={50} className="bg-surface">50 apps</option>
                </select>
              </div>

              <button
                onClick={handleRunProviderScan}
                disabled={providerScanning}
                className="px-3 py-1.5 rounded-md bg-accent hover:bg-accent/90 text-onAccent font-medium text-xs transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
              >
                {providerScanning ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-onAccent" />
                    <span>Querying iTunes Feed...</span>
                  </>
                ) : (
                  <>
                    <Radio className="w-3.5 h-3.5 text-onAccent" />
                    <span>Launch Live Store Scan</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {providerError && (
            <div className="p-3 rounded-lg bg-danger/10 border border-danger/30 text-xs text-danger flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-danger" />
              <span>{providerError}</span>
            </div>
          )}

          {/* Results strip */}
          {providerScanResult && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-lg bg-surface2 border border-line text-center">
                  <div className="text-xs font-medium text-fgSubtle">Total Retrieved</div>
                  <div className="text-xl font-semibold font-mono text-fg mt-0.5">
                    {providerScanResult.total_retrieved}
                  </div>
                  <div className="text-[11px] text-fgMuted font-mono">Live iTunes Records</div>
                </div>

                <div className="p-3 rounded-lg bg-surface2 border border-line text-center">
                  <div className="text-xs font-medium text-fgSubtle">Official Excluded</div>
                  <div className="text-xl font-semibold font-mono text-ok mt-0.5">
                    {providerScanResult.excluded_official_count}
                  </div>
                  <div className="text-[11px] text-ok font-mono">Allowlist Filtered</div>
                </div>

                <div className="p-3 rounded-lg bg-surface2 border border-line text-center">
                  <div className="text-xs font-medium text-fgSubtle">Threats Flagged</div>
                  <div className="text-xl font-semibold font-mono text-danger mt-0.5">
                    {providerScanResult.persisted_findings_count}
                  </div>
                  <div className="text-[11px] text-danger font-mono">Saved to Threat DB</div>
                </div>

                <div className="p-3 rounded-lg bg-surface2 border border-line text-center">
                  <div className="text-xs font-medium text-fgSubtle">Benign Filtered</div>
                  <div className="text-xl font-semibold font-mono text-fg mt-0.5">
                    {providerScanResult.benign_unrelated_count}
                  </div>
                  <div className="text-[11px] text-fgMuted font-mono">Zero-Risk Filtered</div>
                </div>
              </div>

              {/* Excluded Apps Banner */}
              {providerScanResult.excluded_official?.length > 0 && (
                <div className="p-3.5 rounded-lg bg-ok/10 border border-ok/30 space-y-2">
                  <div className="text-xs font-medium text-ok flex items-center gap-2 font-mono">
                    <ShieldCheck className="w-4 h-4 text-ok" /> Official Brand Asset Allowlist Exclusion Active
                  </div>
                  <div className="space-y-1">
                    {providerScanResult.excluded_official.map((ex: any, idx: number) => (
                      <div key={idx} className="p-2 rounded-md bg-surface border border-line text-xs text-fgMuted flex items-center justify-between">
                        <span className="font-medium text-fg">{ex.candidate_name} ({ex.package_id})</span>
                        <span className="text-[11px] text-ok font-mono">{ex.exclusion_reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Detected candidates list */}
              {providerScanResult.findings?.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs text-fgSubtle font-medium flex items-center justify-between">
                    <span>Detected Threat Candidates ({providerScanResult.findings.length})</span>
                    <span className="text-xs text-accent">Persisted into Database</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {providerScanResult.findings.map((f: any, idx: number) => (
                      <div key={idx} className="p-3.5 rounded-lg bg-surface2 border border-line hover:border-line/80 transition-colors space-y-1.5">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="text-xs font-medium text-fg font-mono flex items-center gap-1.5">
                              {f.candidate_name}
                            </div>
                            <div className="text-[11px] text-fgMuted mt-0.5">
                              Source: {f.detection_source} • Live iTunes Feed
                            </div>
                          </div>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium border ${
                            f.severity === 'CRITICAL' ? 'bg-danger/10 border-danger/30 text-danger' :
                            f.severity === 'HIGH' ? 'bg-warn/10 border-warn/30 text-warn' :
                            'bg-accent/10 border-accent/30 text-accent'
                          }`}>
                            {f.severity} ({f.risk_score})
                          </span>
                        </div>
                        {f.source_url && (
                          <a
                            href={f.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-accent hover:underline flex items-center gap-1 font-mono truncate"
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
        <div className="lg:col-span-5 bg-surface p-5 rounded-xl border border-line space-y-4">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <h3 className="text-sm font-semibold text-fg flex items-center gap-2">
              <Package className="w-4 h-4 text-accent" />
              <span>Candidate Application Profile</span>
            </h3>
            <span className="text-xs text-fgMuted font-mono">Store Inspection</span>
          </div>

          <form onSubmit={handleAnalyze} className="space-y-3.5 text-xs">
            <div>
              <label className="block text-xs font-medium text-fgSubtle mb-1">
                Candidate Application Name <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                required
                value={appName}
                onChange={e => setAppName(e.target.value)}
                placeholder="e.g. Brand Mobile Fast Loan"
                className="w-full px-3 py-2 text-xs rounded-md border border-line bg-surface2 text-fg focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-medium text-fgSubtle mb-1">
                  Developer / Publisher <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={developer}
                  onChange={e => setDeveloper(e.target.value)}
                  placeholder="e.g. Unregistered Publisher Ltd"
                  className="w-full px-3 py-2 text-xs rounded-md border border-line bg-surface2 text-fg focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-fgSubtle mb-1">
                  Store / Repository
                </label>
                <select
                  value={store}
                  onChange={e => setStore(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-md border border-line bg-surface2 text-fg focus:outline-none focus:ring-1 focus:ring-accent font-medium cursor-pointer"
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
              <label className="block text-xs font-medium text-fgSubtle mb-1">
                Listing URL or Mirror Download Link
              </label>
              <input
                type="url"
                value={storeUrl}
                onChange={e => setStoreUrl(e.target.value)}
                placeholder="https://play.google.com/store/apps/details?id=..."
                className="w-full px-3 py-2 text-xs rounded-md border border-line bg-surface2 text-fg focus:outline-none focus:ring-1 focus:ring-accent font-mono transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-fgSubtle mb-1">
                Store Listing Description
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="App description, advertised features, and financial claims..."
                className="w-full px-3 py-2 text-xs rounded-md border border-line bg-surface2 text-fg focus:outline-none focus:ring-1 focus:ring-accent resize-none leading-relaxed"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-fgSubtle mb-1">
                Observed Branding &amp; Icon
              </label>
              <input
                type="text"
                value={branding}
                onChange={e => setBranding(e.target.value)}
                placeholder="e.g. Copies authentic blue shield logo with gold PRO ribbon"
                className="w-full px-3 py-2 text-xs rounded-md border border-line bg-surface2 text-fg focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-fgSubtle mb-1">Package ID / Bundle ID <span className="font-normal">(optional)</span></label>
                <input
                  type="text"
                  value={packageId}
                  onChange={e => setPackageId(e.target.value)}
                  placeholder="e.g. com.acmepro.fastloan"
                  className="w-full px-3 py-2 text-xs rounded-md border border-line bg-surface2 text-fg focus:outline-none focus:ring-1 focus:ring-accent font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-fgSubtle mb-1">App Icon <span className="font-normal">(optional, compared with the official logo)</span></label>
                <div className="flex items-center gap-2">
                  {iconData && <img src={iconData} alt="Candidate icon" className="w-8 h-8 rounded-md object-cover border border-line" />}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async e => {
                      const f = e.target.files?.[0];
                      setIconError('');
                      if (!f) { setIconData(''); return; }
                      try { setIconData(await fileToDataUrl(f)); } catch (err: any) { setIconData(''); setIconError(err.message); }
                    }}
                    className="text-xs text-fgMuted file:mr-2 file:px-2.5 file:py-1.5 file:rounded-md file:border file:border-line file:bg-surface2 file:text-fg"
                  />
                </div>
                {iconError && <p className="text-[11px] text-danger mt-1">{iconError}</p>}
                {!brandProfile.logoUrl && <p className="text-[11px] text-fgSubtle mt-1">Upload an official logo in Brand Profile to enable icon matching.</p>}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-fgSubtle mb-1">
                Manifest Permissions &amp; Evidence
              </label>
              <textarea
                rows={2}
                value={evidence}
                onChange={e => setEvidence(e.target.value)}
                placeholder="Extracted manifest permissions, network calls, APK signatures..."
                className="w-full px-3 py-2 text-xs rounded-md border border-line bg-surface2 text-fg focus:outline-none focus:ring-1 focus:ring-accent resize-none font-mono text-xs"
              />
            </div>

            {errorMsg && (
              <div className="p-3 rounded-lg bg-danger/10 border border-danger/30 text-xs text-danger font-medium font-mono">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={isAnalyzing}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-accent hover:bg-accent/90 text-onAccent text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-onAccent" />
                  <span>Auditing App Package Signatures...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-onAccent" />
                  <span>Analyze App Package</span>
                </>
              )}
            </button>
          </form>

          {/* Official Baseline Reference Card */}
          {officialApp && (
            <div className="p-3.5 rounded-lg bg-surface2 border border-line text-xs space-y-1">
              <span className="text-xs font-medium text-fgSubtle block">
                Protected Identity Reference
              </span>
              <p className="font-semibold text-fg">{officialApp.name}</p>
              <p className="text-fgMuted text-xs">
                Authorized Developer: <strong className="text-accent">{officialApp.developer}</strong>
              </p>
              <p className="text-fgMuted text-xs font-mono">Store: {officialApp.store}</p>
            </div>
          )}
        </div>

        {/* Analysis Output & Reasoning (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {!analysisResult && !isAnalyzing && (
            <div className="bg-surface/50 p-12 rounded-xl border border-dashed border-line text-center space-y-3">
              <div className="w-12 h-12 rounded-lg bg-surface2 text-accent flex items-center justify-center mx-auto border border-line">
                <Smartphone className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-medium text-fg">No Application Candidate Selected</h4>
              <p className="text-xs text-fgMuted max-w-md mx-auto leading-relaxed">
                Fill in the candidate form on the left or select a pre-configured scenario to trigger automated
                inspection of developer signatures, authority lures, and permission risks.
              </p>
            </div>
          )}

          {isAnalyzing && (
            <div className="bg-surface p-10 rounded-xl border border-line text-center space-y-3">
              <div className="w-10 h-10 rounded-lg bg-surface2 text-accent flex items-center justify-center mx-auto border border-line">
                <Loader2 className="w-5 h-5 animate-spin text-accent" />
              </div>
              <h4 className="text-sm font-medium text-fg">Executing Deep App Package Analysis</h4>
              <p className="text-xs text-fgMuted max-w-md mx-auto font-mono">
                Auditing developer certificate signatures, checking package naming distance, and evaluating manifest permissions against brand telemetry.
              </p>
            </div>
          )}

          {analysisResult && (
            <div className="bg-surface p-5 rounded-xl border border-line space-y-5">
              {/* Verdict Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-line gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <RiskBadge level={analysisResult.riskCategory} />
                    <span className="text-xs font-mono text-fgMuted">
                      Evaluated by {analysisResult.analysisEngine || 'SURAKSHA Engine'}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-fg">
                    {analysisResult.candidateName}
                  </h3>
                  <p className="text-xs text-fgMuted font-mono">Store: {analysisResult.store}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSendToInvestigation}
                    disabled={!!createdCandidateId}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-accent hover:bg-accent/90 text-onAccent text-xs font-medium disabled:bg-ok/10 disabled:text-ok disabled:border disabled:border-ok/30 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
                  >
                    {createdCandidateId ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-ok" />
                        <span>In Investigation Center</span>
                      </>
                    ) : (
                      <>
                        <ArrowRight className="w-3.5 h-3.5 text-onAccent" />
                        <span>Add to Investigation Center</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Engine Telemetry & Explicit Deterministic Baseline Notice */}
              <div className="p-3.5 rounded-lg bg-surface2 border border-line text-xs space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <span className="font-semibold text-fg flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-accent" />
                    <span>Active Engine: Suraksha Rule &amp; Publisher Allowlist Heuristics</span>
                  </span>
                  <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded border bg-surface text-fgMuted border-line self-start sm:self-auto">
                    Engine: Deterministic Heuristics
                  </span>
                </div>
                <p className="text-xs text-fgMuted leading-relaxed">
                  Threat score is evaluated strictly via verified publisher keystore matching, package syntax cross-referencing, and keyword lure detection. Rule-based evaluation; no unverified ML claims.
                </p>
              </div>

              {/* Exclusion Banner if Official */}
              {analysisResult.isExcluded && (
                <div className="p-3.5 rounded-lg bg-ok/10 border border-ok/30 flex items-start gap-3">
                  <ShieldCheck className="w-4 h-4 text-ok shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-semibold text-ok">Official Brand Asset Verified — Excluded from Threats</h4>
                    <p className="text-xs text-fgMuted mt-0.5">{analysisResult.exclusionReason}</p>
                  </div>
                </div>
              )}

              {/* Summary */}
              <div className="space-y-1">
                <span className="text-xs font-medium text-fgSubtle">
                  Assessment Summary
                </span>
                <p className="text-xs text-fg leading-relaxed">
                  {analysisResult.summary}
                </p>
              </div>

              {/* Key Indicators */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Developer Mismatch Alert */}
                <div className="p-3 rounded-lg border border-line bg-surface2 space-y-1">
                  <span className="text-xs font-medium text-fgSubtle">
                    Developer Entity Verification
                  </span>
                  {analysisResult.developerMismatch ? (
                    <div className="flex items-center gap-1.5 text-danger text-xs font-medium font-mono">
                      <AlertTriangle className="w-4 h-4 text-danger shrink-0" />
                      <span>Publisher Mismatch Detected</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-ok text-xs font-medium font-mono">
                      <ShieldCheck className="w-4 h-4 text-ok shrink-0" />
                      <span>Publisher Matches Verified Entity</span>
                    </div>
                  )}
                  <p className="text-xs text-fgMuted">
                    Candidate: <strong className="text-fg font-medium">{developer}</strong>
                  </p>
                </div>

                {/* Permissions Breakdown */}
                <div className="p-3 rounded-lg border border-line bg-surface2 space-y-1">
                  <span className="text-xs font-medium text-fgSubtle">
                    Sensitive Device Permissions
                  </span>
                  {analysisResult.suspiciousPermissions?.length > 0 ? (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {analysisResult.suspiciousPermissions.map((perm: string, i: number) => (
                        <span key={i} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-danger/10 text-danger font-medium border border-danger/30">
                          {perm}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-ok font-medium">No abusive permissions flagged in manifest</p>
                  )}
                </div>
              </div>

              {/* Supporting Evidence vs Against */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-lg bg-surface2 border border-line space-y-2">
                  <span className="text-xs font-semibold text-danger flex items-center gap-1.5 font-mono">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Evidence Supporting Threat</span>
                  </span>
                  <ul className="space-y-1 text-xs text-fgMuted list-disc list-inside">
                    {analysisResult.evidenceSupporting?.length > 0 ? (
                      analysisResult.evidenceSupporting.map((ev: string, i: number) => (
                        <li key={i}>{ev}</li>
                      ))
                    ) : (
                      <li className="text-fgMuted italic">No malicious indicators detected</li>
                    )}
                  </ul>
                </div>

                <div className="p-3.5 rounded-lg bg-surface2 border border-line space-y-2">
                  <span className="text-xs font-semibold text-ok flex items-center gap-1.5 font-mono">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Mitigating Factors / Counter-Evidence</span>
                  </span>
                  <ul className="space-y-1 text-xs text-fgMuted list-disc list-inside">
                    {analysisResult.evidenceAgainst?.length > 0 ? (
                      analysisResult.evidenceAgainst.map((ev: string, i: number) => (
                        <li key={i}>{ev}</li>
                      ))
                    ) : (
                      <li className="text-fgMuted italic">No mitigating factors identified</li>
                    )}
                  </ul>
                </div>
              </div>

              {/* Recommended Next Steps */}
              {analysisResult.recommendedNextSteps?.length > 0 && (
                <div className="p-3.5 rounded-lg bg-surface border border-line space-y-2">
                  <span className="text-xs font-medium text-fgSubtle flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-accent" />
                    <span>Recommended Analyst Response</span>
                  </span>
                  <ul className="space-y-1 text-xs text-fgMuted list-disc list-inside">
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
