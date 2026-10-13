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
      bg: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900',
      icon: ShieldAlert,
      label: 'Critical Risk',
      dot: 'bg-rose-500',
    },
    High: {
      bg: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900',
      icon: AlertTriangle,
      label: 'High Risk',
      dot: 'bg-amber-500',
    },
    Medium: {
      bg: 'bg-yellow-50 text-yellow-800 border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-300 dark:border-yellow-900',
      icon: AlertCircle,
      label: 'Medium Risk',
      dot: 'bg-yellow-500',
    },
    Low: {
      bg: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900',
      icon: ShieldCheck,
      label: 'Low Risk',
      dot: 'bg-emerald-500',
    },
    Safe: {
      bg: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900',
      icon: ShieldCheck,
      label: 'Protected / Safe',
      dot: 'bg-blue-500',
    },
  }[level] || {
    bg: 'bg-slate-100 text-slate-700 border-slate-200',
    icon: AlertCircle,
    label: level,
    dot: 'bg-slate-400',
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
