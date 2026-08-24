import type { LucideIcon } from 'lucide-react';
import { Button } from './Button';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  actionLabel, 
  onAction,
  className = ''
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center p-12 text-center bg-white rounded-lg border border-border-subtle border-dashed ${className}`}>
      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-neutral-100 text-neutral-500 mb-4">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-lg font-medium text-text-main mb-1">{title}</h3>
      <p className="text-sm text-text-muted max-w-sm mb-6">{description}</p>
      
      {actionLabel && onAction && (
        <Button variant="primary" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
