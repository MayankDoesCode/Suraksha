import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  X,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  Copy,
  Check,
  Zap,
  Sparkles,
  HelpCircle,
  Fingerprint,
  RefreshCw,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { runFullLookalikeAnalysis } from '../utils/lookalikeEngine';
import { analyzeSocialCandidate } from '../utils/socialEngine';
import { analyzeAppCandidate } from '../utils/appEngine';
import type { RiskLevel, AssetType } from '../types';

interface ThreatInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialInput?: string;
}

interface CharAnalysis {
  char: string;
  codePoint: string;
  isDeceptive: boolean;
  reason?: string;
}

const PRESET_TARGETS = [
  { label: 'Homoglyph Phish', target: 'pаypal-security.com', desc: 'Cyrillic а (U+0430) disguised as Latin a' },
  { label: 'Social Support Scammer', target: '@acme_supp0rt', desc: 'Zero replaces "o" with recovery lure' },
  { label: 'Cloned APK Package', target: 'com.acme.payrewardz', desc: 'Counterfeit package with credential harvesting' },
  { label: 'KYC Urgency Lure', target: 'acme-kyc-update.top', desc: 'High-risk TLD + urgent account lock lure' },
  { label: 'Combosquatting Domain', target: 'secure-login-acme.xyz', desc: 'Combines brand token with auth keywords' },
];

// Cyrillic & Greek look-alikes mapping to Latin
const HOMOGLYPH_MAP: Record<string, { latin: string; script: string }> = {
  '\u0430': { latin: 'a', script: 'Cyrillic' },
  '\u0435': { latin: 'e', script: 'Cyrillic' },
  '\u0456': { latin: 'i', script: 'Cyrillic' },
  '\u043E': { latin: 'o', script: 'Cyrillic' },
  '\u0440': { latin: 'p', script: 'Cyrillic' },
  '\u0441': { latin: 'c', script: 'Cyrillic' },
  '\u0443': { latin: 'y', script: 'Cyrillic' },
  '\u0445': { latin: 'x', script: 'Cyrillic' },
  '\u0455': { latin: 's', script: 'Cyrillic' },
  '\u03B1': { latin: 'a', script: 'Greek' },
  '\u03BF': { latin: 'o', script: 'Greek' },
  '\u03C1': { latin: 'p', script: 'Greek' },
  '\u03BD': { latin: 'v', script: 'Greek' },
};

function inspectCharacters(str: string): CharAnalysis[] {
  const result: CharAnalysis[] = [];
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    const cp = 'U+' + ch.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0');
    if (HOMOGLYPH_MAP[ch]) {
      result.push({
        char: ch,
        codePoint: cp,
        isDeceptive: true,
        reason: `${HOMOGLYPH_MAP[ch].script} character mimicking Latin "${HOMOGLYPH_MAP[ch].latin}"`,
      });
    } else if (ch === '0' && i > 0 && /[a-z]/i.test(str[i - 1])) {
      result.push({
        char: ch,
        codePoint: cp,
        isDeceptive: true,
        reason: 'Number 0 used in place of letter "O"',
      });
    } else if (ch === '1' && i > 0 && /[a-z]/i.test(str[i - 1])) {
      result.push({
        char: ch,
        codePoint: cp,
        isDeceptive: true,
        reason: 'Digit 1 used in place of letter "l" or "i"',
      });
    } else {
      result.push({
        char: ch,
        codePoint: cp,
        isDeceptive: false,
      });
    }
  }
  return result;
}

