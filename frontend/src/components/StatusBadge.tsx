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
      bg: 'bg-[#1265F8]/15 text-[#00D9FF] border-[#1265F8]/40 shadow-[0_0_8px_rgba(18,101,248,0.2)]',
      icon: Clock,
      label: 'New Intake',
    },
    Investigating: {
      bg: 'bg-[#FFB020]/15 text-[#FFB020] border-[#FFB020]/40 shadow-[0_0_8px_rgba(255,176,32,0.2)]',
      icon: Search,
      label: 'Under Investigation',
    },
    'Confirmed Suspicious': {
      bg: 'bg-[#FF315B]/15 text-[#FF315B] border-[#FF315B]/40 shadow-[0_0_8px_rgba(255,49,91,0.2)]',
      icon: ShieldX,
      label: 'Confirmed Suspicious',
    },
    Dismissed: {
      bg: 'bg-[#00E5A0]/15 text-[#00E5A0] border-[#00E5A0]/40 shadow-[0_0_8px_rgba(0,229,160,0.2)]',
      icon: CheckCircle2,
      label: 'Dismissed / Allowlisted',
    },
  }[status] || {
    bg: 'bg-[#0A1C3D] text-[#91ACD1] border-[#123E78]',
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
