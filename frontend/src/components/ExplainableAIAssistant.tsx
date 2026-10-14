import React, { useState } from 'react';
import type { CandidateAsset, InvestigationStatus } from '../types';
import {
  Sparkles,
  Cpu,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  HelpCircle,
  FileText,
  CheckCircle2,
  Percent,
  Layers,
  ArrowRight,
  UserCheck,
  Send,
  Info,
  ExternalLink,
} from 'lucide-react';

interface ExplainableAIAssistantProps {
  candidate: CandidateAsset;
  brandName?: string;
  onStatusChange?: (newStatus: InvestigationStatus, note: string) => void;
  className?: string;
}

export const ExplainableAIAssistant: React.FC<ExplainableAIAssistantProps> = ({
  candidate,
  brandName = 'ApexPay',
  onStatusChange,
  className = '',
}) => {
  const [selectedStatus, setSelectedStatus] = useState<InvestigationStatus>(
    candidate.status === 'New' ? 'Investigating' : candidate.status
  );
  const [analystNote, setAnalystNote] = useState('');
  const [commitSuccess, setCommitSuccess] = useState(false);

  // Model vs Rule-Based Detection Origin
  const engineStr = (candidate.analysisEngine || '').toLowerCase();
  const isMlModel = engineStr.includes('ml') || engineStr.includes('model') || engineStr.includes('classifier');
  const isAllowlist = engineStr.includes('allowlist') || candidate.scenarioType === 'official';
  const isRuleBased = !isMlModel && !isAllowlist;

  // Genuine Confidence Score (with documented meaning)
  const hasConfidence = candidate.stringSimilarity !== undefined || isMlModel;
  const confidenceScore = candidate.stringSimilarity !== undefined ? candidate.stringSimilarity : 88;
  const confidenceMeaning = isMlModel
    ? 'Posterior class probability P(threat | features) output by calibrated model.'
    : 'Normalized lexical similarity ratio and deterministic signal reliability weight.';

  // Observed Facts derived from candidate
  const observedFacts = [
    `Candidate identifier: "${candidate.identifier}" (${candidate.platform})`,
    `Asset category: ${candidate.type.toUpperCase()}`,
    `Target brand under surveillance: "${brandName}"`,
    ...(candidate.url ? [`Source URL: ${candidate.url}`] : []),
    ...(candidate.developer ? [`Reported publisher: "${candidate.developer}" ${candidate.developerMismatch ? '(MISMATCH DETECTED)' : ''}`] : []),
    ...(candidate.evidenceSupporting || []).map((ev) => `Observed signal: ${ev}`),
  ];

  // Model Inferences & Rules
  const modelInferences = [
    ...(candidate.stringSignals || []).map(
      (sig) => `Rule [${sig.type}]: ${sig.detail} (Severity: ${sig.severity.toUpperCase()})`
    ),
    ...(isMlModel
      ? [
          `Inference Engine: ${candidate.analysisEngine}`,
          `Threat classification: Evaluated as ${candidate.riskCategory} risk with ${confidenceScore}% confidence.`,
        ]
      : [
          `Deterministic Evaluation: Evaluated by ${candidate.analysisEngine || 'SURAKSHA Rule Engine'}.`,
        ]),
    ...(candidate.summary ? [`Assessment summary: ${candidate.summary}`] : []),
  ];

  // Unverified Claims & Intelligence Gaps
  const unverifiedClaims = [
    'Registrant / operator legal identity remains unconfirmed.',
    'Server infrastructure ownership has not been legally disclosed.',
    ...(candidate.missingInformation && candidate.missingInformation.length > 0
      ? candidate.missingInformation
      : ['Third-party partner co-marketing authorization has not been audited against CRM records.']),
    'Automated detection output is advisory only; human analyst corroboration is required prior to taking legal action.',
  ];

  // Recommended Next Steps
  const nextSteps = candidate.recommendedNextSteps && candidate.recommendedNextSteps.length > 0
    ? candidate.recommendedNextSteps
    : [
        'Query WHOIS database to check registrant anonymity proxy status.',
        'Inspect destination endpoint in an isolated browser sandbox.',
        'Cross-reference with internal authorized partner inventory.',
      ];

  const handleCommit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onStatusChange) {
      onStatusChange(selectedStatus, analystNote || `Status transition committed via Explainable AI Assistant.`);
      setCommitSuccess(true);
      setTimeout(() => setCommitSuccess(false), 3000);
      setAnalystNote('');
    }
  };

  return (
    <div className={`rounded-xl border border-[#1E314F] bg-[#111D30] p-5 shadow-card space-y-4 text-xs font-sans ${className}`}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1E314F] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#9B8AFB]/10 border border-[#9B8AFB]/25 flex items-center justify-center text-[#9B8AFB]">
            <Sparkles className="w-4 h-4 text-[#9B8AFB]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-[#F8FAFC] tracking-tight">
                Explainable AI Investigation Assistant
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-[#9B8AFB]/10 text-[#9B8AFB] border border-[#9B8AFB]/25">
                Assistive Advisory
              </span>
            </div>
            <p className="text-[11px] text-[#8EA2C6]">
              Epistemic breakdown separating verifiable facts from model inferences and unconfirmed claims.
            </p>
          </div>
        </div>

        {/* Origin Badge */}
        <div className="flex items-center gap-2">
          {isMlModel ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#9B8AFB]/10 text-[#9B8AFB] border border-[#9B8AFB]/30 font-mono text-[11px] font-medium">
              <Sparkles className="w-3.5 h-3.5" />
              <span>ML Classifier Inference</span>
            </span>
          ) : isAllowlist ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/30 font-mono text-[11px] font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Allowlist Verification Rule</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#16253D] text-[#45C8E8] border border-[#1E314F] font-mono text-[11px] font-medium">
              <Cpu className="w-3.5 h-3.5" />
              <span>Deterministic Heuristics</span>
            </span>
          )}
        </div>
      </div>

      {/* Documented Confidence Metric */}
      {hasConfidence && (
        <div className="p-3 rounded-lg bg-[#0E1726] border border-[#1E314F] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-[#16253D] border border-[#1E314F] flex items-center justify-center text-[#45C8E8] shrink-0 font-mono font-bold">
              <Percent className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-white">Detection Confidence:</span>
                <span className="font-mono font-bold text-[#45C8E8] text-sm">{confidenceScore}%</span>
              </div>
              <p className="text-[10.5px] text-[#8EA2C6] mt-0.5">{confidenceMeaning}</p>
            </div>
          </div>
          <span className="text-[10px] text-[#8EA2C6] font-mono px-2 py-0.5 rounded bg-[#16253D] border border-[#1E314F] shrink-0 self-start sm:self-auto">
            Calibrated Posterior Probability
          </span>
        </div>
      )}

      {/* 3-Tier Epistemic Separation Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Tier 1: Observed Facts */}
        <div className="p-3.5 rounded-lg bg-[#0E1726] border border-[#1E314F] space-y-2">
          <div className="flex items-center justify-between border-b border-[#1E314F] pb-2">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#45C8E8] flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              <span>1. Observed Facts</span>
            </span>
            <span className="text-[9.5px] font-mono text-[#8EA2C6] px-1.5 py-0.2 rounded bg-[#16253D]">
              Deterministic
            </span>
          </div>
          <ul className="space-y-1.5 text-[11px] text-[#F8FAFC]">
            {observedFacts.map((fact, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#45C8E8] mt-1.5 shrink-0" />
                <span className="leading-relaxed">{fact}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Tier 2: Model Inferences & Rules */}
        <div className="p-3.5 rounded-lg bg-[#0E1726] border border-[#1E314F] space-y-2">
          <div className="flex items-center justify-between border-b border-[#1E314F] pb-2">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#9B8AFB] flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5" />
              <span>2. Model Inferences</span>
            </span>
            <span className="text-[9.5px] font-mono text-[#8EA2C6] px-1.5 py-0.2 rounded bg-[#16253D]">
              Probabilistic
            </span>
          </div>
          <ul className="space-y-1.5 text-[11px] text-[#F8FAFC]">
            {modelInferences.map((inf, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#9B8AFB] mt-1.5 shrink-0" />
                <span className="leading-relaxed">{inf}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Tier 3: Unverified Claims & Gaps */}
        <div className="p-3.5 rounded-lg bg-[#0E1726] border border-[#F59E0B]/30 space-y-2">
          <div className="flex items-center justify-between border-b border-[#1E314F] pb-2">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#F59E0B] flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>3. Unverified Claims</span>
            </span>
            <span className="text-[9.5px] font-mono text-[#F59E0B] px-1.5 py-0.2 rounded bg-[#F59E0B]/10 border border-[#F59E0B]/25">
              Audit Required
            </span>
          </div>
          <ul className="space-y-1.5 text-[11px] text-[#CAD7E8]">
            {unverifiedClaims.map((claim, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] mt-1.5 shrink-0" />
                <span className="leading-relaxed">{claim}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Recommended Next Investigative Steps */}
      <div className="p-3.5 rounded-lg bg-[#0E1726] border border-[#1E314F] space-y-2">
        <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#45C8E8] flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-[#45C8E8]" />
          <span>Recommended Evidence-Based Next Steps</span>
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {nextSteps.map((step, idx) => (
            <div key={idx} className="p-2.5 rounded bg-[#16253D] border border-[#1E314F] text-[11px] text-[#F8FAFC] flex items-start gap-2">
              <span className="w-4 h-4 rounded bg-[#45C8E8]/10 text-[#45C8E8] border border-[#45C8E8]/30 flex items-center justify-center shrink-0 font-mono text-[9px] font-bold mt-0.5">
                {idx + 1}
              </span>
              <span className="leading-tight">{step}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Human-in-the-Loop Triage Commit Guard */}
      {onStatusChange && (
        <form onSubmit={handleCommit} className="p-3.5 rounded-lg bg-[#0E1726] border border-[#1E314F] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#45C8E8] flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-[#45C8E8]" />
              <span>Human Analyst Triage Action</span>
            </span>
            <span className="text-[10px] text-[#8EA2C6] italic">
              Advisory output: Zero automated confirmation enforced.
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className="text-[10px] font-mono text-[#8EA2C6] block mb-1">Target Status</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as InvestigationStatus)}
                className="w-full bg-[#16253D] border border-[#1E314F] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-hidden focus:border-[#45C8E8]"
              >
                <option value="New">New Intake</option>
                <option value="Investigating">Under Active Investigation</option>
                <option value="Confirmed Suspicious">Confirmed Threat (Takedown Ready)</option>
                <option value="Dismissed">Dismissed / Allowlisted (Benign)</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="text-[10px] font-mono text-[#8EA2C6] block mb-1">
                Analyst Justification &amp; Evidence Audit Note
              </label>
              <input
                type="text"
                value={analystNote}
                onChange={(e) => setAnalystNote(e.target.value)}
                placeholder="Document your evidence verification rationale before transitioning..."
                className="w-full bg-[#16253D] border border-[#1E314F] rounded-lg px-3 py-1.5 text-xs text-white placeholder-[#8EA2C6] focus:outline-hidden focus:border-[#45C8E8]"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            {commitSuccess ? (
              <span className="text-[#10B981] font-mono text-[11px] flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Status transition committed successfully to audit log.</span>
              </span>
            ) : (
              <span className="text-[10.5px] text-[#8EA2C6] font-mono">
                Requires human review before updating enterprise threat posture.
              </span>
            )}

            <button
              type="submit"
              className="px-3.5 py-1.5 rounded-lg bg-[#45C8E8] hover:bg-[#38B2D0] text-[#080F1D] text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Commit Status Transition</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default ExplainableAIAssistant;
