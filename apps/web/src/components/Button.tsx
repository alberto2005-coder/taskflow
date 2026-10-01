import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../lib/cn';
import { Spinner } from './Spinner';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-indigo-600 text-white hover:bg-indigo-700 focus-visible:ring-indigo-500',
  secondary:
    'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus-visible:ring-slate-400',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500',
  ghost: 'text-slate-600 hover:bg-slate-100 focus-visible:ring-slate-400',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
  children: ReactNode;
}

export function Button({
  variant = 'primary',
  loading = false,
  disabled,
  type = 'button',
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium',
        'transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
        'disabled:cursor-not-allowed disabled:opacity-60',
        variantClasses[variant],
        className,
      )}
      {...rest}
    >
      {loading && <Spinner className="h-4 w-4 border-current" label="Cargando" />}
      {children}
    </button>
  );
}
