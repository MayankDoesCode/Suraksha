import React, { useState, useEffect } from 'react';
import {
  Share2,
  Search,
  ShieldCheck,
  AlertTriangle,
  ExternalLink,
  Plus,
  RefreshCw,
  CheckCircle2,
  FileCheck2,
  Info,
  Sliders,
  Send,
  Zap,
  Tag,
  Lock,
  Key,
  Globe,
  Radio,
  HelpCircle,
  Cpu
} from 'lucide-react';
import api from '../api/client';

export default function SocialMonitoringView({ brands, onRefreshMetrics }) {
  const [selectedBrandId, setSelectedBrandId] = useState(brands[0]?.id || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [scanResult, setScanResult] = useState(null);

  // Social Provider Diagnostics (Phase 4)
  const [providerStatuses, setProviderStatuses] = useState(null);
  const [testingTwitter, setTestingTwitter] = useState(false);
  const [twitterDiagnostic, setTwitterDiagnostic] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    candidate_name: '',
    display_name: '',
    source_url: '',
    platform: 'twitter',
    website_url: '',
    is_sample: true,
  });

  const selectedBrand = brands.find((b) => b.id === selectedBrandId) || brands[0];

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await api.getIntegrationsStatus();
        setProviderStatuses(res.providers || {});
      } catch (e) {
        // Fallback
      }
    };
    fetchStatus();
  }, []);

  const handleTestTwitter = async () => {
    setTestingTwitter(true);
    setTwitterDiagnostic(null);
    try {
      const res = await api.testIntegration('twitter_v2');
      setTwitterDiagnostic(res.diagnostic);
    } catch (err) {
      setTwitterDiagnostic({
        connected: false,
        status: 'error',
        message: err.message || 'Connection test failed',
      });
    } finally {
      setTestingTwitter(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Quick-fill sample presets
  const loadPreset = (type) => {
    if (!selectedBrand) return;
    const brandName = selectedBrand.name;
    const cleanName = brandName.toLowerCase().replace(/[^a-z0-9]/g, '');

    if (type === 'impersonator') {
      setFormData({
        candidate_name: `@${cleanName}_support`,
        display_name: `${brandName} Official Customer Helpdesk`,
        source_url: `https://twitter.com/${cleanName}_support`,
        platform: 'twitter',
        website_url: `https://${cleanName}-verify-helpdesk.com`,
        is_sample: true,
      });
    } else if (type === 'official') {
      // Pick verified official handle if present
      const officialHandle = selectedBrand.social_handles?.[0]?.handle || cleanName;
      setFormData({
        candidate_name: `@${officialHandle}`,
        display_name: brandName,
        source_url: selectedBrand.social_handles?.[0]?.url || `https://twitter.com/${officialHandle}`,
        platform: selectedBrand.social_handles?.[0]?.platform || 'twitter',
        website_url: selectedBrand.domains?.[0]?.domain ? `https://${selectedBrand.domains[0].domain}` : '',
        is_sample: false,
      });
    } else if (type === 'unrelated') {
      setFormData({
        candidate_name: '@green_garden_tips',
        display_name: 'Green Garden & Organic Farming',
        source_url: 'https://twitter.com/green_garden_tips',
        platform: 'twitter',
        website_url: 'https://greengardens.org',
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
      setError('Candidate handle or name is required.');
      return;
    }

    setLoading(true);
    setError(null);
    setScanResult(null);

    try {
      const payload = {
        ...formData,
        asset_type: 'social',
        detection_source: formData.is_sample ? 'sample_feed' : 'analyst_submission',
      };

      const res = await api.scanCandidate(selectedBrandId, payload);
      setScanResult(res.data);
      if (onRefreshMetrics) onRefreshMetrics();
    } catch (err) {
      setError(err.message || 'Candidate scan evaluation failed.');
    } finally {
      setLoading(false);
    }
  };

  const twitterStatus = providerStatuses?.twitter_v2;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Banner & Brand Selector */}
      <div className="cyber-panel p-6 rounded-2xl border border-cyber-border flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-cyber-accent/10 border border-cyber-accent/30 flex items-center justify-center text-cyber-accent shadow-glow">
            <Share2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-fg flex items-center gap-2">
              Social Media Impersonation Watch
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyber-emerald/10 text-cyber-emerald border border-cyber-emerald/30">
                Phase 4: Provider Integration
              </span>
            </h2>
            <p className="text-xs text-cyber-textMuted mt-0.5">
              Deterministic signal analysis for rogue customer support, bio cloning, and impersonation handles.
            </p>
          </div>
        </div>

        {/* Brand Selector */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-cyber-textMuted whitespace-nowrap">Target Brand:</span>
          {brands.length === 0 ? (
            <span className="text-xs text-cyber-rose">No brands registered. Register a brand first.</span>
          ) : (
            <select
              value={selectedBrandId}
              onChange={(e) => setSelectedBrandId(e.target.value)}
              className="bg-cyber-surface border border-cyber-border rounded-lg px-3 py-2 text-xs font-mono text-fg focus:outline-none focus:border-cyber-accent"
            >
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.social_handles?.length || 0} official handles)
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* PHASE 4: LIVE SOCIAL PROVIDER INTEGRATION STATUS */}
      <div className="cyber-panel p-6 rounded-2xl border border-cyber-border space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-cyber-border">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-cyber-accent" />
            <span className="text-xs font-mono uppercase tracking-wider text-fg font-semibold">
              Live Social Provider Status & Policy Compliance
            </span>
          </div>
          <span className="text-[10px] font-mono text-cyber-textMuted">Zero-Scraping Guarantee</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Twitter / X API v2 */}
          <div className="p-4 rounded-xl bg-cyber-darkest border border-cyber-border space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs font-bold font-mono text-fg flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-accent" /> Twitter / X API v2
                </div>
                <div className="text-[11px] text-cyber-textMuted font-mono mt-0.5">
                  Official OAuth 2.0 Bearer Token Access
                </div>
              </div>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase border ${
                twitterStatus?.configured
                  ? 'bg-cyber-emerald/15 border-cyber-emerald/40 text-cyber-emerald'
                  : 'bg-cyber-amber/15 border-cyber-amber/40 text-cyber-amber'
              }`}>
                {twitterStatus?.configured ? 'CONFIGURED' : 'NOT CONFIGURED'}
              </span>
            </div>

            <p className="text-xs text-fgMuted leading-relaxed font-mono text-[11px]">
              {twitterStatus?.configured
                ? 'Valid X_BEARER_TOKEN detected in environment. Authorized to query official v2 recent tweets and users.'
                : 'SURAKSHA strictly enforces platform terms of service. Real social monitoring requires an authorized Twitter Developer Portal App with OAuth 2.0 Bearer Token. Scraping protected pages or bypassing access restrictions is blocked.'}
            </p>

            <div className="p-2.5 rounded bg-cyber-surface/60 border border-cyber-border/70 text-[11px] font-mono space-y-1">
              <div className="text-cyber-textMuted flex items-center gap-1.5">
                <Key className="w-3 h-3 text-cyber-accent" /> Required Environment Variable:
              </div>
              <code className="text-cyber-accent font-semibold">X_BEARER_TOKEN</code>
            </div>

            <div className="flex items-center justify-between pt-1">
              <a
                href="https://developer.x.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-cyber-accent hover:underline flex items-center gap-1 font-mono"
              >
                <ExternalLink className="w-3 h-3" /> developer.x.com portal
              </a>

              <button
                onClick={handleTestTwitter}
                disabled={testingTwitter}
                className="px-3 py-1 text-[11px] rounded bg-cyber-surface hover:bg-surface3 border border-cyber-border text-fg font-mono flex items-center gap-1.5 transition-all"
              >
                {testingTwitter ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Radio className="w-3 h-3" />}
                Test Connectivity
              </button>
            </div>

            {twitterDiagnostic && (
              <div className={`p-2.5 rounded border text-xs font-mono mt-2 ${
                twitterDiagnostic.connected
                  ? 'bg-cyber-emerald/10 border-cyber-emerald/30 text-cyber-emerald'
                  : 'bg-cyber-amber/10 border-cyber-amber/30 text-cyber-amber'
              }`}>
                {twitterDiagnostic.message}
              </div>
            )}
          </div>

          {/* Reddit / Alternative Social Platforms */}
          <div className="p-4 rounded-xl bg-cyber-darkest border border-cyber-border space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs font-bold font-mono text-fg flex items-center gap-2">
                  <Globe className="w-4 h-4 text-high" /> Reddit API Platform
                </div>
                <div className="text-[11px] text-cyber-textMuted font-mono mt-0.5">
                  Official Script App OAuth Credentials
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase border bg-surface3 border-line text-fgSubtle">
                PLANNED EXTENSION
              </span>
            </div>

            <p className="text-xs text-fgMuted leading-relaxed font-mono text-[11px]">
              Requires verified Reddit Developer account and registered Script application at reddit.com/prefs/apps.
              Unauthenticated scraping is prohibited by Reddit robots.txt and user-agent policy.
            </p>

            <div className="p-2.5 rounded bg-cyber-surface/60 border border-cyber-border/70 text-[11px] font-mono space-y-1">
              <div className="text-cyber-textMuted flex items-center gap-1.5">
                <Key className="w-3 h-3 text-cyber-accent" /> Required Environment Variables:
              </div>
              <code className="text-fgSubtle">REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET</code>
            </div>

            <div className="pt-1">
              <span className="text-[11px] font-mono text-cyber-textMuted">
                Active provider for live data in Phase 4: Apple App Store (iTunes API).
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Form on Left, Results on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Evaluation Form */}
        <div className="lg:col-span-5 cyber-panel p-6 rounded-2xl border border-cyber-border space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-cyber-border">
            <div className="text-xs font-mono uppercase tracking-wider text-fg font-semibold flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyber-accent" /> Candidate Ingestion Form
            </div>
            <span className="text-[10px] font-mono text-cyber-textMuted">Analyst / Sample Feed</span>
          </div>

          {/* Quick Presets */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono text-cyber-textMuted flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-cyber-amber" /> Load Realistic Presets:
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => loadPreset('impersonator')}
                className="px-2.5 py-1 text-[11px] rounded bg-cyber-rose/10 border border-cyber-rose/30 text-cyber-rose hover:bg-cyber-rose/20 transition-all font-mono"
              >
                + Fake Support Account
              </button>
              <button
                type="button"
                onClick={() => loadPreset('official')}
                className="px-2.5 py-1 text-[11px] rounded bg-cyber-emerald/10 border border-cyber-emerald/30 text-cyber-emerald hover:bg-cyber-emerald/20 transition-all font-mono"
              >
                + Official Handle (Exclusion)
              </button>
              <button
                type="button"
                onClick={() => loadPreset('unrelated')}
                className="px-2.5 py-1 text-[11px] rounded bg-surface3 border border-line text-fgMuted hover:bg-surface3 transition-all font-mono"
              >
                + Unrelated Handle
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleRunScan} className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-fgMuted mb-1">
                Candidate Handle / Username *
              </label>
              <input
                type="text"
                placeholder="e.g. @acmebank_support"
                value={formData.candidate_name}
                onChange={(e) => handleInputChange('candidate_name', e.target.value)}
                className="w-full bg-cyber-darkest border border-cyber-border rounded-lg px-3 py-2 text-xs text-fg placeholder-slate-600 focus:outline-none focus:border-cyber-accent font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-fgMuted mb-1">
                Display Name
              </label>
              <input
                type="text"
                placeholder="e.g. Acme Bank Official Customer Helpdesk"
                value={formData.display_name}
                onChange={(e) => handleInputChange('display_name', e.target.value)}
                className="w-full bg-cyber-darkest border border-cyber-border rounded-lg px-3 py-2 text-xs text-fg placeholder-slate-600 focus:outline-none focus:border-cyber-accent font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-mono text-fgMuted mb-1">
                  Social Platform
                </label>
                <select
                  value={formData.platform}
                  onChange={(e) => handleInputChange('platform', e.target.value)}
                  className="w-full bg-cyber-darkest border border-cyber-border rounded-lg px-3 py-2 text-xs text-fg focus:outline-none focus:border-cyber-accent font-mono"
                >
                  <option value="twitter">Twitter / X</option>
                  <option value="instagram">Instagram</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="facebook">Facebook</option>
                  <option value="youtube">YouTube</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono text-fgMuted mb-1">
                  Data Feed Tag
                </label>
                <select
                  value={formData.is_sample ? 'sample' : 'analyst'}
                  onChange={(e) => handleInputChange('is_sample', e.target.value === 'sample')}
                  className="w-full bg-cyber-darkest border border-cyber-border rounded-lg px-3 py-2 text-xs text-fg focus:outline-none focus:border-cyber-accent font-mono"
                >
                  <option value="sample">Sample Feed</option>
                  <option value="analyst">Analyst Submission</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-fgMuted mb-1">
                Profile URL
              </label>
              <input
                type="url"
                placeholder="https://twitter.com/acmebank_support"
                value={formData.source_url}
                onChange={(e) => handleInputChange('source_url', e.target.value)}
                className="w-full bg-cyber-darkest border border-cyber-border rounded-lg px-3 py-2 text-xs text-fg placeholder-slate-600 focus:outline-none focus:border-cyber-accent font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-fgMuted mb-1">
                External Website / Link in Bio
              </label>
              <input
                type="text"
                placeholder="e.g. acmebank-verify-login.xyz"
                value={formData.website_url}
                onChange={(e) => handleInputChange('website_url', e.target.value)}
                className="w-full bg-cyber-darkest border border-cyber-border rounded-lg px-3 py-2 text-xs text-fg placeholder-slate-600 focus:outline-none focus:border-cyber-accent font-mono"
              />
              <span className="text-[10px] text-cyber-textMuted font-mono">
                Compared against verified brand official domain whitelist.
              </span>
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
                  <RefreshCw className="w-4 h-4 animate-spin" /> Running Detection Engine...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" /> Evaluate Candidate Profile
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Column: Detection Breakdown & Results */}
        <div className="lg:col-span-7 space-y-4">
          {!scanResult && !loading && (
            <div className="cyber-panel p-12 rounded-2xl border border-cyber-border text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-cyber-surface border border-cyber-border flex items-center justify-center text-cyber-textMuted mx-auto">
                <Search className="w-8 h-8" />
              </div>
              <h3 className="text-sm font-semibold text-fg">
                No Social Candidate Evaluated Yet
              </h3>
              <p className="text-xs text-cyber-textMuted max-w-sm mx-auto leading-relaxed">
                Enter a candidate social handle to compute deterministic similarity scores and verify verified brand exclusions.
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
                        OFFICIAL BRAND ASSET CONFIRMED — EXCLUDED
                      </div>
                      <div className="text-xs text-cyber-textMuted">
                        Candidate matches verified brand whitelist. Zero threat record persisted.
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
                      <span className="text-[10px] text-cyber-textMuted font-normal">Deterministic Engine</span>
                    </div>

                    {scanResult.signals?.length === 0 ? (
                      <div className="p-3 rounded-lg bg-cyber-darkest text-xs font-mono text-fgSubtle">
                        No suspicious impersonation signals triggered for this profile.
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
