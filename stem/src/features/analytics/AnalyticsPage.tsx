import { addDays, startOfDay, startOfMonth, subDays, subMonths } from 'date-fns';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNow } from '@/features/outages/useOutageReminder';
import { useConsumption, useLimits, useTariffs } from '@/shared/api/hooks';
import type { Granularity } from '@/shared/api/types';
import { cn } from '@/shared/lib/cn';
import { formatKwh, formatMoney, formatPercent } from '@/shared/lib/format';
import { costOf, nightShare, sumPoints } from '@/shared/lib/tariff';
import { Card, CardHeader, PageHeader } from '@/shared/ui/Card';
import {
  ConsumptionChart,
  ConsumptionTable,
  ForecastChart,
  ForecastTable,
  ViewToggle,
} from '@/shared/ui/charts';
import { EmptyState, ErrorState, Skeleton } from '@/shared/ui/feedback';
import { Delta, StatTile } from '@/shared/ui/StatTile';
import { useMonthForecast } from './useMonthForecast';

type PeriodId = 'today' | 'week' | 'month' | 'year';

interface Period {
  id: PeriodId;
  granularity: Granularity;
  range: (today: Date) => { from: Date; to: Date };
}

// Кожен період має власну деталізацію: доба — по годинах, рік — по місяцях.
const PERIODS: readonly Period[] = [
  { id: 'today', granularity: 'hour', range: (today) => ({ from: today, to: addDays(today, 1) }) },
  {
    id: 'week',
    granularity: 'day',
    range: (today) => ({ from: subDays(today, 6), to: addDays(today, 1) }),
  },
  {
    id: 'month',
    granularity: 'day',
    range: (today) => ({ from: subDays(today, 29), to: addDays(today, 1) }),
  },
  {
    id: 'year',
    granularity: 'month',
    range: (today) => ({ from: subMonths(startOfMonth(today), 11), to: addDays(today, 1) }),
  },
];

