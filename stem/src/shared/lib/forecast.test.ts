import { addDays } from 'date-fns';
import { cumulativeSeries, fitDailyModel, forecastMonth, type DailyPoint } from './forecast';

/** Історія з постійним споживанням: будні — weekday кВт·год, вихідні — weekend. */
function steadyHistory(from: Date, days: number, weekday: number, weekend: number): DailyPoint[] {
  return Array.from({ length: days }, (_, index) => {
    const date = addDays(from, index);
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    return { date, kwh: isWeekend ? weekend : weekday };
  });
}

describe('fitDailyModel', () => {
  it('оцінює будні та вихідні окремо', () => {
    const model = fitDailyModel(steadyHistory(new Date(2026, 8, 1), 56, 8, 12));
    expect(model.weekday).toBeCloseTo(8);
    expect(model.weekend).toBeCloseTo(12);
    expect(model.sigma).toBeCloseTo(0);
  });

  it('свіжі дні важать більше за давні', () => {
    const history = steadyHistory(new Date(2026, 8, 1), 28, 8, 8);
    const grown = history.map((point, index) => (index >= 21 ? { ...point, kwh: 16 } : point));
    const model = fitDailyModel(grown);
    expect(model.weekday).toBeGreaterThan(12);
    expect(model.weekday).toBeLessThan(16);
    expect(model.sigma).toBeGreaterThan(0);
  });

  it('без історії повертає нулі, а не NaN', () => {
    expect(fitDailyModel([])).toEqual({ weekday: 0, weekend: 0, sigma: 0 });
  });

  it('якщо вихідних в історії немає, бере рівень буднів', () => {
    // 2 листопада 2026 — понеділок
    const model = fitDailyModel(steadyHistory(new Date(2026, 10, 2), 5, 9, 99));
    expect(model.weekend).toBeCloseTo(9);
  });
});

describe('forecastMonth', () => {
  // П'ятниця 13 листопада 2026, полудень; у листопаді 30 днів.
  const now = new Date(2026, 10, 13, 12, 0);
  const history = steadyHistory(new Date(2026, 8, 18), 56, 10, 10);
  const monthDays = [
    ...steadyHistory(new Date(2026, 10, 1), 12, 10, 10),
    { date: new Date(2026, 10, 13), kwh: 4 },
  ];

  it('дорівнює факту плюс очікуване за решту днів', () => {
    const forecast = forecastMonth(history, monthDays, now);
    expect(forecast.actualToDate).toBeCloseTo(124);
    // 12 повних діб + сьогодні + 17 майбутніх = 30 діб по 10 кВт·год
    expect(forecast.total).toBeCloseTo(300);
    expect(forecast.days).toHaveLength(30);
    expect(forecast.days.filter((day) => day.isForecast)).toHaveLength(18);
  });

  it('при стабільному споживанні інтервал вироджується в точку', () => {
    const forecast = forecastMonth(history, monthDays, now);
    expect(forecast.low).toBeCloseTo(forecast.total);
    expect(forecast.high).toBeCloseTo(forecast.total);
  });

  it('не прогнозує менше, ніж уже спожито сьогодні', () => {
    const heavyToday = [...monthDays.slice(0, -1), { date: new Date(2026, 10, 13), kwh: 25 }];
    const forecast = forecastMonth(history, heavyToday, now);
    expect(forecast.total).toBeCloseTo(120 + 25 + 170);
    expect(forecast.low).toBeGreaterThanOrEqual(forecast.actualToDate);
  });

  it('інтервал розширюється, коли споживання нестабільне', () => {
    const noisy = history.map((point, index) => ({ ...point, kwh: index % 2 === 0 ? 6 : 14 }));
    const forecast = forecastMonth(noisy, monthDays, now);
    expect(forecast.high - forecast.low).toBeGreaterThan(10);
    expect(forecast.low).toBeLessThan(forecast.total);
    expect(forecast.high).toBeGreaterThan(forecast.total);
  });

  it('в останній день місяця прогнозує лише залишок доби', () => {
    const lastDay = new Date(2026, 10, 30, 18, 0);
    const days = [
      ...steadyHistory(new Date(2026, 10, 1), 29, 10, 10),
      { date: new Date(2026, 10, 30), kwh: 7 },
    ];
    const forecast = forecastMonth(history, days, lastDay);
    expect(forecast.total).toBeCloseTo(300);
  });
});

describe('cumulativeSeries', () => {
  const now = new Date(2026, 10, 13, 12, 0);
  const history = steadyHistory(new Date(2026, 8, 18), 56, 10, 10);
  const monthDays = [
    ...steadyHistory(new Date(2026, 10, 1), 12, 10, 10),
    { date: new Date(2026, 10, 13), kwh: 4 },
  ];
  const series = cumulativeSeries(forecastMonth(history, monthDays, now));

  it('накопичує споживання й закінчується прогнозом на місяць', () => {
    expect(series).toHaveLength(30);
    expect(series[0]?.actual).toBeCloseTo(10);
    expect(series.at(-1)?.forecast).toBeCloseTo(300);
  });

  it('з’єднує лінії факту й прогнозу в останній фактичній точці', () => {
    const joint = series[11];
    expect(joint?.actual).toBeCloseTo(120);
    expect(joint?.forecast).toBeCloseTo(120);
    expect(series[12]?.actual).toBeNull();
  });
});