export const ThreatInspectorModal: React.FC<ThreatInspectorModalProps> = ({
  isOpen,
  onClose,
  initialInput = '',
}) => {
  const { brandProfile, addCandidate, setSelectedCandidateId, setActiveTab } = useApp();
  const [input, setInput] = useState(initialInput);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialInput) setInput(initialInput);
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [isOpen, initialInput]);

  // Clean target
  const rawTarget = input.trim();
  const isSocial = rawTarget.startsWith('@');
  const isApp = rawTarget.startsWith('com.') || rawTarget.includes('.apk') || rawTarget.startsWith('app:');
  const isDomain = !isSocial && !isApp && rawTarget.length > 0;

  const charAnalysis = useMemo(() => inspectCharacters(rawTarget), [rawTarget]);
  const hasHomoglyphs = charAnalysis.some((c) => c.isDeceptive);

  // Run dynamic analysis
  const analysisResult = useMemo(() => {
    if (!rawTarget) return null;

    try {
      if (isSocial) {
        const username = rawTarget;
        const res = analyzeSocialCandidate(
          {
            name: username.replace('@', ''),
            username,
            platform: 'X (Twitter)',
            url: `https://x.com/${username.replace('@', '')}`,
            bio: 'Urgent customer support. Send a direct message with OTP to restore access.',
            followerCount: 12,
            creationDate: new Date(Date.now() - 3 * 864e5).toISOString().slice(0, 10),
          } as any,
          brandProfile
        );
        return {
          type: 'social' as AssetType,
          score: res.heuristicScore,
          category: res.riskCategory as RiskLevel,
          signals: res.signals.map((s: any) => ({ title: s.title, desc: s.description, weight: s.weight })),
          summary: `Social handle impersonation test against ${brandProfile.brandName || 'Brand'}.`,
        };
      }

      if (isApp) {
        const pkg = rawTarget.replace(/^app:/, '');
        const res = analyzeAppCandidate(
          {
            name: pkg.split('.').pop() || 'App Candidate',
            developer: 'Unknown Unverified Publisher',
            store: 'Third-Party APK Repository',
            packageId: pkg,
            description: 'Log in to claim instant rewards and cashback vouchers.',
            observedBranding: `Copies ${brandProfile.brandName || 'Brand'} corporate colorway and iconography`,
          } as any,
          brandProfile
        );
        return {
          type: 'app' as AssetType,
          score: res.heuristicScore,
          category: res.riskCategory as RiskLevel,
          signals: res.signals.map((s: any) => ({ title: s.title, desc: s.description, weight: s.weight })),
          summary: `Cloned application package assessment for ${pkg}.`,
        };
      }

      // Default: Domain lookalike
      const domainClean = rawTarget.replace(/^https?:\/\//i, '').split('/')[0];
      const res = runFullLookalikeAnalysis(
        brandProfile.brandName || 'Acme',
        domainClean,
        brandProfile,
        'Verify your account credentials within 24 hours to prevent immediate suspension.'
      );

      let finalScore = res.overallScore;
      let finalCategory = res.overallRiskCategory as RiskLevel;
      const signals = res.signals.map((s: any) => ({ title: s.title, desc: s.description, weight: s.weight }));

      if (hasHomoglyphs) {
        finalScore = Math.max(finalScore, 85);
        finalCategory = 'Critical';
        signals.unshift({
          title: 'Deceptive Homoglyph / Script Incongruity Detected',
          desc: 'Target contains non-Latin or character-substitution artifacts that visually mimic authentic brand spelling.',
          weight: 40,
        });
      }

      return {
        type: 'domain' as AssetType,
        score: finalScore,
        category: finalCategory,
        signals,
        summary: `Domain threat evaluation for ${domainClean} referencing ${brandProfile.brandName || 'Brand'}.`,
      };
    } catch {
      return null;
    }
  }, [rawTarget, isSocial, isApp, brandProfile, hasHomoglyphs]);

  if (!isOpen) return null;

  const handleAddToInvestigations = () => {
    if (!analysisResult || !rawTarget) return;

    const candidate = addCandidate({
      title: rawTarget,
      identifier: rawTarget,
      type: analysisResult.type,
      platform: isSocial ? 'X (Twitter)' : isApp ? 'Third-Party App Market' : 'Web Domain / Registrar',
      url: isSocial ? `https://x.com/${rawTarget.replace('@', '')}` : isDomain ? `https://${rawTarget}` : rawTarget,
      riskCategory: analysisResult.category,
      summary: analysisResult.summary,
      analysisEngine: 'Suraksha Threat X-Ray (Multi-vector Live Engine)',
      evidenceSupporting: analysisResult.signals.map((s) => s.title),
      status: 'investigating',
    } as any);

    onClose();
    setSelectedCandidateId(candidate.id);
    setActiveTab('investigation-center');
  };

  const handleCopyIOC = () => {
    if (!analysisResult) return;
    const ioc = {
      target: rawTarget,
      vector: analysisResult.type,
      riskLevel: analysisResult.category,
      threatScore: analysisResult.score,
      timestamp: new Date().toISOString(),
      brandTargeted: brandProfile.brandName,
      signals: analysisResult.signals,
    };
    navigator.clipboard.writeText(JSON.stringify(ioc, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getTone = (cat: RiskLevel) => {
    switch (cat) {
      case 'Critical':
        return { badge: 'bg-danger/15 text-danger border-danger/30', bar: 'bg-danger', text: 'text-danger' };
      case 'High':
        return { badge: 'bg-high/15 text-high border-high/30', bar: 'bg-high', text: 'text-high' };
      case 'Medium':
        return { badge: 'bg-warn/15 text-warn border-warn/30', bar: 'bg-warn', text: 'text-warn' };
      default:
        return { badge: 'bg-ok/15 text-ok border-ok/30', bar: 'bg-ok', text: 'text-ok' };
    }
  };

  const tone = analysisResult ? getTone(analysisResult.category) : getTone('Low');

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 backdrop-blur-md bg-black/60"
      role="dialog"
      aria-modal="true"
      aria-label="Threat X-Ray Inspector"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div
        className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header bar */}
        <div className="flex items-center justify-between border-b border-line bg-surface2/60 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent/15 border border-accent/30 text-accent">
              <Zap className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold tracking-tight text-fg flex items-center gap-2">
                Threat X-Ray · Live Inspector
                <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-mono text-accent">
                  Interactive
                </span>
              </h2>
              <p className="text-[11px] text-fgMuted">
                Instant character-level homoglyph decoding & multi-vector risk engine
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-fgSubtle hover:bg-surface3 hover:text-fg transition-colors"
            aria-label="Close Threat X-Ray modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal body */}
        <div className="max-h-[75vh] overflow-y-auto p-5 space-y-5">
          {/* Input field */}
          <div className="space-y-2">
            <label htmlFor="threat-input" className="block text-xs font-medium text-fgMuted">
              Enter suspicious URL, domain, handle, or package identifier:
            </label>
            <div className="relative">
              <input
                id="threat-input"
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="e.g. pаypal-security.com, @acme_supp0rt, com.acme.pay"
                className="w-full rounded-xl border border-line bg-surface2 px-4 py-3 pl-10 text-sm font-mono text-fg placeholder:text-fgSubtle focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-fgSubtle" />
              {input && (
                <button
                  onClick={() => setInput('')}
                  className="absolute right-3 top-3 text-xs text-fgSubtle hover:text-fg"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Quick preset chips */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] uppercase font-mono text-fgSubtle mr-1">Presets:</span>
              {PRESET_TARGETS.map((p) => (
                <button
                  key={p.target}
                  type="button"
                  onClick={() => setInput(p.target)}
                  className="inline-flex items-center gap-1 rounded-md border border-line bg-surface3/60 px-2 py-1 text-[11px] text-fgMuted hover:border-accent/50 hover:text-fg transition-colors"
                  title={p.desc}
                >
                  <span className="font-mono">{p.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Character Breakdown Visualizer */}
          {rawTarget && (
            <div className="rounded-xl border border-line bg-surface2/50 p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-fgSubtle flex items-center gap-1.5 font-mono">
                  <Fingerprint className="h-3.5 w-3.5 text-accent" /> Character-by-Character Inspection
                </span>
                {hasHomoglyphs && (
                  <span className="rounded-full bg-danger/15 border border-danger/30 px-2 py-0.5 text-[10px] font-semibold text-danger">
                    Homoglyph Anomaly Detected
                  </span>
                )}
              </div>

              {/* Character pills */}
              <div className="flex flex-wrap gap-1 font-mono text-xs">
                {charAnalysis.map((c, idx) => (
                  <div
                    key={idx}
                    title={c.reason || `ASCII ${c.codePoint}`}
                    className={`group relative flex flex-col items-center rounded-lg border px-2 py-1.5 transition-all ${
                      c.isDeceptive
                        ? 'border-danger/60 bg-danger/15 text-danger font-bold animate-pulse'
                        : 'border-line bg-surface3 text-fg'
                    }`}
                  >
                    <span className="text-sm">{c.char}</span>
                    <span className="text-[9px] text-fgSubtle mt-0.5">{c.codePoint}</span>
                  </div>
                ))}
              </div>

              {hasHomoglyphs && (
                <div className="mt-2 text-[11px] text-danger/90 bg-danger/10 p-2.5 rounded-lg border border-danger/20 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Visual Deception Detected:</span> One or more characters
                    in this identifier use non-standard Unicode or leetspeak substitutions to trick human visual
                    perception into confusing it with an authentic brand asset.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Live Engine Score & Findings */}
          {analysisResult && (
            <div className="rounded-xl border border-line bg-surface2/70 p-4 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${tone.badge}`}
                    >
                      {analysisResult.category} Threat
                    </span>
                    <span className="font-mono text-xs text-fgMuted">
                      Vector: <strong className="text-fg capitalize">{analysisResult.type}</strong>
                    </span>
                  </div>
                  <p className="text-xs text-fgMuted mt-1">{analysisResult.summary}</p>
                </div>

                {/* Score Dial */}
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-2xl font-bold font-mono text-fg">{analysisResult.score}</div>
                    <div className="text-[10px] uppercase tracking-wider text-fgSubtle">Risk Score</div>
                  </div>
                  <div className="w-16 h-2 rounded-full bg-line overflow-hidden">
                    <div
                      className={`h-full ${tone.bar}`}
                      style={{ width: `${Math.min(100, analysisResult.score)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Heuristic Signals */}
              <div className="space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-fgSubtle font-mono">
                  Detected Threat Signals ({analysisResult.signals.length})
                </span>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {analysisResult.signals.map((sig, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2.5 rounded-lg border border-line/60 bg-surface3/40 p-2 text-xs"
                    >
                      <AlertTriangle className="h-3.5 w-3.5 text-warn shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-fg flex items-center justify-between">
                          <span>{sig.title}</span>
                          {sig.weight && (
                            <span className="font-mono text-[10px] text-fgSubtle">+{sig.weight}</span>
                          )}
                        </div>
                        {sig.desc && <p className="text-[11px] text-fgMuted mt-0.5">{sig.desc}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-line bg-surface2/60 px-5 py-3">
          <div className="flex items-center gap-2 text-xs text-fgSubtle">
            <kbd className="rounded border border-line px-1.5 font-mono text-[10px]">Esc</kbd> to close
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {analysisResult && (
              <>
                <button
                  type="button"
                  onClick={handleCopyIOC}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-lg border border-line bg-surface3 px-3 py-2 text-xs font-medium text-fg hover:bg-surface2 transition-colors"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-ok" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? 'Copied IOC' : 'Copy IOC'}
                </button>
                <button
                  type="button"
                  onClick={handleAddToInvestigations}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-onAccent hover:bg-accentHover transition-colors shadow-sm"
                >
                  <span>Add to Investigations</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThreatInspectorModal;
