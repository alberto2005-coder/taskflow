import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiFetch, setUnauthorizedHandler } from './api';
import { useAuthStore } from '../store/auth-store';
import type { UserPublic } from './api-types';

const user: UserPublic = {
  id: 'u1',
  name: 'Ana Pérez',
  email: 'ana@ejemplo.com',
  role: 'MEMBER',
  createdAt: '2026-01-01T00:00:00.000Z',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function initOf(call: unknown[]): RequestInit {
  return (call[1] ?? {}) as RequestInit;
}

function headersOf(call: unknown[]): Record<string, string> {
  return (initOf(call).headers ?? {}) as Record<string, string>;
}

describe('apiFetch', () => {
  beforeEach(() => {
    useAuthStore.getState().clear();
    setUnauthorizedHandler(null);
  });

  it('convierte los errores de la API en ApiError con campos', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        jsonResponse(
          { statusCode: 400, message: ['email debe ser un email válido'], error: 'Bad Request' },
          400,
        ),
      );
    vi.stubGlobal('fetch', fetchMock);

    const error = await apiFetch('/auth/login', { method: 'POST', body: {} }).catch(
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(ApiError);
    const apiError = error as ApiError;
    expect(apiError.status).toBe(400);
    expect(apiError.message).toContain('email debe ser un email válido');
    expect(apiError.fields?.email).toBe('email debe ser un email válido');
    expect(String(fetchMock.mock.calls[0][0])).toContain('/auth/login');
    expect(initOf(fetchMock.mock.calls[0]).method).toBe('POST');
  });

  it('serializa los parámetros de query ignorando los vacíos', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ items: [], meta: {} }));
    vi.stubGlobal('fetch', fetchMock);

    await apiFetch('/tasks', { params: { page: 1, status: 'TODO', assigneeId: '' } });

    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('/tasks?');
    expect(url).toContain('page=1');
    expect(url).toContain('status=TODO');
    expect(url).not.toContain('assigneeId');
  });

  it('no envía Authorization cuando no hay sesión', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(user));
    vi.stubGlobal('fetch', fetchMock);

    await apiFetch('/auth/me');

    expect(headersOf(fetchMock.mock.calls[0])).not.toHaveProperty('Authorization');
  });

  it('refresca el token en un 401 y reintenta la petición original', async () => {
    useAuthStore.getState().setSession({ accessToken: 'old-token', refreshToken: 'r1', user });

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ statusCode: 401, message: 'Unauthorized' }, 401))
      .mockResolvedValueOnce(jsonResponse({ accessToken: 'new-token', refreshToken: 'r2' }))
      .mockResolvedValueOnce(jsonResponse(user));
    vi.stubGlobal('fetch', fetchMock);

    const result = await apiFetch<UserPublic>('/auth/me');

    expect(result).toEqual(user);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(String(fetchMock.mock.calls[0][0])).toContain('/auth/me');
    expect(String(fetchMock.mock.calls[1][0])).toContain('/auth/refresh');
    expect(headersOf(fetchMock.mock.calls[2])).toMatchObject({
      Authorization: 'Bearer new-token',
    });
    expect(useAuthStore.getState().accessToken).toBe('new-token');
    expect(useAuthStore.getState().refreshToken).toBe('r2');
  });

  it('no reintenta más de una vez y notifica el fallo de refresh', async () => {
    useAuthStore.getState().setSession({ accessToken: 'old-token', refreshToken: 'r1', user });
    const handler = vi.fn();
    setUnauthorizedHandler(handler);

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({}, 401))
      .mockResolvedValueOnce(jsonResponse({}, 401));
    vi.stubGlobal('fetch', fetchMock);

    const error = await apiFetch('/tasks', {}).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(401);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('usa el token almacenado en la cabecera Authorization', async () => {
    useAuthStore.getState().setSession({ accessToken: 'abc', refreshToken: 'r1', user });
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(user));
    vi.stubGlobal('fetch', fetchMock);

    await apiFetch('/auth/me');

    expect(headersOf(fetchMock.mock.calls[0])).toMatchObject({
      Authorization: 'Bearer abc',
    });
    expect(initOf(fetchMock.mock.calls[0]).method).toBe('GET');
  });
});
