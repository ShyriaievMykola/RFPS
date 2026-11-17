import type { ConsumptionPoint, Tariffs } from '@/shared/api/types';

/** Нічна зона двозонного тарифу: з 23:00 до 07:00. */
export const NIGHT_START_HOUR = 23;
export const NIGHT_END_HOUR = 7;

export function isNightHour(hour: number): boolean {
  return hour >= NIGHT_START_HOUR || hour < NIGHT_END_HOUR;
}

export function totalKwh(point: Pick<ConsumptionPoint, 'day' | 'night'>): number {
  return point.day + point.night;
}

export function sumPoints(points: readonly ConsumptionPoint[]): { day: number; night: number } {
  let day = 0;
  let night = 0;
  for (const p of points) {
    day += p.day;
    night += p.night;
  }
  return { day, night };
}

export function costOf(kwh: { day: number; night: number }, tariffs: Tariffs): number {
  return kwh.day * tariffs.day + kwh.night * tariffs.night;
}

/** Частка нічного споживання, 0..1. Для порожніх даних — 0. */
export function nightShare(kwh: { day: number; night: number }): number {
  const total = kwh.day + kwh.night;
  return total > 0 ? kwh.night / total : 0;
}
