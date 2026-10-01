/** Tipos generados a partir del contrato `docs/API.md`. */

export const ROLES = ['ADMIN', 'MANAGER', 'MEMBER'] as const;
export type Role = (typeof ROLES)[number];

export const PROJECT_STATUSES = ['ACTIVE', 'ARCHIVED'] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const TASK_STATUSES = ['TODO', 'IN_PROGRESS', 'DONE'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export interface UserPublic {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
  owner: UserPublic;
  /** Solo en el detalle del proyecto. */
  members?: UserPublic[];
  /** Solo en el listado de proyectos. */
  tasksCount?: number;
  /** Solo en el listado de proyectos. */
  membersCount?: number;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  createdAt: string;
  updatedAt: string;
  project: { id: string; name: string };
  assignee: UserPublic | null;
  commentsCount: number;
}

export interface Comment {
  id: string;
  content: string;
  author: UserPublic;
  createdAt: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  items: T[];
  meta: PaginationMeta;
}

export interface AuthResponse {
  user: UserPublic;
  accessToken: string;
  refreshToken: string;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

export interface DashboardProject {
  id: string;
  name: string;
  status: ProjectStatus;
  progress: Record<TaskStatus, number>;
  membersCount: number;
  tasksCount: number;
}

export interface DashboardData {
  myTasks: {
    total: number;
    byStatus: Record<TaskStatus, number>;
    items: Task[];
  };
  /** Solo ADMIN y MANAGER; `null` para MEMBER. */
  projects: DashboardProject[] | null;
}
