import React from 'react';
import { ArrowLeft, ChevronDown, LogOut, RefreshCw } from 'lucide-react';
import { SurakshaLogo } from './SurakshaLogo';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { NAV_GROUPS } from './navigation';

interface SidebarProps {
  onNavigateHome?: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

const COLLAPSE_KEY = 'suraksha.nav.collapsed'; // which groups are folded; a UI preference only

const readCollapsed = (): Record<string, boolean> => {
  try {
    return JSON.parse(window.localStorage.getItem(COLLAPSE_KEY) || '{}');
  } catch {
    return {};
  }
};

export const Sidebar: React.FC<SidebarProps> = ({ onNavigateHome, isOpen, onClose }) => {
  const {
    activeTab, setActiveTab, brandProfile, stats, resetAllToDemoData, backendOnline, isDemoMode,
    backendBrands, selectedBackendBrandId, selectBrandById, enterDemoMode,
  } = useApp();
  const { currentUser, userProfile, logOut } = useAuth();
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>(readCollapsed);

  const toggle = (id: string) =>
    setCollapsed((c) => {
      const next = { ...c, [id]: !c[id] };
      try { window.localStorage.setItem(COLLAPSE_KEY, JSON.stringify(next)); } catch { /* not persisted */ }
      return next;
    });

  const counts: Record<string, { n: number; tone: 'danger' | 'warn' } | undefined> = {
    overview: stats.activeAlerts ? { n: stats.activeAlerts, tone: 'danger' } : undefined,
    'investigation-center': stats.investigatingCount ? { n: stats.investigatingCount, tone: 'warn' } : undefined,
  };

  const hasBrand = !!brandProfile.brandName && brandProfile.brandName !== 'No Brand Registered';
  const displayName = userProfile?.displayName || currentUser?.displayName || currentUser?.email || null;
  const go = (id: string) => { setActiveTab(id); onClose?.(); };

  const body = (mobile: boolean) => (
    <div className="flex h-full flex-col text-fg">
      {/* Workspace / brand switcher */}
      <div className="px-3 pb-2 pt-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => (onNavigateHome ? onNavigateHome() : (window.location.href = '/'))}
            title="Back to site"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface2 border border-line hover:border-accent/40 hover:bg-surface3 transition-all"
          >
            <SurakshaLogo size={19} />
          </button>
          <div className="relative min-w-0 flex-1">
            <select
              aria-label="Brand"
              value={isDemoMode ? 'demo' : selectedBackendBrandId || ''}
              onChange={(e) => (e.target.value === 'demo' ? enterDemoMode() : e.target.value && selectBrandById(e.target.value))}
              className="w-full cursor-pointer appearance-none truncate rounded-md bg-transparent py-1 pl-1.5 pr-6 text-[13px] font-medium text-fg hover:bg-surface3 focus:bg-surface3"
            >
              {backendBrands.length === 0 && !isDemoMode && <option value="">{hasBrand ? brandProfile.brandName : 'No brand yet'}</option>}
              {backendBrands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              {isDemoMode && <option value="demo">Demo brand</option>}
            </select>
            <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-fgSubtle" />
          </div>
          {mobile && <button onClick={onClose} className="rounded-md px-2 py-1 text-xs text-fgMuted hover:bg-surface3">Close</button>}
        </div>
        <p className="mt-1 pl-1.5 text-[11px] text-fgSubtle">{isDemoMode ? 'Demo data (synthetic)' : 'Live workspace'}</p>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-3" aria-label="Primary">
        {NAV_GROUPS.map((group) => {
          const folded = !!(group.title && collapsed[group.id]);
          return (
            <div key={group.id} className={group.title ? 'mt-3' : 'mt-1'}>
              {group.title && (
                <button
                  onClick={() => toggle(group.id)}
                  aria-expanded={!folded}
                  className="flex w-full items-center gap-1 px-2 py-1 text-[11px] font-medium text-fgSubtle hover:text-fgMuted"
                >
                  {group.title}
                  <ChevronDown className={`h-3 w-3 transition-transform ${folded ? '-rotate-90' : ''}`} />
                </button>
              )}
              {!folded && (
                <ul className="mt-0.5 space-y-px">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = activeTab === item.id;
                    const count = counts[item.id];
                    return (
                      <li key={item.id}>
                        <button
                          onClick={() => go(item.id)}
                          aria-current={active ? 'page' : undefined}
                          className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[13px] transition-colors ${
                            active ? 'bg-surface3 font-medium text-fg' : 'text-fgMuted hover:bg-surface3/60 hover:text-fg'
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{item.label}</span>
                          {count && (
                            <span className={`ml-auto text-[11px] tabular-nums ${count.tone === 'danger' ? 'text-danger' : 'text-warn'}`}>{count.n}</span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </nav>

      <div className="space-y-1 px-3 pb-3 pt-2">
        <p className="flex items-center gap-1.5 px-1 text-[11px] text-fgSubtle">
          <span className={`h-1.5 w-1.5 rounded-full ${backendOnline ? 'bg-ok' : 'bg-warn'}`} aria-hidden />
          {backendOnline ? 'Backend connected' : 'Backend unreachable'}
        </p>
        {isDemoMode && (
          <button onClick={resetAllToDemoData} className="flex w-full items-center gap-1.5 rounded-md px-1 py-1 text-[11px] text-fgMuted hover:bg-surface3 hover:text-fg">
            <RefreshCw className="h-3 w-3" /> Reset demo data
          </button>
        )}
        <div className="flex items-center gap-2 rounded-md px-1 py-1">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface3 text-[10px] font-medium text-fgMuted">
            {(displayName || 'D')[0].toUpperCase()}
          </span>
          <span className="min-w-0 flex-1 truncate text-xs text-fgMuted">{displayName || (isDemoMode ? 'Demo session' : 'Signed in')}</span>
          {currentUser ? (
            <button onClick={() => logOut()} aria-label="Sign out" title="Sign out" className="rounded p-1 text-fgSubtle hover:text-danger"><LogOut className="h-3.5 w-3.5" /></button>
          ) : (
            <button onClick={() => (onNavigateHome ? onNavigateHome() : (window.location.href = '/'))} aria-label="Leave demo" title="Leave demo" className="rounded p-1 text-fgSubtle hover:text-fg"><ArrowLeft className="h-3.5 w-3.5" /></button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden w-56 shrink-0 lg:block">{body(false)}</aside>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <div className="fixed inset-0 bg-black/50" onClick={onClose} />
          <aside className="relative z-50 h-full w-64 max-w-[85vw] border-r border-line bg-canvas">{body(true)}</aside>
        </div>
      )}
    </>
  );
};

export default Sidebar;
