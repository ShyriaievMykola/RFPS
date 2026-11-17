import { useAuthStore } from '@/shared/stores/auth';
import type { AuthResponse } from './types';

const BASE_URL = '/api';

export class ApiError extends Error {
  readonly status: number;
  /** Машинний код помилки від сервера, напр. `invalid_credentials`. */
  readonly code: string;
  readonly details: Record<string, unknown>;

  constructor(status: number, code: string, details: Record<string, unknown> = {}) {
    super(`${status} ${code}`);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  params?: Record<string, string | number | undefined>;
  /** false для публічних ендпоінтів (вхід, реєстрація). */
  auth?: boolean;
  signal?: AbortSignal;
}

function buildUrl(path: string, params?: RequestOptions['params']): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined) query.set(key, String(value));
  }
  const suffix = query.size > 0 ? `?${query}` : '';
  return `${BASE_URL}${path}${suffix}`;
}

async function send(
  path: string,
  options: RequestOptions,
  token: string | null,
): Promise<Response> {
  const headers = new Headers({ Accept: 'application/json' });
  if (options.body !== undefined) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  return fetch(buildUrl(path, options.params), {
    method: options.method ?? 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    // Refresh-токен у справжній системі — httpOnly-cookie, тож вона має їхати з кожним запитом.
    credentials: 'same-origin',
    signal: options.signal,
  });
}

async function parse<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = (payload ?? {}) as { code?: string; details?: Record<string, unknown> };
    throw new ApiError(response.status, error.code ?? 'unknown', error.details);
  }
  return payload as T;
}

// Один спільний проміс на всі запити, що одночасно отримали 401:
// інакше кожен запустив би власне оновлення токена.
let refreshInFlight: Promise<boolean> | null = null;

export function refreshSession(): Promise<boolean> {
  refreshInFlight ??= (async () => {
    try {
      const response = await send('/auth/refresh', { method: 'POST' }, null);
      const session = await parse<AuthResponse>(response);
      useAuthStore.getState().setSession(session.user, session.accessToken);
      return true;
    } catch {
      useAuthStore.getState().clearSession();
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const needsAuth = options.auth ?? true;
  const token = needsAuth ? useAuthStore.getState().accessToken : null;

  let response = await send(path, options, token);
  if (response.status === 401 && needsAuth && (await refreshSession())) {
    response = await send(path, options, useAuthStore.getState().accessToken);
  }
  return parse<T>(response);
}
