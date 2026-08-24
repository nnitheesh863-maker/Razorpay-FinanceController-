import React from 'react';

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({ children, variant = 'neutral', className = '', ...props }: BadgeProps) {
  const variants: Record<BadgeVariant, string> = {
    success: 'bg-success-50 text-success-600 border border-success-200',
    warning: 'bg-warning-50 text-warning-600 border border-warning-200',
    danger: 'bg-danger-50 text-danger-600 border border-danger-200',
    info: 'bg-info-50 text-info-600 border border-info-200',
    neutral: 'bg-neutral-100 text-neutral-600 border border-neutral-200',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
