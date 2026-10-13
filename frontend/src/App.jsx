import React, { useState, useEffect } from 'react';
import LandingPage from './components/landing/LandingPage';
import WorkspaceShell from './components/WorkspaceShell';

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

  useEffect(() => {
    const handlePopState = () => {
      const nextRoute = window.location.pathname.startsWith('/dashboard') ? '/dashboard' : '/';
      setRoute(nextRoute);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (targetPath) => {
    const normalized = targetPath.startsWith('/dashboard') ? '/dashboard' : '/';
    if (window.location.pathname !== normalized) {
      window.history.pushState({}, '', normalized);
    }
    setRoute(normalized);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (route === '/dashboard') {
    return <WorkspaceShell onNavigateHome={() => navigate('/')} />;
  }

  return <LandingPage onLaunchDashboard={() => navigate('/dashboard')} />;
}
