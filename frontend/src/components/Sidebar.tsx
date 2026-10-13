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
  UserCheck,
  Activity,
} from 'lucide-react';

interface SidebarProps {
  onNavigateHome?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onNavigateHome }) => {
  const { activeTab, setActiveTab, brandProfile, stats, resetAllToDemoData, backendOnline, selectedBackendBrandId } = useApp();

  const navItems = [
    {
      id: 'overview',
      label: 'Overview Dashboard',
      icon: LayoutDashboard,
      badge: stats.activeAlerts > 0 ? stats.activeAlerts : undefined,
      badgeColor: 'bg-rose-500 text-white',
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
      badgeColor: 'bg-sky-500/20 text-sky-300 border border-sky-400/30',
    },
    {
      id: 'app-monitoring',
      label: 'App Store Monitor',
      icon: Smartphone,
      badge: 'AI Engine',
      badgeColor: 'bg-sky-500/20 text-sky-300 border border-sky-400/30',
    },
    {
      id: 'lookalike-engine',
      label: 'Look-alike Engine',
      icon: Binary,
      badge: 'Heuristics',
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border border-indigo-400/30',
    },
    {
      id: 'investigation-center',
      label: 'Investigation Center',
      icon: FolderSearch,
      badge: stats.investigatingCount > 0 ? `${stats.investigatingCount} Active` : undefined,
      badgeColor: 'bg-amber-500/20 text-amber-300 border border-amber-400/30',
    },
    {
      id: 'threat-graph',
      label: 'Threat Relationship Graph',
      icon: Network,
      badge: 'Interactive',
      badgeColor: 'bg-purple-500/20 text-purple-300 border border-purple-400/30',
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
        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
        : 'bg-slate-700/60 text-slate-400 border border-slate-600/30',
    },
  ];

  const { currentUser, userProfile, logOut } = useAuth();

  return (
    <aside className="w-68 bg-[#0B132B] text-slate-200 flex flex-col shrink-0 border-r border-slate-800 shadow-xl select-none">
      {/* Brand & App Title Header */}
      <div className="p-4 border-b border-slate-800/80">
          <div
            onClick={onNavigateHome ? onNavigateHome : () => { window.location.href = '/'; }}
            className="flex items-center gap-3 cursor-pointer group"
            title="Return to Public Landing Page"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20 border border-blue-400/30 group-hover:scale-105 transition-transform">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-base tracking-tight text-white font-mono">Suraksha</span>
                <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold border border-blue-400/30">
                  AI
                </span>
              </div>
              <p className="text-[11px] font-medium tracking-wider text-slate-400 uppercase">
                Detect • Investigate • Protect
              </p>
            </div>
          </div>
        </div>

        {onNavigateHome && (
          <div className="pt-2">
            <button
              onClick={onNavigateHome}
              className="w-full text-left px-2.5 py-1.5 rounded-lg bg-slate-900/60 hover:bg-slate-900 text-[11px] text-sky-300 hover:text-white border border-slate-800 transition-colors flex items-center justify-between"
            >
              <span>← Public Site / Landing</span>
              <span className="text-[10px] text-slate-500 font-mono">/</span>
            </button>
          </div>
        )}

        {/* Protected Brand Pill */}
        <div className="mt-4 p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className={`w-2 h-2 rounded-full ${backendOnline ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
            <div className="truncate">
              <p className="text-[10px] uppercase font-semibold text-slate-400">
                {selectedBackendBrandId ? 'Database Brand' : 'Sandbox Brand'}
              </p>
              <p className="text-xs font-semibold text-white truncate">{brandProfile.brandName}</p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('brand-profile')}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors cursor-pointer"
            title="Edit Brand Profile"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>

      {/* Main Navigation Links */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Core Threat Modules
        </div>

        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all group ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20 border border-blue-400/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3 truncate">
                <Icon
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-400'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </div>

              {item.badge && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold shrink-0 ml-2 ${
                    item.badgeColor || 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Threat Level Quick Digest */}
      <div className="p-3 mx-3 mb-2 rounded-xl bg-slate-900/80 border border-slate-800/80">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
            <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
            <span>Threat Radar</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">Prototype Mode</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5 text-center">
          <div className="p-1.5 rounded bg-rose-950/40 border border-rose-900/60">
            <span className="block text-sm font-bold text-rose-300">{stats.criticalRiskCount}</span>
            <span className="text-[9px] uppercase tracking-wider text-rose-400 font-medium">Critical</span>
          </div>
          <div className="p-1.5 rounded bg-amber-950/40 border border-amber-900/60">
            <span className="block text-sm font-bold text-amber-300">{stats.highRiskCount}</span>
            <span className="text-[9px] uppercase tracking-wider text-amber-400 font-medium">High</span>
          </div>
        </div>
      </div>

      {/* User Session Bar */}
      {currentUser && (
        <div className="px-3 py-2.5 mx-3 mb-2 rounded-xl bg-slate-900/90 border border-slate-800/90 flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-7 h-7 rounded-lg bg-blue-600/30 border border-blue-400/40 flex items-center justify-center shrink-0 text-blue-300">
              <UserCheck className="w-3.5 h-3.5" />
            </div>
            <div className="truncate">
              <p className="text-[11px] font-semibold text-white truncate">
                {userProfile?.displayName || currentUser.displayName || currentUser.email?.split('@')[0] || 'Analyst'}
              </p>
              <p className="text-[9px] text-slate-400 truncate">
                {userProfile?.organization || currentUser.email || 'Authenticated'}
              </p>
            </div>
          </div>
          <button
            onClick={() => logOut()}
            className="p-1 rounded-md text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors ml-1"
            title="Sign out of workspace"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Footer / Reset Action */}
      <div className="p-3 border-t border-slate-800/80 bg-[#080E20] flex items-center justify-between text-xs text-slate-400">
        <div className="flex flex-col">
          <span className="text-[11px] font-medium text-slate-300">ApexPay Sandbox</span>
          <span className="text-[9px] text-slate-500">Synthetic Scenarios</span>
        </div>
        <button
          onClick={resetAllToDemoData}
          className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors flex items-center gap-1 text-[11px]"
          title="Reset back to standard ApexPay demo scenarios"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Reset</span>
        </button>
      </div>
    </aside>
  );
};
