import type { ReactNode } from 'react';

type BadgeTone = 'gray' | 'green' | 'amber' | 'red' | 'blue' | 'indigo' | 'violet';

const toneClasses: Record<BadgeTone, string> = {
  gray: 'bg-slate-100 text-slate-700',
  green: 'bg-emerald-100 text-emerald-800',
  amber: 'bg-amber-100 text-amber-800',
  red: 'bg-red-100 text-red-800',
  blue: 'bg-sky-100 text-sky-800',
  indigo: 'bg-indigo-100 text-indigo-800',
  violet: 'bg-violet-100 text-violet-800',
};

interface BadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}

export function Badge({ children, tone = 'gray', className }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${toneClasses[tone]} ${className ?? ''}`}
    >
      {children}
    </span>
  );
}
