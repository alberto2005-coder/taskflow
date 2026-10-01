import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth-store';
import { LoadingBlock } from '../components/Spinner';

export function ProtectedRoute() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const location = useLocation();

  if (!accessToken) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // Con token pero sin usuario: se está validando con GET /auth/me.
  if (!user) return <LoadingBlock label="Validando sesión…" />;

  return <Outlet />;
}
