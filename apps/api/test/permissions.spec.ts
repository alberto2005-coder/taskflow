import { Role } from '@prisma/client';

import type { AuthUser } from '../src/common/types/auth-user';
import {
  canChangeTaskStatus,
  canComment,
  canEditTask,
  canManageProject,
  canManageTasks,
  canManageUsers,
  canViewProject,
  projectVisibilityWhere,
  taskVisibilityWhere,
  ProjectPermissions,
  TaskPermissions,
} from '../src/users/permissions';

const admin: AuthUser = { id: 'u-admin', email: 'a@a.dev', name: 'Admin', role: Role.ADMIN };
const manager: AuthUser = {
  id: 'u-manager',
  email: 'm@m.dev',
  name: 'Manager',
  role: Role.MANAGER,
};
const member: AuthUser = { id: 'u-member', email: 'x@x.dev', name: 'Member', role: Role.MEMBER };

const ownedByManager: ProjectPermissions = { ownerId: manager.id, memberIds: [member.id] };
const ownedByOther: ProjectPermissions = { ownerId: 'u-other', memberIds: ['u-else'] };
const memberProject: ProjectPermissions = { ownerId: 'u-owner', memberIds: [member.id] };

const assignedToMember: TaskPermissions = { assigneeId: member.id };
const unassigned: TaskPermissions = { assigneeId: null };
const assignedToOther: TaskPermissions = { assigneeId: 'u-else' };

describe('permissions Â· visibilidad de proyectos', () => {
  it('ADMIN ve cualquier proyecto', () => {
    expect(canViewProject(admin, ownedByOther)).toBe(true);
    expect(canViewProject(admin, ownedByManager)).toBe(true);
  });

  it('el propietario ve su proyecto', () => {
    expect(canViewProject(manager, ownedByManager)).toBe(true);
  });

  it('un miembro ve los proyectos en los que estÃ¡ incluido', () => {
    expect(canViewProject(member, memberProject)).toBe(true);
  });

  it('nadie ve proyectos ajenos', () => {
    expect(canViewProject(member, ownedByOther)).toBe(false);
    expect(canViewProject(manager, ownedByOther)).toBe(false);
  });
});

describe('permissions Â· gestiÃ³n de proyectos', () => {
  it('ADMIN puede gestionar cualquier proyecto', () => {
    expect(canManageProject(admin, ownedByOther)).toBe(true);
    expect(canManageTasks(admin, ownedByOther)).toBe(true);
  });

  it('MANAGER solo gestiona los proyectos que posee', () => {
    expect(canManageProject(manager, ownedByManager)).toBe(true);
    expect(canManageProject(manager, ownedByOther)).toBe(false);
  });

  it('MEMBER nunca gestiona proyectos', () => {
    expect(canManageProject(member, memberProject)).toBe(false);
    expect(canManageTasks(member, memberProject)).toBe(false);
  });
});

describe('permissions Â· ediciÃ³n de tareas', () => {
  it('ADMIN edita cualquier tarea', () => {
    expect(canEditTask(admin, assignedToOther, ownedByOther)).toBe(true);
  });

  it('MANAGER propietario edita las tareas de su proyecto', () => {
    expect(canEditTask(manager, unassigned, ownedByManager)).toBe(true);
    expect(canEditTask(manager, assignedToOther, ownedByManager)).toBe(true);
  });

  it('MANAGER no edita tareas de proyectos que no posee', () => {
    expect(canEditTask(manager, assignedToOther, memberProject)).toBe(false);
    expect(canEditTask(manager, unassigned, ownedByOther)).toBe(false);
  });

  it('MEMBER solo edita sus tareas dentro de sus proyectos', () => {
    expect(canEditTask(member, assignedToMember, memberProject)).toBe(true);
    expect(canEditTask(member, unassigned, memberProject)).toBe(false);
    expect(canEditTask(member, assignedToOther, memberProject)).toBe(false);
    expect(canEditTask(member, assignedToMember, ownedByOther)).toBe(false);
  });

  it('el cambio de estado sigue las mismas reglas que la ediciÃ³n', () => {
    expect(canChangeTaskStatus(member, assignedToMember, memberProject)).toBe(true);
    expect(canChangeTaskStatus(member, unassigned, memberProject)).toBe(false);
    expect(canChangeTaskStatus(manager, assignedToOther, ownedByManager)).toBe(true);
    expect(canChangeTaskStatus(admin, assignedToOther, ownedByOther)).toBe(true);
  });
});

describe('permissions Â· comentarios y usuarios', () => {
  it('pueden comentar quienes ven el proyecto', () => {
    expect(canComment(admin, ownedByOther)).toBe(true);
    expect(canComment(manager, ownedByManager)).toBe(true);
    expect(canComment(member, memberProject)).toBe(true);
    expect(canComment(member, ownedByOther)).toBe(false);
  });

  it('solo ADMIN gestiona usuarios', () => {
    expect(canManageUsers(admin)).toBe(true);
    expect(canManageUsers(manager)).toBe(false);
    expect(canManageUsers(member)).toBe(false);
  });
});

describe('permissions Â· filtros de visibilidad', () => {
  it('ADMIN no restringe proyectos', () => {
    expect(projectVisibilityWhere(admin)).toBeUndefined();
    expect(taskVisibilityWhere(admin)).toEqual({});
  });

  it('MANAGER ve proyectos propios y donde es miembro', () => {
    expect(projectVisibilityWhere(manager)).toEqual({
      OR: [{ ownerId: manager.id }, { members: { some: { userId: manager.id } } }],
    });
    expect(taskVisibilityWhere(manager)).toHaveProperty('project');
  });

  it('MEMBER solo ve sus proyectos y sus tareas asignadas', () => {
    expect(projectVisibilityWhere(member)).toEqual({
      members: { some: { userId: member.id } },
    });
    expect(taskVisibilityWhere(member)).toEqual({
      assigneeId: member.id,
      project: { members: { some: { userId: member.id } } },
    });
  });
});
