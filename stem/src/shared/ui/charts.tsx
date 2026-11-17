import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ConsumptionPoint, Granularity } from '@/shared/api/types';
import {
  formatDay,
  formatKwh,
  formatMonth,
  formatMonthShort,
  formatNumber,
  formatTime,
  formatWeekday,
} from '@/shared/lib/format';
import type { CumulativePoint } from '@/shared/lib/forecast';
import { cn } from '@/shared/lib/cn';

const AXIS_TICK = { fill: 'var(--muted)', fontSize: 12 };
const CHART_HEIGHT = 260;

// --- Спільні деталі ----------------------------------------------------------

type SwatchKind = 'bar' | 'line' | 'dashed' | 'band';

interface LegendItem {
  label: string;
  color: string;
  kind?: SwatchKind;
}

/** Легенда: колір несе позначка, а текст лишається кольором тексту — так він читається в обох темах. */
export function ChartLegend({ items }: { items: LegendItem[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          <Swatch color={item.color} kind={item.kind ?? 'bar'} />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

function Swatch({ color, kind }: { color: string; kind: SwatchKind }) {
  if (kind === 'bar') {
    return <span aria-hidden className="size-2.5 rounded-sm" style={{ background: color }} />;
  }
  if (kind === 'band') {
    return (
      <span aria-hidden className="h-2.5 w-4 rounded-sm opacity-25" style={{ background: color }} />
    );
  }
  return (
    <svg aria-hidden width="16" height="8" viewBox="0 0 16 8">
      <line
        x1="1"
        y1="4"
        x2="15"
        y2="4"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray={kind === 'dashed' ? '4 4' : undefined}
      />
    </svg>
  );
}

interface TooltipRow {
  label: string;
  value: string;
  color?: string;
  kind?: SwatchKind;
}

function TooltipCard({ title, rows }: { title: string; rows: TooltipRow[] }) {
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-medium text-ink">{title}</p>
      <ul className="flex flex-col gap-0.5">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center gap-1.5 text-ink-2">
            {row.color && <Swatch color={row.color} kind={row.kind ?? 'bar'} />}
            <span>{row.label}</span>
            <span className="ml-auto pl-3 font-medium tabular-nums text-ink">{row.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function axisNumber(value: number): string {
  return formatNumber(value, Number.isInteger(value) ? 0 : 1);
}

export function ViewToggle({
  view,
  onChange,
}: {
  view: 'chart' | 'table';
  onChange: (view: 'chart' | 'table') => void;
}) {
  const { t } = useTranslation();
  return (
    <div
      role="group"
      aria-label={t('charts.view')}
      className="flex rounded-lg border border-line p-0.5"
    >
      {(['chart', 'table'] as const).map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={view === option}
          onClick={() => onChange(option)}
          className={cn(
            'min-h-8 rounded-md px-3 text-xs font-medium',
            view === option ? 'bg-surface-2 text-ink' : 'text-ink-2 hover:text-ink',
          )}
        >
          {t(`charts.${option}`)}
        </button>
      ))}
    </div>
  );
}

function ScrollTable({ children }: { children: ReactNode }) {
  return (
    <div className="max-h-80 overflow-auto rounded-lg border border-line">
      <table className="w-full text-sm tabular-nums">{children}</table>
    </div>
  );
}

const TH = 'sticky top-0 bg-surface-2 px-3 py-2 text-left text-xs font-medium text-ink-2';
const TD = 'border-t border-line px-3 py-2';

// --- Споживання за тарифними зонами ------------------------------------------

function bucketLabel(ts: string, granularity: Granularity, long = false): string {
  if (granularity === 'hour') return formatTime(ts);
  if (granularity === 'day') return long ? formatWeekday(ts) : formatDay(ts);
  return long ? formatMonth(ts) : formatMonthShort(ts);
}

interface SegmentProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  fill?: string;
  payload?: ConsumptionPoint;
}

/**
 * Сегмент складеного стовпця. Заокруглюється лише верх усього стовпця, а між
 * сегментами лишається проміжок 2px кольору тла — він розділяє зони без обведення.
 */
function segment(isTop: (point: ConsumptionPoint) => boolean) {
  return function Segment({ x = 0, y = 0, width = 0, height = 0, fill, payload }: SegmentProps) {
    if (height <= 0 || width <= 0 || !payload) return null;
    const top = isTop(payload);
    const gap = top && payload.day > 0 && payload.night > 0 ? 2 : 0;
    const h = Math.max(0, height - gap);
    const r = top ? Math.min(4, width / 2, h) : 0;
    const bottom = y + h;
    const right = x + width;
    const path =
      `M${x},${bottom}V${y + r}Q${x},${y} ${x + r},${y}` +
      `H${right - r}Q${right},${y} ${right},${y + r}V${bottom}Z`;
    return <path d={path} fill={fill} />;
  };
}

const DaySegment = segment((point) => point.night <= 0);
const NightSegment = segment(() => true);

interface ConsumptionChartProps {
  data: ConsumptionPoint[];
  granularity: Granularity;
  ariaLabel: string;
}

export function ConsumptionChart({ data, granularity, ariaLabel }: ConsumptionChartProps) {
  const { t } = useTranslation();
  return (
    <figure aria-label={ariaLabel} className="flex flex-col gap-3">
      <ChartLegend
        items={[
          { label: t('charts.dayZone'), color: 'var(--series-1)' },
          { label: t('charts.nightZone'), color: 'var(--series-2)' },
        ]}
      />
      <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
        <BarChart
          data={data}
          margin={{ top: 8, right: 4, bottom: 0, left: 0 }}
          barCategoryGap="20%"
        >
          <CartesianGrid vertical={false} stroke="var(--grid)" />
          <XAxis
            dataKey="ts"
            tickFormatter={(ts: string) => bucketLabel(ts, granularity)}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={{ stroke: 'var(--axis)' }}
            minTickGap={16}
          />
          <YAxis
            tickFormatter={axisNumber}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            width={44}
            unit=""
          />
          <Tooltip
            cursor={{ fill: 'var(--surface-2)' }}
            isAnimationActive={false}
            content={({ active, payload }) => {
              const point = payload?.[0]?.payload as ConsumptionPoint | undefined;
              if (!active || !point) return null;
              return (
                <TooltipCard
                  title={bucketLabel(point.ts, granularity, true)}
                  rows={[
                    {
                      label: t('charts.dayZone'),
                      value: formatKwh(point.day, 2),
                      color: 'var(--series-1)',
                    },
                    {
                      label: t('charts.nightZone'),
                      value: formatKwh(point.night, 2),
                      color: 'var(--series-2)',
                    },
                    { label: t('charts.total'), value: formatKwh(point.day + point.night, 2) },
                  ]}
                />
              );
            }}
          />
          <Bar
            dataKey="day"
            stackId="kwh"
            fill="var(--series-1)"
            maxBarSize={24}
            shape={DaySegment}
            isAnimationActive={false}
          />
          <Bar
            dataKey="night"
            stackId="kwh"
            fill="var(--series-2)"
            maxBarSize={24}
            shape={NightSegment}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </figure>
  );
}

export function ConsumptionTable({ data, granularity }: Omit<ConsumptionChartProps, 'ariaLabel'>) {
  const { t } = useTranslation();
  return (
    <ScrollTable>
      <thead>
        <tr>
          <th scope="col" className={TH}>
            {t('charts.period')}
          </th>
          <th scope="col" className={cn(TH, 'text-right')}>
            {t('charts.dayZone')}
          </th>
          <th scope="col" className={cn(TH, 'text-right')}>
            {t('charts.nightZone')}
          </th>
          <th scope="col" className={cn(TH, 'text-right')}>
            {t('charts.total')}
          </th>
        </tr>
      </thead>
      <tbody>
        {data.map((point) => (
          <tr key={point.ts}>
            <th scope="row" className={cn(TD, 'text-left font-normal')}>
              {bucketLabel(point.ts, granularity, true)}
            </th>
            <td className={cn(TD, 'text-right')}>{formatNumber(point.day, 2)}</td>
            <td className={cn(TD, 'text-right')}>{formatNumber(point.night, 2)}</td>
            <td className={cn(TD, 'text-right font-medium')}>
              {formatNumber(point.day + point.night, 2)}
            </td>
          </tr>
        ))}
      </tbody>
    </ScrollTable>
  );
}

// --- Прогноз до кінця місяця -------------------------------------------------

interface ForecastChartProps {
  data: CumulativePoint[];
  /** Місячний ліміт, кВт·год — показується горизонтальною лінією. */
  limitKwh?: number;
  ariaLabel: string;
}

interface ForecastRow {
  ts: string;
  actual: number | null;
  forecast: number | null;
  band: [number, number] | null;
}

export function ForecastChart({ data, limitKwh, ariaLabel }: ForecastChartProps) {
  const { t } = useTranslation();
  const rows: ForecastRow[] = data.map((point) => ({
    ts: point.date.toISOString(),
    actual: point.actual,
    forecast: point.forecast,
    band: point.band,
  }));

  return (
    <figure aria-label={ariaLabel} className="flex flex-col gap-3">
      <ChartLegend
        items={[
          { label: t('charts.actual'), color: 'var(--series-1)', kind: 'line' },
          { label: t('charts.forecast'), color: 'var(--series-1)', kind: 'dashed' },
          { label: t('charts.interval'), color: 'var(--series-1)', kind: 'band' },
          ...(limitKwh
            ? [{ label: t('charts.limit'), color: 'var(--critical)', kind: 'line' as const }]
            : []),
        ]}
      />
      <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
        <ComposedChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--grid)" />
          <XAxis
            dataKey="ts"
            tickFormatter={(ts: string) => String(new Date(ts).getDate())}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={{ stroke: 'var(--axis)' }}
            minTickGap={12}
          />
          <YAxis
            tickFormatter={axisNumber}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            width={44}
          />
          <Tooltip
            cursor={{ stroke: 'var(--axis)' }}
            isAnimationActive={false}
            content={({ active, payload }) => {
              const row = payload?.[0]?.payload as ForecastRow | undefined;
              if (!active || !row) return null;
              const tooltipRows: TooltipRow[] = [];
              if (row.actual !== null) {
                tooltipRows.push({
                  label: t('charts.actual'),
                  value: formatKwh(row.actual),
                  color: 'var(--series-1)',
                  kind: 'line',
                });
              } else if (row.forecast !== null) {
                tooltipRows.push({
                  label: t('charts.forecast'),
                  value: formatKwh(row.forecast),
                  color: 'var(--series-1)',
                  kind: 'dashed',
                });
                if (row.band) {
                  tooltipRows.push({
                    label: t('charts.interval'),
                    value: `${formatNumber(row.band[0], 0)}–${formatNumber(row.band[1], 0)}`,
                    color: 'var(--series-1)',
                    kind: 'band',
                  });
                }
              }
              return <TooltipCard title={formatWeekday(row.ts)} rows={tooltipRows} />;
            }}
          />
          <Area
            dataKey="band"
            stroke="none"
            fill="var(--series-1)"
            fillOpacity={0.12}
            connectNulls={false}
            activeDot={false}
            isAnimationActive={false}
          />
          {limitKwh !== undefined && (
            <ReferenceLine
              y={limitKwh}
              stroke="var(--critical)"
              strokeWidth={1.5}
              ifOverflow="extendDomain"
            />
          )}
          <Line
            dataKey="forecast"
            stroke="var(--series-1)"
            strokeWidth={2}
            strokeDasharray="5 5"
            strokeLinecap="round"
            dot={false}
            activeDot={{ r: 5, stroke: 'var(--surface)', strokeWidth: 2 }}
            isAnimationActive={false}
          />
          <Line
            dataKey="actual"
            stroke="var(--series-1)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            dot={false}
            activeDot={{ r: 5, stroke: 'var(--surface)', strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </figure>
  );
}

export function ForecastTable({ data }: { data: CumulativePoint[] }) {
  const { t } = useTranslation();
  return (
    <ScrollTable>
      <thead>
        <tr>
          <th scope="col" className={TH}>
            {t('charts.date')}
          </th>
          <th scope="col" className={cn(TH, 'text-right')}>
            {t('charts.cumulative')}
          </th>
          <th scope="col" className={TH}>
            {t('charts.kind')}
          </th>
        </tr>
      </thead>
      <tbody>
        {data.map((point) => (
          <tr key={point.date.toISOString()}>
            <th scope="row" className={cn(TD, 'text-left font-normal')}>
              {formatWeekday(point.date)}
            </th>
            <td className={cn(TD, 'text-right')}>
              {formatNumber(point.actual ?? point.forecast ?? 0)}
            </td>
            <td className={cn(TD, 'text-ink-2')}>
              {point.actual !== null ? t('charts.actual') : t('charts.forecast')}
            </td>
          </tr>
        ))}
      </tbody>
    </ScrollTable>
  );
}
