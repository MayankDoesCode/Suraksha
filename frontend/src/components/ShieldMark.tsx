import React from 'react';
import { SurakshaLogo } from './SurakshaLogo';

interface ShieldMarkProps {
  size?: number;
  /** Draw outline and pulse core. Static when false. */
  animate?: boolean;
  className?: string;
}

/**
 * SURAKSHA Shield Mark
 * Re-exports the high-precision SurakshaLogo mark for backward compatibility.
 */
export const ShieldMark: React.FC<ShieldMarkProps> = ({ size = 44, animate = true, className = '' }) => (
  <SurakshaLogo size={size} animate={animate} className={className} variant="mark" />
);

export default ShieldMark;
