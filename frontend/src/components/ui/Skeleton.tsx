import React from 'react';

export function Skeleton({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`animate-pulse rounded-md bg-neutral-200/60 ${className}`}
      {...props}
    />
  );
}

export function SkeletonTable({ rows = 5, columns = 4 }: { rows?: number, columns?: number }) {
  return (
    <div className="w-full overflow-hidden rounded-lg border border-border-subtle bg-white">
      <div className="bg-bg-base/50 h-10 border-b border-border-subtle px-4 flex items-center gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={`th-${i}`} className="h-4 w-24" />
        ))}
      </div>
      <div className="divide-y divide-border-subtle">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={`tr-${i}`} className="p-4 flex items-center justify-between gap-4">
            {Array.from({ length: columns }).map((_, j) => (
              <Skeleton key={`td-${i}-${j}`} className={`h-4 ${j === 0 ? 'w-32' : 'w-20'}`} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
