import { addDays, startOfDay } from 'date-fns';
import { Activity, CalendarClock, CalendarDays, Sun, TrendingUp } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useMonthForecast } from '@/features/analytics/useMonthForecast';
import { findNextOutage, useNow, useUpcomingOutages } from '@/features/outages/useOutageReminder';
import { PowerSourceCard } from '@/features/power/PowerSourceCard';
import {
  useAnnouncements,
  useConsumption,
  useLimits,
  useLivePower,
  useTariffs,
} from '@/shared/api/hooks';
import {
  formatDateTime,
  formatKw,
  formatKwh,
  formatMoney,
  formatNumber,
  formatTime,
} from '@/shared/lib/format';
import { costOf, sumPoints } from '@/shared/lib/tariff';
import { useCurrentUser } from '@/shared/stores/auth';
import { Card, CardHeader, PageHeader } from '@/shared/ui/Card';
import { ConsumptionChart, ConsumptionTable, ViewToggle } from '@/shared/ui/charts';
import { Badge, EmptyState, ErrorState, Meter, Skeleton } from '@/shared/ui/feedback';
import { SafeHtml } from '@/shared/ui/SafeHtml';
import { Delta, StatTile } from '@/shared/ui/StatTile';

const CARD_LINK = 'text-sm font-medium text-accent-text underline-offset-2 hover:underline';

function useToday() {
  const dayStart = startOfDay(useNow(60_000)).getTime();
  return useMemo(
    () => ({ from: new Date(dayStart), to: addDays(new Date(dayStart), 1) }),
    [dayStart],
  );
}

function NextOutageCard() {
  const { t } = useTranslation();
  const now = useNow();
  const { data, isPending, isError, refetch } = useUpcomingOutages();

  let body;
  if (isPending) {
    body = <Skeleton className="h-12 w-full" />;
  } else if (isError) {
    body = <ErrorState onRetry={() => void refetch()} />;
  } else {
    const next = findNextOutage(data.outages, now);
    if (!next) {
      body = <p className="text-sm text-ink-2">{t('outages.noneSoon')}</p>;
    } else {
      const ongoing = new Date(next.start) <= now;
      const minutes = Math.max(
        1,
        Math.round((new Date(next.start).getTime() - now.getTime()) / 60_000),
      );
      body = (
        <div>
          <p className="text-lg font-semibold text-ink">
            {formatTime(next.start)}–{formatTime(next.end)}
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-ink-2">
            {ongoing
              ? t('outages.ongoing')
              : minutes < 60
                ? t('outages.startsInMinutes', { count: minutes })
                : t('outages.startsAt', { time: formatDateTime(next.start) })}
            <Badge tone={next.kind === 'emergency' ? 'critical' : 'warning'}>
              {t(`outages.kind.${next.kind}`)}
            </Badge>
          </p>
        </div>
      );
    }
  }

  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <CalendarClock className="size-4 text-ink-2" aria-hidden />
            {t('outages.next')}
          </span>
        }
        action={
          <Link to="/outages" className={CARD_LINK}>
            {t('outages.fullSchedule')}
          </Link>
        }
      />
      {body}
    </Card>
  );
}

