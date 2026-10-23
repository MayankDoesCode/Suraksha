import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  X,
  Send,
  ShieldAlert,
  ShieldCheck,
  ExternalLink,
  Sparkles,
  Loader2,
  AlertTriangle,
  RotateCcw,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  Download,
  PlusCircle,
  ExternalLink as OpenIcon,
  Search,
  ChevronRight,
  Fingerprint,
} from 'lucide-react';
import { api } from '../api/client';
import { useApp } from '../context/AppContext';

interface SuggestedAction {
  type: string;
  label: string;
  url?: string;
  target_brand?: string;
  target?: string;
  prompt?: string;
}

interface PermutationItem {
  domain: string;
  technique: string;
  risk_score: number;
  severity: string;
  signals: string[];
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'copilot';
  text: string;
  inspection?: {
    url: string;
    target_brand: string;
    threat_score: number;
    severity: string;
    signals: string[];
    google_status: string;
    google_verdict: string;
    is_flagged_by_google: boolean;
    advisory_url: string;
  };
  suggested_actions?: SuggestedAction[];
  permutations?: PermutationItem[];
  timestamp: string;
}

// Minimal inline markdown: **bold** and `code` (no HTML injection: everything stays React text nodes).
const renderInline = (text: string): React.ReactNode[] =>
  text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean).map((seg, i) => {
    if (seg.startsWith('**') && seg.endsWith('**') && seg.length > 4) return <strong key={i} className="font-semibold text-fg">{seg.slice(2, -2)}</strong>;
    if (seg.startsWith('`') && seg.endsWith('`') && seg.length > 2) return <code key={i} className="rounded bg-surface2 px-1 py-0.5 font-mono text-[11px] break-all">{seg.slice(1, -1)}</code>;
    return <React.Fragment key={i}>{seg}</React.Fragment>;
  });

