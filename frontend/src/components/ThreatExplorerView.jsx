import React, { useState, useEffect, useCallback } from 'react';
import {
  Crosshair,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Eye,
  X,
  Share2,
  Smartphone,
  Globe,
  SlidersHorizontal,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import api from '../api/client';

export default function ThreatExplorerView({ brands, onRefreshMetrics }) {
  const [findings, setFindings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedAssetType, setSelectedAssetType] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [provenanceFilter, setProvenanceFilter] = useState('all');

  // Drawer
  const [activeFinding, setActiveFinding] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  const fetchFindings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.listFindings({
        search,
        brandId: selectedBrand,
        assetType: selectedAssetType,
        severity: selectedSeverity,
        reviewStatus: selectedStatus,
        perPage: 100,
      });
      setFindings(res.data || []);
    } catch (err) {
      setError(err.message || 'Unable to load threat intelligence findings.');
    } finally {
      setLoading(false);
    }
  }, [search, selectedBrand, selectedAssetType, selectedSeverity, selectedStatus]);

  useEffect(() => {
    fetchFindings();
  }, [fetchFindings]);

  // Handle Review Status Action
  const handleUpdateStatus = async (findingId, newStatus) => {
    setUpdatingStatus(true);
    setStatusMessage(null);
    try {
      const res = await api.updateFindingStatus(findingId, newStatus);
      setStatusMessage(`Status updated to ${newStatus.replace('_', ' ')}`);

      // Update in local findings list
      setFindings((prev) =>
        prev.map((f) => (f.id === findingId ? { ...f, ...res.data } : f))
      );

      // Update active drawer finding
      if (activeFinding?.id === findingId) {
        setActiveFinding((prev) => ({ ...prev, ...res.data }));
      }

      if (onRefreshMetrics) onRefreshMetrics();
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err) {
      setStatusMessage(`Failed to update status: ${err.message}`);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-rose-500/15 border-rose-500/40 text-rose-400';
      case 'HIGH':
        return 'bg-amber-500/15 border-amber-500/40 text-amber-400';
      case 'MEDIUM':
        return 'bg-blue-500/15 border-blue-500/40 text-blue-400';
      default:
        return 'bg-emerald-500/15 border-emerald-500/40 text-cyber-emerald';
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'CONFIRMED_THREAT':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      case 'UNDER_INVESTIGATION':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'FALSE_POSITIVE':
        return 'bg-slate-700/50 text-slate-300 border-slate-600';
      case 'RESOLVED':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'NEW':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      default:
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
    }
  };

  const getAssetIcon = (assetType) => {
    switch (assetType) {
      case 'mobile_app':
        return <Smartphone className="w-4 h-4 text-cyber-accent" />;
      case 'domain':
        return <Globe className="w-4 h-4 text-cyber-accent" />;
      default:
        return <Share2 className="w-4 h-4 text-cyber-accent" />;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="cyber-panel p-6 rounded-2xl border border-cyber-border flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-cyber-accent/10 border border-cyber-accent/30 flex items-center justify-center text-cyber-accent shadow-glow">
            <Crosshair className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              Threat Intelligence Explorer
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyber-emerald/10 text-cyber-emerald border border-cyber-emerald/30">
                Live Repository ({findings.length})
              </span>
            </h2>
            <p className="text-xs text-cyber-textMuted mt-0.5">
              Filterable central findings database with explainable mathematical scores, evidence packets, and triage review lifecycles.
            </p>
          </div>
        </div>

        <button
          onClick={fetchFindings}
          disabled={loading}
          className="px-3.5 py-2 rounded-lg bg-cyber-surface border border-cyber-border text-xs font-mono text-white hover:border-cyber-accent transition-all flex items-center gap-2"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Feed
        </button>
      </div>

      {/* Filter Bar */}
      <div className="cyber-panel p-4 rounded-xl border border-cyber-border space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search */}
          <div className="md:col-span-4 relative">
            <Search className="w-4 h-4 text-cyber-textMuted absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search candidate name, URL, or handle..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-cyber-darkest border border-cyber-border rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyber-accent font-mono"
            />
          </div>

          {/* Brand Filter */}
          <div className="md:col-span-2">
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="w-full bg-cyber-darkest border border-cyber-border rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-cyber-accent font-mono"
            >
              <option value="">All Brands</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Asset Type */}
          <div className="md:col-span-2">
            <select
              value={selectedAssetType}
              onChange={(e) => setSelectedAssetType(e.target.value)}
              className="w-full bg-cyber-darkest border border-cyber-border rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-cyber-accent font-mono"
            >
              <option value="">All Asset Types</option>
              <option value="social">Social Media</option>
              <option value="mobile_app">Mobile App</option>
              <option value="domain">Domain / URL</option>
            </select>
          </div>

          {/* Severity */}
          <div className="md:col-span-2">
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="w-full bg-cyber-darkest border border-cyber-border rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-cyber-accent font-mono"
            >
              <option value="">All Severities</option>
              <option value="CRITICAL">Critical (&gt;=80)</option>
              <option value="HIGH">High (50-79)</option>
              <option value="MEDIUM">Medium (25-49)</option>
              <option value="LOW">Low (&lt;25)</option>
            </select>
          </div>

          {/* Review Status */}
          <div className="md:col-span-2">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-cyber-darkest border border-cyber-border rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-cyber-accent font-mono"
            >
              <option value="">All Review Statuses</option>
              <option value="NEW">New (Unreviewed)</option>
              <option value="UNDER_INVESTIGATION">Under Investigation</option>
              <option value="CONFIRMED_THREAT">Confirmed Threat</option>
              <option value="FALSE_POSITIVE">False Positive</option>
              <option value="RESOLVED">Resolved / Taken Down</option>
            </select>
          </div>
        </div>

        {/* Provenance Filter Tabs */}
        <div className="flex items-center gap-2 pt-2 border-t border-cyber-border/40 text-xs font-mono">
          <span className="text-cyber-textMuted text-[11px]">Provenance:</span>
          <button
            onClick={() => setProvenanceFilter('all')}
            className={`px-2.5 py-1 rounded text-[11px] transition-all ${
              provenanceFilter === 'all'
                ? 'bg-cyber-accent/20 text-cyber-accent border border-cyber-accent/40 font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All Feeds ({findings.length})
          </button>
          <button
            onClick={() => setProvenanceFilter('live')}
            className={`px-2.5 py-1 rounded text-[11px] transition-all flex items-center gap-1.5 ${
              provenanceFilter === 'live'
                ? 'bg-cyber-emerald/20 text-cyber-emerald border border-cyber-emerald/40 font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-cyber-emerald" />
            Live External Providers ({findings.filter((f) => !f.is_sample).length})
          </button>
          <button
            onClick={() => setProvenanceFilter('sample')}
            className={`px-2.5 py-1 rounded text-[11px] transition-all ${
              provenanceFilter === 'sample'
                ? 'bg-slate-700 text-slate-200 border border-slate-600 font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Sample / Manual Feeds ({findings.filter((f) => f.is_sample).length})
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="cyber-panel rounded-2xl border border-cyber-border overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-xs font-mono text-cyber-textMuted flex items-center justify-center gap-3">
            <RefreshCw className="w-5 h-5 animate-spin text-cyber-accent" />
            <span>Loading active findings from database...</span>
          </div>
        ) : findings.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <ShieldCheck className="w-12 h-12 text-cyber-accent/50 mx-auto" />
            <h3 className="text-sm font-semibold text-white">No Threat Findings Observed</h3>
            <p className="text-xs text-cyber-textMuted max-w-sm mx-auto">
              No matching records found. Use the Social Impersonation Watch or Mobile App Guard modules to evaluate candidates.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-cyber-border bg-cyber-surface/50 text-[10px] font-mono text-cyber-textMuted uppercase tracking-wider">
                  <th className="py-3 px-4">Candidate Asset</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Risk Score</th>
                  <th className="py-3 px-4">Top Detection Signal</th>
                  <th className="py-3 px-4">Designation</th>
                  <th className="py-3 px-4">Review Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cyber-border/60 text-xs">
                {findings
                  .filter((f) => {
                    if (provenanceFilter === 'live') return !f.is_sample;
                    if (provenanceFilter === 'sample') return Boolean(f.is_sample);
                    return true;
                  })
                  .map((f) => (
                  <tr
                    key={f.id}
                    onClick={() => setActiveFinding(f)}
                    className="hover:bg-cyber-surface/30 cursor-pointer transition-colors group"
                  >
                    {/* Candidate */}
                    <td className="py-3.5 px-4">
                      <div className="font-mono font-medium text-white group-hover:text-cyber-accent transition-colors">
                        {f.candidate_name}
                      </div>
                      {f.source_url && (
                        <div className="text-[11px] font-mono text-cyber-textMuted truncate max-w-xs flex items-center gap-1">
                          <ExternalLink className="w-2.5 h-2.5 inline" /> {f.source_url}
                        </div>
                      )}
                    </td>

                    {/* Asset Type */}
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-slate-300">
                        {getAssetIcon(f.asset_type)}
                        {f.asset_type === 'mobile_app' ? 'App' : f.asset_type}
                      </span>
                    </td>

                    {/* Score & Severity */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-white text-sm">
                          {f.risk_score}
                        </span>
                        <span
                          className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded uppercase border ${getSeverityBadge(
                            f.severity
                          )}`}
                        >
                          {f.severity}
                        </span>
                      </div>
                    </td>

                    {/* Top Signal */}
                    <td className="py-3.5 px-4">
                      <div className="text-[11px] text-slate-300 font-mono truncate max-w-xs">
                        {f.signals?.[0]?.explanation || 'No signals recorded'}
                      </div>
                    </td>

                    {/* Designation */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {!f.is_sample ? (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyber-emerald/15 border border-cyber-emerald/30 text-cyber-emerald font-semibold">
                          {f.detection_source === 'itunes_app_store' ? 'Apple Store' : f.detection_source || 'Live Feed'}
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyber-darkest border border-cyber-border text-slate-400">
                          Sample
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border uppercase ${getStatusBadge(
                          f.review_status
                        )}`}
                      >
                        {f.review_status === 'NEW' ? 'Needs Review' : f.review_status.replace('_', ' ')}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveFinding(f);
                        }}
                        className="px-2.5 py-1 rounded bg-cyber-surface border border-cyber-border text-[11px] font-mono text-white hover:border-cyber-accent hover:text-cyber-accent transition-all inline-flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" /> Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Slide-out Finding Detail Drawer */}
      {activeFinding && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-cyber-dark border-l border-cyber-border h-full flex flex-col justify-between shadow-2xl p-6 overflow-y-auto space-y-6">
            <div className="space-y-6">
              {/* Drawer Header */}
              <div className="flex items-start justify-between pb-4 border-b border-cyber-border">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase border ${getSeverityBadge(
                        activeFinding.severity
                      )}`}
                    >
                      {activeFinding.severity}
                    </span>
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase border ${getStatusBadge(
                        activeFinding.review_status
                      )}`}
                    >
                      {activeFinding.review_status === 'NEW' ? 'Needs Review (Unverified)' : activeFinding.review_status.replace('_', ' ')}
                    </span>
                    {!activeFinding.is_sample ? (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyber-emerald/15 border border-cyber-emerald/30 text-cyber-emerald font-semibold">
                        {activeFinding.detection_source === 'itunes_app_store' ? 'Apple App Store (Live)' : activeFinding.detection_source || 'Live Feed'}
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyber-surface border border-cyber-border text-slate-400">
                        Sample Feed
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-white font-mono mt-2 flex items-center gap-2">
                    {getAssetIcon(activeFinding.asset_type)}
                    {activeFinding.candidate_name}
                  </h3>
                  {activeFinding.source_url && (
                    <a
                      href={activeFinding.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-mono text-cyber-accent hover:underline flex items-center gap-1 mt-1 truncate max-w-md"
                    >
                      <ExternalLink className="w-3 h-3" /> {activeFinding.source_url}
                    </a>
                  )}
                </div>

                <button
                  onClick={() => setActiveFinding(null)}
                  className="p-1.5 rounded-lg bg-cyber-surface border border-cyber-border text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status Message Feedback */}
              {statusMessage && (
                <div className="p-3 rounded-lg bg-cyber-surface border border-cyber-accent text-xs font-mono text-cyber-accent">
                  {statusMessage}
                </div>
              )}

              {/* Mathematical Score Metric */}
              <div className="cyber-panel p-4 rounded-xl border border-cyber-border flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-mono uppercase text-cyber-textMuted">
                    Aggregate Explainable Risk Score
                  </div>
                  <div className="text-2xl font-bold font-mono text-white mt-1">
                    {activeFinding.risk_score} <span className="text-xs text-cyber-textMuted">/ 100</span>
                  </div>
                </div>

                <div className="text-right text-xs font-mono text-cyber-textMuted space-y-1">
                  <div>Observed: {activeFinding.observed_at?.split('T')[0] || 'Today'}</div>
                  <div>Source: {activeFinding.detection_source}</div>
                </div>
              </div>

              {/* Triage Advisory Notice */}
              <div className={`p-3 rounded-xl border text-xs font-mono flex items-start gap-2.5 ${
                activeFinding.review_status === 'CONFIRMED_THREAT'
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  : activeFinding.review_status === 'FALSE_POSITIVE'
                  ? 'bg-slate-800 border-slate-700 text-slate-300'
                  : activeFinding.review_status === 'RESOLVED'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-cyber-emerald'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              }`}>
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold uppercase tracking-wider text-[11px]">
                    {activeFinding.review_status === 'CONFIRMED_THREAT'
                      ? 'Analyst Confirmed Threat'
                      : activeFinding.review_status === 'FALSE_POSITIVE'
                      ? 'Marked as False Positive'
                      : activeFinding.review_status === 'RESOLVED'
                      ? 'Threat Resolved / Takedown Complete'
                      : 'Potential Risk / Needs Review'}
                  </div>
                  <div className="text-[11px] text-slate-300 mt-0.5 leading-relaxed font-sans">
                    {activeFinding.review_status === 'CONFIRMED_THREAT'
                      ? 'This finding has been reviewed and verified as an active malicious impersonation attempt by a security analyst.'
                      : activeFinding.review_status === 'NEW'
                      ? 'This candidate was flagged by algorithmic heuristics and is pending human analyst review. It is NOT automatically treated as a confirmed malicious threat.'
                      : 'Current review status designated during active analyst investigation.'}
                  </div>
                </div>
              </div>

              {/* Triage Actions Button Group */}
              <div className="space-y-2">
                <div className="text-xs font-mono uppercase tracking-wider text-white font-semibold">
                  Triage Review Status Actions
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <button
                    disabled={updatingStatus || activeFinding.review_status === 'UNDER_INVESTIGATION'}
                    onClick={() => handleUpdateStatus(activeFinding.id, 'UNDER_INVESTIGATION')}
                    className="py-2 px-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono font-medium hover:bg-amber-500/20 disabled:opacity-40 transition-all text-center"
                  >
                    Investigate
                  </button>

                  <button
                    disabled={updatingStatus || activeFinding.review_status === 'CONFIRMED_THREAT'}
                    onClick={() => handleUpdateStatus(activeFinding.id, 'CONFIRMED_THREAT')}
                    className="py-2 px-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono font-medium hover:bg-rose-500/20 disabled:opacity-40 transition-all text-center"
                  >
                    Confirm Threat
                  </button>

                  <button
                    disabled={updatingStatus || activeFinding.review_status === 'FALSE_POSITIVE'}
                    onClick={() => handleUpdateStatus(activeFinding.id, 'FALSE_POSITIVE')}
                    className="py-2 px-3 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-xs font-mono font-medium hover:bg-slate-700 disabled:opacity-40 transition-all text-center"
                  >
                    False Positive
                  </button>

                  <button
                    disabled={updatingStatus || activeFinding.review_status === 'RESOLVED'}
                    onClick={() => handleUpdateStatus(activeFinding.id, 'RESOLVED')}
                    className="py-2 px-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-cyber-emerald text-xs font-mono font-medium hover:bg-emerald-500/20 disabled:opacity-40 transition-all text-center"
                  >
                    Resolve
                  </button>
                </div>
              </div>

              {/* Triggered Detection Signals */}
              <div className="space-y-3">
                <div className="text-xs font-mono uppercase tracking-wider text-cyber-accent font-semibold">
                  Detailed Detection Signals ({activeFinding.signals?.length || 0})
                </div>
                <div className="space-y-2">
                  {activeFinding.signals?.map((sig, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-lg bg-cyber-darkest border border-cyber-border space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-cyber-amber" />
                          {sig.signal_type}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyber-surface border border-cyber-border text-cyber-accent">
                          Score: +{sig.score} • Conf: {(sig.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed font-sans">
                        {sig.explanation}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Evidentiary Records */}
              <div className="space-y-3">
                <div className="text-xs font-mono uppercase tracking-wider text-white font-semibold">
                  Evidence Records & Captured Artifacts
                </div>
                {activeFinding.evidence?.length === 0 ? (
                  <div className="p-3 rounded-lg bg-cyber-darkest text-xs font-mono text-slate-400">
                    No artifacts attached to this finding.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {activeFinding.evidence?.map((ev, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg bg-cyber-darkest border border-cyber-border text-xs font-mono space-y-1"
                      >
                        <div className="text-cyber-accent font-semibold">{ev.evidence_type}</div>
                        <div className="text-slate-300 font-sans">{ev.description}</div>
                        {ev.source_reference && (
                          <div className="text-[10px] text-cyber-textMuted truncate pt-1">
                            Ref: {ev.source_reference}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="pt-4 border-t border-cyber-border flex items-center justify-between text-xs font-mono text-cyber-textMuted">
              <span>Finding UUID: {activeFinding.id}</span>
              <button
                onClick={() => setActiveFinding(null)}
                className="text-xs font-mono text-cyber-accent hover:underline"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
