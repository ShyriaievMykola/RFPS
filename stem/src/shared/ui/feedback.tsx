import { CircleAlert, Inbox } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/shared/lib/cn';
import { Button } from './Button';

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('animate-pulse rounded-md bg-surface-2', className)} />;
}

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
      <Inbox className="size-8 text-muted" aria-hidden />
      <p className="font-medium text-ink">{title}</p>
      {description && <p className="max-w-sm text-sm text-ink-2">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

interface ErrorStateProps {
  onRetry?: () => void;
  message?: string;
}

export function ErrorState({ onRetry, message }: ErrorStateProps) {
  const { t } = useTranslation();
  return (
    <div role="alert" className="flex flex-col items-center gap-2 px-4 py-8 text-center">
      <CircleAlert className="size-8 text-critical" aria-hidden />
      <p className="font-medium text-ink">{message ?? t('common.loadError')}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          {t('common.retry')}
        </Button>
      )}
    </div>
  );
}

type Tone = 'neutral' | 'good' | 'warning' | 'serious' | 'critical' | 'accent';

const BADGE_TONES: Record<Tone, string> = {
  neutral: 'bg-surface-2 text-ink-2',
  good: 'bg-good/15 text-good-text',
  warning: 'bg-warning/25 text-ink',
  serious: 'bg-serious/25 text-ink',
  critical: 'bg-critical/15 text-critical-text',
  accent: 'bg-accent-soft text-accent-text',
};

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        BADGE_TONES[tone],
      )}
    >
      {children}
    </span>
  );
}

const METER_TONES = {
  accent: { fill: 'bg-series-1', track: 'bg-series-1/20' },
  warning: { fill: 'bg-warning', track: 'bg-warning/25' },
  critical: { fill: 'bg-critical', track: 'bg-critical/20' },
  good: { fill: 'bg-good', track: 'bg-good/20' },
} as const;

interface MeterProps {
  /** Заповнення 0..1; значення понад 1 показується як повна шкала. */
  value: number;
  tone?: keyof typeof METER_TONES;
  label: string;
}

export function Meter({ value, tone = 'accent', label }: MeterProps) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  const colors = METER_TONES[tone];
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      className={cn('h-2 w-full overflow-hidden rounded-full', colors.track)}
    >
      <div className={cn('h-full rounded-full', colors.fill)} style={{ width: `${pct}%` }} />
    </div>
  );
}
