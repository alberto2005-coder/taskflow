import { Button } from './Button';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  /** Texto adicional, p. ej. «12 elementos». */
  summary?: string;
}

export function Pagination({ page, totalPages, onPageChange, summary }: PaginationProps) {
  if (totalPages <= 1) {
    return summary ? (
      <p className="text-center text-sm text-slate-500 sm:text-left">{summary}</p>
    ) : null;
  }

  return (
    <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
      {summary && <p className="text-sm text-slate-500">{summary}</p>}
      <div className="flex items-center gap-2 sm:ml-auto">
        <Button variant="secondary" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          Anterior
        </Button>
        <span className="text-sm text-slate-600">
          Página {page} de {totalPages}
        </span>
        <Button
          variant="secondary"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Siguiente
        </Button>
      </div>
    </div>
  );
}
