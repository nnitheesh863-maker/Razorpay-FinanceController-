import React from 'react';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  className?: string;
}

export function Tooltip({ content, children, className = '' }: TooltipProps) {
  return (
    <div className={`group relative inline-flex ${className}`}>
      {children}
      <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-neutral-900 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
        {content}
        <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-neutral-900"></div>
      </div>
    </div>
  );
}
