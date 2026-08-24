import React, { forwardRef } from 'react';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: { label: string; value: string | number }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = '', label, error, helperText, id, required, options, ...props }, ref) => {
    const generatedId = React.useId();
    const selectId = id || generatedId;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={selectId} className="block text-sm font-medium text-text-main mb-1.5">
            {label}
            {required && <span className="text-danger-500 ml-1">*</span>}
          </label>
        )}
        <select
          id={selectId}
          ref={ref}
          className={`flex h-10 w-full rounded-md border ${
            error ? 'border-danger-500 focus:ring-danger-500' : 'border-border-default focus:ring-primary-500'
          } bg-white px-3 py-2 text-sm text-text-main focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 transition-shadow ${className}`}
          required={required}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && <p className="mt-1.5 text-sm text-danger-500">{error}</p>}
        {helperText && !error && <p className="mt-1.5 text-sm text-text-muted">{helperText}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
