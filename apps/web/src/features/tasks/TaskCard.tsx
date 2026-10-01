import { TASK_STATUSES } from '../../lib/api-types';
import type { Task, TaskStatus } from '../../lib/api-types';
import { taskPriorityLabels, taskStatusLabels } from '../../lib/formatters';
import { Badge } from '../../components/Badge';
import { cn } from '../../lib/cn';

const priorityTone = {
  LOW: 'blue',
  MEDIUM: 'amber',
  HIGH: 'red',
} as const;

interface TaskCardProps {
  task: Task;
  /** Muestra los controles de cambio de estado. */
  canMove?: boolean;
  onSelect?: (task: Task) => void;
  onStatusChange?: (task: Task, status: TaskStatus) => void;
}

export function TaskCard({ task, canMove = false, onSelect, onStatusChange }: TaskCardProps) {
  const index = TASK_STATUSES.indexOf(task.status);
  const previous = index > 0 ? TASK_STATUSES[index - 1] : null;
  const next = index < TASK_STATUSES.length - 1 ? TASK_STATUSES[index + 1] : null;

  const move = (status: TaskStatus) => onStatusChange?.(task, status);

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      {onSelect ? (
        <button
          type="button"
          onClick={() => onSelect(task)}
          className="block w-full text-left text-sm font-medium text-slate-800 hover:text-indigo-700"
        >
          {task.title}
        </button>
      ) : (
        <p className="text-sm font-medium text-slate-800">{task.title}</p>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Badge tone={priorityTone[task.priority]}>{taskPriorityLabels[task.priority]}</Badge>
        <span className="text-xs text-slate-500">
          {task.assignee ? task.assignee.name : 'Sin responsable'}
        </span>
        <span className="ml-auto text-xs text-slate-400" title="Comentarios">
          💬 {task.commentsCount}
        </span>
      </div>

      {canMove && (
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            disabled={!previous}
            onClick={() => previous && move(previous)}
            aria-label={`Mover «${task.title}» a la columna anterior`}
            className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            ←
          </button>

          <select
            aria-label={`Estado de «${task.title}»`}
            value={task.status}
            onChange={(event) => move(event.target.value as TaskStatus)}
            className={cn(
              'flex-1 rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
            )}
          >
            {TASK_STATUSES.map((status) => (
              <option key={status} value={status}>
                {taskStatusLabels[status]}
              </option>
            ))}
          </select>

          <button
            type="button"
            disabled={!next}
            onClick={() => next && move(next)}
            aria-label={`Mover «${task.title}» a la columna siguiente`}
            className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            →
          </button>
        </div>
      )}
    </article>
  );
}
