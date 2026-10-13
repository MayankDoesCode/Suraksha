import React from 'react';
import { Shield, AlertTriangle, Smartphone, Share2, Globe, Radio } from 'lucide-react';

interface ThreatNode {
  id: string;
  target: string;
  type: string;
  severity: 'high' | 'medium' | 'critical';
  position: { top?: string; bottom?: string; left?: string; right?: string };
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  pulseColor: string;
  tagColor: string;
}

const threatNodes: ThreatNode[] = [
  {
    id: 'threat-1',
    target: 'fake-brand.com',
    type: 'LOOK-ALIKE DOMAIN',
    severity: 'critical',
    position: { top: '8%', right: '4%' },
    icon: Globe,
    color: 'text-rose-400',
    pulseColor: 'bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.9)]',
    tagColor: 'border-rose-500/30 bg-rose-950/70 text-rose-300',
  },
  {
    id: 'threat-2',
    target: 'brand-apps.net',
    type: 'ROGUE APP',
    severity: 'high',
    position: { top: '14%', left: '4%' },
    icon: Smartphone,
    color: 'text-amber-400',
    pulseColor: 'bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.9)]',
    tagColor: 'border-amber-500/30 bg-amber-950/70 text-amber-300',
  },
  {
    id: 'threat-3',
    target: '@brand_support',
    type: 'FAKE SOCIAL',
    severity: 'medium',
    position: { bottom: '12%', left: '4%' },
    icon: Share2,
    color: 'text-cyan-400',
    pulseColor: 'bg-cyan-400 shadow-[0_0_12px_rgba(6,214,245,0.9)]',
    tagColor: 'border-cyan-500/30 bg-cyan-950/70 text-cyan-300',
  },
  {
    id: 'threat-4',
    target: 'brand-shop.xyz',
    type: 'LOOK-ALIKE DOMAIN',
    severity: 'critical',
    position: { bottom: '10%', right: '4%' },
    icon: Globe,
    color: 'text-rose-400',
    pulseColor: 'bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.9)]',
    tagColor: 'border-rose-500/30 bg-rose-950/70 text-rose-300',
  },
];

