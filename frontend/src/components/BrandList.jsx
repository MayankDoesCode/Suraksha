import React from 'react';
import {
  Shield,
  Globe,
  Share2,
  Smartphone,
  Search,
  ExternalLink,
  Edit2,
  Trash2,
  Eye,
  AlertTriangle,
  Calendar,
  Building2,
  CheckCircle2,
  Copy,
  Plus
} from 'lucide-react';

export default function BrandList({
  brands,
  loading,
  error,
  search,
  setSearch,
  onRefresh,
  onOpenCreate,
  onSelectBrand,
  onEditBrand,
  onDeleteBrand
}) {
  // Aggregate stats across real registered brands
  const totalBrands = brands.length;
  const totalDomains = brands.reduce((acc, b) => acc + (b.domains?.length || 0), 0);
  const totalSocial = brands.reduce((acc, b) => acc + (b.social_handles?.length || 0), 0);
  const totalApps = brands.reduce((acc, b) => acc + (b.app_identifiers?.length || 0), 0);

  const copyToClipboard = (text, e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
  };

  const formatDate = (isoString) => {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="cyber-panel p-4 rounded-xl border border-cyber-border flex items-center justify-between">
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-cyber-textMuted">
              Registered Brands
            </div>
            <div className="text-2xl font-bold font-mono text-white mt-1">
              {totalBrands}
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-cyber-accent/10 border border-cyber-accent/30 flex items-center justify-center text-cyber-accent">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        <div className="cyber-panel p-4 rounded-xl border border-cyber-border flex items-center justify-between">
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-cyber-textMuted">
              Verified Domains
            </div>
            <div className="text-2xl font-bold font-mono text-cyber-accent mt-1">
              {totalDomains}
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-cyber-accent/10 border border-cyber-accent/30 flex items-center justify-center text-cyber-accent">
            <Globe className="w-5 h-5" />
          </div>
        </div>

        <div className="cyber-panel p-4 rounded-xl border border-cyber-border flex items-center justify-between">
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-cyber-textMuted">
              Monitored Handles
            </div>
            <div className="text-2xl font-bold font-mono text-white mt-1">
              {totalSocial}
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Share2 className="w-5 h-5" />
          </div>
        </div>

        <div className="cyber-panel p-4 rounded-xl border border-cyber-border flex items-center justify-between">
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-cyber-textMuted">
              Tracked App Signatures
            </div>
            <div className="text-2xl font-bold font-mono text-white mt-1">
              {totalApps}
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-cyber-emerald">
            <Smartphone className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="cyber-panel p-4 rounded-xl flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-cyber-textMuted absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by brand name, description, or domain..."
            className="w-full bg-cyber-darkest border border-cyber-border rounded-lg pl-10 pr-4 py-2 text-xs text-white placeholder-cyber-textMuted focus:outline-none focus:border-cyber-accent focus:ring-1 focus:ring-cyber-accent transition-all"
          />
        </div>
        <div className="text-xs font-mono text-cyber-textMuted">
          Showing <span className="text-white font-semibold">{brands.length}</span> brand profiles
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="cyber-panel p-6 rounded-xl border border-cyber-border animate-pulse space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-cyber-surface"></div>
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-cyber-surface rounded w-1/3"></div>
                  <div className="h-3 bg-cyber-surface rounded w-1/2"></div>
                </div>
              </div>
              <div className="h-3 bg-cyber-surface rounded w-full"></div>
              <div className="h-8 bg-cyber-surface rounded w-full"></div>
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="p-6 rounded-xl bg-cyber-rose/10 border border-cyber-rose/40 text-cyber-rose flex items-start gap-4">
          <AlertTriangle className="w-6 h-6 shrink-0 mt-0.5" />
          <div className="space-y-2">
            <div className="font-semibold text-sm">Failed to load Brand Profiles</div>
            <div className="text-xs text-white/80">{error}</div>
            <button
              onClick={onRefresh}
              className="mt-2 px-3 py-1.5 rounded bg-cyber-rose text-white text-xs font-semibold hover:bg-rose-600 transition-colors"
            >
              Retry Connection
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && brands.length === 0 && (
        <div className="cyber-panel p-12 rounded-2xl border border-cyber-border text-center max-w-xl mx-auto my-8 space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-cyber-accent/10 border border-cyber-accent/30 text-cyber-accent flex items-center justify-center mx-auto shadow-glow">
            <Shield className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-wide">
              No Brand Profiles Registered
            </h3>
            <p className="text-xs text-cyber-textMuted mt-1.5 leading-relaxed max-w-md mx-auto">
              SentinelShield requires at least one organization profile to establish the baseline identity for impersonation detection, lookalike domain tracking, and mobile package protection.
            </p>
          </div>
          <button
            onClick={onOpenCreate}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-cyber-accent text-cyber-darkest text-xs font-semibold hover:bg-cyber-accentHover transition-all shadow-glow"
          >
            <Plus className="w-4 h-4" />
            REGISTER FIRST BRAND
          </button>
        </div>
      )}

      {/* Brand Profiles Cards */}
      {!loading && !error && brands.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {brands.map((brand) => {
            const primaryDomain = brand.domains?.find((d) => d.is_primary)?.domain || brand.domains?.[0]?.domain;
            return (
              <div
                key={brand.id}
                onClick={() => onSelectBrand(brand)}
                className="cyber-panel cyber-panel-hover p-6 rounded-xl border border-cyber-border cursor-pointer flex flex-col justify-between space-y-4 group"
              >
                {/* Brand Card Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    {brand.logo_url ? (
                      <img
                        src={brand.logo_url}
                        alt={brand.name}
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                        className="w-12 h-12 rounded-xl object-contain bg-cyber-surface border border-cyber-border p-1"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-cyber-surface border border-cyber-border flex items-center justify-center font-bold text-base text-cyber-accent font-mono">
                        {brand.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-white group-hover:text-cyber-accent transition-colors">
                          {brand.name}
                        </h3>
                      </div>
                      <div className="text-[11px] font-mono text-cyber-textMuted flex items-center gap-1.5 mt-0.5">
                        <span className="truncate max-w-[180px]">ID: {brand.id.slice(0, 8)}...</span>
                        <button
                          onClick={(e) => copyToClipboard(brand.id, e)}
                          title="Copy Full UUID"
                          className="hover:text-white"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Actions Dropdown / Buttons */}
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onSelectBrand(brand)}
                      title="Inspect Profile"
                      className="p-1.5 rounded hover:bg-cyber-surface text-cyber-textMuted hover:text-white transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onEditBrand(brand)}
                      title="Edit Profile"
                      className="p-1.5 rounded hover:bg-cyber-surface text-cyber-textMuted hover:text-cyber-accent transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDeleteBrand(brand)}
                      title="Delete Profile"
                      className="p-1.5 rounded hover:bg-cyber-surface text-cyber-textMuted hover:text-cyber-rose transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-cyber-textMuted line-clamp-2">
                  {brand.description || 'No corporate description provided.'}
                </p>

                {/* Assets Summary Pills */}
                <div className="space-y-2 pt-2 border-t border-cyber-border/60">
                  {/* Verified Domains */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-mono text-cyber-textMuted uppercase flex items-center gap-1">
                      <Globe className="w-3 h-3 text-cyber-accent" /> Domains:
                    </span>
                    {brand.domains && brand.domains.length > 0 ? (
                      brand.domains.slice(0, 2).map((dom) => (
                        <span
                          key={dom.id || dom.domain}
                          className={`text-[11px] font-mono px-2 py-0.5 rounded border ${
                            dom.is_primary
                              ? 'bg-cyber-accent/10 border-cyber-accent/30 text-cyber-accent'
                              : 'bg-cyber-surface border-cyber-border text-white'
                          }`}
                        >
                          {dom.domain}
                          {dom.is_primary && ' ★'}
                        </span>
                      ))
                    ) : (
                      <span className="text-[11px] text-cyber-textMuted italic">None registered</span>
                    )}
                    {brand.domains && brand.domains.length > 2 && (
                      <span className="text-[10px] font-mono text-cyber-textMuted">
                        +{brand.domains.length - 2} more
                      </span>
                    )}
                  </div>

                  {/* Social Handles */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-mono text-cyber-textMuted uppercase flex items-center gap-1">
                      <Share2 className="w-3 h-3 text-blue-400" /> Social:
                    </span>
                    {brand.social_handles && brand.social_handles.length > 0 ? (
                      brand.social_handles.slice(0, 2).map((soc) => (
                        <span
                          key={soc.id || `${soc.platform}-${soc.handle}`}
                          className="text-[11px] font-mono px-2 py-0.5 rounded bg-cyber-surface border border-cyber-border text-slate-300"
                        >
                          @{soc.handle} <span className="text-slate-500 text-[10px]">({soc.platform})</span>
                        </span>
                      ))
                    ) : (
                      <span className="text-[11px] text-cyber-textMuted italic">None registered</span>
                    )}
                    {brand.social_handles && brand.social_handles.length > 2 && (
                      <span className="text-[10px] font-mono text-cyber-textMuted">
                        +{brand.social_handles.length - 2} more
                      </span>
                    )}
                  </div>

                  {/* Mobile Apps */}
                  {brand.app_identifiers && brand.app_identifiers.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-mono text-cyber-textMuted uppercase flex items-center gap-1">
                        <Smartphone className="w-3 h-3 text-cyber-emerald" /> Apps:
                      </span>
                      {brand.app_identifiers.slice(0, 2).map((app) => (
                        <span
                          key={app.id || app.identifier}
                          className="text-[11px] font-mono px-2 py-0.5 rounded bg-cyber-surface border border-cyber-border text-cyber-emerald truncate max-w-[160px]"
                        >
                          {app.identifier}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Card Footer */}
                <div className="pt-2 border-t border-cyber-border/40 flex items-center justify-between text-[11px] font-mono text-cyber-textMuted">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Added: {formatDate(brand.created_at)}
                  </span>
                  <span className="text-cyber-accent group-hover:underline flex items-center gap-1">
                    Inspect profile →
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
