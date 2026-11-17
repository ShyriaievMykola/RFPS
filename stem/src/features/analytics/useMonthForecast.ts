import { addDays, startOfDay, startOfMonth, subDays, subMonths } from 'date-fns';
import { useMemo } from 'react';
import { useNow } from '@/features/outages/useOutageReminder';
import { useConsumption, useTariffs } from '@/shared/api/hooks';
import { cumulativeSeries, forecastMonth, type DailyPoint } from '@/shared/lib/forecast';
import { costOf, nightShare, sumPoints, totalKwh } from '@/shared/lib/tariff';

/** Скільки діб історії до початку місяця бере модель прогнозу (8 повних тижнів). */
const HISTORY_DAYS = 56;

/**
 * Прогноз споживання та рахунку до кінця місяця.
 * Один запит добових даних покриває і навчання моделі, і поточний місяць, і минулий місяць для порівняння.
 */
export function useMonthForecast() {
  const now = useNow(60_000);
  const todayStart = startOfDay(now).getTime();
  const range = useMemo(() => {
    const today = new Date(todayStart);
    return { from: subDays(startOfMonth(today), HISTORY_DAYS), to: addDays(today, 1) };
  }, [todayStart]);

  const consumption = useConsumption({ ...range, granularity: 'day' });
  const tariffs = useTariffs();

  const result = useMemo(() => {
    if (!consumption.data || !tariffs.data) return null;
    const today = new Date(todayStart);
    const monthStart = startOfMonth(today);
    const previousMonthStart = subMonths(monthStart, 1);

    const history: DailyPoint[] = [];
    const monthDays: DailyPoint[] = [];
    const monthPoints = [];
    let previousMonthKwh = 0;

    for (const point of consumption.data) {
      const date = new Date(point.ts);
      const daily = { date, kwh: totalKwh(point) };
      if (date < today) history.push(daily);
      if (date >= monthStart) {
        monthDays.push(daily);
        monthPoints.push(point);
      } else if (date >= previousMonthStart) {
        previousMonthKwh += daily.kwh;
      }
    }

    const forecast = forecastMonth(history, monthDays, now);
    const monthKwh = sumPoints(monthPoints);
    const monthCost = costOf(monthKwh, tariffs.data);
    // Вартість прогнозованого залишку рахуємо за нічною часткою всієї історії:
    // на початку місяця власних даних ще замало.
    const share = nightShare(sumPoints(consumption.data));
    const priceOf = (kwh: number) =>
      costOf({ day: kwh * (1 - share), night: kwh * share }, tariffs.data);
    const remaining = forecast.total - forecast.actualToDate;

    return {
      forecast,
      cumulative: cumulativeSeries(forecast),
      monthKwh: forecast.actualToDate,
      monthCost,
      forecastCost: monthCost + priceOf(remaining),
      forecastCostLow: monthCost + priceOf(forecast.low - forecast.actualToDate),
      forecastCostHigh: monthCost + priceOf(forecast.high - forecast.actualToDate),
      previousMonthKwh,
      /** Відносна зміна прогнозу до минулого місяця; null, якщо порівнювати нема з чим. */
      changeVsPrevious: previousMonthKwh > 0 ? forecast.total / previousMonthKwh - 1 : null,
    };
    // now змінюється щохвилини разом із даними; окремо в залежностях він не потрібен.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consumption.data, tariffs.data, todayStart]);

  return {
    data: result,
    isPending: consumption.isPending || tariffs.isPending,
    isError: consumption.isError || tariffs.isError,
    refetch: () => {
      void consumption.refetch();
      void tariffs.refetch();
    },
  };
}
