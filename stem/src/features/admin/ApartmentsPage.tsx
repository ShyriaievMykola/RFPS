import { Check, Copy, Search, UserPlus } from 'lucide-react';
import { useDeferredValue, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useApartments, useCreateInvite } from '@/shared/api/hooks';
import type { ApartmentSummary } from '@/shared/api/types';
import { formatNumber } from '@/shared/lib/format';
import { Button } from '@/shared/ui/Button';
import { Card, PageHeader } from '@/shared/ui/Card';
import { Badge, EmptyState, ErrorState, Skeleton } from '@/shared/ui/feedback';

const TH = 'bg-surface-2 px-3 py-2 text-xs font-medium text-ink-2';
const TD = 'border-t border-line px-3 py-2';

function InviteCell({ apartment }: { apartment: ApartmentSummary }) {
  const { t } = useTranslation();
  const createInvite = useCreateInvite();
  const [copied, setCopied] = useState(false);

  if (apartment.residentName !== null) return null;

  if (apartment.inviteCode === null) {
    return (
      <Button
        variant="secondary"
        size="sm"
        loading={createInvite.isPending}
        onClick={() =>
          createInvite.mutate(apartment.id, {
            onSuccess: () => toast.success(t('admin.inviteCreated', { apartment: apartment.id })),
            onError: () => toast.error(t('common.unexpectedError')),
          })
        }
      >
        <UserPlus className="size-4" aria-hidden />
        {t('admin.invite')}
      </Button>
    );
  }

  const code = apartment.inviteCode;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t('admin.copyFailed'));
    }
  };

  return (
    <span className="inline-flex items-center gap-1">
      <code className="rounded bg-surface-2 px-2 py-1 text-xs text-ink">{code}</code>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => void copy()}
        aria-label={t('admin.copyCode', { apartment: apartment.id })}
      >
        {copied ? (
          <Check className="size-4" aria-hidden />
        ) : (
          <Copy className="size-4" aria-hidden />
        )}
      </Button>
    </span>
  );
}

export function ApartmentsPage() {
  const { t } = useTranslation();
  const { data, isPending, isError, refetch } = useApartments();
  const [search, setSearch] = useState('');
  // Фільтрація відкладається, щоб введення в полі пошуку не «підгальмовувало».
  const query = useDeferredValue(search.trim().toLowerCase());

  const filtered = useMemo(
    () =>
      (data ?? []).filter(
        (apartment) =>
          query === '' ||
          String(apartment.id).includes(query) ||
          (apartment.residentName ?? '').toLowerCase().includes(query),
      ),
    [data, query],
  );

  return (
    <>
      <PageHeader title={t('admin.apartmentsTitle')} description={t('admin.apartmentsSubtitle')} />

      <Card>
        <label className="relative mb-4 block max-w-sm">
          <span className="sr-only">{t('admin.search')}</span>
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
            aria-hidden
          />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t('admin.search')}
            className="min-h-10 w-full rounded-lg border border-line bg-surface pr-3 pl-9 text-sm text-ink placeholder:text-muted"
          />
        </label>

        {isPending ? (
          <Skeleton className="h-96 w-full" />
        ) : isError ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : filtered.length === 0 ? (
          <EmptyState title={t('admin.nothingFound')} />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-line">
            <table className="w-full min-w-[36rem] text-sm">
              <thead>
                <tr>
                  <th scope="col" className={`${TH} text-left`}>
                    {t('admin.columns.apartment')}
                  </th>
                  <th scope="col" className={`${TH} text-left`}>
                    {t('admin.columns.floor')}
                  </th>
                  <th scope="col" className={`${TH} text-left`}>
                    {t('admin.columns.resident')}
                  </th>
                  <th scope="col" className={`${TH} text-right`}>
                    {t('admin.columns.monthKwh')}
                  </th>
                  <th scope="col" className={`${TH} text-left`}>
                    {t('admin.columns.invite')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((apartment) => (
                  <tr key={apartment.id}>
                    <th scope="row" className={`${TD} text-left font-medium`}>
                      {apartment.id}
                    </th>
                    <td className={TD}>{apartment.floor}</td>
                    <td className={TD}>
                      {apartment.residentName ?? <Badge>{t('admin.vacant')}</Badge>}
                    </td>
                    <td className={`${TD} text-right tabular-nums`}>
                      {formatNumber(apartment.monthKwh)}
                    </td>
                    <td className={TD}>
                      <InviteCell apartment={apartment} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
