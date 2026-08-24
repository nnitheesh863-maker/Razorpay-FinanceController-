import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
}

export function Modal({ 
  isOpen, 
  onClose, 
  title, 
  description, 
  children, 
  footer,
  maxWidth = 'md'
}: ModalProps) {
  
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    full: 'max-w-[calc(100%-2rem)]'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      
      <div 
        className={`relative w-full ${maxWidthClasses[maxWidth]} m-4 bg-white rounded-lg shadow-lg border border-border-subtle flex flex-col max-h-[calc(100vh-2rem)]`}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between px-6 py-4 border-b border-border-subtle shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-text-main leading-tight">{title}</h2>
            {description && (
              <p className="mt-1.5 text-sm text-text-muted">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 transition-colors p-1 -mr-2 rounded-md hover:bg-neutral-100"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto">
          {children}
        </div>
        
        {footer && (
          <div className="px-6 py-4 border-t border-border-subtle bg-bg-base/50 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