export const AICopilotWidget: React.FC = () => {
  const { setActiveTab, addCandidate, brandProfile } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [investigatedIds, setInvestigatedIds] = useState<Record<string, boolean>>({});

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'copilot',
      text: "👋 Hello! I am your **Suraksha AI Cyber Defense Copilot**.\n\nPaste any link or domain (e.g. `https://paypal-security-login.xyz` or `chase-verify.top`), and I will verify it against **Google Safe Browsing**, check brand lookalike mimicry, and provide an instant threat analysis with takedown steps.",
      suggested_actions: [
        { type: 'prompt', label: '🛡️ Scan PayPal Lookalike', prompt: 'Check https://paypal-security-login.xyz' },
        { type: 'prompt', label: '🛡️ Scan Apple ID Phish', prompt: 'Check https://apple-id-verify.top' },
        { type: 'prompt', label: '📋 Draft Registrar Abuse Email', prompt: 'Draft registrar abuse notice for paypal-security-login.xyz' },
        { type: 'prompt', label: '🔬 Explain Combosquatting', prompt: 'How does combosquatting work?' },
        { type: 'prompt', label: '🔤 Explain Homoglyphs & Punycode', prompt: 'How do homoglyph attacks work?' },
      ],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isTyping]);

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // ignore
    }
  };

  const handleExportTranscript = () => {
    const textContent = messages
      .map(
        (m) =>
          `[${m.timestamp}] ${m.sender === 'user' ? 'ANALYST' : 'SURAKSHA COPILOT'}:\n${m.text}\n`
      )
      .join('\n---\n\n');

    const blob = new Blob([textContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `suraksha-copilot-dossier-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleAddToInvestigations = (inspection: NonNullable<ChatMessage['inspection']>, messageId: string) => {
    if (investigatedIds[messageId]) return;

    const riskLevel =
      inspection.severity === 'CRITICAL'
        ? 'Critical'
        : inspection.severity === 'HIGH'
        ? 'High'
        : inspection.severity === 'MEDIUM'
        ? 'Medium'
        : 'Low';

    addCandidate({
      name: inspection.url,
      brandId: brandProfile?.id || 'manual',
      brandName: inspection.target_brand || brandProfile?.brandName || 'Target Brand',
      riskLevel: riskLevel as any,
      riskScore: inspection.threat_score,
      status: 'New',
      type: 'Domain',
      signals: inspection.signals,
      confidence: 0.95,
      discoveryDate: new Date().toISOString(),
      targetUrl: inspection.url,
      notes: `Ingested from AI Copilot verification. Safe Browsing: ${inspection.google_verdict}.`,
    });

    setInvestigatedIds((prev) => ({ ...prev, [messageId]: true }));
  };

  const handleExecuteAction = async (action: SuggestedAction) => {
    if (action.type === 'prompt' && action.prompt) {
      handleSendMessage(action.prompt);
    } else if (action.type === 'open_lookalike') {
      setActiveTab('lookalike-engine');
    } else if (action.type === 'draft_takedown' && action.url) {
      handleSendMessage(`Draft registrar abuse notice for ${action.url}`);
    } else if (action.type === 'generate_permutations') {
      const target = action.target || brandProfile?.brandName || 'Brand';
      setIsTyping(true);
      try {
        const res = await api.generatePermutations(target, 12);
        const permutations = res?.data?.permutations || [];
        const permMsg: ChatMessage = {
          id: `perm-${Date.now()}`,
          sender: 'copilot',
          text: `### 🌐 **Proactive Lookalikes Generated for ${target}**\n\nGenerated **${permutations.length}** attack surface permutations scored against Suraksha detection ontology:`,
          permutations: permutations,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, permMsg]);
      } catch {
        handleSendMessage(`Check proactive permutations for ${target}`);
      } finally {
        setIsTyping(false);
      }
    }
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || inputMessage;
    if (!textToSend.trim() || isTyping) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customPrompt) setInputMessage('');
    setIsTyping(true);

    try {
      const res = await api.chatWithCopilot({
        message: textToSend,
        history: messages.slice(-4).map((m) => ({
          role: m.sender === 'user' ? 'user' : 'assistant',
          content: m.text,
        })),
      });

      const data = res?.data || {};
      const copilotMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'copilot',
        text: data.response || 'Analysis complete.',
        inspection: data.inspection || undefined,
        suggested_actions: data.suggested_actions || undefined,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, copilotMsg]);
    } catch {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'copilot',
        text: "⚠️ I could not reach the backend security engine. Please verify the backend server is running on port 5000.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const topQuickPills = [
    { label: '🛡️ Scan PayPal Impersonator', prompt: 'Check https://paypal-security-login.xyz' },
    { label: '🛡️ Scan Apple ID Lure', prompt: 'Check https://apple-id-verify.top' },
    { label: '📋 Draft Abuse Notice', prompt: 'Draft registrar abuse notice for paypal-security-login.xyz' },
    { label: '🔬 Explain Combosquatting', prompt: 'Explain combosquatting attacks' },
    { label: '🔤 Explain Homoglyphs', prompt: 'What is a homoglyph and punycode attack?' },
  ];

  // Markdown renderer helper
  const renderFormattedMarkdown = (text: string, msgId: string) => {
    // If it contains a code block, format it cleanly with a copy button
    if (text.includes('```')) {
      const parts = text.split(/(```[\s\S]*?```)/g);
      return (
        <div className="space-y-2">
          {parts.map((part, idx) => {
            if (part.startsWith('```') && part.endsWith('```')) {
              const cleaned = part.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/, '');
              const blockId = `${msgId}-code-${idx}`;
              return (
                <div key={idx} className="relative my-2 rounded-lg bg-surface border border-line overflow-hidden font-mono text-[11px]">
                  <div className="flex items-center justify-between px-3 py-1.5 bg-surface2 border-b border-line text-fgMuted text-[10px]">
                    <span className="font-semibold uppercase tracking-wider">Takedown Notice Body</span>
                    <button
                      onClick={() => copyToClipboard(cleaned, blockId)}
                      className="inline-flex items-center gap-1 text-[10px] text-accent hover:text-accentHover transition-colors cursor-pointer"
                    >
                      {copiedId === blockId ? (
                        <>
                          <Check className="w-3 h-3 text-ok" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" /> Copy Notice
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="p-3 overflow-x-auto whitespace-pre leading-relaxed text-fgSubtle select-all">
                    {cleaned}
                  </pre>
                </div>
              );
            }
            return (
              <div key={idx} className="whitespace-pre-wrap leading-relaxed text-xs">
                {renderInline(part)}
              </div>
            );
          })}
        </div>
      );
    }

    return <div className="whitespace-pre-wrap leading-relaxed text-xs">{renderInline(text)}</div>;
  };

  return (
    <div className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] right-4 lg:bottom-5 lg:right-5 z-50 flex flex-col items-end">
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-accent text-onAccent shadow-2xl hover:bg-accentHover transition-all transform hover:scale-105 cursor-pointer border border-line"
          title="Open AI Security Copilot"
        >
          <div className="relative">
            <Bot className="w-5 h-5 text-onAccent" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-ok rounded-full animate-ping" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-ok rounded-full" />
          </div>
          <span className="text-xs font-semibold tracking-wide">AI Copilot</span>
        </button>
      )}

      {/* Interactive Chat Console Drawer */}
      {isOpen && (
        <div
          className={`transition-all duration-300 ease-out bg-surface border border-line rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-6 ${
            isExpanded
              ? 'w-[94vw] sm:w-[680px] h-[82vh] max-h-[760px]'
              : 'w-[360px] sm:w-[440px] h-[600px]'
          }`}
        >
          {/* Header */}
          <div className="p-3.5 bg-surface2 border-b border-line flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-1.5 rounded-lg bg-accent/15 text-accent border border-accent/30 shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="text-xs font-semibold text-fg">AI Defense Copilot</h3>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-ok/10 text-ok border border-ok/30 shrink-0">
                    Active Intel
                  </span>
                </div>
                <p className="text-[10px] text-fgMuted truncate">
                  Google Safe Browsing &bull; Real-time Rules &bull; Takedown Dispatch
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={handleExportTranscript}
                className="p-1.5 text-fgMuted hover:text-fg rounded-lg hover:bg-surface transition-colors cursor-pointer"
                title="Export investigation transcript (.md)"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 text-fgMuted hover:text-fg rounded-lg hover:bg-surface transition-colors cursor-pointer"
                title={isExpanded ? 'Restore window size' : 'Expand window'}
              >
                {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() =>
                  setMessages([
                    {
                      id: 'welcome',
                      sender: 'copilot',
                      text: "Chat cleared. Paste any link or question to inspect with Google Safe Browsing and Suraksha.",
                      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    },
                  ])
                }
                className="p-1.5 text-fgMuted hover:text-fg rounded-lg hover:bg-surface transition-colors cursor-pointer"
                title="Reset conversation"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-fgMuted hover:text-fg rounded-lg hover:bg-surface transition-colors cursor-pointer"
                title="Close Copilot"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Action Chips Bar */}
          <div className="px-3 py-2 bg-surface border-b border-line/60 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {topQuickPills.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(q.prompt)}
                disabled={isTyping}
                className="whitespace-nowrap px-2.5 py-1 text-[11px] rounded-full bg-surface2 border border-line text-fgSubtle hover:text-fg hover:border-accent transition-colors shrink-0 cursor-pointer disabled:opacity-50"
              >
                {q.label}
              </button>
            ))}
          </div>

          {/* Messages Thread */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 text-xs bg-surface/50">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[92%] rounded-xl p-3 border ${
                    m.sender === 'user'
                      ? 'bg-accent text-onAccent border-accent'
                      : 'bg-surface2 text-fg border-line shadow-xs'
                  }`}
                >
                  {/* Inspection Telemetry Card */}
                  {m.inspection && (
                    <div className="mb-2.5 p-3 rounded-lg bg-surface border border-line space-y-2.5 shadow-xs">
                      <div className="flex items-center justify-between gap-1.5 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <Fingerprint className="w-3.5 h-3.5 text-accent" />
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-fgSubtle">
                            Target Brand: <strong className="text-accent">{m.inspection.target_brand}</strong>
                          </span>
                        </div>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                            m.inspection.severity === 'CRITICAL'
                              ? 'bg-danger/10 text-danger border border-danger/30'
                              : m.inspection.severity === 'HIGH'
                              ? 'bg-high/10 text-high border border-high/30'
                              : 'bg-ok/10 text-ok border border-ok/30'
                          }`}
                        >
                          {m.inspection.severity} ({m.inspection.threat_score}/100)
                        </span>
                      </div>

                      {/* Google Safe Browsing Status */}
                      <div className="flex items-center justify-between gap-1 text-[11px] pt-1.5 border-t border-line/60">
                        <div className="flex items-center gap-1.5">
                          {m.inspection.is_flagged_by_google ? (
                            <ShieldAlert className="w-3.5 h-3.5 text-danger shrink-0" />
                          ) : (
                            <ShieldCheck className="w-3.5 h-3.5 text-ok shrink-0" />
                          )}
                          <span className="text-fgMuted text-[10px]">Google Safe Browsing:</span>
                        </div>
                        <span
                          className={`font-semibold text-[10px] ${
                            m.inspection.is_flagged_by_google ? 'text-danger' : 'text-ok'
                          }`}
                        >
                          {m.inspection.google_verdict}
                        </span>
                      </div>

                      {/* Detected Signals Pills */}
                      {m.inspection.signals && m.inspection.signals.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {m.inspection.signals.map((sig, sidx) => (
                            <span
                              key={sidx}
                              className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-surface2 border border-line text-fgSubtle"
                            >
                              {sig}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Action Bar for Threat Inspection */}
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-line/60 flex-wrap">
                        {m.inspection.advisory_url && (
                          <a
                            href={m.inspection.advisory_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] text-accent hover:underline"
                          >
                            Transparency Report <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}

                        <div className="flex items-center gap-1.5 ml-auto">
                          <button
                            onClick={() => handleAddToInvestigations(m.inspection!, m.id)}
                            disabled={investigatedIds[m.id]}
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-colors cursor-pointer ${
                              investigatedIds[m.id]
                                ? 'bg-ok/10 text-ok border border-ok/30 cursor-default'
                                : 'bg-surface2 border border-line hover:border-accent text-fgSubtle hover:text-fg'
                            }`}
                          >
                            {investigatedIds[m.id] ? (
                              <>
                                <Check className="w-3 h-3 text-ok" /> Added to Cases
                              </>
                            ) : (
                              <>
                                <PlusCircle className="w-3 h-3 text-accent" /> Ingest to Cases
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Render Message Body */}
                  {renderFormattedMarkdown(m.text, m.id)}

                  {/* Proactive Permutations Table Widget if included */}
                  {m.permutations && m.permutations.length > 0 && (
                    <div className="mt-3 p-2.5 rounded-lg bg-surface border border-line space-y-2">
                      <div className="flex items-center justify-between text-[10px] font-semibold text-fgMuted pb-1 border-b border-line">
                        <span>Domain Candidate</span>
                        <span>Technique</span>
                        <span>Risk Score</span>
                      </div>
                      <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                        {m.permutations.slice(0, 8).map((p, pidx) => (
                          <div
                            key={pidx}
                            className="flex items-center justify-between gap-2 text-[10px] p-1.5 rounded bg-surface2/60 hover:bg-surface2 border border-line/50 transition-colors"
                          >
                            <span className="font-mono text-fg font-medium truncate">{p.domain}</span>
                            <span className="text-fgMuted text-[9px] shrink-0">{p.technique}</span>
                            <span
                              className={`font-mono text-[9px] px-1.5 py-0.5 rounded shrink-0 ${
                                p.severity === 'CRITICAL'
                                  ? 'bg-danger/10 text-danger'
                                  : p.severity === 'HIGH'
                                  ? 'bg-high/10 text-high'
                                  : 'bg-ok/10 text-ok'
                              }`}
                            >
                              {p.risk_score}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Suggested Context Actions */}
                  {m.suggested_actions && m.suggested_actions.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-line/60 flex flex-wrap gap-1.5">
                      {m.suggested_actions.map((act, actIdx) => (
                        <button
                          key={actIdx}
                          onClick={() => handleExecuteAction(act)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-surface border border-line hover:border-accent text-fgSubtle hover:text-fg text-[10px] transition-colors cursor-pointer group"
                        >
                          <span>{act.label}</span>
                          <ChevronRight className="w-3 h-3 text-fgMuted group-hover:text-accent transition-colors" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <span className="text-[9px] text-fgSubtle mt-1 px-1">{m.timestamp}</span>
              </div>
            ))}

            {isTyping && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-surface2 border border-line text-xs text-fgMuted max-w-[85%]">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-accent" />
                <span className="text-[11px]">Suraksha Defense Copilot reasoning with live telemetry…</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <div className="p-2.5 bg-surface2 border-t border-line">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Ask Copilot or paste a URL to inspect…"
                className="flex-1 px-3 py-2 text-xs bg-surface border border-line rounded-lg text-fg placeholder:text-fgSubtle focus:outline-none focus:border-accent transition-colors"
                disabled={isTyping}
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || isTyping}
                className="p-2 rounded-lg bg-accent text-onAccent hover:bg-accentHover disabled:opacity-40 transition-colors cursor-pointer shrink-0"
                title="Send message"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
