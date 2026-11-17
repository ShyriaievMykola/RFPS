import { delay, http, HttpResponse } from 'msw';
import type { AuthResponse } from '@/shared/api/types';
import { forgotSchema, loginSchema, registerSchema } from '@/shared/lib/schemas';
import { db, hashPassword, mutate, newId, type DbUser } from '../db';
import {
  endSession,
  fail,
  issueAccessToken,
  startSession,
  toPublicUser,
  userFromRefreshCookie,
} from '../session';

const MAX_ATTEMPTS = 5;
const LOCK_MS = 30_000;

function sessionResponse(user: DbUser) {
  const body: AuthResponse = { accessToken: issueAccessToken(user.id), user: toPublicUser(user) };
  return HttpResponse.json(body);
}

export const authHandlers = [
  http.post('/api/auth/login', async ({ request }) => {
    await delay(400);
    const parsed = loginSchema.safeParse(await request.json());
    if (!parsed.success) return fail(400, 'validation');
    const email = parsed.data.email.toLowerCase();

    // Захист від перебору пароля: після кількох невдалих спроб вхід тимчасово блокується.
    const attempts = db().loginAttempts[email];
    if (attempts && attempts.lockedUntil > Date.now()) {
      const retryAfterSec = Math.ceil((attempts.lockedUntil - Date.now()) / 1000);
      return fail(429, 'locked', { retryAfterSec });
    }

    const user = db().users.find((item) => item.email === email);
    const valid =
      user !== undefined &&
      (await hashPassword(parsed.data.password, user.salt)) === user.passwordHash;

    if (!user || !valid) {
      const count = (attempts?.count ?? 0) + 1;
      const locked = count >= MAX_ATTEMPTS;
      mutate((data) => {
        data.loginAttempts[email] = {
          count: locked ? 0 : count,
          lockedUntil: locked ? Date.now() + LOCK_MS : 0,
        };
      });
      if (locked) return fail(429, 'locked', { retryAfterSec: LOCK_MS / 1000 });
      // Однакова відповідь для «немає такого email» і «хибний пароль»:
      // зловмисник не дізнається, які адреси зареєстровані.
      return fail(401, 'invalid_credentials', { attemptsLeft: MAX_ATTEMPTS - count });
    }

    mutate((data) => {
      delete data.loginAttempts[email];
    });
    startSession(user.id);
    return sessionResponse(user);
  }),

  http.post('/api/auth/register', async ({ request }) => {
    await delay(500);
    const parsed = registerSchema.safeParse(await request.json());
    if (!parsed.success) return fail(400, 'validation');
    const { inviteCode, name, password } = parsed.data;
    const email = parsed.data.email.toLowerCase();

    const invite = db().invites.find(
      (item) => item.code.toLowerCase() === inviteCode.toLowerCase() && !item.used,
    );
    if (!invite) return fail(400, 'invalid_invite');
    if (db().users.some((item) => item.email === email)) return fail(409, 'email_taken');

    const salt = newId();
    const user: DbUser = {
      id: newId(),
      name,
      email,
      role: 'resident',
      apartmentId: invite.apartmentId,
      salt,
      passwordHash: await hashPassword(password, salt),
    };
    mutate((data) => {
      data.users.push(user);
      invite.used = true;
    });
    startSession(user.id);
    return sessionResponse(user);
  }),

  http.post('/api/auth/refresh', async () => {
    await delay(150);
    const user = userFromRefreshCookie();
    return user ? sessionResponse(user) : fail(401, 'unauthorized');
  }),

  http.post('/api/auth/logout', () => {
    endSession();
    return new HttpResponse(null, { status: 204 });
  }),

  http.post('/api/auth/forgot', async ({ request }) => {
    await delay(500);
    const parsed = forgotSchema.safeParse(await request.json());
    if (!parsed.success) return fail(400, 'validation');
    // Завжди 204, незалежно від того, чи існує адреса (не розкриваємо список користувачів).
    return new HttpResponse(null, { status: 204 });
  }),
];
