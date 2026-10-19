import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  runFullLookalikeAnalysis,
  LookalikeAnalysisResult,
  DetailedSignal,
} from '../utils/lookalikeEngine';
import { RiskBadge } from '../components/RiskBadge';
import api from '../api/client';
import { DiscoverPanel } from '../components/DiscoverPanel';
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
  const { brandProfile, addCandidate, setActiveTab, isDemoMode, selectedBackendBrandId, backendOnline, refreshBackendData } = useApp();

  // Inputs: start clean for real users, populated for demo mode
  const [candidateName, setCandidateName] = useState(() => isDemoMode ? 'Acme Support Team' : '');
  const [candidateDomain, setCandidateDomain] = useState(() => isDemoMode ? 'acme-support.claims' : '');
  const [candidateDescription, setCandidateDescription] = useState(() =>
    isDemoMode ? 'Assisting users with transaction refunds, account unlock, and wallet recovery.' : ''
  );

  // Validation & Error State
  const [validationError, setValidationError] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Analysis State
  const [analysisResult, setAnalysisResult] = useState<LookalikeAnalysisResult | null>(() => {
    if (!isDemoMode) return null;
    try {
      return runFullLookalikeAnalysis(
        'Acme Support Team',
        'acme-support.claims',
        brandProfile,
        'Assisting users with transaction refunds, account unlock, and wallet recovery.'
      );
    } catch {
      return null;
    }
  });

  // Workflow feedback
  const [escalation, setEscalation] = useState<{ kind: 'saving' | 'ok' | 'info' | 'local' | 'error'; message: string } | null>(null);
  const [copiedReport, setCopiedReport] = useState(false);

  // 10-Scenario Benchmark Suite
  const benchmarkSuite = [
    {
      title: 'Homoglyph IDN Spoofing',
      category: 'Critical Threat',
      name: 'аcme.com', // Contains Cyrillic 'а' (U+0430)
      domain: 'аcme.com',
      description: 'Zero-width characters and Cyrillic small letter "а" visually mimicking Latin "a".',
      badge: 'Cyrillic Homoglyph',
    },
    {
      title: 'Subdomain Brand Hijack',
      category: 'Critical Threat',
      name: 'Acme Claims Desk',
      domain: 'acme.claims-portal.com',
      description: 'Embeds brand name as subdomain prefix under rogue root domain claims-portal.com.',
      badge: 'Subdomain Abuse',
    },
    {
      title: 'Lure Keyword Combosquat',
      category: 'High Threat',
      name: 'Acme Security Portal',
      domain: 'acme-security-login.xyz',
      description: 'Appends high-risk keywords "security" and "login" with suspicious .xyz TLD.',
      badge: 'Lure Words + .XYZ',
    },
    {
      title: 'Single-Character Typosquat',
      category: 'High Threat',
      name: 'Acmme Portal',
      domain: 'acmme.com',
      description: 'Character repetition typo with Damerau-Levenshtein distance of 1.',
      badge: 'Levenshtein Dist 1',
    },
    {
      title: 'Hyphenated Brand Phish',
      category: 'High Threat',
      name: 'Acme-Online Portal',
      domain: 'acme-online-login.com',
      description: 'Hyphen-separated brand token with credential solicitation intent.',
      badge: 'Hyphen Insertion',
    },
    {
      title: 'Vowel Substitution Spoof',
      category: 'Medium Threat',
      name: 'Ocme Hub',
      domain: 'ocme.com',
      description: 'Single character substitution typo (acme -> ocme).',
      badge: 'Vowel Substitution',
    },
    {
      title: 'Official Allowlisted Domain',
      category: 'Benign Allowlisted',
      name: 'Acme Corporate Portal',
      domain: 'acme.com',
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
      name: 'Global Logistics',
      domain: 'global-logistics.net',
      description: 'Shares common English dictionary token in unrelated logistics industry.',
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

  // The analysis runs synchronously in the browser, so there is no progress to report.
  const executeAnalysis = (name: string, domain: string, desc?: string) => {
    setAnalysisError(null);
    setValidationError(null);
    setEscalation(null);
    try {
      setAnalysisResult(runFullLookalikeAnalysis(name, domain, brandProfile, desc));
    } catch (err: any) {
      setAnalysisError(err.message || 'The analysis failed.');
    }
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
    setEscalation(null);
  };

  const handleReset = () => {
    setCandidateName('Acme Support Team');
    setCandidateDomain('acme-support.claims');
    setCandidateDescription('Assisting users with transaction refunds, account unlock, and wallet recovery.');
    executeAnalysis(
      'Acme Support Team',
      'acme-support.claims',
      'Assisting users with transaction refunds, account unlock, and wallet recovery.'
    );
  };

  const handleCreateInvestigationCase = async () => {
    if (!analysisResult) return;
    const domain = analysisResult.candidateDomain || analysisResult.candidateName;

    const saveLocally = (why: string) => {
      const created = addCandidate({
        type: 'domain',
        title: analysisResult.candidateName,
        identifier: analysisResult.candidateDomain,
        platform: 'Look-alike Domain / Web Presence',
        url: `https://${analysisResult.candidateDomain}`,
        description: analysisResult.candidateDescription,
        observedBranding: `Damerau Distance: ${analysisResult.damerauDistance}, Name Sim: ${analysisResult.nameSimilarityScore}%`,
        evidence: analysisResult.signals.map(sig => `[${sig.category}] ${sig.title}: ${sig.detail}`).join('; '),
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
        analysisEngine: 'Suraksha Deterministic Look-alike Engine v1.0 (browser)',
      });
      setEscalation({ kind: 'local', message: `Added to this session only (${why}). It is not saved and will be lost on refresh. Reference: ${created.id}.` });
    };

    // Demo data never leaves the browser.
    if (isDemoMode) return saveLocally('demo mode');
    if (!backendOnline) return saveLocally('backend unreachable');
    if (!selectedBackendBrandId) {
      setEscalation({ kind: 'error', message: 'Save a brand on the Brand page first. Findings are stored per brand.' });
      return;
    }

    setEscalation({ kind: 'saving', message: 'Re-checking on the backend and saving…' });
    try {
      const res = await api.scanCandidate(selectedBackendBrandId, {
        asset_type: 'domain',
        candidate_name: domain,
        display_name: analysisResult.candidateName,
        description: analysisResult.candidateDescription,
        source_url: `https://${analysisResult.candidateDomain}`,
      });
      const data = res?.data;
      if (data?.is_official || data?.excluded) {
        setEscalation({ kind: 'info', message: 'This domain matches a verified official asset, so no finding was created.' });
      } else if (!data?.finding) {
        setEscalation({ kind: 'info', message: `The backend detector found nothing to flag (score ${data?.final_risk_score ?? 0}). No finding was created.` });
      } else {
        await refreshBackendData();
        setEscalation({
          kind: 'ok',
          message: `Saved as a finding: ${data.severity || data.finding.severity || 'unrated'} severity, backend score ${data.final_risk_score}. The backend detector can differ from the browser analysis above.`,
        });
      }
    } catch (err: any) {
      setEscalation({ kind: 'error', message: `Not saved: ${err?.message || 'the backend request failed'}. You can retry.` });
    }
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
    <div className="w-full max-w-[1720px] mx-auto space-y-6 font-sans text-fg">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-fg">Domain similarity assessment</h2>
          <p className="mt-1 max-w-2xl text-xs sm:text-sm text-fgMuted leading-relaxed">
            Compare a suspected name or domain with verified assets of <span className="text-fg font-medium">{brandProfile.brandName || 'Acme Corp'}</span>:
            Levenshtein edit distance, homoglyphs, subdomain abuse, lure keywords, and counter-evidence. Analysis runs locally in your browser.
          </p>
        </div>
        {analysisResult && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportReport}
              className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-3 py-1.5 text-xs sm:text-sm text-fgMuted hover:bg-surface3 hover:text-fg transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
            >
              {copiedReport ? <Check className="h-4 w-4 text-ok" /> : <Copy className="h-4 w-4" />}
              {copiedReport ? 'Copied' : 'Copy report'}
            </button>
            <button
              type="button"
              onClick={handleCreateInvestigationCase}
              disabled={escalation?.kind === 'saving'}
              className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3.5 py-1.5 text-xs sm:text-sm font-medium text-onAccent hover:bg-accentHover disabled:opacity-50 transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <FolderPlus className="h-4 w-4" /> Escalate to investigation
            </button>
          </div>
        )}
      </div>

      {escalation && (
        <div
          role="status"
          className={`flex flex-wrap items-center justify-between gap-2 rounded-md border px-3.5 py-2 text-xs sm:text-sm ${
            escalation.kind === 'ok' ? 'border-ok/30 bg-ok/10 text-ok'
            : escalation.kind === 'error' ? 'border-danger/30 bg-danger/10 text-danger'
            : escalation.kind === 'local' ? 'border-warn/30 bg-warn/10 text-warn'
            : 'border-line bg-surface text-fgMuted'
          }`}
        >
          <span>{escalation.message}</span>
          {(escalation.kind === 'ok' || escalation.kind === 'local') && (
            <button type="button" onClick={() => setActiveTab('reports')} className="inline-flex items-center gap-1 font-medium underline">
              View findings <ArrowRight className="h-3 w-3" />
            </button>
          )}
        </div>
      )}

      {/* Validation or Analysis Error Alert */}
      {validationError && (
        <div role="alert" className="p-3.5 rounded-md bg-danger/10 border border-danger/30 text-danger text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
          <div>
            <strong className="block font-semibold">Input Validation Notice:</strong>
            <p className="mt-0.5">{validationError}</p>
          </div>
        </div>
      )}

      {analysisError && (
        <div role="alert" className="p-3.5 rounded-md bg-danger/10 border border-danger/30 text-danger text-xs flex items-start gap-2.5">
          <AlertOctagon className="w-4 h-4 text-danger shrink-0 mt-0.5" />
          <div>
            <strong className="block font-semibold">Analysis Execution Error:</strong>
            <p className="mt-0.5">{analysisError}</p>
          </div>
        </div>
      )}

      {/* 2. Side-by-Side: Protected Official Brand vs Candidate Input Bench */}
      {/* Side-by-Side: Protected Official Brand vs Candidate Input Bench */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Official Brand Profile Reference Panel */}
        <div className="lg:col-span-4 bg-surface text-fg p-5 rounded-xl border border-line flex flex-col justify-between space-y-4 shadow-panel">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-ok" />
                <span className="text-xs font-medium text-fgSubtle">
                  Protected baseline
                </span>
              </div>
              <span className="text-[11px] bg-ok/10 text-ok border border-ok/30 px-2 py-0.5 rounded-full font-mono">
                Allowlisted
              </span>
            </div>

            <div>
              <span className="text-xs text-fgMuted block font-mono">Monitored Brand:</span>
              <span className="text-lg font-semibold text-fg tracking-tight">{brandProfile.brandName || 'Acme Corp'}</span>
              <p className="text-xs text-fgMuted mt-1 line-clamp-2 leading-relaxed">
                {brandProfile.brandDescription || 'Primary enterprise brand baseline with verified domains and monitored digital assets.'}
              </p>
            </div>

            <div>
              <span className="text-xs text-fgMuted block mb-1.5 font-mono">Registered Official Domains:</span>
              <div className="flex flex-wrap gap-1.5">
                {(brandProfile.officialDomains?.length ? brandProfile.officialDomains : ['acme.com', 'acme.io']).map((dom, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface2 text-fg font-mono text-xs border border-line"
                  >
                    <Globe className="w-3 h-3 text-ok" />
                    {dom}
                  </span>
                ))}
              </div>
            </div>

            {brandProfile.authorizedPartners && brandProfile.authorizedPartners.length > 0 && (
              <div>
                <span className="text-xs text-fgMuted block mb-1.5 font-mono">Registered Authorized Partners:</span>
                <div className="space-y-1">
                  {brandProfile.authorizedPartners.slice(0, 2).map((p, i) => (
                    <div
                      key={i}
                      className="text-xs bg-surface2 px-2.5 py-1 rounded-md border border-line text-fgMuted flex items-center justify-between"
                    >
                      <span className="text-fg font-medium">{p.name}</span>
                      <span className="font-mono text-accent text-[11px]">{p.relationshipType}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-line text-xs text-fgMuted flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-accent shrink-0" />
            <span>
              All look-alike heuristics compare against this profile. Official assets are recognized and excluded from alerts.
            </span>
          </div>
        </div>

        {/* Candidate Input Test Bench */}
        <div className="lg:col-span-8 bg-surface p-5 sm:p-6 rounded-xl border border-line space-y-4 shadow-panel">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <h3 className="text-sm font-semibold text-fg flex items-center gap-2">
              <Search className="w-4 h-4 text-accent" />
              Candidate Asset Test Bench
            </h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleClear}
                className="text-xs text-fgMuted hover:text-fg flex items-center gap-1 px-2.5 py-1 rounded-md hover:bg-surface2 transition-colors cursor-pointer"
                title="Clear all fields and results"
              >
                <Eraser className="w-3 h-3 text-warn" />
                <span>Clear</span>
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="text-xs text-fgMuted hover:text-fg flex items-center gap-1 px-2.5 py-1 rounded-md hover:bg-surface2 transition-colors cursor-pointer"
                title="Reset to default demo test"
              >
                <RotateCcw className="w-3 h-3 text-accent" />
                <span>Reset</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
            <div>
              <label className="font-medium text-fgSubtle block mb-1 text-xs">
                Candidate Brand Name <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                value={candidateName}
                onChange={e => {
                  setCandidateName(e.target.value);
                  if (validationError) setValidationError(null);
                }}
                placeholder="e.g. Brand Support Team or lookalike domain"
                className="w-full px-3 py-2 text-xs font-mono border border-line rounded-md focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent bg-surface2 text-fg placeholder:text-fgSubtle transition-colors"
              />
            </div>

            <div>
              <label className="font-medium text-fgSubtle block mb-1 text-xs">
                Candidate Domain / URL <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                value={candidateDomain}
                onChange={e => {
                  setCandidateDomain(e.target.value);
                  if (validationError) setValidationError(null);
                }}
                placeholder="e.g. brand-support.claims or auth-verify-login.xyz"
                className="w-full px-3 py-2 text-xs font-mono border border-line rounded-md focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent bg-surface2 text-fg placeholder:text-fgSubtle transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="font-medium text-fgSubtle block mb-1 text-xs">
              Candidate Description &amp; Observed Context <span className="text-fgMuted/60 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              value={candidateDescription}
              onChange={e => setCandidateDescription(e.target.value)}
              placeholder="e.g. Customer support claiming to provide refunds, login credentials, or official updates"
              className="w-full px-3 py-2 text-xs border border-line rounded-md focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent bg-surface2 text-fg placeholder:text-fgSubtle transition-colors"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-line/60">
            <span className="text-xs text-fgMuted">
              Evaluates Levenshtein edit distance, homoglyphs, subdomain abuse, lure keywords, and benign counter-evidence.
            </span>

            <button
              type="button"
              onClick={handleAnalyzeClick}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-accent hover:bg-accentHover disabled:opacity-50 text-onAccent text-xs sm:text-sm font-medium rounded-md transition-colors shadow-sm shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Analyze similarity</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. RESULTS PANEL */}
      {analysisResult ? (
        <div className="space-y-6">
          {/* Results Summary Header Banner */}
          <div className="bg-surface p-5 rounded-xl border border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-panel">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-medium text-accent bg-accent/10 border border-accent/20 px-2 py-0.5 rounded">
                  Completed Analysis
                </span>
                <span className="text-xs text-fgMuted font-mono flex items-center gap-1">
                  <Clock className="w-3 h-3 text-fgSubtle" />
                  {new Date(analysisResult.analyzedAt).toLocaleString()}
                </span>
              </div>
              <h3 className="text-base font-semibold text-fg flex items-center gap-2 flex-wrap">
                <span>Candidate Evaluation:</span>
                <span className="font-mono text-accent">"{analysisResult.candidateName}"</span>
                <span className="text-fgMuted text-xs font-normal">vs</span>
                <span className="font-mono text-fg">"{analysisResult.officialBrand}"</span>
              </h3>
              <p className="text-xs text-fgMuted mt-1 font-mono">
                Evaluated Domain: <code className="text-fg bg-surface2 px-1.5 py-0.5 rounded border border-line">{analysisResult.candidateDomain}</code>
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right">
                <span className="text-xs font-medium text-fgSubtle block">
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
            <div className="bg-surface p-4 sm:p-5 rounded-xl border border-line flex items-center justify-between shadow-panel">
              <div>
                <span className="text-xs font-medium text-fgSubtle block">Heuristic Score</span>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-2xl font-semibold tabular-nums font-mono text-fg">
                    {analysisResult.overallScore}
                  </span>
                  <span className="text-xs text-fgMuted font-mono">/ 100</span>
                </div>
                <span className="text-xs text-fgMuted block mt-1 leading-tight">
                  Heuristic threat score out of 100.
                </span>
              </div>
              <div
                className={`p-2.5 rounded-lg shrink-0 ${
                  analysisResult.overallRiskCategory === 'Critical'
                  ? 'bg-danger/15 text-danger border border-danger/30'
                  : analysisResult.overallRiskCategory === 'High'
                  ? 'bg-warn/15 text-warn border border-warn/30'
                  : analysisResult.overallRiskCategory === 'Medium'
                  ? 'bg-accent/15 text-accent border border-accent/30'
                  : 'bg-ok/10 text-ok border border-ok/30'
                }`}
              >
                {analysisResult.overallRiskCategory === 'Critical' ? (
                  <AlertOctagon className="w-5 h-5" />
                ) : analysisResult.overallRiskCategory === 'High' ? (
                  <ShieldAlert className="w-5 h-5" />
                ) : analysisResult.overallRiskCategory === 'Medium' ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : (
                  <ShieldCheck className="w-5 h-5" />
                )}
              </div>
            </div>

            {/* 2. Damerau-Levenshtein Edit Distance & Name Similarity */}
            <div className="bg-surface p-4 sm:p-5 rounded-xl border border-line shadow-panel">
              <span className="text-xs font-medium text-fgSubtle block">Name Similarity &amp; Distance</span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-semibold tabular-nums font-mono text-fg">
                  {analysisResult.nameSimilarityScore}%
                </span>
                <span className="text-xs text-fgMuted font-mono">
                  (Dist: <strong className="text-accent">{analysisResult.damerauDistance}</strong>)
                </span>
              </div>
              <div className="text-xs text-fgMuted mt-1">
                Exact Match:{' '}
                <strong className={analysisResult.isExactNameMatch ? 'text-ok' : 'text-fg'}>
                  {analysisResult.isExactNameMatch ? 'Yes (100%)' : 'No'}
                </strong>
              </div>
            </div>

            {/* 3. Domain Similarity & Subdomain Abuse */}
            <div className="bg-surface p-4 sm:p-5 rounded-xl border border-line shadow-panel">
              <span className="text-xs font-medium text-fgSubtle block">Domain Similarity &amp; Host</span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-semibold tabular-nums font-mono text-fg">
                  {analysisResult.domainSimilarityScore}%
                </span>
                <span className="text-xs font-mono text-accent truncate">
                  .{analysisResult.domainDetails?.extractedTLD || 'com'}
                </span>
              </div>
              <div className="text-xs text-fgMuted mt-1">
                Subdomain Abuse:{' '}
                <strong
                  className={
                    analysisResult.domainDetails?.isSubdomainAbuse ? 'text-danger' : 'text-ok'
                  }
                >
                  {analysisResult.domainDetails?.isSubdomainAbuse ? 'FLAGGED' : 'Clean'}
                </strong>
              </div>
            </div>

            {/* 4. Whitelist / Authorized Asset Audit */}
            <div className="bg-surface p-4 sm:p-5 rounded-xl border border-line shadow-panel">
              <span className="text-xs font-medium text-fgSubtle block">Brand Authorization Audit</span>
              <div className="mt-1.5 flex items-center gap-1.5">
                {analysisResult.isOfficialAsset ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-ok bg-ok/10 px-2 py-0.5 rounded border border-ok/30">
                    <ShieldCheck className="w-3.5 h-3.5" /> Official Protected
                  </span>
                ) : analysisResult.isAuthorizedPartner ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-warn bg-warn/10 px-2 py-0.5 rounded border border-warn/30">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Authorized Partner
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-fgMuted bg-surface2 px-2 py-0.5 rounded border border-line">
                    Unregistered Entity
                  </span>
                )}
              </div>
              <span className="text-xs text-fgMuted mt-1 block">
                Official mark: <strong className="text-fg">{brandProfile.brandName}</strong>
              </span>
            </div>
          </div>

          {/* Visual Glyph Decomposition & Character Highlighting */}
          <div className="bg-surface p-5 rounded-xl border border-line space-y-3 shadow-panel">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-accent" />
                <h3 className="text-sm font-semibold text-fg">
                  Visual Glyph Decomposition &amp; Homoglyph Highlighting
                </h3>
              </div>
              <span className="text-xs text-fgMuted font-mono">
                Baseline: <strong className="text-accent">{brandProfile.brandName}</strong>
              </span>
            </div>

            <div className="p-4 rounded-lg bg-surface2 text-fg space-y-2.5 border border-line">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs text-fgSubtle">
                  Candidate String Glyphs ({analysisResult.candidateName.length} characters)
                </span>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded bg-danger inline-block" />
                    Homoglyph / Confusable
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded bg-warn inline-block" />
                    Separator / Delimiter
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded bg-line inline-block" />
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
                      className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                        diff
                        ? 'bg-danger/20 text-danger border border-danger/40'
                        : isPunct
                        ? 'bg-warn/20 text-warn border border-warn/40'
                        : 'bg-surface text-fg border border-line'
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
                <div className="pt-2 border-t border-line space-y-1">
                  <span className="text-xs font-medium text-fgSubtle block">
                    Character Discrepancy Diagnostics:
                  </span>
                  {analysisResult.characterDiffs.map((diff, i) => (
                    <div key={i} className="text-xs text-danger flex items-center gap-2">
                      <span className="font-mono bg-danger/15 px-1.5 py-0.5 rounded border border-danger/30 text-fg">
                        '{diff.substituted}' (Pos {diff.index + 1})
                      </span>
                      <span>{diff.explanation}</span>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-xs text-fgMuted pt-1 leading-relaxed border-t border-line/60">
                {analysisResult.executiveSummary}
              </p>
            </div>
          </div>

          {/* Detailed Signals & Multi-Pillar Findings Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Left Column: Reasons for Assessment & Signals Breakdown (8 cols) */}
            <div className="lg:col-span-8 bg-surface p-5 sm:p-6 rounded-xl border border-line space-y-4 shadow-panel">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <h4 className="text-sm font-semibold text-fg flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-accent" />
                  Reasons for Assessment &amp; Detection Signals ({analysisResult.signals.length})
                </h4>
                <span className="text-xs text-fgMuted font-mono">Heuristic Signal Breakdown</span>
              </div>

              {analysisResult.signals.length === 0 ? (
                <div className="p-5 rounded-lg bg-ok/10 border border-ok/30 text-ok text-xs flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-ok shrink-0" />
                  <div>
                    <strong className="block font-medium">No Adverse Typo-Squatting Signals</strong>
                    <p className="mt-0.5 text-fgMuted">
                      The candidate name and domain do not trigger homoglyph substitutions, lure keyword combosquatting,
                      subdomain abuse, or suspicious edit distance thresholds against "{brandProfile.brandName}".
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {analysisResult.signals.map((sig, idx) => (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-lg border text-xs space-y-1.5 ${
                        sig.severity === 'critical'
                        ? 'bg-danger/10 border-danger/30 text-fg'
                        : sig.severity === 'high'
                        ? 'bg-warn/10 border-warn/30 text-fg'
                        : sig.severity === 'medium'
                        ? 'bg-accent/10 border-accent/30 text-fg'
                        : 'bg-surface2 border-line text-fgMuted'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-surface border border-line text-accent">
                            {sig.category}
                          </span>
                          <strong className="font-semibold text-fg">{sig.title}</strong>
                        </div>
                        <span
                          className={`text-[11px] font-medium px-2 py-0.5 rounded border w-fit ${
                            sig.severity === 'critical'
                            ? 'bg-danger/20 text-fgSubtle border-danger/30'
                            : sig.severity === 'high'
                            ? 'bg-warn/20 text-fgSubtle border-warn/30'
                            : sig.severity === 'medium'
                            ? 'bg-accent/20 text-fgSubtle border-accent/30'
                            : 'bg-ok/20 text-fgSubtle border-ok/30'
                          }`}
                        >
                          {sig.severity} Severity
                        </span>
                      </div>

                      <p className="text-xs text-fgMuted leading-relaxed">{sig.detail}</p>

                      {sig.mitigatingFactor && (
                        <div className="mt-2 pt-2 border-t border-line/60 text-xs text-ok flex items-start gap-1.5 font-mono">
                          <HelpCircle className="w-3.5 h-3.5 text-ok shrink-0 mt-0.5" />
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
              <div className="bg-surface p-5 rounded-xl border border-line space-y-3 shadow-panel">
                <h5 className="text-xs font-semibold text-fgSubtle flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-danger" />
                  Supporting Evidence ({analysisResult.evidenceSupporting.length})
                </h5>

                {analysisResult.evidenceSupporting.length === 0 ? (
                  <p className="text-xs text-fgMuted italic">No adverse threat evidence identified.</p>
                ) : (
                  <ul className="space-y-1.5 text-xs text-fgMuted">
                    {analysisResult.evidenceSupporting.map((ev, i) => (
                      <li key={i} className="flex items-start gap-2 text-fg">
                        <span className="w-1.5 h-1.5 rounded-full bg-danger shrink-0 mt-1.5" />
                        <span>{ev}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Counter-Evidence & Uncertainties */}
              <div className="bg-surface p-5 rounded-xl border border-line space-y-3 shadow-panel">
                <h5 className="text-xs font-semibold text-fgSubtle flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-ok" />
                  Counter-Evidence &amp; Uncertainties
                </h5>

                {analysisResult.counterEvidence.length === 0 ? (
                  <p className="text-xs text-fgMuted italic">
                    No mitigating counter-evidence identified. High likelihood of adversarial targeting.
                  </p>
                ) : (
                  <ul className="space-y-1.5 text-xs text-fgMuted">
                    {analysisResult.counterEvidence.map((ce, i) => (
                      <li key={i} className="flex items-start gap-2 text-fg">
                        <span className="w-1.5 h-1.5 rounded-full bg-ok shrink-0 mt-1.5" />
                        <span>{ce}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Recommended Analyst Action & Next Steps */}
              <div className="bg-surface p-5 rounded-xl border border-line space-y-3 shadow-panel">
                <h5 className="text-xs font-semibold text-fgSubtle flex items-center gap-2">
                  <ArrowRight className="w-3.5 h-3.5 text-accent" />
                  Recommended Analyst Action
                </h5>

                <div className="p-3 rounded-lg bg-surface2 border border-line">
                  <span className="text-xs font-medium text-fgSubtle block">
                    Playbook Action
                  </span>
                  <span className="text-xs font-semibold text-fg block mt-0.5">
                    {analysisResult.recommendedAction}
                  </span>
                </div>

                <div className="space-y-2 pt-1">
                  <span className="text-xs font-medium text-fgMuted block font-mono">
                    Prescribed Playbook Steps:
                  </span>
                  <ol className="space-y-1.5 text-xs text-fgMuted list-decimal list-inside">
                    {analysisResult.recommendedNextSteps.map((step, idx) => (
                      <li key={idx} className="leading-relaxed text-fg">
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="pt-2 border-t border-line">
                  <button
                    type="button"
                    onClick={handleCreateInvestigationCase}
                    className="w-full py-2 px-3 text-xs font-medium text-center text-onAccent bg-accent hover:bg-accentHover rounded-md transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <FolderPlus className="w-3.5 h-3.5 text-onAccent" />
                    <span>Ingest into Investigation Center</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="bg-surface/50 p-12 rounded-xl border border-dashed border-line text-center space-y-3">
          <div className="w-12 h-12 rounded-lg bg-surface2 text-accent flex items-center justify-center mx-auto border border-line">
            <Search className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-medium text-fg">No Candidate Analysis Loaded</h4>
            <p className="text-xs text-fgMuted max-w-md mx-auto mt-1 leading-relaxed">
              Enter a candidate brand name and domain above and click <strong>Analyze Similarity</strong>, or pick a scenario from the Benchmark Validation Suite below to run deterministic heuristics.
            </p>
          </div>
          {isDemoMode && (
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface2 hover:bg-surface3 text-fg border border-line text-xs font-medium rounded-md transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
            >
              <RotateCcw className="w-3.5 h-3.5 text-fgMuted" />
              <span>Load Demo Candidate</span>
            </button>
          )}
        </div>
      )}

      {/* 4. Benchmark Validation Suite (10 Preset Attack & Benign Scenarios - Demo Mode Only) */}
      {isDemoMode && (
        <div className="bg-surface p-4 rounded-xl border border-line space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-accent" />
              <h3 className="text-sm font-semibold text-fg">
                Demo Benchmark Validation Suite ({benchmarkSuite.length} Synthetic Scenarios)
              </h3>
            </div>
            <span className="text-xs text-fgMuted hidden sm:inline">
              Click any scenario to populate inputs and immediately execute analysis
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {benchmarkSuite.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectPreset(item)}
                className="p-3 rounded-lg bg-surface2 hover:bg-surface3 border border-line hover:border-line/80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent text-left transition-colors group flex flex-col justify-between cursor-pointer"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${
 item.category.includes('Critical')
 ? 'bg-danger/10 text-danger border-danger/30'
 : item.category.includes('High')
 ? 'bg-high/10 text-high border-high/30'
 : 'bg-ok/10 text-ok border-ok/30'
 }`}
                    >
                      {item.badge}
                    </span>
                  </div>
                  <div className="text-xs font-medium text-fg group-hover:text-accent truncate transition-colors">
                    {item.title}
                  </div>
                  <div className="text-xs font-mono text-fgMuted truncate mt-0.5">{item.domain}</div>
                </div>
                <div className="text-[11px] text-fgSubtle mt-1.5 line-clamp-1">{item.description}</div>
              </button>
            ))}
          </div>
        </div>
      )}
      {!isDemoMode && backendOnline && selectedBackendBrandId && <DiscoverPanel brandId={selectedBackendBrandId} onDone={refreshBackendData} />}
    </div>
  );
};

export default LookalikeEngineView;
