import React from 'react';
import type { InvestigationStatus } from '../types';
import { Clock, Search, ShieldX, CheckCircle2 } from 'lucide-react';

interface StatusBadgeProps {
  status: InvestigationStatus;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-medium',
  };

  const config = {
    New: {
      bg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      icon: Clock,
      label: 'New Intake',
    },
    Investigating: {
      bg: 'bg-amber-50 text-amber-800 border-amber-200',
      icon: Search,
      label: 'Under Investigation',
    },
    'Confirmed Suspicious': {
      bg: 'bg-rose-50 text-rose-800 border-rose-200',
      icon: ShieldX,
      label: 'Confirmed Suspicious',
    },
    Dismissed: {
      bg: 'bg-slate-100 text-slate-700 border-slate-200',
      icon: CheckCircle2,
      label: 'Dismissed / Allowlisted',
    },
  }[status] || {
    bg: 'bg-gray-100 text-gray-700 border-gray-200',
    icon: Clock,
    label: status,
  };

  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center rounded-md border shadow-2xs font-medium tracking-normal ${sizeClasses[size]} ${config.bg}`}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span>{config.label}</span>
    </span>
  );
};
