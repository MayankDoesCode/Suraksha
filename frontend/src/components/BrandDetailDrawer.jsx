import React from 'react';
import {
  X,
  Globe,
  Share2,
  Smartphone,
  Building2,
  Calendar,
  Copy,
  Edit2,
  Trash2,
  Shield,
  ExternalLink,
  Radar,
  CheckCircle2
} from 'lucide-react';

export default function BrandDetailDrawer({
  brand,
  onClose,
  onEdit,
  onDelete
}) {
  if (!brand) return null;

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const formatDate = (isoString) => {
    if (!isoString) return '—';
    try {
      return new Date(isoString).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short'
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-2xl h-full bg-cyber-dark border-l border-cyber-border flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-right duration-300">
        {/* Drawer Header */}
        <div className="p-6 border-b border-cyber-border flex items-start justify-between bg-cyber-surface/40">
          <div className="flex items-center gap-4">
            {brand.logo_url ? (
              <img
                src={brand.logo_url}
                alt={brand.name}
                onError={(e) => { e.target.style.display = 'none'; }}
                className="w-14 h-14 rounded-xl object-contain bg-cyber-surface border border-cyber-border p-1"
              />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-cyber-surface border border-cyber-border flex items-center justify-center font-bold text-lg text-cyber-accent font-mono">
                {brand.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <h2 className="text-lg font-bold text-fg tracking-wide">
                {brand.name}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-mono text-cyber-textMuted">ID: {brand.id}</span>
                <button
                  onClick={() => copyToClipboard(brand.id)}
                  title="Copy Full UUID"
                  className="text-cyber-textMuted hover:text-fg"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onEdit(brand)}
              className="p-2 rounded-lg bg-cyber-surface border border-cyber-border text-cyber-textMuted hover:text-cyber-accent hover:border-cyber-accent/40 transition-colors"
              title="Edit Profile"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(brand)}
              className="p-2 rounded-lg bg-cyber-surface border border-cyber-border text-cyber-textMuted hover:text-cyber-rose hover:border-cyber-rose/40 transition-colors"
              title="Delete Profile"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-cyber-surface border border-cyber-border text-cyber-textMuted hover:text-fg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Drawer Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Metadata Card */}
          <div className="cyber-panel p-4 rounded-xl border border-cyber-border space-y-3">
            <div className="text-[11px] font-mono uppercase tracking-wider text-cyber-textMuted">
              Profile Metadata & Description
            </div>
            <p className="text-xs text-fgMuted leading-relaxed">
              {brand.description || 'No corporate description provided.'}
            </p>
            <div className="grid grid-cols-2 gap-4 pt-3 border-t border-cyber-border/60 text-xs font-mono text-cyber-textMuted">
              <div>
                <span className="text-[10px] uppercase block text-fgSubtle">First Registered</span>
                <span className="text-fg">{formatDate(brand.created_at)}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase block text-fgSubtle">Last Baseline Update</span>
                <span className="text-fg">{formatDate(brand.updated_at)}</span>
              </div>
            </div>
          </div>

          {/* Verified Domains Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono uppercase tracking-wider text-cyber-accent font-semibold flex items-center gap-1.5">
                <Globe className="w-4 h-4" /> Verified Domains ({brand.domains?.length || 0})
              </h3>
            </div>
            <div className="space-y-2">
              {brand.domains && brand.domains.length > 0 ? (
                brand.domains.map((dom) => (
                  <div
                    key={dom.id || dom.domain}
                    className="cyber-panel p-3 rounded-lg border border-cyber-border flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-medium text-fg">
                        {dom.domain}
                      </span>
                      {dom.is_primary && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyber-accent/15 border border-cyber-accent/40 text-cyber-accent">
                          PRIMARY
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={`https://${dom.domain}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-cyber-textMuted hover:text-fg"
                        title="Visit Domain"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <button
                        onClick={() => copyToClipboard(dom.domain)}
                        className="text-cyber-textMuted hover:text-fg"
                        title="Copy Domain"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-cyber-textMuted italic p-3 rounded bg-cyber-surface/40 border border-cyber-border">
                  No verified domains configured for this profile.
                </div>
              )}
            </div>
          </div>

          {/* Official Social Handles */}
          <div className="space-y-3">
            <h3 className="text-xs font-mono uppercase tracking-wider text-cyber-accent font-semibold flex items-center gap-1.5">
              <Share2 className="w-4 h-4" /> Official Social Handles ({brand.social_handles?.length || 0})
            </h3>
            <div className="space-y-2">
              {brand.social_handles && brand.social_handles.length > 0 ? (
                brand.social_handles.map((soc) => (
                  <div
                    key={soc.id || `${soc.platform}-${soc.handle}`}
                    className="cyber-panel p-3 rounded-lg border border-cyber-border flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-mono font-medium text-fg flex items-center gap-2">
                        <span>@{soc.handle}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyber-surface border border-cyber-border text-accent uppercase">
                          {soc.platform}
                        </span>
                      </div>
                      {soc.url && (
                        <div className="text-[11px] text-cyber-textMuted truncate max-w-sm mt-0.5">
                          {soc.url}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => copyToClipboard(`@${soc.handle}`)}
                      className="text-cyber-textMuted hover:text-fg"
                      title="Copy Handle"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-xs text-cyber-textMuted italic p-3 rounded bg-cyber-surface/40 border border-cyber-border">
                  No official social accounts configured for this profile.
                </div>
              )}
            </div>
          </div>

          {/* Mobile App Signatures */}
          <div className="space-y-3">
            <h3 className="text-xs font-mono uppercase tracking-wider text-cyber-accent font-semibold flex items-center gap-1.5">
              <Smartphone className="w-4 h-4" /> Mobile App Packages ({brand.app_identifiers?.length || 0})
            </h3>
            <div className="space-y-2">
              {brand.app_identifiers && brand.app_identifiers.length > 0 ? (
                brand.app_identifiers.map((app) => (
                  <div
                    key={app.id || app.identifier}
                    className="cyber-panel p-3 rounded-lg border border-cyber-border flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-mono font-medium text-cyber-emerald">
                        {app.identifier}
                      </div>
                      <div className="text-[11px] text-cyber-textMuted flex items-center gap-2 mt-0.5">
                        <span className="capitalize">{app.platform.replace(/_/g, ' ')}</span>
                        {app.app_name && <span>• {app.app_name}</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => copyToClipboard(app.identifier)}
                      className="text-cyber-textMuted hover:text-fg"
                      title="Copy Identifier"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-xs text-cyber-textMuted italic p-3 rounded bg-cyber-surface/40 border border-cyber-border">
                  No mobile app identifiers configured for this profile.
                </div>
              )}
            </div>
          </div>

          {/* Known Developers & Publishers */}
          <div className="space-y-3">
            <h3 className="text-xs font-mono uppercase tracking-wider text-cyber-accent font-semibold flex items-center gap-1.5">
              <Building2 className="w-4 h-4" /> Known Publishers ({brand.publishers?.length || 0})
            </h3>
            <div className="space-y-2">
              {brand.publishers && brand.publishers.length > 0 ? (
                brand.publishers.map((pub) => (
                  <div
                    key={pub.id || pub.publisher_name}
                    className="cyber-panel p-3 rounded-lg border border-cyber-border flex items-center justify-between text-xs font-medium text-fg"
                  >
                    <span>{pub.publisher_name}</span>
                    {pub.platform && (
                      <span className="text-[10px] font-mono text-cyber-textMuted uppercase">
                        {pub.platform}
                      </span>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-xs text-cyber-textMuted italic p-3 rounded bg-cyber-surface/40 border border-cyber-border">
                  No publisher accounts registered for this profile.
                </div>
              )}
            </div>
          </div>

          {/* Phase 2 Preparedness Note */}
          <div className="p-4 rounded-xl bg-cyber-surface border border-cyber-accent/30 space-y-2">
            <div className="flex items-center gap-2 text-xs font-mono text-cyber-accent font-semibold">
              <Shield className="w-4 h-4" />
              <span>PHASE 2 DETECTION READINESS</span>
            </div>
            <p className="text-[11px] text-cyber-textMuted leading-relaxed">
              This profile baseline is persisted in the database and prepared to anchor upcoming Phase 2 automated connectors:
              Domain Squatting monitors, Social API crawlers, and App Store metadata scrapers.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
