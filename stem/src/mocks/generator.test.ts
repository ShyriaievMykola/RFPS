import { addDays, addHours } from 'date-fns';
import {
  consumptionSeries,
  hash01,
  hourlyKwh,
  outageAt,
  outagesBetween,
  outagesForDay,
} from './generator';

describe('hash01', () => {
  it('детермінований і лежить у [0, 1)', () => {
    for (let index = 0; index < 500; index++) {
      const value = hash01(index, 7);
      expect(value).toBe(hash01(index, 7));
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('розподілений приблизно рівномірно', () => {
    let sum = 0;
    for (let index = 0; index < 5000; index++) sum += hash01(index, 3);
    expect(sum / 5000).toBeGreaterThan(0.45);
    expect(sum / 5000).toBeLessThan(0.55);
  });
});

describe('графік відключень', () => {
  const day = new Date(2026, 10, 10);

  it('відключення не перетинаються і мають додатну тривалість', () => {
    for (let offset = 0; offset < 60; offset++) {
      const outages = outagesForDay(addDays(day, offset));
      expect(outages.length).toBeLessThanOrEqual(2);
      for (const outage of outages) {
        expect(new Date(outage.start).getTime()).toBeLessThan(new Date(outage.end).getTime());
      }
      if (outages.length === 2) {
        expect(new Date(outages[0]!.end).getTime()).toBeLessThanOrEqual(
          new Date(outages[1]!.start).getTime(),
        );
      }
    }
  });

  it('outagesBetween повертає лише відключення, що перетинають проміжок', () => {
    const to = addDays(day, 3);
    for (const outage of outagesBetween(day, to)) {
      expect(new Date(outage.end).getTime()).toBeGreaterThan(day.getTime());
      expect(new Date(outage.start).getTime()).toBeLessThan(to.getTime());
    }
  });

  it('під час відключення квартира не споживає, а спільні системи працюють', () => {
    const outage = outagesBetween(day, addDays(day, 14))[0];
    expect(outage).toBeDefined();
    const hour = new Date(outage!.start);
    expect(outageAt(hour)).not.toBeNull();
    expect(hourlyKwh(12, hour)).toBe(0);
    expect(hourlyKwh(9001, hour, { survivesOutage: true })).toBeGreaterThan(0);
  });
});

describe('consumptionSeries', () => {
  const from = new Date(2026, 9, 1);
  const to = new Date(2026, 9, 8);
  const now = new Date(2026, 10, 13, 12, 0);
  const total = (points: { day: number; night: number }[]) =>
    points.reduce((sum, point) => sum + point.day + point.night, 0);

  it('дає однаковий результат при повторному виклику', () => {
    expect(consumptionSeries(12, from, to, 'day', now)).toEqual(
      consumptionSeries(12, from, to, 'day', now),
    );
  });

  it('добові дані дорівнюють сумі погодинних', () => {
    const daily = consumptionSeries(12, from, to, 'day', now);
    const hourly = consumptionSeries(12, from, to, 'hour', now);
    expect(daily).toHaveLength(7);
    expect(total(daily)).toBeCloseTo(total(hourly));
  });

  it('не повертає даних із майбутнього', () => {
    const future = consumptionSeries(12, addHours(now, 1), addHours(now, 48), 'hour', now);
    expect(future).toHaveLength(0);
  });

  it('поточну годину враховує пропорційно до часу, що минув', () => {
    // Беремо годину без відключення, інакше обидва значення були б нулями.
    let hourStart = new Date(2026, 9, 5, 14, 0);
    while (outageAt(hourStart)) hourStart = addDays(hourStart, 1);
    const halfPast = new Date(hourStart.getTime() + 30 * 60_000);

    const partial = consumptionSeries(12, hourStart, addHours(hourStart, 1), 'hour', halfPast);
    const full = consumptionSeries(12, hourStart, addHours(hourStart, 1), 'hour', now);
    expect(total(full)).toBeGreaterThan(0);
    expect(total(partial)).toBeCloseTo(total(full) / 2);
  });

  it('у різних квартир різне споживання', () => {
    expect(consumptionSeries(12, from, to, 'day', now)).not.toEqual(
      consumptionSeries(13, from, to, 'day', now),
    );
  });
});
