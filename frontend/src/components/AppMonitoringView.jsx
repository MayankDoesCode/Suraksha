import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Search,
  ShieldCheck,
  AlertTriangle,
  ExternalLink,
  Plus,
  RefreshCw,
  CheckCircle2,
  Sliders,
  Send,
  Zap,
  Package,
  UserCheck,
  Globe,
  Radio,
  Layers,
  Sparkles,
  Check,
  ArrowRight,
  Cpu
} from 'lucide-react';
import api from '../api/client';

export default function AppMonitoringView({ brands, onRefreshMetrics }) {
  const [selectedBrandId, setSelectedBrandId] = useState(brands[0]?.id || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [scanResult, setScanResult] = useState(null);

  // Live Provider Scanning State (Phase 4)
  const [providerScanning, setProviderScanning] = useState(false);
  const [providerScanResult, setProviderScanResult] = useState(null);
  const [providerError, setProviderError] = useState(null);
  const [providerLimit, setProviderLimit] = useState(25);
  const [providerStatus, setProviderStatus] = useState(null);

  // Manual Form State
  const [formData, setFormData] = useState({
    candidate_name: '',
    package_id: '',
    publisher_name: '',
    description: '',
    source_url: '',
    platform: 'android_play_store',
    is_sample: true,
  });

  const selectedBrand = brands.find((b) => b.id === selectedBrandId) || brands[0];

  useEffect(() => {
    // Check provider connection status on mount
    const fetchStatus = async () => {
      try {
        const res = await api.getIntegrationsStatus();
        if (res?.providers?.itunes_app_store) {
          setProviderStatus(res.providers.itunes_app_store);
        }
      } catch (e) {
        // Fallback
      }
    };
    fetchStatus();
  }, []);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Run Real External Data Provider Scan (Apple App Store API)
  const handleRunProviderScan = async () => {
    if (!selectedBrandId) {
      setProviderError('Please select a target brand to scan.');
      return;
    }

    setProviderScanning(true);
    setProviderError(null);
    setProviderScanResult(null);

    try {
      const res = await api.scanBrandProvider(selectedBrandId, 'itunes_app_store', providerLimit);
      setProviderScanResult(res.data);
      if (onRefreshMetrics) onRefreshMetrics();
    } catch (err) {
      setProviderError(err.message || 'External provider scan failed.');
    } finally {
      setProviderScanning(false);
    }
  };

  // Quick-fill presets
  const loadPreset = (type) => {
    if (!selectedBrand) return;
    const brandName = selectedBrand.name;
    const cleanName = brandName.toLowerCase().replace(/[^a-z0-9]/g, '');

    if (type === 'copycat') {
      setFormData({
        candidate_name: `${brandName} Mobile Fast Loan & Pay`,
        package_id: `com.${cleanName}.fastloan.apk`,
        publisher_name: 'QuickFin Holdings LTD',
        description: `Official instant mobile financing app for verified ${brandName} account holders. Secure quick authorization.`,
        source_url: `https://play.google.com/store/apps/details?id=com.${cleanName}.fastloan.apk`,
        platform: 'android_play_store',
        is_sample: true,
      });
    } else if (type === 'official') {
      const offApp = selectedBrand.app_identifiers?.[0];
      const offPub = selectedBrand.publishers?.[0];
      setFormData({
        candidate_name: offApp?.app_name || `${brandName} Mobile Banking`,
        package_id: offApp?.identifier || `com.${cleanName}.mobile`,
        publisher_name: offPub?.publisher_name || `${brandName} Official Inc`,
        description: `Official enterprise mobile application for ${brandName}.`,
        source_url: `https://play.google.com/store/apps/details?id=${offApp?.identifier || `com.${cleanName}.mobile`}`,
        platform: offApp?.platform || 'android_play_store',
        is_sample: false,
      });
    } else if (type === 'unrelated') {
      setFormData({
        candidate_name: 'Super Speed Racer 3D',
        package_id: 'com.racergames.superspeed3d',
        publisher_name: 'Indie Game Studio',
        description: 'Casual high-speed racing simulation game with offline levels.',
        source_url: 'https://play.google.com/store/apps/details?id=com.racergames.superspeed3d',
        platform: 'android_play_store',
        is_sample: true,
      });
    }
  };

  const handleRunScan = async (e) => {
    e.preventDefault();
    if (!selectedBrandId) {
      setError('Please select a brand profile to evaluate against.');
      return;
    }
    if (!formData.candidate_name) {
      setError('Application title is required.');
      return;
    }

    setLoading(true);
    setError(null);
    setScanResult(null);

    try {
      const payload = {
        ...formData,
        asset_type: 'mobile_app',
        detection_source: formData.is_sample ? 'sample_feed' : 'analyst_submission',
      };

      const res = await api.scanCandidate(selectedBrandId, payload);
      setScanResult(res.data);
      if (onRefreshMetrics) onRefreshMetrics();
    } catch (err) {
      setError(err.message || 'Mobile app scan evaluation failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Banner & Brand Selector */}
      <div className="cyber-panel p-6 rounded-2xl border border-cyber-border flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-cyber-accent/10 border border-cyber-accent/30 flex items-center justify-center text-cyber-accent shadow-glow">
            <Smartphone className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-fg flex items-center gap-2">
              Mobile Application Guard
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyber-emerald/10 text-cyber-emerald border border-cyber-emerald/30">
                Phase 4: Live Data Active
              </span>
            </h2>
            <p className="text-xs text-cyber-textMuted mt-0.5">
              Live retrieval from Apple App Store, automated official asset exclusion, and explainable impersonation scoring.
            </p>
          </div>
        </div>

        {/* Brand Selector */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-cyber-textMuted whitespace-nowrap">Target Brand:</span>
          {brands.length === 0 ? (
            <span className="text-xs text-cyber-rose">No brands registered.</span>
          ) : (
            <select
              value={selectedBrandId}
              onChange={(e) => {
                setSelectedBrandId(e.target.value);
                setProviderScanResult(null);
                setScanResult(null);
              }}
              className="bg-cyber-surface border border-cyber-border rounded-lg px-3 py-2 text-xs font-mono text-fg focus:outline-none focus:border-cyber-accent"
            >
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.app_identifiers?.length || 0} packages, {b.publishers?.length || 0} publishers)
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* PHASE 4: LIVE STORE INTELLIGENCE PROVIDER SCAN */}
      <div className="cyber-panel p-6 rounded-2xl border border-cyber-accent/40 bg-gradient-to-r from-cyber-surface/90 via-cyber-dark/80 to-cyber-surface/90 space-y-5 shadow-glow">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-cyber-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-cyber-accent/15 border border-cyber-accent/40 flex items-center justify-center text-cyber-accent">
              <Globe className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="text-sm font-bold font-mono text-fg flex items-center gap-2">
                Live External Provider: Apple App Store (iTunes API)
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyber-emerald/15 text-cyber-emerald border border-cyber-emerald/30 flex items-center gap-1 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyber-emerald animate-ping" />
                  OPERATIONAL • LIVE
                </span>
              </div>
              <div className="text-xs text-cyber-textMuted font-mono">
                Authorized public REST search API • Country: US • Rate allowance: ~20 calls/min
              </div>
            </div>
          </div>

          {/* Trigger Scan Controls */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-cyber-darkest px-3 py-1.5 rounded-lg border border-cyber-border text-xs font-mono text-fgMuted">
              <span>Limit:</span>
              <select
                value={providerLimit}
                onChange={(e) => setProviderLimit(Number(e.target.value))}
                className="bg-transparent text-fg focus:outline-none"
              >
                <option value={10}>10 apps</option>
                <option value={25}>25 apps</option>
                <option value={50}>50 apps</option>
              </select>
            </div>

            <button
              onClick={handleRunProviderScan}
              disabled={providerScanning || !selectedBrandId}
              className="px-4 py-2 rounded-lg bg-cyber-accent hover:bg-cyber-accentHover text-onAccent font-semibold text-xs tracking-wider uppercase transition-all shadow-glow flex items-center gap-2 disabled:opacity-50"
            >
              {providerScanning ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Querying Apple Store...
                </>
              ) : (
                <>
                  <Radio className="w-4 h-4 text-onAccent" /> Run Live App Store Scan
                </>
              )}
            </button>
          </div>
        </div>

        {providerError && (
          <div className="p-3 rounded-lg bg-cyber-rose/10 border border-cyber-rose/30 text-xs text-cyber-rose font-mono">
            {providerError}
          </div>
        )}

        {/* Live Provider Scan Results */}
        {providerScanResult && (
          <div className="space-y-4 animate-in fade-in duration-300">
            {/* Scan Metrics Strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-cyber-darkest border border-cyber-border text-center">
                <div className="text-[10px] font-mono text-cyber-textMuted uppercase">Store Candidates</div>
                <div className="text-xl font-bold font-mono text-fg mt-0.5">
                  {providerScanResult.total_retrieved}
                </div>
                <div className="text-[10px] text-cyber-accent font-mono">Live iTunes Feed</div>
              </div>

              <div className="p-3.5 rounded-xl bg-cyber-emerald/10 border border-cyber-emerald/30 text-center">
                <div className="text-[10px] font-mono text-cyber-emerald uppercase">Official Excluded</div>
                <div className="text-xl font-bold font-mono text-cyber-emerald mt-0.5">
                  {providerScanResult.excluded_official_count}
                </div>
                <div className="text-[10px] text-cyber-textMuted font-mono">Whitelist Matches</div>
              </div>

              <div className="p-3.5 rounded-xl bg-cyber-rose/10 border border-cyber-rose/30 text-center">
                <div className="text-[10px] font-mono text-cyber-rose uppercase">Suspicious Flagged</div>
                <div className="text-xl font-bold font-mono text-cyber-rose mt-0.5">
                  {providerScanResult.persisted_findings_count}
                </div>
                <div className="text-[10px] text-cyber-rose/80 font-mono">Persisted to Threat DB</div>
              </div>

              <div className="p-3.5 rounded-xl bg-cyber-darkest border border-cyber-border text-center">
                <div className="text-[10px] font-mono text-cyber-textMuted uppercase">Benign Filtered</div>
                <div className="text-xl font-bold font-mono text-fgMuted mt-0.5">
                  {providerScanResult.benign_unrelated_count}
                </div>
                <div className="text-[10px] text-cyber-textMuted font-mono">Zero Risk Noise</div>
              </div>
            </div>

            {/* Excluded Official Apps Notice */}
            {providerScanResult.excluded_official?.length > 0 && (
              <div className="p-4 rounded-xl bg-cyber-emerald/5 border border-cyber-emerald/30 space-y-2">
                <div className="text-xs font-mono font-bold text-cyber-emerald flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" /> Official Brand Asset Whitelist Exclusion Active
                </div>
                <div className="space-y-1.5">
                  {providerScanResult.excluded_official.map((ex, idx) => (
                    <div key={idx} className="p-2 rounded bg-cyber-darkest text-xs font-mono text-fgMuted flex items-center justify-between">
                      <span className="font-semibold text-fg">{ex.candidate_name} ({ex.package_id})</span>
                      <span className="text-[11px] text-cyber-emerald">{ex.exclusion_reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* List of Flagged Suspicious Findings */}
            {providerScanResult.findings?.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-mono uppercase tracking-wider text-fg font-semibold flex items-center justify-between">
                  <span>Detected Candidates — Potential Risk / Needs Review ({providerScanResult.findings.length})</span>
                  <span className="text-[11px] font-mono text-cyber-accent">Awaiting Analyst Triage</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {providerScanResult.findings.map((f, idx) => (
                    <div key={idx} className="p-3.5 rounded-xl bg-cyber-darkest border border-cyber-border hover:border-cyber-accent/50 transition-all space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-xs font-bold text-fg font-mono flex items-center gap-1.5">
                            {f.candidate_name}
                          </div>
                          <div className="text-[11px] text-cyber-textMuted font-mono">
                            Source: {f.detection_source} • Live External Data
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-warn/15 border border-warn/40 text-warn font-semibold uppercase">
                            Needs Review
                          </span>
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase border ${
                            f.severity === 'CRITICAL' ? 'bg-danger/15 border-danger/40 text-danger' :
                            f.severity === 'HIGH' ? 'bg-warn/15 border-warn/40 text-warn' :
                            'bg-accent/15 border-accent/40 text-accent'
                          }`}>
                            {f.severity} ({f.risk_score})
                          </span>
                        </div>
                      </div>
                      {f.source_url && (
                        <a
                          href={f.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-cyber-accent hover:underline flex items-center gap-1 font-mono truncate"
                        >
                          <ExternalLink className="w-3 h-3 shrink-0" /> {f.source_url}
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

      {/* MANUAL INGESTION & TESTING FORM (Analyst Triage) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form */}
        <div className="lg:col-span-5 cyber-panel p-6 rounded-2xl border border-cyber-border space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-cyber-border">
            <div className="text-xs font-mono uppercase tracking-wider text-fg font-semibold flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyber-accent" /> Custom App Candidate Ingestion
            </div>
            <span className="text-[10px] font-mono text-cyber-textMuted">Analyst Submission</span>
          </div>

          {/* Quick Presets */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono text-cyber-textMuted flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-cyber-amber" /> Load Realistic Presets:
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => loadPreset('copycat')}
                className="px-2.5 py-1 text-[11px] rounded bg-cyber-rose/10 border border-cyber-rose/30 text-cyber-rose hover:bg-cyber-rose/20 transition-all font-mono"
              >
                + Copycat Loan/Pay App
              </button>
              <button
                type="button"
                onClick={() => loadPreset('official')}
                className="px-2.5 py-1 text-[11px] rounded bg-cyber-emerald/10 border border-cyber-emerald/30 text-cyber-emerald hover:bg-cyber-emerald/20 transition-all font-mono"
              >
                + Official App (Exclusion)
              </button>
              <button
                type="button"
                onClick={() => loadPreset('unrelated')}
                className="px-2.5 py-1 text-[11px] rounded bg-surface3 border border-line text-fgMuted hover:bg-surface3 transition-all font-mono"
              >
                + Unrelated 3D Game
              </button>
            </div>
          </div>

          <form onSubmit={handleRunScan} className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-fgMuted mb-1">
                Application Title *
              </label>
              <input
                type="text"
                placeholder="e.g. Acme Mobile Quick Loan"
                value={formData.candidate_name}
                onChange={(e) => handleInputChange('candidate_name', e.target.value)}
                className="w-full bg-cyber-darkest border border-cyber-border rounded-lg px-3 py-2 text-xs text-fg placeholder-slate-600 focus:outline-none focus:border-cyber-accent font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-fgMuted mb-1">
                Package / Bundle Identifier
              </label>
              <input
                type="text"
                placeholder="e.g. com.acme.quickloan.apk"
                value={formData.package_id}
                onChange={(e) => handleInputChange('package_id', e.target.value)}
                className="w-full bg-cyber-darkest border border-cyber-border rounded-lg px-3 py-2 text-xs text-fg placeholder-slate-600 focus:outline-none focus:border-cyber-accent font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-mono text-fgMuted mb-1">
                  Developer / Publisher
                </label>
                <input
                  type="text"
                  placeholder="e.g. Holdings Corp"
                  value={formData.publisher_name}
                  onChange={(e) => handleInputChange('publisher_name', e.target.value)}
                  className="w-full bg-cyber-darkest border border-cyber-border rounded-lg px-3 py-2 text-xs text-fg placeholder-slate-600 focus:outline-none focus:border-cyber-accent font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-fgMuted mb-1">
                  Store Platform
                </label>
                <select
                  value={formData.platform}
                  onChange={(e) => handleInputChange('platform', e.target.value)}
                  className="w-full bg-cyber-darkest border border-cyber-border rounded-lg px-3 py-2 text-xs text-fg focus:outline-none focus:border-cyber-accent font-mono"
                >
                  <option value="android_play_store">Google Play Store</option>
                  <option value="ios_app_store">Apple App Store</option>
                  <option value="third_party_apk">Third-Party APK</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-fgMuted mb-1">
                Store Listing URL
              </label>
              <input
                type="url"
                placeholder="https://play.google.com/store/apps/details?id=..."
                value={formData.source_url}
                onChange={(e) => handleInputChange('source_url', e.target.value)}
                className="w-full bg-cyber-darkest border border-cyber-border rounded-lg px-3 py-2 text-xs text-fg placeholder-slate-600 focus:outline-none focus:border-cyber-accent font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-fgMuted mb-1">
                Listing Description
              </label>
              <textarea
                rows={2}
                placeholder="Enter candidate description text to audit for authority keywords..."
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="w-full bg-cyber-darkest border border-cyber-border rounded-lg px-3 py-2 text-xs text-fg placeholder-slate-600 focus:outline-none focus:border-cyber-accent resize-none"
              />
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-cyber-rose/10 border border-cyber-rose/30 text-xs text-cyber-rose font-mono">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !selectedBrandId}
              className="w-full py-2.5 rounded-lg bg-cyber-accent text-onAccent font-semibold text-xs tracking-wider uppercase hover:bg-cyber-accentHover transition-all shadow-glow flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Verifying App Signatures...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" /> Audit Mobile Application
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Output */}
        <div className="lg:col-span-7 space-y-4">
          {!scanResult && !loading && (
            <div className="cyber-panel p-12 rounded-2xl border border-cyber-border text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-cyber-surface border border-cyber-border flex items-center justify-center text-cyber-textMuted mx-auto">
                <Package className="w-8 h-8" />
              </div>
              <h3 className="text-sm font-semibold text-fg">
                No Custom Application Evaluated Yet
              </h3>
              <p className="text-xs text-cyber-textMuted max-w-sm mx-auto leading-relaxed">
                Provide an app listing name, package ID, and publisher to test against verified brand developer signatures and whitelist rules. Or run a live scan above!
              </p>
            </div>
          )}

          {scanResult && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Official Exclusion Banner */}
              {scanResult.excluded ? (
                <div className="cyber-panel p-6 rounded-2xl border border-cyber-emerald/50 bg-cyber-emerald/5 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyber-emerald/20 text-cyber-emerald flex items-center justify-center">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-cyber-emerald flex items-center gap-2">
                        OFFICIAL APP IDENTIFIER CONFIRMED — EXCLUDED
                      </div>
                      <div className="text-xs text-cyber-textMuted">
                        Package ID matches verified brand mobile registry. Zero threat persisted.
                      </div>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-cyber-darkest border border-cyber-emerald/20 text-xs font-mono text-fgMuted">
                    {scanResult.exclusion_reason}
                  </div>
                </div>
              ) : (
                /* Suspicious Threat Output */
                <div className="cyber-panel p-6 rounded-2xl border border-cyber-border space-y-5">
                  <div className="flex items-start justify-between pb-4 border-b border-cyber-border">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <span className="text-base font-bold text-fg font-mono">
                          {scanResult.candidate_name}
                        </span>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase border ${
                            scanResult.severity === 'CRITICAL'
                              ? 'bg-danger/15 border-danger/40 text-danger'
                              : scanResult.severity === 'HIGH'
                              ? 'bg-warn/15 border-warn/40 text-warn'
                              : scanResult.severity === 'MEDIUM'
                              ? 'bg-accent/15 border-accent/40 text-accent'
                              : 'bg-ok/15 border-ok/40 text-cyber-emerald'
                          }`}
                        >
                          {scanResult.severity} RISK
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyber-surface border border-cyber-border text-cyber-textMuted">
                          {scanResult.finding?.is_sample ? 'Sample Feed' : 'Analyst Submission'}
                        </span>
                      </div>
                      <p className="text-xs text-cyber-textMuted mt-1 font-mono">
                        Target Brand: <span className="text-fg">{selectedBrand?.name}</span>
                      </p>
                    </div>

                    <div className="text-right">
                      <div className="text-2xl font-bold font-mono text-fg">
                        {scanResult.risk_score}
                        <span className="text-xs text-cyber-textMuted">/100</span>
                      </div>
                      <div className="text-[10px] font-mono text-cyber-textMuted">HYBRID SCORE</div>
                    </div>
                  </div>

                  {/* Hybrid Sub-scores Breakdown */}
                  <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-cyber-darkest border border-cyber-border/70 text-xs font-mono">
                    <div>
                      <span className="text-[10px] text-cyber-textMuted uppercase block">Rule-Based Score</span>
                      <span className="text-fg font-bold text-sm">
                        {scanResult.rule_based_score ?? scanResult.risk_score} <span className="text-[10px] text-cyber-textMuted">/ 100</span>
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-cyber-textMuted uppercase block">ML Risk Classifier</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-fg font-bold text-sm">
                          {scanResult.ml_risk_score !== null && scanResult.ml_risk_score !== undefined
                            ? `${scanResult.ml_risk_score} `
                            : 'N/A '}
                          <span className="text-[10px] text-cyber-textMuted">/ 100</span>
                        </span>
                        {scanResult.ml_fallback_used ? (
                          <span className="px-1.5 py-0.5 text-[9px] rounded bg-warn/15 text-warn border border-warn/30 font-semibold">
                            Fallback
                          </span>
                        ) : scanResult.ml_predicted_class ? (
                          <span className={`px-1.5 py-0.5 text-[9px] rounded font-semibold border ${
                            scanResult.ml_predicted_class === 'SUSPICIOUS'
                              ? 'bg-danger/15 text-danger border-danger/30'
                              : 'bg-ok/15 text-cyber-emerald border-cyber-emerald/30'
                          }`}>
                            {scanResult.ml_predicted_class}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {/* Signals */}
                  <div className="space-y-3">
                    <div className="text-xs font-mono uppercase tracking-wider text-cyber-accent font-semibold flex items-center justify-between">
                      <span>Evaluated Signals ({scanResult.signals?.length || 0})</span>
                      <span className="text-[10px] text-cyber-textMuted font-normal">Signature Verification</span>
                    </div>

                    {scanResult.signals?.length === 0 ? (
                      <div className="p-3 rounded-lg bg-cyber-darkest text-xs font-mono text-fgSubtle">
                        No rogue mobile app or signature mismatch signals triggered.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {scanResult.signals.map((sig, idx) => (
                          <div
                            key={idx}
                            className="p-3.5 rounded-lg bg-cyber-darkest border border-cyber-border space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-mono font-bold text-fg flex items-center gap-2">
                                <AlertTriangle className="w-3.5 h-3.5 text-cyber-amber" />
                                {sig.signal_type}
                              </span>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyber-surface border border-cyber-border text-cyber-accent">
                                Impact: +{sig.score} • Conf: {(sig.confidence * 100).toFixed(0)}%
                              </span>
                            </div>
                            <p className="text-xs text-fgMuted leading-relaxed pt-1">
                              {sig.explanation}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Evidence Records */}
                  {scanResult.evidence?.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-cyber-border">
                      <div className="text-xs font-mono uppercase tracking-wider text-fg font-semibold">
                        Preserved Evidentiary Artifacts
                      </div>
                      <div className="space-y-1.5">
                        {scanResult.evidence.map((ev, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 rounded bg-cyber-surface border border-cyber-border text-xs flex items-center justify-between text-fgMuted font-mono"
                          >
                            <span>{ev.description}</span>
                            {ev.source_reference && (
                              <span className="text-[10px] text-cyber-accent truncate max-w-xs ml-2">
                                {ev.source_reference}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Persisted Notice */}
                  {scanResult.persisted && (
                    <div className="p-3 rounded-lg bg-cyber-surface border border-cyber-border flex items-center justify-between text-xs font-mono text-cyber-textMuted">
                      <span className="flex items-center gap-1.5 text-cyber-emerald">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Persisted to Central Threat Intelligence Explorer
                      </span>
                      <span>ID: {scanResult.finding?.id?.slice(0, 8)}...</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
