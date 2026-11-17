import { addDays, isSameDay, startOfDay } from 'date-fns';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useOutages } from '@/shared/api/hooks';
import type { Outage } from '@/shared/api/types';
import { cn } from '@/shared/lib/cn';
import { formatTime, formatWeekday } from '@/shared/lib/format';
import { useSettingsStore } from '@/shared/stores/settings';
import { Card, CardHeader, PageHeader } from '@/shared/ui/Card';
import { SelectField } from '@/shared/ui/Field';
import { Badge, ErrorState, Skeleton } from '@/shared/ui/feedback';
import { useNow } from './useOutageReminder';

const DAYS_AHEAD = 7;
const DAY_MS = 86_400_000;
const REMINDER_OPTIONS = [0, 10, 15, 30, 60];
const HOUR_MARKS = [0, 6, 12, 18, 24];

/** Положення відключення на добовій шкалі, у відсотках від її ширини. */
function barGeometry(outage: Outage, day: Date): { left: number; width: number } {
  const dayStart = day.getTime();
  const start = Math.max(new Date(outage.start).getTime(), dayStart);
  const end = Math.min(new Date(outage.end).getTime(), dayStart + DAY_MS);
  return { left: ((start - dayStart) / DAY_MS) * 100, width: ((end - start) / DAY_MS) * 100 };
}

function DayRow({ day, outages, now }: { day: Date; outages: Outage[]; now: Date }) {
  const { t } = useTranslation();
  const today = isSameDay(day, now);
  const nowPct = ((now.getTime() - day.getTime()) / DAY_MS) * 100;

  return (
    <li className="grid gap-x-4 gap-y-2 border-t border-line py-3 first:border-t-0 sm:grid-cols-[9rem_1fr]">
      <div>
        <p className={cn('text-sm font-medium', today ? 'text-accent-text' : 'text-ink')}>
          {formatWeekday(day)}
          {today && <span className="ml-1.5 text-xs">· {t('outages.today')}</span>}
        </p>
        <p className="mt-0.5 text-xs text-ink-2">
          {outages.length === 0
            ? t('outages.noOutages')
            : outages
                .map((outage) => `${formatTime(outage.start)}–${formatTime(outage.end)}`)
                .join(', ')}
        </p>
      </div>

      {/* Шкала декоративна: ті самі інтервали вже подано текстом ліворуч. */}
      <div aria-hidden className="relative h-7 self-center rounded-md bg-surface-2">
        {HOUR_MARKS.slice(1, -1).map((hour) => (
          <span
            key={hour}
            className="absolute inset-y-0 w-px bg-line"
            style={{ left: `${(hour / 24) * 100}%` }}
          />
        ))}
        {outages.map((outage) => {
          const { left, width } = barGeometry(outage, day);
          return (
            <span
              key={outage.id}
              className={cn(
                'absolute inset-y-1 rounded',
                outage.kind === 'emergency' ? 'bg-critical' : 'bg-warning',
              )}
              style={{ left: `${left}%`, width: `${width}%` }}
            />
          );
        })}
        {today && (
          <span
            className="absolute -inset-y-1 w-0.5 rounded bg-ink"
            style={{ left: `${nowPct}%` }}
          />
        )}
      </div>
    </li>
  );
}

export function OutagesPage() {
  const { t } = useTranslation();
  const now = useNow(60_000);
  const todayStart = startOfDay(now).getTime();
  const days = useMemo(
    () => Array.from({ length: DAYS_AHEAD }, (_, index) => addDays(new Date(todayStart), index)),
    [todayStart],
  );
  const { data, isPending, isError, refetch } = useOutages(days[0]!, addDays(days[0]!, DAYS_AHEAD));
  const reminderMinutes = useSettingsStore((state) => state.reminderMinutes);
  const setReminderMinutes = useSettingsStore((state) => state.setReminderMinutes);

  return (
    <>
      <PageHeader title={t('outages.title')} description={t('outages.subtitle')} />

      <Card>
        <CardHeader
          title={t('outages.schedule')}
          subtitle={data ? t('outages.queue', { queue: data.queue }) : undefined}
          action={
            <ul className="flex flex-wrap gap-2">
              <li>
                <Badge tone="warning">{t('outages.kind.planned')}</Badge>
              </li>
              <li>
                <Badge tone="critical">{t('outages.kind.emergency')}</Badge>
              </li>
            </ul>
          }
        />
        {isPending ? (
          <Skeleton className="h-80 w-full" />
        ) : isError ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : (
          <>
            <div
              aria-hidden
              className="relative mb-1 hidden h-4 text-xs text-muted sm:ml-[10rem] sm:block"
            >
              {HOUR_MARKS.map((hour) => (
                <span
                  key={hour}
                  className="absolute -translate-x-1/2 first:translate-x-0 last:-translate-x-full"
                  style={{ left: `${(hour / 24) * 100}%` }}
                >
                  {String(hour).padStart(2, '0')}:00
                </span>
              ))}
            </div>
            <ul>
              {days.map((day) => (
                <DayRow
                  key={day.getTime()}
                  day={day}
                  now={now}
                  outages={data.outages.filter(
                    (outage) =>
                      new Date(outage.start).getTime() < day.getTime() + DAY_MS &&
                      new Date(outage.end).getTime() > day.getTime(),
                  )}
                />
              ))}
            </ul>
          </>
        )}
      </Card>

      <Card className="mt-4 max-w-md">
        <CardHeader title={t('outages.reminder')} subtitle={t('outages.reminderHint')} />
        <SelectField
          label={t('outages.remindBefore')}
          value={reminderMinutes}
          onChange={(event) => setReminderMinutes(Number(event.target.value))}
        >
          {REMINDER_OPTIONS.map((minutes) => (
            <option key={minutes} value={minutes}>
              {minutes === 0 ? t('outages.reminderOff') : t('outages.minutes', { count: minutes })}
            </option>
          ))}
        </SelectField>
      </Card>
    </>
  );
}
