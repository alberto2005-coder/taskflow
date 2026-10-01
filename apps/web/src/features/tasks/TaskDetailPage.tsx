import { useState } from 'react';
import type { FormEvent } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { ApiError, apiFetch } from '../../lib/api';
import { queryClient } from '../../lib/query-client';
import { useAuthStore } from '../../store/auth-store';
import { canChangeTaskStatus, canManageProject } from '../../lib/permissions';
import {
  formatDate,
  formatDateTime,
  initials,
  taskPriorityLabels,
  taskStatusLabels,
} from '../../lib/formatters';
import { TASK_PRIORITIES, TASK_STATUSES } from '../../lib/api-types';
import type { Comment, Project, Task, TaskStatus, UserPublic } from '../../lib/api-types';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { LoadingBlock } from '../../components/Spinner';
import { Modal } from '../../components/Modal';
import { PageHeader } from '../../components/PageHeader';
import { Select } from '../../components/Select';
import { Textarea } from '../../components/Textarea';
import { Input } from '../../components/Input';
import { useToast } from '../../components/Toast';

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

const editSchema = z.object({
  title: z.string().min(3, 'El título debe tener al menos 3 caracteres'),
  description: z.string().max(2000, 'La descripción no puede superar los 2000 caracteres'),
  priority: z.enum(TASK_PRIORITIES),
  assigneeId: z.string(),
});

type EditValues = z.infer<typeof editSchema>;

interface EditTaskFormProps {
  task: Task;
  members: UserPublic[];
}

function EditTaskForm({ task, members }: EditTaskFormProps) {
  const toast = useToast();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isDirty },
  } = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      title: task.title,
      description: task.description ?? '',
      priority: task.priority,
      assigneeId: task.assignee?.id ?? '',
    },
  });

  const mutation = useMutation({
    mutationFn: (values: EditValues) =>
      apiFetch<Task>(`/tasks/${task.id}`, {
        method: 'PATCH',
        body: {
          title: values.title,
          description: values.description,
          priority: values.priority,
          assigneeId: values.assigneeId || null,
        },
      }),
    onSuccess: () => {
      toast.success('Tarea actualizada');
      void queryClient.invalidateQueries({ queryKey: ['task', task.id] });
      void queryClient.invalidateQueries({ queryKey: ['tasks'] });
      void queryClient.invalidateQueries({ queryKey: ['project-tasks', task.project.id] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (error: unknown) => {
      const message = error instanceof ApiError ? error.message : 'No se ha podido guardar';
      if (error instanceof ApiError && error.fields?.title) {
        setError('title', { message: error.fields.title });
        return;
      }
      toast.error(message);
    },
  });

  return (
    <form
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
      noValidate
      className="flex flex-col gap-4"
    >
      <Input label="Título" error={errors.title?.message} {...register('title')} />
      <Textarea
        label="Descripción"
        rows={5}
        error={errors.description?.message}
        {...register('description')}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Select label="Prioridad" {...register('priority')}>
          {TASK_PRIORITIES.map((priority) => (
            <option key={priority} value={priority}>
              {taskPriorityLabels[priority]}
            </option>
          ))}
        </Select>

        <Select
          label="Responsable"
          placeholder="Sin responsable"
          hint={members.length === 0 ? 'Este proyecto aún no tiene miembros.' : undefined}
          {...register('assigneeId')}
        >
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex justify-end">
        <Button type="submit" loading={mutation.isPending} disabled={!isDirty}>
          Guardar cambios
        </Button>
      </div>
    </form>
  );
}

interface CommentFormProps {
  taskId: string;
}

function CommentForm({ taskId }: CommentFormProps) {
  const toast = useToast();
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (value: string) =>
      apiFetch<Comment>(`/tasks/${taskId}/comments`, {
        method: 'POST',
        body: { content: value },
      }),
    onSuccess: () => {
      setContent('');
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ['comments', taskId] });
      void queryClient.invalidateQueries({ queryKey: ['task', taskId] });
    },
    onError: (apiError: unknown) => {
      toast.error(
        apiError instanceof ApiError ? apiError.message : 'No se ha podido publicar el comentario',
      );
    },
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = content.trim();
    if (!value) {
      setError('Escribe un comentario antes de publicarlo.');
      return;
    }
    mutation.mutate(value);
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <Textarea
        label="Añadir comentario"
        placeholder="Escribe aquí tu comentario…"
        value={content}
        error={error ?? undefined}
        onChange={(event) => {
          setContent(event.target.value);
          if (error) setError(null);
        }}
      />
      <div className="flex justify-end">
        <Button type="submit" loading={mutation.isPending}>
          Comentar
        </Button>
      </div>
    </form>
  );
}

