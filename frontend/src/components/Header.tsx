import React from 'react';
import { ChevronRight, Fingerprint, Menu, Search, Zap } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ThemeToggle } from '../context/ThemeContext';
import { pageInfo } from './navigation';

interface HeaderProps {
  onNavigateHome?: () => void;
  onToggleMobileMenu?: () => void;
  onOpenSearch?: () => void;
  onOpenThreatInspector?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleMobileMenu,
  onOpenSearch,
  onOpenThreatInspector,
}) => {
  const { activeTab, brandProfile, backendOnline } = useApp();
  const page = pageInfo(activeTab);
  const isMac = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform);

  return (
    <header className="relative z-20 flex h-12 shrink-0 items-center gap-2 border-b border-line bg-surface2/80 px-3 backdrop-blur-md sm:px-5">
      {onToggleMobileMenu && (
        <button onClick={onToggleMobileMenu} className="rounded-md p-1.5 text-fgMuted hover:bg-surface3 hover:text-fg lg:hidden cursor-pointer" aria-label="Open navigation menu">
          <Menu className="h-4 w-4" />
        </button>
      )}
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-[13px]">
        {page?.group && (
          <>
            <span className="hidden text-fgSubtle sm:inline font-mono uppercase tracking-wider text-[11px]">{page.group}</span>
            <ChevronRight className="hidden h-3 w-3 text-fgSubtle sm:inline" aria-hidden />
          </>
        )}
        <h1 className="truncate font-semibold text-fg tracking-tight">{page?.label ?? 'SURAKSHA'}</h1>
      </nav>

      <div className="ml-auto flex items-center gap-2">
        {/* Active Protected Brand & SOC Status */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-surface/80 border border-line text-xs font-mono shadow-xs">
          <span className={`w-2 h-2 rounded-full ${backendOnline ? 'bg-ok animate-pulse' : 'bg-warn'}`} />
          <span className="text-fgMuted text-[11px]">Brand:</span>
          <span className="text-accent font-semibold text-[11px] truncate max-w-[150px]">
            {brandProfile.brandName || 'Acme Corp'}
          </span>
        </div>

        {/* Threat X-Ray Quick Inspector Trigger */}
        <button
          onClick={onOpenThreatInspector}
          className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-accent/30 bg-accent/10 px-2.5 py-1.5 text-xs font-medium text-accent hover:bg-accent/20 transition-all cursor-pointer shadow-xs"
          title="Inspect character homoglyphs and test threats live (Ctrl/Cmd + I)"
          aria-label="Open Threat X-Ray live inspector"
        >
          <Fingerprint className="h-3.5 w-3.5" />
          <span>Threat X-Ray</span>
          <kbd className="hidden lg:inline rounded border border-accent/30 bg-accent/10 px-1 text-[9px] font-mono text-accent">
            {isMac ? '⌘' : 'Ctrl'}I
          </kbd>
        </button>

        <button
          onClick={onOpenSearch}
          className="flex items-center gap-2 rounded-lg border border-line bg-surface/60 px-2.5 py-1.5 text-xs text-fgSubtle transition-colors hover:bg-surface3 hover:text-fgMuted sm:min-w-[170px] cursor-pointer"
          aria-label="Search pages and findings"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Search</span>
          <kbd className="ml-auto hidden rounded border border-line px-1 text-[10px] sm:inline">{isMac ? '⌘' : 'Ctrl'} K</kbd>
        </button>
        <ThemeToggle />
      </div>
    </header>
  );
};

export default Header;
