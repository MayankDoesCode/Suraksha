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
  const { brandProfile, addCandidate, setActiveTab, setSelectedCandidateId, isDemoMode } = useApp();

  // Inputs: start clean for real users, populated for demo mode
  const [candidateName, setCandidateName] = useState(() => isDemoMode ? 'ApexPay Support Team' : '');
  const [candidateDomain, setCandidateDomain] = useState(() => isDemoMode ? 'apexpay-support.claims' : '');
  const [candidateDescription, setCandidateDescription] = useState(() =>
    isDemoMode ? 'Assisting users with transaction refunds, account unlock, and wallet recovery.' : ''
  );

  // Validation & Error State
  const [validationError, setValidationError] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(100);
  const [analysisStageText, setAnalysisStageText] = useState('Analysis Ready');
  const [analysisResult, setAnalysisResult] = useState<LookalikeAnalysisResult | null>(() => {
    if (!isDemoMode) return null;
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
      description: 'Omission typo missing vowel "e", Damerau-Levenshtein distance of 1.',
      badge: 'Levenshtein Dist 1',
    },
    {
      title: 'Hyphenated Brand Phish',
      category: 'High Threat',
      name: 'Apex-Pay Online',
      domain: 'apex-pay-login.com',
      description: 'Hyphen-separated brand token with credential solicitation intent.',
      badge: 'Hyphen Insertion',
    },
    {
      title: 'Bitsquatting Single Bitflip',
      category: 'Medium Threat',
      name: 'EpexPay Hub',
      domain: 'epexpay.com',
      description: 'Single ASCII bitflip on character "a" (0x61 -> 0x65 "e").',
      badge: 'Hardware Bitflip',
    },
    {
      title: 'Official Allowlisted Domain',
      category: 'Benign Allowlisted',
      name: 'ApexPay Corporate Portal',
      domain: 'apexpay.com',
      description: 'Authentic root domain registered in Official Brand Profile.',
      badge: 'Official Whitelist',
    },
    {
      title: 'Registered Partner Platform',
      category: 'Benign Allowlisted',
      name: 'FinTech Daily Media Hub',
      domain: 'fintechdaily.example',
      description: 'Authorized co-marketing distributor documented in brand profile.',
      badge: 'Partner Whitelist',
    },
    {
      title: 'Short Brand Token Substring',
      category: 'Low / Benign',
      name: 'Apex Logistics',
      domain: 'apex-logistics.net',
      description: 'Shares common English dictionary token "Apex" in unrelated logistics industry.',
      badge: 'Benign Token Match',
    },
    {
      title: 'Zero Brand Overlap',
      category: 'Low / Benign',
      name: 'Contoso Cloud',
      domain: 'contoso.org',
      description: 'Completely orthogonal domain and title with 0% string similarity.',
      badge: 'Zero Match Noise',
    },
  ];

  // Execution runner with simulated multi-stage progress
  const executeAnalysis = (name: string, domain: string, desc?: string) => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    setValidationError(null);
    setCaseCreatedSuccess(null);
    setAnalysisProgress(15);
    setAnalysisStageText('1/4: Normalizing Unicode NFKC & Extracting Domain FQDN...');

    setTimeout(() => {
      setAnalysisProgress(45);
      setAnalysisStageText('2/4: Computing Damerau-Levenshtein & Homoglyph Decomposition...');

      setTimeout(() => {
        setAnalysisProgress(75);
        setAnalysisStageText('3/4: Cross-referencing Official Whitelist & Lure Keywords...');

        setTimeout(() => {
          try {
            const result = runFullLookalikeAnalysis(name, domain, brandProfile, desc);
            setAnalysisResult(result);
            setAnalysisProgress(100);
            setAnalysisStageText('4/4: Heuristic Threat Vector Evaluation Completed');
          } catch (err: any) {
            setAnalysisError(err.message || 'Error occurred during algorithmic execution.');
          } finally {
            setIsAnalyzing(false);
          }
        }, 150);
      }, 150);
    }, 150);
  };

  const handleAnalyzeClick = () => {
    if (!candidateName.trim() && !candidateDomain.trim()) {
      setValidationError('Please enter either a candidate brand name or candidate domain to analyze.');
      return;
    }
    executeAnalysis(candidateName, candidateDomain, candidateDescription);
  };

  const handleSelectPreset = (preset: typeof benchmarkSuite[0]) => {
    setCandidateName(preset.name);
    setCandidateDomain(preset.domain);
    setCandidateDescription(preset.description);
    executeAnalysis(preset.name, preset.domain, preset.description);
  };

  const handleClear = () => {
    setCandidateName('');
    setCandidateDomain('');
    setCandidateDescription('');
    setAnalysisResult(null);
    setValidationError(null);
    setAnalysisError(null);
    setCaseCreatedSuccess(null);
  };

  const handleReset = () => {
    setCandidateName('ApexPay Support Team');
    setCandidateDomain('apexpay-support.claims');
    setCandidateDescription('Assisting users with transaction refunds, account unlock, and wallet recovery.');
    executeAnalysis(
      'ApexPay Support Team',
      'apexpay-support.claims',
      'Assisting users with transaction refunds, account unlock, and wallet recovery.'
    );
  };

  const handleCreateInvestigationCase = () => {
    if (!analysisResult) return;

    const newCandidate = addCandidate({
      type: 'domain',
      title: analysisResult.candidateName,
      identifier: analysisResult.candidateDomain,
      platform: 'Look-alike Domain / Web Presence',
      url: `https://${analysisResult.candidateDomain}`,
      description: analysisResult.candidateDescription,
      observedBranding: `Damerau Distance: ${analysisResult.damerauDistance}, Name Sim: ${analysisResult.nameSimilarityScore}%`,
      evidence: analysisResult.signals.map(s => `[${s.category}] ${s.title}: ${s.detail}`).join('; '),
      riskCategory: analysisResult.overallRiskCategory,
      summary: analysisResult.executiveSummary,
      evidenceSupporting: analysisResult.evidenceSupporting,
      evidenceAgainst: analysisResult.counterEvidence,
      missingInformation: [
        'Domain WHOIS registrant history and privacy proxy identity',
        'Passive DNS IP history and shared C2 infrastructure',
      ],
      recommendedNextSteps: analysisResult.recommendedNextSteps,
      heuristicScore: analysisResult.overallScore,
      analysisEngine: 'Suraksha Deterministic Look-alike Engine v1.0',
    });

    setCaseCreatedSuccess(newCandidate.id);
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
    <div className="max-w-6xl mx-auto space-y-6 font-sans text-[#F1F5FF]">
      {/* 1. Engine Overview Header */}
      <div className="bg-gradient-to-r from-[#030D22] via-[#06142D] to-[#0A1C3D] p-5 sm:p-6 rounded-2xl border border-[#123E78] shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute top-0 right-1/3 w-[320px] h-[180px] bg-[#8B5CF6]/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 space-y-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="p-1 rounded-lg bg-[#8B5CF6]/20 text-[#8B5CF6] border border-[#8B5CF6]/30">
              <Binary className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-[#8B5CF6] font-mono">
              Stage 3 — Look-alike Detection Engine
            </span>
            <span className="text-[10px] bg-[#0A1C3D] text-[#91ACD1] px-2 py-0.5 rounded-md font-mono border border-[#123E78]">
              Deterministic • Damerau-Levenshtein • Unicode NFKC
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Look-alike &amp; Typosquatting Detection Engine
          </h2>
          <p className="text-xs text-[#91ACD1] max-w-3xl leading-relaxed">
            Transparent, explainable algorithmic comparison analyzing candidate brand names and domains
            against registered assets in the <strong className="text-white">{brandProfile.brandName}</strong> Brand Profile.
          </p>
        </div>

        {analysisResult && (
          <div className="relative z-10 flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportReport}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#F1F5FF] bg-[#0A1C3D] hover:bg-[#06142D] border border-[#123E78] hover:border-[#00D9FF]/40 rounded-xl transition-all cursor-pointer shadow-xs"
            >
              {copiedReport ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#00E5A0]" />
                  <span className="text-[#00E5A0]">Copied to Clipboard</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-[#00D9FF]" />
                  <span>Export Report</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleCreateInvestigationCase}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#1265F8] hover:bg-[#1265F8]/90 rounded-xl transition-all shadow-md shadow-[#1265F8]/30 cursor-pointer hover:scale-[1.02] active:scale-95"
            >
              <FolderPlus className="w-3.5 h-3.5 text-[#00D9FF]" />
              <span>Escalate to Investigation</span>
            </button>
          </div>
        )}
      </div>

      {/* Case Creation Banner */}
      {caseCreatedSuccess && (
        <div className="p-4 rounded-xl bg-[#00E5A0]/10 border border-[#00E5A0]/30 text-[#00E5A0] text-xs flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2 font-mono">
            <CheckCircle2 className="w-4 h-4 text-[#00E5A0] shrink-0" />
            <span>
              Candidate successfully escalated to <strong>Investigation Center</strong> with ID{' '}
              <code className="bg-[#0A1C3D] px-1.5 py-0.5 rounded border border-[#00E5A0]/40 text-white">{caseCreatedSuccess}</code>.
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedCandidateId(caseCreatedSuccess);
              setActiveTab('investigation-center');
            }}
            className="font-bold underline text-[#00D9FF] hover:text-white flex items-center gap-1 cursor-pointer ml-2"
          >
            <span>Open in Investigation Center</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Validation or Analysis Error Alert */}
      {validationError && (
        <div className="p-4 rounded-xl bg-[#FF315B]/15 border border-[#FF315B]/40 text-[#FF315B] text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-[#FF315B] shrink-0 mt-0.5" />
          <div>
            <strong className="block font-bold font-mono">Input Validation Notice:</strong>
            <p className="mt-0.5">{validationError}</p>
          </div>
        </div>
      )}

      {analysisError && (
        <div className="p-4 rounded-xl bg-[#FF315B]/15 border border-[#FF315B]/40 text-[#FF315B] text-xs flex items-start gap-2.5">
          <AlertOctagon className="w-4 h-4 text-[#FF315B] shrink-0 mt-0.5" />
          <div>
            <strong className="block font-bold font-mono">Analysis Execution Error:</strong>
            <p className="mt-0.5">{analysisError}</p>
          </div>
        </div>
      )}

      {/* 2. Side-by-Side: Protected Official Brand vs Candidate Input Bench */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Official Brand Profile Reference Panel */}
        <div className="lg:col-span-4 bg-[#06142D] text-[#F1F5FF] p-5 rounded-2xl border border-[#123E78] shadow-xl flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-[#123E78] pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#00E5A0]" />
                <span className="text-xs font-bold uppercase tracking-wider text-[#91ACD1] font-mono">
                  Protected Official Profile
                </span>
              </div>
              <span className="text-[10px] bg-[#00E5A0]/10 text-[#00E5A0] border border-[#00E5A0]/30 px-2 py-0.5 rounded-full font-mono">
                Active Baseline
              </span>
            </div>

            <div>
              <span className="text-[11px] text-[#91ACD1] block font-mono">Monitored Brand:</span>
              <span className="text-lg font-bold text-white tracking-tight">{brandProfile.brandName}</span>
              {brandProfile.brandDescription && (
                <p className="text-[11px] text-[#91ACD1] mt-1 line-clamp-2 leading-relaxed">
                  {brandProfile.brandDescription}
                </p>
              )}
            </div>

            <div>
              <span className="text-[11px] text-[#91ACD1] block mb-1 font-mono">Registered Official Domains:</span>
              <div className="flex flex-wrap gap-1.5">
                {brandProfile.officialDomains.map((dom, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#0A1C3D] text-[#F1F5FF] font-mono text-[11px] border border-[#123E78]"
                  >
                    <Globe className="w-3 h-3 text-[#00E5A0]" />
                    {dom}
                  </span>
                ))}
              </div>
            </div>

            {brandProfile.authorizedPartners && brandProfile.authorizedPartners.length > 0 && (
              <div>
                <span className="text-[11px] text-[#91ACD1] block mb-1 font-mono">Registered Authorized Partners:</span>
                <div className="space-y-1">
                  {brandProfile.authorizedPartners.slice(0, 2).map((p, i) => (
                    <div
                      key={i}
                      className="text-[10px] bg-[#0A1C3D] px-2.5 py-1 rounded-lg border border-[#123E78] text-[#91ACD1] flex items-center justify-between"
                    >
                      <span className="text-white font-medium">{p.name}</span>
                      <span className="font-mono text-[#00D9FF]">{p.relationshipType}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-[#123E78] text-[11px] text-[#91ACD1] flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-[#00D9FF] shrink-0" />
            <span>
              All look-alike algorithms dynamically compare against this profile. Official assets are recognized and protected.
            </span>
          </div>
        </div>

        {/* Candidate Input Test Bench */}
        <div className="lg:col-span-8 bg-[#06142D] p-5 sm:p-6 rounded-2xl border border-[#123E78] shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#123E78] pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Search className="w-4 h-4 text-[#1265F8]" />
              Candidate Asset Test Bench
            </h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleClear}
                className="text-xs text-[#91ACD1] hover:text-white flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-[#0A1C3D] transition-colors cursor-pointer"
                title="Clear all fields and results"
              >
                <Eraser className="w-3 h-3 text-[#FFB020]" />
                <span>Clear</span>
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="text-xs text-[#91ACD1] hover:text-white flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-[#0A1C3D] transition-colors cursor-pointer"
                title="Reset to default demo test"
              >
                <RotateCcw className="w-3 h-3 text-[#00D9FF]" />
                <span>Reset</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
            <div>
              <label className="font-semibold text-[#91ACD1] block mb-1 font-mono uppercase tracking-wider text-[11px]">
                Candidate Brand Name <span className="text-[#FF315B]">*</span>
              </label>
              <input
                type="text"
                value={candidateName}
                onChange={e => {
                  setCandidateName(e.target.value);
                  if (validationError) setValidationError(null);
                }}
                placeholder="e.g. ApexPay Support Team or аpexpay"
                className="w-full px-3 py-2 text-xs font-mono border border-[#123E78] rounded-xl focus:outline-hidden focus:border-[#00D9FF] bg-[#0A1C3D] text-[#F1F5FF] transition-all"
              />
            </div>

            <div>
              <label className="font-semibold text-[#91ACD1] block mb-1 font-mono uppercase tracking-wider text-[11px]">
                Candidate Domain / URL <span className="text-[#FF315B]">*</span>
              </label>
              <input
                type="text"
                value={candidateDomain}
                onChange={e => {
                  setCandidateDomain(e.target.value);
                  if (validationError) setValidationError(null);
                }}
                placeholder="e.g. apexpay-support.claims or apexpay.claims-portal.com"
                className="w-full px-3 py-2 text-xs font-mono border border-[#123E78] rounded-xl focus:outline-hidden focus:border-[#00D9FF] bg-[#0A1C3D] text-[#F1F5FF] transition-all"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-[#91ACD1] block mb-1 font-mono uppercase tracking-wider text-[11px]">
              Candidate Description &amp; Observed Context <span className="text-[#91ACD1]/60 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              value={candidateDescription}
              onChange={e => setCandidateDescription(e.target.value)}
              placeholder="e.g. Customer support claiming to provide refunds, login credentials, or official updates"
              className="w-full px-3 py-2 text-xs border border-[#123E78] rounded-xl focus:outline-hidden focus:border-[#00D9FF] bg-[#0A1C3D] text-[#F1F5FF] transition-all"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <span className="text-[11px] text-[#91ACD1]">
              Evaluates Levenshtein edit distance, homoglyphs, subdomain abuse, lure keywords, and benign counter-evidence.
            </span>

            <button
              type="button"
              onClick={handleAnalyzeClick}
              disabled={isAnalyzing}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#1265F8] hover:bg-[#1265F8]/90 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-[#1265F8]/30 shrink-0 cursor-pointer hover:scale-[1.01] active:scale-95"
            >
              {isAnalyzing ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Analyzing Similarity...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-[#00D9FF]" />
                  <span>Analyze Similarity</span>
                </>
              )}
            </button>
          </div>

          {/* Analysis Progress Indicator */}
          {isAnalyzing && (
            <div className="p-3 bg-[#0A1C3D] border border-[#123E78] rounded-xl space-y-1.5 animate-pulse">
              <div className="flex items-center justify-between text-xs font-medium text-[#00D9FF] font-mono">
                <span>{analysisStageText}</span>
                <span className="font-bold">{analysisProgress}%</span>
              </div>
              <div className="w-full h-1.5 bg-[#06142D] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#1265F8] to-[#00D9FF] transition-all duration-300 rounded-full"
                  style={{ width: `${analysisProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. RESULTS PANEL */}
      {analysisResult ? (
        <div className="space-y-6">
          {/* Results Summary Header Banner */}
          <div className="bg-[#06142D] p-5 rounded-2xl border border-[#123E78] shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#00D9FF] bg-[#1265F8]/20 border border-[#00D9FF]/30 px-2 py-0.5 rounded-md font-mono">
                  Completed Analysis
                </span>
                <span className="text-xs text-[#91ACD1] font-mono flex items-center gap-1">
                  <Clock className="w-3 h-3 text-[#00D9FF]" />
                  {new Date(analysisResult.analyzedAt).toLocaleString()}
                </span>
              </div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Candidate Evaluation:</span>
                <span className="font-mono text-[#00D9FF]">"{analysisResult.candidateName}"</span>
                <span className="text-[#91ACD1] text-xs font-normal">vs</span>
                <span className="font-mono text-white">"{analysisResult.officialBrand}"</span>
              </h3>
              <p className="text-xs text-[#91ACD1] mt-0.5 font-mono">
                Evaluated Domain: <code className="text-[#F1F5FF] bg-[#0A1C3D] px-1.5 py-0.5 rounded border border-[#123E78]">{analysisResult.candidateDomain}</code>
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-[#91ACD1] block tracking-wider font-mono">
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
            <div className="bg-[#06142D] p-5 rounded-2xl border border-[#123E78] shadow-lg flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-[#91ACD1] block font-mono">Heuristic Score</span>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold font-mono text-white">
                    {analysisResult.overallScore}
                  </span>
                  <span className="text-xs text-[#91ACD1] font-mono">/ 100</span>
                </div>
                <span className="text-[10px] text-[#91ACD1] block mt-1 leading-tight">
                  Heuristic threat score out of 100.
                </span>
              </div>
              <div
                className={`p-3 rounded-2xl shrink-0 ${
                  analysisResult.overallRiskCategory === 'Critical'
                    ? 'bg-[#FF315B]/15 text-[#FF315B] border border-[#FF315B]/30'
                    : analysisResult.overallRiskCategory === 'High'
                    ? 'bg-[#FFB020]/15 text-[#FFB020] border border-[#FFB020]/30'
                    : analysisResult.overallRiskCategory === 'Medium'
                    ? 'bg-[#1265F8]/15 text-[#00D9FF] border border-[#1265F8]/30'
                    : 'bg-[#00E5A0]/10 text-[#00E5A0] border border-[#00E5A0]/30'
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
            <div className="bg-[#06142D] p-5 rounded-2xl border border-[#123E78] shadow-lg">
              <span className="text-xs font-semibold text-[#91ACD1] block font-mono">Name Similarity &amp; Distance</span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-white">
                  {analysisResult.nameSimilarityScore}%
                </span>
                <span className="text-xs text-[#91ACD1] font-mono">
                  (Dist: <strong className="text-[#00D9FF]">{analysisResult.damerauDistance}</strong>)
                </span>
              </div>
              <div className="text-[11px] text-[#91ACD1] mt-1 font-mono">
                Exact Match:{' '}
                <strong className={analysisResult.isExactNameMatch ? 'text-[#00E5A0]' : 'text-white'}>
                  {analysisResult.isExactNameMatch ? 'Yes (100%)' : 'No'}
                </strong>
              </div>
            </div>

            {/* 3. Domain Similarity & Subdomain Abuse */}
            <div className="bg-[#06142D] p-5 rounded-2xl border border-[#123E78] shadow-lg">
              <span className="text-xs font-semibold text-[#91ACD1] block font-mono">Domain Similarity &amp; Host</span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-white">
                  {analysisResult.domainSimilarityScore}%
                </span>
                <span className="text-xs font-mono text-[#00D9FF] truncate">
                  .{analysisResult.domainDetails?.extractedTLD || 'com'}
                </span>
              </div>
              <div className="text-[11px] text-[#91ACD1] mt-1 font-mono">
                Subdomain Abuse:{' '}
                <strong
                  className={
                    analysisResult.domainDetails?.isSubdomainAbuse ? 'text-[#FF315B]' : 'text-[#00E5A0]'
                  }
                >
                  {analysisResult.domainDetails?.isSubdomainAbuse ? 'FLAGGED' : 'Clean'}
                </strong>
              </div>
            </div>

            {/* 4. Whitelist / Authorized Asset Audit */}
            <div className="bg-[#06142D] p-5 rounded-2xl border border-[#123E78] shadow-lg">
              <span className="text-xs font-semibold text-[#91ACD1] block font-mono">Brand Authorization Audit</span>
              <div className="mt-1 flex items-center gap-1.5 font-mono">
                {analysisResult.isOfficialAsset ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-[#00E5A0] bg-[#00E5A0]/10 px-2.5 py-1 rounded-full border border-[#00E5A0]/30">
                    <ShieldCheck className="w-3.5 h-3.5" /> Official Protected
                  </span>
                ) : analysisResult.isAuthorizedPartner ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-[#FFB020] bg-[#FFB020]/10 px-2.5 py-1 rounded-full border border-[#FFB020]/30">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Authorized Partner
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-[#91ACD1] bg-[#0A1C3D] px-2.5 py-1 rounded-full border border-[#123E78]">
                    Unregistered Entity
                  </span>
                )}
              </div>
              <span className="text-[11px] text-[#91ACD1] mt-1 block">
                Official mark: <strong className="text-white">{brandProfile.brandName}</strong>
              </span>
            </div>
          </div>

          {/* Visual Glyph Decomposition & Character Highlighting */}
          <div className="bg-[#06142D] p-5 rounded-2xl border border-[#123E78] shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-[#123E78] pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#00D9FF]" />
                <h3 className="text-sm font-bold text-white">
                  Visual Glyph Decomposition &amp; Homoglyph Highlighting
                </h3>
              </div>
              <span className="text-xs text-[#91ACD1] font-mono">
                Baseline: <strong className="text-[#00D9FF]">{brandProfile.brandName}</strong>
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#0A1C3D] text-[#F1F5FF] space-y-2.5 border border-[#123E78]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[#91ACD1] font-mono uppercase tracking-wider">
                  Candidate String Glyphs ({analysisResult.candidateName.length} characters)
                </span>
                <div className="flex items-center gap-3 text-[10px]">
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded bg-[#FF315B] inline-block animate-pulse shadow-[0_0_6px_#FF315B]" />
                    Homoglyph / Confusable
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded bg-[#FFB020] inline-block" />
                    Separator / Delimiter
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded bg-[#123E78] inline-block" />
                    Standard Glyph
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 font-mono py-1">
                {analysisResult.candidateName.split('').map((char, idx) => {
                  const diff = analysisResult.characterDiffs.find(d => d.index === idx);
                  const isPunct = /[-_.]/.test(char);

                  return (
                    <span
                      key={idx}
                      className={`px-3 py-1.5 rounded-lg font-bold text-sm transition-all ${
                        diff
                          ? 'bg-[#FF315B] text-white shadow-md shadow-[#FF315B]/40 ring-2 ring-[#FF315B]/50'
                          : isPunct
                          ? 'bg-[#FFB020]/20 text-[#FFB020] border border-[#FFB020]/40'
                          : 'bg-[#06142D] text-[#F1F5FF] border border-[#123E78]'
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
                <div className="pt-2 border-t border-[#123E78] space-y-1">
                  <span className="text-[10px] uppercase font-bold text-[#FF315B] block tracking-wider font-mono">
                    Character Discrepancy Diagnostics:
                  </span>
                  {analysisResult.characterDiffs.map((diff, i) => (
                    <div key={i} className="text-xs text-[#FF315B] flex items-center gap-2">
                      <span className="font-mono bg-[#FF315B]/15 px-1.5 py-0.5 rounded border border-[#FF315B]/30 text-white">
                        '{diff.substituted}' (Pos {diff.index + 1})
                      </span>
                      <span>{diff.explanation}</span>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-xs text-[#91ACD1] pt-1 leading-relaxed border-t border-[#123E78]/60">
                {analysisResult.executiveSummary}
              </p>
            </div>
          </div>

          {/* Detailed Signals & Multi-Pillar Findings Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Reasons for Assessment & Signals Breakdown (8 cols) */}
            <div className="lg:col-span-8 bg-[#06142D] p-5 sm:p-6 rounded-2xl border border-[#123E78] shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-[#123E78] pb-3">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-[#1265F8]" />
                  Reasons for Assessment &amp; Detection Signals ({analysisResult.signals.length})
                </h4>
                <span className="text-[11px] text-[#91ACD1] font-mono">Heuristic Signal Breakdown</span>
              </div>

              {analysisResult.signals.length === 0 ? (
                <div className="p-6 rounded-xl bg-[#00E5A0]/10 border border-[#00E5A0]/30 text-[#00E5A0] text-xs flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#00E5A0] shrink-0" />
                  <div>
                    <strong className="block font-bold">No Adverse Typo-Squatting Signals</strong>
                    <p className="mt-0.5 text-[#91ACD1]">
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
                      className={`p-4 rounded-xl border text-xs transition-all space-y-1.5 ${
                        sig.severity === 'critical'
                          ? 'bg-[#FF315B]/10 border-[#FF315B]/40 text-[#F1F5FF]'
                          : sig.severity === 'high'
                          ? 'bg-[#FFB020]/10 border-[#FFB020]/40 text-[#F1F5FF]'
                          : sig.severity === 'medium'
                          ? 'bg-[#1265F8]/10 border-[#1265F8]/40 text-[#F1F5FF]'
                          : 'bg-[#0A1C3D] border-[#123E78] text-[#91ACD1]'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#06142D] font-bold border border-[#123E78] text-[#00D9FF]">
                            {sig.category}
                          </span>
                          <strong className="font-bold text-white">{sig.title}</strong>
                        </div>
                        <span
                          className={`text-[9px] uppercase font-bold font-mono px-2 py-0.5 rounded border w-fit ${
                            sig.severity === 'critical'
                              ? 'bg-[#FF315B]/20 text-[#FF315B] border-[#FF315B]/40'
                              : sig.severity === 'high'
                              ? 'bg-[#FFB020]/20 text-[#FFB020] border-[#FFB020]/40'
                              : sig.severity === 'medium'
                              ? 'bg-[#1265F8]/20 text-[#00D9FF] border-[#1265F8]/40'
                              : 'bg-[#00E5A0]/20 text-[#00E5A0] border-[#00E5A0]/40'
                          }`}
                        >
                          {sig.severity} Severity
                        </span>
                      </div>

                      <p className="text-xs text-[#91ACD1] leading-relaxed">{sig.detail}</p>

                      {sig.mitigatingFactor && (
                        <div className="mt-2 pt-2 border-t border-[#123E78]/60 text-[11px] text-[#00E5A0] flex items-start gap-1.5 font-mono">
                          <HelpCircle className="w-3.5 h-3.5 text-[#00E5A0] shrink-0 mt-0.5" />
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
              <div className="bg-[#06142D] p-5 rounded-2xl border border-[#123E78] shadow-xl space-y-3">
                <h5 className="text-xs font-bold uppercase tracking-wider text-[#FF315B] flex items-center gap-2 font-mono">
                  <AlertTriangle className="w-3.5 h-3.5 text-[#FF315B]" />
                  Supporting Evidence ({analysisResult.evidenceSupporting.length})
                </h5>

                {analysisResult.evidenceSupporting.length === 0 ? (
                  <p className="text-xs text-[#91ACD1] italic">No adverse threat evidence identified.</p>
                ) : (
                  <ul className="space-y-1.5 text-xs text-[#91ACD1]">
                    {analysisResult.evidenceSupporting.map((ev, i) => (
                      <li key={i} className="flex items-start gap-2 text-[#F1F5FF]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#FF315B] shrink-0 mt-1.5 shadow-[0_0_6px_#FF315B]" />
                        <span>{ev}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Counter-Evidence & Uncertainties */}
              <div className="bg-[#06142D] p-5 rounded-2xl border border-[#123E78] shadow-xl space-y-3">
                <h5 className="text-xs font-bold uppercase tracking-wider text-[#00E5A0] flex items-center gap-2 font-mono">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#00E5A0]" />
                  Counter-Evidence &amp; Uncertainties
                </h5>

                {analysisResult.counterEvidence.length === 0 ? (
                  <p className="text-xs text-[#91ACD1] italic">
                    No mitigating counter-evidence identified. High likelihood of adversarial targeting.
                  </p>
                ) : (
                  <ul className="space-y-1.5 text-xs text-[#91ACD1]">
                    {analysisResult.counterEvidence.map((ce, i) => (
                      <li key={i} className="flex items-start gap-2 text-[#F1F5FF]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#00E5A0] shrink-0 mt-1.5 shadow-[0_0_6px_#00E5A0]" />
                        <span>{ce}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Recommended Analyst Action & Next Steps */}
              <div className="bg-[#06142D] p-5 rounded-2xl border border-[#123E78] shadow-xl space-y-3">
                <h5 className="text-xs font-bold uppercase tracking-wider text-[#00D9FF] flex items-center gap-2 font-mono">
                  <ArrowRight className="w-3.5 h-3.5 text-[#00D9FF]" />
                  Recommended Analyst Action
                </h5>

                <div className="p-3 rounded-xl bg-[#0A1C3D] border border-[#123E78]">
                  <span className="text-[10px] font-bold uppercase text-[#00D9FF] tracking-wider block font-mono">
                    Playbook Action
                  </span>
                  <span className="text-xs font-bold text-white block mt-0.5">
                    {analysisResult.recommendedAction}
                  </span>
                </div>

                <div className="space-y-2 pt-1">
                  <span className="text-[11px] font-semibold text-[#91ACD1] block font-mono">
                    Prescribed Playbook Steps:
                  </span>
                  <ol className="space-y-1.5 text-xs text-[#91ACD1] list-decimal list-inside">
                    {analysisResult.recommendedNextSteps.map((step, idx) => (
                      <li key={idx} className="leading-relaxed text-[#F1F5FF]">
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="pt-2 border-t border-[#123E78]">
                  <button
                    type="button"
                    onClick={handleCreateInvestigationCase}
                    className="w-full py-2.5 px-3 text-xs font-bold text-center text-white bg-[#1265F8] hover:bg-[#1265F8]/90 rounded-xl transition-all shadow-md shadow-[#1265F8]/30 flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.01] active:scale-95"
                  >
                    <FolderPlus className="w-3.5 h-3.5 text-[#00D9FF]" />
                    <span>Ingest into Investigation Center</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="bg-[#06142D] p-10 rounded-2xl border border-[#123E78] shadow-xl text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-[#1265F8]/15 text-[#00D9FF] flex items-center justify-center mx-auto border border-[#00D9FF]/30 shadow-md">
            <Search className="w-7 h-7" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">No Candidate Analysis Loaded</h4>
            <p className="text-xs text-[#91ACD1] max-w-md mx-auto mt-1 leading-relaxed">
              Enter a candidate brand name and domain above and click <strong>Analyze Similarity</strong>, or pick a scenario from the Benchmark Validation Suite below to run deterministic heuristics.
            </p>
          </div>
          {isDemoMode && (
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0A1C3D] hover:bg-[#06142D] text-[#00D9FF] border border-[#123E78] hover:border-[#00D9FF]/40 text-xs font-semibold rounded-xl transition-colors cursor-pointer shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Load Demo Candidate</span>
            </button>
          )}
        </div>
      )}

      {/* 4. Benchmark Validation Suite (10 Preset Attack & Benign Scenarios) */}
      <div className="bg-[#06142D] p-5 rounded-2xl border border-[#123E78] shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#00D9FF]" />
            <h3 className="text-sm font-bold text-white">
              Benchmark Validation Suite ({benchmarkSuite.length} Test Scenarios)
            </h3>
          </div>
          <span className="text-[11px] text-[#91ACD1] hidden sm:inline">
            Click any scenario to populate inputs and immediately execute analysis
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
          {benchmarkSuite.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelectPreset(item)}
              className="p-3 rounded-xl bg-[#0A1C3D] hover:bg-[#06142D] border border-[#123E78] hover:border-[#00D9FF]/50 text-left transition-all group flex flex-col justify-between cursor-pointer shadow-xs"
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-md font-mono border ${
                      item.category.includes('Critical')
                        ? 'bg-[#FF315B]/15 text-[#FF315B] border-[#FF315B]/40'
                        : item.category.includes('High')
                        ? 'bg-[#FFB020]/15 text-[#FFB020] border-[#FFB020]/40'
                        : 'bg-[#00E5A0]/10 text-[#00E5A0] border-[#00E5A0]/30'
                    }`}
                  >
                    {item.badge}
                  </span>
                </div>
                <div className="text-[11px] font-bold text-[#F1F5FF] group-hover:text-[#00D9FF] truncate transition-colors">
                  {item.title}
                </div>
                <div className="text-[10px] font-mono text-[#91ACD1] truncate mt-0.5">{item.domain}</div>
              </div>
              <div className="text-[9px] text-[#91ACD1]/80 mt-1 line-clamp-1">{item.description}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LookalikeEngineView;
