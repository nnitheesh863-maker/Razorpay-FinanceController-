import React from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  breadcrumb?: React.ReactNode;
}

export function PageHeader({ title, description, actions, breadcrumb }: PageHeaderProps) {
  return (
    <div className="mb-8 flex flex-col md:flex-row md:items-start justify-between gap-4">
      <div>
        {breadcrumb && <div className="mb-2">{breadcrumb}</div>}
        <h1 className="text-2xl font-semibold text-text-main tracking-tight">{title}</h1>
        {description && <p className="mt-1.5 text-text-muted">{description}</p>}
      </div>
      {actions && (
        <div className="flex items-center gap-3 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
