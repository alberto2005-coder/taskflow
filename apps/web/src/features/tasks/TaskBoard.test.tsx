import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaskBoard } from './TaskBoard';
import type { Task } from '../../lib/api-types';

const member = {
  id: 'u1',
  name: 'Ana Pérez',
  email: 'ana@ejemplo.com',
  role: 'MEMBER' as const,
  createdAt: '2026-01-01T00:00:00.000Z',
};

function createTask(overrides: Partial<Task> & Pick<Task, 'id' | 'title' | 'status'>): Task {
  return {
    description: null,
    priority: 'MEDIUM',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    project: { id: 'p1', name: 'Proyecto X' },
    assignee: member,
    commentsCount: 2,
    ...overrides,
  };
}

const tasks: Task[] = [
  createTask({ id: 't1', title: 'Tarea por hacer', status: 'TODO' }),
  createTask({ id: 't2', title: 'Tarea en curso', status: 'IN_PROGRESS' }),
  createTask({ id: 't3', title: 'Tarea hecha', status: 'DONE' }),
];

describe('TaskBoard', () => {
  it('renderiza las tres columnas con sus tareas', () => {
    render(<TaskBoard tasks={tasks} />);

    expect(screen.getByRole('heading', { name: 'Por hacer' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'En curso' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Hecho' })).toBeInTheDocument();

    expect(screen.getByText('Tarea por hacer')).toBeInTheDocument();
    expect(screen.getByText('Tarea en curso')).toBeInTheDocument();
    expect(screen.getByText('Tarea hecha')).toBeInTheDocument();

    expect(screen.getAllByText('Media')).toHaveLength(3);
    expect(screen.getAllByText('💬 2')).toHaveLength(3);
    expect(screen.getAllByText('Ana Pérez')).toHaveLength(3);
  });

  it('mueve una tarea a la columna siguiente con el botón →', async () => {
    const onStatusChange = vi.fn();

    render(<TaskBoard tasks={tasks} canMoveTask={() => true} onStatusChange={onStatusChange} />);

    await userEvent.click(
      screen.getByRole('button', { name: 'Mover «Tarea por hacer» a la columna siguiente' }),
    );

    expect(onStatusChange).toHaveBeenCalledTimes(1);
    expect(onStatusChange).toHaveBeenCalledWith(
      expect.objectContaining({ id: 't1', status: 'TODO' }),
      'IN_PROGRESS',
    );
  });

  it('mueve una tarea a la columna anterior con el botón ←', async () => {
    const onStatusChange = vi.fn();

    render(<TaskBoard tasks={tasks} canMoveTask={() => true} onStatusChange={onStatusChange} />);

    await userEvent.click(
      screen.getByRole('button', { name: 'Mover «Tarea hecha» a la columna anterior' }),
    );

    expect(onStatusChange).toHaveBeenCalledWith(
      expect.objectContaining({ id: 't3', status: 'DONE' }),
      'IN_PROGRESS',
    );
  });

  it('permite cambiar el estado desde el select', async () => {
    const onStatusChange = vi.fn();

    render(<TaskBoard tasks={tasks} canMoveTask={() => true} onStatusChange={onStatusChange} />);

    await userEvent.selectOptions(screen.getByLabelText('Estado de «Tarea en curso»'), 'TODO');

    expect(onStatusChange).toHaveBeenCalledWith(expect.objectContaining({ id: 't2' }), 'TODO');
  });

  it('no muestra controles de movimiento si el usuario no puede mover tareas', () => {
    render(<TaskBoard tasks={tasks} canMoveTask={() => false} />);

    expect(screen.queryByRole('button', { name: /Mover/ })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Estado de/)).not.toBeInTheDocument();
  });
});
