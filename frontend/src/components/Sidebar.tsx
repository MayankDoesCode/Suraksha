import React from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Shield,
  Share2,
  Smartphone,
  Binary,
  FolderSearch,
  Network,
  FileSpreadsheet,
  AlertOctagon,
  RefreshCw,
  Building2,
  ExternalLink,
  LogOut,
  User,
  Activity,
  Home,
  X,
  Radar,
  Radio,
} from 'lucide-react';

interface SidebarProps {
  onNavigateHome?: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onNavigateHome, isOpen, onClose }) => {
  const {
    activeTab,
    setActiveTab,
    brandProfile,
    stats,
    resetAllToDemoData,
    backendOnline,
    selectedBackendBrandId,
    isDemoMode,
  } = useApp();
  const { currentUser, userProfile, logOut } = useAuth();

  const navItems = [
    {
      id: 'overview',
      label: 'Executive Command Center',
      icon: LayoutDashboard,
      badge: stats.activeAlerts > 0 ? `${stats.activeAlerts}` : undefined,
      isOverview: true,
    },
    {
      id: 'watchtower',
      label: 'Brand Impersonation Watchtower',
      icon: Radar,
      badge: 'Perimeter',
      badgeColor: 'bg-[#45C8E8]/10 text-[#45C8E8] border border-[#45C8E8]/25',
    },
    {
      id: 'brand-profile',
      label: 'Official Brand Registry',
      icon: Building2,
      subtitle: brandProfile.brandName,
    },
    {
      id: 'social-monitoring',
      label: 'Social Identity Monitor',
      icon: Share2,
      badge: 'ML Engine',
      badgeColor: 'bg-[#9B8AFB]/10 text-[#9B8AFB] border border-[#9B8AFB]/25',
    },
    {
      id: 'app-monitoring',
      label: 'App Store Monitor',
      icon: Smartphone,
      badge: 'Heuristics',
      badgeColor: 'bg-[#45C8E8]/10 text-[#45C8E8] border border-[#45C8E8]/25',
    },
    {
      id: 'lookalike-engine',
      label: 'Look-alike Similarity Engine',
      icon: Binary,
      badge: 'Algorithms',
      badgeColor: 'bg-[#16253D] text-[#8EA2C6] border border-[#1E314F]',
    },
    {
      id: 'investigation-center',
      label: 'Investigation Center',
      icon: FolderSearch,
      badge: stats.investigatingCount > 0 ? `${stats.investigatingCount} Active` : undefined,
      badgeColor: 'bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/25',
    },
    {
      id: 'threat-graph',
      label: 'Threat Relationship Graph',
      icon: Network,
      badge: 'Clusters',
      badgeColor: 'bg-[#16253D] text-[#8EA2C6] border border-[#1E314F]',
    },
    {
      id: 'reports',
      label: 'Intelligence Dossiers & Exports',
      icon: FileSpreadsheet,
    },
    {
      id: 'diagnostics',
      label: 'System Diagnostics & Telemetry',
      icon: Activity,
      badge: backendOnline ? 'Operational' : 'Local Dev',
      badgeColor: backendOnline
        ? 'bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/25'
        : 'bg-[#16253D] text-[#8EA2C6] border border-[#1E314F]',
    },
  ];

  const handleReturnHome = () => {
    if (onNavigateHome) {
      onNavigateHome();
    } else {
      window.location.href = '/';
    }
  };

  const handleNavClick = (tabId: string) => {
    setActiveTab(tabId);
    if (onClose) onClose();
  };

  const renderSidebarBody = (isMobile = false) => (
    <div className="flex flex-col h-full overflow-hidden bg-[#080F1D] text-[#F8FAFC]">
      {/* 1. Brand Header */}
      <div className="p-4 sm:p-5 border-b border-[#1E314F]">
        <div className="flex items-center justify-between">
          <div
            onClick={handleReturnHome}
            className="flex items-center gap-3 cursor-pointer group select-none"
            title="Return to Public Landing Page"
          >
            <div className="w-9 h-9 rounded-lg bg-[#111D30] border border-[#1E314F] group-hover:border-[#45C8E8]/40 flex items-center justify-center shrink-0 transition-colors shadow-xs">
              <Shield className="w-4 h-4 text-[#45C8E8]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm tracking-tight text-[#F8FAFC] font-mono">SURAKSHA</span>
                <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-[#45C8E8]/10 text-[#45C8E8] font-mono font-semibold border border-[#45C8E8]/30">
                  DRP
                </span>
              </div>
              <p className="text-[9px] font-mono tracking-widest text-[#8EA2C6] uppercase mt-0.5">
                RISK PROTECTION PLATFORM
              </p>
            </div>
          </div>

          {isMobile && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#8EA2C6] hover:text-white hover:bg-[#111D30] transition-colors"
              title="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* 2. Public Portal Link */}
        <div className="mt-3">
          <button
            onClick={handleReturnHome}
            className="w-full text-left px-3 py-1.5 rounded-lg bg-[#111D30]/70 hover:bg-[#16253D] text-[11px] text-[#8EA2C6] hover:text-[#45C8E8] border border-[#1E314F] transition-all flex items-center justify-between group cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Home className="w-3.5 h-3.5 text-[#45C8E8]" />
              <span className="font-medium">Public Platform Portal</span>
            </div>
            <ExternalLink className="w-3 h-3 text-[#8EA2C6] group-hover:text-white transition-colors" />
          </button>
        </div>

        {/* 3. Monitored Scope Indicator */}
        <div className="mt-2.5 p-2.5 rounded-lg bg-[#111D30] border border-[#1E314F] flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-hidden">
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                isDemoMode ? 'bg-[#F59E0B]' : 'bg-[#10B981]'
              }`}
            />
            <div className="truncate">
              <p className="text-[9px] uppercase font-mono tracking-wider font-semibold text-[#8EA2C6]">
                {isDemoMode ? 'DEMO SANDBOX SCOPE' : 'PRODUCTION WORKSPACE'}
              </p>
              <p className="text-xs font-semibold text-[#F8FAFC] truncate">
                {brandProfile.brandName && brandProfile.brandName !== 'No Brand Registered'
                  ? brandProfile.brandName
                  : (isDemoMode ? 'ApexPay Global (Demo)' : 'No Brand Selected')}
              </p>
            </div>
          </div>
          <button
            onClick={() => handleNavClick('brand-profile')}
            className="text-[#8EA2C6] hover:text-[#45C8E8] p-1 rounded hover:bg-[#16253D] transition-colors cursor-pointer"
            title="Inspect Brand Profile"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 4. Core Threat Modules Navigation */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        <div className="px-3 pt-2 pb-1 text-[9.5px] font-mono font-semibold uppercase tracking-wider text-[#8EA2C6]/70">
          OPERATIONAL MODULES
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all group cursor-pointer ${
                isActive
                  ? 'bg-[#16253D] text-[#F8FAFC] border-l-2 border-[#45C8E8] pl-2.5 font-semibold'
                  : 'text-[#8EA2C6] hover:text-[#F8FAFC] hover:bg-[#111D30]'
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <Icon
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    isActive ? 'text-[#45C8E8]' : 'text-[#8EA2C6] group-hover:text-[#45C8E8]'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </div>

              {item.isOverview && item.badge ? (
                <span className="px-1.5 py-0.2 rounded-full bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30 font-mono text-[10px] font-bold shrink-0 ml-2">
                  {item.badge}
                </span>
              ) : item.badge ? (
                <span
                  className={`text-[9px] px-2 py-0.5 rounded font-mono font-medium shrink-0 ml-2 ${
                    item.badgeColor || 'bg-[#16253D] text-[#8EA2C6] border border-[#1E314F]'
                  }`}
                >
                  {item.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      {/* 5. Severity Status Widget */}
      <div className="p-3 mx-3 mb-2 rounded-lg bg-[#111D30] border border-[#1E314F]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-[11px] font-mono font-semibold uppercase text-[#F8FAFC]">
            <AlertOctagon className="w-3.5 h-3.5 text-[#EF4444]" />
            <span>INCIDENT POSTURE</span>
          </div>
          <span className="text-[9.5px] text-[#8EA2C6] font-mono">Triage Queue</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="p-2 rounded bg-[#080F1D] border border-[#1E314F]">
            <span className="block text-sm font-bold text-[#EF4444] font-mono">
              {stats.criticalRiskCount}
            </span>
            <span className="text-[9px] uppercase tracking-wider text-[#EF4444] font-mono font-semibold">
              CRITICAL
            </span>
          </div>
          <div className="p-2 rounded bg-[#080F1D] border border-[#1E314F]">
            <span className="block text-sm font-bold text-[#F97316] font-mono">
              {stats.highRiskCount}
            </span>
            <span className="text-[9px] uppercase tracking-wider text-[#F97316] font-mono font-semibold">
              HIGH
            </span>
          </div>
        </div>
      </div>

      {/* 6. Analyst Profile Card */}
      <div className="px-3 py-2 mx-3 mb-2 rounded-lg bg-[#111D30] border border-[#1E314F] flex items-center justify-between">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="w-7 h-7 rounded bg-[#16253D] border border-[#1E314F] flex items-center justify-center shrink-0 text-[#45C8E8]">
            <User className="w-3.5 h-3.5" />
          </div>
          <div className="truncate">
            <p className="text-xs font-medium text-[#F8FAFC] truncate">
              {userProfile?.displayName || currentUser?.displayName || 'Alex Mercer'}
            </p>
            <p className="text-[9.5px] font-mono text-[#8EA2C6] truncate">
              {userProfile?.role ? `${userProfile.role} • SecOps` : 'Lead Analyst • SecOps'}
            </p>
          </div>
        </div>
        <button
          onClick={() => logOut()}
          className="p-1.5 rounded text-[#8EA2C6] hover:text-[#EF4444] hover:bg-[#16253D] transition-colors ml-1 cursor-pointer"
          title="Sign out of workspace"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 7. Bottom Workspace Status Controls */}
      {isDemoMode ? (
        <div className="p-2.5 border-t border-[#1E314F] bg-[#080F1D] flex items-center justify-between text-xs text-[#8EA2C6]">
          <div className="flex flex-col">
            <span className="text-[10.5px] font-medium text-[#F8FAFC]">
              Demo Sandbox
            </span>
            <span className="text-[9px] font-mono text-[#8EA2C6]">
              Synthetic Scenarios
            </span>
          </div>
          <button
            onClick={resetAllToDemoData}
            className="px-2 py-1 rounded bg-[#111D30] hover:bg-[#16253D] border border-[#1E314F] hover:border-[#45C8E8]/30 text-[#F8FAFC] transition-all flex items-center gap-1.5 text-[11px] font-mono font-medium cursor-pointer"
            title="Reset sandbox demo scenarios"
          >
            <RefreshCw className="w-3 h-3 text-[#45C8E8]" />
            <span>Reset Demo</span>
          </button>
        </div>
      ) : (
        <div className="p-2.5 border-t border-[#1E314F] bg-[#080F1D] flex items-center justify-between text-xs text-[#8EA2C6]">
          <div className="flex flex-col">
            <span className="text-[10.5px] font-medium text-[#F8FAFC]">
              Production Workspace
            </span>
            <span className="text-[9px] font-mono text-[#8EA2C6]">
              {selectedBackendBrandId ? 'Active Protected Asset' : 'Clean Slate (0 Alerts)'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#10B981]/10 border border-[#10B981]/25">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
            <span className="text-[10px] font-mono text-[#10B981]">Encrypted</span>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden lg:flex w-72 lg:w-80 bg-[#080F1D] text-[#F8FAFC] flex-col shrink-0 border-r border-[#1E314F] shadow-xl select-none z-30 font-sans">
        {renderSidebarBody(false)}
      </aside>

      {/* Mobile Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-xs transition-opacity"
            onClick={onClose}
          />
          <aside className="relative w-72 max-w-[85vw] h-full bg-[#080F1D] text-[#F8FAFC] flex flex-col border-r border-[#1E314F] shadow-2xl z-50">
            {renderSidebarBody(true)}
          </aside>
        </div>
      )}
    </>
  );
};

export default Sidebar;
