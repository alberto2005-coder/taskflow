import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import { apiFetch, ApiError } from '../../lib/api';
import { queryClient } from '../../lib/query-client';
import { useAuthStore } from '../../store/auth-store';
import { initials, roleLabels } from '../../lib/formatters';
import type { Paginated, Project, Role, UserPublic } from '../../lib/api-types';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Select } from '../../components/Select';
import { Spinner } from '../../components/Spinner';
import { useToast } from '../../components/Toast';

const roleTone: Record<Role, 'indigo' | 'amber' | 'gray'> = {
  ADMIN: 'indigo',
  MANAGER: 'amber',
  MEMBER: 'gray',
};

interface MembersPanelProps {
  project: Project;
  /** ADMIN o MANAGER propietario del proyecto. */
  canManage: boolean;
}

/**
 * Panel de miembros del proyecto.
 *
 * Para **añadir** miembros:
 * - ADMIN → select cargado con `GET /users` (único rol con acceso a ese listado).
 * - MANAGER propietario → campo de ID (no puede listar usuarios).
 * - Resto → deshabilitado con el aviso correspondiente.
 */
export function MembersPanel({ project, canManage }: MembersPanelProps) {
  const currentUser = useAuthStore((state) => state.user);
  const toast = useToast();
  const isAdmin = currentUser?.role === 'ADMIN';
  const memberIds = new Set((project.members ?? []).map((member) => member.id));

  const [selectedUserId, setSelectedUserId] = useState('');
  const [manualUserId, setManualUserId] = useState('');

  const usersQuery = useQuery({
    queryKey: ['users-list'],
    queryFn: () => apiFetch<Paginated<UserPublic>>('/users', { params: { page: 1, limit: 100 } }),
    enabled: isAdmin,
    placeholderData: keepPreviousData,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['project', project.id] });
    void queryClient.invalidateQueries({ queryKey: ['projects'] });
  };

  const addMutation = useMutation({
    mutationFn: (userId: string) =>
      apiFetch<Project>(`/projects/${project.id}/members`, {
        method: 'POST',
        body: { userId },
      }),
    onSuccess: () => {
      toast.success('Miembro añadido al proyecto');
      setSelectedUserId('');
      setManualUserId('');
      invalidate();
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof ApiError
          ? error.message
          : 'No se ha podido añadir al miembro. Comprueba el ID e inténtalo de nuevo.',
      );
    },
  });

  const removeMutation = useMutation({
    mutationFn: (userId: string) =>
      apiFetch<void>(`/projects/${project.id}/members/${userId}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Miembro eliminado del proyecto');
      invalidate();
    },
    onError: (error: unknown) => {
      toast.error(error instanceof ApiError ? error.message : 'No se ha podido quitar al miembro');
    },
  });

  const members = project.members ?? [];
  const availableUsers = (usersQuery.data?.items ?? []).filter((user) => !memberIds.has(user.id));

  const handleAdd = (userId: string) => {
    const trimmed = userId.trim();
    if (!trimmed) return;
    addMutation.mutate(trimmed);
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">Miembros</h2>
        <Badge tone="gray">{members.length}</Badge>
      </div>

      {members.length === 0 ? (
        <p className="text-sm text-slate-500">Este proyecto aún no tiene miembros.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {members.map((member) => (
            <li key={member.id} className="flex flex-wrap items-center gap-3 py-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700">
                {initials(member.name)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-slate-800">
                  {member.name}
                </span>
                <span className="block truncate text-xs text-slate-500">{member.email}</span>
              </span>
              <Badge tone={roleTone[member.role]}>{roleLabels[member.role]}</Badge>
              {canManage && (
                <Button
                  variant="ghost"
                  disabled={removeMutation.isPending || member.id === project.owner.id}
                  title={
                    member.id === project.owner.id
                      ? 'No se puede quitar al propietario del proyecto'
                      : `Quitar a ${member.name}`
                  }
                  onClick={() => removeMutation.mutate(member.id)}
                >
                  Quitar
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-5 border-t border-slate-100 pt-4">
        <h3 className="text-sm font-semibold text-slate-700">Añadir miembros</h3>

        {!canManage && (
          <p className="mt-2 text-sm text-slate-500">
            Solo los administradores pueden añadir miembros.
          </p>
        )}

        {canManage && isAdmin && (
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Select
                label="Usuario"
                value={selectedUserId}
                placeholder={
                  usersQuery.isLoading
                    ? 'Cargando usuarios…'
                    : availableUsers.length === 0
                      ? 'No hay usuarios disponibles'
                      : 'Selecciona un usuario'
                }
                disabled={usersQuery.isLoading || availableUsers.length === 0}
                onChange={(event) => setSelectedUserId(event.target.value)}
              >
                {availableUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </option>
                ))}
              </Select>
            </div>
            <Button
              disabled={!selectedUserId}
              loading={addMutation.isPending}
              onClick={() => handleAdd(selectedUserId)}
            >
              Añadir
            </Button>
          </div>
        )}

        {canManage && !isAdmin && (
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Input
                label="ID del usuario"
                placeholder="clx…"
                hint="Solo los administradores pueden buscar usuarios por nombre."
                value={manualUserId}
                onChange={(event) => setManualUserId(event.target.value)}
              />
            </div>
            <Button
              disabled={!manualUserId.trim()}
              loading={addMutation.isPending}
              onClick={() => handleAdd(manualUserId)}
            >
              Añadir
            </Button>
          </div>
        )}

        {canManage && isAdmin && usersQuery.isLoading && (
          <div className="mt-3 flex items-center gap-2 text-sm text-slate-500">
            <Spinner className="h-4 w-4" /> Cargando usuarios…
          </div>
        )}
      </div>
    </section>
  );
}
