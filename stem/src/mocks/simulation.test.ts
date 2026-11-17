import { advanceSimulation, GENERATOR_START_MS } from './simulation';

describe('advanceSimulation', () => {
  const since = '2026-11-16T10:00:00.000Z';
  const after = (ms: number) => new Date(new Date(since).getTime() + ms);

  it('тримає «Запуск», поки не минув час запуску генератора', () => {
    expect(advanceSimulation('starting', since, after(GENERATOR_START_MS - 1))).toBe('starting');
  });

  it('переводить «Запуск» у «Працює», щойно минув час запуску', () => {
    expect(advanceSimulation('starting', since, after(GENERATOR_START_MS))).toBe('running');
  });

  it('не змінює інші стани симулятора', () => {
    for (const state of ['auto', 'grid', 'running', 'lowFuel', 'battery', 'fault'] as const) {
      expect(advanceSimulation(state, since, after(10 * GENERATOR_START_MS))).toBe(state);
    }
  });

  it('без часу початку (стара база) лишає стан як є', () => {
    expect(advanceSimulation('starting', undefined, after(10 * GENERATOR_START_MS))).toBe('starting');
  });
});
