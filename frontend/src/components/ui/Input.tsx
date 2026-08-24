import React, { forwardRef } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, helperText, id, required, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-text-main mb-1.5">
            {label}
            {required && <span className="text-danger-500 ml-1">*</span>}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={`flex h-10 w-full rounded-md border ${
            error ? 'border-danger-500 focus:ring-danger-500' : 'border-border-default focus:ring-primary-500'
          } bg-white px-3 py-2 text-sm text-text-main file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 transition-shadow ${className}`}
          required={required}
          {...props}
        />
        {error && <p className="mt-1.5 text-sm text-danger-500">{error}</p>}
        {helperText && !error && <p className="mt-1.5 text-sm text-text-muted">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
