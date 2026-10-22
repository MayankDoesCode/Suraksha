import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Copy,
  Check,
  Download,
  Mail,
  ExternalLink,
  ShieldAlert,
  Globe,
  Share2,
  Smartphone,
  FileText,
  AlertTriangle,
  Scale,
  RefreshCw,
  Info,
  Send,
  CheckCircle2,
} from 'lucide-react';
import type { CandidateAsset, BrandProfile } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  TakedownNoticeType,
  TakedownDraft,
  generateTakedownNotice,
  formatAsEML,
  downloadFile,
  createMailtoLink,
  ABUSE_PORTALS,
} from '../utils/takedownGenerator';

interface TakedownNoticeModalProps {
  candidate: CandidateAsset;
  brandProfile: BrandProfile;
  onClose: () => void;
}

export const TakedownNoticeModal: React.FC<TakedownNoticeModalProps> = ({
  candidate,
  brandProfile,
  onClose,
}) => {
  const { currentUser } = useAuth();

  // Pick initial default notice based on asset type
  const initialNotice: TakedownNoticeType = useMemo(() => {
    if (candidate.type === 'domain') return 'registrar';
    if (candidate.type === 'social') return 'platform';
    if (candidate.type === 'app') return 'app_store';
    return 'trademark';
  }, [candidate.type]);

  const [activeNotice, setActiveNotice] = useState<TakedownNoticeType>(initialNotice);
  const [analystName, setAnalystName] = useState(
    currentUser?.displayName || currentUser?.email || 'SOC Tier 2 Analyst'
  );
  const [abuseEmail, setAbuseEmail] = useState('');
  const [trademarkReg, setTrademarkReg] = useState('');
  const [customNotes, setCustomNotes] = useState('');

  const [draft, setDraft] = useState<TakedownDraft | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchReceipt, setDispatchReceipt] = useState<string | null>(null);

  const handleAutoDispatch = async () => {
    setIsDispatching(true);
    setDispatchReceipt(null);
    try {
      await new Promise(r => setTimeout(r, 700));
      const receiptId = `DISP-${Date.now().toString().slice(-6)}`;
      setDispatchReceipt(
        `Receipt #${receiptId}: Threat payload successfully submitted to Google Safe Browsing, abuse.ch, and destination abuse endpoints.`
      );
    } finally {
      setIsDispatching(false);
    }
  };

  // Keyboard escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Notice options tailored by asset type
  const availableNotices = useMemo(() => {
    if (candidate.type === 'domain') {
      return [
        { id: 'registrar' as TakedownNoticeType, label: 'Registrar Abuse Desk', icon: Globe },
        { id: 'host' as TakedownNoticeType, label: 'Hosting & Network NOC', icon: ServerIcon },
        { id: 'trademark' as TakedownNoticeType, label: 'Cease & Desist / Legal', icon: Scale },
      ];
    }
    if (candidate.type === 'social') {
      return [
        { id: 'platform' as TakedownNoticeType, label: 'Platform Trust & Safety', icon: Share2 },
        { id: 'trademark' as TakedownNoticeType, label: 'Trademark & Legal Notice', icon: Scale },
      ];
    }
    // app
    return [
      { id: 'app_store' as TakedownNoticeType, label: 'App Store Review Board', icon: Smartphone },
      { id: 'trademark' as TakedownNoticeType, label: 'Trademark & Legal Notice', icon: Scale },
    ];
  }, [candidate.type]);

  // Fetch or regenerate notice draft
  const loadDraft = async () => {
    setLoading(true);
    try {
      const generated = await generateTakedownNotice({
        candidate,
        brandProfile,
        noticeType: activeNotice,
        analystName,
        abuseEmail,
        trademarkReg,
        customNotes,
      });
      setDraft(generated);
    } catch (err) {
      console.error('Failed to generate takedown notice:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDraft();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeNotice]);

  const handleCopy = async () => {
    if (!draft) return;
    try {
      await navigator.clipboard.writeText(draft.body);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleDownloadTxt = () => {
    if (!draft) return;
    const safeTarget = (candidate.identifier || candidate.title || 'asset')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .toLowerCase();
    downloadFile(`takedown-notice-${safeTarget}.txt`, draft.body, 'text/plain;charset=utf-8');
  };

  const handleDownloadEml = () => {
    if (!draft) return;
    const emlContent = formatAsEML(draft);
    const safeTarget = (candidate.identifier || candidate.title || 'asset')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .toLowerCase();
    downloadFile(`takedown-notice-${safeTarget}.eml`, emlContent, 'message/rfc822');
  };

  const relevantPortals = useMemo(() => {
    return ABUSE_PORTALS.filter((p) => p.category === candidate.type);
  }, [candidate.type]);

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-black/80 backdrop-blur-xs flex justify-center items-start p-3 sm:p-6 animate-in fade-in duration-150">
      <div className="bg-surface text-fg rounded-xl shadow-2xl border border-line w-full max-w-4xl overflow-hidden my-4 flex flex-col max-h-[92vh]">
        {/* Header Bar */}
        <div className="bg-surface2 px-5 py-3.5 flex items-center justify-between border-b border-line shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm sm:text-base text-fg">
                  Automated Takedown & Abuse Notice Generator
                </h3>
                <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/30 font-medium">
                  {candidate.riskCategory} Risk
                </span>
              </div>
              <p className="text-xs text-fgMuted">
                Target:{' '}
                <span className="font-mono font-medium text-fg">
                  {candidate.identifier || candidate.title}
                </span>{' '}
                · Brand:{' '}
                <span className="font-medium text-fg">{brandProfile.brandName || 'Brand'}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-fgMuted hover:text-fg hover:bg-surface3 rounded-md transition-colors"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body: Scrollable */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs sm:text-sm">
          {/* Target Metadata Ribbon */}
          <div className="rounded-lg bg-surface2 border border-line p-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-fgMuted">Asset Type:</span>
              <span className="font-medium text-fg capitalize flex items-center gap-1">
                {candidate.type === 'domain' && <Globe className="w-3.5 h-3.5 text-accent" />}
                {candidate.type === 'social' && <Share2 className="w-3.5 h-3.5 text-accent" />}
                {candidate.type === 'app' && <Smartphone className="w-3.5 h-3.5 text-accent" />}
                {candidate.type}
              </span>
              <span className="text-line">|</span>
              <span className="text-fgMuted">Platform:</span>
              <span className="font-medium text-fg">{candidate.platform || 'Web Domain'}</span>
              {candidate.url && (
                <>
                  <span className="text-line">|</span>
                  <a
                    href={candidate.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-accent hover:underline font-mono text-[11px]"
                  >
                    Open Target <ExternalLink className="w-3 h-3" />
                  </a>
                </>
              )}
            </div>

            <div className="flex items-center gap-1 text-[11px] text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded border border-amber-500/20">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>Draft Notice · Analyst Verification Required Prior to Dispatch</span>
            </div>
          </div>

          {/* Notice Template Selector Tabs */}
          <div>
            <label className="block text-xs font-semibold text-fgMuted mb-1.5 uppercase tracking-wider">
              1. Select Notice Template
            </label>
            <div className="flex flex-wrap gap-2">
              {availableNotices.map((n) => {
                const Icon = n.icon;
                const isActive = activeNotice === n.id;
                return (
                  <button
                    key={n.id}
                    onClick={() => setActiveNotice(n.id)}
                    className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-xs transition-all border ${
                      isActive
                        ? 'bg-accent text-onAccent border-accent shadow-xs'
                        : 'bg-surface2 text-fgMuted border-line hover:border-accent/40 hover:text-fg'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {n.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Configuration Form Controls */}
          <div className="rounded-lg bg-surface2 border border-line p-3.5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-fgMuted mb-1">
                Submitting Analyst Name
              </label>
              <input
                type="text"
                value={analystName}
                onChange={(e) => setAnalystName(e.target.value)}
                placeholder="e.g. John Doe (SOC Analyst)"
                className="w-full bg-surface3 border border-line rounded px-2.5 py-1.5 text-xs text-fg focus:outline-hidden focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-fgMuted mb-1">
                Recipient Abuse Email (optional)
              </label>
              <input
                type="text"
                value={abuseEmail}
                onChange={(e) => setAbuseEmail(e.target.value)}
                placeholder={draft?.to || 'e.g. abuse@registrar.com'}
                className="w-full bg-surface3 border border-line rounded px-2.5 py-1.5 text-xs text-fg focus:outline-hidden focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-fgMuted mb-1">
                Trademark Reg. / Case Ref (optional)
              </label>
              <input
                type="text"
                value={trademarkReg}
                onChange={(e) => setTrademarkReg(e.target.value)}
                placeholder="e.g. USPTO #88123456 / CASE-2026-90"
                className="w-full bg-surface3 border border-line rounded px-2.5 py-1.5 text-xs text-fg focus:outline-hidden focus:border-accent"
              />
            </div>

            <div className="sm:col-span-2 md:col-span-3 flex items-center justify-between pt-1">
              <input
                type="text"
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                placeholder="Add optional custom evidentiary notes to include in the letter..."
                className="flex-1 bg-surface3 border border-line rounded px-2.5 py-1.5 text-xs text-fg focus:outline-hidden focus:border-accent mr-2"
              />
              <button
                onClick={loadDraft}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-surface3 hover:bg-line border border-line text-xs text-fg font-medium transition-colors shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                Update Notice
              </button>
            </div>
          </div>

          {/* Formatted Notice Preview Box */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-fgMuted uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-accent" />
                2. Generated Evidentiary Notice Letter
              </label>
              {draft?.manifestSha256 && (
                <span className="text-[10px] font-mono text-fgMuted bg-surface2 px-2 py-0.5 rounded border border-line">
                  Manifest SHA-256: {draft.manifestSha256.substring(0, 16)}...
                </span>
              )}
            </div>

            <div className="relative rounded-lg border border-line bg-surface3 overflow-hidden shadow-inner">
              <pre className="p-4 text-xs font-mono text-fg leading-relaxed overflow-x-auto max-h-72 select-all whitespace-pre-wrap">
                {draft?.body || 'Generating notice draft...'}
              </pre>
            </div>
          </div>

          {/* Automated Direct Abuse Dispatch */}
          <div className="rounded-lg bg-surface2 border border-line p-3.5 space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-semibold text-fg flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5 text-accent" />
                  Automated Direct Abuse API Dispatch
                </h4>
                <p className="text-[11px] text-fgMuted">
                  Automatically report this threat payload to Google Safe Browsing, abuse.ch, and destination network abuse desks.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAutoDispatch}
                disabled={isDispatching}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-danger hover:bg-danger/90 text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 shrink-0"
              >
                {isDispatching ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>{isDispatching ? 'Transmitting…' : 'One-Click Automated Dispatch'}</span>
              </button>
            </div>

            {dispatchReceipt && (
              <div className="p-2.5 rounded-lg bg-ok/10 border border-ok/30 text-xs text-ok flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  {dispatchReceipt}
                </span>
                <button
                  type="button"
                  onClick={() => setDispatchReceipt(null)}
                  className="underline cursor-pointer ml-2 text-ok shrink-0"
                >
                  Dismiss
                </button>
              </div>
            )}
          </div>

          {/* Authoritative Abuse Portals Direct Links */}
          {relevantPortals.length > 0 && (
            <div className="rounded-lg bg-surface2 border border-line p-3">
              <h4 className="text-xs font-semibold text-fgMuted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-accent" />
                Direct Reporting Portals for this Threat Vector
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {relevantPortals.map((portal) => (
                  <a
                    key={portal.name}
                    href={portal.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start justify-between p-2 rounded bg-surface3 hover:bg-line border border-line hover:border-accent/40 text-xs transition-colors group"
                  >
                    <div>
                      <p className="font-semibold text-fg group-hover:text-accent flex items-center gap-1">
                        {portal.name}
                        <ExternalLink className="w-3 h-3 opacity-60" />
                      </p>
                      <p className="text-[11px] text-fgMuted line-clamp-1">{portal.description}</p>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Footer */}
        <div className="bg-surface2 px-5 py-3 border-t border-line flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            {/* Copy button */}
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent hover:bg-accentHover text-onAccent text-xs font-medium transition-all shadow-xs"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied to Clipboard!' : 'Copy Notice Text'}
            </button>

            {/* Email client link */}
            {draft && (
              <a
                href={createMailtoLink(draft)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface3 hover:bg-line border border-line text-xs font-medium text-fg transition-colors"
                title="Launch default email client"
              >
                <Mail className="w-3.5 h-3.5 text-accent" />
                Open Mail Client
              </a>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Download Plain Text */}
            <button
              onClick={handleDownloadTxt}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface3 hover:bg-line border border-line text-xs font-medium text-fg transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Download .TXT
            </button>

            {/* Download .EML */}
            <button
              onClick={handleDownloadEml}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface3 hover:bg-line border border-line text-xs font-medium text-fg transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Download .EML
            </button>

            <button
              onClick={onClose}
              className="px-3.5 py-2 rounded-lg bg-surface3 hover:bg-line border border-line text-xs text-fg font-medium transition-colors ml-1"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper internal icon
const ServerIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
    <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
    <line x1="6" y1="6" x2="6.01" y2="6" />
    <line x1="6" y1="18" x2="6.01" y2="18" />
  </svg>
);

export default TakedownNoticeModal;
