import { Card, CardContent } from './Card';
import type { LucideIcon } from 'lucide-react';

interface KpiCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  trend?: {
    value: number;
    label: string;
    isPositive: boolean;
  };
}

export function KpiCard({ title, value, description, icon: Icon, trend }: KpiCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-text-muted mb-1">{title}</p>
            <h3 className="text-3xl font-semibold text-text-main tracking-tight">{value}</h3>
          </div>
          {Icon && (
            <div className="p-2.5 bg-bg-base rounded-md text-text-muted">
              <Icon className="w-5 h-5" />
            </div>
          )}
        </div>
        
        {(description || trend) && (
          <div className="mt-4 flex items-center text-sm">
            {trend && (
              <span className={`font-medium mr-2 ${trend.isPositive ? 'text-success-600' : 'text-danger-600'}`}>
                {trend.isPositive ? '+' : ''}{trend.value}%
              </span>
            )}
            {description && (
              <span className="text-text-muted">{description}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
