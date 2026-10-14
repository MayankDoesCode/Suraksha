import React, { useState, useEffect, useRef } from 'react';
import {
  Shield,
  Activity,
  ArrowRight,
  Menu,
  X,
  ChevronDown,
  Share2,
  Smartphone,
  Cpu,
  Layers,
  Sparkles,
  Lock,
  LogIn
} from 'lucide-react';
import api from '../../api/client';

export default function LandingNav({ onLaunchDashboard }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [solutionsDropdownOpen, setSolutionsDropdownOpen] = useState(false);
  const [systemStatus, setSystemStatus] = useState('checking');
  const [activeSection, setActiveSection] = useState('home');
  const dropdownRef = useRef(null);

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

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setSolutionsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Track active section on scroll
  useEffect(() => {
    const sections = ['capabilities', 'architecture', 'preview', 'scoring'];
    const handleScroll = () => {
      const scrollY = window.scrollY;
      if (scrollY < 260) {
        setActiveSection('home');
        return;
      }
      for (const id of sections) {
        const el = document.getElementById(id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 200 && rect.bottom >= 150) {
            setActiveSection(id);
            return;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id) => {
    setMobileMenuOpen(false);
    setSolutionsDropdownOpen(false);
    if (id === 'home' || id === 'top') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setActiveSection('home');
      return;
    }
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setActiveSection(id);
    }
  };

  const handleLaunch = (mode = 'login') => {
    setMobileMenuOpen(false);
    setSolutionsDropdownOpen(false);
    if (onLaunchDashboard) {
      onLaunchDashboard({ mode });
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#1E314F] bg-[#080F1D]/85 backdrop-blur-md transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-4 xl:px-8 h-20 flex items-center justify-between gap-3 xl:gap-6">
        {/* Brand identity */}
        <div
          className="flex items-center gap-3 cursor-pointer group shrink-0"
          onClick={() => scrollToSection('home')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && scrollToSection('home')}
          aria-label="Suraksha Home"
        >
          <div className="w-10 h-10 rounded-xl bg-[#111D30] border border-[#1E314F] flex items-center justify-center text-[#45C8E8] transition-all group-hover:border-[#45C8E8] shrink-0">
            <Shield className="w-5 h-5 text-[#45C8E8]" />
          </div>
          <div className="shrink-0 flex flex-col justify-center">
            <div className="text-lg font-bold tracking-wider text-white font-mono flex items-center gap-2 whitespace-nowrap leading-none">
              <span>SURAKSHA</span>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-mono tracking-widest text-[#45C8E8] bg-[#111D30] border border-[#1E314F] rounded leading-none whitespace-nowrap shrink-0">
                ENTERPRISE DRP
              </span>
            </div>
            <div className="text-[10px] text-[#8EA2C6] uppercase tracking-widest font-mono whitespace-nowrap mt-1">
              Detect. Verify. Protect.
            </div>
          </div>
        </div>

        {/* Desktop Nav Links */}
        <nav className="hidden lg:flex items-center gap-3 xl:gap-5 2xl:gap-7 text-xs font-medium text-[#8EA2C6] shrink-0">
          <button
            onClick={() => scrollToSection('home')}
            className={`transition-colors tracking-wide py-1 border-b-2 font-mono whitespace-nowrap shrink-0 ${
              activeSection === 'home'
                ? 'text-[#45C8E8] border-[#45C8E8] font-semibold'
                : 'text-[#8EA2C6] border-transparent hover:text-white'
            }`}
          >
            Home
          </button>

          {/* Solutions Dropdown Menu */}
          <div className="relative shrink-0" ref={dropdownRef}>
            <button
              onClick={() => setSolutionsDropdownOpen(!solutionsDropdownOpen)}
              className={`flex items-center gap-1.5 transition-colors tracking-wide py-1 border-b-2 font-mono whitespace-nowrap shrink-0 ${
                solutionsDropdownOpen || activeSection === 'capabilities' || activeSection === 'preview' || activeSection === 'scoring'
                  ? 'text-[#45C8E8] border-[#45C8E8] font-semibold'
                  : 'text-[#8EA2C6] border-transparent hover:text-white'
              }`}
              aria-haspopup="true"
              aria-expanded={solutionsDropdownOpen}
            >
              <span>Solutions</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  solutionsDropdownOpen ? 'rotate-180 text-[#45C8E8]' : ''
                }`}
              />
            </button>

            {solutionsDropdownOpen && (
              <div className="absolute top-full left-0 mt-2 w-72 rounded-xl bg-[#111D30] backdrop-blur-2xl border border-[#1E314F] shadow-panel py-2.5 z-50">
                <div className="px-3.5 py-1.5 text-[10px] font-mono uppercase tracking-widest text-cyber-textMuted border-b border-cyber-border/60">
                  Platform Modules
                </div>
                <button
                  onClick={() => scrollToSection('capabilities')}
                  className="w-full px-3.5 py-2.5 text-left flex items-start gap-3 hover:bg-cyber-surface/60 transition-colors group"
                >
                  <Share2 className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0 group-hover:scale-110 transition-transform" />
                  <div>
                    <div className="text-xs font-semibold text-white group-hover:text-cyan-400 font-mono">
                      Social Media Monitoring
                    </div>
                    <div className="text-[10px] text-cyber-textMuted">
                      Lookalike profile & impersonator detection
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => scrollToSection('capabilities')}
                  className="w-full px-3.5 py-2.5 text-left flex items-start gap-3 hover:bg-cyber-surface/60 transition-colors group"
                >
                  <Smartphone className="w-4 h-4 text-blue-400 mt-0.5 shrink-0 group-hover:scale-110 transition-transform" />
                  <div>
                    <div className="text-xs font-semibold text-white group-hover:text-cyan-400 font-mono">
                      App Store Ingestion
                    </div>
                    <div className="text-[10px] text-cyber-textMuted">
                      Apple Store metadata and rogue package scanning
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => scrollToSection('scoring')}
                  className="w-full px-3.5 py-2.5 text-left flex items-start gap-3 hover:bg-cyber-surface/60 transition-colors group"
                >
                  <Cpu className="w-4 h-4 text-violet-400 mt-0.5 shrink-0 group-hover:scale-110 transition-transform" />
                  <div>
                    <div className="text-xs font-semibold text-white group-hover:text-cyan-400 font-mono">
                      Deterministic Risk Engine
                    </div>
                    <div className="text-[10px] text-cyber-textMuted">
                      Bounded 0-100 mathematical risk scoring
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => scrollToSection('preview')}
                  className="w-full px-3.5 py-2.5 text-left flex items-start gap-3 hover:bg-cyber-surface/60 transition-colors group"
                >
                  <Layers className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0 group-hover:scale-110 transition-transform" />
                  <div>
                    <div className="text-xs font-semibold text-white group-hover:text-cyan-400 font-mono">
                      Interactive Product Preview
                    </div>
                    <div className="text-[10px] text-cyber-textMuted">
                      Live analyst workflow & telemetry demo
                    </div>
                  </div>
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => scrollToSection('capabilities')}
            className={`transition-colors tracking-wide py-1 border-b-2 font-mono whitespace-nowrap shrink-0 ${
              activeSection === 'capabilities'
                ? 'text-cyan-400 border-cyan-400 font-semibold'
                : 'text-cyber-textMuted border-transparent hover:text-white'
            }`}
          >
            Capabilities
          </button>
          <button
            onClick={() => scrollToSection('architecture')}
            className={`transition-colors tracking-wide py-1 border-b-2 font-mono whitespace-nowrap shrink-0 ${
              activeSection === 'architecture'
                ? 'text-cyan-400 border-cyan-400 font-semibold'
                : 'text-cyber-textMuted border-transparent hover:text-white'
            }`}
          >
            Architecture
          </button>
          <button
            onClick={() => scrollToSection('preview')}
            className={`transition-colors tracking-wide py-1 border-b-2 font-mono whitespace-nowrap shrink-0 ${
              activeSection === 'preview'
                ? 'text-cyan-400 border-cyan-400 font-semibold'
                : 'text-cyber-textMuted border-transparent hover:text-white'
            }`}
          >
            Product Preview
          </button>
        </nav>

        {/* Right Action Area */}
        <div className="hidden sm:flex items-center gap-2 xl:gap-3 shrink-0">
          {/* Live Telemetry Status Pill */}
          <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#111D30] border border-[#1E314F] text-[11px] font-mono shrink-0">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                systemStatus === 'operational'
                  ? 'bg-[#10B981]'
                  : 'bg-[#45C8E8]'
              }`}
            />
            <span className="text-[#8EA2C6] font-medium whitespace-nowrap">
              {systemStatus === 'operational' ? 'SYSTEM ONLINE' : 'ENGINE READY'}
            </span>
          </div>

          {/* Sign In CTA */}
          <button
            onClick={() => handleLaunch('login')}
            className="px-3 xl:px-4 py-2 rounded-xl text-[#8EA2C6] hover:text-white hover:bg-[#111D30] border border-transparent hover:border-[#1E314F] transition-all text-xs font-mono font-semibold tracking-wider flex items-center gap-1.5 whitespace-nowrap shrink-0"
            aria-label="Sign In to Platform"
          >
            <LogIn className="w-3.5 h-3.5 text-[#45C8E8] shrink-0" />
            <span>Sign In</span>
          </button>

          {/* Get Started CTA */}
          <button
            onClick={() => handleLaunch('signup')}
            className="px-3.5 xl:px-5 py-2.5 rounded-xl bg-[#45C8E8] text-[#080F1D] font-bold text-xs tracking-wider uppercase font-mono hover:bg-[#38B2D0] transition-all flex items-center gap-2 active:scale-95 whitespace-nowrap shrink-0 shadow-card"
            aria-label="Get Started with Suraksha"
          >
            <span>Get Started</span>
            <ArrowRight className="w-3.5 h-3.5 shrink-0" />
          </button>
        </div>


        {/* Mobile menu trigger */}
        <div className="flex lg:hidden items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2.5 rounded-xl bg-[#111D30] border border-[#1E314F] text-[#8EA2C6] hover:text-white transition-colors"
            aria-label="Toggle Navigation"
          >
            {mobileMenuOpen ? <X className="w-5 h-5 text-[#45C8E8]" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-b border-[#1E314F] bg-[#080F1D]/98 backdrop-blur-2xl px-6 py-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#1E314F]">
            <span className="text-[11px] font-mono text-[#8EA2C6] uppercase tracking-wider">
              Navigation Menu
            </span>
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#111D30] border border-[#1E314F] text-[10px] font-mono">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  systemStatus === 'operational' ? 'bg-[#10B981]' : 'bg-[#45C8E8]'
                }`}
              />
              <span className="text-[#8EA2C6]">
                {systemStatus === 'operational' ? 'ONLINE' : 'READY'}
              </span>
            </div>
          </div>

          <div className="space-y-2 font-mono text-sm">
            <button
              onClick={() => scrollToSection('home')}
              className={`block w-full text-left py-2 px-3 rounded-lg transition-colors ${
                activeSection === 'home'
                  ? 'text-[#45C8E8] bg-[#45C8E8]/10 border border-[#45C8E8]/30 font-semibold'
                  : 'text-[#8EA2C6] hover:text-white'
              }`}
            >
              Home
            </button>
            <button
              onClick={() => scrollToSection('capabilities')}
              className={`block w-full text-left py-2 px-3 rounded-lg transition-colors ${
                activeSection === 'capabilities'
                  ? 'text-[#45C8E8] bg-[#45C8E8]/10 border border-[#45C8E8]/30 font-semibold'
                  : 'text-[#8EA2C6] hover:text-white'
              }`}
            >
              Capabilities
            </button>
            <button
              onClick={() => scrollToSection('architecture')}
              className={`block w-full text-left py-2 px-3 rounded-lg transition-colors ${
                activeSection === 'architecture'
                  ? 'text-[#45C8E8] bg-[#45C8E8]/10 border border-[#45C8E8]/30 font-semibold'
                  : 'text-[#8EA2C6] hover:text-white'
              }`}
            >
              Architecture
            </button>
            <button
              onClick={() => scrollToSection('preview')}
              className={`block w-full text-left py-2 px-3 rounded-lg transition-colors ${
                activeSection === 'preview'
                  ? 'text-[#45C8E8] bg-[#45C8E8]/10 border border-[#45C8E8]/30 font-semibold'
                  : 'text-[#8EA2C6] hover:text-white'
              }`}
            >
              Product Preview
            </button>
            <button
              onClick={() => scrollToSection('scoring')}
              className={`block w-full text-left py-2 px-3 rounded-lg transition-colors ${
                activeSection === 'scoring'
                  ? 'text-[#45C8E8] bg-[#45C8E8]/10 border border-[#45C8E8]/30 font-semibold'
                  : 'text-[#8EA2C6] hover:text-white'
              }`}
            >
              Deterministic Scoring
            </button>
          </div>

          <div className="pt-4 border-t border-[#1E314F] space-y-2.5">
            <button
              onClick={() => handleLaunch('login')}
              className="w-full py-2.5 rounded-xl border border-[#1E314F] bg-[#111D30] text-white font-semibold text-xs tracking-wider uppercase font-mono hover:border-[#45C8E8]/40 flex items-center justify-center gap-2"
            >
              <LogIn className="w-3.5 h-3.5 text-[#45C8E8]" />
              <span>Sign In to Platform</span>
            </button>
            <button
              onClick={() => handleLaunch('signup')}
              className="w-full py-3 rounded-xl bg-[#45C8E8] text-[#080F1D] font-bold text-xs tracking-wider uppercase font-mono hover:bg-[#38B2D0] flex items-center justify-center gap-2"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
