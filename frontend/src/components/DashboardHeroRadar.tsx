import React from 'react';
import { Shield, Globe, Smartphone, Share2 } from 'lucide-react';

interface ThreatChip {
  id: string;
  target: string;
  type: string;
  position: { top?: string; bottom?: string; left?: string; right?: string };
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  pulseColor: string;
  tagColor: string;
}

const threatChips: ThreatChip[] = [
  {
    id: 'hero-threat-1',
    target: 'fake-brand.com',
    type: 'LOOK-ALIKE DOMAIN',
    position: { top: '8%', right: '0%' },
    icon: Globe,
    color: 'text-[#FF315B]',
    pulseColor: 'bg-[#FF315B] shadow-[0_0_10px_#FF315B]',
    tagColor: 'border-[#FF315B]/30 bg-[#FF315B]/10 text-[#FF315B]',
  },
  {
    id: 'hero-threat-2',
    target: 'brand-apps.net',
    type: 'ROGUE APP',
    position: { top: '8%', left: '0%' },
    icon: Smartphone,
    color: 'text-[#FFB020]',
    pulseColor: 'bg-[#FFB020] shadow-[0_0_10px_#FFB020]',
    tagColor: 'border-[#FFB020]/30 bg-[#FFB020]/10 text-[#FFB020]',
  },
  {
    id: 'hero-threat-3',
    target: '@brand_support',
    type: 'FAKE SOCIAL',
    position: { bottom: '8%', left: '0%' },
    icon: Share2,
    color: 'text-[#00D9FF]',
    pulseColor: 'bg-[#00D9FF] shadow-[0_0_10px_#00D9FF]',
    tagColor: 'border-[#00D9FF]/30 bg-[#00D9FF]/10 text-[#00D9FF]',
  },
  {
    id: 'hero-threat-4',
    target: 'brand-shop.xyz',
    type: 'LOOK-ALIKE DOMAIN',
    position: { bottom: '8%', right: '0%' },
    icon: Globe,
    color: 'text-[#FF315B]',
    pulseColor: 'bg-[#FF315B] shadow-[0_0_10px_#FF315B]',
    tagColor: 'border-[#FF315B]/30 bg-[#FF315B]/10 text-[#FF315B]',
  },
];

