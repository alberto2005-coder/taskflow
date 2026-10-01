import { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { queryClient } from './lib/query-client';
import { apiFetch } from './lib/api';
import { useAuthStore } from './store/auth-store';
import { AppRoutes } from './routes';
import { ToastProvider } from './components/Toast';
import type { UserPublic } from './lib/api-types';

/** Al arrancar valida la sesión persistida con `GET /auth/me`. */
function useSessionBootstrap(): void {
  const accessToken = useAuthStore((state) => state.accessToken);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;

    apiFetch<UserPublic>('/auth/me')
      .then((user) => {
        if (!cancelled) useAuthStore.getState().setUser(user);
      })
      .catch(() => {
        if (!cancelled) useAuthStore.getState().clear();
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken]);
}

export function App() {
  useSessionBootstrap();

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
}
