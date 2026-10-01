import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { ApiError, apiFetch } from '../../lib/api';
import { queryClient } from '../../lib/query-client';
import { taskPriorityLabels, taskStatusLabels } from '../../lib/formatters';
import { TASK_PRIORITIES, TASK_STATUSES } from '../../lib/api-types';
import type { Task, UserPublic } from '../../lib/api-types';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Modal } from '../../components/Modal';
import { Select } from '../../components/Select';
import { Textarea } from '../../components/Textarea';
import { useToast } from '../../components/Toast';

const taskSchema = z.object({
  title: z.string().min(3, 'El título debe tener al menos 3 caracteres'),
  description: z.string().max(2000, 'La descripción no puede superar los 2000 caracteres'),
  assigneeId: z.string(),
  status: z.enum(TASK_STATUSES),
  priority: z.enum(TASK_PRIORITIES),
});

type TaskValues = z.infer<typeof taskSchema>;

interface CreateTaskModalProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  /** Miembros del proyecto (la API no permite listar usuarios a no ADMIN). */
  members: UserPublic[];
}

export function CreateTaskModal({ open, onClose, projectId, members }: CreateTaskModalProps) {
  const toast = useToast();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<TaskValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: '',
      description: '',
      assigneeId: '',
      status: 'TODO',
      priority: 'MEDIUM',
    },
  });

  useEffect(() => {
    if (!open) return;
    reset({ title: '', description: '', assigneeId: '', status: 'TODO', priority: 'MEDIUM' });
  }, [open, reset]);

  const mutation = useMutation({
    mutationFn: (values: TaskValues) =>
      apiFetch<Task>(`/projects/${projectId}/tasks`, {
        method: 'POST',
        body: {
          title: values.title,
          description: values.description,
          assigneeId: values.assigneeId || undefined,
          status: values.status,
          priority: values.priority,
        },
      }),
    onSuccess: () => {
      toast.success('Tarea creada');
      void queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId] });
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
      void queryClient.invalidateQueries({ queryKey: ['tasks'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      onClose();
    },
    onError: (error: unknown) => {
      const message = error instanceof ApiError ? error.message : 'No se ha podido crear la tarea';
      if (error instanceof ApiError && error.fields?.title) {
        setError('title', { message: error.fields.title });
        return;
      }
      toast.error(message);
    },
  });

  const onSubmit = (values: TaskValues) => mutation.mutate(values);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nueva tarea"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button form="task-form" type="submit" loading={mutation.isPending}>
            Crear tarea
          </Button>
        </>
      }
    >
      <form
        id="task-form"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="flex flex-col gap-4"
      >
        <Input
          label="Título"
          placeholder="Preparar la demo"
          error={errors.title?.message}
          {...register('title')}
        />
        <Textarea
          label="Descripción"
          placeholder="Detalles, criterios de aceptación…"
          error={errors.description?.message}
          {...register('description')}
        />
        <Select label="Responsable" placeholder="Sin responsable" {...register('assigneeId')}>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </Select>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Estado" {...register('status')}>
            {TASK_STATUSES.map((status) => (
              <option key={status} value={status}>
                {taskStatusLabels[status]}
              </option>
            ))}
          </Select>
          <Select label="Prioridad" {...register('priority')}>
            {TASK_PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {taskPriorityLabels[priority]}
              </option>
            ))}
          </Select>
        </div>
      </form>
    </Modal>
  );
}
