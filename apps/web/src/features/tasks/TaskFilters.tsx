import { TASK_STATUSES } from '../../lib/api-types';
import type { Project, UserPublic } from '../../lib/api-types';
import { taskStatusLabels } from '../../lib/formatters';
import { Input } from '../../components/Input';
import { Select } from '../../components/Select';

export interface TaskFilterValues {
  status: string;
  projectId: string;
  assigneeId: string;
}

interface TaskFiltersProps {
  value: TaskFilterValues;
  projects: Project[];
  assigneeOptions: UserPublic[];
  /** Mensaje mostrado cuando no hay opciones de responsable disponibles. */
  assigneeHint?: string;
  search?: string;
  onSearchChange?: (value: string) => void;
  onChange: (patch: Partial<TaskFilterValues>) => void;
}

export function TaskFilters({
  value,
  projects,
  assigneeOptions,
  assigneeHint,
  search,
  onSearchChange,
  onChange,
}: TaskFiltersProps) {
  const assigneeDisabled = assigneeOptions.length === 0;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {onSearchChange && (
          <Input
            label="Buscar"
            type="search"
            placeholder="Filtrar por título…"
            value={search ?? ''}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        )}

        <Select
          label="Estado"
          value={value.status}
          placeholder="Todos los estados"
          onChange={(event) => onChange({ status: event.target.value })}
        >
          {TASK_STATUSES.map((status) => (
            <option key={status} value={status}>
              {taskStatusLabels[status]}
            </option>
          ))}
        </Select>

        <Select
          label="Proyecto"
          value={value.projectId}
          placeholder="Todos los proyectos"
          onChange={(event) => onChange({ projectId: event.target.value, assigneeId: '' })}
        >
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </Select>

        <Select
          label="Responsable"
          value={value.assigneeId}
          placeholder={assigneeDisabled ? 'No disponible' : 'Cualquier responsable'}
          disabled={assigneeDisabled}
          hint={assigneeDisabled ? assigneeHint : undefined}
          onChange={(event) => onChange({ assigneeId: event.target.value })}
        >
          {assigneeOptions.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
