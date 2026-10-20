import React from 'react';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { AppProvider, useApp } from '../context/AppContext';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { Header } from './Header';
import { CandidateModal } from './CandidateModal';
import { CommandPalette } from './CommandPalette';
import { AuthView } from '../views/AuthView';
import { ThemeProvider } from '../context/ThemeContext';

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
    setFocusedFindingId,
  } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [paletteOpen, setPaletteOpen] = React.useState(false);

  // Ctrl/Cmd+K opens the command palette from anywhere in the workspace.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Opening a finding from any other page lands on its detail panel in Investigations.
  React.useEffect(() => {
    if (selectedCandidateId && activeTab !== 'investigation-center') {
      setFocusedFindingId(selectedCandidateId);
      setSelectedCandidateId(null);
      setActiveTab('investigation-center');
    }
  }, [selectedCandidateId, activeTab, setFocusedFindingId, setSelectedCandidateId, setActiveTab]);

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
    <div className="flex h-screen w-screen overflow-hidden bg-canvas font-sans text-fg">
      <Sidebar onNavigateHome={onNavigateHome} isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

      {/* Content sits in an inset panel so the navigation recedes (Linear-style). */}
      <div className="flex min-w-0 flex-1 lg:p-2 lg:pl-0">
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-surface lg:rounded-lg lg:border lg:border-line">
          <Header
            onNavigateHome={onNavigateHome}
            onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
            onOpenSearch={() => setPaletteOpen(true)}
          />

          {/* Subtle Cybernetic Ambient Background in Dashboard Shell */}
          <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden z-0 select-none">
            <div className="absolute -top-32 right-1/4 h-[420px] w-[420px] rounded-full bg-accent/[0.05] blur-[140px]" />
            <div className="absolute top-1/3 -left-20 h-[500px] w-[500px] rounded-full bg-ai/[0.04] blur-[150px]" />
            <div className="absolute -bottom-24 right-1/3 h-96 w-96 rounded-full bg-ok/[0.035] blur-[130px]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(104,116,220,0.07),transparent_70%)]" />
            <div
              className="absolute inset-0 opacity-[0.03] dark:opacity-[0.04]"
              style={{
                backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
                backgroundSize: '24px 24px',
              }}
            />
          </div>

          <main className="relative z-10 flex-1 overflow-y-auto p-4 pb-24 sm:p-6 sm:pb-24 lg:p-8">
            <div key={activeTab} className="sk-fade-in mx-auto w-full max-w-[1720px]">
              {renderActiveView()}
            </div>
          </main>
        </div>
      </div>

      <BottomNav />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />

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
      <div className="min-h-screen w-full flex items-center justify-center bg-canvas text-fg">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-accent/20 border-t-accent rounded-full animate-spin" />
          <p className="text-xs font-mono text-fgMuted">Verifying Suraksha workspace credentials...</p>
        </div>
      </div>
    );
  }

  if (loading && loadTimedOut) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-canvas text-fg p-6">
        <div className="max-w-md w-full bg-surface border border-line rounded-xl p-6 shadow-2xl text-center space-y-4">
          <div className="w-10 h-10 mx-auto rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center text-accent">
            <span className="font-mono text-sm font-bold">!</span>
          </div>
          <div>
            <h3 className="text-base font-semibold text-fg">Authentication Verification Taking Longer Than Usual</h3>
            <p className="text-xs text-fgMuted mt-1.5 leading-relaxed">
              We couldn't quickly synchronize your remote workspace profile. You can re-authenticate or explore with the isolated Demo Sandbox.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
            <button
              onClick={() => window.location.reload()}
              className="w-full sm:w-auto px-4 py-2 text-xs font-medium bg-surface3 hover:bg-line text-fg border border-line rounded-lg transition-colors"
            >
              Retry Connection
            </button>
            <button
              onClick={signInAsDemoAnalyst}
              className="w-full sm:w-auto px-4 py-2 text-xs font-medium bg-accent hover:bg-accentHover text-onAccent font-semibold rounded-lg transition-colors shadow-sm"
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
    <ThemeProvider>
      <AuthProvider>
        <MainContent
          onNavigateHome={onNavigateHome}
          initialAuthMode={initialAuthMode}
          initialTab={initialTab}
        />
      </AuthProvider>
    </ThemeProvider>
  );
}
