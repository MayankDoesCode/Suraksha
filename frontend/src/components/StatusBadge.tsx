import React from 'react';
import type { InvestigationStatus } from '../types';
import { Clock, Search, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface StatusBadgeProps {
  status: InvestigationStatus;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 gap-1 font-mono font-medium',
    md: 'text-xs px-2.5 py-0.5 gap-1.5 font-mono font-medium',
  };

  const config = {
    New: {
      bg: 'bg-accent/10 text-accent border-accent/30',
      icon: Clock,
      label: 'New Intake',
    },
    Investigating: {
      bg: 'bg-warn/10 text-warn border-warn/30',
      icon: Search,
      label: 'Under Investigation',
    },
    'Confirmed Suspicious': {
      bg: 'bg-danger/10 text-danger border-danger/30',
      icon: ShieldAlert,
      label: 'Confirmed Incident',
    },
    Dismissed: {
      bg: 'bg-ok/10 text-ok border-ok/30',
      icon: CheckCircle2,
      label: 'Allowlisted / Benign',
    },
  }[status] || {
    bg: 'bg-surface3 text-fgMuted border-line',
    icon: Clock,
    label: status,
  };

  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center rounded-md border tracking-tight ${sizeClasses[size]} ${config.bg}`}
    >
      <Icon className="w-3.5 h-3.5 shrink-0 opacity-85" />
      <span>{config.label}</span>
    </span>
  );
};
