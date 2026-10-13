import React, { useState } from 'react';
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
  Tag
} from 'lucide-react';
import api from '../api/client';

export default function SocialMonitoringView({ brands, onRefreshMetrics }) {
  const [selectedBrandId, setSelectedBrandId] = useState(brands[0]?.id || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [scanResult, setScanResult] = useState(null);

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
      setError(err.message || 'Scan evaluation failed.');
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
            <Share2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              Social Media Impersonation Watch
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyber-emerald/10 text-cyber-emerald border border-cyber-emerald/30">
                Active Engine
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
              className="bg-cyber-surface border border-cyber-border rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyber-accent"
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

      {/* Main Grid: Form on Left, Results on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Evaluation Form */}
        <div className="lg:col-span-5 cyber-panel p-6 rounded-2xl border border-cyber-border space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-cyber-border">
            <div className="text-xs font-mono uppercase tracking-wider text-white font-semibold flex items-center gap-2">
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
                + Official Asset (Exclusion)
              </button>
              <button
                type="button"
                onClick={() => loadPreset('unrelated')}
                className="px-2.5 py-1 text-[11px] rounded bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 transition-all font-mono"
              >
                + Unrelated Account
              </button>
            </div>
          </div>

          <form onSubmit={handleRunScan} className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1">
                Candidate Handle / Username *
              </label>
              <input
                type="text"
                placeholder="e.g. @acmebank_support"
                value={formData.candidate_name}
                onChange={(e) => handleInputChange('candidate_name', e.target.value)}
                className="w-full bg-cyber-darkest border border-cyber-border rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyber-accent font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1">
                Display Name
              </label>
              <input
                type="text"
                placeholder="e.g. Acme Bank Official Support"
                value={formData.display_name}
                onChange={(e) => handleInputChange('display_name', e.target.value)}
                className="w-full bg-cyber-darkest border border-cyber-border rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyber-accent"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">
                  Social Platform
                </label>
                <select
                  value={formData.platform}
                  onChange={(e) => handleInputChange('platform', e.target.value)}
                  className="w-full bg-cyber-darkest border border-cyber-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyber-accent font-mono"
                >
                  <option value="twitter">X / Twitter</option>
                  <option value="instagram">Instagram</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="facebook">Facebook</option>
                  <option value="telegram">Telegram</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">
                  Data Designation
                </label>
                <select
                  value={formData.is_sample ? 'sample' : 'live'}
                  onChange={(e) => handleInputChange('is_sample', e.target.value === 'sample')}
                  className="w-full bg-cyber-darkest border border-cyber-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyber-accent font-mono"
                >
                  <option value="sample">Sample Dataset</option>
                  <option value="live">Analyst Submitted</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1">
                Profile Source URL
              </label>
              <input
                type="url"
                placeholder="https://twitter.com/acmebank_support"
                value={formData.source_url}
                onChange={(e) => handleInputChange('source_url', e.target.value)}
                className="w-full bg-cyber-darkest border border-cyber-border rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyber-accent font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1">
                Bio Website / Destination Link
              </label>
              <input
                type="text"
                placeholder="https://unverified-login.com"
                value={formData.website_url}
                onChange={(e) => handleInputChange('website_url', e.target.value)}
                className="w-full bg-cyber-darkest border border-cyber-border rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyber-accent font-mono"
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
              className="w-full py-2.5 rounded-lg bg-cyber-accent text-cyber-darkest font-semibold text-xs tracking-wider uppercase hover:bg-cyber-accentHover transition-all shadow-glow flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Evaluating Signals...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" /> Run Deterministic Evaluation
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Column: Scan Output & Evidence */}
        <div className="lg:col-span-7 space-y-4">
          {!scanResult && !loading && (
            <div className="cyber-panel p-12 rounded-2xl border border-cyber-border text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-cyber-surface border border-cyber-border flex items-center justify-center text-cyber-textMuted mx-auto">
                <Search className="w-8 h-8" />
              </div>
              <h3 className="text-sm font-semibold text-white">
                No Candidate Evaluated Yet
              </h3>
              <p className="text-xs text-cyber-textMuted max-w-sm mx-auto leading-relaxed">
                Submit a social account handle or click a sample preset to run normalized Levenshtein similarity, trust-keyword analysis, and official asset exclusion.
              </p>
            </div>
          )}

          {scanResult && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Exclusion Outcome Banner */}
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
                        Zero threat finding persisted. Matches authorized corporate assets.
                      </div>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-cyber-darkest border border-cyber-emerald/20 text-xs font-mono text-slate-300">
                    {scanResult.exclusion_reason}
                  </div>
                </div>
              ) : (
                /* Suspicious Threat Finding Result */
                <div className="cyber-panel p-6 rounded-2xl border border-cyber-border space-y-5">
                  <div className="flex items-start justify-between pb-4 border-b border-cyber-border">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <span className="text-base font-bold text-white font-mono">
                          {scanResult.candidate_name}
                        </span>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase border ${
                            scanResult.severity === 'CRITICAL'
                              ? 'bg-rose-500/15 border-rose-500/40 text-rose-400'
                              : scanResult.severity === 'HIGH'
                              ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                              : scanResult.severity === 'MEDIUM'
                              ? 'bg-blue-500/15 border-blue-500/40 text-blue-400'
                              : 'bg-emerald-500/15 border-emerald-500/40 text-cyber-emerald'
                          }`}
                        >
                          {scanResult.severity} RISK
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyber-surface border border-cyber-border text-cyber-textMuted">
                          {scanResult.finding?.is_sample ? 'Sample Feed' : 'Analyst Submission'}
                        </span>
                      </div>
                      <p className="text-xs text-cyber-textMuted mt-1">
                        Evaluated against <span className="text-white font-medium">{selectedBrand?.name}</span>
                      </p>
                    </div>

                    <div className="text-right">
                      <div className="text-2xl font-bold font-mono text-white">
                        {scanResult.risk_score}
                        <span className="text-xs text-cyber-textMuted">/100</span>
                      </div>
                      <div className="text-[10px] font-mono text-cyber-textMuted">EXPLAINABLE SCORE</div>
                    </div>
                  </div>

                  {/* Detection Signals */}
                  <div className="space-y-3">
                    <div className="text-xs font-mono uppercase tracking-wider text-cyber-accent font-semibold flex items-center justify-between">
                      <span>Triggered Detection Signals ({scanResult.signals?.length || 0})</span>
                      <span className="text-[10px] text-cyber-textMuted font-normal">Deterministic Weights</span>
                    </div>

                    {scanResult.signals?.length === 0 ? (
                      <div className="p-3 rounded-lg bg-cyber-darkest text-xs font-mono text-slate-400">
                        No malicious or impersonation signals triggered for this candidate.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {scanResult.signals.map((sig, idx) => (
                          <div
                            key={idx}
                            className="p-3.5 rounded-lg bg-cyber-darkest border border-cyber-border space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-mono font-bold text-white flex items-center gap-2">
                                <AlertTriangle className="w-3.5 h-3.5 text-cyber-amber" />
                                {sig.signal_type}
                              </span>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyber-surface border border-cyber-border text-cyber-accent">
                                Impact: +{sig.score} • Conf: {(sig.confidence * 100).toFixed(0)}%
                              </span>
                            </div>
                            <p className="text-xs text-slate-300 leading-relaxed pt-1">
                              {sig.explanation}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Evidentiary Audit Trail */}
                  {scanResult.evidence?.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-cyber-border">
                      <div className="text-xs font-mono uppercase tracking-wider text-white font-semibold">
                        Captured Evidentiary Artifacts
                      </div>
                      <div className="space-y-1.5">
                        {scanResult.evidence.map((ev, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 rounded bg-cyber-surface border border-cyber-border text-xs flex items-center justify-between text-slate-300 font-mono"
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

                  {/* Persisted Confirmation Notice */}
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
