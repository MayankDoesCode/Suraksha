import React, { useState, useEffect, lazy, Suspense } from 'react';
import LandingPage from './components/landing/LandingPage';
import { ErrorBoundary } from './components/ErrorBoundary';

// The workspace (Firebase, charts, every console view) loads only when it is opened,
// so the landing page ships a much smaller first bundle.
const loadWorkspace = () => import('./components/WorkspaceShell');
const WorkspaceShell = lazy(loadWorkspace);

// Fetch the workspace chunk once the landing page is idle: the demo opens instantly, and the
// service worker caches it so the installed app still opens the demo offline.
if (typeof window !== 'undefined') {
  const warm = () => loadWorkspace().catch(() => {});
  window.addEventListener('load', () => (window.requestIdleCallback ? window.requestIdleCallback(warm, { timeout: 4000 }) : setTimeout(warm, 2000)), { once: true });
}
import BrandIntro from './components/intro/BrandIntro';

/**
 * SURAKSHA Master Application Router
 * Provides seamless client-side routing between the public Landing Page (/)
 * and the full Cyber Risk Protection Workspace (/dashboard), supporting
 * direct URL navigation, browser refresh, and the browser History API.
 */
export default function App() {
  const [route, setRoute] = useState(() => {
    return window.location.pathname.startsWith('/dashboard') ? '/dashboard' : '/';
  });
  // /dashboard?demo opens the demo workspace directly (shareable link for judges and QR codes);
  // add &tab=<page id> to land on a specific page.
  const [navOptions, setNavOptions] = useState(() => {
    if (typeof window === 'undefined' || !window.location.pathname.startsWith('/dashboard')) return null;
    const params = new URLSearchParams(window.location.search);
    return params.has('demo') ? { mode: 'demo', tab: params.get('tab') || undefined } : null;
  });

  // Play brand intro every time landing page is opened
  const [showIntro, setShowIntro] = useState(() => {
    if (typeof window === 'undefined') return false;
    // Do not show on direct dashboard navigation
    if (window.location.pathname.startsWith('/dashboard')) return false;
    return true;
  });

  useEffect(() => {
    const handlePopState = () => {
      const nextRoute = window.location.pathname.startsWith('/dashboard') ? '/dashboard' : '/';
      setRoute(nextRoute);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (targetPath, options = null) => {
    const normalized = targetPath.startsWith('/dashboard') ? '/dashboard' : '/';
    if (window.location.pathname !== normalized) {
      window.history.pushState({}, '', normalized);
    }
    setRoute(normalized);
    setNavOptions(options);
    if (normalized === '/') {
      setShowIntro(true);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleIntroComplete = () => {
    setShowIntro(false);
  };

  const handleReplayIntro = () => {
    setShowIntro(true);
  };

  if (route === '/dashboard') {
    return (
      <ErrorBoundary fullscreen>
      <Suspense fallback={<div className="min-h-[100dvh] w-full bg-canvas" aria-busy="true" />}>
        <WorkspaceShell
          onNavigateHome={() => navigate('/')}
          initialAuthMode={navOptions?.mode}
          initialTab={navOptions?.tab}
        />
      </Suspense>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary fullscreen>
      {showIntro && <BrandIntro onComplete={handleIntroComplete} />}
      <LandingPage
        onLaunchDashboard={(options) => navigate('/dashboard', options)}
        onReplayIntro={handleReplayIntro}
      />
    </ErrorBoundary>
  );
}
