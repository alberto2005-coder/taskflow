import { forwardRef } from 'react';
import type { SelectHTMLAttributes, ReactNode } from 'react';
import { cn } from '../lib/cn';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  placeholder?: string;
  children: ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, hint, placeholder, id, className, children, ...rest },
  ref,
) {
  const selectId = id ?? rest.name;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={selectId} className="text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      <select
        ref={ref}
        id={selectId}
        aria-invalid={error ? true : undefined}
        className={cn(
          'w-full rounded-lg border px-3 py-2 text-sm text-slate-900',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
          error ? 'border-red-500 bg-red-50/40' : 'border-slate-300 bg-white',
          className,
        )}
        {...rest}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {children}
      </select>
      {error && <p className="text-xs font-medium text-red-600">{error}</p>}
      {!error && hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
});
