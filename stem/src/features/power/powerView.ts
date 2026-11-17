import type { PowerStatus } from '@/shared/api/types';

/**
 * Стани картки «Джерело живлення» — саме вони зображені на діаграмі станів
 * у пояснювальній записці. Картка завжди перебуває рівно в одному з них.
 */
export type PowerViewState =
  | 'loading'
  | 'noData'
  | 'grid'
  | 'generatorStarting'
  | 'generatorRunning'
  | 'generatorLowFuel'
  | 'battery'
  | 'fault';

interface QuerySnapshot {
  data: PowerStatus | undefined;
  isPending: boolean;
  isError: boolean;
}

export function resolvePowerView({ data, isPending, isError }: QuerySnapshot): PowerViewState {
  // Дані, що вже є, важливіші за помилку фонового оновлення: показуємо останній відомий стан.
  if (!data) return isPending && !isError ? 'loading' : 'noData';

  switch (data.source) {
    case 'grid':
      return 'grid';
    case 'battery':
      return 'battery';
    case 'fault':
      return 'fault';
    case 'generator':
      if (data.generator.state === 'starting') return 'generatorStarting';
      if (data.generator.state === 'lowFuel') return 'generatorLowFuel';
      return 'generatorRunning';
  }
}
