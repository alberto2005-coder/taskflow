import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import { ApiError, apiFetch } from '../../lib/api';
import { queryClient } from '../../lib/query-client';
import { useAuthStore } from '../../store/auth-store';
import { useDebounce } from '../../hooks/useDebounce';
import { formatDate, roleLabels } from '../../lib/formatters';
import { ROLES } from '../../lib/api-types';
import type { Paginated, Role, UserPublic } from '../../lib/api-types';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { Input } from '../../components/Input';
import { LoadingBlock } from '../../components/Spinner';
import { Modal } from '../../components/Modal';
import { PageHeader } from '../../components/PageHeader';
import { Pagination } from '../../components/Pagination';
import { Select } from '../../components/Select';
import { useToast } from '../../components/Toast';

const PAGE_SIZE = 20;

const roleTone: Record<Role, 'indigo' | 'amber' | 'gray'> = {
  ADMIN: 'indigo',
  MANAGER: 'amber',
  MEMBER: 'gray',
};

type PendingAction =
  | { type: 'role'; userId: string; userName: string; role: Role }
  | { type: 'delete'; userId: string; userName: string };

export function UsersPage() {
  const currentUser = useAuthStore((state) => state.user);
  const toast = useToast();

  const [searchInput, setSearchInput] = useState('');
  const [role, setRole] = useState<'' | Role>('');
  const [page, setPage] = useState(1);
  const [pending, setPending] = useState<PendingAction | null>(null);

  const search = useDebounce(searchInput, 300);

  const params = {
    page,
    limit: PAGE_SIZE,
    search: search.trim() || undefined,
    role: role || undefined,
  };

  const usersQuery = useQuery({
    queryKey: ['users', params],
    queryFn: () => apiFetch<Paginated<UserPublic>>('/users', { params }),
    placeholderData: keepPreviousData,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['users'] });
  };

  const roleMutation = useMutation({
    mutationFn: ({ userId, nextRole }: { userId: string; nextRole: Role }) =>
      apiFetch<UserPublic>(`/users/${userId}/role`, { method: 'PATCH', body: { role: nextRole } }),
    onSuccess: () => {
      toast.success('Rol actualizado');
      invalidate();
      setPending(null);
    },
    onError: (error: unknown) => {
      toast.error(error instanceof ApiError ? error.message : 'No se ha podido cambiar el rol');
      setPending(null);
      invalidate();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (userId: string) => apiFetch<void>(`/users/${userId}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Usuario eliminado');
      invalidate();
      setPending(null);
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof ApiError ? error.message : 'No se ha podido eliminar al usuario',
      );
      setPending(null);
    },
  });

  const handleRoleChange = (user: UserPublic, nextRole: Role) => {
    if (nextRole === user.role) return;
    setPending({ type: 'role', userId: user.id, userName: user.name, role: nextRole });
  };

  const confirm = () => {
    if (!pending) return;
    if (pending.type === 'role') {
      roleMutation.mutate({ userId: pending.userId, nextRole: pending.role });
    } else {
      deleteMutation.mutate(pending.userId);
    }
  };

  const items = usersQuery.data?.items ?? [];
  const isSelf = (userId: string) => userId === currentUser?.id;

  return (
    <div>
      <PageHeader
        title="Usuarios"
        description="Gestiona usuarios, roles y accesos de la plataforma."
      />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="sm:max-w-xs sm:flex-1">
          <Input
            label="Buscar"
            type="search"
            placeholder="Buscar por nombre o email…"
            value={searchInput}
            onChange={(event) => {
              setSearchInput(event.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="sm:w-48">
          <Select
            label="Rol"
            value={role}
            placeholder="Todos los roles"
            onChange={(event) => {
              setRole(event.target.value as '' | Role);
              setPage(1);
            }}
          >
            {ROLES.map((value) => (
              <option key={value} value={value}>
                {roleLabels[value]}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {usersQuery.isLoading && <LoadingBlock label="Cargando usuarios…" />}

      {usersQuery.isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="font-medium text-red-700">
            {usersQuery.error instanceof ApiError
              ? usersQuery.error.message
              : 'No se han podido cargar los usuarios.'}
          </p>
        </div>
      )}

      {!usersQuery.isLoading && !usersQuery.isError && items.length === 0 && (
        <EmptyState
          title="No hay usuarios que coincidan"
          description="Prueba con otra búsqueda o cambia el filtro de rol."
        />
      )}

      {!usersQuery.isLoading && !usersQuery.isError && items.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full min-w-[46rem] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Usuario</th>
                  <th className="px-4 py-3 font-medium">Alta</th>
                  <th className="px-4 py-3 font-medium">Rol</th>
                  <th className="px-4 py-3 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">
                        {user.name}
                        {isSelf(user.id) && (
                          <span className="ml-2 text-xs font-normal text-slate-400">(tú)</span>
                        )}
                      </p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(user.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Badge tone={roleTone[user.role]}>{roleLabels[user.role]}</Badge>
                        <select
                          aria-label={`Rol de ${user.name}`}
                          value={user.role}
                          disabled={roleMutation.isPending}
                          onChange={(event) => handleRoleChange(user, event.target.value as Role)}
                          className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                        >
                          {ROLES.map((value) => (
                            <option key={value} value={value}>
                              {roleLabels[value]}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="danger"
                        disabled={isSelf(user.id)}
                        title={
                          isSelf(user.id)
                            ? 'No puedes eliminarte a ti mismo'
                            : `Eliminar a ${user.name}`
                        }
                        onClick={() =>
                          setPending({ type: 'delete', userId: user.id, userName: user.name })
                        }
                      >
                        Eliminar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6">
            <Pagination
              page={usersQuery.data?.meta.page ?? page}
              totalPages={usersQuery.data?.meta.totalPages ?? 1}
              onPageChange={setPage}
              summary={`${usersQuery.data?.meta.total ?? items.length} usuarios`}
            />
          </div>
        </>
      )}

      <Modal
        open={pending !== null}
        onClose={() => setPending(null)}
        title={pending?.type === 'delete' ? 'Eliminar usuario' : 'Cambiar rol'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setPending(null)}>
              Cancelar
            </Button>
            <Button
              variant={pending?.type === 'delete' ? 'danger' : 'primary'}
              loading={roleMutation.isPending || deleteMutation.isPending}
              onClick={confirm}
            >
              {pending?.type === 'delete' ? 'Eliminar' : 'Confirmar'}
            </Button>
          </>
        }
      >
        {pending?.type === 'delete' && (
          <p className="text-sm text-slate-600">
            ¿Seguro que quieres eliminar a <strong>{pending.userName}</strong>? Esta acción no se
            puede deshacer.
          </p>
        )}
        {pending?.type === 'role' && (
          <p className="text-sm text-slate-600">
            ¿Cambiar el rol de <strong>{pending.userName}</strong> a{' '}
            <strong>{roleLabels[pending.role]}</strong>?
          </p>
        )}
      </Modal>
    </div>
  );
}