function LimitsCard() {
  const { t } = useTranslation();
  const { data, isPending, isError, refetch } = useLimits();
  const active = data?.filter((limit) => limit.enabled) ?? [];

  return (
    <Card>
      <CardHeader
        title={t('limits.title')}
        action={
          <Link to="/limits" className={CARD_LINK}>
            {t('limits.manage')}
          </Link>
        }
      />
      {isPending ? (
        <Skeleton className="h-16 w-full" />
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : active.length === 0 ? (
        <p className="text-sm text-ink-2">{t('limits.noneActive')}</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {active.map((limit) => {
            const ratio = limit.usedKwh / limit.thresholdKwh;
            return (
              <li key={limit.id}>
                <p className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-2 text-sm">
                  <span className="text-ink">{limit.name}</span>
                  <span className="text-ink-2 tabular-nums">
                    {formatNumber(limit.usedKwh)} / {formatKwh(limit.thresholdKwh, 0)}
                  </span>
                </p>
                <Meter
                  label={limit.name}
                  value={ratio}
                  tone={ratio >= 1 ? 'critical' : ratio >= 0.8 ? 'warning' : 'accent'}
                />
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function AnnouncementsCard() {
  const { t } = useTranslation();
  const { data, isPending, isError, refetch } = useAnnouncements();

  return (
    <Card>
      <CardHeader title={t('announcements.title')} />
      {isPending ? (
        <Skeleton className="h-20 w-full" />
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : data.length === 0 ? (
        <EmptyState title={t('announcements.empty')} />
      ) : (
        <ul className="flex flex-col gap-4">
          {data.slice(0, 3).map((item) => (
            <li key={item.id}>
              <p className="font-medium text-ink">{item.title}</p>
              <p className="mb-1 text-xs text-ink-2">
                {item.author} · {formatDateTime(item.createdAt)}
              </p>
              <SafeHtml html={item.bodyHtml} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function DashboardPage() {
  const { t } = useTranslation();
  const user = useCurrentUser();
  const today = useToday();
  const [view, setView] = useState<'chart' | 'table'>('chart');

  const live = useLivePower();
  const tariffs = useTariffs();
  const hourly = useConsumption({ ...today, granularity: 'hour' });
  const month = useMonthForecast();

  const todayKwh = hourly.data ? sumPoints(hourly.data) : null;
  const todayCost = todayKwh && tariffs.data ? costOf(todayKwh, tariffs.data) : null;

  return (
    <>
      <PageHeader
        title={t('dashboard.title')}
        description={t('dashboard.subtitle', { apartment: user.apartmentId })}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <PowerSourceCard />
        </div>
        <NextOutageCard />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          icon={Activity}
          label={t('dashboard.livePower')}
          loading={live.isPending}
          value={live.data ? formatKw(live.data.powerKw) : '—'}
          hint={live.isError ? t('common.loadError') : t('dashboard.liveHint')}
        />
        <StatTile
          icon={Sun}
          label={t('dashboard.today')}
          loading={hourly.isPending}
          value={todayKwh ? formatKwh(todayKwh.day + todayKwh.night) : '—'}
          hint={todayCost !== null ? `≈ ${formatMoney(todayCost)}` : undefined}
        />
        <StatTile
          icon={CalendarDays}
          label={t('dashboard.month')}
          loading={month.isPending}
          value={month.data ? formatKwh(month.data.monthKwh, 0) : '—'}
          hint={month.data ? `≈ ${formatMoney(month.data.monthCost)}` : undefined}
        />
        <StatTile
          icon={TrendingUp}
          label={t('dashboard.forecast')}
          loading={month.isPending}
          value={month.data ? formatMoney(month.data.forecastCost) : '—'}
          hint={
            month.data && (
              <>
                {formatKwh(month.data.forecast.total, 0)}
                {month.data.changeVsPrevious !== null && (
                  <>
                    {' · '}
                    <Delta ratio={month.data.changeVsPrevious} label={t('dashboard.vsLastMonth')} />
                  </>
                )}
              </>
            )
          }
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title={t('dashboard.todayChart')}
            subtitle={t('dashboard.todayChartHint')}
            action={<ViewToggle view={view} onChange={setView} />}
          />
          {hourly.isPending ? (
            <Skeleton className="h-64 w-full" />
          ) : hourly.isError ? (
            <ErrorState onRetry={() => void hourly.refetch()} />
          ) : view === 'chart' ? (
            <ConsumptionChart
              data={hourly.data}
              granularity="hour"
              ariaLabel={t('dashboard.todayChart')}
            />
          ) : (
            <ConsumptionTable data={hourly.data} granularity="hour" />
          )}
        </Card>

        <div className="flex flex-col gap-4">
          <LimitsCard />
          <AnnouncementsCard />
        </div>
      </div>
    </>
  );
}
