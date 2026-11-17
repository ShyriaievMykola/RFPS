import { addDays, endOfMonth, isWeekend, startOfDay } from 'date-fns';

/**
 * Прогнозування споживання до кінця місяця.
 *
 * Метод: експоненційне згладжування добового споживання, окремо для буднів і вихідних
 * (профіль споживання в ці дні помітно відрізняється). Прогноз на місяць = факт на сьогодні
 * + очікуване споживання за дні, що залишились. Довірчий інтервал будується з
 * середньоквадратичної похибки однокрокового прогнозу на історії.
 */

export interface DailyPoint {
  date: Date;
  kwh: number;
}

export interface DailyModel {
  weekday: number;
  weekend: number;
  /** СКВ похибки однокрокового прогнозу, кВт·год на добу. */
  sigma: number;
}

export interface ForecastDay {
  date: Date;
  kwh: number;
  isForecast: boolean;
}

export interface MonthForecast {
  actualToDate: number;
  total: number;
  low: number;
  high: number;
  /** СКВ добової похибки моделі — з неї будується інтервал. */
  sigma: number;
  days: ForecastDay[];
}

/** Точка накопичувального графіка «факт + прогноз». */
export interface CumulativePoint {
  date: Date;
  actual: number | null;
  forecast: number | null;
  /** Межі 80-відсоткового інтервалу; null для фактичних діб. */
  band: [number, number] | null;
}

/** Коефіцієнт згладжування: 0.3 — нові дні важать більше, але один сплеск не ламає оцінку. */
export const DEFAULT_ALPHA = 0.3;
/** z-оцінка для 80-відсоткового інтервалу. */
const Z_80 = 1.2816;

export function fitDailyModel(history: readonly DailyPoint[], alpha = DEFAULT_ALPHA): DailyModel {
  const level: { weekday: number | null; weekend: number | null } = {
    weekday: null,
    weekend: null,
  };
  let squaredErrors = 0;
  let errorCount = 0;

  for (const point of history) {
    const key = isWeekend(point.date) ? 'weekend' : 'weekday';
    const previous = level[key];
    if (previous === null) {
      level[key] = point.kwh;
      continue;
    }
    const error = point.kwh - previous;
    squaredErrors += error * error;
    errorCount += 1;
    level[key] = previous + alpha * error;
  }

  // Якщо одного з типів днів в історії немає, беремо рівень іншого.
  const weekday = level.weekday ?? level.weekend ?? 0;
  const weekend = level.weekend ?? level.weekday ?? 0;
  const sigma = errorCount > 0 ? Math.sqrt(squaredErrors / errorCount) : 0;
  return { weekday, weekend, sigma };
}

export function expectedFor(date: Date, model: DailyModel): number {
  return isWeekend(date) ? model.weekend : model.weekday;
}

/**
 * @param history   завершені доби до сьогодні (за зростанням дати), на них навчається модель
 * @param monthDays доби поточного місяця з фактом, включно з неповною сьогоднішньою
 * @param now       поточний момент
 */
export function forecastMonth(
  history: readonly DailyPoint[],
  monthDays: readonly DailyPoint[],
  now: Date,
  alpha = DEFAULT_ALPHA,
): MonthForecast {
  const model = fitDailyModel(history, alpha);
  const today = startOfDay(now);
  const lastDay = startOfDay(endOfMonth(now));

  const days: ForecastDay[] = [];
  let actualToDate = 0;
  let todayActual = 0;
  for (const point of monthDays) {
    actualToDate += point.kwh;
    if (startOfDay(point.date).getTime() === today.getTime()) {
      todayActual = point.kwh;
    } else {
      days.push({ date: point.date, kwh: point.kwh, isForecast: false });
    }
  }

  // Сьогоднішня доба ще триває: прогнозуємо, що вона закриється не нижче очікуваного рівня.
  const todayExpected = Math.max(todayActual, expectedFor(today, model));
  let remaining = todayExpected - todayActual;
  days.push({ date: today, kwh: todayExpected, isForecast: true });

  let uncertainDays = remaining > 0 ? 1 : 0;
  for (let date = addDays(today, 1); date <= lastDay; date = addDays(date, 1)) {
    const kwh = expectedFor(date, model);
    remaining += kwh;
    uncertainDays += 1;
    days.push({ date, kwh, isForecast: true });
  }

  const total = actualToDate + remaining;
  // Похибки діб вважаємо незалежними, тож дисперсії додаються.
  const margin = Z_80 * model.sigma * Math.sqrt(uncertainDays);
  return {
    actualToDate,
    total,
    low: Math.max(actualToDate, total - margin),
    high: total + margin,
    sigma: model.sigma,
    days,
  };
}

/**
 * Накопичувальний ряд для графіка: суцільна лінія факту до вчора і пунктир прогнозу
 * до кінця місяця. Остання фактична точка дублюється в прогнозі, щоб лінії з'єднались.
 */
export function cumulativeSeries(forecast: MonthForecast): CumulativePoint[] {
  const points: CumulativePoint[] = [];
  let sum = 0;
  let forecastStep = 0;

  for (const day of forecast.days) {
    sum += day.kwh;
    if (!day.isForecast) {
      points.push({ date: day.date, actual: sum, forecast: null, band: null });
      continue;
    }
    if (forecastStep === 0) {
      const last = points.at(-1);
      if (last) {
        last.forecast = last.actual;
        last.band = [last.actual ?? 0, last.actual ?? 0];
      }
    }
    forecastStep += 1;
    const margin = Z_80 * forecast.sigma * Math.sqrt(forecastStep);
    points.push({
      date: day.date,
      actual: null,
      forecast: sum,
      band: [Math.max(forecast.actualToDate, sum - margin), sum + margin],
    });
  }
  return points;
}
