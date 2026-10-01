import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RegisterPage } from './RegisterPage';
import { ToastProvider } from '../../components/Toast';

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/register']}>
        <ToastProvider>
          <RegisterPage />
        </ToastProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

async function fillAndSubmit(values: {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}) {
  await userEvent.type(screen.getByLabelText('Nombre'), values.name);
  await userEvent.type(screen.getByLabelText('Email'), values.email);
  await userEvent.type(screen.getByLabelText('Contraseña'), values.password);
  await userEvent.type(screen.getByLabelText('Repite la contraseña'), values.confirmPassword);
  await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));
}

describe('RegisterPage', () => {
  it('muestra errores si el formulario está vacío', async () => {
    renderPage();

    await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    expect(
      await screen.findByText('El nombre debe tener al menos 2 caracteres'),
    ).toBeInTheDocument();
    expect(await screen.findByText('El email es obligatorio')).toBeInTheDocument();
    expect(
      await screen.findByText('La contraseña debe tener al menos 8 caracteres'),
    ).toBeInTheDocument();
  });

  it('valida la longitud mínima de la contraseña', async () => {
    renderPage();

    await fillAndSubmit({
      name: 'Ana',
      email: 'ana@ejemplo.com',
      password: 'corta',
      confirmPassword: 'corta',
    });

    expect(
      await screen.findByText('La contraseña debe tener al menos 8 caracteres'),
    ).toBeInTheDocument();
  });

  it('detecta contraseñas distintas', async () => {
    renderPage();

    await fillAndSubmit({
      name: 'Ana',
      email: 'ana@ejemplo.com',
      password: 'secreta123',
      confirmPassword: 'distinta123',
    });

    expect(await screen.findByText('Las contraseñas no coinciden')).toBeInTheDocument();
    expect(
      screen.queryByText('La contraseña debe tener al menos 8 caracteres'),
    ).not.toBeInTheDocument();
  });
});
