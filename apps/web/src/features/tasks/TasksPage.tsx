import { useCallback } from 'react';
import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { ApiError, apiFetch } from '../../lib/api';
import { queryClient } from '../../lib/query-client';
import { useAuthStore } from '../../store/auth-store';
import { canChangeTaskStatus } from '../../lib/permissions';
import { formatDate, taskPriorityLabels, taskStatusLabels } from '../../lib/formatters';
import { TASK_STATUSES } from '../../lib/api-types';
import type { Paginated, Project, Task, TaskStatus, UserPublic } from '../../lib/api-types';
import { Badge } from '../../components/Badge';
import { EmptyState } from '../../components/EmptyState';
import { LoadingBlock } from '../../components/Spinner';
import { PageHeader } from '../../components/PageHeader';
import { Pagination } from '../../components/Pagination';
import { useToast } from '../../components/Toast';
import { TaskFilters } from './TaskFilters';
import type { TaskFilterValues } from './TaskFilters';

const PAGE_SIZE = 20;

const priorityTone = {
  LOW: 'blue',
  MEDIUM: 'amber',
  HIGH: 'red',
} as const;

const statusTone = {
  TODO: 'gray',
  IN_PROGRESS: 'amber',
  DONE: 'green',
} as const;

export function TasksPage() {
  const user = useAuthStore((state) => state.user);
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1);
  const status = searchParams.get('status') ?? '';
  const projectId = searchParams.get('projectId') ?? '';
  const assigneeId = searchParams.get('assigneeId') ?? '';

  const filterValue: TaskFilterValues = { status, projectId, assigneeId };

  const applyFilters = useCallback(
    (patch: Partial<TaskFilterValues>) => {
      setSearchParams((current) => {
        const next = new URLSearchParams(current);
        for (const [key, value] of Object.entries(patch)) {
          if (value) next.set(key, value);
          else next.delete(key);
        }
        next.delete('page');
        return next;
      });
    },
    [setSearchParams],
  );

  const applyPage = useCallback(
    (nextPage: number) => {
      setSearchParams((current) => {
        const params = new URLSearchParams(current);
        if (nextPage > 1) params.set('page', String(nextPage));
        else params.delete('page');
        return params;
      });
    },
    [setSearchParams],
  );

  const taskParams = {
    page,
    limit: PAGE_SIZE,
    status: status || undefined,
    projectId: projectId || undefined,
    assigneeId: assigneeId || undefined,
  };

  const tasksQuery = useQuery({
    queryKey: ['tasks', taskParams],
    queryFn: () => apiFetch<Paginated<Task>>('/tasks', { params: taskParams }),
    placeholderData: keepPreviousData,
  });

  const projectsQuery = useQuery({
    queryKey: ['projects', { filter: true }],
    queryFn: () => apiFetch<Paginated<Project>>('/projects', { params: { page: 1, limit: 100 } }),
  });

  const isAdmin = user?.role === 'ADMIN';

  const usersQuery = useQuery({
    queryKey: ['users-list'],
    queryFn: () => apiFetch<Paginated<UserPublic>>('/users', { params: { page: 1, limit: 100 } }),
    enabled: isAdmin,
  });

  const membersQuery = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => apiFetch<Project>(`/projects/${projectId}`),
    enabled: Boolean(projectId) && !isAdmin,
  });

  const assigneeOptions: UserPublic[] = isAdmin
    ? (usersQuery.data?.items ?? [])
    : (membersQuery.data?.members ?? []);

  const assigneeHint = isAdmin
    ? usersQuery.isLoading
      ? 'Cargando usuarios…'
      : 'No hay usuarios disponibles'
    : projectId
      ? membersQuery.isLoading
        ? 'Cargando miembros…'
        : 'Este proyecto no tiene miembros'
      : 'Selecciona un proyecto para filtrar por responsable';

  const invalidateTasks = () => {
    void queryClient.invalidateQueries({ queryKey: ['tasks'] });
    void queryClient.invalidateQueries({ queryKey: ['project-tasks'] });
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    void queryClient.invalidateQueries({ queryKey: ['projects'] });
  };

  const statusMutation = useMutation({
    mutationFn: ({ task, next }: { task: Task; next: TaskStatus }) =>
      apiFetch<Task>(`/tasks/${task.id}/status`, { method: 'PATCH', body: { status: next } }),
    onSuccess: () => invalidateTasks(),
    onError: (error: unknown) => {
      toast.error(error instanceof ApiError ? error.message : 'No se ha podido cambiar el estado');
    },
  });

  const loading = tasksQuery.isLoading;
  const items = tasksQuery.data?.items ?? [];

  return (
    <div>
      <PageHeader
        title="Tareas"
        description="Filtra y gestiona todas las tareas visibles para ti."
      />

      <TaskFilters
        value={filterValue}
        projects={projectsQuery.data?.items ?? []}
        assigneeOptions={assigneeOptions}
        assigneeHint={assigneeHint}
        onChange={applyFilters}
      />

      <div className="mt-6">
        {loading && <LoadingBlock label="Cargando tareas…" />}

        {tasksQuery.isError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
            <p className="font-medium text-red-700">
              {tasksQuery.error instanceof ApiError
                ? tasksQuery.error.message
                : 'No se han podido cargar las tareas.'}
            </p>
          </div>
        )}

        {!loading && !tasksQuery.isError && items.length === 0 && (
          <EmptyState
            title="No hay tareas con estos filtros"
            description="Cambia los filtros o vuelve a ver todas las tareas."
            action={
              <button
                type="button"
                onClick={() => setSearchParams(new URLSearchParams())}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Limpiar filtros
              </button>
            }
          />
        )}

        {!loading && !tasksQuery.isError && items.length > 0 && (
          <>
            <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              {items.map((task) => {
                const canChange = canChangeTaskStatus(user, task);

                return (
                  <li
                    key={task.id}
                    className="flex flex-wrap items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50"
                  >
                    <span className="min-w-0 flex-1">
                      <Link
                        to={`/tasks/${task.id}`}
                        className="block truncate text-sm font-medium text-slate-800 hover:text-indigo-700"
                      >
                        {task.title}
                      </Link>
                      <span className="text-xs text-slate-400">
                        {task.project.name} ·{' '}
                        {task.assignee ? task.assignee.name : 'Sin responsable'} ·{' '}
                        {formatDate(task.updatedAt)}
                      </span>
                    </span>

                    <Badge tone={priorityTone[task.priority]}>
                      {taskPriorityLabels[task.priority]}
                    </Badge>

                    <span className="text-xs text-slate-400" title="Comentarios">
                      💬 {task.commentsCount}
                    </span>

                    {canChange ? (
                      <select
                        aria-label={`Estado de «${task.title}»`}
                        value={task.status}
                        disabled={statusMutation.isPending}
                        onChange={(event) =>
                          statusMutation.mutate({
                            task,
                            next: event.target.value as TaskStatus,
                          })
                        }
                        className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                      >
                        {TASK_STATUSES.map((value) => (
                          <option key={value} value={value}>
                            {taskStatusLabels[value]}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <Badge tone={statusTone[task.status]}>{taskStatusLabels[task.status]}</Badge>
                    )}
                  </li>
                );
              })}
            </ul>

            <div className="mt-6">
              <Pagination
                page={tasksQuery.data?.meta.page ?? page}
                totalPages={tasksQuery.data?.meta.totalPages ?? 1}
                onPageChange={applyPage}
                summary={`${tasksQuery.data?.meta.total ?? items.length} tareas`}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
