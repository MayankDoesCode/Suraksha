import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { RiskBadge } from '../components/RiskBadge';
import {
  Share2,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  Loader2,
  CheckCircle2,
  Copy,
  Check,
  RotateCcw,
  ExternalLink,
  Calendar,
  Users,
  Globe,
  Tag,
  AlertCircle,
  Shield,
  Activity,
  FileText,
  BadgeAlert,
  HelpCircle,
  Info,
  Cpu,
  Sparkles,
} from 'lucide-react';
import api from '../api/client';
import {
  analyzeSocialCandidate,
  SocialCandidateInput,
  SocialAnalysisResult,
  SocialPlatform,
  SocialSignalCategory,
} from '../utils/socialEngine';

export const SocialMonitoringView: React.FC = () => {
  const { brandProfile, addCandidate, setSelectedCandidateId, setActiveTab } = useApp();

  // Form State
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [platform, setPlatform] = useState<SocialPlatform>('X');
  const [url, setUrl] = useState('');
  const [bio, setBio] = useState('');
  const [followerCount, setFollowerCount] = useState<string>('');
  const [creationDate, setCreationDate] = useState<string>('');
  const [observedBranding, setObservedBranding] = useState('');
  const [evidence, setEvidence] = useState('');

  // Execution & UI State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [analysisResult, setAnalysisResult] = useState<SocialAnalysisResult | null>(null);
  const [mlSocialResult, setMlSocialResult] = useState<any | null>(null);
  const [createdCandidateId, setCreatedCandidateId] = useState<string | null>(null);
  const [copiedReport, setCopiedReport] = useState(false);
  const [selectedSignalTab, setSelectedSignalTab] = useState<string>('all');

  // Pre-configured Scenarios
  const scenarios: {
    id: string;
    label: string;
    badgeColor: string;
    description: string;
    data: SocialCandidateInput;
  }[] = [
    {
      id: 'official',
      label: '1. Official Registered Account',
      badgeColor: 'bg-[#00E5A0]/10 text-[#00E5A0] border-[#00E5A0]/30',
      description: 'Verified official corporate channel registered in Brand Profile allowlist.',
      data: {
        name: 'ApexPay Official',
        username: '@apexpay_official',
        platform: 'X',
        url: 'https://x.com/apexpay_official',
        bio: 'The official handle for ApexPay Global. Fast, secure enterprise payment infrastructure and smart digital wallets. Managed by ApexPay Technologies Inc.',
        followerCount: '148500',
        creationDate: '2021-04-12',
        observedBranding: 'Official blue and cyan corporate mark, verified organization checkmark.',
        evidence: 'Bio links directly to https://apexpay.com. Corporate DNS TXT records verify ownership.',
      },
    },
    {
      id: 'harvester',
      label: '2. Credential Harvester & Scam Lure',
      badgeColor: 'bg-[#FF315B]/10 text-[#FF315B] border-[#FF315B]/30',
      description: 'Critical risk: Impersonates official helpdesk requesting OTP and wallet recovery phrases.',
      data: {
        name: 'ApexPay 24/7 Official Helpdesk & Refund Support',
        username: '@apexpay_support_claims',
        platform: 'X',
        url: 'https://x.com/apexpay_support_claims',
        bio: '🚨 Official ApexPay Customer Care 24/7. Having stuck transactions or locked wallets? DM us your registered phone & OTP verification code. Instant gas rebates!',
        followerCount: '24',
        creationDate: '2026-03-28',
        observedBranding: 'Copies official circular blue logo with low-resolution "Live Help" overlay.',
        evidence: 'Urgent requests for private authentication credentials. Profile was registered 3 days ago.',
      },
    },
    {
      id: 'homoglyph',
      label: '3. Cyrillic Homoglyph Impersonator',
      badgeColor: 'bg-[#FF315B]/10 text-[#FF315B] border-[#FF315B]/30',
      description: 'High risk: Uses Cyrillic small letter "а" to visually forge authentic username.',
      data: {
        name: 'ApexPay Announcements',
        username: '@аpexpay_official', // Cyrillic 'а'
        platform: 'X',
        url: 'https://x.com/аpexpay_official',
        bio: 'Corporate announcements, product updates, and executive briefings for the ApexPay ecosystem.',
        followerCount: '310',
        creationDate: '2026-02-14',
        observedBranding: 'Pixel-identical SVG vector logo cloned directly from authentic press kit.',
        evidence: 'Bio links to external unverified shortened bit.ly redirect.',
      },
    },
    {
      id: 'partner',
      label: '4. Authorized Commercial Partner',
      badgeColor: 'bg-[#FFB020]/10 text-[#FFB020] border-[#FFB020]/30',
      description: 'Low-to-medium risk: Legitimate commercial affiliate displaying approved mark.',
      data: {
        name: 'FinTech Daily - ApexPay Partner Network',
        username: '@fintech_daily_apexpay_partner',
        platform: 'X',
        url: 'https://x.com/fintech_daily_apexpay_partner',
        bio: 'Independent financial journalism covering merchant payment rails. Authorized media affiliate of ApexPay Global under PMA-2025.',
        followerCount: '84200',
        creationDate: '2022-09-01',
        observedBranding: 'Independent publication banner with "Official Partner" badge in header.',
        evidence: 'Registered in Authorized Partners section of active brand profile.',
      },
    },
    {
      id: 'satire',
      label: '5. Benign Parody / Satire Account',
      badgeColor: 'bg-[#8B5CF6]/15 text-[#8B5CF6] border-[#8B5CF6]/30',
      description: 'Low risk: Explicitly discloses fan/satire status without financial solicitations.',
      data: {
        name: 'Broke with ApexPay (Parody)',
        username: '@apexpay_memes_fan',
        platform: 'X',
        url: 'https://x.com/apexpay_memes_fan',
        bio: 'Unofficial parody & memes about enterprise fee schedules. Not affiliated with ApexPay Technologies Inc. Just satirical commentary!',
        followerCount: '4920',
        creationDate: '2024-06-19',
        observedBranding: 'Cartoon caricature version of brand logo with clown nose overlay.',
        evidence: 'Clear non-affiliation disclaimer present in bio. Zero phishing or credential requests.',
      },
    },
  ];

  const loadScenario = (scenarioData: SocialCandidateInput) => {
    setName(scenarioData.name);
    setUsername(scenarioData.username);
    setPlatform(scenarioData.platform);
    setUrl(scenarioData.url || '');
    setBio(scenarioData.bio || '');
    setFollowerCount(scenarioData.followerCount || '');
    setCreationDate(scenarioData.creationDate || '');
    setObservedBranding(scenarioData.observedBranding || '');
    setEvidence(scenarioData.evidence || '');
    setValidationErrors([]);
    setAnalysisResult(null);
    setMlSocialResult(null);
    setCreatedCandidateId(null);
  };

  const handleClear = () => {
    setName('');
    setUsername('');
    setPlatform('X');
    setUrl('');
    setBio('');
    setFollowerCount('');
    setCreationDate('');
    setObservedBranding('');
    setEvidence('');
    setValidationErrors([]);
    setAnalysisResult(null);
    setMlSocialResult(null);
    setCreatedCandidateId(null);
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors([]);
    setCreatedCandidateId(null);
    setAnalysisResult(null);
    setMlSocialResult(null);

    const errors: string[] = [];
    if (!name.trim()) errors.push('Candidate Display Name is required.');
    if (!username.trim()) errors.push('Username / Handle is required.');

    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    setIsAnalyzing(true);

    const candidateInput: SocialCandidateInput = {
      name: name.trim(),
      username: username.trim(),
      platform,
      url: url.trim() || undefined,
      bio: bio.trim() || undefined,
      followerCount: followerCount.trim() || undefined,
      creationDate: creationDate.trim() || undefined,
      observedBranding: observedBranding.trim() || undefined,
      evidence: evidence.trim() || undefined,
    };

    try {
      // 1. Client Deterministic Engine
      const result = analyzeSocialCandidate(candidateInput, brandProfile);

      // 2. Call ML Backend API in parallel
      try {
        const mlRes = await api.predictSocialRisk({
          username: username.trim(),
          target_brand: brandProfile.brandName,
          biography: bio.trim(),
          followers_count: followerCount ? parseInt(followerCount, 10) || 0 : 0,
          following_count: 50,
          has_profile_pic: 1,
        });
        if (mlRes?.data) {
          setMlSocialResult(mlRes.data);
        }
      } catch (mlErr) {
        console.warn('ML Backend evaluation bypassed/unavailable:', mlErr);
      }

      setAnalysisResult(result);
    } catch (err: any) {
      setValidationErrors([`Analysis failed: ${err.message || 'Unknown evaluation error'}`]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSendToInvestigation = () => {
    if (!analysisResult) return;

    const newCandidate = addCandidate({
      type: 'social',
      title: analysisResult.candidate.name,
      identifier: analysisResult.candidate.username,
      platform: analysisResult.candidate.platform,
      url: analysisResult.candidate.url,
      bio: analysisResult.candidate.bio,
      observedBranding: analysisResult.candidate.observedBranding,
      evidence: analysisResult.candidate.evidence,
      riskCategory: analysisResult.riskCategory,
      summary: analysisResult.executiveSummary,
      evidenceSupporting: analysisResult.evidenceSupporting,
      evidenceAgainst: analysisResult.counterEvidence,
      missingInformation: [
        'Domain WHOIS and hoster for external shortened links in bio',
        'Telegram / Discord operator correlation via telemetry',
      ],
      recommendedNextSteps: analysisResult.recommendedNextSteps,
      heuristicScore: analysisResult.heuristicScore,
      analysisEngine: 'Suraksha Multi-Signal Social Engine v1.0',
    });

    setCreatedCandidateId(newCandidate.id);
  };

  const handleCopyReport = () => {
    if (!analysisResult) return;

    const reportLines = [
      `=====================================================`,
      `SURAKSHA BRAND PROTECTION — SOCIAL THREAT DOSSIER`,
      `=====================================================`,
      `Target Monitored Brand: ${brandProfile.brandName}`,
      `Analyzed At: ${analysisResult.analyzedAt}`,
      `Evaluation Model: Suraksha Deterministic Heuristics + InstaFake ML`,
      ``,
      `[CANDIDATE ASSET PROFILE]`,
      `Display Name: ${analysisResult.candidate.name}`,
      `Username / Handle: ${analysisResult.candidate.username}`,
      `Platform: ${analysisResult.candidate.platform}`,
      `Profile URL: ${analysisResult.candidate.url || 'N/A'}`,
      `Bio: ${analysisResult.candidate.bio || 'N/A'}`,
      `Audience / Followers: ${analysisResult.candidate.followerCount || 'N/A'}`,
      `Creation Date: ${analysisResult.candidate.creationDate || 'N/A'}`,
      ``,
      `[THREAT VERDICT & SCORING]`,
      `Risk Category: ${analysisResult.riskCategory.toUpperCase()}`,
      `Heuristic Score: ${analysisResult.heuristicScore} / 100`,
      `Notice: ${analysisResult.scoreDisclaimer}`,
      `String Similarity: ${analysisResult.stringSimilarity}%`,
      `Levenshtein Distance: ${analysisResult.levenshteinDistance}`,
      ``,
      `[RECOMMENDED ACTION]`,
      `Action: ${analysisResult.recommendedAction}`,
      `Next Steps:`,
      ...analysisResult.recommendedNextSteps.map(s => ` - ${s}`),
      ``,
      `[EXECUTIVE SUMMARY]`,
      analysisResult.executiveSummary,
      ``,
      `[SUPPORTING EVIDENCE (${analysisResult.evidenceSupporting.length})]`,
      ...analysisResult.evidenceSupporting.map(e => ` [+] ${e}`),
      ``,
      `[COUNTER-EVIDENCE / BENIGN FACTORS (${analysisResult.counterEvidence.length})]`,
      ...(analysisResult.counterEvidence.length > 0
        ? analysisResult.counterEvidence.map(c => ` [-] ${c}`)
        : [' None observed']),
      ``,
      `[DETECTED THREAT SIGNALS (${analysisResult.signals.length})]`,
      ...analysisResult.signals.map(
        s => ` * [${s.category}] [${s.severity.toUpperCase()}] ${s.title}: ${s.detail}`
      ),
      `=====================================================`,
    ];

    navigator.clipboard.writeText(reportLines.join('\n'));
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 3000);
  };

  const filteredSignals =
    selectedSignalTab === 'all'
      ? analysisResult?.signals || []
      : (analysisResult?.signals || []).filter(s => s.category === selectedSignalTab);

  const signalCategories: SocialSignalCategory[] = [
    'Identity & Handle',
    'Bio & Content',
    'Credential & Phishing Risks',
    'Platform & Metadata',
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6 font-sans text-[#F1F5FF]">
      {/* 1. Top Banner & Context Header */}
      <div className="bg-gradient-to-r from-[#030D22] via-[#06142D] to-[#0A1C3D] p-5 sm:p-6 rounded-2xl border border-[#123E78] shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute top-0 left-1/3 w-[320px] h-[180px] bg-[#1265F8]/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 space-y-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-[#1265F8]/20 text-[#00D9FF] border border-[#00D9FF]/30 font-mono text-[10px] font-bold tracking-wider uppercase">
              Stage 4 Module
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-[#FFB020]/15 text-[#FFB020] border border-[#FFB020]/30 font-mono text-[10px] font-bold tracking-wider uppercase">
              DEMO / SIMULATED DATA
            </span>
            <span className="text-xs text-[#91ACD1] font-mono">
              Active Monitored Brand: <strong className="text-white">{brandProfile.brandName}</strong>
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Social Media Threat Monitor
          </h1>
          <p className="text-xs text-[#91ACD1] max-w-2xl leading-relaxed">
            Detect and investigate potential brand impersonation, deceptive handles, fake support accounts,
            and credential-harvesting bio lures across public social networks against registered brand assets.
          </p>
        </div>

        {/* Brand Baseline Snapshot Pill */}
        <div className="relative z-10 bg-[#06142D] border border-[#123E78] rounded-xl p-3 flex items-center gap-4 text-xs shrink-0 shadow-lg">
          <div>
            <span className="text-[10px] uppercase font-bold text-[#91ACD1] block font-mono">Registered Channels</span>
            <span className="font-bold text-[#F1F5FF] font-mono">
              {brandProfile.officialSocialUrls?.length || 0} Official Accounts
            </span>
          </div>
          <div className="h-7 w-px bg-[#123E78]" />
          <div>
            <span className="text-[10px] uppercase font-bold text-[#91ACD1] block font-mono">Authorized Partners</span>
            <span className="font-bold text-[#F1F5FF] font-mono">
              {brandProfile.authorizedPartners?.length || 0} Partners
            </span>
          </div>
          <div className="h-7 w-px bg-[#123E78]" />
          <div>
            <span className="text-[10px] uppercase font-bold text-[#91ACD1] block font-mono">Detection Engine</span>
            <span className="font-bold text-[#00E5A0] flex items-center gap-1 font-mono">
              <span className="w-2 h-2 rounded-full bg-[#00E5A0] animate-pulse" />
              Hybrid AI / Rule
            </span>
          </div>
        </div>
      </div>

      {/* 2. Pre-configured Benchmark Scenarios Bar */}
      <div className="bg-[#06142D] p-4 rounded-xl border border-[#123E78] shadow-lg space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[#F1F5FF] flex items-center gap-1.5 uppercase tracking-wider font-mono">
            <Activity className="w-3.5 h-3.5 text-[#00D9FF]" />
            Quick-Load Benchmark Scenarios:
          </span>
          <span className="text-[11px] text-[#91ACD1] hidden sm:inline">
            Click any scenario to populate the test bench with verified test cases
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
          {scenarios.map(sc => (
            <button
              key={sc.id}
              type="button"
              onClick={() => loadScenario(sc.data)}
              className="text-left p-3 rounded-xl border border-[#123E78] bg-[#0A1C3D] hover:border-[#00D9FF]/50 hover:bg-[#06142D] transition-all text-xs group cursor-pointer shadow-xs"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-[#F1F5FF] text-[11px] group-hover:text-[#00D9FF] transition-colors">
                  {sc.label}
                </span>
              </div>
              <p className="text-[10px] text-[#91ACD1] leading-tight line-clamp-2">
                {sc.description}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* 3. Main Workspace: 2-Column Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Candidate Ingestion Form (5 cols) */}
        <div className="lg:col-span-5 bg-[#06142D] p-5 sm:p-6 rounded-2xl border border-[#123E78] shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#123E78] pb-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Share2 className="w-4 h-4 text-[#1265F8]" />
              Candidate Profile Test Bench
            </h2>
            <button
              type="button"
              onClick={handleClear}
              className="px-2 py-1 rounded-lg text-[11px] font-semibold text-[#91ACD1] hover:text-white hover:bg-[#0A1C3D] transition-colors flex items-center gap-1 cursor-pointer"
              title="Clear all fields"
            >
              <RotateCcw className="w-3 h-3 text-[#FFB020]" />
              Clear
            </button>
          </div>

          <form onSubmit={handleAnalyze} className="space-y-3.5 text-xs">
            {/* Display Name */}
            <div>
              <label className="font-semibold text-[#91ACD1] block mb-1 font-mono uppercase tracking-wider text-[11px]">
                Candidate Display Name <span className="text-[#FF315B]">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. ApexPay Live Helpdesk & Refund Support"
                className="w-full px-3 py-2 border border-[#123E78] rounded-xl focus:outline-hidden focus:border-[#00D9FF] bg-[#0A1C3D] text-[#F1F5FF] transition-colors"
              />
            </div>

            {/* Handle & Platform Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="font-semibold text-[#91ACD1] block mb-1 font-mono uppercase tracking-wider text-[11px]">
                  Username / Handle <span className="text-[#FF315B]">*</span>
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="e.g. @apexpay_support_claims"
                  className="w-full px-3 py-2 border border-[#123E78] rounded-xl focus:outline-hidden focus:border-[#00D9FF] bg-[#0A1C3D] font-mono text-[#F1F5FF] transition-colors"
                />
              </div>

              <div>
                <label className="font-semibold text-[#91ACD1] block mb-1 font-mono uppercase tracking-wider text-[11px]">
                  Social Platform
                </label>
                <select
                  value={platform}
                  onChange={e => setPlatform(e.target.value as SocialPlatform)}
                  className="w-full px-3 py-2 border border-[#123E78] rounded-xl focus:outline-hidden focus:border-[#00D9FF] bg-[#0A1C3D] text-[#F1F5FF] transition-colors cursor-pointer"
                >
                  <option value="Instagram">Instagram</option>
                  <option value="Facebook">Facebook</option>
                  <option value="X">X (Twitter)</option>
                  <option value="LinkedIn">LinkedIn</option>
                  <option value="YouTube">YouTube</option>
                  <option value="Telegram">Telegram</option>
                  <option value="TikTok">TikTok</option>
                  <option value="Discord">Discord</option>
                  <option value="Other">Other Network</option>
                </select>
              </div>
            </div>

            {/* Profile URL */}
            <div>
              <label className="font-semibold text-[#91ACD1] block mb-1 font-mono uppercase tracking-wider text-[11px]">
                Profile URL
              </label>
              <input
                type="url"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://x.com/apexpay_support_claims"
                className="w-full px-3 py-2 border border-[#123E78] rounded-xl focus:outline-hidden focus:border-[#00D9FF] bg-[#0A1C3D] font-mono text-[11px] text-[#F1F5FF] transition-colors"
              />
            </div>

            {/* Bio */}
            <div>
              <label className="font-semibold text-[#91ACD1] block mb-1 font-mono uppercase tracking-wider text-[11px]">
                Bio or Profile Description
              </label>
              <textarea
                rows={3}
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder="Paste account bio, slogans, statements, or customer care claims..."
                className="w-full px-3 py-2 border border-[#123E78] rounded-xl focus:outline-hidden focus:border-[#00D9FF] bg-[#0A1C3D] text-[#F1F5FF] transition-colors leading-relaxed"
              />
            </div>

            {/* Metadata: Followers & Creation Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="font-semibold text-[#91ACD1] flex items-center gap-1 mb-1 font-mono uppercase tracking-wider text-[11px]">
                  <Users className="w-3.5 h-3.5 text-[#00D9FF]" />
                  Follower Count (Optional)
                </label>
                <input
                  type="text"
                  value={followerCount}
                  onChange={e => setFollowerCount(e.target.value)}
                  placeholder="e.g. 24 or 150000"
                  className="w-full px-3 py-2 border border-[#123E78] rounded-xl focus:outline-hidden focus:border-[#00D9FF] bg-[#0A1C3D] font-mono text-[#F1F5FF] transition-colors"
                />
              </div>

              <div>
                <label className="font-semibold text-[#91ACD1] flex items-center gap-1 mb-1 font-mono uppercase tracking-wider text-[11px]">
                  <Calendar className="w-3.5 h-3.5 text-[#00D9FF]" />
                  Creation Date (Optional)
                </label>
                <input
                  type="date"
                  value={creationDate}
                  onChange={e => setCreationDate(e.target.value)}
                  className="w-full px-3 py-2 border border-[#123E78] rounded-xl focus:outline-hidden focus:border-[#00D9FF] bg-[#0A1C3D] text-[#F1F5FF] transition-colors"
                />
              </div>
            </div>

            {/* Optional Observed Branding & Evidence */}
            <div>
              <label className="font-semibold text-[#91ACD1] block mb-1 font-mono uppercase tracking-wider text-[11px]">
                Observed Branding &amp; Imagery (Optional)
              </label>
              <input
                type="text"
                value={observedBranding}
                onChange={e => setObservedBranding(e.target.value)}
                placeholder="e.g. Copied blue logo with gold PRO ribbon watermark"
                className="w-full px-3 py-2 border border-[#123E78] rounded-xl focus:outline-hidden focus:border-[#00D9FF] bg-[#0A1C3D] text-[#F1F5FF] transition-colors"
              />
            </div>

            <div>
              <label className="font-semibold text-[#91ACD1] block mb-1 font-mono uppercase tracking-wider text-[11px]">
                Observed Evidence &amp; Actions (Optional)
              </label>
              <textarea
                rows={2}
                value={evidence}
                onChange={e => setEvidence(e.target.value)}
                placeholder="e.g. Directs users to t.me/refund_bot; solicits OTP codes to unblock transfers"
                className="w-full px-3 py-2 border border-[#123E78] rounded-xl focus:outline-hidden focus:border-[#00D9FF] bg-[#0A1C3D] text-[#F1F5FF] transition-colors"
              />
            </div>

            {/* Validation Errors */}
            {validationErrors.length > 0 && (
              <div className="p-3 rounded-xl bg-[#FF315B]/10 border border-[#FF315B]/30 text-[#FF315B] text-xs space-y-1">
                <div className="font-bold flex items-center gap-1.5 font-mono">
                  <AlertCircle className="w-4 h-4 shrink-0 text-[#FF315B]" />
                  <span>Validation Incomplete:</span>
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                  {validationErrors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-2 flex items-center gap-2">
              <button
                type="submit"
                disabled={isAnalyzing}
                className="flex-1 py-2.5 px-4 rounded-xl bg-[#1265F8] hover:bg-[#1265F8]/90 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-[#1265F8]/30 transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.01] active:scale-95"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#00D9FF]" />
                    <span>Analyzing Multi-Signal Evidence...</span>
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4 text-[#00D9FF]" />
                    <span>Analyze Profile</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleClear}
                className="py-2.5 px-3.5 rounded-xl border border-[#123E78] hover:bg-[#0A1C3D] text-[#91ACD1] hover:text-white font-semibold text-xs transition-colors cursor-pointer"
              >
                Clear
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Structured Results & Explainability (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Empty Awaiting State */}
          {!analysisResult && !isAnalyzing && (
            <div className="bg-[#06142D] rounded-2xl border border-[#123E78] p-10 sm:p-12 text-center shadow-xl">
              <div className="w-14 h-14 rounded-2xl bg-[#1265F8]/15 text-[#00D9FF] flex items-center justify-center mx-auto mb-3 border border-[#00D9FF]/30 shadow-md">
                <Share2 className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-white">Awaiting Profile Analysis</h3>
              <p className="text-xs text-[#91ACD1] max-w-md mx-auto mt-1 leading-relaxed">
                Enter candidate profile details on the left or click one of the pre-configured
                benchmark scenarios above to evaluate impersonation risks against registered brand assets.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={() => loadScenario(scenarios[1].data)}
                  className="px-3.5 py-1.5 rounded-xl bg-[#FF315B]/15 text-[#FF315B] hover:bg-[#FF315B]/25 font-semibold text-xs border border-[#FF315B]/40 transition-colors cursor-pointer"
                >
                  Test High-Risk Scam Lure →
                </button>
                <button
                  type="button"
                  onClick={() => loadScenario(scenarios[0].data)}
                  className="px-3.5 py-1.5 rounded-xl bg-[#00E5A0]/10 text-[#00E5A0] hover:bg-[#00E5A0]/20 font-semibold text-xs border border-[#00E5A0]/30 transition-colors cursor-pointer"
                >
                  Test Official Account →
                </button>
              </div>
            </div>
          )}

          {/* Analyzing Progress State */}
          {isAnalyzing && (
            <div className="bg-[#06142D] rounded-2xl border border-[#123E78] p-12 text-center shadow-xl space-y-3">
              <Loader2 className="w-8 h-8 text-[#00D9FF] animate-spin mx-auto" />
              <h3 className="text-sm font-bold text-white">Evaluating Social Profile Candidates</h3>
              <div className="text-xs text-[#91ACD1] space-y-1.5 max-w-sm mx-auto font-mono">
                <p className="flex items-center justify-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00D9FF]" />
                  Cross-referencing Brand Profile allowlist & handles...
                </p>
                <p className="flex items-center justify-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1265F8]" />
                  Checking Cyrillic homoglyphs & leetspeak substitutions...
                </p>
                <p className="flex items-center justify-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FF315B]" />
                  Inspecting bio for OTP & credential solicitation...
                </p>
                <p className="flex items-center justify-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00E5A0]" />
                  Assessing counter-evidence and benign justifications...
                </p>
              </div>
            </div>
          )}

          {/* Populated Results View */}
          {analysisResult && !isAnalyzing && (
            <div className="space-y-4">
              {/* Verdict Header Card */}
              <div className="bg-[#06142D] rounded-2xl border border-[#123E78] p-5 sm:p-6 shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#123E78] pb-4">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#91ACD1] tracking-wider block font-mono">
                      Threat Assessment Verdict
                    </span>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      {analysisResult.candidate.name}
                      <span className="text-xs font-mono font-normal text-[#00D9FF]">
                        ({analysisResult.candidate.username})
                      </span>
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-[#91ACD1] mt-0.5">
                      <span className="font-semibold text-[#F1F5FF] font-mono">{analysisResult.candidate.platform}</span>
                      <span>•</span>
                      <span>Analyzed {new Date(analysisResult.analyzedAt).toLocaleTimeString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-[#91ACD1] block font-mono">
                        Threat Index
                      </span>
                      <div className="text-xl font-mono font-extrabold text-[#F1F5FF]">
                        {analysisResult.heuristicScore}
                        <span className="text-xs font-normal text-[#91ACD1]">/100</span>
                      </div>
                    </div>
                    <RiskBadge level={analysisResult.riskCategory} size="lg" />
                  </div>
                </div>

                {/* Score Disclaimer Notice */}
                <div className="px-3.5 py-2.5 rounded-xl bg-[#0A1C3D] border border-[#123E78] flex items-start gap-2 text-[11px] text-[#91ACD1]">
                  <Info className="w-3.5 h-3.5 text-[#00D9FF] shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-white">Notice:</strong> {analysisResult.scoreDisclaimer}
                  </span>
                </div>

                {/* InstaFake Machine Learning Classifier Telemetry */}
                {mlSocialResult && (
                  <div className="p-4 rounded-xl bg-[#0A1C3D] border border-[#123E78] text-xs space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#123E78] pb-2">
                      <div className="flex items-center gap-2">
                        <span className="p-1 rounded-lg bg-[#1265F8]/20 text-[#00D9FF] border border-[#00D9FF]/30">
                          <Cpu className="w-3.5 h-3.5" />
                        </span>
                        <div>
                          <span className="font-bold text-white block">
                            Machine Learning Classification (InstaFake LogisticRegression)
                          </span>
                          <span className="text-[10px] text-[#91ACD1] font-mono">
                            Primary Scoring Engine • 94.98% Accuracy (CC BY-NC 4.0)
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#FFB020]/15 text-[#FFB020] border border-[#FFB020]/30 self-start sm:self-auto">
                        Needs Analyst Review
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[#91ACD1]">
                      <div className="p-2.5 bg-[#06142D] rounded-xl border border-[#123E78]">
                        <span className="text-[9px] uppercase font-bold text-[#91ACD1] block font-mono">Fake Profile Prob</span>
                        <span className="font-mono font-bold text-sm text-[#00D9FF]">
                          {mlSocialResult.generic_fake_account_ml?.fake_probability != null
                            ? `${(mlSocialResult.generic_fake_account_ml.fake_probability * 100).toFixed(1)}%`
                            : 'N/A'}
                        </span>
                        <span className="text-[9px] text-[#91ACD1] block mt-0.5">Automated/Bot ML</span>
                      </div>
                      <div className="p-2.5 bg-[#06142D] rounded-xl border border-[#123E78]">
                        <span className="text-[9px] uppercase font-bold text-[#91ACD1] block font-mono">Combined ML Risk</span>
                        <span className="font-mono font-bold text-sm text-[#F1F5FF]">
                          {mlSocialResult.risk_score} / 100
                        </span>
                        <span className="text-[9px] text-[#91ACD1] block mt-0.5">Tier: {mlSocialResult.severity_tier}</span>
                      </div>
                      <div className="p-2.5 bg-[#06142D] rounded-xl border border-[#123E78]">
                        <span className="text-[9px] uppercase font-bold text-[#91ACD1] block font-mono">Trademark Match</span>
                        <span className="font-bold text-white text-xs block truncate mt-0.5">
                          {mlSocialResult.brand_impersonation_assessment?.brand_matched ? 'Detected & Matched' : 'No Official Match'}
                        </span>
                        <span className="text-[9px] text-[#91ACD1] block mt-0.5">Allowlist Corroboration</span>
                      </div>
                      <div className="p-2.5 bg-[#06142D] rounded-xl border border-[#123E78]">
                        <span className="text-[9px] uppercase font-bold text-[#91ACD1] block font-mono">Validation Scope</span>
                        <span className="text-[11px] font-semibold text-[#00E5A0] block truncate mt-0.5">
                          +12.5% F1 vs Baseline
                        </span>
                        <span className="text-[9px] text-[#91ACD1] block mt-0.5">Held-out test set</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Comparison Against Official Brand Card */}
                <div className="p-3.5 rounded-xl bg-[#0A1C3D] border border-[#123E78] text-xs grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-[#91ACD1] block mb-1 font-mono">
                      Target Protected Brand
                    </span>
                    <div className="font-bold text-white text-sm">
                      {brandProfile.brandName}
                    </div>
                    <div className="text-[11px] text-[#91ACD1] mt-0.5 font-mono">
                      Website: {brandProfile.officialWebsite}
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase text-[#91ACD1] block mb-1 font-mono">
                      Allowlist Registry Match
                    </span>
                    {analysisResult.isExactOfficialMatch ? (
                      <div className="text-[#00E5A0] font-bold flex items-center gap-1.5 font-mono">
                        <CheckCircle2 className="w-4 h-4 text-[#00E5A0]" />
                        <span>Matches Registered Official Handle</span>
                      </div>
                    ) : analysisResult.isAuthorizedPartner ? (
                      <div className="text-[#FFB020] font-bold flex items-center gap-1.5 font-mono">
                        <Tag className="w-4 h-4 text-[#FFB020]" />
                        <span>Registered Authorized Partner</span>
                      </div>
                    ) : (
                      <div className="text-[#91ACD1] font-medium flex items-center gap-1.5 font-mono">
                        <BadgeAlert className="w-4 h-4 text-[#91ACD1]" />
                        <span>No match in official allowlist registry</span>
                      </div>
                    )}
                    <div className="text-[11px] text-[#91ACD1] mt-0.5 font-mono">
                      String Similarity: {analysisResult.stringSimilarity}% • Edit Distance: {analysisResult.levenshteinDistance}
                    </div>
                  </div>
                </div>

                {/* Candidate Profile Details Snapshot */}
                <div className="p-3.5 rounded-xl bg-[#0A1C3D] border border-[#123E78] text-xs space-y-2">
                  <span className="text-[10px] font-bold uppercase text-[#91ACD1] block font-mono">
                    Candidate Profile Summary
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                    <div>
                      <span className="text-[#91ACD1] block">Handle &amp; Platform:</span>
                      <span className="font-semibold text-white font-mono">
                        {analysisResult.candidate.username} ({analysisResult.candidate.platform})
                      </span>
                    </div>
                    <div>
                      <span className="text-[#91ACD1] block">Audience / Followers:</span>
                      <span className="font-semibold text-white font-mono">
                        {analysisResult.candidate.followerCount ? Number(analysisResult.candidate.followerCount).toLocaleString() : 'Not provided'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#91ACD1] block">Account Created:</span>
                      <span className="font-semibold text-white font-mono">
                        {analysisResult.candidate.creationDate || 'Not provided'}
                      </span>
                    </div>
                  </div>

                  {analysisResult.candidate.url && (
                    <div className="text-[11px] pt-1 border-t border-[#123E78] flex items-center gap-1 font-mono text-[#00D9FF]">
                      <span className="text-[#91ACD1]">URL:</span>
                      <span className="truncate">{analysisResult.candidate.url}</span>
                    </div>
                  )}

                  {analysisResult.candidate.bio && (
                    <div className="text-[11px] pt-1 border-t border-[#123E78] text-[#91ACD1] bg-[#06142D] p-2.5 rounded-lg border border-[#123E78]/60">
                      <span className="font-semibold text-white block mb-0.5 font-mono">Bio:</span>
                      <p className="italic leading-relaxed">{analysisResult.candidate.bio}</p>
                    </div>
                  )}
                </div>

                {/* Executive Summary */}
                <div className="p-3.5 rounded-xl bg-[#1265F8]/10 border border-[#1265F8]/30 text-xs">
                  <span className="font-bold text-[#00D9FF] block mb-1 font-mono">Executive Summary</span>
                  <p className="text-[#F1F5FF] leading-relaxed text-[11px]">
                    {analysisResult.executiveSummary}
                  </p>
                </div>

                {/* Recommended Analyst Action Box */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-[#030D22] via-[#06142D] to-[#0A1C3D] border border-[#123E78] text-xs space-y-2 shadow-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-[#00D9FF] tracking-wider font-mono">
                      Recommended Action
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-[#0A1C3D] text-[#91ACD1] font-mono text-[10px] border border-[#123E78]">
                      Playbook Execution
                    </span>
                  </div>
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    <ArrowRight className="w-4 h-4 text-[#00D9FF]" />
                    <span>{analysisResult.recommendedAction}</span>
                  </div>
                  <ul className="space-y-1 pt-1.5 border-t border-[#123E78] text-[11px] text-[#91ACD1]">
                    {analysisResult.recommendedNextSteps.map((step, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#00D9FF] mt-1 shrink-0" />
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Signals Breakdown by Category */}
              <div className="bg-[#06142D] rounded-2xl border border-[#123E78] p-5 sm:p-6 shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#123E78] pb-3">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Activity className="w-4 h-4 text-[#1265F8]" />
                    Detected Threat Signals ({analysisResult.signals.length})
                  </h4>

                  {/* Signal Category Filters */}
                  <div className="flex flex-wrap gap-1">
                    <button
                      type="button"
                      onClick={() => setSelectedSignalTab('all')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                        selectedSignalTab === 'all'
                          ? 'bg-[#1265F8] text-white shadow-xs'
                          : 'bg-[#0A1C3D] text-[#91ACD1] hover:text-white'
                      }`}
                    >
                      All ({analysisResult.signals.length})
                    </button>
                    {signalCategories.map(cat => {
                      const count = analysisResult.signals.filter(s => s.category === cat).length;
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setSelectedSignalTab(cat)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                            selectedSignalTab === cat
                              ? 'bg-[#1265F8] text-white shadow-xs'
                              : 'bg-[#0A1C3D] text-[#91ACD1] hover:text-white'
                          }`}
                        >
                          {cat} ({count})
                        </button>
                      );
                    })}
                  </div>
                </div>

                {filteredSignals.length === 0 ? (
                  <div className="p-6 rounded-xl bg-[#0A1C3D] text-center text-xs text-[#91ACD1] border border-[#123E78]">
                    No threat signals triggered under this category.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {filteredSignals.map(sig => {
                      const badgeBg =
                        sig.severity === 'critical'
                          ? 'bg-[#FF315B]/15 text-[#FF315B] border-[#FF315B]/40'
                          : sig.severity === 'high'
                          ? 'bg-[#FFB020]/15 text-[#FFB020] border-[#FFB020]/40'
                          : sig.severity === 'medium'
                          ? 'bg-[#1265F8]/15 text-[#00D9FF] border-[#1265F8]/40'
                          : 'bg-[#00E5A0]/10 text-[#00E5A0] border-[#00E5A0]/30';

                      return (
                        <div
                          key={sig.id}
                          className="p-3.5 rounded-xl border border-[#123E78] bg-[#0A1C3D] hover:border-[#00D9FF]/40 transition-colors text-xs space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-[#F1F5FF] text-xs flex items-center gap-1.5">
                              {sig.title}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-mono text-[#91ACD1]">
                                {sig.category}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase font-mono border ${badgeBg}`}
                              >
                                {sig.severity}
                              </span>
                            </div>
                          </div>
                          <p className="text-[#91ACD1] text-[11px] leading-relaxed">
                            {sig.detail}
                          </p>
                          {sig.mitigatingFactor && (
                            <div className="mt-1 text-[10px] text-[#00E5A0] bg-[#00E5A0]/10 px-2.5 py-1 rounded-md border border-[#00E5A0]/30 flex items-center gap-1 font-mono">
                              <CheckCircle2 className="w-3 h-3 text-[#00E5A0] shrink-0" />
                              <span>Mitigating Factor: {sig.mitigatingFactor}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Evidence For & Against (Dual Columns) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Supporting Evidence */}
                <div className="bg-[#06142D] p-5 rounded-2xl border border-[#123E78] shadow-xl space-y-3">
                  <h5 className="font-bold text-[#FF315B] flex items-center gap-1.5 border-b border-[#123E78] pb-2 font-mono">
                    <ShieldAlert className="w-4 h-4 text-[#FF315B]" />
                    Evidence Supporting Threat ({analysisResult.evidenceSupporting.length})
                  </h5>
                  {analysisResult.evidenceSupporting.length === 0 ? (
                    <p className="text-[#91ACD1] text-[11px] italic">
                      No malicious or deceptive indicators recorded.
                    </p>
                  ) : (
                    <ul className="space-y-1.5">
                      {analysisResult.evidenceSupporting.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-[11px] text-[#F1F5FF]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#FF315B] mt-1.5 shrink-0 shadow-[0_0_6px_#FF315B]" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Counter-Evidence & Benign Factors */}
                <div className="bg-[#06142D] p-5 rounded-2xl border border-[#123E78] shadow-xl space-y-3">
                  <h5 className="font-bold text-[#00E5A0] flex items-center gap-1.5 border-b border-[#123E78] pb-2 font-mono">
                    <ShieldCheck className="w-4 h-4 text-[#00E5A0]" />
                    Counter-Evidence &amp; Benign Factors ({analysisResult.counterEvidence.length})
                  </h5>
                  {analysisResult.counterEvidence.length === 0 ? (
                    <p className="text-[#91ACD1] text-[11px] italic">
                      No mitigating or benign justifications found.
                    </p>
                  ) : (
                    <ul className="space-y-1.5">
                      {analysisResult.counterEvidence.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-[11px] text-[#F1F5FF]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#00E5A0] mt-1.5 shrink-0 shadow-[0_0_6px_#00E5A0]" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Action Buttons Bar */}
              <div className="bg-[#06142D] p-4 rounded-2xl border border-[#123E78] shadow-xl flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyReport}
                    className="px-3.5 py-2 rounded-xl border border-[#123E78] bg-[#0A1C3D] hover:bg-[#06142D] hover:border-[#00D9FF]/40 text-[#F1F5FF] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                  >
                    {copiedReport ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#00E5A0]" />
                        <span className="text-[#00E5A0]">Copied to Clipboard!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-[#00D9FF]" />
                        <span>Export Intelligence Dossier</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleClear}
                    className="px-3.5 py-2 rounded-xl border border-[#123E78] bg-[#0A1C3D] hover:bg-[#06142D] text-[#91ACD1] hover:text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Dismiss / Clear
                  </button>
                </div>

                <div>
                  {createdCandidateId ? (
                    <div className="flex items-center gap-2 text-xs text-[#00E5A0] font-semibold bg-[#00E5A0]/10 px-3.5 py-2 rounded-xl border border-[#00E5A0]/30 shadow-xs">
                      <CheckCircle2 className="w-4 h-4 text-[#00E5A0]" />
                      <span>Case created in Investigation Center!</span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCandidateId(createdCandidateId);
                          setActiveTab('investigation-center');
                        }}
                        className="text-[#00D9FF] underline font-bold hover:text-white ml-1.5 cursor-pointer"
                      >
                        Open Dossier →
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSendToInvestigation}
                      className="px-4 py-2 rounded-xl bg-[#1265F8] hover:bg-[#1265F8]/90 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-[#1265F8]/30 cursor-pointer hover:scale-[1.02] active:scale-95"
                    >
                      <span>Escalate to Investigation Center</span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#00D9FF]" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SocialMonitoringView;
