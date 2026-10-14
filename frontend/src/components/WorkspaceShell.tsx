import React from 'react';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { AppProvider, useApp } from '../context/AppContext';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { CandidateModal } from './CandidateModal';
import { AuthView } from '../views/AuthView';

import { OverviewDashboard } from '../views/OverviewDashboard';
import { BrandProfileView } from '../views/BrandProfileView';
import { SocialMonitoringView } from '../views/SocialMonitoringView';
import { AppMonitoringView } from '../views/AppMonitoringView';
import { LookalikeEngineView } from '../views/LookalikeEngineView';
import { InvestigationCenterView } from '../views/InvestigationCenterView';
import { ThreatGraphView } from '../views/ThreatGraphView';
import { ReportsView } from '../views/ReportsView';
import { DiagnosticsView } from '../views/DiagnosticsView';
import { WatchtowerView } from '../views/WatchtowerView';

interface WorkspaceShellProps {
  onNavigateHome?: () => void;
  initialAuthMode?: 'login' | 'signup' | 'forgot';
  initialTab?: string;
}

const WorkspaceContent: React.FC<WorkspaceShellProps> = ({ onNavigateHome, initialTab }) => {
  const {
    activeTab,
    setActiveTab,
    selectedCandidateId,
    setSelectedCandidateId,
    isDemoMode,
    exitDemoMode,
  } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, setActiveTab]);

  const renderActiveView = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewDashboard />;
      case 'watchtower':
        return <WatchtowerView />;
      case 'brand-profile':
        return <BrandProfileView />;
      case 'social-monitoring':
        return <SocialMonitoringView />;
      case 'app-monitoring':
        return <AppMonitoringView />;
      case 'lookalike-engine':
        return <LookalikeEngineView />;
      case 'investigation-center':
        return <InvestigationCenterView />;
      case 'threat-graph':
        return <ThreatGraphView />;
      case 'reports':
        return <ReportsView />;
      case 'diagnostics':
        return <DiagnosticsView />;
      default:
        return <OverviewDashboard />;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#080F1D] font-sans text-[#F8FAFC]">
      {/* Dark Navy Sidebar */}
      <Sidebar
        onNavigateHome={onNavigateHome}
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#080F1D]">
        <Header
          onNavigateHome={onNavigateHome}
          onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
        />

        {/* Persistent Demo Mode Banner */}
        {isDemoMode && (
          <div className="bg-[#EF4444]/15 border-b border-[#EF4444]/40 px-4 py-2 flex items-center justify-between text-xs text-[#FCA5A5] z-30 shrink-0">
            <div className="flex items-center gap-2.5">
              <span className="px-2 py-0.5 rounded bg-[#EF4444] text-[#080F1D] font-mono font-bold text-[10px] uppercase tracking-wider">
                DEMO DATA — NOT REAL THREATS
              </span>
              <span className="hidden sm:inline text-[#DCE7F6]">
                You are currently exploring simulated cybersecurity data. No real threats or customer brands are exposed.
              </span>
            </div>
            <button
              onClick={exitDemoMode}
              className="px-3 py-1 rounded bg-[#EF4444]/20 hover:bg-[#EF4444]/35 text-white font-medium text-[11px] border border-[#EF4444]/50 transition-colors cursor-pointer shrink-0 ml-3"
            >
              Exit Demo Mode
            </button>
          </div>
        )}

        <main className="flex-1 overflow-y-auto p-4 sm:p-5 lg:p-6 bg-[#080F1D]">
          {renderActiveView()}
        </main>
      </div>

      {/* Investigation Dossier Modal */}
      {selectedCandidateId && (
        <CandidateModal
          candidateId={selectedCandidateId}
          onClose={() => setSelectedCandidateId(null)}
        />
      )}
    </div>
  );
};

const MainContent: React.FC<WorkspaceShellProps> = ({
  onNavigateHome,
  initialAuthMode,
  initialTab,
}) => {
  const { currentUser, loading, signInAsDemoAnalyst } = useAuth();
  const [loadTimedOut, setLoadTimedOut] = React.useState(false);

  React.useEffect(() => {
    let timer: any;
    if (loading) {
      timer = setTimeout(() => {
        setLoadTimedOut(true);
      }, 4000);
    } else {
      setLoadTimedOut(false);
    }
    return () => clearTimeout(timer);
  }, [loading]);

  if (loading && !loadTimedOut) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#080F1D] text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#45C8E8]/20 border-t-[#45C8E8] rounded-full animate-spin" />
          <p className="text-xs font-mono text-[#8EA2C6]">Verifying Suraksha workspace credentials...</p>
        </div>
      </div>
    );
  }

  if (loading && loadTimedOut) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#080F1D] text-white p-6">
        <div className="max-w-md w-full bg-[#111D30] border border-[#1E2E48] rounded-xl p-6 shadow-2xl text-center space-y-4">
          <div className="w-10 h-10 mx-auto rounded-full bg-[#45C8E8]/10 border border-[#45C8E8]/30 flex items-center justify-center text-[#45C8E8]">
            <span className="font-mono text-sm font-bold">!</span>
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Authentication Verification Taking Longer Than Usual</h3>
            <p className="text-xs text-[#8EA2C6] mt-1.5 leading-relaxed">
              We couldn't quickly synchronize your remote workspace profile. You can re-authenticate or explore with the isolated Demo Sandbox.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
            <button
              onClick={() => window.location.reload()}
              className="w-full sm:w-auto px-4 py-2 text-xs font-medium bg-[#1A2942] hover:bg-[#223656] text-[#DCE7F6] border border-[#2A3E60] rounded-lg transition-colors"
            >
              Retry Connection
            </button>
            <button
              onClick={signInAsDemoAnalyst}
              className="w-full sm:w-auto px-4 py-2 text-xs font-medium bg-[#45C8E8] hover:bg-[#38b5d4] text-[#080F1D] font-semibold rounded-lg transition-colors shadow-sm"
            >
              Try Demo Sandbox
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <AuthView onNavigateHome={onNavigateHome} initialMode={initialAuthMode} />;
  }

  return (
    <AppProvider>
      <WorkspaceContent onNavigateHome={onNavigateHome} initialTab={initialTab} />
    </AppProvider>
  );
};

export default function WorkspaceShell({
  onNavigateHome,
  initialAuthMode,
  initialTab,
}: WorkspaceShellProps) {
  return (
    <AuthProvider>
      <MainContent
        onNavigateHome={onNavigateHome}
        initialAuthMode={initialAuthMode}
        initialTab={initialTab}
      />
    </AuthProvider>
  );
}
