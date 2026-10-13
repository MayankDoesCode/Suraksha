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
} from 'lucide-react';
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
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
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
      badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
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
        evidence: 'Prompts users to DM one-time passcodes and links to external unmonitored t.me/apexpay_refund_bot.',
      },
    },
    {
      id: 'homoglyph',
      label: '3. Homoglyph & Typosquatted Lure',
      badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
      description: 'High risk: Uses Cyrillic look-alike character with customer care claims.',
      data: {
        name: 'ApexP\u0430y Card Support', // uses Cyrillic small a (\u0430)
        username: '@apexpay_care_desk',
        platform: 'Instagram',
        url: 'https://instagram.com/apexpay_care_desk',
        bio: 'Resolving customer disputes for ApexPay virtual card holders. Click our recovery portal link below to submit payment claim tickets.',
        followerCount: '310',
        creationDate: '2026-02-10',
        observedBranding: 'Altered gradient logo with Cyrillic script homoglyph substitution in display name.',
        evidence: 'Directs users to uncataloged domain linktr.ee/apexpay_support_portal for claim filing.',
      },
    },
    {
      id: 'parody',
      label: '4. Parody & Commentary Account',
      badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      description: 'Mitigated risk: Explicit parody disclaimer identifying non-affiliation.',
      data: {
        name: 'ApexPay Memes & Parody',
        username: '@apexpay_parody',
        platform: 'X',
        url: 'https://x.com/apexpay_parody',
        bio: 'Parody and satirical memes about fintech transaction fees. Not affiliated with ApexPay Technologies. All opinions are humorous commentary.',
        followerCount: '12400',
        creationDate: '2023-11-05',
        observedBranding: 'Distorted comedic cartoon illustration of the ApexPay logo.',
        evidence: 'Posts satire comics about bank transfers. Clear parody disclaimer in header and bio.',
      },
    },
    {
      id: 'unrelated',
      label: '5. Unrelated Creative Entity',
      badgeColor: 'bg-slate-50 text-slate-700 border-slate-200',
      description: 'Low risk: Independent digital artist with coincidental syllable overlap.',
      data: {
        name: 'Apex Payne',
        username: '@apex_payne_art',
        platform: 'Instagram',
        url: 'https://instagram.com/apex_payne_art',
        bio: 'Apex Payne 🎨 Freelance 3D environment artist & concept designer. Unreal Engine 5 worlds, blender tutorials, sci-fi landscapes. Open for commissions!',
        followerCount: '4890',
        creationDate: '2022-08-14',
        observedBranding: 'Personal portrait avatar with sci-fi 3D digital art banner.',
        evidence: 'Portfolio consists entirely of Blender and 3D modeling files. Zero financial or payment references.',
      },
    },
  ];

  const loadScenario = (scenarioData: SocialCandidateInput) => {
    setValidationErrors([]);
    setAnalysisResult(null);
    setCreatedCandidateId(null);
    setCopiedReport(false);

    setName(scenarioData.name);
    setUsername(scenarioData.username);
    setPlatform(scenarioData.platform);
    setUrl(scenarioData.url);
    setBio(scenarioData.bio);
    setFollowerCount(scenarioData.followerCount ? String(scenarioData.followerCount) : '');
    setCreationDate(scenarioData.creationDate || '');
    setObservedBranding(scenarioData.observedBranding || '');
    setEvidence(scenarioData.evidence || '');
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
    setCreatedCandidateId(null);
    setCopiedReport(false);
  };

  const handleAnalyze = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const errors: string[] = [];
    if (!name.trim()) {
      errors.push('Candidate Display Name is required.');
    }
    if (!username.trim()) {
      errors.push('Candidate Username / Handle is required.');
    }
    if (url.trim() && !/^https?:\/\//i.test(url.trim())) {
      errors.push('Profile URL must start with http:// or https://');
    }

    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    setValidationErrors([]);
    setIsAnalyzing(true);
    setCreatedCandidateId(null);
    setCopiedReport(false);

    // Simulate realistic analytical pipeline execution latency
    setTimeout(() => {
      try {
        const candidatePayload: SocialCandidateInput = {
          name: name.trim(),
          username: username.trim(),
          platform,
          url: url.trim(),
          bio: bio.trim(),
          followerCount: followerCount.trim() ? followerCount.trim() : undefined,
          creationDate: creationDate.trim() ? creationDate.trim() : undefined,
          observedBranding: observedBranding.trim(),
          evidence: evidence.trim(),
        };

        const result = analyzeSocialCandidate(candidatePayload, brandProfile);
        setAnalysisResult(result);
      } catch (err: any) {
        console.error('Detection error:', err);
        setValidationErrors(['An unexpected error occurred during profile evaluation: ' + (err?.message || 'unknown')]);
      } finally {
        setIsAnalyzing(false);
      }
    }, 450);
  };

  const handleSendToInvestigation = () => {
    if (!analysisResult) return;

    const newCandidate = addCandidate({
      type: 'social',
      title: analysisResult.candidate.name,
      identifier: analysisResult.candidate.username,
      platform: analysisResult.candidate.platform,
      url: analysisResult.candidate.url,
      description: analysisResult.candidate.bio,
      observedBranding: analysisResult.candidate.observedBranding,
      evidence: analysisResult.candidate.evidence || analysisResult.executiveSummary,
      riskCategory: analysisResult.riskCategory,
      summary: analysisResult.executiveSummary,
      evidenceSupporting: analysisResult.evidenceSupporting,
      evidenceAgainst: analysisResult.evidenceAgainst,
      missingInformation: analysisResult.candidate.followerCount ? [] : ['Follower audience volume unverified'],
      recommendedNextSteps: analysisResult.recommendedNextSteps,
      impersonationIndicators: analysisResult.signals.map(s => `${s.title}: ${s.detail}`),
      conflictingEvidence: analysisResult.counterEvidence,
      isBenignExplanationPossible: analysisResult.isParodyOrCommentary || analysisResult.isAuthorizedPartner || analysisResult.isUnrelatedEntity,
      benignExplanation: analysisResult.counterEvidence.join(' ') || undefined,
      stringSimilarity: analysisResult.stringSimilarity,
      levenshteinDistance: analysisResult.levenshteinDistance,
      analysisEngine: 'Suraksha Deterministic Social Engine v4',
    });

    setCreatedCandidateId(newCandidate.id);
  };

  const handleCopyReport = () => {
    if (!analysisResult) return;

    const reportLines = [
      `=====================================================`,
      `SURAKSHA AI — SOCIAL MEDIA IMPERSONATION REPORT`,
      `Generated: ${analysisResult.analyzedAt}`,
      `Engine: Suraksha Deterministic Heuristic Engine v4`,
      `=====================================================`,
      ``,
      `[PROTECTED BRAND BASELINE]`,
      `Brand Name: ${brandProfile.brandName}`,
      `Official Website: ${brandProfile.officialWebsite}`,
      `Registered Domains: ${(brandProfile.officialDomains || []).join(', ')}`,
      ``,
      `[CANDIDATE SOCIAL PROFILE]`,
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
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Banner & Context Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full bg-slate-900 text-white font-mono text-[10px] font-bold tracking-wider uppercase">
              Stage 4 Module
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300 font-mono text-[10px] font-bold tracking-wider uppercase">
              DEMO / SIMULATED DATA
            </span>
            <span className="text-xs font-semibold text-slate-500">
              Active Monitored Brand: <strong className="text-slate-900">{brandProfile.brandName}</strong>
            </span>
          </div>

          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Social Media Monitoring
          </h1>
          <p className="text-xs text-slate-500 max-w-2xl mt-1">
            Detect and investigate potential brand impersonation, deceptive handles, fake support accounts,
            and credential-harvesting bio lures across public social networks against registered brand assets.
          </p>
        </div>

        {/* Brand Baseline Snapshot Pill */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center gap-4 text-xs shrink-0">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Registered Channels</span>
            <span className="font-bold text-slate-800">
              {brandProfile.officialSocialUrls?.length || 0} Official Accounts
            </span>
          </div>
          <div className="h-7 w-px bg-slate-200" />
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Authorized Partners</span>
            <span className="font-bold text-slate-800">
              {brandProfile.authorizedPartners?.length || 0} Partners
            </span>
          </div>
          <div className="h-7 w-px bg-slate-200" />
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Detection Mode</span>
            <span className="font-bold text-emerald-700 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Client Deterministic
            </span>
          </div>
        </div>
      </div>

      {/* Pre-configured Demo Scenarios Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
            <Activity className="w-3.5 h-3.5 text-blue-600" />
            Quick-Load Benchmark Scenarios:
          </span>
          <span className="text-[11px] text-slate-400">
            Click any scenario to populate the test bench with verified test cases
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
          {scenarios.map(sc => (
            <button
              key={sc.id}
              type="button"
              onClick={() => loadScenario(sc.data)}
              className="text-left p-2.5 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 transition-all text-xs group"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-slate-800 text-[11px] group-hover:text-blue-700">
                  {sc.label}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 leading-tight line-clamp-2">
                {sc.description}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Main Workspace: 2-Column Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Candidate Ingestion Form (5 cols) */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Share2 className="w-4 h-4 text-blue-600" />
              Candidate Profile Test Bench
            </h2>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleClear}
                className="px-2 py-1 rounded-md text-[11px] font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors flex items-center gap-1"
                title="Clear all fields"
              >
                <RotateCcw className="w-3 h-3" />
                Clear
              </button>
            </div>
          </div>

          <form onSubmit={handleAnalyze} className="space-y-3.5 text-xs">
            {/* Display Name */}
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Candidate Display Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. ApexPay Live Helpdesk & Refund Support"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-blue-600 transition-colors"
              />
            </div>

            {/* Handle & Platform Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Username / Handle <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="e.g. @apexpay_support_claims"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-blue-600 font-mono transition-colors"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Social Platform</label>
                <select
                  value={platform}
                  onChange={e => setPlatform(e.target.value as SocialPlatform)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-blue-600 bg-white transition-colors"
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
              <label className="font-semibold text-slate-700 block mb-1">Profile URL</label>
              <input
                type="url"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://x.com/apexpay_support_claims"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-blue-600 font-mono text-[11px] transition-colors"
              />
            </div>

            {/* Bio */}
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Bio or Profile Description
              </label>
              <textarea
                rows={3}
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder="Paste account bio, slogans, statements, or customer care claims..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-blue-600 transition-colors"
              />
            </div>

            {/* Metadata: Followers & Creation Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="font-semibold text-slate-700 flex items-center gap-1 mb-1">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  Follower Count (Optional)
                </label>
                <input
                  type="text"
                  value={followerCount}
                  onChange={e => setFollowerCount(e.target.value)}
                  placeholder="e.g. 24 or 150000"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-blue-600 font-mono transition-colors"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 flex items-center gap-1 mb-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Creation Date (Optional)
                </label>
                <input
                  type="date"
                  value={creationDate}
                  onChange={e => setCreationDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-blue-600 transition-colors"
                />
              </div>
            </div>

            {/* Optional Observed Branding & Evidence */}
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Observed Branding & Imagery (Optional)
              </label>
              <input
                type="text"
                value={observedBranding}
                onChange={e => setObservedBranding(e.target.value)}
                placeholder="e.g. Copied blue logo with gold PRO ribbon watermark"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-blue-600 transition-colors"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Observed Evidence & Actions (Optional)
              </label>
              <textarea
                rows={2}
                value={evidence}
                onChange={e => setEvidence(e.target.value)}
                placeholder="e.g. Directs users to t.me/refund_bot; solicits OTP codes to unblock transfers"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-blue-600 transition-colors"
              />
            </div>

            {/* Validation Errors */}
            {validationErrors.length > 0 && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>Validation Incomplete:</span>
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-[11px] text-rose-800">
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
                className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-slate-400 text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-2"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analyzing Deterministic Signals...</span>
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4" />
                    <span>Analyze Profile</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleClear}
                className="py-2.5 px-3.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 font-semibold text-xs transition-colors"
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
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3 border border-blue-100">
                <Share2 className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Awaiting Profile Analysis</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
                Enter candidate profile details on the left or click one of the pre-configured
                benchmark scenarios above to evaluate impersonation risks against registered brand assets.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={() => loadScenario(scenarios[1].data)}
                  className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 font-semibold text-xs border border-rose-200 transition-colors"
                >
                  Test High-Risk Scam Lure →
                </button>
                <button
                  type="button"
                  onClick={() => loadScenario(scenarios[0].data)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold text-xs border border-emerald-200 transition-colors"
                >
                  Test Official Account →
                </button>
              </div>
            </div>
          )}

          {/* Analyzing Progress State */}
          {isAnalyzing && (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs space-y-3">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
              <h3 className="text-sm font-bold text-slate-900">Evaluating Social Profile Candidates</h3>
              <div className="text-xs text-slate-500 space-y-1.5 max-w-sm mx-auto">
                <p className="flex items-center justify-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                  Cross-referencing Brand Profile allowlist & handles...
                </p>
                <p className="flex items-center justify-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                  Checking Cyrillic homoglyphs & leetspeak substitutions...
                </p>
                <p className="flex items-center justify-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                  Inspecting bio for OTP & credential solicitation...
                </p>
                <p className="flex items-center justify-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                  Assessing counter-evidence and benign justifications...
                </p>
              </div>
            </div>
          )}

          {/* Populated Results View */}
          {analysisResult && !isAnalyzing && (
            <div className="space-y-4">
              {/* Verdict Header Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                      Threat Assessment Verdict
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      {analysisResult.candidate.name}
                      <span className="text-xs font-mono font-normal text-slate-500">
                        ({analysisResult.candidate.username})
                      </span>
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                      <span className="font-semibold text-slate-700">{analysisResult.candidate.platform}</span>
                      <span>•</span>
                      <span>Analyzed {new Date(analysisResult.analyzedAt).toLocaleTimeString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Threat Index
                      </span>
                      <div className="text-xl font-mono font-extrabold text-slate-900">
                        {analysisResult.heuristicScore}
                        <span className="text-xs font-normal text-slate-400">/100</span>
                      </div>
                    </div>
                    <RiskBadge level={analysisResult.riskCategory} size="lg" />
                  </div>
                </div>

                {/* Score Disclaimer Notice */}
                <div className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 flex items-start gap-2 text-[11px] text-slate-600">
                  <Info className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Disclaimer:</strong> {analysisResult.scoreDisclaimer}
                  </span>
                </div>

                {/* Comparison Against Official Brand Card */}
                <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200 text-xs grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                      Target Protected Brand
                    </span>
                    <div className="font-bold text-slate-900 text-sm">
                      {brandProfile.brandName}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Website: {brandProfile.officialWebsite}
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                      Allowlist Registry Match
                    </span>
                    {analysisResult.isExactOfficialMatch ? (
                      <div className="text-emerald-700 font-bold flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Matches Registered Official Handle</span>
                      </div>
                    ) : analysisResult.isAuthorizedPartner ? (
                      <div className="text-amber-700 font-bold flex items-center gap-1.5">
                        <Tag className="w-4 h-4 text-amber-600" />
                        <span>Registered Authorized Partner</span>
                      </div>
                    ) : (
                      <div className="text-slate-600 font-medium flex items-center gap-1.5">
                        <BadgeAlert className="w-4 h-4 text-slate-400" />
                        <span>No match in official allowlist registry</span>
                      </div>
                    )}
                    <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
                      String Similarity: {analysisResult.stringSimilarity}% • Edit Distance: {analysisResult.levenshteinDistance}
                    </div>
                  </div>
                </div>

                {/* Candidate Profile Details Snapshot */}
                <div className="p-3.5 rounded-xl bg-white border border-slate-200 text-xs space-y-2">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">
                    Candidate Profile Summary
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-400 block">Handle & Platform:</span>
                      <span className="font-semibold text-slate-800">
                        {analysisResult.candidate.username} ({analysisResult.candidate.platform})
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Audience / Followers:</span>
                      <span className="font-semibold text-slate-800">
                        {analysisResult.candidate.followerCount ? Number(analysisResult.candidate.followerCount).toLocaleString() : 'Not provided'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Account Created:</span>
                      <span className="font-semibold text-slate-800">
                        {analysisResult.candidate.creationDate || 'Not provided'}
                      </span>
                    </div>
                  </div>

                  {analysisResult.candidate.url && (
                    <div className="text-[11px] pt-1 border-t border-slate-100 flex items-center gap-1 font-mono text-blue-600">
                      <span>URL:</span>
                      <span className="truncate">{analysisResult.candidate.url}</span>
                    </div>
                  )}

                  {analysisResult.candidate.bio && (
                    <div className="text-[11px] pt-1 border-t border-slate-100 text-slate-700 bg-slate-50 p-2 rounded-lg">
                      <span className="font-semibold text-slate-900 block mb-0.5">Bio:</span>
                      <p className="italic">{analysisResult.candidate.bio}</p>
                    </div>
                  )}
                </div>

                {/* Executive Summary */}
                <div className="p-3.5 rounded-xl bg-blue-50/40 border border-blue-200 text-xs">
                  <span className="font-bold text-blue-900 block mb-1">Executive Summary</span>
                  <p className="text-slate-800 leading-relaxed text-[11px]">
                    {analysisResult.executiveSummary}
                  </p>
                </div>

                {/* Recommended Analyst Action Box */}
                <div className="p-3.5 rounded-xl bg-slate-900 text-white text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-blue-400 tracking-wider">
                      Recommended Action
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono text-[10px]">
                      Playbook Execution
                    </span>
                  </div>
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    <ArrowRight className="w-4 h-4 text-blue-400" />
                    <span>{analysisResult.recommendedAction}</span>
                  </div>
                  <ul className="space-y-1 pt-1 border-t border-slate-800 text-[11px] text-slate-300">
                    {analysisResult.recommendedNextSteps.map((step, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1 shrink-0" />
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Signals Breakdown by Category */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-blue-600" />
                    Detected Threat Signals ({analysisResult.signals.length})
                  </h4>

                  {/* Signal Category Filters */}
                  <div className="flex flex-wrap gap-1">
                    <button
                      type="button"
                      onClick={() => setSelectedSignalTab('all')}
                      className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                        selectedSignalTab === 'all'
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
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
                          className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                            selectedSignalTab === cat
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {cat} ({count})
                        </button>
                      );
                    })}
                  </div>
                </div>

                {filteredSignals.length === 0 ? (
                  <div className="p-6 rounded-xl bg-slate-50 text-center text-xs text-slate-500">
                    No threat signals triggered under this category.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {filteredSignals.map(sig => {
                      const badgeBg =
                        sig.severity === 'critical'
                          ? 'bg-rose-100 text-rose-800 border-rose-300'
                          : sig.severity === 'high'
                          ? 'bg-amber-100 text-amber-800 border-amber-300'
                          : sig.severity === 'medium'
                          ? 'bg-blue-100 text-blue-800 border-blue-300'
                          : 'bg-emerald-100 text-emerald-800 border-emerald-300';

                      return (
                        <div
                          key={sig.id}
                          className="p-3 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                              {sig.title}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-mono text-slate-400">
                                {sig.category}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${badgeBg}`}
                              >
                                {sig.severity}
                              </span>
                            </div>
                          </div>
                          <p className="text-slate-600 text-[11px] leading-relaxed">
                            {sig.detail}
                          </p>
                          {sig.mitigatingFactor && (
                            <div className="mt-1 text-[10px] text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
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
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                  <h5 className="font-bold text-rose-800 flex items-center gap-1.5 border-b border-rose-100 pb-2">
                    <ShieldAlert className="w-4 h-4 text-rose-600" />
                    Evidence Supporting Threat ({analysisResult.evidenceSupporting.length})
                  </h5>
                  {analysisResult.evidenceSupporting.length === 0 ? (
                    <p className="text-slate-500 text-[11px] italic">
                      No malicious or deceptive indicators recorded.
                    </p>
                  ) : (
                    <ul className="space-y-1.5">
                      {analysisResult.evidenceSupporting.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-[11px] text-slate-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Counter-Evidence & Benign Factors */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                  <h5 className="font-bold text-emerald-800 flex items-center gap-1.5 border-b border-emerald-100 pb-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Counter-Evidence & Benign Factors ({analysisResult.counterEvidence.length})
                  </h5>
                  {analysisResult.counterEvidence.length === 0 ? (
                    <p className="text-slate-500 text-[11px] italic">
                      No mitigating or benign justifications found.
                    </p>
                  ) : (
                    <ul className="space-y-1.5">
                      {analysisResult.counterEvidence.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-[11px] text-slate-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Action Buttons Bar */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyReport}
                    className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    {copiedReport ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">Copied to Clipboard!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                        <span>Export Intelligence Dossier</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleClear}
                    className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-semibold transition-colors"
                  >
                    Dismiss / Clear
                  </button>
                </div>

                <div>
                  {createdCandidateId ? (
                    <div className="flex items-center gap-2 text-xs text-emerald-700 font-semibold bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Case created in Investigation Center!</span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCandidateId(createdCandidateId);
                          setActiveTab('investigation-center');
                        }}
                        className="text-blue-600 underline font-bold hover:text-blue-800 ml-1.5"
                      >
                        Open Dossier →
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSendToInvestigation}
                      className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors flex items-center gap-2 shadow-sm"
                    >
                      <span>Escalate to Investigation Center</span>
                      <ArrowRight className="w-3.5 h-3.5" />
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
