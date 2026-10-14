import React from 'react';
import { Shield, ArrowRight, ExternalLink, Sparkles } from 'lucide-react';

export default function LandingFooter({ onLaunchDashboard, onReplayIntro }) {
  return (
    <footer className="border-t border-[#1E314F] bg-[#080F1D] text-[#8EA2C6] py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          {/* Brand info */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#111D30] border border-[#1E314F] flex items-center justify-center text-[#45C8E8]">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <span className="text-base font-bold text-white font-mono tracking-wider">
                  SURAKSHA
                </span>
                <div className="text-[10px] text-[#8EA2C6] uppercase tracking-widest font-mono">
                  Detect. Verify. Protect.
                </div>
              </div>
            </div>

            <p className="text-xs text-[#8EA2C6] leading-relaxed max-w-md">
              AI-assisted Digital Risk Protection platform built for continuous brand perimeter defense, rogue mobile app discovery, lookalike impersonation analysis, and explainable threat scoring.
            </p>

            <div className="pt-2 flex items-center gap-2 text-[11px] font-mono text-[#45C8E8]">
              <span className="w-2 h-2 rounded-full bg-[#10B981]" />
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
                <button onClick={onLaunchDashboard} className="hover:text-[#45C8E8] transition-colors">
                  Brand Profiles & Whitelist
                </button>
              </li>
              <li>
                <button onClick={onLaunchDashboard} className="hover:text-[#45C8E8] transition-colors">
                  Mobile App Guard (Apple API)
                </button>
              </li>
              <li>
                <button onClick={onLaunchDashboard} className="hover:text-[#45C8E8] transition-colors">
                  Social Impersonation Watch
                </button>
              </li>
              <li>
                <button onClick={onLaunchDashboard} className="hover:text-[#45C8E8] transition-colors">
                  Threat Intelligence Explorer
                </button>
              </li>
              <li>
                <button onClick={onLaunchDashboard} className="hover:text-[#45C8E8] transition-colors">
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
            <ul className="space-y-2 text-xs font-mono text-[#8EA2C6]">
              <li>Backend: Flask 3.1 / Gunicorn WSGI</li>
              <li>Frontend: React 18 / Vite / Tailwind</li>
              <li>Database: PostgreSQL / SQLAlchemy 2.0</li>
              <li>Migrations: Alembic Automated DDL</li>
              <li>Container: Multi-Stage Alpine Docker</li>
            </ul>
          </div>
        </div>

        {/* Legal, Data Provenance & CTA bar */}
        <div className="pt-8 border-t border-[#1E314F] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono">
          <div className="text-center sm:text-left text-[#8EA2C6] text-[11px]">
            © {new Date().getFullYear()} SURAKSHA Enterprise Digital Risk Protection. MIT License.
            <div className="text-[10px] text-[#8EA2C6]/70 mt-1">
              Data Provenance Notice: Live evaluations strictly require verified ground truth configuration.
            </div>
          </div>

          <div className="flex items-center gap-3">
            {onReplayIntro && (
              <button
                type="button"
                onClick={onReplayIntro}
                className="px-3 py-2 rounded-lg border border-[#1E314F] text-[#45C8E8] hover:text-white hover:border-[#45C8E8]/50 bg-[#111D30] text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer"
                title="Replay SURAKSHA Cinematic Vault Intro"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Replay Intro</span>
              </button>
            )}

            <button
              onClick={onLaunchDashboard}
              className="px-4 py-2 rounded-lg bg-[#45C8E8] text-[#080F1D] font-bold text-xs font-mono flex items-center gap-2 hover:bg-[#38B2D0] transition-all shadow-card cursor-pointer"
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
