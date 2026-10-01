import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ApiError, apiFetch } from '../../lib/api';
import {
  formatDate,
  projectStatusLabels,
  taskPriorityLabels,
  taskStatusLabels,
} from '../../lib/formatters';
import type { DashboardData, TaskStatus } from '../../lib/api-types';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { LoadingBlock } from '../../components/Spinner';
import { PageHeader } from '../../components/PageHeader';

const statusTone = {
  TODO: 'gray',
  IN_PROGRESS: 'amber',
  DONE: 'green',
} as const;

const priorityTone = {
  LOW: 'blue',
  MEDIUM: 'amber',
  HIGH: 'red',
} as const;

const progressColor: Record<TaskStatus, string> = {
  TODO: 'bg-slate-400',
  IN_PROGRESS: 'bg-amber-400',
  DONE: 'bg-emerald-500',
};

function StatCard({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-1 text-3xl font-semibold ${className ?? 'text-slate-900'}`}>{value}</p>
    </div>
  );
}

export function DashboardPage() {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => apiFetch<DashboardData>('/dashboard'),
  });

  if (isLoading) return <LoadingBlock label="Cargando tu panel…" />;

  if (isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="font-medium text-red-700">
          {error instanceof ApiError ? error.message : 'No se ha podido cargar el panel.'}
        </p>
        <Button className="mt-4" variant="secondary" onClick={() => void refetch()}>
          Reintentar
        </Button>
      </div>
    );
  }

  if (!data) return null;

  const { myTasks, projects } = data;

  return (
    <div>
      <PageHeader
        title="Panel general"
        description="Resumen de tus tareas y proyectos."
        actions={
          <Button variant="secondary" loading={isFetching} onClick={() => void refetch()}>
            Actualizar
          </Button>
        }
      />

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Mis tareas" value={myTasks.total} />
        <StatCard label="Por hacer" value={myTasks.byStatus.TODO} className="text-slate-600" />
        <StatCard
          label="En curso"
          value={myTasks.byStatus.IN_PROGRESS}
          className="text-amber-600"
        />
        <StatCard label="Hechas" value={myTasks.byStatus.DONE} className="text-emerald-600" />
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Mis tareas recientes</h2>
        {myTasks.items.length === 0 ? (
          <EmptyState
            title="No tienes tareas asignadas"
            description="Cuando alguien te asigne una tarea aparecerá aquí."
          />
        ) : (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {myTasks.items.map((task) => (
              <li key={task.id}>
                <Link
                  to={`/tasks/${task.id}`}
                  className="flex flex-wrap items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50"
                >
                  <span className="flex-1 text-sm font-medium text-slate-800">{task.title}</span>
                  <span className="text-xs text-slate-400">{task.project.name}</span>
                  <Badge tone={priorityTone[task.priority]}>
                    {taskPriorityLabels[task.priority]}
                  </Badge>
                  <Badge tone={statusTone[task.status]}>{taskStatusLabels[task.status]}</Badge>
                  <span className="text-xs text-slate-400">{formatDate(task.updatedAt)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {projects !== null && (
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-semibold text-slate-900">Proyectos y progreso</h2>
          {projects.length === 0 ? (
            <EmptyState
              title="Todavía no hay proyectos"
              description="Crea un proyecto desde la sección de Proyectos."
              action={
                <Link
                  to="/projects"
                  className="inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  Ir a proyectos
                </Link>
              }
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => {
                const total =
                  project.progress.TODO + project.progress.IN_PROGRESS + project.progress.DONE;
                const share = (value: number) => (total > 0 ? (value / total) * 100 : 0);

                return (
                  <Link
                    key={project.id}
                    to={`/projects/${project.id}`}
                    className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-medium text-slate-900">{project.name}</h3>
                      <Badge tone={project.status === 'ACTIVE' ? 'green' : 'gray'}>
                        {projectStatusLabels[project.status]}
                      </Badge>
                    </div>

                    <div className="mt-3 flex h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        style={{ width: `${share(project.progress.TODO)}%` }}
                        className={progressColor.TODO}
                      />
                      <div
                        style={{ width: `${share(project.progress.IN_PROGRESS)}%` }}
                        className={progressColor.IN_PROGRESS}
                      />
                      <div
                        style={{ width: `${share(project.progress.DONE)}%` }}
                        className={progressColor.DONE}
                      />
                    </div>

                    <dl className="mt-3 grid grid-cols-3 gap-2 text-center text-xs text-slate-500">
                      <div>
                        <dt>Por hacer</dt>
                        <dd className="text-sm font-semibold text-slate-700">
                          {project.progress.TODO}
                        </dd>
                      </div>
                      <div>
                        <dt>En curso</dt>
                        <dd className="text-sm font-semibold text-amber-600">
                          {project.progress.IN_PROGRESS}
                        </dd>
                      </div>
                      <div>
                        <dt>Hechas</dt>
                        <dd className="text-sm font-semibold text-emerald-600">
                          {project.progress.DONE}
                        </dd>
                      </div>
                    </dl>

                    <p className="mt-3 text-xs text-slate-400">
                      {project.membersCount} miembros · {project.tasksCount} tareas
                    </p>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
