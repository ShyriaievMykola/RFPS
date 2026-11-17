import { en } from './en';
import { uk } from './uk';

/** Плаский список ключів без суфіксів множини: «auth.locked_few» → «auth.locked». */
function keysOf(value: unknown, prefix = ''): string[] {
  if (typeof value !== 'object' || value === null) {
    return [prefix.replace(/_(one|few|many|other)$/, '')];
  }
  return Object.entries(value).flatMap(([key, child]) =>
    keysOf(child, prefix ? `${prefix}.${key}` : key),
  );
}

describe('переклади', () => {
  const ukKeys = new Set(keysOf(uk));
  const enKeys = new Set(keysOf(en));

  it('англійська версія має всі ключі української', () => {
    expect([...ukKeys].filter((key) => !enKeys.has(key))).toEqual([]);
  });

  it('в англійській версії немає зайвих ключів', () => {
    expect([...enKeys].filter((key) => !ukKeys.has(key))).toEqual([]);
  });
});
