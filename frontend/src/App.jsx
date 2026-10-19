import React, { useState, useEffect } from 'react';
import LandingPage from './components/landing/LandingPage';
import WorkspaceShell from './components/WorkspaceShell';
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
  const [navOptions, setNavOptions] = useState(null);

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
      <WorkspaceShell
        onNavigateHome={() => navigate('/')}
        initialAuthMode={navOptions?.mode}
        initialTab={navOptions?.tab}
      />
    );
  }

  return (
    <>
      {showIntro && <BrandIntro onComplete={handleIntroComplete} />}
      <LandingPage
        onLaunchDashboard={(options) => navigate('/dashboard', options)}
        onReplayIntro={handleReplayIntro}
      />
    </>
  );
}
