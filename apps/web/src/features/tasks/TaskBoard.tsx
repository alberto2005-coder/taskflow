import { TASK_STATUSES } from '../../lib/api-types';
import type { Task, TaskStatus } from '../../lib/api-types';
import { taskStatusLabels } from '../../lib/formatters';
import { TaskCard } from './TaskCard';

interface TaskBoardProps {
  tasks: Task[];
  canMoveTask?: (task: Task) => boolean;
  onSelect?: (task: Task) => void;
  onStatusChange?: (task: Task, status: TaskStatus) => void;
}

/**
 * Tablero Kanban de tres columnas (`TODO | IN_PROGRESS | DONE`).
 * El cambio de columna se hace con botones ←/→ o con un select (sin drag & drop).
 */
export function TaskBoard({ tasks, canMoveTask, onSelect, onStatusChange }: TaskBoardProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {TASK_STATUSES.map((status) => {
        const columnTasks = tasks.filter((task) => task.status === status);

        return (
          <section
            key={status}
            className="flex flex-col rounded-xl bg-slate-100/80 p-3"
            aria-label={`Columna ${taskStatusLabels[status]}`}
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-700">{taskStatusLabels[status]}</h3>
              <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-600">
                {columnTasks.length}
              </span>
            </div>

            <div className="flex flex-1 flex-col gap-3">
              {columnTasks.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-300 px-3 py-6 text-center text-xs text-slate-400">
                  Sin tareas
                </p>
              ) : (
                columnTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    canMove={canMoveTask ? canMoveTask(task) : false}
                    onSelect={onSelect}
                    onStatusChange={onStatusChange}
                  />
                ))
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
