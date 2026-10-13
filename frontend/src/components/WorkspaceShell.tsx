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

interface WorkspaceShellProps {
  onNavigateHome?: () => void;
  initialAuthMode?: 'login' | 'signup' | 'forgot';
  initialTab?: string;
}

const WorkspaceContent: React.FC<WorkspaceShellProps> = ({ onNavigateHome, initialTab }) => {
  const { activeTab, setActiveTab, selectedCandidateId, setSelectedCandidateId } = useApp();
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
    <div className="flex h-screen w-screen overflow-hidden bg-[#020817] font-sans text-[#F1F5FF]">
      {/* Dark Navy Sidebar */}
      <Sidebar
        onNavigateHome={onNavigateHome}
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#020817]">
        <Header
          onNavigateHome={onNavigateHome}
          onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-5 lg:p-6 bg-[#020817]">
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
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#060B19] text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
          <p className="text-xs font-mono text-slate-400">Verifying Suraksha workspace credentials...</p>
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
