import {
  addDays,
  addHours,
  getDayOfYear,
  isWeekend,
  startOfDay,
  startOfHour,
  startOfWeek,
} from 'date-fns';
import type { ConsumptionPoint, Granularity, Outage } from '@/shared/api/types';
import { isNightHour } from '@/shared/lib/tariff';

/**
 * Детермінований генератор «показів лічильників».
 * Значення залежать лише від квартири та часу, тому історія однакова після кожного
 * перезавантаження сторінки — як у справжній базі даних, але без її зберігання.
 */

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

/** Псевдовипадкове число [0, 1) з двох цілих (хеш-функція на основі mulberry32). */
export function hash01(a: number, b: number): number {
  let t = (Math.imul(a | 0, 0x9e3779b1) ^ Math.imul(b | 0, 0x85ebca6b)) >>> 0;
  t = (t + 0x6d2b79f5) >>> 0;
  let r = Math.imul(t ^ (t >>> 15), 1 | t);
  r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
  return ((r ^ (r >>> 14)) >>> 0) / 4_294_967_296;
}

// Типовий добовий профіль квартири, кВт: нічний мінімум, ранковий і вечірній піки.
const WEEKDAY_PROFILE = [
  0.16, 0.14, 0.13, 0.13, 0.14, 0.2, 0.42, 0.62, 0.55, 0.36, 0.3, 0.3, 0.34, 0.32, 0.3, 0.32, 0.4,
  0.58, 0.82, 0.95, 0.9, 0.72, 0.45, 0.26,
];
const WEEKEND_PROFILE = [
  0.18, 0.15, 0.14, 0.13, 0.13, 0.15, 0.2, 0.32, 0.5, 0.62, 0.6, 0.56, 0.6, 0.55, 0.48, 0.46, 0.5,
  0.62, 0.8, 0.9, 0.88, 0.74, 0.5, 0.3,
];

// --- Відключення -------------------------------------------------------------

function dayIndex(date: Date): number {
  const day = startOfDay(date);
  // Номер доби за місцевим календарем, стійкий до переходу на літній час.
  return Math.round((day.getTime() - day.getTimezoneOffset() * 60_000) / DAY_MS);
}

/** Графік відключень черги на одну добу: до двох вікон, вирівняних по годинах. */
const outageCache = new Map<number, Outage[]>();

export function outagesForDay(date: Date): Outage[] {
  const day = startOfDay(date);
  const index = dayIndex(day);
  // Графік доби запитується для кожної години кожного лічильника, тому кешуємо.
  const cached = outageCache.get(index);
  if (cached) return cached;
  const outages: Outage[] = [];

  const addWindow = (slot: number, startHour: number, hours: number) => {
    const start = addHours(day, startHour);
    outages.push({
      id: `${index}-${slot}`,
      start: start.toISOString(),
      end: addHours(start, hours).toISOString(),
      kind: hash01(index, 50 + slot) < 0.12 ? 'emergency' : 'planned',
    });
  };

  if (hash01(index, 1) < 0.55) {
    addWindow(0, 9 + Math.floor(hash01(index, 2) * 3), 2 + Math.floor(hash01(index, 3) * 2));
  }
  if (hash01(index, 4) < 0.45) {
    addWindow(1, 17 + Math.floor(hash01(index, 5) * 3), 2 + Math.floor(hash01(index, 6) * 3));
  }
  outageCache.set(index, outages);
  return outages;
}

export function outagesBetween(from: Date, to: Date): Outage[] {
  const result: Outage[] = [];
  for (let day = startOfDay(from); day < to; day = addDays(day, 1)) {
    for (const outage of outagesForDay(day)) {
      if (new Date(outage.end) > from && new Date(outage.start) < to) result.push(outage);
    }
  }
  return result;
}

export function outageAt(moment: Date): Outage | null {
  return (
    outagesForDay(moment).find(
      (outage) => new Date(outage.start) <= moment && moment < new Date(outage.end),
    ) ?? null
  );
}

