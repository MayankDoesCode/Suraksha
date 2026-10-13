import React from 'react';
import { Shield, ArrowRight, ExternalLink } from 'lucide-react';

export default function LandingFooter({ onLaunchDashboard }) {
  return (
    <footer className="border-t border-cyan-500/20 bg-[#030612]/75 backdrop-blur-xl text-cyber-textMuted py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          {/* Brand info */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-cyber-accent/10 border border-cyber-accent/40 flex items-center justify-center text-cyber-accent">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <span className="text-base font-bold text-white font-mono tracking-wider">
                  SURAKSHA
                </span>
                <div className="text-[10px] text-cyber-textMuted uppercase tracking-widest font-mono">
                  Detect. Verify. Protect.
                </div>
              </div>
            </div>

            <p className="text-xs text-cyber-textMuted leading-relaxed max-w-md">
              AI-assisted Digital Risk Protection platform built for continuous brand perimeter defense, rogue mobile app discovery, lookalike impersonation analysis, and explainable threat scoring.
            </p>

            <div className="pt-2 flex items-center gap-2 text-[11px] font-mono text-cyber-accent">
              <span className="w-2 h-2 rounded-full bg-cyber-accent" />
              <span>PRODUCTION-READY DEPLOYMENT ARCHITECTURE</span>
            </div>
          </div>

          {/* Core Modules */}
          <div>
            <h4 className="text-xs font-mono uppercase tracking-wider text-white mb-4">
              Platform Modules
            </h4>
            <ul className="space-y-2 text-xs font-mono">
              <li>
                <button onClick={onLaunchDashboard} className="hover:text-cyber-accent transition-colors">
                  Brand Profiles & Whitelist
                </button>
              </li>
              <li>
                <button onClick={onLaunchDashboard} className="hover:text-cyber-accent transition-colors">
                  Mobile App Guard (Apple API)
                </button>
              </li>
              <li>
                <button onClick={onLaunchDashboard} className="hover:text-cyber-accent transition-colors">
                  Social Impersonation Watch
                </button>
              </li>
              <li>
                <button onClick={onLaunchDashboard} className="hover:text-cyber-accent transition-colors">
                  Threat Intelligence Explorer
                </button>
              </li>
              <li>
                <button onClick={onLaunchDashboard} className="hover:text-cyber-accent transition-colors">
                  System Diagnostics & Telemetry
                </button>
              </li>
            </ul>
          </div>

          {/* Architecture & Specs */}
          <div>
            <h4 className="text-xs font-mono uppercase tracking-wider text-white mb-4">
              Architecture Specs
            </h4>
            <ul className="space-y-2 text-xs font-mono text-cyber-textMuted">
              <li>Backend: Flask 3.1 / Gunicorn WSGI</li>
              <li>Frontend: React 18 / Vite / Tailwind</li>
              <li>Database: PostgreSQL / SQLAlchemy 2.0</li>
              <li>Migrations: Alembic Automated DDL</li>
              <li>Container: Multi-Stage Alpine Docker</li>
            </ul>
          </div>
        </div>

        {/* Legal, Data Provenance & CTA bar */}
        <div className="pt-8 border-t border-cyber-border/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono">
          <div className="text-center sm:text-left text-cyber-textMuted text-[11px]">
            © {new Date().getFullYear()} SURAKSHA Enterprise Digital Risk Protection. MIT License.
            <div className="text-[10px] text-cyber-textMuted/70 mt-1">
              Data Provenance Notice: Live evaluations strictly require verified ground truth configuration.
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={onLaunchDashboard}
              className="px-4 py-2 rounded-lg bg-cyber-accent text-cyber-darkest font-semibold text-xs font-mono flex items-center gap-2 hover:bg-cyber-accentHover transition-all shadow-glow"
            >
              <span>Launch Platform</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
