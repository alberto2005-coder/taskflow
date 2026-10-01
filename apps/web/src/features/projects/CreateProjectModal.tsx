import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { ApiError, apiFetch } from '../../lib/api';
import { queryClient } from '../../lib/query-client';
import { useToast } from '../../components/Toast';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Modal } from '../../components/Modal';
import { Textarea } from '../../components/Textarea';
import type { Project } from '../../lib/api-types';

const projectSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  description: z.string().max(500, 'La descripción no puede superar los 500 caracteres'),
});

type ProjectValues = z.infer<typeof projectSchema>;

interface CreateProjectModalProps {
  open: boolean;
  onClose: () => void;
  /** Si se indica, el modal edita el proyecto en lugar de crearlo. */
  project?: Project;
}

export function CreateProjectModal({ open, onClose, project }: CreateProjectModalProps) {
  const toast = useToast();
  const isEditing = Boolean(project);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<ProjectValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: { name: '', description: '' },
  });

  useEffect(() => {
    if (!open) return;
    reset({
      name: project?.name ?? '',
      description: project?.description ?? '',
    });
  }, [open, project, reset]);

  const mutation = useMutation({
    mutationFn: (values: ProjectValues) =>
      isEditing && project
        ? apiFetch<Project>(`/projects/${project.id}`, {
            method: 'PATCH',
            body: { name: values.name, description: values.description },
          })
        : apiFetch<Project>('/projects', {
            method: 'POST',
            body: { name: values.name, description: values.description },
          }),
    onSuccess: () => {
      toast.success(isEditing ? 'Proyecto actualizado' : 'Proyecto creado');
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
      if (project) void queryClient.invalidateQueries({ queryKey: ['project', project.id] });
      onClose();
    },
    onError: (error: unknown) => {
      const message =
        error instanceof ApiError
          ? error.message
          : isEditing
            ? 'No se ha podido actualizar el proyecto'
            : 'No se ha podido crear el proyecto';
      const fields = error instanceof ApiError ? error.fields : undefined;

      if (fields?.name) {
        setError('name', { message: fields.name });
        return;
      }
      toast.error(message);
    },
  });

  const onSubmit = (values: ProjectValues) => mutation.mutate(values);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? 'Editar proyecto' : 'Nuevo proyecto'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button form="project-form" type="submit" loading={mutation.isPending}>
            {isEditing ? 'Guardar cambios' : 'Crear proyecto'}
          </Button>
        </>
      }
    >
      <form
        id="project-form"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="flex flex-col gap-4"
      >
        <Input
          label="Nombre"
          placeholder="Rediseño de la web"
          error={errors.name?.message}
          {...register('name')}
        />
        <Textarea
          label="Descripción"
          placeholder="Objetivo del proyecto, alcance, notas…"
          error={errors.description?.message}
          {...register('description')}
        />
      </form>
    </Modal>
  );
}