export const DashboardHeroRadar: React.FC = () => {
  return (
    <div className="relative w-[390px] xl:w-[440px] h-[200px] flex items-center justify-center select-none overflow-visible">
      <style>{`
        @keyframes hero-radar-sweep {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes hero-pulse-ring {
          0% { transform: scale(0.96); opacity: 0.7; }
          50% { transform: scale(1.04); opacity: 0.25; }
          100% { transform: scale(0.96); opacity: 0.7; }
        }
        .animate-hero-sweep {
          animation: hero-radar-sweep 8s linear infinite;
        }
        .animate-hero-pulse {
          animation: hero-pulse-ring 3.5s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-hero-sweep {
            animation: none !important;
            opacity: 0.3 !important;
            transform: rotate(45deg) !important;
          }
          .animate-hero-pulse {
            animation: none !important;
          }
        }
      `}</style>

      {/* Ambient Radial Glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[180px] h-[180px] rounded-full bg-radial from-[#1265F8]/20 via-[#00D9FF]/10 to-transparent blur-xl" />
      </div>

      {/* SVG Concentric Radar Grid & Scanning Sweep */}
      <div className="relative w-[180px] h-[180px] flex items-center justify-center shrink-0">
        <svg
          viewBox="0 0 200 200"
          className="absolute inset-0 w-full h-full pointer-events-none"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Outer Boundary */}
          <circle
            cx="100"
            cy="100"
            r="96"
            stroke="#123E78"
            strokeWidth="1.2"
            strokeDasharray="3 3"
            className="opacity-70"
          />

          {/* Concentric Rings */}
          <circle
            cx="100"
            cy="100"
            r="75"
            stroke="#1265F8"
            strokeWidth="0.8"
            className="opacity-40"
          />
          <circle
            cx="100"
            cy="100"
            r="50"
            stroke="#00D9FF"
            strokeWidth="0.8"
            className="opacity-45"
          />
          <circle
            cx="100"
            cy="100"
            r="28"
            stroke="#1265F8"
            strokeWidth="1"
            className="opacity-60 animate-hero-pulse origin-center"
          />

          {/* Crosshairs */}
          <line
            x1="100"
            y1="4"
            x2="100"
            y2="196"
            stroke="#00D9FF"
            strokeWidth="0.8"
            strokeDasharray="2 3"
            className="opacity-30"
          />
          <line
            x1="4"
            y1="100"
            x2="196"
            y2="100"
            stroke="#00D9FF"
            strokeWidth="0.8"
            strokeDasharray="2 3"
            className="opacity-30"
          />

          {/* Diagonal Guides */}
          <line
            x1="30"
            y1="30"
            x2="170"
            y2="170"
            stroke="#1265F8"
            strokeWidth="0.6"
            strokeDasharray="2 4"
            className="opacity-25"
          />
          <line
            x1="170"
            y1="30"
            x2="30"
            y2="170"
            stroke="#1265F8"
            strokeWidth="0.6"
            strokeDasharray="2 4"
            className="opacity-25"
          />

          {/* Dotted digital nodes on perimeter */}
          <circle cx="100" cy="25" r="1.5" fill="#00D9FF" opacity="0.6" />
          <circle cx="175" cy="100" r="1.5" fill="#00D9FF" opacity="0.6" />
          <circle cx="100" cy="175" r="1.5" fill="#00D9FF" opacity="0.6" />
          <circle cx="25" cy="100" r="1.5" fill="#00D9FF" opacity="0.6" />
        </svg>

        {/* Rotating Radar Sweep Cone */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className="w-full h-full rounded-full animate-hero-sweep origin-center"
            style={{
              background:
                'conic-gradient(from 0deg, rgba(0, 217, 255, 0.32) 0deg, rgba(18, 101, 248, 0.12) 30deg, transparent 50deg, transparent 360deg)',
              maskImage: 'radial-gradient(circle at center, black 0%, black 70%, transparent 74%)',
              WebkitMaskImage: 'radial-gradient(circle at center, black 0%, black 70%, transparent 74%)',
            }}
          />
        </div>

        {/* Central Shield Protection Core */}
        <div className="relative z-20 flex flex-col items-center justify-center">
          <div className="relative flex items-center justify-center">
            <div className="absolute -inset-1.5 rounded-xl bg-[#00D9FF]/25 blur-xs animate-pulse" />
            <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-[#1265F8] via-[#1265F8]/80 to-[#00D9FF] p-[1.2px] shadow-lg shadow-[#00D9FF]/20">
              <div className="w-full h-full rounded-[9px] bg-[#030D22]/90 backdrop-blur-md flex items-center justify-center border border-[#00D9FF]/40">
                <Shield className="w-4 h-4 text-[#00D9FF]" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Threat Chips */}
      {threatChips.map((threat) => {
        const Icon = threat.icon;
        return (
          <div
            key={threat.id}
            style={threat.position}
            className="absolute z-30 flex items-center gap-1.5 group transition-transform duration-200 hover:scale-105"
          >
            {/* Pulsing indicator dot */}
            <div className="relative flex items-center justify-center">
              <span className={`w-2 h-2 rounded-full ${threat.pulseColor} animate-ping absolute opacity-75`} />
              <span className={`w-1.5 h-1.5 rounded-full ${threat.pulseColor} relative z-10`} />
            </div>

            {/* Micro Glass Chip */}
            <div
              className={`px-2 py-0.5 rounded-md border backdrop-blur-md shadow-md flex items-center gap-1.5 ${threat.tagColor}`}
            >
              <Icon className={`w-2.5 h-2.5 ${threat.color} shrink-0`} />
              <div className="flex flex-col text-left">
                <span className="text-[9.5px] font-mono font-bold tracking-tight leading-none text-[#F1F5FF]">
                  {threat.target}
                </span>
                <span className="text-[7px] font-mono tracking-wider opacity-85 mt-0.5 font-semibold">
                  {threat.type}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default DashboardHeroRadar;
