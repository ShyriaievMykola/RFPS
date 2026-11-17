import type { TFunction } from 'i18next';
import type * as PdfMakeModule from 'pdfmake/build/pdfmake';
import type { ConsumptionPoint, Tariffs } from '@/shared/api/types';
import { downloadCsv } from '@/shared/lib/csv';
import {
  formatDay,
  formatFullDate,
  formatMoney,
  formatMonth,
  formatNumber,
} from '@/shared/lib/format';
import { costOf, sumPoints } from '@/shared/lib/tariff';

export interface ReportRow {
  date: Date;
  day: number;
  night: number;
  total: number;
  cost: number;
}

export interface MonthReport {
  month: Date;
  apartmentId: number;
  residentName: string;
  tariffs: Tariffs;
  rows: ReportRow[];
  totals: Omit<ReportRow, 'date'>;
}

interface ReportMeta {
  month: Date;
  apartmentId: number;
  residentName: string;
}

export function buildReport(
  points: readonly ConsumptionPoint[],
  tariffs: Tariffs,
  meta: ReportMeta,
): MonthReport {
  const rows = points.map((point) => ({
    date: new Date(point.ts),
    day: point.day,
    night: point.night,
    total: point.day + point.night,
    cost: costOf(point, tariffs),
  }));
  const sum = sumPoints(points);
  return {
    ...meta,
    tariffs,
    rows,
    totals: { ...sum, total: sum.day + sum.night, cost: costOf(sum, tariffs) },
  };
}

function fileName(report: MonthReport, extension: string): string {
  const month = `${report.month.getFullYear()}-${String(report.month.getMonth() + 1).padStart(2, '0')}`;
  return `energy-report-kv${report.apartmentId}-${month}.${extension}`;
}

const round = (value: number) => Math.round(value * 100) / 100;

export function exportCsv(report: MonthReport, t: TFunction): void {
  downloadCsv(
    [
      [
        t('reports.columns.date'),
        t('reports.columns.day'),
        t('reports.columns.night'),
        t('reports.columns.total'),
        t('reports.columns.cost'),
      ],
      ...report.rows.map((row) => [
        formatFullDate(row.date),
        round(row.day),
        round(row.night),
        round(row.total),
        round(row.cost),
      ]),
      [
        t('reports.totalRow'),
        round(report.totals.day),
        round(report.totals.night),
        round(report.totals.total),
        round(report.totals.cost),
      ],
    ],
    fileName(report, 'csv'),
  );
}

export async function exportPdf(report: MonthReport, t: TFunction): Promise<void> {
  // pdfmake разом зі шрифтами важить понад мегабайт, тому вантажиться лише в момент експорту.
  // Вбудований шрифт Roboto містить кирилицю — українські літери в PDF не перетворюються на «квадратики».
  const [pdfModule, fontsModule] = await Promise.all([
    import('pdfmake/build/pdfmake'),
    import('pdfmake/build/vfs_fonts'),
  ]);
  // Обидва модулі — CommonJS: збирач може покласти їхній вміст у поле default.
  type PdfMake = typeof PdfMakeModule;
  type Fonts = Parameters<PdfMake['addVirtualFileSystem']>[0];
  const pdfMake = (pdfModule as unknown as { default?: PdfMake }).default ?? pdfModule;
  const fonts =
    (fontsModule as unknown as { default?: Fonts }).default ?? (fontsModule as unknown as Fonts);
  pdfMake.addVirtualFileSystem(fonts);

  const numberCell = (value: number, bold = false) => ({
    text: formatNumber(value, 2),
    alignment: 'right' as const,
    bold,
  });
  const headerCell = (text: string, alignRight = false) => ({
    text,
    bold: true,
    fillColor: '#f0efec',
    alignment: alignRight ? ('right' as const) : ('left' as const),
  });

  const document = pdfMake.createPdf({
    pageSize: 'A4',
    pageMargins: [40, 48, 40, 48],
    info: { title: t('reports.pdfTitle'), author: t('app.name') },
    defaultStyle: { fontSize: 10 },
    footer: (currentPage: number, pageCount: number) => ({
      text: `${currentPage} / ${pageCount}`,
      alignment: 'right',
      margin: [40, 16, 40, 0],
      fontSize: 9,
      color: '#52514e',
    }),
    content: [
      { text: t('reports.pdfTitle'), fontSize: 16, bold: true },
      { text: formatMonth(report.month), fontSize: 12, margin: [0, 2, 0, 12] },
      {
        columns: [
          [
            { text: t('reports.resident'), color: '#52514e', fontSize: 9 },
            {
              text: `${report.residentName}, ${t('reports.apartment', { apartment: report.apartmentId })}`,
            },
          ],
          [
            { text: t('reports.tariffs'), color: '#52514e', fontSize: 9 },
            {
              text: t('reports.tariffsValue', {
                day: formatNumber(report.tariffs.day, 2),
                night: formatNumber(report.tariffs.night, 2),
              }),
            },
          ],
          [
            { text: t('reports.generated'), color: '#52514e', fontSize: 9 },
            { text: formatFullDate(new Date()) },
          ],
        ],
        columnGap: 16,
        margin: [0, 0, 0, 12],
      },
      {
        text: t('reports.summary', {
          total: formatNumber(report.totals.total, 1),
          cost: formatMoney(report.totals.cost),
        }),
        bold: true,
        margin: [0, 0, 0, 12],
      },
      {
        table: {
          headerRows: 1,
          widths: ['*', 'auto', 'auto', 'auto', 'auto'],
          body: [
            [
              headerCell(t('reports.columns.date')),
              headerCell(t('reports.columns.day'), true),
              headerCell(t('reports.columns.night'), true),
              headerCell(t('reports.columns.total'), true),
              headerCell(t('reports.columns.cost'), true),
            ],
            ...report.rows.map((row) => [
              { text: formatDay(row.date) },
              numberCell(row.day),
              numberCell(row.night),
              numberCell(row.total),
              numberCell(row.cost),
            ]),
            [
              { text: t('reports.totalRow'), bold: true },
              numberCell(report.totals.day, true),
              numberCell(report.totals.night, true),
              numberCell(report.totals.total, true),
              numberCell(report.totals.cost, true),
            ],
          ],
        },
        layout: 'lightHorizontalLines',
      },
    ],
  });
  await document.download(fileName(report, 'pdf'));
}
