import { startOfDay, startOfMonth } from 'date-fns';
import { delay, http, HttpResponse } from 'msw';
import type {
  AppNotification,
  ConsumptionPoint,
  Granularity,
  Limit,
  LiveReading,
  OutageSchedule,
  PowerStatus,
} from '@/shared/api/types';
import { limitSchema, tariffsSchema } from '@/shared/lib/schemas';
import { db, mutate, newId, type DbLimit, type DbUser } from '../db';
import {
  consumptionSeries,
  livePowerKw,
  outageAt,
  outageHoursThisWeek,
  outagesBetween,
  totalBetween,
} from '../generator';
import { fail, requireApartment, requireUser } from '../session';
import { advanceSimulation, GENERATOR_START_MS } from '../simulation';
const FUEL_PER_OUTAGE_HOUR = 3.5;
const LOW_FUEL_PCT = 20;
const BASE_ENGINE_HOURS = 1240;
const MAX_RANGE_MS = 400 * 86_400_000;

/** Переводить симулятор далі, якщо генератор уже мав вийти на робочий режим. */
export function syncSimulation(now: Date): void {
  const { simulation, simulationSince } = db();
  const next = advanceSimulation(simulation, simulationSince, now);
  if (next !== simulation) {
    mutate((data) => {
      data.simulation = next;
    });
  }
}

/** Стан електроживлення будинку: з графіка відключень або з симулятора адміністратора. */
export function computePowerStatus(now: Date): PowerStatus {
  const outage = outageAt(now);
  // Бак доливають щопонеділка; далі паливо витрачається пропорційно годинам роботи.
  const fuelPct = Math.max(4, Math.round(100 - outageHoursThisWeek(now) * FUEL_PER_OUTAGE_HOUR));
  const engineHours = Math.round(BASE_ENGINE_HOURS + outageHoursThisWeek(now));
  const status: PowerStatus = {
    source: 'grid',
    since: startOfDay(now).toISOString(),
    generator: { state: 'off', fuelPct, engineHours },
    battery: { chargePct: 100 },
    simulated: false,
  };

  syncSimulation(now);
  const { simulation, simulationSince } = db();
  if (simulation !== 'auto') {
    status.simulated = true;
    status.since = simulationSince ?? new Date(now.getTime() - 12 * 60_000).toISOString();
    if (simulation === 'grid') return status;
    if (simulation === 'fault') return { ...status, source: 'fault', battery: { chargePct: 0 } };
    if (simulation === 'battery')
      return { ...status, source: 'battery', battery: { chargePct: 64 } };
    const fuel = simulation === 'lowFuel' ? 12 : Math.max(fuelPct, 55);
    return {
      ...status,
      source: 'generator',
      generator: { state: simulation, fuelPct: fuel, engineHours },
    };
  }

  if (!outage) return status;

  const start = new Date(outage.start);
  status.since = outage.start;
  const elapsedMs = now.getTime() - start.getTime();
  if (elapsedMs < GENERATOR_START_MS) {
    status.source = 'generator';
    status.generator.state = 'starting';
  } else {
    status.source = 'generator';
    status.generator.state = fuelPct < LOW_FUEL_PCT ? 'lowFuel' : 'running';
  }
  return status;
}

function limitPeriodStart(limit: DbLimit, now: Date): Date {
  return limit.period === 'day' ? startOfDay(now) : startOfMonth(now);
}

function withUsage(limit: DbLimit, apartmentId: number, now: Date): Limit {
  const { userId: _userId, ...rest } = limit;
  return { ...rest, usedKwh: totalBetween(apartmentId, limitPeriodStart(limit, now), now, now) };
}

/** Створює сповіщення про ліміти, яких досягнуто в поточному періоді (по одному на подію). */
function syncLimitNotifications(user: DbUser, now: Date): void {
  if (user.apartmentId === null) return;
  const apartmentId = user.apartmentId;

  for (const limit of db().limits) {
    if (limit.userId !== user.id || !limit.enabled) continue;
    const used = withUsage(limit, apartmentId, now).usedKwh;
    const ratio = used / limit.thresholdKwh;
    const kind = ratio >= 1 ? 'limitExceeded' : ratio >= 0.8 ? 'limitWarning' : null;
    if (!kind) continue;

    const key = `${kind}:${limit.id}:${limitPeriodStart(limit, now).toISOString()}`;
    if (db().notifications.some((item) => item.userId === user.id && item.key === key)) continue;
    mutate((data) => {
      data.notifications.push({
        id: newId(),
        userId: user.id,
        key,
        kind,
        params: {
          name: limit.name,
          used: Math.round(used * 10) / 10,
          threshold: limit.thresholdKwh,
        },
        createdAt: now.toISOString(),
        read: false,
      });
    });
  }
}

