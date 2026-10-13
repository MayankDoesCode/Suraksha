import React, { useState, useEffect } from 'react';
import { Shield, Activity, ArrowRight, Menu, X, ExternalLink } from 'lucide-react';
import api from '../../api/client';

export default function LandingNav({ onLaunchDashboard }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [systemStatus, setSystemStatus] = useState('checking');

  useEffect(() => {
    let mounted = true;
    api.getHealth()
      .then((data) => {
        if (mounted) {
          setSystemStatus(data?.status === 'healthy' ? 'operational' : 'degraded');
        }
      })
      .catch(() => {
        if (mounted) setSystemStatus('ready');
      });
    return () => {
      mounted = false;
    };
  }, []);

  const scrollToSection = (id) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-cyber-border/80 bg-cyber-darkest/85 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand identity */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <div className="w-10 h-10 rounded-xl bg-cyber-accent/10 border border-cyber-accent/40 flex items-center justify-center text-cyber-accent shadow-glow transition-transform hover:scale-105">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg font-bold tracking-wider text-white font-mono flex items-center gap-2">
              SURAKSHA
              <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono tracking-widest text-cyber-accent bg-cyber-accent/10 border border-cyber-accent/30 rounded">
                ENTERPRISE DRP
              </span>
            </div>
            <div className="text-[10px] text-cyber-textMuted uppercase tracking-widest font-mono">
              Detect. Verify. Protect.
            </div>
          </div>
        </div>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-8 text-xs font-medium text-cyber-textMuted">
          <button
            onClick={() => scrollToSection('capabilities')}
            className="hover:text-cyber-accent transition-colors tracking-wide"
          >
            Capabilities
          </button>
          <button
            onClick={() => scrollToSection('architecture')}
            className="hover:text-cyber-accent transition-colors tracking-wide"
          >
            Architecture
          </button>
          <button
            onClick={() => scrollToSection('preview')}
            className="hover:text-cyber-accent transition-colors tracking-wide"
          >
            Product Preview
          </button>
          <button
            onClick={() => scrollToSection('scoring')}
            className="hover:text-cyber-accent transition-colors tracking-wide"
          >
            Deterministic Scoring
          </button>
        </nav>

        {/* Right CTA Area */}
        <div className="hidden sm:flex items-center gap-4">
          {/* Live Telemetry Pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyber-surface border border-cyber-border text-[11px] font-mono">
            <span
              className={`w-2 h-2 rounded-full ${
                systemStatus === 'operational'
                  ? 'bg-cyber-emerald animate-pulse'
                  : 'bg-cyber-accent'
              }`}
            />
            <span className="text-cyber-textMuted">
              {systemStatus === 'operational' ? 'SYSTEM ONLINE' : 'ENGINE READY'}
            </span>
          </div>

          <button
            onClick={onLaunchDashboard}
            className="px-5 py-2.5 rounded-xl bg-cyber-accent text-cyber-darkest font-semibold text-xs tracking-wider uppercase font-mono shadow-glow hover:bg-cyber-accentHover transition-all flex items-center gap-2 hover:shadow-cyan-500/25 active:scale-95"
          >
            <span>Launch Platform</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Mobile menu trigger */}
        <div className="flex sm:hidden items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg bg-cyber-surface border border-cyber-border text-cyber-textMuted hover:text-white"
            aria-label="Toggle Navigation"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-b border-cyber-border bg-cyber-dark/95 backdrop-blur-2xl px-6 py-6 space-y-4">
          <div className="space-y-3 font-mono text-sm">
            <button
              onClick={() => scrollToSection('capabilities')}
              className="block w-full text-left py-2 text-cyber-textMuted hover:text-cyber-accent"
            >
              Capabilities
            </button>
            <button
              onClick={() => scrollToSection('architecture')}
              className="block w-full text-left py-2 text-cyber-textMuted hover:text-cyber-accent"
            >
              Architecture
            </button>
            <button
              onClick={() => scrollToSection('preview')}
              className="block w-full text-left py-2 text-cyber-textMuted hover:text-cyber-accent"
            >
              Product Preview
            </button>
            <button
              onClick={() => scrollToSection('scoring')}
              className="block w-full text-left py-2 text-cyber-textMuted hover:text-cyber-accent"
            >
              Deterministic Scoring
            </button>
          </div>

          <div className="pt-4 border-t border-cyber-border">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onLaunchDashboard();
              }}
              className="w-full py-3 rounded-xl bg-cyber-accent text-cyber-darkest font-semibold text-xs tracking-wider uppercase font-mono shadow-glow flex items-center justify-center gap-2"
            >
              <span>Launch Platform</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