export function TaskDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const toast = useToast();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const taskQuery = useQuery({
    queryKey: ['task', id],
    queryFn: () => apiFetch<Task>(`/tasks/${id}`),
    enabled: Boolean(id),
  });

  const task = taskQuery.data;
  const projectId = task?.project.id ?? '';

  const projectQuery = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => apiFetch<Project>(`/projects/${projectId}`),
    enabled: Boolean(projectId),
  });

  const commentsQuery = useQuery({
    queryKey: ['comments', id],
    queryFn: () => apiFetch<Comment[]>(`/tasks/${id}/comments`),
    enabled: Boolean(id),
  });

  const project = projectQuery.data;
  const canManage = canManageProject(user, project);
  const canChange = canChangeTaskStatus(user, task);

  const statusMutation = useMutation({
    mutationFn: (status: TaskStatus) =>
      apiFetch<Task>(`/tasks/${id}/status`, { method: 'PATCH', body: { status } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['task', id] });
      void queryClient.invalidateQueries({ queryKey: ['tasks'] });
      void queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (error: unknown) => {
      toast.error(error instanceof ApiError ? error.message : 'No se ha podido cambiar el estado');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiFetch<void>(`/tasks/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Tarea eliminada');
      void queryClient.invalidateQueries({ queryKey: ['tasks'] });
      void queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId] });
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      navigate(projectId ? `/projects/${projectId}` : '/tasks', { replace: true });
    },
    onError: (error: unknown) => {
      toast.error(error instanceof ApiError ? error.message : 'No se ha podido eliminar la tarea');
      setConfirmDelete(false);
    },
  });

  if (taskQuery.isLoading) return <LoadingBlock label="Cargando tarea…" />;

  if (taskQuery.isError || !task) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="font-medium text-red-700">
          {taskQuery.error instanceof ApiError
            ? taskQuery.error.message
            : 'No se ha podido cargar la tarea.'}
        </p>
        <Link
          to="/tasks"
          className="mt-4 inline-block rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50"
        >
          Volver a tareas
        </Link>
      </div>
    );
  }

  const comments = commentsQuery.data ?? [];

  return (
    <div>
      <Link to="/tasks" className="text-sm font-medium text-slate-500 hover:text-slate-800">
        ← Volver a tareas
      </Link>

      <PageHeader
        title={task.title}
        description={`Proyecto ${task.project.name} · creada el ${formatDate(task.createdAt)}`}
        actions={
          canManage && (
            <Button
              variant="danger"
              loading={deleteMutation.isPending}
              onClick={() => setConfirmDelete(true)}
            >
              Eliminar tarea
            </Button>
          )
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <Badge tone={priorityTone[task.priority]}>{taskPriorityLabels[task.priority]}</Badge>
              <Badge tone={statusTone[task.status]}>{taskStatusLabels[task.status]}</Badge>
              <span className="text-xs text-slate-400">
                Actualizada {formatDateTime(task.updatedAt)}
              </span>

              {canChange && (
                <label className="ml-auto flex items-center gap-2 text-sm text-slate-600">
                  <span>Estado</span>
                  <select
                    aria-label="Cambiar estado de la tarea"
                    value={task.status}
                    disabled={statusMutation.isPending}
                    onChange={(event) => statusMutation.mutate(event.target.value as TaskStatus)}
                    className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  >
                    {TASK_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {taskStatusLabels[status]}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>

            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
              Descripción
            </h2>
            <p className="whitespace-pre-wrap text-sm text-slate-700">
              {task.description?.trim() || 'Sin descripción.'}
            </p>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Comentarios</h2>

            {commentsQuery.isLoading && <LoadingBlock label="Cargando comentarios…" />}

            {commentsQuery.isError && (
              <p className="text-sm text-red-600">No se han podido cargar los comentarios.</p>
            )}

            {!commentsQuery.isLoading && comments.length === 0 && (
              <EmptyState
                title="Todavía no hay comentarios"
                description="Sé el primero en comentar."
              />
            )}

            {comments.length > 0 && (
              <ul className="mb-6 divide-y divide-slate-100">
                {comments.map((comment) => (
                  <li key={comment.id} className="flex gap-3 py-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700">
                      {initials(comment.author.name)}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm">
                        <strong className="font-medium text-slate-800">
                          {comment.author.name}
                        </strong>{' '}
                        <span className="text-xs text-slate-400">
                          {formatDateTime(comment.createdAt)}
                        </span>
                      </p>
                      <p className="whitespace-pre-wrap text-sm text-slate-600">
                        {comment.content}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <CommentForm taskId={task.id} />
          </section>
        </div>

        <div className="flex flex-col gap-6 lg:col-span-1">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Detalles</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Proyecto</dt>
                <dd className="font-medium text-slate-800">
                  <Link to={`/projects/${task.project.id}`} className="hover:text-indigo-700">
                    {task.project.name}
                  </Link>
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Responsable</dt>
                <dd className="font-medium text-slate-800">
                  {task.assignee ? task.assignee.name : 'Sin responsable'}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Comentarios</dt>
                <dd className="font-medium text-slate-800">{task.commentsCount}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Creada</dt>
                <dd className="font-medium text-slate-800">{formatDate(task.createdAt)}</dd>
              </div>
            </dl>
          </section>

          {canManage && (
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">Editar tarea</h2>
              <EditTaskForm task={task} members={project?.members ?? []} />
            </section>
          )}
        </div>
      </div>

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Eliminar tarea"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              loading={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate(undefined)}
            >
              Eliminar
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          ¿Seguro que quieres eliminar «{task.title}»? Esta acción no se puede deshacer.
        </p>
      </Modal>
    </div>
  );
}
