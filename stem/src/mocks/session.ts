import { HttpResponse } from 'msw';
import type { Role, User } from '@/shared/api/types';
import { db, newId, type DbUser } from './db';

const ACCESS_TTL_MS = 15 * 60_000;
const REFRESH_TTL_MS = 7 * 24 * 3_600_000;

// Імітація httpOnly-cookie з refresh-токеном. Справжній сервер виставив би
// `Set-Cookie: refresh=...; HttpOnly; Secure; SameSite=Strict`, і JavaScript її не бачив би.
// Service Worker не може ставити такі cookie, тому мок тримає сесію у власному сховищі.
const REFRESH_COOKIE_KEY = 'em-mock-refresh-cookie';

const accessTokens = new Map<string, { userId: string; expiresAt: number }>();

export function fail(status: number, code: string, details: Record<string, unknown> = {}) {
  return HttpResponse.json({ code, details }, { status });
}

export function toPublicUser(user: DbUser): User {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    apartmentId: user.apartmentId,
  };
}

export function issueAccessToken(userId: string): string {
  const token = newId();
  accessTokens.set(token, { userId, expiresAt: Date.now() + ACCESS_TTL_MS });
  return token;
}

export function startSession(userId: string): void {
  const cookie = { userId, expiresAt: Date.now() + REFRESH_TTL_MS };
  localStorage.setItem(REFRESH_COOKIE_KEY, JSON.stringify(cookie));
}

export function endSession(): void {
  localStorage.removeItem(REFRESH_COOKIE_KEY);
  accessTokens.clear();
}

export function userFromRefreshCookie(): DbUser | null {
  try {
    const raw = localStorage.getItem(REFRESH_COOKIE_KEY);
    if (!raw) return null;
    const cookie = JSON.parse(raw) as { userId: string; expiresAt: number };
    if (cookie.expiresAt < Date.now()) return null;
    return db().users.find((user) => user.id === cookie.userId) ?? null;
  } catch {
    return null;
  }
}

/** Повертає користувача за заголовком Authorization або кидає 401/403. */
export function requireUser(request: Request, role?: Role): DbUser {
  const header = request.headers.get('Authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const session = accessTokens.get(token);
  if (!session || session.expiresAt < Date.now()) throw fail(401, 'unauthorized');

  const user = db().users.find((item) => item.id === session.userId);
  if (!user) throw fail(401, 'unauthorized');
  // Роль перевіряє сервер: приховане меню на клієнті — не захист.
  if (role && user.role !== role) throw fail(403, 'forbidden');
  return user;
}

/** Номер лічильника квартири користувача; адміністратор квартири не має. */
export function requireApartment(user: DbUser): number {
  if (user.apartmentId === null) throw fail(403, 'no_apartment');
  return user.apartmentId;
}
