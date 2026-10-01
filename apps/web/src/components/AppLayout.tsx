import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/auth-store';
import { roleLabels, initials } from '../lib/formatters';
import { cn } from '../lib/cn';
import { Badge } from './Badge';
import { Button } from './Button';

interface NavItem {
  to: string;
  label: string;
}

export function AppLayout() {
  const user = useAuthStore((state) => state.user);
  const clear = useAuthStore((state) => state.clear);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const items: NavItem[] = [
    { to: '/', label: 'Inicio' },
    { to: '/projects', label: 'Proyectos' },
    { to: '/tasks', label: 'Tareas' },
  ];
  if (user?.role === 'ADMIN') items.push({ to: '/admin/users', label: 'Usuarios' });

  const handleLogout = () => {
    clear();
    queryClient.clear();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
          <NavLink to="/" className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-600 text-sm font-bold text-white">
              T
            </span>
            TaskFlow
          </NavLink>

          <nav className="flex flex-wrap items-center gap-1">
            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  cn(
                    'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            {user && (
              <div className="flex items-center gap-2">
                <span className="hidden text-sm font-medium text-slate-700 sm:inline">
                  {user.name}
                </span>
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700">
                  {initials(user.name)}
                </span>
                <Badge tone="indigo">{roleLabels[user.role]}</Badge>
              </div>
            )}
            <Button variant="secondary" onClick={handleLogout}>
              Cerrar sesión
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-white py-4">
        <p className="mx-auto max-w-6xl px-4 text-center text-xs text-slate-400 sm:text-left">
          TaskFlow — gestor de tareas colaborativo
        </p>
      </footer>
    </div>
  );
}
