import React from 'react';
import { ChevronRight, Menu, Search } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ThemeToggle } from '../context/ThemeContext';
import { pageInfo } from './navigation';

interface HeaderProps {
  onNavigateHome?: () => void;
  onToggleMobileMenu?: () => void;
  onOpenSearch?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileMenu, onOpenSearch }) => {
  const { activeTab } = useApp();
  const page = pageInfo(activeTab);
  const isMac = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform);

  return (
    <header className="relative z-20 flex h-12 shrink-0 items-center gap-2 border-b border-line bg-surface2/80 px-3 backdrop-blur-md sm:px-5">
      {onToggleMobileMenu && (
        <button onClick={onToggleMobileMenu} className="rounded-md p-1.5 text-fgMuted hover:bg-surface3 hover:text-fg lg:hidden" aria-label="Open navigation menu">
          <Menu className="h-4 w-4" />
        </button>
      )}
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1 text-[13px]">
        {page?.group && (
          <>
            <span className="hidden text-fgSubtle sm:inline">{page.group}</span>
            <ChevronRight className="hidden h-3 w-3 text-fgSubtle sm:inline" aria-hidden />
          </>
        )}
        <h1 className="truncate font-medium text-fg">{page?.label ?? 'SURAKSHA'}</h1>
      </nav>
      <div className="ml-auto flex items-center gap-1.5">
        <button
          onClick={onOpenSearch}
          className="flex items-center gap-2 rounded-lg border border-line bg-surface/60 px-2.5 py-1.5 text-xs text-fgSubtle transition-colors hover:bg-surface3 hover:text-fgMuted sm:min-w-[200px]"
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