export const ThreatRadarVisualization: React.FC = () => {
  return (
    <div className="relative w-full max-w-[460px] h-[260px] sm:h-[290px] lg:h-[280px] xl:h-[350px] flex items-center justify-center select-none my-0.5 sm:my-1 overflow-visible">
      <style>{`
        @keyframes radar-sweep {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse-ring {
          0% { transform: scale(0.95); opacity: 0.8; }
          50% { transform: scale(1.04); opacity: 0.3; }
          100% { transform: scale(0.95); opacity: 0.8; }
        }
        .animate-radar-sweep {
          animation: radar-sweep 7s linear infinite;
        }
        .animate-pulse-ring {
          animation: pulse-ring 4s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-radar-sweep {
            animation: none !important;
            opacity: 0.35 !important;
            transform: rotate(45deg) !important;
          }
          .animate-pulse-ring {
            animation: none !important;
          }
        }
      `}</style>

      {/* Background circular ambient gradient */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[260px] sm:w-[300px] h-[260px] sm:h-[300px] rounded-full bg-radial from-[#2563EB]/15 via-[#06D6F5]/5 to-transparent blur-2xl" />
      </div>

      {/* Scaled Visualization Canvas: Scales smoothly across mobile, tablet, and widescreen */}
      <div className="relative w-[420px] h-[330px] sm:w-[450px] sm:h-[350px] lg:w-[450px] lg:h-[330px] xl:w-[470px] xl:h-[370px] flex items-center justify-center scale-[0.68] xs:scale-[0.76] sm:scale-[0.85] lg:scale-[0.80] xl:scale-100 origin-center">
        {/* SVG Concentric Radar Grid & Scanning Sweep */}
        <div className="relative w-[300px] sm:w-[320px] h-[300px] sm:h-[320px] flex items-center justify-center">
          <svg
            viewBox="0 0 340 340"
            className="absolute inset-0 w-full h-full pointer-events-none"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Subtle Outer Boundary */}
            <circle
              cx="170"
              cy="170"
              r="165"
              stroke="#071632"
              strokeWidth="1.5"
              strokeDasharray="4 4"
              className="opacity-70"
            />

            {/* Concentric Rings */}
            <circle
              cx="170"
              cy="170"
              r="135"
              stroke="#2563EB"
              strokeWidth="1"
              className="opacity-25"
            />
            <circle
              cx="170"
              cy="170"
              r="95"
              stroke="#06D6F5"
              strokeWidth="1"
              className="opacity-30"
            />
            <circle
              cx="170"
              cy="170"
              r="55"
              stroke="#2563EB"
              strokeWidth="1.2"
              className="opacity-40 animate-pulse-ring origin-center"
            />

            {/* Crosshairs */}
            <line
              x1="170"
              y1="5"
              x2="170"
              y2="335"
              stroke="#06D6F5"
              strokeWidth="1"
              strokeDasharray="3 3"
              className="opacity-20"
            />
            <line
              x1="5"
              y1="170"
              x2="335"
              y2="170"
              stroke="#06D6F5"
              strokeWidth="1"
              strokeDasharray="3 3"
              className="opacity-20"
            />

            {/* 45 Degree Diagonal Guides */}
            <line
              x1="50"
              y1="50"
              x2="290"
              y2="290"
              stroke="#2563EB"
              strokeWidth="0.8"
              strokeDasharray="2 4"
              className="opacity-15"
            />
            <line
              x1="290"
              y1="50"
              x2="50"
              y2="290"
              stroke="#2563EB"
              strokeWidth="0.8"
              strokeDasharray="2 4"
              className="opacity-15"
            />

            {/* Degree Markers */}
            <text x="173" y="18" fill="#06D6F5" opacity="0.5" fontSize="8" fontFamily="monospace">000°</text>
            <text x="315" y="167" fill="#06D6F5" opacity="0.5" fontSize="8" fontFamily="monospace">090°</text>
            <text x="173" y="332" fill="#06D6F5" opacity="0.5" fontSize="8" fontFamily="monospace">180°</text>
            <text x="8" y="167" fill="#06D6F5" opacity="0.5" fontSize="8" fontFamily="monospace">270°</text>
          </svg>

          {/* Rotating Radar Sweep Cone */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div
              className="w-full h-full rounded-full animate-radar-sweep origin-center"
              style={{
                background: 'conic-gradient(from 0deg, rgba(6, 214, 245, 0.28) 0deg, rgba(37, 99, 235, 0.12) 28deg, transparent 48deg, transparent 360deg)',
                maskImage: 'radial-gradient(circle at center, black 0%, black 72%, transparent 74%)',
                WebkitMaskImage: 'radial-gradient(circle at center, black 0%, black 72%, transparent 74%)',
              }}
            />
          </div>

          {/* Central Shield Protection Core */}
          <div className="relative z-20 flex flex-col items-center justify-center group cursor-default">
            <div className="relative flex items-center justify-center">
              {/* Pulsing Aura */}
              <div className="absolute -inset-2 rounded-2xl bg-cyan-400/20 blur-md animate-pulse" />
              
              {/* Hexagonal Shield Container */}
              <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-[#2563EB] via-indigo-600 to-[#06D6F5] p-[1.5px] shadow-xl shadow-cyan-500/30">
                <div className="w-full h-full rounded-2xl bg-[#020817]/90 backdrop-blur-md flex items-center justify-center border border-cyan-400/40">
                  <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-[#06D6F5] transition-transform duration-300 group-hover:scale-110" />
                </div>
              </div>
            </div>
            
            <div className="mt-1 px-2 py-0.5 rounded-full bg-[#071632]/80 border border-cyan-500/30 text-[8.5px] font-mono tracking-widest text-cyan-300 uppercase shadow-xs">
              BRAND CORE
            </div>
          </div>
        </div>

        {/* Floating Interactive Threat Indicators */}
        {threatNodes.map((threat) => {
          const Icon = threat.icon;
          return (
            <div
              key={threat.id}
              style={threat.position}
              className="absolute z-30 flex items-center gap-2 group transition-all duration-300 hover:scale-105"
            >
              {/* Pulsing Threat Marker Dot */}
              <div className="relative flex items-center justify-center">
                <span className={`w-2.5 h-2.5 rounded-full ${threat.pulseColor} animate-ping absolute opacity-75`} />
                <span className={`w-2 h-2 rounded-full ${threat.pulseColor} relative z-10`} />
              </div>

              {/* Micro Glass Threat Chip */}
              <div
                className={`px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg border backdrop-blur-md shadow-lg shadow-black/80 flex items-center gap-1.5 sm:gap-2 transition-all group-hover:border-cyan-400/50 ${threat.tagColor}`}
              >
                <Icon className={`w-3 h-3 ${threat.color} shrink-0`} />
                <div className="flex flex-col text-left">
                  <span className="text-[10px] sm:text-[11px] font-mono font-bold text-white tracking-tight leading-none group-hover:text-cyan-300 transition-colors">
                    {threat.target}
                  </span>
                  <span className="text-[7.5px] sm:text-[8px] font-mono tracking-wider opacity-85 mt-0.5 font-semibold">
                    {threat.type}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Radar Status Badge at Bottom Center */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 z-20 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#071632]/90 border border-blue-500/25 text-[8.5px] sm:text-[9px] font-mono text-slate-300 backdrop-blur-md whitespace-nowrap">
        <Radio className="w-2.5 h-2.5 text-[#06D6F5] animate-pulse" />
        <span>RADAR SCANNING: 360° ACTIVE MATRIX</span>
      </div>
    </div>
  );
};

export default ThreatRadarVisualization;
