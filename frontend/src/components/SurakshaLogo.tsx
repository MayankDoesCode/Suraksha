import React from 'react';

export interface SurakshaLogoProps {
  size?: number;
  className?: string;
  variant?: 'mark' | 'full' | 'horizontal';
  glow?: boolean;
  animate?: boolean;
  wordmarkClassName?: string;
}

/**
 * SURAKSHA Official Enterprise Brand Emblem
 * 
 * Geometry:
 * - Precision-chamfered aerodynamic cyber-shield carapace.
 * - Dual interlocking aerospace defense blades forming a kinetic "S" (Suraksha) in positive/negative space.
 * - Central high-frequency threat radar core (active detection nucleus).
 * - Multi-stop electric cyan to hyper-indigo vector gradients with specular edge lighting.
 */
export const SurakshaLogo: React.FC<SurakshaLogoProps> = ({
  size = 36,
  className = '',
  variant = 'mark',
  glow = false,
  animate = true,
  wordmarkClassName = '',
}) => {
  const mark = (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${className}`}>
      {glow && (
        <div
          className="absolute rounded-full pointer-events-none -z-10 blur-xl opacity-60"
          style={{
            width: size * 1.5,
            height: size * 1.5,
            background: 'radial-gradient(circle, rgba(0, 240, 255, 0.35) 0%, rgba(79, 70, 229, 0.15) 50%, transparent 70%)',
          }}
        />
      )}
      <svg
        width={size}
        height={Math.round(size * 1.08)}
        viewBox="0 0 64 70"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="overflow-visible select-none transition-transform duration-300 hover:scale-105"
        aria-label="SURAKSHA Shield Logo"
        role="img"
      >
        <defs>
          {/* Primary Cyber Cyan Gradient */}
          <linearGradient id="sk-cyan-grad" x1="8" y1="4" x2="56" y2="64" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#00F0FF" />
            <stop offset="45%" stopColor="#00B4D8" />
            <stop offset="100%" stopColor="#4F46E5" />
          </linearGradient>

          {/* Deep Armor Plate Gradient */}
          <linearGradient id="sk-plate-grad" x1="16" y1="8" x2="48" y2="60" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1E293B" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#0B132B" stopOpacity="0.95" />
          </linearGradient>

          {/* Reverse Blade Gradient */}
          <linearGradient id="sk-reverse-grad" x1="56" y1="64" x2="8" y2="4" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#00F0FF" />
            <stop offset="55%" stopColor="#6366F1" />
            <stop offset="100%" stopColor="#3B82F6" />
          </linearGradient>

          {/* Core Radar Beacon Radial Gradient */}
          <radialGradient id="sk-core-grad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="35%" stopColor="#00F0FF" />
            <stop offset="70%" stopColor="#0284C7" />
            <stop offset="100%" stopColor="#0284C7" stopOpacity="0" />
          </radialGradient>

          {/* Ambient Glow Filter */}
          <filter id="sk-core-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* 1. Outer Geometric Hull (Subtle telemetry boundary) */}
        <path
          d="M32 3 L57 14.5 V35.5 C57 49 46 59.5 32 66 C18 59.5 7 49 7 35.5 V14.5 L32 3 Z"
          fill="url(#sk-plate-grad)"
          stroke="url(#sk-cyan-grad)"
          strokeWidth="1.25"
          strokeOpacity="0.4"
          className="transition-all duration-300"
        />

        {/* 2. Upper Kinetic "S" Wing (Aggressive top crest cutting down & right) */}
        <path
          d="M32 7.5 L52 17 V30 L40 24.5 L32 28.5 L24 24.5 L20 26.5 L12 22.5 V17 L32 7.5 Z"
          fill="url(#sk-cyan-grad)"
          fillOpacity="0.18"
          stroke="url(#sk-cyan-grad)"
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* 3. Lower Kinetic "S" Wing (Interlocking defensive foundation sweeping up & left) */}
        <path
          d="M32 61.5 L12 51.5 V39 L24 44.5 L32 40.5 L40 44.5 L44 42.5 L52 46.5 V51.5 L32 61.5 Z"
          fill="url(#sk-reverse-grad)"
          fillOpacity="0.18"
          stroke="url(#sk-reverse-grad)"
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* 4. The Iconic Dynamic "S" Spine (Continuous central cybernetic ribbon) */}
        <path
          d="M48 18.5 L32 11 L16 18.5 V30 L28 24.5 L36 29 L22 36 L16 39 V49.5 L32 57 L48 49.5 V38 L36 43.5 L28 39 L42 32 L48 29 V18.5 Z"
          fill="none"
          stroke="url(#sk-cyan-grad)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* 5. Center Radar Nucleus / Threat Scanning Diamond */}
        <g filter={animate ? 'url(#sk-core-glow)' : undefined}>
          <polygon
            points="32,28.5 37.5,34 32,39.5 26.5,34"
            fill="url(#sk-core-grad)"
            className={animate ? 'animate-pulse' : ''}
          />
          {/* Micro High-Intensity Center Spec */}
          <circle cx="32" cy="34" r="1.5" fill="#FFFFFF" />
        </g>

        {/* 6. Precision Corner Telemetry Accents */}
        <line x1="32" y1="4" x2="32" y2="7.5" stroke="#00F0FF" strokeWidth="2" strokeLinecap="round" />
        <line x1="7" y1="14.5" x2="10" y2="16" stroke="#00F0FF" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="57" y1="14.5" x2="54" y2="16" stroke="#00F0FF" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="32" cy="65" r="1" fill="#00F0FF" />
      </svg>
    </div>
  );

  if (variant === 'mark') {
    return mark;
  }

  return (
    <div className={`inline-flex items-center gap-3 ${wordmarkClassName}`}>
      {mark}
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <span className="font-bold tracking-[0.22em] text-fg uppercase text-sm sm:text-base font-sans">
            SURAKSHA
          </span>
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent animate-ping" />
        </div>
        <span className="text-[9.5px] font-mono uppercase tracking-[0.28em] text-fgSubtle -mt-0.5">
          Cyber Defense Matrix
        </span>
      </div>
    </div>
  );
};

export default SurakshaLogo;
