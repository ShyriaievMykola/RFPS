import type { PowerStatus } from '@/shared/api/types';
import { resolvePowerView, type PowerViewState } from './powerView';

const base: PowerStatus = {
  source: 'grid',
  since: '2026-11-13T08:00:00.000Z',
  generator: { state: 'off', fuelPct: 80, engineHours: 1240 },
  battery: { chargePct: 100 },
  simulated: false,
};

function onGenerator(state: PowerStatus['generator']['state']): PowerStatus {
  return { ...base, source: 'generator', generator: { ...base.generator, state } };
}

const CASES: [string, PowerStatus, PowerViewState][] = [
  ['міська мережа', base, 'grid'],
  ['акумулятори', { ...base, source: 'battery' }, 'battery'],
  ['аварія', { ...base, source: 'fault' }, 'fault'],
  ['запуск генератора', onGenerator('starting'), 'generatorStarting'],
  ['генератор працює', onGenerator('running'), 'generatorRunning'],
  ['мало палива', onGenerator('lowFuel'), 'generatorLowFuel'],
];

describe('resolvePowerView', () => {
  it('поки даних немає — стан завантаження', () => {
    expect(resolvePowerView({ data: undefined, isPending: true, isError: false })).toBe('loading');
  });

  it('помилка без даних — «немає даних»', () => {
    expect(resolvePowerView({ data: undefined, isPending: false, isError: true })).toBe('noData');
  });

  it('помилка фонового оновлення не ховає останній відомий стан', () => {
    expect(resolvePowerView({ data: base, isPending: false, isError: true })).toBe('grid');
  });

  it.each(CASES)('%s', (_name, data, expected) => {
    expect(resolvePowerView({ data, isPending: false, isError: false })).toBe(expected);
  });
});