function ForecastSection() {
  const { t } = useTranslation();
  const [view, setView] = useState<'chart' | 'table'>('chart');
  const month = useMonthForecast();
  const limits = useLimits();
  const monthLimit = limits.data?.find((limit) => limit.enabled && limit.period === 'month');

  return (
    <Card className="mt-4">
      <CardHeader
        title={t('analytics.forecastTitle')}
        subtitle={t('analytics.forecastSubtitle')}
        action={<ViewToggle view={view} onChange={setView} />}
      />
      {month.isPending ? (
        <Skeleton className="h-72 w-full" />
      ) : month.isError || !month.data ? (
        <ErrorState onRetry={month.refetch} />
      ) : (
        <>
          <dl className="mb-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
            <div>
              <dt className="text-xs text-ink-2">{t('analytics.actualToDate')}</dt>
              <dd className="text-lg font-semibold text-ink">
                {formatKwh(month.data.monthKwh, 0)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-ink-2">{t('analytics.forecastTotal')}</dt>
              <dd className="text-lg font-semibold text-ink">
                {formatKwh(month.data.forecast.total, 0)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-ink-2">{t('analytics.forecastBill')}</dt>
              <dd className="text-lg font-semibold text-ink">
                {formatMoney(month.data.forecastCost)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-ink-2">{t('analytics.billRange')}</dt>
              <dd className="text-sm font-medium text-ink">
                {formatMoney(month.data.forecastCostLow)} –{' '}
                {formatMoney(month.data.forecastCostHigh)}
              </dd>
            </div>
          </dl>

          {view === 'chart' ? (
            <ForecastChart
              data={month.data.cumulative}
              limitKwh={monthLimit?.thresholdKwh}
              ariaLabel={t('analytics.forecastTitle')}
            />
          ) : (
            <ForecastTable data={month.data.cumulative} />
          )}

          <p className="mt-3 text-sm text-ink-2">
            {month.data.changeVsPrevious !== null && (
              <>
                <Delta
                  ratio={month.data.changeVsPrevious}
                  label={t('analytics.vsLastMonth')}
                />{' '}
              </>
            )}
            {monthLimit &&
              (month.data.forecast.total > monthLimit.thresholdKwh
                ? t('analytics.limitWillExceed', { name: monthLimit.name })
                : t('analytics.limitOk', { name: monthLimit.name }))}
          </p>
          <details className="mt-3 text-sm text-ink-2">
            <summary className="cursor-pointer font-medium text-ink">
              {t('analytics.howTitle')}
            </summary>
            <p className="mt-2">{t('analytics.howText')}</p>
          </details>
        </>
      )}
    </Card>
  );
}

export function AnalyticsPage() {
  const { t } = useTranslation();
  const [periodId, setPeriodId] = useState<PeriodId>('week');
  const [view, setView] = useState<'chart' | 'table'>('chart');
  const period = PERIODS.find((item) => item.id === periodId) ?? PERIODS[0]!;

  const now = useNow(60_000);
  const todayStart = startOfDay(now).getTime();
  const range = useMemo(() => period.range(new Date(todayStart)), [period, todayStart]);

  const consumption = useConsumption({ ...range, granularity: period.granularity });
  const tariffs = useTariffs();

  const totals = consumption.data ? sumPoints(consumption.data) : null;
  const total = totals ? totals.day + totals.night : 0;
  // Середнє рахуємо лише за ту частину періоду, що вже минула.
  const elapsedMs = Math.min(now.getTime(), range.to.getTime()) - range.from.getTime();
  const days = Math.max(1, Math.round(elapsedMs / 86_400_000));
  const statsLoading = consumption.isPending || tariffs.isPending;

  return (
    <>
      <PageHeader title={t('analytics.title')} description={t('analytics.subtitle')} />

      {/* Фільтр періоду — один ряд над усіма графіками сторінки */}
      <div
        role="group"
        aria-label={t('analytics.period')}
        className="mb-4 flex w-full gap-1 overflow-x-auto rounded-lg border border-line bg-surface p-1 sm:w-fit"
      >
        {PERIODS.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={item.id === periodId}
            onClick={() => setPeriodId(item.id)}
            className={cn(
              'min-h-9 flex-1 rounded-md px-3 text-sm font-medium whitespace-nowrap',
              item.id === periodId ? 'bg-accent text-white' : 'text-ink-2 hover:bg-surface-2',
            )}
          >
            {t(`analytics.periods.${item.id}`)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          label={t('analytics.total')}
          loading={statsLoading}
          value={formatKwh(total, total < 100 ? 1 : 0)}
        />
        <StatTile
          label={t('analytics.cost')}
          loading={statsLoading}
          value={totals && tariffs.data ? formatMoney(costOf(totals, tariffs.data)) : '—'}
        />
        <StatTile
          label={t('analytics.average')}
          loading={statsLoading}
          value={formatKwh(total / days)}
        />
        <StatTile
          label={t('analytics.nightShare')}
          loading={statsLoading}
          value={totals ? formatPercent(nightShare(totals) * 100) : '—'}
          hint={t('analytics.nightShareHint')}
        />
      </div>

      <Card className="mt-4">
        <CardHeader
          title={t('analytics.chartTitle')}
          subtitle={t(`analytics.granularity.${period.granularity}`)}
          action={<ViewToggle view={view} onChange={setView} />}
        />
        {consumption.isPending ? (
          <Skeleton className="h-72 w-full" />
        ) : consumption.isError ? (
          <ErrorState onRetry={() => void consumption.refetch()} />
        ) : consumption.data.length === 0 ? (
          <EmptyState title={t('analytics.noData')} />
        ) : view === 'chart' ? (
          <div className={cn(consumption.isPlaceholderData && 'opacity-60')}>
            <ConsumptionChart
              data={consumption.data}
              granularity={period.granularity}
              ariaLabel={t('analytics.chartTitle')}
            />
          </div>
        ) : (
          <ConsumptionTable data={consumption.data} granularity={period.granularity} />
        )}
      </Card>

      <ForecastSection />
    </>
  );
}
