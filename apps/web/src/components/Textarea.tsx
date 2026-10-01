import { forwardRef } from 'react';
import type { TextareaHTMLAttributes } from 'react';
import { cn } from '../lib/cn';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, hint, id, className, rows = 4, ...rest },
  ref,
) {
  const areaId = id ?? rest.name;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={areaId} className="text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={areaId}
        rows={rows}
        aria-invalid={error ? true : undefined}
        className={cn(
          'w-full rounded-lg border px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
          error ? 'border-red-500 bg-red-50/40' : 'border-slate-300 bg-white',
          className,
        )}
        {...rest}
      />
      {error && <p className="text-xs font-medium text-red-600">{error}</p>}
      {!error && hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
});
