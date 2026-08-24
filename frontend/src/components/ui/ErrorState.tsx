import { AlertTriangle } from 'lucide-react';
import { Button } from './Button';

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({ 
  title = 'Unable to load data', 
  description = 'An error occurred while communicating with the server. Please try again.', 
  onRetry,
  className = ''
}: ErrorStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center p-12 text-center bg-white rounded-lg border border-danger-200 bg-danger-50/30 ${className}`}>
      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-danger-100 text-danger-600 mb-4">
        <AlertTriangle className="w-6 h-6" />
      </div>
      <h3 className="text-lg font-medium text-danger-900 mb-1">{title}</h3>
      <p className="text-sm text-danger-700/80 max-w-sm mb-6">{description}</p>
      
      {onRetry && (
        <Button variant="outline" onClick={onRetry} className="bg-white">
          Retry
        </Button>
      )}
    </div>
  );
}
