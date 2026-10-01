import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { ApiError, apiFetch } from '../../lib/api';
import { queryClient } from '../../lib/query-client';
import { useAuthStore } from '../../store/auth-store';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { useToast } from '../../components/Toast';
import type { AuthResponse } from '../../lib/api-types';

const loginSchema = z.object({
  email: z.string().min(1, 'El email es obligatorio').email('Introduce un email válido'),
  password: z.string().min(1, 'La contraseña es obligatoria'),
});

type LoginValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const setSession = useAuthStore((state) => state.setSession);
  const toast = useToast();
  const [banner, setBanner] = useState<string | null>(null);

  const from = (location.state as { from?: string } | null)?.from ?? '/';

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const loginMutation = useMutation({
    mutationFn: (values: LoginValues) =>
      apiFetch<AuthResponse>('/auth/login', {
        method: 'POST',
        body: { email: values.email, password: values.password },
        skipAuth: true,
      }),
    onSuccess: ({ accessToken, refreshToken, user }) => {
      setSession({ accessToken, refreshToken, user });
      queryClient.clear();
      navigate(from, { replace: true });
    },
    onError: (error: unknown) => {
      const message =
        error instanceof ApiError
          ? error.message
          : 'No se ha podido iniciar sesión. Inténtalo de nuevo.';
      const fields = error instanceof ApiError ? error.fields : undefined;

      if (fields) {
        for (const [field, fieldError] of Object.entries(fields)) {
          if (field === 'email' || field === 'password') {
            setError(field, { message: fieldError });
            return;
          }
        }
      }

      setBanner(message);
      toast.error(message);
    },
  });

  const onSubmit = (values: LoginValues) => {
    setBanner(null);
    loginMutation.mutate(values);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-lg font-bold text-white">
            T
          </span>
          <h1 className="mt-4 text-2xl font-semibold text-slate-900">Inicia sesión</h1>
          <p className="mt-1 text-sm text-slate-500">Accede a tus proyectos y tareas de TaskFlow</p>
        </div>

        {banner && (
          <p role="alert" className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {banner}
          </p>
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="tu@email.com"
            error={errors.email?.message}
            {...register('email')}
          />
          <Input
            label="Contraseña"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            error={errors.password?.message}
            {...register('password')}
          />

          <Button type="submit" loading={isSubmitting || loginMutation.isPending}>
            Entrar
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          ¿Aún no tienes cuenta?{' '}
          <Link to="/register" className="font-medium text-indigo-600 hover:text-indigo-700">
            Regístrate
          </Link>
        </p>
      </div>
    </div>
  );
}
