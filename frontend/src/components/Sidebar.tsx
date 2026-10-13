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
} from 'lucide-react';

interface SidebarProps {
  onNavigateHome?: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onNavigateHome, isOpen, onClose }) => {
  const { activeTab, setActiveTab, brandProfile, stats, resetAllToDemoData, backendOnline, selectedBackendBrandId } = useApp();
  const { currentUser, userProfile, logOut } = useAuth();

  const navItems = [
    {
      id: 'overview',
      label: 'Overview Dashboard',
      icon: LayoutDashboard,
      badge: '3',
      isOverview: true,
    },
    {
      id: 'brand-profile',
      label: 'Official Brand Profile',
      icon: Building2,
      subtitle: brandProfile.brandName,
    },
    {
      id: 'social-monitoring',
      label: 'Social Media Monitor',
      icon: Share2,
      badge: 'AI Engine',
      badgeColor: 'bg-[#00D9FF]/10 text-[#00D9FF] border border-[#00D9FF]/30',
    },
    {
      id: 'app-monitoring',
      label: 'App Store Monitor',
      icon: Smartphone,
      badge: 'AI Engine',
      badgeColor: 'bg-[#00D9FF]/10 text-[#00D9FF] border border-[#00D9FF]/30',
    },
    {
      id: 'lookalike-engine',
      label: 'Look-alike Engine',
      icon: Binary,
      badge: 'Heuristics',
      badgeColor: 'bg-[#8B5CF6]/15 text-[#8B5CF6] border border-[#8B5CF6]/30',
    },
    {
      id: 'investigation-center',
      label: 'Investigation Center',
      icon: FolderSearch,
      badge: stats.investigatingCount > 0 ? `${stats.investigatingCount} Active` : '2 Active',
      badgeColor: 'bg-[#FFB020]/15 text-[#FFB020] border border-[#FFB020]/30',
    },
    {
      id: 'threat-graph',
      label: 'Threat Relationship Graph',
      icon: Network,
      badge: 'Interactive',
      badgeColor: 'bg-[#8B5CF6]/15 text-[#8B5CF6] border border-[#8B5CF6]/30',
    },
    {
      id: 'reports',
      label: 'Intelligence Reports',
      icon: FileSpreadsheet,
    },
    {
      id: 'diagnostics',
      label: 'System Diagnostics',
      icon: Activity,
      badge: backendOnline ? 'API Online' : 'Local Dev',
      badgeColor: backendOnline
        ? 'bg-[#00E5A0]/15 text-[#00E5A0] border border-[#00E5A0]/30'
        : 'bg-[#0A1C3D] text-[#91ACD1] border border-[#123E78]',
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
    <div className="flex flex-col h-full overflow-hidden">
      {/* 1. Brand Header */}
      <div className="p-4 sm:p-5 border-b border-[#123E78]">
        <div className="flex items-center justify-between">
          <div
            onClick={handleReturnHome}
            className="flex items-center gap-3 cursor-pointer group"
            title="Return to Public Landing Page"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1265F8] via-[#1265F8]/80 to-[#00D9FF] p-[1.5px] shadow-[0_0_15px_rgba(18,101,248,0.4)] shrink-0 group-hover:scale-105 transition-transform">
              <div className="w-full h-full rounded-[10px] bg-[#030D22]/85 backdrop-blur-md flex items-center justify-center border border-[#00D9FF]/40">
                <Shield className="w-5 h-5 text-[#00D9FF]" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-base tracking-tight text-[#F1F5FF] font-mono">Suraksha</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#00D9FF]/15 text-[#00D9FF] font-bold font-mono border border-[#00D9FF]/30">
                  AI
                </span>
              </div>
              <p className="text-[9.5px] font-mono font-medium tracking-widest text-[#91ACD1] uppercase mt-0.5">
                DIGITAL BRAND PROTECTION MATRIX
              </p>
            </div>
          </div>

          {isMobile && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#91ACD1] hover:text-white hover:bg-[#0A1C3D] transition-colors"
              title="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* 2. Public Navigation Row */}
        <div className="mt-3.5">
          <button
            onClick={handleReturnHome}
            className="w-full text-left px-3 py-2 rounded-xl bg-[#06142D] hover:bg-[#0A1C3D] text-xs text-[#00D9FF] hover:text-white border border-[#123E78] transition-all flex items-center justify-between group cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Home className="w-3.5 h-3.5 text-[#00D9FF] group-hover:-translate-x-0.5 transition-transform" />
              <span className="font-medium">Public Site / Landing</span>
            </div>
            <ExternalLink className="w-3 h-3 text-[#91ACD1] group-hover:text-white transition-colors" />
          </button>
        </div>

        {/* 3. Sandbox Brand Section */}
        <div className="mt-3 p-3 rounded-xl bg-[#06142D] border border-[#123E78] flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-2 h-2 rounded-full bg-[#00E5A0] shadow-[0_0_8px_#00E5A0] animate-pulse shrink-0" />
            <div className="truncate">
              <p className="text-[9.5px] uppercase font-mono tracking-wider font-semibold text-[#91ACD1]">
                SANDBOX BRAND
              </p>
              <p className="text-xs font-bold text-[#F1F5FF] truncate mt-0.5">
                {brandProfile.brandName || 'ApexPay'}
              </p>
            </div>
          </div>
          <button
            onClick={() => handleNavClick('brand-profile')}
            className="text-[#91ACD1] hover:text-white p-1 rounded-lg hover:bg-[#0A1C3D] transition-colors cursor-pointer"
            title="Edit Brand Profile"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 4. Core Threat Modules Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="px-3 pt-2 pb-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-[#91ACD1]/80">
          CORE THREAT MODULES
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all group cursor-pointer ${
                isActive
                  ? 'bg-[#1265F8] text-white shadow-[0_0_18px_rgba(18,101,248,0.45)] border border-[#00D9FF]/50 font-semibold'
                  : 'text-[#91ACD1] hover:text-[#F1F5FF] hover:bg-[#0A1C3D]'
              }`}
            >
              <div className="flex items-center gap-3 truncate">
                <Icon
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    isActive ? 'text-white' : 'text-[#91ACD1] group-hover:text-[#00D9FF]'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </div>

              {item.isOverview ? (
                <span className="w-5 h-5 rounded-full bg-[#FF315B] text-white font-mono text-[10px] font-bold flex items-center justify-center shadow-xs shrink-0 ml-2">
                  {item.badge}
                </span>
              ) : item.badge ? (
                <span
                  className={`text-[9.5px] px-2 py-0.5 rounded-full font-mono font-semibold shrink-0 ml-2 ${
                    item.badgeColor || 'bg-[#0A1C3D] text-[#91ACD1] border border-[#123E78]'
                  }`}
                >
                  {item.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      {/* 5. Threat Radar Widget */}
      <div className="p-3 mx-3 mb-2 rounded-xl bg-[#06142D] border border-[#123E78] shadow-lg">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs font-bold font-mono uppercase text-[#F1F5FF]">
            <AlertOctagon className="w-3.5 h-3.5 text-[#FF315B]" />
            <span>THREAT RADAR</span>
          </div>
          <span className="text-[10px] text-[#91ACD1] font-mono">Prototype Mode</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="p-2 rounded-lg bg-[#FF315B]/10 border border-[#FF315B]/30">
            <span className="block text-base font-bold text-[#FF315B] font-mono">
              {stats.criticalRiskCount || 3}
            </span>
            <span className="text-[9px] uppercase tracking-wider text-[#FF315B] font-mono font-bold">
              CRITICAL
            </span>
          </div>
          <div className="p-2 rounded-lg bg-[#FFB020]/10 border border-[#FFB020]/30">
            <span className="block text-base font-bold text-[#FFB020] font-mono">
              {stats.highRiskCount || 0}
            </span>
            <span className="text-[9px] uppercase tracking-wider text-[#FFB020] font-mono font-bold">
              HIGH
            </span>
          </div>
        </div>
      </div>

      {/* 6. Analyst Profile Card */}
      <div className="px-3 py-2.5 mx-3 mb-2 rounded-xl bg-[#06142D] border border-[#123E78] flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-8 h-8 rounded-full bg-[#1265F8]/20 border border-[#1265F8]/50 flex items-center justify-center shrink-0 text-[#00D9FF]">
            <User className="w-4 h-4" />
          </div>
          <div className="truncate">
            <p className="text-xs font-semibold text-[#F1F5FF] truncate">
              {userProfile?.displayName || currentUser?.displayName || 'Alex Mercer (Threat Lead)'}
            </p>
            <p className="text-[9.5px] font-mono text-[#91ACD1] truncate">
              SURAKSHA SecOps
            </p>
          </div>
        </div>
        <button
          onClick={() => logOut()}
          className="p-1.5 rounded-lg text-[#91ACD1] hover:text-[#FF315B] hover:bg-[#0A1C3D] transition-colors ml-1 cursor-pointer"
          title="Sign out of workspace"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 7. Bottom Sandbox Controls */}
      <div className="p-3 border-t border-[#123E78] bg-[#030D22] flex items-center justify-between text-xs text-[#91ACD1]">
        <div className="flex flex-col">
          <span className="text-[11px] font-semibold text-[#F1F5FF]">ApexPay Sandbox</span>
          <span className="text-[9.5px] font-mono text-[#91ACD1]">Synthetic Scenarios</span>
        </div>
        <button
          onClick={resetAllToDemoData}
          className="px-2.5 py-1.5 rounded-lg bg-[#0A1C3D] hover:bg-[#06142D] border border-[#123E78] hover:border-[#00D9FF]/40 text-[#F1F5FF] transition-all flex items-center gap-1.5 text-xs font-medium cursor-pointer shadow-xs"
          title="Reset back to standard ApexPay demo scenarios"
        >
          <RefreshCw className="w-3 h-3 text-[#00D9FF]" />
          <span>Reset</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden lg:flex w-80 lg:w-[330px] xl:w-[350px] bg-[#030D22] text-[#F1F5FF] flex-col shrink-0 border-r border-[#123E78] shadow-2xl select-none z-30 font-sans">
        {renderSidebarBody(false)}
      </aside>

      {/* Mobile Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-xs transition-opacity"
            onClick={onClose}
          />
          <aside className="relative w-[320px] max-w-[85vw] h-full bg-[#030D22] text-[#F1F5FF] flex flex-col border-r border-[#123E78] shadow-2xl z-50">
            {renderSidebarBody(true)}
          </aside>
        </div>
      )}
    </>
  );
};

export default Sidebar;
