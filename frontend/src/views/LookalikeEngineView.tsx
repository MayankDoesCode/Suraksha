import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  runFullLookalikeAnalysis,
  LookalikeAnalysisResult,
  DetailedSignal,
} from '../utils/lookalikeEngine';
import { RiskBadge } from '../components/RiskBadge';
import {
  Binary,
  Search,
  Sparkles,
  ShieldAlert,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Tag,
  Info,
  Layers,
  ArrowRight,
  RotateCcw,
  Eraser,
  ShieldCheck,
  Globe,
  Sliders,
  FolderPlus,
  Copy,
  Check,
  AlertOctagon,
  HelpCircle,
  Clock,
  ExternalLink,
  ShieldX,
} from 'lucide-react';

export const LookalikeEngineView: React.FC = () => {
  const { brandProfile, addCandidate, setActiveTab, setSelectedCandidateId } = useApp();

  // Inputs
  const [candidateName, setCandidateName] = useState('ApexPay Support Team');
  const [candidateDomain, setCandidateDomain] = useState('apexpay-support.claims');
  const [candidateDescription, setCandidateDescription] = useState(
    'Assisting users with transaction refunds, account unlock, and wallet recovery.'
  );

  // Validation & Error State
  const [validationError, setValidationError] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(100);
  const [analysisStageText, setAnalysisStageText] = useState('Analysis Ready');
  const [analysisResult, setAnalysisResult] = useState<LookalikeAnalysisResult | null>(() => {
    try {
      return runFullLookalikeAnalysis(
        'ApexPay Support Team',
        'apexpay-support.claims',
        brandProfile,
        'Assisting users with transaction refunds, account unlock, and wallet recovery.'
      );
    } catch {
      return null;
    }
  });

  // Workflow feedback
  const [caseCreatedSuccess, setCaseCreatedSuccess] = useState<string | null>(null);
  const [copiedReport, setCopiedReport] = useState(false);

  // 10-Scenario Benchmark Suite
  const benchmarkSuite = [
    {
      title: 'Homoglyph IDN Spoofing',
      category: 'Critical Threat',
      name: 'аpexpay.com', // Contains Cyrillic 'а' (U+0430)
      domain: 'аpexpay.com',
      description: 'Zero-width characters and Cyrillic small letter "а" visually mimicking Latin "a".',
      badge: 'Cyrillic Homoglyph',
    },
    {
      title: 'Subdomain Brand Hijack',
      category: 'Critical Threat',
      name: 'ApexPay Claims Desk',
      domain: 'apexpay.claims-portal.com',
      description: 'Embeds brand name as subdomain prefix under rogue apex domain claims-portal.com.',
      badge: 'Subdomain Abuse',
    },
    {
      title: 'Lure Keyword Combosquat',
      category: 'High Threat',
      name: 'ApexPay Security Portal',
      domain: 'apexpay-security-login.xyz',
      description: 'Appends high-risk keywords "security" and "login" with suspicious .xyz TLD.',
      badge: 'Lure Words + .XYZ',
    },
    {
      title: 'Single-Character Typosquat',
      category: 'High Threat',
      name: 'ApxPay Portal',
      domain: 'apxpay.com',
      description: 'Drops vowel "e" to catch typing mistakes from mobile and desktop users.',
      badge: 'Edit Distance: 1',
    },
    {
      title: 'Adjacent Transposition',
      category: 'High Threat',
      name: 'AexpPay',
      domain: 'aexpypay.net',
      description: 'Adjacent character transposition ("ae" instead of "ap") to mimic official mark.',
      badge: 'Transposition',
    },
    {
      title: 'Separator & Punctuation Evasion',
      category: 'High Threat',
      name: 'Apex-Pay Official',
      domain: 'apex-pay-official.top',
      description: 'Uses hyphens and adds "official" claim under high-risk .top TLD.',
      badge: 'Separator Evasion',
    },
    {
      title: 'Deceptive TLD Swap',
      category: 'High Threat',
      name: 'ApexPay Global',
      domain: 'apexpay.app',
      description: 'Exact SLD match registered on third-party .app TLD without company authorization.',
      badge: 'TLD Replacement',
    },
    {
      title: 'Verified Official Asset',
      category: 'Benign / Protected',
      name: 'ApexPay',
      domain: brandProfile.officialDomains[0] || 'apexpay.com',
      description: 'Official corporate website registered in active Brand Profile.',
      badge: 'Protected Asset',
    },
    {
      title: 'Authorized Merchant Partner',
      category: 'Legitimate Partner',
      name: 'ShopSphere ApexPay Gateway',
      domain: 'shopsphere.io',
      description: 'Registered partner utilizing official API integration for checkout processing.',
      badge: 'Authorized Partner',
    },
    {
      title: 'Unrelated Dictionary Entity',
      category: 'Safe / Low',
      name: 'Apex Peak Mountain Equipment',
      domain: 'apexpeakoutdoors.org',
      description: 'Outdoor apparel manufacturer with no financial payment services or confusing trademarks.',
      badge: 'Benign Unrelated',
    },
  ];

  // Core Deterministic Analysis Function
  const executeAnalysis = (nameVal: string, domainVal: string, descVal: string) => {
    // 1. Validation
    const trimmedName = (nameVal || '').trim();
    const trimmedDomain = (domainVal || '').trim();

    if (!trimmedName) {
      setValidationError('Candidate Brand Name is required. Please provide a candidate name to analyze.');
      setAnalysisError(null);
      return;
    }

    if (!trimmedDomain) {
      setValidationError('Candidate Domain / URL is required. Please provide a domain to evaluate (e.g. example.com).');
      setAnalysisError(null);
      return;
    }

    if (/\s/.test(trimmedDomain)) {
      setValidationError('Candidate Domain / URL cannot contain whitespace. Please enter a valid hostname or URL.');
      setAnalysisError(null);
      return;
    }

    // Clear previous errors
    setValidationError(null);
    setAnalysisError(null);
    setIsAnalyzing(true);
    setAnalysisProgress(30);
    setAnalysisStageText('Normalizing Unicode & Calculating Edit Distance...');

    // Smooth UI transition then immediate deterministic evaluation
    setTimeout(() => {
      try {
        setAnalysisProgress(80);
        setAnalysisStageText('Checking Homoglyphs, Lures & Subdomain Abuse...');

        const result = runFullLookalikeAnalysis(
          trimmedName,
          trimmedDomain,
          brandProfile,
          (descVal || '').trim()
        );

        setAnalysisResult(result);
        setAnalysisProgress(100);
        setAnalysisStageText('Analysis Complete');
      } catch (err: any) {
        console.error('Lookalike analysis error:', err);
        setAnalysisError(
          err?.message || 'An error occurred during look-alike analysis. Please review your input and try again.'
        );
      } finally {
        setIsAnalyzing(false);
      }
    }, 220);
  };

  const handleAnalyzeClick = () => {
    executeAnalysis(candidateName, candidateDomain, candidateDescription);
  };

  const handleClear = () => {
    setCandidateName('');
    setCandidateDomain('');
    setCandidateDescription('');
    setAnalysisResult(null);
    setValidationError(null);
    setAnalysisError(null);
  };

  const handleReset = () => {
    const defaultName = 'ApexPay Support Team';
    const defaultDomain = 'apexpay-support.claims';
    const defaultDesc = 'Assisting users with transaction refunds, account unlock, and wallet recovery.';

    setCandidateName(defaultName);
    setCandidateDomain(defaultDomain);
    setCandidateDescription(defaultDesc);
    setValidationError(null);
    setAnalysisError(null);
    executeAnalysis(defaultName, defaultDomain, defaultDesc);
  };

  const handleSelectPreset = (preset: (typeof benchmarkSuite)[0]) => {
    setCandidateName(preset.name);
    setCandidateDomain(preset.domain);
    setCandidateDescription(preset.description);
    setValidationError(null);
    setAnalysisError(null);
    executeAnalysis(preset.name, preset.domain, preset.description);
  };

  // Convert analysis into an investigation case in AppContext
  const handleCreateInvestigationCase = () => {
    if (!analysisResult) return;

    const newCand = addCandidate({
      type: analysisResult.domainDetails?.normalizedHostname ? 'domain' : 'social',
      title: analysisResult.candidateName || analysisResult.candidateDomain || 'Look-alike Threat Candidate',
      identifier: analysisResult.candidateDomain || analysisResult.candidateName,
      platform: 'Web / Domain Name System',
      url: analysisResult.candidateDomain
        ? `https://${analysisResult.candidateDomain.replace(/^https?:\/\//, '')}`
        : 'https://lookalike-sample.internal',
      description: analysisResult.candidateDescription || 'Ingested via Suraksha Look-alike Detection Engine.',
      evidence: analysisResult.executiveSummary,
      riskCategory: analysisResult.overallRiskCategory,
      summary: analysisResult.executiveSummary,
      evidenceSupporting: analysisResult.evidenceSupporting,
      evidenceAgainst: analysisResult.evidenceAgainst,
      missingInformation: ['Domain WHOIS / RDAP ownership verification', 'Active MX record status check'],
      recommendedNextSteps: analysisResult.recommendedNextSteps,
      stringSimilarity: analysisResult.nameSimilarityScore,
      levenshteinDistance: analysisResult.damerauDistance,
      analysisEngine: 'Suraksha Deterministic Look-alike Engine v3.0',
    });

    setCaseCreatedSuccess(newCand.id);
    setTimeout(() => setCaseCreatedSuccess(null), 5000);
  };

  const handleExportReport = () => {
    if (!analysisResult) return;

    const reportText = `=====================================================
SURAKSHA BRAND PROTECTION — LOOK-ALIKE DETECTION REPORT
=====================================================
Protected Brand: ${brandProfile.brandName}
Official Domains: ${brandProfile.officialDomains.join(', ')}
Analysis Timestamp: ${analysisResult.analyzedAt}

CANDIDATE UNDER REVIEW:
- Candidate Name:   ${analysisResult.candidateName}
- Candidate Domain: ${analysisResult.candidateDomain}
- Candidate Notes:  ${analysisResult.candidateDescription || 'N/A'}

DETERMINISTIC EVALUATION METRICS:
- Overall Threat Risk:      ${analysisResult.overallRiskCategory.toUpperCase()} (${analysisResult.overallScore}/100)
  Note: Heuristic score out of 100, explicitly not a statistical probability of fraud.
- Name Similarity:          ${analysisResult.nameSimilarityScore}%
- Domain Similarity:        ${analysisResult.domainSimilarityScore}%
- Damerau-Levenshtein Dist: ${analysisResult.damerauDistance}
- Exact Name Match:         ${analysisResult.isExactNameMatch ? 'YES' : 'NO'}
- Official Whitelist Match: ${analysisResult.isOfficialAsset ? 'YES (Protected)' : 'NO'}

DETECTED SIGNALS (${analysisResult.signals.length}):
${analysisResult.signals.map(s => `[${s.severity.toUpperCase()}] ${s.title}: ${s.detail}`).join('\n')}

SUPPORTING EVIDENCE:
${analysisResult.evidenceSupporting.map(e => `• ${e}`).join('\n')}

COUNTER-EVIDENCE & UNCERTAINTIES:
${analysisResult.counterEvidence.map(c => `• ${c}`).join('\n')}

RECOMMENDED ANALYST ACTION:
${analysisResult.recommendedAction}

RECOMMENDED NEXT STEPS:
${analysisResult.recommendedNextSteps.map((s, i) => `${i + 1}. ${s}`).join('\n')}
=====================================================`;

    navigator.clipboard.writeText(reportText);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2500);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Engine Overview Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
              <Binary className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-900">
              Stage 3 — Look-alike Detection Engine
            </span>
            <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-mono font-medium">
              Deterministic • Damerau-Levenshtein • Unicode NFKC
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Look-alike & Typosquatting Detection Engine
          </h2>
          <p className="text-xs text-slate-500 max-w-3xl mt-0.5">
            Transparent, explainable algorithmic comparison analyzing candidate brand names and domains
            against registered assets in the <strong className="text-slate-800">{brandProfile.brandName}</strong> Brand Profile.
          </p>
        </div>

        {analysisResult && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportReport}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors"
            >
              {copiedReport ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Copied to Clipboard</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span>Export Report</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleCreateInvestigationCase}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-xs"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>Escalate to Investigation</span>
            </button>
          </div>
        )}
      </div>

      {/* Case Creation Banner */}
      {caseCreatedSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Candidate successfully escalated to <strong>Investigation Center</strong> with ID{' '}
              <code className="font-mono bg-emerald-100 px-1 py-0.5 rounded">{caseCreatedSuccess}</code>.
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedCandidateId(caseCreatedSuccess);
              setActiveTab('investigation-center');
            }}
            className="font-bold underline text-emerald-800 hover:text-emerald-950 flex items-center gap-1"
          >
            <span>Open in Investigation Center</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Validation or Analysis Error Alert */}
      {validationError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <strong className="block font-bold">Input Validation Notice:</strong>
            <p className="mt-0.5 text-rose-800">{validationError}</p>
          </div>
        </div>
      )}

      {analysisError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-2.5">
          <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <strong className="block font-bold">Analysis Execution Error:</strong>
            <p className="mt-0.5 text-rose-800">{analysisError}</p>
          </div>
        </div>
      )}

      {/* Side-by-Side: Protected Official Brand vs Candidate Input Bench */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Official Brand Profile Reference Panel */}
        <div className="lg:col-span-4 bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Protected Official Profile
                </span>
              </div>
              <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-full font-mono">
                Active Baseline
              </span>
            </div>

            <div>
              <span className="text-[11px] text-slate-400 block">Monitored Brand:</span>
              <span className="text-lg font-bold text-white tracking-tight">{brandProfile.brandName}</span>
              {brandProfile.brandDescription && (
                <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                  {brandProfile.brandDescription}
                </p>
              )}
            </div>

            <div>
              <span className="text-[11px] text-slate-400 block mb-1">Registered Official Domains:</span>
              <div className="flex flex-wrap gap-1.5">
                {brandProfile.officialDomains.map((dom, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-800 text-slate-200 font-mono text-[11px] border border-slate-700"
                  >
                    <Globe className="w-3 h-3 text-emerald-400" />
                    {dom}
                  </span>
                ))}
              </div>
            </div>

            {brandProfile.authorizedPartners && brandProfile.authorizedPartners.length > 0 && (
              <div>
                <span className="text-[11px] text-slate-400 block mb-1">Registered Authorized Partners:</span>
                <div className="space-y-1">
                  {brandProfile.authorizedPartners.slice(0, 2).map((p, i) => (
                    <div
                      key={i}
                      className="text-[10px] bg-slate-800/80 px-2 py-1 rounded border border-slate-700/80 text-slate-300 flex items-center justify-between"
                    >
                      <span>{p.name}</span>
                      <span className="font-mono text-slate-400">{p.relationshipType}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span>
              All look-alike algorithms dynamically compare against this profile. Official assets are recognized and protected from false-positive classification.
            </span>
          </div>
        </div>

        {/* Candidate Input Test Bench */}
        <div className="lg:col-span-8 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Search className="w-4 h-4 text-indigo-600" />
              Candidate Asset Test Bench
            </h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleClear}
                className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-100 transition-colors"
                title="Clear all fields and results"
              >
                <Eraser className="w-3 h-3" />
                <span>Clear</span>
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-100 transition-colors"
                title="Reset to default demo test"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Candidate Brand Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={candidateName}
                onChange={e => {
                  setCandidateName(e.target.value);
                  if (validationError) setValidationError(null);
                }}
                placeholder="e.g. ApexPay Support Team or аpexpay"
                className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-xl focus:outline-hidden focus:border-indigo-600 bg-slate-50/50"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Candidate Domain / URL <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={candidateDomain}
                onChange={e => {
                  setCandidateDomain(e.target.value);
                  if (validationError) setValidationError(null);
                }}
                placeholder="e.g. apexpay-support.claims or apexpay.claims-portal.com"
                className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-xl focus:outline-hidden focus:border-indigo-600 bg-slate-50/50"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Candidate Description & Observed Context <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              value={candidateDescription}
              onChange={e => setCandidateDescription(e.target.value)}
              placeholder="e.g. Customer support claiming to provide refunds, login credentials, or official updates"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:border-indigo-600 bg-slate-50/50"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <span className="text-[11px] text-slate-500">
              Evaluates Levenshtein edit distance, homoglyphs, subdomain abuse, lure keywords, and benign counter-evidence.
            </span>

            <button
              type="button"
              onClick={handleAnalyzeClick}
              disabled={isAnalyzing}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-xs font-bold rounded-xl transition-colors shadow-xs shrink-0 cursor-pointer"
            >
              {isAnalyzing ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Analyzing Similarity...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Analyze Similarity</span>
                </>
              )}
            </button>
          </div>

          {/* Analysis Progress Indicator */}
          {isAnalyzing && (
            <div className="p-3 bg-indigo-50/80 border border-indigo-200 rounded-xl space-y-1.5 animate-pulse">
              <div className="flex items-center justify-between text-xs font-medium text-indigo-900">
                <span>{analysisStageText}</span>
                <span className="font-mono font-bold">{analysisProgress}%</span>
              </div>
              <div className="w-full h-1.5 bg-indigo-200/60 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-600 transition-all duration-300 rounded-full"
                  style={{ width: `${analysisProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* RESULTS PANEL — DISPLAYED IMMEDIATELY BELOW CANDIDATE TEST BENCH */}
      {analysisResult ? (
        <div className="space-y-6">
          {/* Results Summary Header Banner */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                  Completed Analysis
                </span>
                <span className="text-xs text-slate-500 font-mono flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  {new Date(analysisResult.analyzedAt).toLocaleString()}
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Candidate Evaluation:</span>
                <span className="font-mono text-indigo-700">"{analysisResult.candidateName}"</span>
                <span className="text-slate-400 text-xs font-normal">vs</span>
                <span className="font-mono text-slate-800">"{analysisResult.officialBrand}"</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Evaluated Domain: <code className="font-mono text-slate-800 bg-slate-100 px-1 py-0.5 rounded">{analysisResult.candidateDomain}</code>
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Risk Category
                </span>
                <div className="mt-0.5">
                  <RiskBadge level={analysisResult.overallRiskCategory} size="lg" />
                </div>
              </div>
            </div>
          </div>

          {/* 4 Metric Cards Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Overall Heuristic Score */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-500 block">Heuristic Score</span>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold font-mono text-slate-900">
                    {analysisResult.overallScore}
                  </span>
                  <span className="text-xs text-slate-500">/ 100</span>
                </div>
                <span className="text-[10px] text-slate-400 block mt-1 leading-tight">
                  Heuristic score out of 100, explicitly not a probability of fraud.
                </span>
              </div>
              <div
                className={`p-3 rounded-2xl shrink-0 ${
                  analysisResult.overallRiskCategory === 'Critical'
                    ? 'bg-rose-50 text-rose-600'
                    : analysisResult.overallRiskCategory === 'High'
                    ? 'bg-amber-50 text-amber-600'
                    : analysisResult.overallRiskCategory === 'Medium'
                    ? 'bg-yellow-50 text-yellow-600'
                    : 'bg-emerald-50 text-emerald-600'
                }`}
              >
                {analysisResult.overallRiskCategory === 'Critical' ? (
                  <AlertOctagon className="w-6 h-6" />
                ) : analysisResult.overallRiskCategory === 'High' ? (
                  <ShieldAlert className="w-6 h-6" />
                ) : analysisResult.overallRiskCategory === 'Medium' ? (
                  <AlertTriangle className="w-6 h-6" />
                ) : (
                  <ShieldCheck className="w-6 h-6" />
                )}
              </div>
            </div>

            {/* 2. Damerau-Levenshtein Edit Distance & Name Similarity */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 block">Name Similarity & Edit Distance</span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-slate-900">
                  {analysisResult.nameSimilarityScore}%
                </span>
                <span className="text-xs text-slate-500">
                  (Dist: <strong className="font-mono text-slate-700">{analysisResult.damerauDistance}</strong>)
                </span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Exact Match:{' '}
                <strong className={analysisResult.isExactNameMatch ? 'text-indigo-600' : 'text-slate-600'}>
                  {analysisResult.isExactNameMatch ? 'Yes (100%)' : 'No'}
                </strong>
              </div>
            </div>

            {/* 3. Domain Similarity & Subdomain Abuse */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 block">Domain Similarity & Host</span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-slate-900">
                  {analysisResult.domainSimilarityScore}%
                </span>
                <span className="text-xs font-mono text-slate-600 truncate">
                  .{analysisResult.domainDetails?.extractedTLD || 'com'}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Subdomain Abuse:{' '}
                <strong
                  className={
                    analysisResult.domainDetails?.isSubdomainAbuse ? 'text-rose-600' : 'text-emerald-600'
                  }
                >
                  {analysisResult.domainDetails?.isSubdomainAbuse ? 'FLAGGED' : 'Clean'}
                </strong>
              </div>
            </div>

            {/* 4. Whitelist / Authorized Asset Audit */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 block">Brand Authorization Audit</span>
              <div className="mt-1 flex items-center gap-1.5">
                {analysisResult.isOfficialAsset ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    <ShieldCheck className="w-3.5 h-3.5" /> Official Protected
                  </span>
                ) : analysisResult.isAuthorizedPartner ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Authorized Partner
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full">
                    Unregistered Entity
                  </span>
                )}
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">
                Official mark: <strong>{brandProfile.brandName}</strong>
              </span>
            </div>
          </div>

          {/* Visual Glyph Decomposition & Character Highlighting */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Visual Glyph Decomposition & Homoglyph Highlighting
                </h3>
              </div>
              <span className="text-xs text-slate-500 font-mono">
                Baseline: <strong className="text-indigo-600">{brandProfile.brandName}</strong>
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 text-white space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-mono uppercase tracking-wider">
                  Candidate String Glyphs ({analysisResult.candidateName.length} characters)
                </span>
                <div className="flex items-center gap-3 text-[10px]">
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded bg-rose-500 inline-block animate-pulse" />
                    Homoglyph / Confusable
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded bg-amber-400 inline-block" />
                    Separator / Delimiter
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded bg-slate-700 inline-block" />
                    Standard Glyph
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1 font-mono py-1">
                {analysisResult.candidateName.split('').map((char, idx) => {
                  const diff = analysisResult.characterDiffs.find(d => d.index === idx);
                  const isPunct = /[-_.]/.test(char);

                  return (
                    <span
                      key={idx}
                      className={`px-2.5 py-1.5 rounded-lg font-bold text-sm transition-all ${
                        diff
                          ? 'bg-rose-500 text-white shadow-xs ring-2 ring-rose-400/50'
                          : isPunct
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40'
                          : 'bg-slate-800 text-slate-200'
                      }`}
                      title={
                        diff
                          ? diff.explanation
                          : isPunct
                          ? 'Punctuation or separator'
                          : `Unicode codepoint: U+${char.codePointAt(0)?.toString(16).toUpperCase()}`
                      }
                    >
                      {char === ' ' ? '␣' : char}
                    </span>
                  );
                })}
              </div>

              {analysisResult.characterDiffs.length > 0 && (
                <div className="pt-2 border-t border-slate-800 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-rose-400 block tracking-wider">
                    Character Discrepancy Diagnostics:
                  </span>
                  {analysisResult.characterDiffs.map((diff, i) => (
                    <div key={i} className="text-xs text-rose-200 flex items-center gap-2">
                      <span className="font-mono bg-rose-950 px-1.5 py-0.5 rounded border border-rose-800 text-rose-300">
                        '{diff.substituted}' (Pos {diff.index + 1})
                      </span>
                      <span>{diff.explanation}</span>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-xs text-slate-300 pt-1 leading-relaxed border-t border-slate-800/60">
                {analysisResult.executiveSummary}
              </p>
            </div>
          </div>

          {/* Detailed Signals & Multi-Pillar Findings Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Reasons for Assessment & Signals Breakdown (8 cols) */}
            <div className="lg:col-span-8 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-indigo-600" />
                  Reasons for Assessment & Detection Signals ({analysisResult.signals.length})
                </h4>
                <span className="text-[11px] text-slate-500">Heuristic Signal Breakdown</span>
              </div>

              {analysisResult.signals.length === 0 ? (
                <div className="p-6 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <strong className="block font-bold">No Adverse Typo-Squatting Signals</strong>
                    <p className="mt-0.5 text-emerald-700">
                      The candidate name and domain do not trigger homoglyph substitutions, lure keyword combosquatting,
                      subdomain abuse, or suspicious edit distance thresholds against "{brandProfile.brandName}".
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {analysisResult.signals.map((sig, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-xl border text-xs transition-all ${
                        sig.severity === 'critical'
                          ? 'bg-rose-50/70 border-rose-200 text-rose-950'
                          : sig.severity === 'high'
                          ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                          : sig.severity === 'medium'
                          ? 'bg-yellow-50/60 border-yellow-200 text-yellow-950'
                          : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/80 font-bold border border-slate-200">
                            {sig.category}
                          </span>
                          <strong className="font-bold text-slate-900">{sig.title}</strong>
                        </div>
                        <span
                          className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded w-fit ${
                            sig.severity === 'critical'
                              ? 'bg-rose-200 text-rose-800'
                              : sig.severity === 'high'
                              ? 'bg-amber-200 text-amber-800'
                              : sig.severity === 'medium'
                              ? 'bg-yellow-200 text-yellow-800'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {sig.severity} Severity
                        </span>
                      </div>

                      <p className="text-xs text-slate-700 leading-relaxed">{sig.detail}</p>

                      {sig.mitigatingFactor && (
                        <div className="mt-2 pt-2 border-t border-slate-200/60 text-[11px] text-slate-500 flex items-start gap-1.5">
                          <HelpCircle className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <span>
                            <strong>Uncertainty / Benign Possibility:</strong> {sig.mitigatingFactor}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right Column: Evidence, Counter-Evidence & Playbook (4 cols) */}
            <div className="lg:col-span-4 space-y-4">
              {/* Supporting Evidence */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  Supporting Evidence ({analysisResult.evidenceSupporting.length})
                </h5>

                {analysisResult.evidenceSupporting.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No adverse threat evidence identified.</p>
                ) : (
                  <ul className="space-y-1.5 text-xs text-slate-700">
                    {analysisResult.evidenceSupporting.map((ev, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0 mt-1.5" />
                        <span>{ev}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Counter-Evidence & Uncertainties */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Counter-Evidence & Uncertainties
                </h5>

                {analysisResult.counterEvidence.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">
                    No mitigating counter-evidence identified. High likelihood of adversarial targeting.
                  </p>
                ) : (
                  <ul className="space-y-1.5 text-xs text-slate-700">
                    {analysisResult.counterEvidence.map((ce, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
                        <span>{ce}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Recommended Analyst Action & Next Steps */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <ArrowRight className="w-3.5 h-3.5 text-indigo-600" />
                  Recommended Analyst Action
                </h5>

                <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-200">
                  <span className="text-[10px] font-bold uppercase text-indigo-800 tracking-wider block">
                    Playbook Action
                  </span>
                  <span className="text-xs font-bold text-indigo-950 block mt-0.5">
                    {analysisResult.recommendedAction}
                  </span>
                </div>

                <div className="space-y-2 pt-1">
                  <span className="text-[11px] font-semibold text-slate-600 block">
                    Prescribed Playbook Steps:
                  </span>
                  <ol className="space-y-1.5 text-xs text-slate-700 list-decimal list-inside">
                    {analysisResult.recommendedNextSteps.map((step, idx) => (
                      <li key={idx} className="leading-relaxed">
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleCreateInvestigationCase}
                    className="w-full py-2.5 px-3 text-xs font-bold text-center text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                    <span>Ingest into Investigation Center</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Empty State when no analysis result exists (e.g. after Clear) */
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xs text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <Search className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">No Candidate Analysis Loaded</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              Enter a candidate brand name and domain above and click <strong>Analyze Similarity</strong>, or pick a scenario from the Benchmark Validation Suite below to run deterministic heuristics.
            </p>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold rounded-xl transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Load Demo Candidate</span>
          </button>
        </div>
      )}

      {/* Benchmark Validation Suite (10 Preset Attack & Benign Scenarios) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Benchmark Validation Suite ({benchmarkSuite.length} Test Scenarios)
            </h3>
          </div>
          <span className="text-[11px] text-slate-500">
            Click any scenario to populate inputs and immediately execute analysis
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
          {benchmarkSuite.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelectPreset(item)}
              className="p-2.5 rounded-xl bg-slate-50 hover:bg-indigo-50/70 border border-slate-200 hover:border-indigo-300 text-left transition-all group flex flex-col justify-between cursor-pointer"
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                      item.category.includes('Critical')
                        ? 'bg-rose-100 text-rose-800'
                        : item.category.includes('High')
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {item.badge}
                  </span>
                </div>
                <div className="text-[11px] font-bold text-slate-900 group-hover:text-indigo-700 truncate">
                  {item.title}
                </div>
                <div className="text-[10px] font-mono text-indigo-600 truncate mt-0.5">{item.domain}</div>
              </div>
              <div className="text-[9px] text-slate-400 mt-1 line-clamp-1">{item.description}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
