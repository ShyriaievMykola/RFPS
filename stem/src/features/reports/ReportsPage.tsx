import { addMonths, startOfMonth, subMonths } from 'date-fns';
import { FileSpreadsheet, FileText } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useNow } from '@/features/outages/useOutageReminder';
import { useConsumption, useTariffs } from '@/shared/api/hooks';
import { formatDay, formatKwh, formatMoney, formatMonth, formatNumber } from '@/shared/lib/format';
import { useCurrentUser } from '@/shared/stores/auth';
import { Button } from '@/shared/ui/Button';
import { Card, CardHeader, PageHeader } from '@/shared/ui/Card';
import { SelectField } from '@/shared/ui/Field';
import { EmptyState, ErrorState, Skeleton } from '@/shared/ui/feedback';
import { StatTile } from '@/shared/ui/StatTile';
import { buildReport, exportCsv, exportPdf } from './report';

const MONTHS_AVAILABLE = 12;
const TH = 'bg-surface-2 px-3 py-2 text-xs font-medium text-ink-2';
const TD = 'border-t border-line px-3 py-2';

export function ReportsPage() {
  const { t } = useTranslation();
  const user = useCurrentUser();
  const currentMonth = startOfMonth(useNow(60_000)).getTime();
  const months = useMemo(
    () =>
      Array.from({ length: MONTHS_AVAILABLE }, (_, index) =>
        subMonths(new Date(currentMonth), index),
      ),
    [currentMonth],
  );
  const [selected, setSelected] = useState(0);
  const [exporting, setExporting] = useState(false);
  const month = months[selected] ?? months[0]!;

  const consumption = useConsumption({ from: month, to: addMonths(month, 1), granularity: 'day' });
  const tariffs = useTariffs();

  const report = useMemo(
    () =>
      consumption.data && tariffs.data && user.apartmentId !== null
        ? buildReport(consumption.data, tariffs.data, {
            month,
            apartmentId: user.apartmentId,
            residentName: user.name,
          })
        : null,
    [consumption.data, tariffs.data, month, user],
  );

  const handlePdf = async () => {
    if (!report) return;
    setExporting(true);
    try {
      await exportPdf(report, t);
      toast.success(t('reports.exported'));
    } catch {
      toast.error(t('reports.exportFailed'));
    } finally {
      setExporting(false);
    }
  };

  const handleCsv = () => {
    if (!report) return;
    exportCsv(report, t);
    toast.success(t('reports.exported'));
  };

  const isPending = consumption.isPending || tariffs.isPending;
  const isError = consumption.isError || tariffs.isError;
  const canExport = report !== null && report.rows.length > 0 && !consumption.isPlaceholderData;

  return (
    <>
      <PageHeader title={t('reports.title')} description={t('reports.subtitle')} />

      <Card>
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-full sm:w-56">
            <SelectField
              label={t('reports.month')}
              value={selected}
              onChange={(event) => setSelected(Number(event.target.value))}
            >
              {months.map((item, index) => (
                <option key={item.getTime()} value={index}>
                  {formatMonth(item)}
                </option>
              ))}
            </SelectField>
          </div>
          <Button onClick={() => void handlePdf()} loading={exporting} disabled={!canExport}>
            <FileText className="size-4" aria-hidden />
            {t('reports.exportPdf')}
          </Button>
          <Button variant="secondary" onClick={handleCsv} disabled={!canExport}>
            <FileSpreadsheet className="size-4" aria-hidden />
            {t('reports.exportCsv')}
          </Button>
        </div>
      </Card>

      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          label={t('reports.columns.total')}
          loading={isPending}
          value={report ? formatKwh(report.totals.total, 0) : '—'}
        />
        <StatTile
          label={t('reports.columns.day')}
          loading={isPending}
          value={report ? formatKwh(report.totals.day, 0) : '—'}
        />
        <StatTile
          label={t('reports.columns.night')}
          loading={isPending}
          value={report ? formatKwh(report.totals.night, 0) : '—'}
        />
        <StatTile
          label={t('reports.columns.cost')}
          loading={isPending}
          value={report ? formatMoney(report.totals.cost) : '—'}
        />
      </div>

      <Card className="mt-4">
        <CardHeader title={t('reports.daily')} subtitle={formatMonth(month)} />
        {isPending ? (
          <Skeleton className="h-80 w-full" />
        ) : isError || !report ? (
          <ErrorState
            onRetry={() => {
              void consumption.refetch();
              void tariffs.refetch();
            }}
          />
        ) : report.rows.length === 0 ? (
          <EmptyState title={t('reports.empty')} />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-line">
            <table className="w-full min-w-[30rem] text-sm tabular-nums">
              <thead>
                <tr>
                  <th scope="col" className={`${TH} text-left`}>
                    {t('reports.columns.date')}
                  </th>
                  <th scope="col" className={`${TH} text-right`}>
                    {t('reports.columns.day')}
                  </th>
                  <th scope="col" className={`${TH} text-right`}>
                    {t('reports.columns.night')}
                  </th>
                  <th scope="col" className={`${TH} text-right`}>
                    {t('reports.columns.total')}
                  </th>
                  <th scope="col" className={`${TH} text-right`}>
                    {t('reports.columns.cost')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {report.rows.map((row) => (
                  <tr key={row.date.getTime()}>
                    <th scope="row" className={`${TD} text-left font-normal`}>
                      {formatDay(row.date)}
                    </th>
                    <td className={`${TD} text-right`}>{formatNumber(row.day, 2)}</td>
                    <td className={`${TD} text-right`}>{formatNumber(row.night, 2)}</td>
                    <td className={`${TD} text-right`}>{formatNumber(row.total, 2)}</td>
                    <td className={`${TD} text-right`}>{formatNumber(row.cost, 2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-semibold">
                  <th scope="row" className={`${TD} text-left`}>
                    {t('reports.totalRow')}
                  </th>
                  <td className={`${TD} text-right`}>{formatNumber(report.totals.day, 2)}</td>
                  <td className={`${TD} text-right`}>{formatNumber(report.totals.night, 2)}</td>
                  <td className={`${TD} text-right`}>{formatNumber(report.totals.total, 2)}</td>
                  <td className={`${TD} text-right`}>{formatNumber(report.totals.cost, 2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
