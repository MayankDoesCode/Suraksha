import React, { useState, useMemo } from 'react';
import {
  Download,
  FileText,
  ShieldAlert,
  ShieldCheck,
  Globe,
  Smartphone,
  Users,
  Printer,
  Activity,
  CheckCircle2,
  BarChart3,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { BrandReport } from '../components/BrandReport';
import { useApp } from '../context/AppContext';
import type { CandidateAsset, RiskLevel } from '../types';
import { FindingsTable } from '../components/FindingsTable';
import { exportCandidatesToCSV } from '../utils/csvExport';

export const ReportsView: React.FC = () => {
  const { candidates, brandProfile, setSelectedCandidateId, isDemoMode, setActiveTab } = useApp();
  const [showReport, setShowReport] = useState(false);
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<'all' | 'domain' | 'app' | 'social'>('all');
  const [visible, setVisible] = useState<CandidateAsset[]>(candidates);

  // Compute Core Metrics
  const metrics = useMemo(() => {
    const total = candidates.length;
    const critical = candidates.filter((c) => c.riskCategory === 'Critical').length;
    const high = candidates.filter((c) => c.riskCategory === 'High').length;
    const medium = candidates.filter((c) => c.riskCategory === 'Medium').length;
    const low = candidates.filter((c) => c.riskCategory === 'Low' || c.riskCategory === 'Benign').length;

    const domains = candidates.filter((c) => c.type === 'domain').length;
    const apps = candidates.filter((c) => c.type === 'app').length;
    const social = candidates.filter((c) => c.type === 'social').length;

    const confirmed = candidates.filter((c) => c.status === 'Confirmed Suspicious' || c.status === 'Resolved').length;
    const actionRequired = critical + high;

    const exposureRate = total > 0 ? Math.round((actionRequired / total) * 100) : 0;

    return {
      total,
      critical,
      high,
      medium,
      low,
      domains,
      apps,
      social,
      confirmed,
      actionRequired,
      exposureRate,
    };
  }, [candidates]);

  // Filter candidates by vector if tab selected
  const filteredCandidates = useMemo(() => {
    if (selectedTypeFilter === 'all') return candidates;
    return candidates.filter((c) => c.type === selectedTypeFilter);
  }, [candidates, selectedTypeFilter]);

  const exportable = isDemoMode ? visible : visible.filter((c) => !c.isFictionalDemo);
  const filtered = visible.length !== candidates.length;

  return (
    <div className="space-y-6">
      {/* 1. Executive Briefing Header */}
      <div className="p-5 sm:p-6 rounded-xl bg-surface border border-line flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-panel">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-accent px-2 py-0.5 rounded bg-accent/10 border border-accent/20">
              Executive Security Briefing
            </span>
            <span className="text-xs text-fgMuted">
              Protected Brand: <strong className="text-fg">{brandProfile.brandName || 'Registered Entity'}</strong>
            </span>
          </div>
          <h2 className="text-xl font-bold text-fg">Brand Defense &amp; Threat Audit Center</h2>
          <p className="text-xs text-fgMuted mt-1 max-w-2xl leading-relaxed">
            Consolidated intelligence summary across rogue lookalike domains, trojan mobile packages, and social media impersonations.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <button
            onClick={() => setShowReport(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface hover:bg-surface2 px-3 py-2 text-xs font-semibold text-fg transition-colors cursor-pointer"
            title="Generate executive presentation & printable PDF"
          >
            <Printer className="h-3.5 w-3.5 text-accent" />
            <span>Executive Dossier (PDF)</span>
          </button>
          <button
            onClick={() => exportCandidatesToCSV(visible, brandProfile.brandName, isDemoMode)}
            disabled={exportable.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-onAccent hover:bg-accentHover disabled:cursor-not-allowed disabled:opacity-40 transition-colors cursor-pointer"
            title="Download CSV manifest for SIEM / external audit"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV ({exportable.length})</span>
          </button>
        </div>
      </div>

      {/* 2. Top-Level Defense KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-xl bg-surface border border-line shadow-panel">
          <span className="text-xs font-medium text-fgSubtle block">Total Monitored Threats</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-fg">{metrics.total}</span>
            <span className="text-xs text-fgMuted font-mono">assets</span>
          </div>
          <div className="mt-2 text-[11px] text-fgMuted flex items-center gap-2">
            <span className="text-danger font-semibold">{metrics.critical} Critical</span>
            <span>·</span>
            <span className="text-high font-semibold">{metrics.high} High</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-surface border border-line shadow-panel">
          <span className="text-xs font-medium text-fgSubtle block">Critical Threat Ratio</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className={`text-2xl font-bold font-mono ${metrics.exposureRate >= 50 ? 'text-danger' : metrics.exposureRate >= 20 ? 'text-high' : 'text-ok'}`}>
              {metrics.exposureRate}%
            </span>
            <span className="text-xs text-fgMuted font-mono">active risk</span>
          </div>
          <div className="mt-2 text-[11px] text-fgMuted">
            {metrics.actionRequired} targets require urgent takedown dispatch.
          </div>
        </div>

        <div className="p-4 rounded-xl bg-surface border border-line shadow-panel">
          <span className="text-xs font-medium text-fgSubtle block">Active Vector Surface</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-fg">3</span>
            <span className="text-xs text-fgMuted font-mono">ecosystems</span>
          </div>
          <div className="mt-2 text-[11px] text-fgMuted flex items-center gap-2 font-mono">
            <span>{metrics.domains} Web</span>
            <span>·</span>
            <span>{metrics.apps} Apps</span>
            <span>·</span>
            <span>{metrics.social} Social</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-surface border border-line shadow-panel">
          <span className="text-xs font-medium text-fgSubtle block">Legal &amp; Takedown Readiness</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-ok">100%</span>
            <span className="text-xs text-fgMuted font-mono">WIPO / DMCA ready</span>
          </div>
          <div className="mt-2 text-[11px] text-fgMuted flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-ok shrink-0" />
            <span>RFC-822 evidence generated</span>
          </div>
        </div>
      </div>

      {/* 3. Threat Surface Vector Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-surface2 border border-line">
          <button
            onClick={() => setSelectedTypeFilter('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              selectedTypeFilter === 'all' ? 'bg-surface text-fg font-semibold shadow-xs' : 'text-fgMuted hover:text-fg'
            }`}
          >
            All Vectors ({metrics.total})
          </button>
          <button
            onClick={() => setSelectedTypeFilter('domain')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
              selectedTypeFilter === 'domain' ? 'bg-surface text-fg font-semibold shadow-xs' : 'text-fgMuted hover:text-fg'
            }`}
          >
            <Globe className="w-3 h-3 text-accent" />
            <span>Domains ({metrics.domains})</span>
          </button>
          <button
            onClick={() => setSelectedTypeFilter('app')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
              selectedTypeFilter === 'app' ? 'bg-surface text-fg font-semibold shadow-xs' : 'text-fgMuted hover:text-fg'
            }`}
          >
            <Smartphone className="w-3 h-3 text-high" />
            <span>Mobile Apps ({metrics.apps})</span>
          </button>
          <button
            onClick={() => setSelectedTypeFilter('social')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
              selectedTypeFilter === 'social' ? 'bg-surface text-fg font-semibold shadow-xs' : 'text-fgMuted hover:text-fg'
            }`}
          >
            <Users className="w-3 h-3 text-ok" />
            <span>Social Profiles ({metrics.social})</span>
          </button>
        </div>

        <p className="text-xs text-fgMuted">
          Showing <span className="font-semibold text-fg">{filteredCandidates.length}</span> of {candidates.length} findings
        </p>
      </div>

      {/* 4. Report Print Modal (when open) */}
      {showReport && <BrandReport onClose={() => setShowReport(false)} />}

      {/* 5. Interactive Findings Audit Table */}
      <FindingsTable
        candidates={filteredCandidates}
        onSelect={setSelectedCandidateId}
        onVisibleChange={setVisible}
        emptyMessage={
          <div className="py-8 text-center space-y-2">
            <p className="text-xs text-fgMuted">No findings match the active vector filter.</p>
            <button
              onClick={() => setActiveTab('lookalike-engine')}
              className="inline-flex items-center gap-1 text-xs text-accent font-medium hover:underline"
            >
              <span>Scan a new domain in Lookalike Engine</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        }
      />
    </div>
  );
};

export default ReportsView;
