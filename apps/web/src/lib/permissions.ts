import type { Project, Task, UserPublic } from './api-types';

/** ADMIN ve y gestiona todo. */
export function isAdmin(user: UserPublic | null | undefined): boolean {
  return user?.role === 'ADMIN';
}

export function canCreateProject(user: UserPublic | null | undefined): boolean {
  return user?.role === 'ADMIN' || user?.role === 'MANAGER';
}

/** ADMIN, o MANAGER propietario del proyecto. */
export function canManageProject(
  user: UserPublic | null | undefined,
  project: Project | null | undefined,
): boolean {
  if (!user || !project) return false;
  if (user.role === 'ADMIN') return true;
  return user.role === 'MANAGER' && project.owner.id === user.id;
}

/** Crear/editar/borrar tareas: ADMIN o MANAGER (la API acota a sus proyectos). */
export function canCreateTask(
  user: UserPublic | null | undefined,
  project: Project | null | undefined,
): boolean {
  return canManageProject(user, project);
}

/**
 * Cambiar estado: ADMIN y MANAGER en sus proyectos, MEMBER solo en tareas
 * asignadas a él (matriz de permisos de `docs/API.md`).
 */
export function canChangeTaskStatus(
  user: UserPublic | null | undefined,
  task: Task | null | undefined,
): boolean {
  if (!user || !task) return false;
  if (user.role === 'ADMIN') return true;
  if (user.role === 'MANAGER') return true;
  return task.assignee?.id === user.id;
}

export function canManageUsers(user: UserPublic | null | undefined): boolean {
  return isAdmin(user);
}
