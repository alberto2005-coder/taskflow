import type { ReactNode } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth-store';
import { roleLabels } from '../lib/formatters';
import type { Role } from '../lib/api-types';

interface RoleRouteProps {
  roles: Role[];
  children: ReactNode;
}

export function RoleRoute({ roles, children }: RoleRouteProps) {
  const user = useAuthStore((state) => state.user);
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!roles.includes(user.role)) {
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
        <p className="text-4xl font-bold text-indigo-600">403</p>
        <h1 className="mt-3 text-xl font-semibold text-slate-900">
          No tienes permiso para acceder a esta página
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Esta sección está reservada a roles concretos. Tu rol actual es{' '}
          <strong className="font-medium text-slate-700">{roleLabels[user.role]}</strong>.
        </p>
        <Link
          to="/"
          className="mt-6 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Volver al inicio
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
