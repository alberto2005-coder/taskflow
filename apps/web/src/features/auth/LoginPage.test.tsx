import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LoginPage } from './LoginPage';
import { ToastProvider } from '../../components/Toast';
import { apiFetch } from '../../lib/api';
import type * as ApiModule from '../../lib/api';
import { useAuthStore } from '../../store/auth-store';
import type { AuthResponse, UserPublic } from '../../lib/api-types';

vi.mock('../../lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof ApiModule>();
  return { ...actual, apiFetch: vi.fn() };
});

const user: UserPublic = {
  id: 'u1',
  name: 'Ana Pérez',
  email: 'ana@ejemplo.com',
  role: 'MEMBER',
  createdAt: '2026-01-01T00:00:00.000Z',
};

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/login']}>
        <ToastProvider>
          <LoginPage />
        </ToastProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    useAuthStore.getState().clear();
    vi.mocked(apiFetch).mockReset();
  });

  it('muestra errores de validación si el formulario está vacío', async () => {
    renderPage();

    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText('El email es obligatorio')).toBeInTheDocument();
    expect(await screen.findByText('La contraseña es obligatoria')).toBeInTheDocument();
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('rechaza un email inválido', async () => {
    renderPage();

    await userEvent.type(screen.getByLabelText('Email'), 'no-es-un-email');
    await userEvent.type(screen.getByLabelText('Contraseña'), 'secreta123');
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText('Introduce un email válido')).toBeInTheDocument();
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('inicia sesión con credenciales válidas', async () => {
    const session: AuthResponse = { user, accessToken: 'token', refreshToken: 'refresh' };
    vi.mocked(apiFetch).mockResolvedValue(session);

    renderPage();

    await userEvent.type(screen.getByLabelText('Email'), 'ana@ejemplo.com');
    await userEvent.type(screen.getByLabelText('Contraseña'), 'secreta123');
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith(
        '/auth/login',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    await waitFor(() => {
      expect(useAuthStore.getState().accessToken).toBe('token');
      expect(useAuthStore.getState().user).toEqual(user);
    });
  });
});
