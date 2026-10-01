import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ApiError, apiFetch } from '../../lib/api';
import { queryClient } from '../../lib/query-client';
import { useAuthStore } from '../../store/auth-store';
import { canChangeTaskStatus, canCreateTask, canManageProject } from '../../lib/permissions';
import { formatDate, projectStatusLabels, roleLabels } from '../../lib/formatters';
import type { Paginated, Project, ProjectStatus, Task, TaskStatus } from '../../lib/api-types';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { LoadingBlock } from '../../components/Spinner';
import { PageHeader } from '../../components/PageHeader';
import { useToast } from '../../components/Toast';
import { CreateProjectModal } from './CreateProjectModal';
import { MembersPanel } from './MembersPanel';
import { CreateTaskModal } from '../tasks/CreateTaskModal';
import { TaskBoard } from '../tasks/TaskBoard';

export function ProjectDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const toast = useToast();

  const [editOpen, setEditOpen] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);

  const projectQuery = useQuery({
    queryKey: ['project', id],
    queryFn: () => apiFetch<Project>(`/projects/${id}`),
    enabled: Boolean(id),
  });

  const tasksQuery = useQuery({
    queryKey: ['project-tasks', id],
    queryFn: () => apiFetch<Paginated<Task>>('/tasks', { params: { projectId: id, limit: 100 } }),
    enabled: Boolean(id),
  });

  const project = projectQuery.data;
  const canManage = canManageProject(user, project);

  const invalidateBoard = () => {
    void queryClient.invalidateQueries({ queryKey: ['project-tasks', id] });
    void queryClient.invalidateQueries({ queryKey: ['tasks'] });
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    void queryClient.invalidateQueries({ queryKey: ['projects'] });
  };

  const statusMutation = useMutation({
    mutationFn: ({ task, status }: { task: Task; status: TaskStatus }) =>
      apiFetch<Task>(`/tasks/${task.id}/status`, { method: 'PATCH', body: { status } }),
    onSuccess: () => invalidateBoard(),
    onError: (error: unknown) => {
      toast.error(error instanceof ApiError ? error.message : 'No se ha podido cambiar el estado');
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (status: ProjectStatus) =>
      apiFetch<Project>(`/projects/${id}`, { method: 'PATCH', body: { status } }),
    onSuccess: (updated) => {
      toast.success(updated.status === 'ARCHIVED' ? 'Proyecto archivado' : 'Proyecto reactivado');
      void queryClient.invalidateQueries({ queryKey: ['project', id] });
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof ApiError ? error.message : 'No se ha podido actualizar el estado',
      );
    },
  });

  if (projectQuery.isLoading) return <LoadingBlock label="Cargando proyecto…" />;

  if (projectQuery.isError || !project) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="font-medium text-red-700">
          {projectQuery.error instanceof ApiError
            ? projectQuery.error.message
            : 'No se ha podido cargar el proyecto.'}
        </p>
        <Link
          to="/projects"
          className="mt-4 inline-block rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50"
        >
          Volver a proyectos
        </Link>
      </div>
    );
  }

  const tasks = tasksQuery.data?.items ?? [];

  return (
    <div>
      <Link to="/projects" className="text-sm font-medium text-slate-500 hover:text-slate-800">
        ← Volver a proyectos
      </Link>

      <PageHeader
        title={project.name}
        description={project.description?.trim() || 'Sin descripción'}
        actions={
          canManage && (
            <>
              <Button variant="secondary" onClick={() => setEditOpen(true)}>
                Editar
              </Button>
              <Button
                variant="secondary"
                loading={archiveMutation.isPending}
                onClick={() =>
                  archiveMutation.mutate(project.status === 'ACTIVE' ? 'ARCHIVED' : 'ACTIVE')
                }
              >
                {project.status === 'ACTIVE' ? 'Archivar' : 'Reactivar'}
              </Button>
            </>
          )
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500">
        <Badge tone={project.status === 'ACTIVE' ? 'green' : 'gray'}>
          {projectStatusLabels[project.status]}
        </Badge>
        <span>
          Propietario: <strong className="font-medium text-slate-700">{project.owner.name}</strong>{' '}
          ({roleLabels[project.owner.role]})
        </span>
        <span>Creado: {formatDate(project.createdAt)}</span>
        <span>Actualizado: {formatDate(project.updatedAt)}</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <MembersPanel project={project} canManage={canManage} />
        </div>

        <div className="lg:col-span-2">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900">Tablero</h2>
            {canCreateTask(user, project) && (
              <Button onClick={() => setTaskModalOpen(true)}>Nueva tarea</Button>
            )}
          </div>

          {tasksQuery.isLoading && <LoadingBlock label="Cargando tareas…" />}

          {tasksQuery.isError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
              <p className="font-medium text-red-700">
                {tasksQuery.error instanceof ApiError
                  ? tasksQuery.error.message
                  : 'No se han podido cargar las tareas.'}
              </p>
            </div>
          )}

          {!tasksQuery.isLoading && !tasksQuery.isError && tasks.length === 0 && (
            <EmptyState
              title="Este proyecto aún no tiene tareas"
              description="Crea la primera tarea para empezar a trabajar en el tablero."
              action={
                canCreateTask(user, project) ? (
                  <Button onClick={() => setTaskModalOpen(true)}>Nueva tarea</Button>
                ) : null
              }
            />
          )}

          {!tasksQuery.isLoading && !tasksQuery.isError && tasks.length > 0 && (
            <TaskBoard
              tasks={tasks}
              canMoveTask={(task) => canChangeTaskStatus(user, task)}
              onSelect={(task) => navigate(`/tasks/${task.id}`)}
              onStatusChange={(task, status) => statusMutation.mutate({ task, status })}
            />
          )}
        </div>
      </div>

      <CreateProjectModal open={editOpen} onClose={() => setEditOpen(false)} project={project} />

      <CreateTaskModal
        open={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        projectId={project.id}
        members={project.members ?? []}
      />
    </div>
  );
}
