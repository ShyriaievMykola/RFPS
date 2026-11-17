import {
  ArrowUpDown,
  Building2,
  Droplets,
  Home,
  Lightbulb,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { PowerSourceCard } from '@/features/power/PowerSourceCard';
import { useBuildingOverview, useSetSimulation, useSimulation } from '@/shared/api/hooks';
import type { CommonMeterId, SimulatedState } from '@/shared/api/types';
import { formatKw, formatKwh, formatPercent } from '@/shared/lib/format';
import { Card, CardHeader, PageHeader } from '@/shared/ui/Card';
import { SelectField } from '@/shared/ui/Field';
import { ErrorState, Meter, Skeleton } from '@/shared/ui/feedback';
import { StatTile } from '@/shared/ui/StatTile';

const METER_ICONS: Record<CommonMeterId, LucideIcon> = {
  elevator: ArrowUpDown,
  lighting: Lightbulb,
  pumps: Droplets,
};

const SIMULATED_STATES: readonly SimulatedState[] = [
  'auto',
  'grid',
  'starting',
  'running',
  'lowFuel',
  'battery',
  'fault',
];

/** Демонстраційний перемикач: дає показати всі стани картки живлення без очікування відключення. */
function SimulatorCard() {
  const { t } = useTranslation();
  const { data } = useSimulation();
  const setSimulation = useSetSimulation();

  return (
    <Card>
      <CardHeader title={t('admin.simulatorTitle')} subtitle={t('admin.simulatorHint')} />
      <SelectField
        label={t('admin.simulatorLabel')}
        value={data?.state ?? 'auto'}
        disabled={!data || setSimulation.isPending}
        onChange={(event) =>
          setSimulation.mutate(event.target.value as SimulatedState, {
            onError: () => toast.error(t('common.unexpectedError')),
          })
        }
      >
        {SIMULATED_STATES.map((state) => (
          <option key={state} value={state}>
            {t(`admin.simulatorStates.${state}`)}
          </option>
        ))}
      </SelectField>
    </Card>
  );
}

export function AdminOverviewPage() {
  const { t } = useTranslation();
  const { data, isPending, isError, refetch } = useBuildingOverview();
  const total = data ? data.monthKwhApartments + data.monthKwhCommon : 0;

  return (
    <>
      <PageHeader title={t('admin.title')} description={t('admin.subtitle')} />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <PowerSourceCard showDetails />
        </div>
        <SimulatorCard />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          icon={Zap}
          label={t('admin.monthTotal')}
          loading={isPending}
          value={data ? formatKwh(total, 0) : '—'}
        />
        <StatTile
          icon={Home}
          label={t('admin.monthApartments')}
          loading={isPending}
          value={data ? formatKwh(data.monthKwhApartments, 0) : '—'}
          hint={
            data && total > 0 ? formatPercent((data.monthKwhApartments / total) * 100) : undefined
          }
        />
        <StatTile
          icon={Building2}
          label={t('admin.monthCommon')}
          loading={isPending}
          value={data ? formatKwh(data.monthKwhCommon, 0) : '—'}
          hint={data && total > 0 ? formatPercent((data.monthKwhCommon / total) * 100) : undefined}
        />
        <StatTile
          icon={Home}
          label={t('admin.occupied')}
          loading={isPending}
          value={data ? `${data.apartmentsOccupied} / ${data.apartmentsTotal}` : '—'}
        />
      </div>

      <Card className="mt-4">
        <CardHeader title={t('admin.commonTitle')} subtitle={t('admin.commonHint')} />
        {isPending ? (
          <Skeleton className="h-40 w-full" />
        ) : isError ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : (
          <ul className="flex flex-col gap-5">
            {data.meters.map((meter) => {
              const Icon = METER_ICONS[meter.id];
              return (
                <li key={meter.id}>
                  <p className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-4 text-sm">
                    <span className="flex items-center gap-2 font-medium text-ink">
                      <Icon className="size-4 self-center text-ink-2" aria-hidden />
                      {t(`admin.meters.${meter.id}`)}
                    </span>
                    <span className="text-ink-2 tabular-nums">
                      {t('admin.meterNow', { power: formatKw(meter.powerKw) })} ·{' '}
                      <span className="font-medium text-ink">{formatKwh(meter.monthKwh, 0)}</span>
                    </span>
                  </p>
                  <Meter
                    label={t(`admin.meters.${meter.id}`)}
                    value={data.monthKwhCommon > 0 ? meter.monthKwh / data.monthKwhCommon : 0}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </>
  );
}
