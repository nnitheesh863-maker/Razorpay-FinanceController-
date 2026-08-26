import { Badge } from './Badge';
import type { BadgeVariant } from './Badge';
import { 
  CheckCircle2, 
  AlertCircle, 
  XCircle, 
  Clock, 
  HelpCircle,
  Copy,
  Info
} from 'lucide-react';

export type FinanceStatus = 
  | 'MATCHED'
  | 'RECONCILED'
  | 'REVIEW_REQUIRED'
  | 'PENDING'
  | 'UNMATCHED'
  | 'FAILED'
  | 'DUPLICATE'
  | 'OPEN'
  | 'IN_REVIEW'
  | 'UNDER_REVIEW'
  | 'RESOLVED'
  | 'IGNORED'
  | 'COMPLETED'
  | 'RUNNING'
  | 'PARTIAL'
  | 'CANCELLED'
  | 'PARTIAL_MATCH'
  | 'EXCEPTION';

interface StatusBadgeProps {
  status: FinanceStatus;
  className?: string;
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  let variant: BadgeVariant = 'neutral';
  let Icon = HelpCircle;
  let label = status.replace('_', ' ');

  switch (status) {
    case 'MATCHED':
    case 'RECONCILED':
    case 'RESOLVED':
    case 'COMPLETED':
      variant = 'success';
      Icon = CheckCircle2;
      break;
    case 'REVIEW_REQUIRED':
    case 'OPEN':
    case 'PENDING':
    case 'PARTIAL':
    case 'PARTIAL_MATCH':
      variant = 'warning';
      Icon = AlertCircle;
      break;
    case 'UNMATCHED':
    case 'FAILED':
    case 'EXCEPTION':
      variant = 'danger';
      Icon = XCircle;
      break;
    case 'DUPLICATE':
      variant = 'danger';
      Icon = Copy;
      break;
    case 'IN_REVIEW':
    case 'UNDER_REVIEW':
    case 'RUNNING':
      variant = 'info';
      Icon = Clock;
      break;
    case 'IGNORED':
    case 'CANCELLED':
      variant = 'neutral';
      Icon = Info;
      break;
  }

  return (
    <Badge variant={variant} className={`gap-1.5 pr-3 ${className}`}>
      <Icon className="w-3.5 h-3.5" />
      <span>{label}</span>
    </Badge>
  );
}
