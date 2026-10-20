import React from 'react';
import { LayoutDashboard, Share2, Smartphone, FileSearch, Building2 } from 'lucide-react';
import { useApp } from '../context/AppContext';

// Phone-width primary navigation (hidden from the lg breakpoint up, where the sidebar takes over).
const ITEMS = [
  { id: 'overview', label: 'Home', icon: LayoutDashboard },
  { id: 'social-monitoring', label: 'Social', icon: Share2 },
  { id: 'app-monitoring', label: 'Apps', icon: Smartphone },
  { id: 'reports', label: 'Findings', icon: FileSearch },
  { id: 'brand-profile', label: 'Assets', icon: Building2 },
] as const;

export const BottomNav: React.FC = () => {
  const { activeTab, setActiveTab } = useApp();
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-surface/95 backdrop-blur lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {ITEMS.map(({ id, label, icon: Icon }) => {
        const active = activeTab === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            aria-current={active ? 'page' : undefined}
            className={`flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${
              active ? 'text-accent' : 'text-fgMuted hover:text-fg'
            }`}
          >
            <Icon className="h-5 w-5" aria-hidden />
            <span>{label}</span>
          </button>
        );
      })}
    </nav>
  );
};
