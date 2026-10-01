import { Role } from '@prisma/client';
import type { Prisma } from '@prisma/client';

import type { AuthUser } from '../common/types/auth-user';

/** Proyecto con los datos mínimos para evaluar permisos. */
export interface ProjectPermissions {
  ownerId: string;
  /** Ids de los usuarios miembros del proyecto. */
  memberIds: string[];
}

/** Tarea con los datos mínimos para evaluar permisos. */
export interface TaskPermissions {
  assigneeId: string | null;
}

/** Un usuario puede ver el proyecto si es ADMIN, el propietario o miembro. */
export function canViewProject(user: AuthUser, project: ProjectPermissions): boolean {
  if (user.role === Role.ADMIN) return true;
  if (project.ownerId === user.id) return true;
  return project.memberIds.includes(user.id);
}

/** Un usuario puede administrar el proyecto si es ADMIN o MANAGER propietario. */
export function canManageProject(user: AuthUser, project: ProjectPermissions): boolean {
  if (user.role === Role.ADMIN) return true;
  if (user.role !== Role.MANAGER) return false;
  return project.ownerId === user.id;
}

/** Solo ADMIN o el MANAGER propietario crean/editan/borran tareas. */
export function canManageTasks(user: AuthUser, project: ProjectPermissions): boolean {
  return canManageProject(user, project);
}

/** Un MEMBER solo edita las tareas asignadas a él; MANAGER/ADMIN las de su proyecto. */
export function canEditTask(
  user: AuthUser,
  task: TaskPermissions,
  project: ProjectPermissions,
): boolean {
  if (canManageProject(user, project)) return true;
  if (user.role !== Role.MEMBER) return false;
  return task.assigneeId === user.id && project.memberIds.includes(user.id);
}

/**
 * Cambiar de estado: aplica las mismas reglas que editar la tarea.
 * (ADMIN/MANAGER propietario en su proyecto, MEMBER en las asignadas a él.)
 */
export function canChangeTaskStatus(
  user: AuthUser,
  task: TaskPermissions,
  project: ProjectPermissions,
): boolean {
  return canEditTask(user, task, project);
}

/** Cualquier miembro del proyecto (o ADMIN) puede comentar. */
export function canComment(user: AuthUser, project: ProjectPermissions): boolean {
  return canViewProject(user, project);
}

/** Solo ADMIN puede gestionar usuarios y roles. */
export function canManageUsers(user: AuthUser): boolean {
  return user.role === Role.ADMIN;
}

/**
 * Filtro de visibilidad de proyectos:
 * - ADMIN → todos
 * - MANAGER → los que posee y los que es miembro
 * - MEMBER → solo los que es miembro
 */
export function projectVisibilityWhere(user: AuthUser): Prisma.ProjectWhereInput | undefined {
  if (user.role === Role.ADMIN) return undefined;
  if (user.role === Role.MANAGER) {
    return { OR: [{ ownerId: user.id }, { members: { some: { userId: user.id } } }] };
  }
  return { members: { some: { userId: user.id } } };
}

/**
 * Filtro de visibilidad de tareas:
 * - ADMIN → todas
 * - MANAGER → las de los proyectos que ve
 * - MEMBER → solo las asignadas a él dentro de sus proyectos
 */
export function taskVisibilityWhere(user: AuthUser): Prisma.TaskWhereInput {
  const project = projectVisibilityWhere(user);

  if (user.role === Role.MEMBER) {
    return { assigneeId: user.id, ...(project ? { project } : {}) };
  }

  return project ? { project } : {};
}
