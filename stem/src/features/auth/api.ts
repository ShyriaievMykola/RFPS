import { api } from '@/shared/api/client';
import type { AuthResponse } from '@/shared/api/types';
import type { LoginValues, RegisterValues } from '@/shared/lib/schemas';
import { useAuthStore } from '@/shared/stores/auth';
import { queryClient } from '@/app/queryClient';

export async function login(values: LoginValues): Promise<void> {
  const session = await api<AuthResponse>('/auth/login', {
    method: 'POST',
    body: values,
    auth: false,
  });
  useAuthStore.getState().setSession(session.user, session.accessToken);
}

export async function register(values: RegisterValues): Promise<void> {
  const session = await api<AuthResponse>('/auth/register', {
    method: 'POST',
    body: values,
    auth: false,
  });
  useAuthStore.getState().setSession(session.user, session.accessToken);
}

export async function requestPasswordReset(email: string): Promise<void> {
  await api<void>('/auth/forgot', { method: 'POST', body: { email }, auth: false });
}

export async function logout(): Promise<void> {
  try {
    await api<void>('/auth/logout', { method: 'POST', auth: false });
  } finally {
    // Сесію на клієнті скидаємо навіть якщо запит не вдався, і чистимо кеш,
    // щоб дані попереднього користувача не побачив наступний.
    useAuthStore.getState().clearSession(true);
    queryClient.clear();
  }
}
