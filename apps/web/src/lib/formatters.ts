import type { ProjectStatus, Role, TaskPriority, TaskStatus } from './api-types';

export const roleLabels: Record<Role, string> = {
  ADMIN: 'Administrador',
  MANAGER: 'Responsable',
  MEMBER: 'Miembro',
};

export const taskStatusLabels: Record<TaskStatus, string> = {
  TODO: 'Por hacer',
  IN_PROGRESS: 'En curso',
  DONE: 'Hecho',
};

export const taskPriorityLabels: Record<TaskPriority, string> = {
  LOW: 'Baja',
  MEDIUM: 'Media',
  HIGH: 'Alta',
};

export const projectStatusLabels: Record<ProjectStatus, string> = {
  ACTIVE: 'Activo',
  ARCHIVED: 'Archivado',
};

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0].charAt(0);
  const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : '';
  return `${first}${last}`.toUpperCase();
}

export function progressPercent(done: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((done / total) * 100);
}
