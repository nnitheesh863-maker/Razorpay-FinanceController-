// src/components/ui/SeverityBadge.tsx
import { Badge } from './Badge';
import type { BadgeVariant } from './Badge';
import { AlertTriangle, OctagonAlert, XCircle } from 'lucide-react';

export type ExceptionSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

interface SeverityBadgeProps {
  severity: ExceptionSeverity;
  className?: string;
}

export function SeverityBadge({ severity, className = '' }: SeverityBadgeProps) {
  let variant: BadgeVariant = 'neutral';
  let Icon = XCircle; // fallback

  switch (severity) {
    case 'LOW':
      variant = 'success';
      Icon = XCircle;
      break;
    case 'MEDIUM':
      variant = 'info';
      Icon = AlertTriangle;
      break;
    case 'HIGH':
      variant = 'warning';
      Icon = AlertTriangle;
      break;
    case 'CRITICAL':
      variant = 'danger';
      Icon = OctagonAlert;
      break;
  }

  return (
    <Badge variant={variant} className={`gap-1.5 ${className}`}> 
      <Icon className="w-3.5 h-3.5" />
      <span>{severity}</span>
    </Badge>
  );
}
