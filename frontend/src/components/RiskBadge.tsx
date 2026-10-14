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
    sm: 'text-[11px] px-2 py-0.5 gap-1 font-mono font-medium',
    md: 'text-xs px-2.5 py-0.5 gap-1.5 font-mono font-medium',
    lg: 'text-xs px-3 py-1 gap-2 font-mono font-semibold',
  };

  const config = {
    Critical: {
      bg: 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/30',
      icon: ShieldAlert,
      label: 'Critical Risk',
      dot: 'bg-[#EF4444]',
    },
    High: {
      bg: 'bg-[#F97316]/10 text-[#F97316] border-[#F97316]/30',
      icon: AlertTriangle,
      label: 'High Risk',
      dot: 'bg-[#F97316]',
    },
    Medium: {
      bg: 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30',
      icon: AlertCircle,
      label: 'Medium Risk',
      dot: 'bg-[#F59E0B]',
    },
    Low: {
      bg: 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30',
      icon: ShieldCheck,
      label: 'Low Risk',
      dot: 'bg-[#10B981]',
    },
    Safe: {
      bg: 'bg-[#45C8E8]/10 text-[#45C8E8] border-[#45C8E8]/30',
      icon: ShieldCheck,
      label: 'Verified Official',
      dot: 'bg-[#45C8E8]',
    },
  }[level] || {
    bg: 'bg-[#16253D] text-[#8EA2C6] border-[#1E314F]',
    icon: AlertCircle,
    label: level,
    dot: 'bg-[#8EA2C6]',
  };

  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center rounded-md border tracking-tight transition-colors ${sizeClasses[size]} ${config.bg}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${config.dot}`} />
      {showIcon && <Icon className="w-3.5 h-3.5 shrink-0 opacity-90" />}
      <span>{config.label}</span>
    </span>
  );
};
