import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { CandidateModal } from './components/CandidateModal';
import { AuthView } from './views/AuthView';

import { OverviewDashboard } from './views/OverviewDashboard';
import { BrandProfileView } from './views/BrandProfileView';
import { SocialMonitoringView } from './views/SocialMonitoringView';
import { AppMonitoringView } from './views/AppMonitoringView';
import { LookalikeEngineView } from './views/LookalikeEngineView';
import { InvestigationCenterView } from './views/InvestigationCenterView';
import { ThreatGraphView } from './views/ThreatGraphView';
import { ReportsView } from './views/ReportsView';
import { DiagnosticsView } from './views/DiagnosticsView';

const WorkspaceShell: React.FC = () => {
  const { activeTab, selectedCandidateId, setSelectedCandidateId } = useApp();

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
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100 font-sans text-slate-900">
      {/* Dark Navy Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
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

const MainContent: React.FC = () => {
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
    return <AuthView />;
  }

  return (
    <AppProvider>
      <WorkspaceShell />
    </AppProvider>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainContent />
    </AuthProvider>
  );
}