/** Сумарна тривалість відключень від початку тижня до моменту, год. */
export function outageHoursThisWeek(moment: Date): number {
  const weekStart = startOfWeek(moment, { weekStartsOn: 1 });
  let hours = 0;
  for (const outage of outagesBetween(weekStart, moment)) {
    const end = Math.min(new Date(outage.end).getTime(), moment.getTime());
    hours += Math.max(0, end - new Date(outage.start).getTime()) / HOUR_MS;
  }
  return hours;
}

// --- Споживання --------------------------------------------------------------

/** Середня потужність лічильника за годину, кВт (без урахування відключень). */
function basePowerKw(meterId: number, hourStart: Date, scale: number): number {
  const profile = isWeekend(hourStart) ? WEEKEND_PROFILE : WEEKDAY_PROFILE;
  const base = profile[hourStart.getHours()] ?? 0.3;
  // Взимку споживання вище (освітлення, обігрів); максимум у середині січня.
  const seasonal = 1 + 0.25 * Math.cos((2 * Math.PI * (getDayOfYear(hourStart) - 15)) / 365);
  const habit = 0.7 + 0.7 * hash01(meterId, 7);
  const noise = 0.75 + 0.5 * hash01(meterId, Math.floor(hourStart.getTime() / HOUR_MS));
  return base * seasonal * habit * noise * scale;
}

export interface MeterOptions {
  /** Множник потужності: 1 — квартира, більше — спільні споживачі. */
  scale?: number;
  /** Спільні системи живляться від генератора, квартири під час відключення — ні. */
  survivesOutage?: boolean;
}

/** Споживання лічильника за годину, кВт·год. */
export function hourlyKwh(meterId: number, hourStart: Date, options: MeterOptions = {}): number {
  if (!options.survivesOutage && outageAt(hourStart)) return 0;
  return basePowerKw(meterId, hourStart, options.scale ?? 1);
}

/** Миттєва потужність, кВт: годинний рівень із дрібними коливаннями. */
export function livePowerKw(meterId: number, now: Date, options: MeterOptions = {}): number {
  if (!options.survivesOutage && outageAt(now)) return 0;
  const jitter = 0.9 + 0.2 * hash01(meterId + 1000, Math.floor(now.getTime() / 3000));
  return basePowerKw(meterId, startOfHour(now), options.scale ?? 1) * jitter;
}

function bucketStart(date: Date, granularity: Granularity): Date {
  if (granularity === 'hour') return startOfHour(date);
  if (granularity === 'day') return startOfDay(date);
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/**
 * Часовий ряд споживання на проміжку [from, to), обрізаний поточним моментом:
 * майбутнього «факту» не існує, а поточна година враховується пропорційно.
 */
export function consumptionSeries(
  meterId: number,
  from: Date,
  to: Date,
  granularity: Granularity,
  now: Date,
  options: MeterOptions = {},
): ConsumptionPoint[] {
  const buckets = new Map<number, ConsumptionPoint>();
  const end = Math.min(to.getTime(), now.getTime());

  for (let hour = startOfHour(from); hour.getTime() < end; hour = addHours(hour, 1)) {
    const elapsed = Math.min(1, (now.getTime() - hour.getTime()) / HOUR_MS);
    const kwh = hourlyKwh(meterId, hour, options) * elapsed;

    const start = bucketStart(hour, granularity);
    let bucket = buckets.get(start.getTime());
    if (!bucket) {
      bucket = { ts: start.toISOString(), day: 0, night: 0 };
      buckets.set(start.getTime(), bucket);
    }
    if (isNightHour(hour.getHours())) bucket.night += kwh;
    else bucket.day += kwh;
  }
  return [...buckets.values()];
}

export function totalBetween(
  meterId: number,
  from: Date,
  to: Date,
  now: Date,
  options: MeterOptions = {},
): number {
  return consumptionSeries(meterId, from, to, 'month', now, options).reduce(
    (sum, point) => sum + point.day + point.night,
    0,
  );
}
