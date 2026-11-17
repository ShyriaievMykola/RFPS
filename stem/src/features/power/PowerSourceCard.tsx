import {
  BatteryMedium,
  CircleAlert,
  Fuel,
  LoaderCircle,
  PlugZap,
  TriangleAlert,
  Unplug,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { usePowerStatus } from '@/shared/api/hooks';
import { cn } from '@/shared/lib/cn';
import { formatDateTime, formatPercent } from '@/shared/lib/format';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Badge, Meter, Skeleton } from '@/shared/ui/feedback';
import { resolvePowerView, type PowerViewState } from './powerView';

type Tone = 'good' | 'warning' | 'serious' | 'critical' | 'neutral';

interface StateLook {
  icon: LucideIcon;
  tone: Tone;
  spin?: boolean;
}

// Кожен стан має власну іконку й підпис: колір лише підсилює, а не несе значення сам.
const LOOKS: Record<Exclude<PowerViewState, 'loading'>, StateLook> = {
  noData: { icon: Unplug, tone: 'neutral' },
  grid: { icon: PlugZap, tone: 'good' },
  generatorStarting: { icon: LoaderCircle, tone: 'warning', spin: true },
  generatorRunning: { icon: Zap, tone: 'warning' },
  generatorLowFuel: { icon: Fuel, tone: 'serious' },
  battery: { icon: BatteryMedium, tone: 'warning' },
  fault: { icon: CircleAlert, tone: 'critical' },
};

const ICON_TONES: Record<Tone, string> = {
  good: 'bg-good/15 text-good-text',
  warning: 'bg-warning/25 text-ink',
  serious: 'bg-serious/25 text-ink',
  critical: 'bg-critical/15 text-critical-text',
  neutral: 'bg-surface-2 text-ink-2',
};

export function PowerSourceCard({ showDetails = false }: { showDetails?: boolean }) {
  const { t } = useTranslation();
  const query = usePowerStatus();
  const state = resolvePowerView(query);

  if (state === 'loading') {
    return (
      <Card aria-busy data-state="loading" aria-label={t('power.title')}>
        <div className="flex items-center gap-4">
          <Skeleton className="size-12 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-6 w-48" />
          </div>
        </div>
      </Card>
    );
  }

  const look = LOOKS[state];
  const Icon = look.icon;
  const status = query.data;
  const isAlert = state === 'fault' || state === 'generatorLowFuel';

  return (
    <Card data-state={state} aria-label={t('power.title')}>
      <div className="flex items-start gap-4">
        <span
          className={cn(
            'grid size-12 shrink-0 place-items-center rounded-full',
            ICON_TONES[look.tone],
          )}
        >
          <Icon className={cn('size-6', look.spin && 'animate-spin')} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 text-sm text-ink-2">
            {t('power.title')}
            {status?.simulated && <Badge tone="accent">{t('power.simulated')}</Badge>}
          </p>
          {/* role=status: зміну джерела живлення озвучить екранний диктор; аварію — негайно. */}
          <p role={isAlert ? 'alert' : 'status'} className="mt-0.5 text-lg font-semibold text-ink">
            {t(`power.state.${state}.title`)}
          </p>
          <p className="mt-1 text-sm text-ink-2">
            {t(`power.state.${state}.hint`)}
            {status && state !== 'grid' && state !== 'noData' && (
              <> {t('power.since', { time: formatDateTime(status.since) })}</>
            )}
          </p>
          {state === 'noData' && (
            <Button
              variant="secondary"
              size="sm"
              className="mt-3"
              loading={query.isFetching}
              onClick={() => void query.refetch()}
            >
              {t('common.retry')}
            </Button>
          )}
        </div>
      </div>

      {showDetails && status && (
        <dl className="mt-5 grid gap-4 border-t border-line pt-4 sm:grid-cols-3">
          <div>
            <dt className="flex items-center justify-between text-sm text-ink-2">
              {t('power.fuel')}
              <span className="font-medium text-ink">
                {formatPercent(status.generator.fuelPct)}
              </span>
            </dt>
            <dd className="mt-2">
              <Meter
                label={t('power.fuel')}
                value={status.generator.fuelPct / 100}
                tone={status.generator.fuelPct < 20 ? 'critical' : 'accent'}
              />
              {status.generator.fuelPct < 20 && (
                <p className="mt-1.5 flex items-center gap-1 text-xs text-critical-text">
                  <TriangleAlert className="size-3.5" aria-hidden />
                  {t('power.refuel')}
                </p>
              )}
            </dd>
          </div>
          <div>
            <dt className="flex items-center justify-between text-sm text-ink-2">
              {t('power.battery')}
              <span className="font-medium text-ink">
                {formatPercent(status.battery.chargePct)}
              </span>
            </dt>
            <dd className="mt-2">
              <Meter
                label={t('power.battery')}
                value={status.battery.chargePct / 100}
                tone={status.battery.chargePct < 20 ? 'critical' : 'good'}
              />
            </dd>
          </div>
          <div>
            <dt className="text-sm text-ink-2">{t('power.engineHours')}</dt>
            <dd className="mt-1 text-lg font-semibold text-ink">
              {t('power.hoursValue', { count: status.generator.engineHours })}
            </dd>
          </div>
        </dl>
      )}
    </Card>
  );
}
