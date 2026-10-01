import { Injectable } from '@nestjs/common';
import { ProjectStatus, Role, TaskStatus } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../common/types/auth-user';
import { projectVisibilityWhere } from '../users/permissions';

export interface DashboardSummary {
  myTasks: {
    total: number;
    byStatus: Record<TaskStatus, number>;
    items: Array<{
      id: string;
      title: string;
      status: TaskStatus;
      priority: 'LOW' | 'MEDIUM' | 'HIGH';
      project: { id: string; name: string };
      updatedAt: Date;
    }>;
  };
  /** Progreso por proyecto: solo ADMIN y MANAGER (`null` para MEMBER). */
  projects: Array<{
    id: string;
    name: string;
    status: ProjectStatus;
    membersCount: number;
    tasksCount: number;
    progress: Record<TaskStatus, number>;
  }> | null;
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(user: AuthUser): Promise<DashboardSummary> {
    const [myTasks, projects] = await Promise.all([
      this.getMyTasks(user),
      user.role === Role.MEMBER ? Promise.resolve(null) : this.getProjects(user),
    ]);

    return { myTasks, projects };
  }

  private async getMyTasks(user: AuthUser): Promise<DashboardSummary['myTasks']> {
    const [todo, inProgress, done, items] = await Promise.all([
      this.prisma.task.count({ where: { assigneeId: user.id, status: TaskStatus.TODO } }),
      this.prisma.task.count({ where: { assigneeId: user.id, status: TaskStatus.IN_PROGRESS } }),
      this.prisma.task.count({ where: { assigneeId: user.id, status: TaskStatus.DONE } }),
      this.prisma.task.findMany({
        where: { assigneeId: user.id },
        orderBy: { updatedAt: 'desc' },
        take: 5,
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          updatedAt: true,
          project: { select: { id: true, name: true } },
        },
      }),
    ]);

    const byStatus: Record<TaskStatus, number> = {
      [TaskStatus.TODO]: todo,
      [TaskStatus.IN_PROGRESS]: inProgress,
      [TaskStatus.DONE]: done,
    };

    return {
      total: todo + inProgress + done,
      byStatus,
      items: items.map((task) => ({
        id: task.id,
        title: task.title,
        status: task.status,
        priority: task.priority,
        project: task.project,
        updatedAt: task.updatedAt,
      })),
    };
  }

  private async getProjects(user: AuthUser): Promise<DashboardSummary['projects']> {
    const visibility = projectVisibilityWhere(user);

    const projects = await this.prisma.project.findMany({
      where: {
        ...(visibility ?? {}),
        status: ProjectStatus.ACTIVE,
      },
      orderBy: { updatedAt: 'desc' },
      take: 10,
      select: {
        id: true,
        name: true,
        status: true,
        _count: { select: { members: true, tasks: true } },
        tasks: { select: { status: true } },
      },
    });

    return projects.map((project) => ({
      id: project.id,
      name: project.name,
      status: project.status,
      membersCount: project._count.members,
      tasksCount: project._count.tasks,
      progress: {
        [TaskStatus.TODO]: project.tasks.filter((t) => t.status === TaskStatus.TODO).length,
        [TaskStatus.IN_PROGRESS]: project.tasks.filter((t) => t.status === TaskStatus.IN_PROGRESS)
          .length,
        [TaskStatus.DONE]: project.tasks.filter((t) => t.status === TaskStatus.DONE).length,
      },
    }));
  }
}
