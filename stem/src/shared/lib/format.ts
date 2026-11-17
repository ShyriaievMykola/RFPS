import { format as formatDate } from 'date-fns';
import { enGB, uk } from 'date-fns/locale';
import i18n from '@/shared/i18n';

function numberLocale(): string {
  return i18n.language === 'en' ? 'en-GB' : 'uk-UA';
}

function dateLocale() {
  return i18n.language === 'en' ? enGB : uk;
}

export function formatNumber(value: number, fractionDigits = 1): string {
  return new Intl.NumberFormat(numberLocale(), {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

export function formatKwh(value: number, fractionDigits = 1): string {
  return `${formatNumber(value, fractionDigits)} ${i18n.t('units.kwh')}`;
}

export function formatKw(value: number): string {
  return `${formatNumber(value, 2)} ${i18n.t('units.kw')}`;
}

export function formatMoney(value: number): string {
  return `${formatNumber(value, 2)} ${i18n.t('units.uah')}`;
}

export function formatPercent(value: number): string {
  return `${formatNumber(value, 0)}%`;
}

/** Відносна зміна у відсотках зі знаком: «+12%», «−5%». */
export function formatDelta(ratio: number): string {
  const pct = Math.round(ratio * 100);
  const sign = pct > 0 ? '+' : pct < 0 ? '−' : '';
  return `${sign}${Math.abs(pct)}%`;
}

export function formatDay(date: Date | string): string {
  return formatDate(new Date(date), 'd MMM', { locale: dateLocale() });
}

export function formatFullDate(date: Date | string): string {
  return formatDate(new Date(date), 'd MMMM yyyy', { locale: dateLocale() });
}

export function formatWeekday(date: Date | string): string {
  return formatDate(new Date(date), 'EEEEEE, d MMM', { locale: dateLocale() });
}

export function formatMonth(date: Date | string): string {
  return formatDate(new Date(date), 'LLLL yyyy', { locale: dateLocale() });
}

export function formatMonthShort(date: Date | string): string {
  return formatDate(new Date(date), 'LLL', { locale: dateLocale() });
}

export function formatTime(date: Date | string): string {
  return formatDate(new Date(date), 'HH:mm');
}

export function formatDateTime(date: Date | string): string {
  return formatDate(new Date(date), 'd MMMM, HH:mm', { locale: dateLocale() });
}
