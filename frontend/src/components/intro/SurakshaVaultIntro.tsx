import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Shield, Sparkles, ChevronRight, Lock, KeyRound, Radio } from 'lucide-react';
import './SurakshaVaultIntro.css';

interface SurakshaVaultIntroProps {
  onComplete: () => void;
}

type IntroPhase = 'init' | 'shield' | 'unlock' | 'burst' | 'fade';

export const SurakshaVaultIntro: React.FC<SurakshaVaultIntroProps> = ({ onComplete }) => {
  const [phase, setPhase] = useState<IntroPhase>('init');
  const [statusText, setStatusText] = useState('INITIALIZING ZERO-TRUST PERIMETER...');
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isRendered, setIsRendered] = useState(true);

  const timersRef = useRef<number[]>([]);
  const hasFinishedRef = useRef(false);

  // Generate subtle deterministic ambient particles
  const ambientParticles = useMemo(() => {
    return Array.from({ length: 28 }, (_, i) => ({
      id: i,
      left: `${(i * 137.5) % 94 + 3}%`,
      top: `${(i * 93.7) % 90 + 5}%`,
      size: `${(i % 3) * 1.5 + 2}px`,
      delay: `${(i % 5) * 0.4}s`,
      duration: `${3 + (i % 4) * 0.8}s`,
      opacity: 0.25 + ((i % 5) * 0.12),
    }));
  }, []);

  const triggerFinish = () => {
    if (hasFinishedRef.current) return;
    hasFinishedRef.current = true;

    // Clear all pending transition timers
    timersRef.current.forEach((id) => clearTimeout(id));
    timersRef.current = [];

    setIsFadingOut(true);
    setPhase('fade');

    // Allow CSS transition to finish before notifying parent
    const fadeTimer = window.setTimeout(() => {
      setIsRendered(false);
      onComplete();
    }, 700);
    timersRef.current.push(fadeTimer);
  };

  useEffect(() => {
    // Check user preference for reduced motion
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      if (mediaQuery.matches) {
        triggerFinish();
        return;
      }
    }

    // Keyboard 'Escape' listener for instant skip
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        triggerFinish();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    // Orchestrated Cinematic Timeline:
    // 0ms -> 1200ms: Scene A (Initialization, outer rings, central light)
    const t1 = window.setTimeout(() => {
      setPhase('shield');
      setStatusText('GEOMETRIC SECURITY SHIELD FORMING...');
    }, 1200);

    // 1200ms -> 2700ms: Scene B (Shield facets & light sweep, wordmark)
    const t2 = window.setTimeout(() => {
      setStatusText('SURAKSHA EMBLEM AUTHENTICATED // NEURAL CORE ACTIVE');
    }, 2100);

    // 2700ms -> 4100ms: Scene C (Mechanical vault unlocking, pin retraction, pulse)
    const t3 = window.setTimeout(() => {
      setPhase('unlock');
      setStatusText('VAULT UNLOCKED • DEPLOYING THREAT DEFENSE MATRIX');
    }, 2800);

    // 4100ms -> 4800ms: Scene D (Supernova light burst expansion)
    const t4 = window.setTimeout(() => {
      setPhase('burst');
      setStatusText('YOUR DIGITAL WORLD. PROTECTED.');
    }, 4150);

    // 4800ms+: Transition into website
    const t5 = window.setTimeout(() => {
      triggerFinish();
    }, 4900);

    timersRef.current = [t1, t2, t3, t4, t5];

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      timersRef.current.forEach((id) => clearTimeout(id));
      timersRef.current = [];
    };
  }, []);

  if (!isRendered) {
    return null;
  }

  const isUnlocked = phase === 'unlock' || phase === 'burst' || phase === 'fade';
  const isBursting = phase === 'burst' || phase === 'fade';

  return (
    <div
      className={`suraksha-vault-container ${isUnlocked ? 'vault-unlocked' : ''} ${isBursting ? 'vault-bursting' : ''} ${isFadingOut ? 'vault-fading-out' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="SURAKSHA Cyber Vault Initialization"
    >
      {/* 1. Tactical Grid & Ambient Atmosphere */}
      <div className="vault-bg-grid" aria-hidden="true" />
      <div className="vault-ambient-glow" aria-hidden="true" />
      <div className="vault-radar-sweep" aria-hidden="true" />

      {/* Floating Constellation Sparks */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        {ambientParticles.map((pt) => (
          <div
            key={pt.id}
            className="absolute rounded-full bg-cyan-400"
            style={{
              left: pt.left,
              top: pt.top,
              width: pt.size,
              height: pt.size,
              opacity: pt.opacity,
              animation: `particleFloat ${pt.duration} ease-in-out infinite alternate`,
              animationDelay: pt.delay,
              boxShadow: '0 0 6px rgba(6, 214, 245, 0.8)',
            }}
          />
        ))}
      </div>

      {/* 2. Corner HUD Target Brackets */}
      <div className="vault-corner-hud vault-corner-tl" aria-hidden="true" />
      <div className="vault-corner-hud vault-corner-tr" aria-hidden="true" />
      <div className="vault-corner-hud vault-corner-bl" aria-hidden="true" />
      <div className="vault-corner-hud vault-corner-br" aria-hidden="true" />

      {/* Top Left System Telemetry */}
      <div className="absolute top-7 left-8 sm:left-10 z-20 flex items-center gap-2.5 text-[10px] sm:text-[11px] font-mono text-slate-400">
        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
        <span className="text-cyan-400 font-semibold tracking-wider">SYS_CORE // SURAKSHA_DEFENSE_MATRIX</span>
        <span className="hidden sm:inline text-slate-600">|</span>
        <span className="hidden sm:inline text-slate-500">v5.2_ENTERPRISE</span>
      </div>

      {/* Top Right Skip Button */}
      <button
        type="button"
        onClick={triggerFinish}
        className="vault-skip-btn cursor-pointer"
        aria-label="Skip cinematic vault intro"
      >
        <span>SKIP INTRO</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono border border-cyan-400/30">
          ESC
        </span>
      </button>

      {/* Central Supernova Light Flare */}
      <div className="vault-central-burst" aria-hidden="true" />

      {/* 3. The Central Vault & Shield Master SVG Canvas */}
      <div className="relative z-10 w-[340px] h-[340px] sm:w-[460px] sm:h-[460px] md:w-[540px] md:h-[540px] flex items-center justify-center">
        <svg
          viewBox="0 0 600 600"
          className="w-full h-full overflow-visible"
          shapeRendering="geometricPrecision"
        >
          <defs>
            {/* Neon Glow Filters */}
            <filter id="vaultCyanGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="vaultIntenseGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="9" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Gradients */}
            <linearGradient id="shieldArmorLeft" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1E293B" />
              <stop offset="40%" stopColor="#0B132B" />
              <stop offset="100%" stopColor="#030712" />
            </linearGradient>

            <linearGradient id="shieldArmorRight" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#334155" />
              <stop offset="50%" stopColor="#0F172A" />
              <stop offset="100%" stopColor="#020617" />
            </linearGradient>

            <linearGradient id="shieldCrownGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#06D6F5" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#3B82F6" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#06D6F5" stopOpacity="0.8" />
            </linearGradient>

            <linearGradient id="electricCoreBeam" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="25%" stopColor="#06D6F5" />
              <stop offset="75%" stopColor="#3B82F6" />
              <stop offset="100%" stopColor="#06D6F5" />
            </linearGradient>

            <linearGradient id="lightSweepGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(255,255,255,0)" />
              <stop offset="40%" stopColor="rgba(255,255,255,0.2)" />
              <stop offset="50%" stopColor="rgba(255,255,255,0.95)" />
              <stop offset="60%" stopColor="rgba(6,214,245,0.6)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </linearGradient>

            {/* Precise Shield Boundary Clip for Specular Light Sweep */}
            <clipPath id="shieldContourClip">
              <path d="M 300,160 L 410,185 L 410,270 C 410,365 345,430 300,455 C 255,430 190,365 190,270 L 190,185 Z" />
            </clipPath>
          </defs>

          {/* ======================================================== */}
          {/* LAYER 1: CONCENTRIC CIRCULAR VAULT MECHANISM             */}
          {/* ======================================================== */}

          {/* Ring 1: Outer Segmented Gear Armor (r=260) */}
          <g className="vault-ring-outer-clockwise">
            <circle
              cx="300"
              cy="300"
              r="260"
              fill="none"
              stroke="#0E234B"
              strokeWidth="2"
            />
            <circle
              cx="300"
              cy="300"
              r="260"
              fill="none"
              stroke="#06D6F5"
              strokeWidth="3.5"
              strokeDasharray="16 36 8 36"
              filter="url(#vaultCyanGlow)"
            />
            {/* 4 Outer Alignment Cardinal Brackets */}
            <path d="M 300,32 L 300,48 M 300,552 L 300,568 M 32,300 L 48,300 M 552,300 L 568,300" stroke="#06D6F5" strokeWidth="3" />
            <circle cx="300" cy="40" r="3" fill="#06D6F5" />
            <circle cx="300" cy="560" r="3" fill="#06D6F5" />
            <circle cx="40" cy="300" r="3" fill="#06D6F5" />
            <circle cx="560" cy="300" r="3" fill="#06D6F5" />
          </g>

          {/* Ring 2: Precision Dial & Azimuth Degree Ticks (r=225) */}
          <g className="vault-ring-mid-counter">
            <circle
              cx="300"
              cy="300"
              r="225"
              fill="none"
              stroke="#152E5E"
              strokeWidth="1.5"
            />
            <circle
              cx="300"
              cy="300"
              r="225"
              fill="none"
              stroke="#38BDF8"
              strokeWidth="2"
              strokeDasharray="6 14"
              opacity="0.7"
            />
            {/* Precision Degree Labels */}
            <text x="300" y="88" fill="#06D6F5" fontSize="9" fontFamily="monospace" textAnchor="middle" opacity="0.85">000° SEC</text>
            <text x="512" y="303" fill="#06D6F5" fontSize="9" fontFamily="monospace" textAnchor="middle" opacity="0.85">090°</text>
            <text x="300" y="518" fill="#06D6F5" fontSize="9" fontFamily="monospace" textAnchor="middle" opacity="0.85">180°</text>
            <text x="88" y="303" fill="#06D6F5" fontSize="9" fontFamily="monospace" textAnchor="middle" opacity="0.85">270°</text>
          </g>

          {/* Ring 3: Segmented Circuit Conduit (r=185) */}
          <g className="vault-ring-inner-clockwise">
            <circle
              cx="300"
              cy="300"
              r="185"
              fill="none"
              stroke="#081A3A"
              strokeWidth="4"
            />
            <circle
              cx="300"
              cy="300"
              r="185"
              fill="none"
              stroke="#06D6F5"
              strokeWidth="2.5"
              strokeDasharray="80 30 40 30"
              filter="url(#vaultCyanGlow)"
            />
          </g>

          {/* Ring 4: Hydraulic Radial Locking Pins (r=148) */}
          <g className="vault-pin-retract">
            {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, idx) => (
              <g key={idx} transform={`rotate(${angle} 300 300)`}>
                <rect
                  x="294"
                  y="138"
                  width="12"
                  height="16"
                  rx="2"
                  fill="#1E293B"
                  stroke="#06D6F5"
                  strokeWidth="1.5"
                  filter="url(#vaultCyanGlow)"
                />
                <circle cx="300" cy="146" r="2" fill="#FFFFFF" />
              </g>
            ))}
          </g>

          {/* Ring 5: Inner Core Aperture Ring (r=125) */}
          <circle
            cx="300"
            cy="300"
            r="125"
            fill="none"
            stroke="rgba(6, 214, 245, 0.35)"
            strokeWidth="1"
            strokeDasharray="3 6"
          />

          {/* Electromagnetic Pulse Shockwave Ring */}
          <circle
            cx="300"
            cy="290"
            r="60"
            fill="none"
            stroke="#06D6F5"
            strokeWidth="3"
            filter="url(#vaultIntenseGlow)"
            className="shield-pulse-ring"
          />

          {/* ======================================================== */}
          {/* LAYER 2: THE GEOMETRIC SURAKSHA SHIELD EMBLEM            */}
          {/* ======================================================== */}
          <g id="surakshaEmblemGroup">
            {/* Ambient Shield Backdrop Shadow & Radial Soft Base */}
            <path
              d="M 300,160 L 410,185 L 410,270 C 410,365 345,430 300,455 C 255,430 190,365 190,270 L 190,185 Z"
              fill="rgba(3, 7, 18, 0.9)"
            />

            {/* Left Armor Facet */}
            <path
              d="M 300,165 L 195,188 L 195,268 C 195,358 255,420 300,448 Z"
              fill="url(#shieldArmorLeft)"
              stroke="#1E293B"
              strokeWidth="1"
              className="shield-facet shield-facet-left"
            />

            {/* Right Armor Facet */}
            <path
              d="M 300,165 L 405,188 L 405,268 C 405,358 345,420 300,448 Z"
              fill="url(#shieldArmorRight)"
              stroke="#334155"
              strokeWidth="1"
              className="shield-facet shield-facet-right"
            />

            {/* Inner Core Chevron Plate */}
            <path
              d="M 300,215 L 365,248 L 300,395 L 235,248 Z"
              fill="#06132D"
              stroke="#06D6F5"
              strokeWidth="1.5"
              opacity="0.85"
              className="shield-facet shield-facet-core"
            />

            {/* Center Electric Energy Spine */}
            <path
              d="M 300,168 L 300,445"
              stroke="url(#electricCoreBeam)"
              strokeWidth="3"
              strokeLinecap="round"
              filter="url(#vaultIntenseGlow)"
              className="shield-facet shield-facet-core"
            />

            {/* Upper Crown Shield Rim Highlight */}
            <path
              d="M 190,185 L 300,160 L 410,185"
              fill="none"
              stroke="url(#shieldCrownGrad)"
              strokeWidth="4"
              strokeLinecap="round"
              filter="url(#vaultCyanGlow)"
            />

            {/* Primary Glowing Shield Perimeter (Animated Stroke Draw) */}
            <path
              d="M 300,160 L 410,185 L 410,270 C 410,365 345,430 300,455 C 255,430 190,365 190,270 L 190,185 Z"
              fill="none"
              stroke="#06D6F5"
              strokeWidth="2.5"
              strokeLinejoin="round"
              filter="url(#vaultCyanGlow)"
              className="shield-stroke-animated"
            />

            {/* Specular Diagonal Sheen Sweep (Masked to Shield) */}
            <g clipPath="url(#shieldContourClip)">
              <rect
                x="150"
                y="120"
                width="80"
                height="450"
                fill="url(#lightSweepGrad)"
                className="shield-specular-sweep"
              />
            </g>
          </g>

          {/* ======================================================== */}
          {/* LAYER 3: TYPOGRAPHY & WORDMARK REVEAL                    */}
          {/* ======================================================== */}
          <g
            className="transition-all duration-700"
            style={{
              opacity: phase === 'init' ? 0 : 1,
              transform: phase === 'init' ? 'translateY(12px)' : 'translateY(0)',
            }}
          >
            {/* Master Wordmark SURAKSHA */}
            <text
              x="300"
              y="500"
              textAnchor="middle"
              fill="#FFFFFF"
              fontSize="24"
              fontWeight="800"
              fontFamily="monospace"
              letterSpacing="0.45em"
              filter="url(#vaultCyanGlow)"
            >
              SURAKSHA
            </text>

            {/* Subtitle */}
            <text
              x="300"
              y="522"
              textAnchor="middle"
              fill="#94A3B8"
              fontSize="8.5"
              fontWeight="600"
              fontFamily="monospace"
              letterSpacing="0.32em"
              opacity="0.9"
            >
              AI-POWERED DIGITAL RISK PROTECTION
            </text>
          </g>
        </svg>
      </div>

      {/* 4. Bottom Tactical Status Telemetry Line */}
      <div className="absolute bottom-9 left-1/2 -translate-x-1/2 z-20 w-full max-w-md px-6 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-[#071632]/70 border border-cyan-500/30 backdrop-blur-md shadow-lg shadow-black/60">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span className="text-xs font-mono font-medium tracking-widest text-cyan-200 uppercase">
            {statusText}
          </span>
        </div>

        {/* Dynamic Progress Telemetry */}
        <div className="mt-3 w-48 h-1 bg-slate-800/80 rounded-full overflow-hidden border border-slate-700/50">
          <div
            className="h-full bg-gradient-to-r from-blue-600 via-cyan-400 to-white transition-all duration-1000 ease-out"
            style={{
              width:
                phase === 'init'
                  ? '25%'
                  : phase === 'shield'
                  ? '60%'
                  : phase === 'unlock'
                  ? '88%'
                  : '100%',
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default SurakshaVaultIntro;
