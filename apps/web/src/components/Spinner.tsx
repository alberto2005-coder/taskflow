import { cn } from '../lib/cn';

interface SpinnerProps {
  className?: string;
  label?: string;
}

export function Spinner({ className = 'h-5 w-5', label = 'Cargando' }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cn(
        'inline-block animate-spin rounded-full border-2 border-slate-300 border-t-slate-700',
        className,
      )}
    />
  );
}

export function LoadingBlock({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-500">
      <Spinner className="h-8 w-8" label={label} />
      <p className="text-sm">{label}</p>
    </div>
  );
}
