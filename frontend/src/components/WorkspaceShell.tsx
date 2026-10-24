import React from 'react';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { AppProvider, useApp } from '../context/AppContext';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { Header } from './Header';
import { CandidateModal } from './CandidateModal';
import { CommandPalette } from './CommandPalette';
import { AICopilotWidget } from './AICopilotWidget';
import { AuthView } from '../views/AuthView';
import { ThemeProvider } from '../context/ThemeContext';
import { ErrorBoundary } from './ErrorBoundary';
import { pageInfo } from './navigation';

import { OverviewDashboard } from '../views/OverviewDashboard';
import { BrandProfileView } from '../views/BrandProfileView';
import { SocialMonitoringView } from '../views/SocialMonitoringView';
import { AppMonitoringView } from '../views/AppMonitoringView';
import { LookalikeEngineView } from '../views/LookalikeEngineView';
import { InvestigationCenterView } from '../views/InvestigationCenterView';
import { ThreatGraphView } from '../views/ThreatGraphView';
import { ReportsView } from '../views/ReportsView';
import { DiagnosticsView } from '../views/DiagnosticsView';
import { MethodologyView } from '../views/MethodologyView';
import { LogoCheckView } from '../views/LogoCheckView';
import { WebsiteCheckView } from '../views/WebsiteCheckView';
import { BulkCheckView } from '../views/BulkCheckView';
import { ExecutiveReportView } from '../views/ExecutiveReportView';
import { WatchtowerView } from '../views/WatchtowerView';
import { AttackSimulator } from './AttackSimulator';
import { PresenterMode } from './PresenterMode';
import { ThreatInspectorModal } from './ThreatInspectorModal';

interface WorkspaceShellProps {
  onNavigateHome?: () => void;
  initialAuthMode?: 'login' | 'signup' | 'forgot' | 'demo';
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
  const [inspectorOpen, setInspectorOpen] = React.useState(false);

  // Ctrl/Cmd+K opens the command palette; Ctrl/Cmd+I opens Threat X-Ray inspector.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        setInspectorOpen((o) => !o);
      }
    };
    const onOpenInspectorEvent = () => setInspectorOpen(true);

    window.addEventListener('keydown', onKey);
    window.addEventListener('open-threat-inspector', onOpenInspectorEvent);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('open-threat-inspector', onOpenInspectorEvent);
    };
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
      case 'logo-check':
        return <LogoCheckView />;
      case 'executive-report':
        return <ExecutiveReportView />;
      case 'bulk-check':
        return <BulkCheckView />;
      case 'website-check':
        return <WebsiteCheckView />;
      case 'methodology':
        return <MethodologyView />;
      case 'diagnostics':
        return <DiagnosticsView />;
      default:
        return <OverviewDashboard />;
    }
  };

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-canvas font-sans text-fg">
      <a href="#workspace-main" className="sr-only z-50 rounded-xl bg-accent px-4 py-2 font-semibold text-onAccent focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Skip to content
      </a>
      <Sidebar onNavigateHome={onNavigateHome} isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

      {/* Content sits in an inset panel so the navigation recedes (Linear-style). */}
      <div className="flex min-w-0 flex-1 lg:p-2 lg:pl-0">
        <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-surface2 lg:rounded-2xl lg:border lg:border-line">
          <Header
            onNavigateHome={onNavigateHome}
            onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
            onOpenSearch={() => setPaletteOpen(true)}
            onOpenThreatInspector={() => setInspectorOpen(true)}
          />

          {/* Subtle Cybernetic Ambient Background in Dashboard Shell */}
          <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden z-0 select-none">
            <div className="absolute -top-40 right-[15%] h-[520px] w-[640px] rounded-full bg-accent/[0.08] blur-[160px]" />
            <div className="absolute top-[20%] -left-32 h-[420px] w-[480px] rounded-full bg-accent/[0.04] blur-[140px]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_75%_65%_at_50%_-15%,rgb(var(--c-accent)/0.09),transparent_75%)]" />
            <div
              className="absolute inset-0 opacity-[0.035] dark:opacity-[0.05]"
              style={{
                backgroundImage: 'linear-gradient(to right, rgba(245, 165, 36, 0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(245, 165, 36, 0.12) 1px, transparent 1px)',
                backgroundSize: '38px 38px',
                maskImage: 'radial-gradient(ellipse at 50% 30%, rgba(0, 0, 0, 0.85) 0%, transparent 80%)',
              }}
            />
          </div>

          <main id="workspace-main" tabIndex={-1} className="relative z-10 flex-1 overflow-y-auto focus:outline-none p-4 pb-24 sm:p-6 sm:pb-24 lg:p-8">
            <div key={activeTab} className="page-enter mx-auto w-full max-w-[1720px]">
              <ErrorBoundary key={activeTab} label={pageInfo(activeTab)?.label} onReset={() => setActiveTab('overview')}>
                {renderActiveView()}
              </ErrorBoundary>
            </div>
          </main>
        </div>
      </div>

      <BottomNav />
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onOpenThreatInspector={() => setInspectorOpen(true)}
      />
      <AttackSimulator />
      <PresenterMode />
      <ThreatInspectorModal
        isOpen={inspectorOpen}
        onClose={() => setInspectorOpen(false)}
      />

      {/* Investigation Dossier Modal */}
      {selectedCandidateId && (
        <CandidateModal
          candidateId={selectedCandidateId}
          onClose={() => setSelectedCandidateId(null)}
        />
      )}

      {/* AI Cyber Defense Copilot Widget */}
      <AICopilotWidget />
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

  // "Open the live demo" on the landing page skips the sign-in screen. Fires once, so signing out
  // of the demo returns to the sign-in screen instead of re-entering the demo.
  const demoStarted = React.useRef(false);
  React.useEffect(() => {
    if (initialAuthMode === 'demo' && !demoStarted.current && !loading && !currentUser) {
      demoStarted.current = true;
      signInAsDemoAnalyst();
    }
  }, [initialAuthMode, loading, currentUser, signInAsDemoAnalyst]);

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
    if (initialAuthMode === 'demo' && !demoStarted.current) {
      return <div className="min-h-[100dvh] w-full bg-canvas" aria-busy="true" />;
    }
    return <AuthView onNavigateHome={onNavigateHome} initialMode={initialAuthMode === 'demo' ? 'login' : initialAuthMode} />;
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
