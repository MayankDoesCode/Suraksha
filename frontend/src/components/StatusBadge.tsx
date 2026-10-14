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
      bg: 'bg-[#45C8E8]/10 text-[#45C8E8] border-[#45C8E8]/30',
      icon: Clock,
      label: 'New Intake',
    },
    Investigating: {
      bg: 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30',
      icon: Search,
      label: 'Under Investigation',
    },
    'Confirmed Suspicious': {
      bg: 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/30',
      icon: ShieldAlert,
      label: 'Confirmed Incident',
    },
    Dismissed: {
      bg: 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30',
      icon: CheckCircle2,
      label: 'Allowlisted / Benign',
    },
  }[status] || {
    bg: 'bg-[#16253D] text-[#8EA2C6] border-[#1E314F]',
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
