import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ApiError, apiFetch } from '../../lib/api';
import { useDebounce } from '../../hooks/useDebounce';
import { useAuthStore } from '../../store/auth-store';
import { canCreateProject } from '../../lib/permissions';
import { initials, projectStatusLabels, roleLabels } from '../../lib/formatters';
import { PROJECT_STATUSES } from '../../lib/api-types';
import type { Paginated, Project, ProjectStatus } from '../../lib/api-types';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { Input } from '../../components/Input';
import { LoadingBlock } from '../../components/Spinner';
import { PageHeader } from '../../components/PageHeader';
import { Pagination } from '../../components/Pagination';
import { Select } from '../../components/Select';
import { CreateProjectModal } from './CreateProjectModal';

const PAGE_SIZE = 12;

export function ProjectsPage() {
  const user = useAuthStore((state) => state.user);
  const [searchInput, setSearchInput] = useState('');
  const [status, setStatus] = useState<'' | ProjectStatus>('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);

  const search = useDebounce(searchInput, 300);

  const params = {
    page,
    limit: PAGE_SIZE,
    search: search.trim() || undefined,
    status: status || undefined,
  };

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['projects', params],
    queryFn: () => apiFetch<Paginated<Project>>('/projects', { params }),
    placeholderData: keepPreviousData,
  });

  const showCreate = canCreateProject(user);

  return (
    <div>
      <PageHeader
        title="Proyectos"
        description="Todos los proyectos a los que tienes acceso."
        actions={showCreate && <Button onClick={() => setModalOpen(true)}>Nuevo proyecto</Button>}
      />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="sm:max-w-xs sm:flex-1">
          <Input
            label="Buscar"
            type="search"
            placeholder="Buscar por nombre…"
            value={searchInput}
            onChange={(event) => {
              setSearchInput(event.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="sm:w-52">
          <Select
            label="Estado"
            value={status}
            placeholder="Todos"
            onChange={(event) => {
              setStatus(event.target.value as '' | ProjectStatus);
              setPage(1);
            }}
          >
            {PROJECT_STATUSES.map((value) => (
              <option key={value} value={value}>
                {projectStatusLabels[value]}
              </option>
            ))}
          </Select>
        </div>
        {isFetching && !isLoading && <span className="text-sm text-slate-400">Actualizando…</span>}
      </div>

      {isLoading && <LoadingBlock label="Cargando proyectos…" />}

      {isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="font-medium text-red-700">
            {error instanceof ApiError ? error.message : 'No se han podido cargar los proyectos.'}
          </p>
          <Button className="mt-4" variant="secondary" onClick={() => void refetch()}>
            Reintentar
          </Button>
        </div>
      )}

      {!isLoading && !isError && data && data.items.length === 0 && (
        <EmptyState
          title="No hay proyectos que coincidan"
          description="Prueba con otra búsqueda o crea un proyecto nuevo."
          action={
            showCreate ? <Button onClick={() => setModalOpen(true)}>Nuevo proyecto</Button> : null
          }
        />
      )}

      {!isLoading && !isError && data && data.items.length > 0 && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.items.map((project) => (
              <Link
                key={project.id}
                to={`/projects/${project.id}`}
                className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-semibold text-slate-900">{project.name}</h2>
                  <Badge tone={project.status === 'ACTIVE' ? 'green' : 'gray'}>
                    {projectStatusLabels[project.status]}
                  </Badge>
                </div>

                <p className="line-clamp-2 flex-1 text-sm text-slate-500">
                  {project.description?.trim() || 'Sin descripción'}
                </p>

                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 font-semibold text-slate-600">
                    {initials(project.owner.name)}
                  </span>
                  <span>
                    {project.owner.name} · {roleLabels[project.owner.role]}
                  </span>
                </div>

                <p className="text-xs text-slate-400">
                  {project.tasksCount ?? 0} tareas · {project.membersCount ?? 0} miembros
                </p>
              </Link>
            ))}
          </div>

          <div className="mt-6">
            <Pagination
              page={data.meta.page}
              totalPages={data.meta.totalPages}
              onPageChange={setPage}
              summary={`${data.meta.total} proyectos`}
            />
          </div>
        </>
      )}

      <CreateProjectModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
