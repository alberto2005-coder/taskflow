import { useAuthStore } from '../store/auth-store';

const rawBase = import.meta.env.VITE_API_URL;
const API_BASE = (rawBase ?? '/api').replace(/\/+$/, '');

/** Rutas que nunca deben intentar refrescar la sesión (evita bucles infinitos). */
const PUBLIC_AUTH_PATHS = ['/auth/refresh', '/auth/login', '/auth/register'];

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

export type QueryParams = Record<string, string | number | boolean | null | undefined>;

export interface ApiRequestOptions {
  method?: HttpMethod;
  body?: unknown;
  params?: QueryParams;
  headers?: Record<string, string>;
  /** Omite la cabecera `Authorization` (login, registro, refresh). */
  skipAuth?: boolean;
}

export class ApiError extends Error {
  readonly status: number;
  readonly fields?: Record<string, string>;

  constructor(status: number, message: string, fields?: Record<string, string>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fields = fields;
  }
}

export type UnauthorizedHandler = () => void;

function redirectToLogin(): void {
  if (typeof window === 'undefined') return;
  const { pathname } = window.location;
  if (pathname === '/login' || pathname === '/register') return;
  window.location.assign('/login');
}

const defaultUnauthorizedHandler: UnauthorizedHandler = () => {
  useAuthStore.getState().clear();
  redirectToLogin();
};

let unauthorizedHandler: UnauthorizedHandler = defaultUnauthorizedHandler;

/** Permite sustituir el comportamiento por defecto (logout + redirección). Pasar `null` lo restaura. */
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  unauthorizedHandler = handler ?? defaultUnauthorizedHandler;
}

function buildUrl(path: string, params?: QueryParams): string {
  const url = `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
  if (!params) return url;

  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    search.append(key, String(value));
  }
  const qs = search.toString();
  return qs ? `${url}?${qs}` : url;
}

interface NestErrorBody {
  statusCode?: number;
  message?: string | string[];
  error?: string;
}

function extractFields(messages: string[]): Record<string, string> | undefined {
  const fields: Record<string, string> = {};
  let found = false;

  for (const message of messages) {
    const match = /^([A-Za-z_][\w]*)\s/.exec(message);
    if (!match) continue;
    const field = match[1];
    fields[field] = fields[field] ? `${fields[field]} · ${message}` : message;
    found = true;
  }

  return found ? fields : undefined;
}

function parseError(raw: unknown, status: number): ApiError {
  const fallback = `La solicitud ha fallado (error ${status})`;

  if (raw && typeof raw === 'object' && 'message' in raw) {
    const body = raw as NestErrorBody;
    if (Array.isArray(body.message) && body.message.length > 0) {
      return new ApiError(status, body.message.join(' · '), extractFields(body.message));
    }
    if (typeof body.message === 'string' && body.message.trim() !== '') {
      return new ApiError(status, body.message, extractFields([body.message]));
    }
  }

  return new ApiError(status, fallback);
}

async function toApiError(response: Response): Promise<ApiError> {
  let raw: unknown;
  try {
    raw = await response.json();
  } catch {
    raw = null;
  }
  return parseError(raw, response.status);
}

let refreshPromise: Promise<boolean> | null = null;

async function performRefresh(): Promise<boolean> {
  const { refreshToken } = useAuthStore.getState();
  if (!refreshToken) return false;

  try {
    const response = await fetch(buildUrl('/auth/refresh'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!response.ok) return false;

    const data = (await response.json()) as { accessToken?: string; refreshToken?: string };
    if (!data.accessToken || !data.refreshToken) return false;

    useAuthStore.getState().setTokens(data.accessToken, data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

/** Reintento único y compartido entre peticiones concurrentes. */
function refreshSession(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = performRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

async function request<T>(path: string, options: ApiRequestOptions, retried = false): Promise<T> {
  const { method = 'GET', body, params, headers = {}, skipAuth = false } = options;

  const requestHeaders: Record<string, string> = { Accept: 'application/json', ...headers };
  const { accessToken } = useAuthStore.getState();
  if (body !== undefined) requestHeaders['Content-Type'] = 'application/json';
  if (!skipAuth && accessToken) requestHeaders.Authorization = `Bearer ${accessToken}`;

  const init: RequestInit = { method, headers: requestHeaders };
  if (body !== undefined) init.body = JSON.stringify(body);

  let response: Response;
  try {
    response = await fetch(buildUrl(path, params), init);
  } catch {
    throw new ApiError(0, 'No se ha podido conectar con el servidor. Inténtalo de nuevo.');
  }

  const sessionExpired = 'Tu sesión ha caducado. Inicia sesión de nuevo.';

  if (response.status === 401 && !PUBLIC_AUTH_PATHS.includes(path)) {
    if (retried) {
      unauthorizedHandler();
      throw new ApiError(401, sessionExpired);
    }

    const refreshed = await refreshSession();
    if (refreshed) return request<T>(path, options, true);

    unauthorizedHandler();
    throw new ApiError(401, sessionExpired);
  }

  if (!response.ok) throw await toApiError(response);

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  if (text.trim() === '') return undefined as T;

  return JSON.parse(text) as T;
}

/**
 * Cliente HTTP mínimo: base configurable, token Bearer, errores tipados como
 * `ApiError` y reintento único de la petición original tras refrescar el token.
 */
export function apiFetch<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  return request<T>(path, options);
}

export { API_BASE };
