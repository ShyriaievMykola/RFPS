import { ArrowDownRight, ArrowUpRight, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';
import { formatDelta } from '@/shared/lib/format';
import { Skeleton } from './feedback';

interface StatTileProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: LucideIcon;
  loading?: boolean;
}

export function StatTile({ label, value, hint, icon: Icon, loading = false }: StatTileProps) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <p className="flex items-center gap-1.5 text-sm text-ink-2">
        {Icon && <Icon className="size-4" aria-hidden />}
        {label}
      </p>
      {loading ? (
        <div aria-hidden className="mt-2 space-y-2">
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-4 w-32" />
        </div>
      ) : (
        <>
          <p className="mt-1 text-xl font-semibold text-ink sm:text-2xl">{value}</p>
          {hint && <p className="mt-1 text-sm text-ink-2">{hint}</p>}
        </>
      )}
    </div>
  );
}

/**
 * Зміна відносно попереднього періоду. Для споживання зростання — це погано,
 * тому «вгору» має застережний колір; напрямок дублює стрілка, щоб не покладатися на колір.
 */
export function Delta({ ratio, label }: { ratio: number; label: string }) {
  const up = ratio > 0.005;
  const down = ratio < -0.005;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className="inline-flex flex-wrap items-center gap-x-1">
      <span
        className={cn(
          'inline-flex items-center font-medium',
          up && 'text-critical-text',
          down && 'text-good-text',
        )}
      >
        {(up || down) && <Icon className="size-4" aria-hidden />}
        {formatDelta(ratio)}
      </span>
      {label}
    </span>
  );
}
