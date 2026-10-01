import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserPublic } from '../lib/api-types';

interface Session {
  accessToken: string;
  refreshToken: string;
  user: UserPublic;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: UserPublic | null;
  /** Guarda la sesión completa (login / registro). */
  setSession: (session: Session) => void;
  /** Actualiza solo los tokens (tras un refresh silencioso). */
  setTokens: (accessToken: string, refreshToken: string) => void;
  /** Actualiza el usuario (respuesta de `GET /auth/me`). */
  setUser: (user: UserPublic) => void;
  clear: () => void;
}

const initialSession = {
  accessToken: null,
  refreshToken: null,
  user: null,
} satisfies Partial<AuthState>;

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      ...initialSession,
      setSession: ({ accessToken, refreshToken, user }) => set({ accessToken, refreshToken, user }),
      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
      setUser: (user) => set({ user }),
      clear: () => set({ accessToken: null, refreshToken: null, user: null }),
    }),
    {
      name: 'taskflow-auth',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
      }),
    },
  ),
);
