import { addDays, startOfDay } from 'date-fns';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { announce } from '@/features/notifications/announce';
import { useOutages } from '@/shared/api/hooks';
import type { Outage } from '@/shared/api/types';
import { formatTime } from '@/shared/lib/format';
import { useSettingsStore } from '@/shared/stores/settings';

const CHECK_INTERVAL_MS = 30_000;

/** Найближче відключення, яке ще не закінчилось. */
export function findNextOutage(outages: readonly Outage[], now: Date): Outage | null {
  return (
    outages
      .filter((outage) => new Date(outage.end) > now)
      .sort((a, b) => a.start.localeCompare(b.start))[0] ?? null
  );
}

/** Поточний час, що оновлюється із заданим інтервалом (для перерахунку «скільки залишилось»). */
export function useNow(intervalMs = CHECK_INTERVAL_MS): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);
  return now;
}

/** Графік відключень на сьогодні й завтра — спільний запит для нагадування та дашборду. */
export function useUpcomingOutages() {
  // Залежимо від числа (початок доби), а не від об'єкта Date: запит не перезапускається щохвилини.
  const dayStart = startOfDay(useNow(60_000)).getTime();
  const range = useMemo(
    () => ({ from: new Date(dayStart), to: addDays(new Date(dayStart), 2) }),
    [dayStart],
  );
  return useOutages(range.from, range.to);
}

/** Нагадує про планове відключення за N хвилин до початку (N задається в налаштуваннях). */
export function useOutageReminder(): void {
  const { t } = useTranslation();
  const reminderMinutes = useSettingsStore((state) => state.reminderMinutes);
  const { data } = useUpcomingOutages();
  const now = useNow();
  const reminded = useRef(new Set<string>());

  useEffect(() => {
    if (reminderMinutes <= 0 || !data) return;
    const next = findNextOutage(data.outages, now);
    if (!next || reminded.current.has(next.id)) return;

    const minutesLeft = (new Date(next.start).getTime() - now.getTime()) / 60_000;
    if (minutesLeft > 0 && minutesLeft <= reminderMinutes) {
      reminded.current.add(next.id);
      announce(
        t('outages.reminderTitle', { count: Math.ceil(minutesLeft) }),
        t('outages.reminderBody', { from: formatTime(next.start), to: formatTime(next.end) }),
      );
    }
  }, [data, now, reminderMinutes, t]);
}
