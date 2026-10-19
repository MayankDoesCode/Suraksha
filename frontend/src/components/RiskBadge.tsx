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
      bg: 'bg-danger/10 text-danger border-danger/30',
      icon: ShieldAlert,
      label: 'Critical Risk',
      dot: 'bg-danger',
    },
    High: {
      bg: 'bg-high/10 text-high border-high/30',
      icon: AlertTriangle,
      label: 'High Risk',
      dot: 'bg-high',
    },
    Medium: {
      bg: 'bg-warn/10 text-warn border-warn/30',
      icon: AlertCircle,
      label: 'Medium Risk',
      dot: 'bg-warn',
    },
    Low: {
      bg: 'bg-ok/10 text-ok border-ok/30',
      icon: ShieldCheck,
      label: 'Low Risk',
      dot: 'bg-ok',
    },
    Safe: {
      bg: 'bg-accent/10 text-accent border-accent/30',
      icon: ShieldCheck,
      label: 'Verified Official',
      dot: 'bg-accent',
    },
  }[level] || {
    bg: 'bg-surface3 text-fgMuted border-line',
    icon: AlertCircle,
    label: level,
    dot: 'bg-fgMuted',
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