function parseRange(url: URL): { from: Date; to: Date } | null {
  const from = new Date(url.searchParams.get('from') ?? '');
  const to = new Date(url.searchParams.get('to') ?? '');
  const valid =
    !Number.isNaN(from.getTime()) &&
    !Number.isNaN(to.getTime()) &&
    from < to &&
    to.getTime() - from.getTime() <= MAX_RANGE_MS;
  return valid ? { from, to } : null;
}

export const energyHandlers = [
  http.get('/api/power/status', async ({ request }) => {
    requireUser(request);
    await delay(250);
    return HttpResponse.json(computePowerStatus(new Date()));
  }),

  http.get('/api/consumption/live', async ({ request }) => {
    const apartmentId = requireApartment(requireUser(request));
    await delay(150);
    const now = new Date();
    const body: LiveReading = { ts: now.toISOString(), powerKw: livePowerKw(apartmentId, now) };
    return HttpResponse.json(body);
  }),

  http.get('/api/consumption', async ({ request }) => {
    const apartmentId = requireApartment(requireUser(request));
    const url = new URL(request.url);
    const range = parseRange(url);
    const granularity = url.searchParams.get('granularity') as Granularity | null;
    if (!range || !granularity || !['hour', 'day', 'month'].includes(granularity)) {
      return fail(400, 'validation');
    }
    await delay(350);
    const body: ConsumptionPoint[] = consumptionSeries(
      apartmentId,
      range.from,
      range.to,
      granularity,
      new Date(),
    );
    return HttpResponse.json(body);
  }),

  http.get('/api/outages', async ({ request }) => {
    requireUser(request);
    const range = parseRange(new URL(request.url));
    if (!range) return fail(400, 'validation');
    await delay(300);
    const body: OutageSchedule = { queue: '3.2', outages: outagesBetween(range.from, range.to) };
    return HttpResponse.json(body);
  }),

  http.get('/api/tariffs', ({ request }) => {
    requireUser(request);
    return HttpResponse.json(db().tariffs);
  }),

  http.put('/api/tariffs', async ({ request }) => {
    requireUser(request, 'admin');
    const parsed = tariffsSchema.safeParse(await request.json());
    if (!parsed.success) return fail(400, 'validation');
    await delay(300);
    return HttpResponse.json(mutate((data) => (data.tariffs = parsed.data)));
  }),

  // --- Ліміти ---

  http.get('/api/limits', async ({ request }) => {
    const user = requireUser(request);
    const apartmentId = requireApartment(user);
    await delay(300);
    const now = new Date();
    const limits = db()
      .limits.filter((limit) => limit.userId === user.id)
      .map((limit) => withUsage(limit, apartmentId, now));
    return HttpResponse.json(limits);
  }),

  http.post('/api/limits', async ({ request }) => {
    const user = requireUser(request);
    const apartmentId = requireApartment(user);
    const parsed = limitSchema.safeParse(await request.json());
    if (!parsed.success) return fail(400, 'validation');
    await delay(300);
    const limit: DbLimit = { ...parsed.data, id: newId(), userId: user.id };
    mutate((data) => data.limits.push(limit));
    return HttpResponse.json(withUsage(limit, apartmentId, new Date()), { status: 201 });
  }),

  http.patch('/api/limits/:id', async ({ request, params }) => {
    const user = requireUser(request);
    const apartmentId = requireApartment(user);
    const parsed = limitSchema.partial().safeParse(await request.json());
    if (!parsed.success) return fail(400, 'validation');
    // Шукаємо лише серед лімітів цього користувача — чужий запис змінити не можна.
    const limit = db().limits.find((item) => item.id === params.id && item.userId === user.id);
    if (!limit) return fail(404, 'not_found');
    await delay(250);
    mutate(() => Object.assign(limit, parsed.data));
    return HttpResponse.json(withUsage(limit, apartmentId, new Date()));
  }),

  http.delete('/api/limits/:id', async ({ request, params }) => {
    const user = requireUser(request);
    const exists = db().limits.some((item) => item.id === params.id && item.userId === user.id);
    if (!exists) return fail(404, 'not_found');
    await delay(250);
    mutate((data) => {
      data.limits = data.limits.filter((item) => item.id !== params.id);
    });
    return new HttpResponse(null, { status: 204 });
  }),

  // --- Сповіщення ---

  http.get('/api/notifications', async ({ request }) => {
    const user = requireUser(request);
    syncLimitNotifications(user, new Date());
    await delay(200);
    const body: AppNotification[] = db()
      .notifications.filter((item) => item.userId === user.id)
      .map(({ userId: _userId, key: _key, ...notification }) => notification)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 30);
    return HttpResponse.json(body);
  }),

  http.post('/api/notifications/read', ({ request }) => {
    const user = requireUser(request);
    mutate((data) => {
      for (const item of data.notifications) {
        if (item.userId === user.id) item.read = true;
      }
    });
    return new HttpResponse(null, { status: 204 });
  }),
];
