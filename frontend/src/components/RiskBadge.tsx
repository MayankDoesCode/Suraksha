import React from 'react';
import type { RiskLevel } from '../types';
import { AlertTriangle, AlertCircle, ShieldCheck, ShieldAlert } from 'lucide-react';

interface RiskBadgeProps {
  level: RiskLevel | 'Safe';
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ level, size = 'md', showIcon = true }) => {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-medium',
    lg: 'text-sm px-3 py-1.5 gap-2 font-semibold',
  };

  const config = {
    Critical: {
      bg: 'bg-[#FF315B]/15 text-[#FF315B] border-[#FF315B]/40 shadow-[0_0_8px_rgba(255,49,91,0.25)]',
      icon: ShieldAlert,
      label: 'Critical Risk',
      dot: 'bg-[#FF315B]',
    },
    High: {
      bg: 'bg-[#FFB020]/15 text-[#FFB020] border-[#FFB020]/40 shadow-[0_0_8px_rgba(255,176,32,0.25)]',
      icon: AlertTriangle,
      label: 'High Risk',
      dot: 'bg-[#FFB020]',
    },
    Medium: {
      bg: 'bg-[#8B5CF6]/15 text-[#8B5CF6] border-[#8B5CF6]/40 shadow-[0_0_8px_rgba(139,92,246,0.25)]',
      icon: AlertCircle,
      label: 'Medium Risk',
      dot: 'bg-[#8B5CF6]',
    },
    Low: {
      bg: 'bg-[#00E5A0]/15 text-[#00E5A0] border-[#00E5A0]/40 shadow-[0_0_8px_rgba(0,229,160,0.25)]',
      icon: ShieldCheck,
      label: 'Low Risk',
      dot: 'bg-[#00E5A0]',
    },
    Safe: {
      bg: 'bg-[#00D9FF]/15 text-[#00D9FF] border-[#00D9FF]/40 shadow-[0_0_8px_rgba(0,217,255,0.25)]',
      icon: ShieldCheck,
      label: 'Protected / Safe',
      dot: 'bg-[#00D9FF]',
    },
  }[level] || {
    bg: 'bg-[#0A1C3D] text-[#91ACD1] border-[#123E78]',
    icon: AlertCircle,
    label: level,
    dot: 'bg-[#91ACD1]',
  };

  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center rounded-full border shadow-xs tracking-wide transition-colors ${sizeClasses[size]} ${config.bg}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot} animate-pulse`} />
      {showIcon && <Icon className={size === 'lg' ? 'w-4 h-4' : 'w-3.5 h-3.5'} />}
      <span>{config.label}</span>
    </span>
  );
};
