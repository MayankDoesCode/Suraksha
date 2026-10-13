import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { RiskBadge } from '../components/RiskBadge';
import { StatusBadge } from '../components/StatusBadge';
import { DashboardHeroRadar } from '../components/DashboardHeroRadar';
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
  MoreVertical,
  Shield,
  Crosshair,
  TrendingUp,
  CheckCircle2,
  Clock,
  Radio,
} from 'lucide-react';
import type { RiskLevel, InvestigationStatus } from '../types';

interface DisplayRow {
  id: string;
  num: number;
  title: string;
  identifier: string;
  platform: string;
  type: 'social' | 'app' | 'domain';
  riskCategory: RiskLevel;
  statusText: string;
  evidence: string;
  isFictionalDemo: boolean;
}

export const OverviewDashboard: React.FC = () => {
  const { candidates, brandProfile, stats, setActiveTab, setSelectedCandidateId } = useApp();
  const [filterRisk, setFilterRisk] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Primary demonstration rows specified by the reference specification
  const defaultRows: DisplayRow[] = [
    {
      id: 'cand-001',
      num: 1,
      title: 'ApexPay Verified Official',
      identifier: '@apexpay_official',
      platform: 'Twitter / X',
      type: 'social',
      riskCategory: 'Low',
      statusText: 'Dismissed / Allowed',
      evidence: 'Authenticated official account',
      isFictionalDemo: true,
    },
    {
      id: 'cand-002',
      num: 2,
      title: 'ApexPay Helpdesk & Refund Claims',
      identifier: '@apexpay_support_claims',
      platform: 'Telegram / X',
      type: 'social',
      riskCategory: 'Critical',
      statusText: 'Under Investigation',
      evidence: 'Fraudulent support claims, fake domain',
      isFictionalDemo: true,
    },
    {
      id: 'cand-003',
      num: 3,
      title: 'apexpay-secure.com',
      identifier: 'Look-alike domain',
      platform: 'Domain',
      type: 'domain',
      riskCategory: 'High',
      statusText: 'Takedown Ready',
      evidence: 'Homoglyph + brand token match',
      isFictionalDemo: true,
    },
    {
      id: 'cand-004',
      num: 4,
      title: 'ApexPay Pro',
      identifier: 'com.apexpay.mobile',
      platform: 'App Store',
      type: 'app',
      riskCategory: 'Medium',
      statusText: 'In Review',
      evidence: 'Similar UI/branding patterns',
      isFictionalDemo: true,
    },
  ];

  // Map candidates from context or fallback to default rows
  const displayRows: DisplayRow[] = defaultRows.map((defRow) => {
    const existing = candidates.find((c) => c.id === defRow.id);
    if (!existing) return defRow;
    return {
      ...defRow,
      title: existing.title || defRow.title,
      identifier: existing.identifier || defRow.identifier,
      riskCategory: existing.riskCategory || defRow.riskCategory,
      evidence: existing.summary || defRow.evidence,
    };
  });

  const filteredRows = displayRows.filter((row) => {
    const matchesRisk = filterRisk === 'all' || row.riskCategory.toLowerCase() === filterRisk.toLowerCase();
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      !query ||
      row.title.toLowerCase().includes(query) ||
      row.identifier.toLowerCase().includes(query) ||
      row.platform.toLowerCase().includes(query) ||
      row.evidence.toLowerCase().includes(query);
    return matchesRisk && matchesSearch;
  });

  const getPlatformIcon = (type: string) => {
    switch (type) {
      case 'app':
        return <Smartphone className="w-3.5 h-3.5 text-[#00D9FF]" />;
      case 'domain':
        return <Globe className="w-3.5 h-3.5 text-[#8B5CF6]" />;
      default:
        return <Share2 className="w-3.5 h-3.5 text-[#1265F8]" />;
    }
  };

  const getStatusBadge = (statusText: string) => {
    if (statusText.includes('Dismissed') || statusText.includes('Allowed')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#00E5A0]/10 text-[#00E5A0] border border-[#00E5A0]/30 shadow-xs">
          <CheckCircle2 className="w-3 h-3 text-[#00E5A0]" />
          <span>Dismissed / Allowed</span>
        </span>
      );
    }
    if (statusText.includes('Under Investigation')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#FFB020]/10 text-[#FFB020] border border-[#FFB020]/30 shadow-xs">
          <Clock className="w-3 h-3 text-[#FFB020]" />
          <span>Under Investigation</span>
        </span>
      );
    }
    if (statusText.includes('Takedown Ready')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#8B5CF6]/15 text-[#8B5CF6] border border-[#8B5CF6]/30 shadow-xs">
          <AlertTriangle className="w-3 h-3 text-[#8B5CF6]" />
          <span>Takedown Ready</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#1265F8]/15 text-[#00D9FF] border border-[#1265F8]/30 shadow-xs">
        <Clock className="w-3 h-3 text-[#00D9FF]" />
        <span>{statusText}</span>
      </span>
    );
  };

  return (
    <div className="space-y-5 font-sans select-none text-[#F1F5FF]">
      {/* ========================================================= */}
      {/* 1. HERO AND THREAT INTELLIGENCE PANEL (~220px Target)     */}
      {/* ========================================================= */}
      <div className="bg-gradient-to-r from-[#030D22] via-[#06142D] to-[#0A1C3D] rounded-2xl p-5 lg:p-6 text-white shadow-2xl border border-[#123E78] relative overflow-hidden flex flex-col lg:flex-row items-center justify-between gap-6">
        {/* Subtle Ambient Backlight */}
        <div className="absolute top-0 left-1/3 w-[380px] h-[220px] bg-[#1265F8]/10 rounded-full blur-[120px] pointer-events-none" />

        {/* Left: Text and Branding */}
        <div className="relative z-10 flex-1 max-w-xl space-y-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#00D9FF] bg-[#1265F8]/20 px-2.5 py-0.5 rounded-full border border-[#00D9FF]/30 shadow-xs">
              SURAKSHA BRAND PROTECTION MATRIX
            </span>
            <span className="text-xs text-[#91ACD1] font-mono">
              Monitored Brand: <strong className="text-white">{brandProfile.brandName || 'ApexPay'}</strong> (Fictional Fintech)
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
            Digital Brand Protection{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00D9FF] to-teal-300">
              &amp; Threat Intelligence
            </span>
          </h2>

          <p className="text-xs text-[#91ACD1] leading-relaxed max-w-lg">
            Automated intelligence surveillance across social media platforms, app stores, and look-alike domains.
            Powered by <strong className="text-white">Suraksha AI</strong> with multi-signal evidence reasoning and false-positive defense.
          </p>
        </div>

        {/* Center: Animated Cyber Threat Radar */}
        <div className="relative z-10 shrink-0 hidden md:flex items-center justify-center">
          <DashboardHeroRadar />
        </div>

        {/* Right: Scan Controls Panel */}
        <div className="relative z-10 p-4 rounded-xl bg-[#030D22]/85 border border-[#123E78] shadow-xl flex flex-col justify-center gap-2.5 shrink-0 w-full sm:w-auto min-w-[210px]">
          <button
            onClick={() => setActiveTab('social-monitoring')}
            className="w-full px-4 py-2.5 rounded-xl bg-[#1265F8] hover:bg-[#1265F8]/90 text-white text-xs font-semibold shadow-lg shadow-[#1265F8]/30 transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#00D9FF]" />
            <span>New Social Scan</span>
          </button>

          <button
            onClick={() => setActiveTab('app-monitoring')}
            className="w-full px-4 py-2.5 rounded-xl bg-[#0A1C3D] hover:bg-[#06142D] text-[#F1F5FF] text-xs font-semibold border border-[#123E78] hover:border-[#00D9FF]/40 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            <Smartphone className="w-3.5 h-3.5 text-[#00D9FF]" />
            <span>New App Scan</span>
          </button>

          <div className="pt-2 border-t border-[#123E78]/70 space-y-1 text-[10.5px] font-mono text-[#91ACD1]">
            <div className="flex items-center justify-between">
              <span>Last Scan</span>
              <span className="text-[#F1F5FF] font-semibold">2 hours ago</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Auto Monitoring</span>
              <span className="inline-flex items-center gap-1.5 text-[#00E5A0] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00E5A0] animate-pulse" />
                Active
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. FOUR KPI CARDS (Horizontal Row)                        */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 — Analyzed Assets */}
        <div className="bg-[#06142D] p-5 rounded-2xl border border-[#123E78] shadow-lg hover:border-[#00D9FF]/40 transition-all relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-semibold text-[#91ACD1] uppercase tracking-wider">
              Analyzed Assets
            </span>
            <div className="w-9 h-9 rounded-xl bg-[#00D9FF]/10 border border-[#00D9FF]/30 flex items-center justify-center text-[#00D9FF] group-hover:scale-105 transition-transform">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2.5">
            <span className="text-3xl font-extrabold text-[#F1F5FF] tracking-tight font-mono">
              6
            </span>
            <span className="text-[10.5px] font-mono font-semibold text-[#00D9FF] bg-[#1265F8]/20 border border-[#00D9FF]/30 px-2 py-0.5 rounded-full">
              Total Screened
            </span>
            <span className="ml-auto text-[11px] font-mono font-semibold text-[#00D9FF] flex items-center gap-0.5">
              <TrendingUp className="w-3 h-3" />
              +12%
            </span>
          </div>
          <p className="text-xs text-[#91ACD1] mt-2">
            Social profiles, app stores, and domain candidates
          </p>
        </div>

        {/* Card 2 — High-Risk Alerts */}
        <div className="bg-[#06142D] p-5 rounded-2xl border border-[#123E78] shadow-lg hover:border-[#FF315B]/40 transition-all relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-semibold text-[#91ACD1] uppercase tracking-wider">
              High-Risk Alerts
            </span>
            <div className="w-9 h-9 rounded-xl bg-[#FF315B]/10 border border-[#FF315B]/30 flex items-center justify-center text-[#FF315B] group-hover:scale-105 transition-transform">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2.5">
            <span className="text-3xl font-extrabold text-[#F1F5FF] tracking-tight font-mono">
              3
            </span>
            <span className="text-[10.5px] font-mono font-semibold text-[#FF315B] bg-[#FF315B]/20 border border-[#FF315B]/30 px-2 py-0.5 rounded-full">
              Needs Action
            </span>
            <span className="ml-auto text-[11px] font-mono font-semibold text-[#FF315B] flex items-center gap-0.5">
              <TrendingUp className="w-3 h-3" />
              +50%
            </span>
          </div>
          <p className="text-xs text-[#91ACD1] mt-2">
            Critical (3) &amp; High (0) threat candidates
          </p>
        </div>

        {/* Card 3 — In Investigation */}
        <div className="bg-[#06142D] p-5 rounded-2xl border border-[#123E78] shadow-lg hover:border-[#FFB020]/40 transition-all relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-semibold text-[#91ACD1] uppercase tracking-wider">
              In Investigation
            </span>
            <div className="w-9 h-9 rounded-xl bg-[#FFB020]/10 border border-[#FFB020]/30 flex items-center justify-center text-[#FFB020] group-hover:scale-105 transition-transform">
              <FolderSearch className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2.5">
            <span className="text-3xl font-extrabold text-[#F1F5FF] tracking-tight font-mono">
              2
            </span>
            <span className="text-[10.5px] font-mono font-semibold text-[#FFB020] bg-[#FFB020]/20 border border-[#FFB020]/30 px-2 py-0.5 rounded-full">
              Active Triage
            </span>
            <span className="ml-auto text-[11px] font-mono font-semibold text-[#FFB020] flex items-center gap-0.5">
              <TrendingUp className="w-3 h-3" />
              +100%
            </span>
          </div>
          <p className="text-xs text-[#91ACD1] mt-2">
            Under active analyst review and evidence verification
          </p>
        </div>

        {/* Card 4 — Confirmed Suspicious */}
        <div className="bg-[#06142D] p-5 rounded-2xl border border-[#123E78] shadow-lg hover:border-[#8B5CF6]/40 transition-all relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-semibold text-[#91ACD1] uppercase tracking-wider">
              Confirmed Suspicious
            </span>
            <div className="w-9 h-9 rounded-xl bg-[#8B5CF6]/10 border border-[#8B5CF6]/30 flex items-center justify-center text-[#8B5CF6] group-hover:scale-105 transition-transform">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2.5">
            <span className="text-3xl font-extrabold text-[#F1F5FF] tracking-tight font-mono">
              2
            </span>
            <span className="text-[10.5px] font-mono font-semibold text-[#8B5CF6] bg-[#8B5CF6]/20 border border-[#8B5CF6]/30 px-2 py-0.5 rounded-full">
              Takedown Ready
            </span>
            <span className="ml-auto text-[11px] font-mono font-semibold text-[#8B5CF6] flex items-center gap-0.5">
              <TrendingUp className="w-3 h-3" />
              +33%
            </span>
          </div>
          <p className="text-xs text-[#91ACD1] mt-2">
            Verified fraudulent look-alikes &amp; rogue packages
          </p>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. BOTTOM TWO COLUMNS (Table ~65% / Benchmark ~35%)       */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Panel: Priority Threat Candidates (~65% width) */}
        <div className="lg:col-span-8 bg-[#06142D] rounded-2xl border border-[#123E78] shadow-xl overflow-hidden">
          {/* Table Header */}
          <div className="p-4 sm:p-5 border-b border-[#123E78] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#00D9FF]/10 border border-[#00D9FF]/30 flex items-center justify-center text-[#00D9FF] shrink-0">
                <Crosshair className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#F1F5FF]">Priority Threat Candidates</h3>
                <p className="text-xs text-[#91ACD1]">
                  Screened accounts, apps, and domains ranked by threat severity.
                </p>
              </div>
            </div>

            {/* Filter and Search Controls */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-[#0A1C3D] px-2.5 py-1.5 rounded-xl border border-[#123E78] text-xs">
                <Filter className="w-3.5 h-3.5 text-[#91ACD1]" />
                <select
                  value={filterRisk}
                  onChange={(e) => setFilterRisk(e.target.value)}
                  className="bg-transparent text-xs font-mono font-semibold text-[#F1F5FF] focus:outline-hidden cursor-pointer"
                >
                  <option value="all" className="bg-[#06142D] text-white">All Risks</option>
                  <option value="critical" className="bg-[#06142D] text-white">Critical</option>
                  <option value="high" className="bg-[#06142D] text-white">High</option>
                  <option value="medium" className="bg-[#06142D] text-white">Medium</option>
                  <option value="low" className="bg-[#06142D] text-white">Low</option>
                </select>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#91ACD1] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search candidate..."
                  className="pl-8 pr-3 py-1.5 text-xs font-mono bg-[#0A1C3D] border border-[#123E78] focus:border-[#00D9FF] rounded-xl text-white placeholder-[#91ACD1] focus:outline-hidden w-36 sm:w-44 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#030D22]/80 text-[#91ACD1] font-mono uppercase tracking-wider text-[10.5px] border-b border-[#123E78]">
                <tr>
                  <th className="py-3 px-4 w-10">#</th>
                  <th className="py-3 px-4">CANDIDATE ASSET</th>
                  <th className="py-3 px-3">PLATFORM</th>
                  <th className="py-3 px-3">RISK LEVEL</th>
                  <th className="py-3 px-3">STATUS</th>
                  <th className="py-3 px-3">EVIDENCE SUMMARY</th>
                  <th className="py-3 px-4 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#123E78]/60 font-sans">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-[#91ACD1] italic">
                      No candidate assets match your search filters.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => setSelectedCandidateId(row.id)}
                      className="hover:bg-[#0A1C3D]/60 cursor-pointer transition-colors group"
                    >
                      {/* # Column */}
                      <td className="py-3.5 px-4 font-mono font-bold text-[#91ACD1]">
                        {row.num}
                      </td>

                      {/* Candidate Asset Column */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-lg bg-[#0A1C3D] border border-[#123E78] flex items-center justify-center shrink-0 group-hover:border-[#00D9FF]/40 transition-colors">
                            {getPlatformIcon(row.type)}
                          </div>
                          <div>
                            <div className="font-semibold text-[#F1F5FF] group-hover:text-[#00D9FF] flex items-center gap-1.5 transition-colors">
                              <span>{row.title}</span>
                              {row.isFictionalDemo && (
                                <span className="text-[9px] bg-[#0A1C3D] text-[#91ACD1] border border-[#123E78] px-1 py-0.2 rounded font-mono">
                                  DEMO
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-[#91ACD1] font-mono block mt-0.5">
                              {row.identifier}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Platform Column */}
                      <td className="py-3.5 px-3 text-[#F1F5FF] font-medium font-mono text-xs">
                        {row.platform}
                      </td>

                      {/* Risk Level Column */}
                      <td className="py-3.5 px-3">
                        <RiskBadge level={row.riskCategory} size="sm" />
                      </td>

                      {/* Status Column */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        {getStatusBadge(row.statusText)}
                      </td>

                      {/* Evidence Summary Column */}
                      <td className="py-3.5 px-3 text-[#91ACD1] text-[11px] max-w-xs truncate" title={row.evidence}>
                        {row.evidence}
                      </td>

                      {/* Actions Column */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCandidateId(row.id);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#1265F8] hover:bg-[#1265F8]/80 text-white text-[11px] font-semibold transition-all shadow-md shadow-[#1265F8]/30 cursor-pointer"
                          >
                            <span>View</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCandidateId(row.id);
                            }}
                            className="p-1.5 rounded-lg text-[#91ACD1] hover:text-white hover:bg-[#0A1C3D] transition-colors cursor-pointer"
                            title="More options"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Panel: Benchmark Validation Suite (~35% width) */}
        <div className="lg:col-span-4 bg-[#06142D] rounded-2xl p-5 border border-[#123E78] shadow-xl space-y-4">
          {/* Header */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#00D9FF]" />
                <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-[#00D9FF]">
                  FICTIONAL TEST SUITE
                </span>
              </div>
              <span className="text-[10px] text-[#91ACD1] font-mono px-2 py-0.5 rounded bg-[#0A1C3D] border border-[#123E78]">
                Benchmark
              </span>
            </div>

            <h4 className="text-sm font-bold text-[#F1F5FF]">
              Benchmark Validation Suite
            </h4>
            <p className="text-xs text-[#91ACD1] mt-1 leading-relaxed">
              Standardized validation cases for monitored brand <strong className="text-white">ApexPay</strong>. Click to inspect evidence.
            </p>
          </div>

          {/* 4 Benchmark Cards */}
          <div className="space-y-2.5">
            {/* Benchmark 1 */}
            <div
              onClick={() => setSelectedCandidateId('cand-001')}
              className="p-3 rounded-xl bg-[#030D22] hover:bg-[#0A1C3D] border border-[#123E78] hover:border-[#00E5A0]/40 cursor-pointer flex items-center justify-between transition-all group shadow-md"
            >
              <div>
                <span className="font-semibold text-[#00E5A0] text-xs block group-hover:translate-x-0.5 transition-transform">
                  1. Official Account (Safe)
                </span>
                <span className="text-[11px] font-mono text-[#91ACD1] block mt-0.5">
                  @apexpay_official
                </span>
                <span className="text-[10px] text-[#91ACD1]/80 block">
                  Allowlisted identity
                </span>
              </div>
              <RiskBadge level="Low" size="sm" />
            </div>

            {/* Benchmark 2 */}
            <div
              onClick={() => setSelectedCandidateId('cand-002')}
              className="p-3 rounded-xl bg-[#030D22] hover:bg-[#0A1C3D] border border-[#123E78] hover:border-[#FF315B]/40 cursor-pointer flex items-center justify-between transition-all group shadow-md"
            >
              <div>
                <span className="font-semibold text-[#FF315B] text-xs block group-hover:translate-x-0.5 transition-transform">
                  2. Look-alike Phishing Lure
                </span>
                <span className="text-[11px] font-mono text-[#91ACD1] block mt-0.5">
                  @apexpay_support_claims
                </span>
                <span className="text-[10px] text-[#91ACD1]/80 block">
                  Credential trap
                </span>
              </div>
              <RiskBadge level="Critical" size="sm" />
            </div>

            {/* Benchmark 3 */}
            <div
              onClick={() => setSelectedCandidateId('cand-004')}
              className="p-3 rounded-xl bg-[#030D22] hover:bg-[#0A1C3D] border border-[#123E78] hover:border-[#FFB020]/40 cursor-pointer flex items-center justify-between transition-all group shadow-md"
            >
              <div>
                <span className="font-semibold text-[#FFB020] text-xs block group-hover:translate-x-0.5 transition-transform">
                  3. Rogue Mobile App
                </span>
                <span className="text-[11px] font-mono text-[#91ACD1] block mt-0.5">
                  ApexPay Pro — Fake app package
                </span>
                <span className="text-[10px] text-[#91ACD1]/80 block">
                  Mismatched publisher signature
                </span>
              </div>
              <RiskBadge level="High" size="sm" />
            </div>

            {/* Benchmark 4 */}
            <div
              onClick={() => setSelectedCandidateId('cand-003')}
              className="p-3 rounded-xl bg-[#030D22] hover:bg-[#0A1C3D] border border-[#123E78] hover:border-[#8B5CF6]/40 cursor-pointer flex items-center justify-between transition-all group shadow-md"
            >
              <div>
                <span className="font-semibold text-[#8B5CF6] text-xs block group-hover:translate-x-0.5 transition-transform">
                  4. Malicious Domain
                </span>
                <span className="text-[11px] font-mono text-[#91ACD1] block mt-0.5">
                  apexpay-secure.com
                </span>
                <span className="text-[10px] text-[#91ACD1]/80 block">
                  Look-alike domain
                </span>
              </div>
              <RiskBadge level="Medium" size="sm" />
            </div>
          </div>

          {/* Bottom Engine Note */}
          <div className="p-3 rounded-xl bg-[#030D22]/70 border border-[#123E78]/60 text-[10.5px] font-mono text-[#91ACD1] flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Radio className="w-3 h-3 text-[#00D9FF] animate-pulse" />
              <span>Multi-Signal Reasoning</span>
            </span>
            <span className="text-[#00D9FF]">v5.2 Engine</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverviewDashboard;
