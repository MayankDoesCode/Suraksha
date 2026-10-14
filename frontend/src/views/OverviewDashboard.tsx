import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { RiskBadge } from '../components/RiskBadge';
import { StatusBadge } from '../components/StatusBadge';
import { exportCandidatesToCSV } from '../utils/csvExport';
import {
  ShieldAlert,
  AlertTriangle,
  FolderSearch,
  Activity,
  ArrowUpRight,
  Filter,
  Search,
  Share2,
  Smartphone,
  Globe,
  Sparkles,
  Shield,
  ShieldCheck,
  TrendingUp,
  Clock,
  Radio,
  FileSpreadsheet,
  Network,
  Cpu,
  Layers,
  CheckCircle2,
  Calendar,
  AlertCircle,
  BarChart3,
  SlidersHorizontal,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';
import type { RiskLevel, InvestigationStatus, AssetType } from '../types';

export const OverviewDashboard: React.FC = () => {
  const {
    candidates,
    brandProfile,
    stats,
    setActiveTab,
    setSelectedCandidateId,
    backendOnline,
    selectedBackendBrandId,
    threatNodes,
    threatEdges,
  } = useApp();

  // Multi-dimensional filters and search
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterSource, setFilterSource] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortOption, setSortOption] = useState<'severity-desc' | 'date-desc' | 'date-asc' | 'title-asc'>('severity-desc');

  // Total monitored assets from verified profile
  const totalMonitoredAssets =
    (brandProfile.officialDomains?.length || 0) +
    (brandProfile.officialSocialUrls?.length || 0) +
    (brandProfile.officialApps?.length || 0);

  // Active unmitigated candidates (Dismissed / Allowlisted do not contribute to risk)
  const activeCandidates = useMemo(
    () => candidates.filter((c) => c.status !== 'Dismissed'),
    [candidates]
  );

  const criticalCount = useMemo(
    () => activeCandidates.filter((c) => c.riskCategory === 'Critical').length,
    [activeCandidates]
  );
  const highCount = useMemo(
    () => activeCandidates.filter((c) => c.riskCategory === 'High').length,
    [activeCandidates]
  );
  const mediumCount = useMemo(
    () => activeCandidates.filter((c) => c.riskCategory === 'Medium').length,
    [activeCandidates]
  );
  const lowCount = useMemo(
    () => activeCandidates.filter((c) => c.riskCategory === 'Low').length,
    [activeCandidates]
  );

  // Transparent mathematical risk posture score:
  // Critical=35, High=20, Medium=8, Low=2, bounded to [0, 100]
  const calculatedRiskScore = useMemo(() => {
    if (activeCandidates.length === 0) return 0;
    const weightedSum = criticalCount * 35 + highCount * 20 + mediumCount * 8 + lowCount * 2;
    return Math.min(100, Math.max(0, weightedSum));
  }, [activeCandidates.length, criticalCount, highCount, mediumCount, lowCount]);

  // Risk posture classification with disciplined enterprise colors
  const postureMeta = useMemo(() => {
    if (calculatedRiskScore >= 70) {
      return {
        label: 'CRITICAL RISK EXPOSURE',
        color: '#EF4444',
        badgeBg: 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/30',
        summary: 'Immediate active brand impersonation and rogue assets detected requiring urgent containment.',
        icon: ShieldAlert,
      };
    }
    if (calculatedRiskScore >= 40) {
      return {
        label: 'ELEVATED RISK POSTURE',
        color: '#F97316',
        badgeBg: 'bg-[#F97316]/10 text-[#F97316] border-[#F97316]/30',
        summary: 'Multiple high-risk candidates observed. Active analyst triage and verification recommended.',
        icon: AlertTriangle,
      };
    }
    if (calculatedRiskScore >= 15) {
      return {
        label: 'MODERATE RISK POSTURE',
        color: '#F59E0B',
        badgeBg: 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30',
        summary: 'Candidate lookalike signals detected. Standard continuous surveillance active.',
        icon: AlertCircle,
      };
    }
    return {
      label: 'RESILIENT / OPTIMAL POSTURE',
      color: '#10B981',
      badgeBg: 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30',
      summary: 'No active malicious brand threats detected. All screened entities allowlisted or benign.',
      icon: ShieldCheck,
    };
  }, [calculatedRiskScore]);

  // Detection source distribution
  const sourceStats = useMemo(() => {
    const total = candidates.length || 1;
    const domain = candidates.filter((c) => c.type === 'domain').length;
    const social = candidates.filter((c) => c.type === 'social').length;
    const app = candidates.filter((c) => c.type === 'app').length;
    return {
      domain,
      domainPct: Math.round((domain / total) * 100),
      social,
      socialPct: Math.round((social / total) * 100),
      app,
      appPct: Math.round((app / total) * 100),
    };
  }, [candidates]);

  // Severity distribution across all candidates
  const severityStats = useMemo(() => {
    const total = candidates.length || 1;
    const crit = candidates.filter((c) => c.riskCategory === 'Critical').length;
    const high = candidates.filter((c) => c.riskCategory === 'High').length;
    const med = candidates.filter((c) => c.riskCategory === 'Medium').length;
    const low = candidates.filter((c) => c.riskCategory === 'Low').length;
    return {
      crit,
      critPct: Math.round((crit / total) * 100),
      high,
      highPct: Math.round((high / total) * 100),
      med,
      medPct: Math.round((med / total) * 100),
      low,
      lowPct: Math.round((low / total) * 100),
    };
  }, [candidates]);

  // Filtering and sorting the candidates table
  const filteredCandidates = useMemo(() => {
    return candidates
      .filter((c) => {
        const matchesSeverity =
          filterSeverity === 'all' || c.riskCategory.toLowerCase() === filterSeverity.toLowerCase();
        const matchesSource =
          filterSource === 'all' || c.type.toLowerCase() === filterSource.toLowerCase();
        const matchesStatus =
          filterStatus === 'all' || c.status.toLowerCase() === filterStatus.toLowerCase();

        const q = searchQuery.toLowerCase().trim();
        const matchesSearch =
          !q ||
          c.title.toLowerCase().includes(q) ||
          c.identifier.toLowerCase().includes(q) ||
          c.platform.toLowerCase().includes(q) ||
          (c.evidence && c.evidence.toLowerCase().includes(q)) ||
          (c.tags && c.tags.some((t) => t.toLowerCase().includes(q)));

        return matchesSeverity && matchesSource && matchesStatus && matchesSearch;
      })
      .sort((a, b) => {
        if (sortOption === 'severity-desc') {
          const weight: Record<RiskLevel, number> = {
            Critical: 4,
            High: 3,
            Medium: 2,
            Low: 1,
          };
          return (weight[b.riskCategory] || 0) - (weight[a.riskCategory] || 0);
        }
        if (sortOption === 'date-desc') {
          return new Date(b.createdDate || 0).getTime() - new Date(a.createdDate || 0).getTime();
        }
        if (sortOption === 'date-asc') {
          return new Date(a.createdDate || 0).getTime() - new Date(b.createdDate || 0).getTime();
        }
        if (sortOption === 'title-asc') {
          return a.title.localeCompare(b.title);
        }
        return 0;
      });
  }, [candidates, filterSeverity, filterSource, filterStatus, searchQuery, sortOption]);

  const getSourceIcon = (type: AssetType) => {
    switch (type) {
      case 'app':
        return <Smartphone className="w-3.5 h-3.5 text-[#45C8E8]" />;
      case 'domain':
        return <Globe className="w-3.5 h-3.5 text-[#9B8AFB]" />;
      case 'social':
      default:
        return <Share2 className="w-3.5 h-3.5 text-[#45C8E8]" />;
    }
  };

  const getSourceLabel = (type: AssetType) => {
    switch (type) {
      case 'app':
        return 'Mobile App';
      case 'domain':
        return 'Domain / DNS';
      case 'social':
      default:
        return 'Social Profile';
    }
  };

  const getEngineBadge = (candidate: (typeof candidates)[0]) => {
    const engine = candidate.analysisEngine || '';
    if (engine.toLowerCase().includes('allowlist') || candidate.scenarioType === 'official') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-mono text-[#10B981] bg-[#10B981]/10 border border-[#10B981]/30 px-1.5 py-0.5 rounded">
          <ShieldCheck className="w-2.5 h-2.5" />
          <span>Rule: Allowlist</span>
        </span>
      );
    }
    if (engine.toLowerCase().includes('gemini') || engine.toLowerCase().includes('ml')) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-mono text-[#9B8AFB] bg-[#9B8AFB]/10 border border-[#9B8AFB]/30 px-1.5 py-0.5 rounded">
          <Sparkles className="w-2.5 h-2.5" />
          <span>ML Inference</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-mono text-[#45C8E8] bg-[#45C8E8]/10 border border-[#45C8E8]/30 px-1.5 py-0.5 rounded">
        <Cpu className="w-2.5 h-2.5" />
        <span>Heuristic Rule</span>
      </span>
    );
  };

  const formatTimestamp = (isoDate?: string) => {
    if (!isoDate) return 'Intake Recorded';
    try {
      const d = new Date(isoDate);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoDate;
    }
  };

  const PostureIcon = postureMeta.icon;

  return (
    <div className="space-y-5 font-sans select-none text-[#F8FAFC]">
      {/* ========================================================= */}
      {/* 1. EXECUTIVE POSTURE & INCIDENT RESPONSE BANNER            */}
      {/* ========================================================= */}
      <section className="bg-[#111D30] rounded-xl p-5 lg:p-6 text-[#F8FAFC] shadow-card border border-[#1E314F] relative overflow-hidden">
        <div className="flex flex-col xl:flex-row items-stretch justify-between gap-6">
          {/* Left: Brand Identity & Executive Overview */}
          <div className="flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#45C8E8] bg-[#45C8E8]/10 px-2.5 py-0.5 rounded border border-[#45C8E8]/25 flex items-center gap-1.5">
                <Shield className="w-3 h-3 text-[#45C8E8]" />
                SURAKSHA COMMAND POSTURE
              </span>

              <span className="text-xs text-[#8EA2C6] font-mono">
                Target Entity:{' '}
                <strong className="text-[#F8FAFC]">{brandProfile.brandName || 'ApexPay'}</strong>
                {selectedBackendBrandId ? (
                  <span className="ml-1.5 text-[10px] text-[#10B981] bg-[#10B981]/10 px-1.5 py-0.2 rounded border border-[#10B981]/25">
                    Live DB
                  </span>
                ) : (
                  <span className="ml-1.5 text-[10px] text-[#F59E0B] bg-[#F59E0B]/10 px-1.5 py-0.2 rounded border border-[#F59E0B]/25">
                    Sandbox Demo
                  </span>
                )}
              </span>

              <span className="text-xs font-mono text-[#8EA2C6] hidden sm:inline">
                • {totalMonitoredAssets} Verified Identity Assets Monitored
              </span>
            </div>

            <div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#F8FAFC] leading-snug">
                Digital Brand Risk Posture &amp; Attack Surface
              </h2>
              <p className="text-xs text-[#8EA2C6] leading-relaxed max-w-2xl mt-1">
                Continuous surveillance across domain namespaces, authorized social channels, and public application
                repositories. Risk scoring evaluates unmitigated candidate threats with verified false-positive exclusion.
              </p>
            </div>

            {/* Transparent Calculation Breakdown */}
            <div className="p-3 rounded-lg bg-[#0E1726] border border-[#1E314F] text-[11px] font-mono space-y-1.5 max-w-2xl">
              <div className="flex items-center justify-between text-[#8EA2C6]">
                <span className="flex items-center gap-1.5 text-[#45C8E8] font-semibold">
                  <Cpu className="w-3.5 h-3.5 text-[#45C8E8]" />
                  Mathematical Scoring Formula
                </span>
                <span className="text-[#8EA2C6] text-[10px]">Deterministic Severity Weights</span>
              </div>
              <p className="text-[#CAD7E8] text-[10.5px] leading-relaxed">
                Risk Posture = min(100, Σ (Active Finding × Weight)). Weights: Critical=35, High=20, Medium=8, Low=2.
              </p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 border-t border-[#1E314F] text-[10px] text-[#8EA2C6]">
                <span>
                  Active Signals:{' '}
                  <strong className="text-white">{activeCandidates.length}</strong> of{' '}
                  <strong className="text-white">{candidates.length}</strong> total
                </span>
                <span>•</span>
                <span className="text-[#EF4444]">Critical: {criticalCount} (×35)</span>
                <span>•</span>
                <span className="text-[#F97316]">High: {highCount} (×20)</span>
                <span>•</span>
                <span className="text-[#F59E0B]">Medium: {mediumCount} (×8)</span>
                <span>•</span>
                <span className="text-[#10B981]">Low: {lowCount} (×2)</span>
              </div>
            </div>
          </div>

          {/* Center: Risk Posture Gauge Matrix */}
          <div className="shrink-0 p-5 rounded-lg bg-[#16253D] border border-[#1E314F] flex flex-col justify-between items-center min-w-[230px] text-center shadow-sm">
            <div className="flex items-center justify-between w-full mb-1">
              <span className="text-[10px] uppercase font-mono font-semibold tracking-wider text-[#8EA2C6]">
                Calculated Risk Score
              </span>
              <span className={`text-[10.5px] font-mono font-bold px-2 py-0.5 rounded border ${postureMeta.badgeBg}`}>
                {calculatedRiskScore} / 100
              </span>
            </div>

            <div className="my-3 flex items-center justify-center gap-3">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center border"
                style={{
                  backgroundColor: `${postureMeta.color}15`,
                  borderColor: `${postureMeta.color}35`,
                }}
              >
                <PostureIcon className="w-6 h-6" style={{ color: postureMeta.color }} />
              </div>
              <div className="text-left">
                <span className="text-3xl font-mono font-extrabold text-white tracking-tight">
                  {calculatedRiskScore}
                </span>
                <span className="text-xs text-[#8EA2C6] block font-mono">Index Score</span>
              </div>
            </div>

            {/* Segmented Meter Bar */}
            <div className="w-full space-y-1">
              <div className="h-2 w-full bg-[#0E1726] rounded-full overflow-hidden flex p-0.5 border border-[#1E314F]">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.max(4, calculatedRiskScore)}%`,
                    backgroundColor: postureMeta.color,
                  }}
                />
              </div>
              <span className="text-[10px] font-mono font-semibold block" style={{ color: postureMeta.color }}>
                {postureMeta.label}
              </span>
            </div>

            <p className="text-[10px] text-[#8EA2C6] mt-2 max-w-[210px] leading-tight">
              {postureMeta.summary}
            </p>
          </div>

          {/* Right: Quick Action Controls */}
          <div className="shrink-0 p-4 rounded-lg bg-[#16253D] border border-[#1E314F] flex flex-col justify-center gap-2 min-w-[210px]">
            <span className="text-[10px] uppercase font-mono font-semibold tracking-wider text-[#8EA2C6] mb-0.5">
              Rapid Surveillance Scans
            </span>

            <button
              onClick={() => setActiveTab('social-monitoring')}
              className="w-full px-3 py-2 rounded-lg bg-[#111D30] hover:bg-[#1E314F] text-[#F8FAFC] text-xs font-medium border border-[#1E314F] hover:border-[#9B8AFB]/40 transition-all flex items-center justify-between cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-[#9B8AFB]" />
                <span>Scan Social Profiles</span>
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-[#8EA2C6]" />
            </button>

            <button
              onClick={() => setActiveTab('app-monitoring')}
              className="w-full px-3 py-2 rounded-lg bg-[#111D30] hover:bg-[#1E314F] text-[#F8FAFC] text-xs font-medium border border-[#1E314F] hover:border-[#45C8E8]/40 transition-all flex items-center justify-between cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Smartphone className="w-3.5 h-3.5 text-[#45C8E8]" />
                <span>Scan Rogue App Packages</span>
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-[#8EA2C6]" />
            </button>

            <button
              onClick={() => setActiveTab('lookalike-engine')}
              className="w-full px-3 py-2 rounded-lg bg-[#111D30] hover:bg-[#1E314F] text-[#F8FAFC] text-xs font-medium border border-[#1E314F] hover:border-[#45C8E8]/40 transition-all flex items-center justify-between cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 text-[#45C8E8]" />
                <span>Inspect Look-alike Domains</span>
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-[#8EA2C6]" />
            </button>

            <button
              onClick={() => exportCandidatesToCSV(candidates, brandProfile.brandName)}
              className="w-full px-3 py-1.5 rounded-lg bg-[#0E1726] hover:bg-[#111D30] text-[#8EA2C6] hover:text-white text-[11px] font-mono border border-[#1E314F] transition-colors flex items-center justify-center gap-1.5 cursor-pointer mt-1"
            >
              <FileSpreadsheet className="w-3 h-3 text-[#45C8E8]" />
              <span>Export CSV Dossier</span>
            </button>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 2. REAL SUMMARY METRIC CARDS (Purely Data-Driven)          */}
      {/* ========================================================= */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 — Monitored Assets */}
        <div className="bg-[#111D30] p-4 sm:p-5 rounded-xl border border-[#1E314F] hover:border-[#45C8E8]/30 transition-all relative overflow-hidden group shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-semibold text-[#8EA2C6] uppercase tracking-wider">
              Monitored Assets
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#45C8E8]/10 border border-[#45C8E8]/25 flex items-center justify-center text-[#45C8E8]">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-[#F8FAFC] tracking-tight font-mono">
              {totalMonitoredAssets}
            </span>
            <span className="text-[10px] font-mono font-medium text-[#45C8E8] bg-[#45C8E8]/10 border border-[#45C8E8]/25 px-2 py-0.2 rounded">
              Verified Profile
            </span>
          </div>
          <p className="text-xs text-[#8EA2C6] mt-1.5">
            {brandProfile.officialDomains?.length || 0} domains, {brandProfile.officialSocialUrls?.length || 0} handles,{' '}
            {brandProfile.officialApps?.length || 0} apps in directory
          </p>
        </div>

        {/* Card 2 — Active Unmitigated Findings */}
        <div className="bg-[#111D30] p-4 sm:p-5 rounded-xl border border-[#1E314F] hover:border-[#EF4444]/30 transition-all relative overflow-hidden group shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-semibold text-[#8EA2C6] uppercase tracking-wider">
              Active Findings
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/25 flex items-center justify-center text-[#EF4444]">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-[#F8FAFC] tracking-tight font-mono">
              {activeCandidates.length}
            </span>
            <span className="text-[10px] font-mono font-medium text-[#EF4444] bg-[#EF4444]/10 border border-[#EF4444]/25 px-2 py-0.2 rounded">
              Needs Triage
            </span>
          </div>
          <p className="text-xs text-[#8EA2C6] mt-1.5">
            {criticalCount} Critical &amp; {highCount} High severity candidate entities
          </p>
        </div>

        {/* Card 3 — In Active Investigation */}
        <div className="bg-[#111D30] p-4 sm:p-5 rounded-xl border border-[#1E314F] hover:border-[#F59E0B]/30 transition-all relative overflow-hidden group shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-semibold text-[#8EA2C6] uppercase tracking-wider">
              Under Investigation
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#F59E0B]/10 border border-[#F59E0B]/25 flex items-center justify-center text-[#F59E0B]">
              <FolderSearch className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-[#F8FAFC] tracking-tight font-mono">
              {stats.investigatingCount}
            </span>
            <span className="text-[10px] font-mono font-medium text-[#F59E0B] bg-[#F59E0B]/10 border border-[#F59E0B]/25 px-2 py-0.2 rounded">
              Active Dossiers
            </span>
          </div>
          <p className="text-xs text-[#8EA2C6] mt-1.5">
            Assigned to analyst triage with recorded evidence trails
          </p>
        </div>

        {/* Card 4 — Confirmed Incidents */}
        <div className="bg-[#111D30] p-4 sm:p-5 rounded-xl border border-[#1E314F] hover:border-[#EF4444]/30 transition-all relative overflow-hidden group shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-semibold text-[#8EA2C6] uppercase tracking-wider">
              Confirmed Incidents
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/25 flex items-center justify-center text-[#EF4444]">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-[#F8FAFC] tracking-tight font-mono">
              {stats.confirmedSuspiciousCount}
            </span>
            <span className="text-[10px] font-mono font-medium text-[#EF4444] bg-[#EF4444]/10 border border-[#EF4444]/25 px-2 py-0.2 rounded">
              Takedown Ready
            </span>
          </div>
          <p className="text-xs text-[#8EA2C6] mt-1.5">
            Analyst-verified fraudulent look-alikes and rogue packages
          </p>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 3. THREAT INTELLIGENCE WORKSPACE: DISTRIBUTIONS & TRENDS    */}
      {/* ========================================================= */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Severity Distribution Card (4 cols) */}
        <div className="lg:col-span-4 bg-[#111D30] rounded-xl p-5 border border-[#1E314F] shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded bg-[#16253D] border border-[#1E314F] flex items-center justify-center text-[#45C8E8]">
                <BarChart3 className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#F8FAFC]">
                Severity Distribution
              </h3>
            </div>
            <span className="text-[10.5px] font-mono text-[#8EA2C6]">
              {candidates.length} Total Signals
            </span>
          </div>

          {/* Stacked Proportional Bar */}
          <div className="h-2 w-full bg-[#0E1726] rounded-full overflow-hidden flex gap-0.5 border border-[#1E314F]">
            {severityStats.crit > 0 && (
              <div
                className="h-full bg-[#EF4444] rounded-xs"
                style={{ width: `${severityStats.critPct}%` }}
                title={`Critical: ${severityStats.crit}`}
              />
            )}
            {severityStats.high > 0 && (
              <div
                className="h-full bg-[#F97316] rounded-xs"
                style={{ width: `${severityStats.highPct}%` }}
                title={`High: ${severityStats.high}`}
              />
            )}
            {severityStats.med > 0 && (
              <div
                className="h-full bg-[#F59E0B] rounded-xs"
                style={{ width: `${severityStats.medPct}%` }}
                title={`Medium: ${severityStats.med}`}
              />
            )}
            {severityStats.low > 0 && (
              <div
                className="h-full bg-[#10B981] rounded-xs"
                style={{ width: `${severityStats.lowPct}%` }}
                title={`Low: ${severityStats.low}`}
              />
            )}
          </div>

          {/* Detailed Severity Breakdown Rows */}
          <div className="space-y-1.5 text-xs font-mono">
            <div className="flex items-center justify-between p-2 rounded-lg bg-[#0E1726] border border-[#1E314F]">
              <span className="flex items-center gap-2 text-[#EF4444]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444]" />
                <span>Critical Severity</span>
              </span>
              <span className="font-bold text-white">
                {severityStats.crit}{' '}
                <span className="text-[10px] text-[#8EA2C6] font-normal">({severityStats.critPct}%)</span>
              </span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-[#0E1726] border border-[#1E314F]">
              <span className="flex items-center gap-2 text-[#F97316]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#F97316]" />
                <span>High Severity</span>
              </span>
              <span className="font-bold text-white">
                {severityStats.high}{' '}
                <span className="text-[10px] text-[#8EA2C6] font-normal">({severityStats.highPct}%)</span>
              </span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-[#0E1726] border border-[#1E314F]">
              <span className="flex items-center gap-2 text-[#F59E0B]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
                <span>Medium Severity</span>
              </span>
              <span className="font-bold text-white">
                {severityStats.med}{' '}
                <span className="text-[10px] text-[#8EA2C6] font-normal">({severityStats.medPct}%)</span>
              </span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-[#0E1726] border border-[#1E314F]">
              <span className="flex items-center gap-2 text-[#10B981]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                <span>Low / Allowlisted</span>
              </span>
              <span className="font-bold text-white">
                {severityStats.low}{' '}
                <span className="text-[10px] text-[#8EA2C6] font-normal">({severityStats.lowPct}%)</span>
              </span>
            </div>
          </div>
        </div>

        {/* Source Vector Distribution Card (4 cols) */}
        <div className="lg:col-span-4 bg-[#111D30] rounded-xl p-5 border border-[#1E314F] shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded bg-[#16253D] border border-[#1E314F] flex items-center justify-center text-[#45C8E8]">
                <Layers className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#F8FAFC]">
                Findings by Vector
              </h3>
            </div>
            <span className="text-[10.5px] font-mono text-[#45C8E8]">3 Vectors Active</span>
          </div>

          <div className="space-y-2.5">
            {/* Social Media Vector */}
            <div className="p-2.5 rounded-lg bg-[#0E1726] border border-[#1E314F] space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-[#F8FAFC] font-medium">
                  <Share2 className="w-3.5 h-3.5 text-[#45C8E8]" />
                  <span>Social Media Profiles</span>
                </span>
                <span className="font-mono text-white font-bold">
                  {sourceStats.social}{' '}
                  <span className="text-[10px] text-[#8EA2C6] font-normal">({sourceStats.socialPct}%)</span>
                </span>
              </div>
              <div className="h-1.5 w-full bg-[#16253D] rounded-full overflow-hidden">
                <div className="h-full bg-[#45C8E8] rounded-full" style={{ width: `${sourceStats.socialPct}%` }} />
              </div>
            </div>

            {/* Mobile Apps Vector */}
            <div className="p-2.5 rounded-lg bg-[#0E1726] border border-[#1E314F] space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-[#F8FAFC] font-medium">
                  <Smartphone className="w-3.5 h-3.5 text-[#45C8E8]" />
                  <span>Mobile App Packages</span>
                </span>
                <span className="font-mono text-white font-bold">
                  {sourceStats.app}{' '}
                  <span className="text-[10px] text-[#8EA2C6] font-normal">({sourceStats.appPct}%)</span>
                </span>
              </div>
              <div className="h-1.5 w-full bg-[#16253D] rounded-full overflow-hidden">
                <div className="h-full bg-[#45C8E8] rounded-full" style={{ width: `${sourceStats.appPct}%` }} />
              </div>
            </div>

            {/* Lookalike Domains Vector */}
            <div className="p-2.5 rounded-lg bg-[#0E1726] border border-[#1E314F] space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-[#F8FAFC] font-medium">
                  <Globe className="w-3.5 h-3.5 text-[#9B8AFB]" />
                  <span>Look-alike Domains / DNS</span>
                </span>
                <span className="font-mono text-white font-bold">
                  {sourceStats.domain}{' '}
                  <span className="text-[10px] text-[#8EA2C6] font-normal">({sourceStats.domainPct}%)</span>
                </span>
              </div>
              <div className="h-1.5 w-full bg-[#16253D] rounded-full overflow-hidden">
                <div className="h-full bg-[#9B8AFB] rounded-full" style={{ width: `${sourceStats.domainPct}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Threat Graph Topology Card (4 cols) */}
        <div className="lg:col-span-4 bg-[#111D30] rounded-xl p-5 border border-[#1E314F] shadow-card space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded bg-[#16253D] border border-[#1E314F] flex items-center justify-center text-[#9B8AFB]">
                  <Network className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#F8FAFC]">
                  Threat Graph Topology
                </h3>
              </div>
              <span className="text-[10px] font-mono text-[#10B981] bg-[#10B981]/10 border border-[#10B981]/25 px-1.5 py-0.2 rounded">
                {threatNodes.length} Nodes
              </span>
            </div>

            <p className="text-xs text-[#8EA2C6] leading-relaxed">
              Analyzes shared registrar infrastructure, phishing kits, and cross-promoted rogue APK packages
              associated with <strong className="text-white">{brandProfile.brandName}</strong>.
            </p>

            <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs font-mono">
              <div className="p-2 rounded-lg bg-[#0E1726] border border-[#1E314F]">
                <span className="text-base font-bold text-white block">{threatNodes.length}</span>
                <span className="text-[9.5px] text-[#8EA2C6] uppercase">Graph Entities</span>
              </div>
              <div className="p-2 rounded-lg bg-[#0E1726] border border-[#1E314F]">
                <span className="text-base font-bold text-[#45C8E8] block">{threatEdges.length}</span>
                <span className="text-[9.5px] text-[#8EA2C6] uppercase">Linked Vectors</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setActiveTab('threat-graph')}
            className="w-full px-4 py-2 rounded-lg bg-[#16253D] hover:bg-[#1E314F] border border-[#1E314F] hover:border-[#45C8E8]/40 text-[#F8FAFC] text-xs font-medium transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            <Network className="w-3.5 h-3.5 text-[#45C8E8]" />
            <span>Open Interactive Threat Graph</span>
          </button>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 4. RECENT INCIDENTS & SCREENED THREAT CANDIDATES TABLE     */}
      {/* ========================================================= */}
      <section className="bg-[#111D30] rounded-xl border border-[#1E314F] shadow-card overflow-hidden">
        {/* Table Header with Filters and Search */}
        <div className="p-4 sm:p-5 border-b border-[#1E314F] flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#16253D] border border-[#1E314F] flex items-center justify-center text-[#45C8E8] shrink-0">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#F8FAFC]">
                Screened Incidents &amp; Threat Candidates
              </h3>
              <p className="text-xs text-[#8EA2C6]">
                Security operations register displaying {filteredCandidates.length} of {candidates.length} recorded candidate entities.
              </p>
            </div>
          </div>

          {/* Controls Bar: Multi-Filters & Search */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Severity Filter */}
            <div className="flex items-center gap-1 bg-[#0E1726] px-2.5 py-1.5 rounded-lg border border-[#1E314F]">
              <span className="text-[11px] font-mono text-[#8EA2C6]">Severity:</span>
              <select
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value)}
                className="bg-transparent text-xs font-mono font-semibold text-[#F8FAFC] focus:outline-hidden cursor-pointer"
              >
                <option value="all" className="bg-[#111D30]">All</option>
                <option value="critical" className="bg-[#111D30]">Critical</option>
                <option value="high" className="bg-[#111D30]">High</option>
                <option value="medium" className="bg-[#111D30]">Medium</option>
                <option value="low" className="bg-[#111D30]">Low</option>
              </select>
            </div>

            {/* Source Vector Filter */}
            <div className="flex items-center gap-1 bg-[#0E1726] px-2.5 py-1.5 rounded-lg border border-[#1E314F]">
              <span className="text-[11px] font-mono text-[#8EA2C6]">Vector:</span>
              <select
                value={filterSource}
                onChange={(e) => setFilterSource(e.target.value)}
                className="bg-transparent text-xs font-mono font-semibold text-[#F8FAFC] focus:outline-hidden cursor-pointer"
              >
                <option value="all" className="bg-[#111D30]">All Vectors</option>
                <option value="domain" className="bg-[#111D30]">Domain / DNS</option>
                <option value="social" className="bg-[#111D30]">Social Profile</option>
                <option value="app" className="bg-[#111D30]">Mobile App</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1 bg-[#0E1726] px-2.5 py-1.5 rounded-lg border border-[#1E314F]">
              <span className="text-[11px] font-mono text-[#8EA2C6]">Status:</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-transparent text-xs font-mono font-semibold text-[#F8FAFC] focus:outline-hidden cursor-pointer"
              >
                <option value="all" className="bg-[#111D30]">All Statuses</option>
                <option value="new" className="bg-[#111D30]">New Intake</option>
                <option value="investigating" className="bg-[#111D30]">Investigating</option>
                <option value="confirmed suspicious" className="bg-[#111D30]">Confirmed Suspicious</option>
                <option value="dismissed" className="bg-[#111D30]">Dismissed</option>
              </select>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1 bg-[#0E1726] px-2.5 py-1.5 rounded-lg border border-[#1E314F]">
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#8EA2C6]" />
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as any)}
                className="bg-transparent text-xs font-mono font-semibold text-[#F8FAFC] focus:outline-hidden cursor-pointer"
              >
                <option value="severity-desc" className="bg-[#111D30]">Severity (High-Low)</option>
                <option value="date-desc" className="bg-[#111D30]">Newest First</option>
                <option value="date-asc" className="bg-[#111D30]">Oldest First</option>
                <option value="title-asc" className="bg-[#111D30]">A-Z Title</option>
              </select>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#8EA2C6] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter candidates..."
                className="pl-8 pr-3 py-1.5 text-xs font-mono bg-[#0E1726] border border-[#1E314F] focus:border-[#45C8E8] rounded-lg text-white placeholder-[#8EA2C6] focus:outline-hidden w-40 sm:w-52 transition-all"
              >
              </input>
            </div>

            {(filterSeverity !== 'all' || filterSource !== 'all' || filterStatus !== 'all' || searchQuery) && (
              <button
                onClick={() => {
                  setFilterSeverity('all');
                  setFilterSource('all');
                  setFilterStatus('all');
                  setSearchQuery('');
                }}
                className="p-1.5 rounded-lg bg-[#0E1726] hover:bg-[#16253D] border border-[#1E314F] text-[#8EA2C6] hover:text-white transition-colors cursor-pointer"
                title="Reset Filters"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Incidents Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0E1726] text-[#8EA2C6] font-mono uppercase tracking-wider text-[10.5px] border-b border-[#1E314F]">
              <tr>
                <th className="py-2.5 px-4 w-12">#</th>
                <th className="py-2.5 px-4">CANDIDATE ASSET</th>
                <th className="py-2.5 px-3">SOURCE VECTOR</th>
                <th className="py-2.5 px-3">DETECTION PROVENANCE</th>
                <th className="py-2.5 px-3">SEVERITY</th>
                <th className="py-2.5 px-3">STATUS</th>
                <th className="py-2.5 px-3">FIRST DETECTED</th>
                <th className="py-2.5 px-4 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E314F]/60 font-sans">
              {filteredCandidates.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#8EA2C6]">
                    <div className="max-w-sm mx-auto space-y-2">
                      <ShieldCheck className="w-8 h-8 text-[#10B981] mx-auto opacity-70" />
                      <p className="font-semibold text-white">No candidate findings match your active filters</p>
                      <p className="text-[11px] text-[#8EA2C6]">
                        Adjust your severity, vector, or search parameters, or initiate a new monitoring sweep above.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCandidates.map((candidate, idx) => (
                  <tr
                    key={candidate.id}
                    onClick={() => setSelectedCandidateId(candidate.id)}
                    className="hover:bg-[#16253D]/50 cursor-pointer transition-colors group"
                  >
                    {/* Index */}
                    <td className="py-3 px-4 font-mono font-medium text-[#8EA2C6]">
                      {idx + 1}
                    </td>

                    {/* Candidate Asset Info */}
                    <td className="py-3 px-4 max-w-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-[#0E1726] border border-[#1E314F] flex items-center justify-center shrink-0 group-hover:border-[#45C8E8]/40 transition-colors">
                          {getSourceIcon(candidate.type)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-[#F8FAFC] group-hover:text-[#45C8E8] flex items-center gap-1.5 transition-colors truncate">
                            <span className="truncate">{candidate.title}</span>
                            {candidate.isFictionalDemo && (
                              <span className="text-[9px] bg-[#0E1726] text-[#8EA2C6] border border-[#1E314F] px-1 py-0.2 rounded font-mono shrink-0">
                                DEMO
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-[#8EA2C6] font-mono block mt-0.5 truncate">
                            {candidate.identifier}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Source Vector */}
                    <td className="py-3 px-3 text-[#F8FAFC] font-medium text-xs whitespace-nowrap">
                      <div className="flex flex-col">
                        <span>{getSourceLabel(candidate.type)}</span>
                        <span className="text-[10px] text-[#8EA2C6] font-mono">{candidate.platform}</span>
                      </div>
                    </td>

                    {/* Detection Provenance */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      {getEngineBadge(candidate)}
                    </td>

                    {/* Risk Level */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <RiskBadge level={candidate.riskCategory} size="sm" />
                    </td>

                    {/* Status */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <StatusBadge status={candidate.status} size="sm" />
                    </td>

                    {/* First Detected Timestamp */}
                    <td className="py-3 px-3 text-[11px] font-mono text-[#8EA2C6] whitespace-nowrap">
                      {formatTimestamp(candidate.createdDate)}
                    </td>

                    {/* Action Button */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCandidateId(candidate.id);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#16253D] hover:bg-[#1E314F] text-[#45C8E8] hover:text-white border border-[#1E314F] hover:border-[#45C8E8]/40 text-[11px] font-mono font-medium transition-all cursor-pointer"
                      >
                        <span>Dossier</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default OverviewDashboard;
