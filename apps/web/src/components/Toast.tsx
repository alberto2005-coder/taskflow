import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const containerClasses =
  'pointer-events-auto flex items-start justify-between gap-3 rounded-lg px-4 py-3 text-sm shadow-lg ring-1 ring-black/5';

const typeClasses: Record<ToastType, string> = {
  success: 'bg-emerald-50 text-emerald-900',
  error: 'bg-red-50 text-red-900',
  info: 'bg-slate-800 text-white',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const push = useCallback(
    (type: ToastType, message: string) => {
      const id = nextId.current;
      nextId.current += 1;
      setItems((current) => [...current, { id, type, message }]);
      window.setTimeout(() => dismiss(id), 4500);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (message) => push('success', message),
      error: (message) => push('error', message),
      info: (message) => push('info', message),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(20rem,calc(100vw-2rem))] flex-col gap-2"
      >
        {items.map((item) => (
          <div key={item.id} role="alert" className={cn(containerClasses, typeClasses[item.type])}>
            <span>{item.message}</span>
            <button
              type="button"
              onClick={() => dismiss(item.id)}
              aria-label="Cerrar aviso"
              className="rounded p-0.5 text-base leading-none opacity-60 hover:opacity-100"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast debe usarse dentro de <ToastProvider>');
  return context;
}
