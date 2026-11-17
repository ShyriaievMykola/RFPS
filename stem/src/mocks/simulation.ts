import type { SimulatedState } from '@/shared/api/types';

/** Скільки часу генератор виходить на робочий режим після початку відключення. */
export const GENERATOR_START_MS = 60_000;

/**
 * Симулятор поводиться як справжній генератор: «Запуск генератора» через GENERATOR_START_MS
 * сам переходить у «Працює генератор». Решту станів симулятор тримає, поки їх не змінять.
 */
export function advanceSimulation(
  state: SimulatedState,
  since: string | undefined,
  now: Date,
): SimulatedState {
  if (state !== 'starting' || since === undefined) return state;
  const elapsedMs = now.getTime() - new Date(since).getTime();
  return elapsedMs >= GENERATOR_START_MS ? 'running' : 'starting';
}
