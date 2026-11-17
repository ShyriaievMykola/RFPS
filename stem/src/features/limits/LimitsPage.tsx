import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useCreateLimit, useDeleteLimit, useLimits, useUpdateLimit } from '@/shared/api/hooks';
import type { Limit } from '@/shared/api/types';
import { formatKwh, formatNumber, formatPercent } from '@/shared/lib/format';
import { limitSchema, type LimitValues } from '@/shared/lib/schemas';
import { Button } from '@/shared/ui/Button';
import { Card, PageHeader } from '@/shared/ui/Card';
import { SelectField, TextField } from '@/shared/ui/Field';
import { Badge, EmptyState, ErrorState, Meter, Skeleton } from '@/shared/ui/feedback';
import { Modal } from '@/shared/ui/Modal';

const EMPTY_VALUES: LimitValues = { name: '', period: 'month', thresholdKwh: 200, enabled: true };

interface LimitFormProps {
  limit: Limit | null;
  onDone: () => void;
}

function LimitForm({ limit, onDone }: LimitFormProps) {
  const { t } = useTranslation();
  const createLimit = useCreateLimit();
  const updateLimit = useUpdateLimit();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LimitValues>({ resolver: zodResolver(limitSchema), defaultValues: EMPTY_VALUES });

  // Та сама форма служить і для створення, і для редагування.
  useEffect(() => {
    reset(
      limit
        ? {
            name: limit.name,
            period: limit.period,
            thresholdKwh: limit.thresholdKwh,
            enabled: limit.enabled,
          }
        : EMPTY_VALUES,
    );
  }, [limit, reset]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (limit) await updateLimit.mutateAsync({ id: limit.id, input: values });
      else await createLimit.mutateAsync(values);
      toast.success(limit ? t('limits.updated') : t('limits.created'));
      onDone();
    } catch {
      toast.error(t('common.unexpectedError'));
    }
  });

  return (
    <form onSubmit={(event) => void onSubmit(event)} noValidate className="flex flex-col gap-4">
      <TextField
        label={t('limits.name')}
        placeholder={t('limits.namePlaceholder')}
        error={errors.name?.message}
        {...register('name')}
      />
      <SelectField
        label={t('limits.period')}
        error={errors.period?.message}
        {...register('period')}
      >
        <option value="day">{t('limits.periods.day')}</option>
        <option value="month">{t('limits.periods.month')}</option>
      </SelectField>
      <TextField
        label={t('limits.threshold')}
        type="number"
        inputMode="decimal"
        min={0}
        step="any"
        error={errors.thresholdKwh?.message}
        {...register('thresholdKwh', { valueAsNumber: true })}
      />
      <label className="flex min-h-10 items-center gap-3 text-sm text-ink">
        <input type="checkbox" className="size-4 accent-(--accent)" {...register('enabled')} />
        {t('limits.enabled')}
      </label>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onDone}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {t('common.save')}
        </Button>
      </div>
    </form>
  );
}

function LimitRow({
  limit,
  onEdit,
  onDelete,
}: {
  limit: Limit;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const updateLimit = useUpdateLimit();
  const ratio = limit.usedKwh / limit.thresholdKwh;
  const tone = ratio >= 1 ? 'critical' : ratio >= 0.8 ? 'warning' : 'accent';

  return (
    <li className="rounded-xl border border-line bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 font-medium text-ink">
            <span className="break-words">{limit.name}</span>
            {!limit.enabled && <Badge>{t('limits.paused')}</Badge>}
            {limit.enabled && ratio >= 1 && <Badge tone="critical">{t('limits.exceeded')}</Badge>}
            {limit.enabled && ratio >= 0.8 && ratio < 1 && (
              <Badge tone="warning">{t('limits.almost')}</Badge>
            )}
          </p>
          <p className="mt-0.5 text-sm text-ink-2">{t(`limits.periods.${limit.period}`)}</p>
        </div>
        <div className="flex shrink-0 gap-1">
          <label className="flex min-h-9 items-center gap-2 pr-2 text-sm text-ink-2">
            <input
              type="checkbox"
              className="size-4 accent-(--accent)"
              checked={limit.enabled}
              disabled={updateLimit.isPending}
              onChange={(event) =>
                updateLimit.mutate({ id: limit.id, input: { enabled: event.target.checked } })
              }
            />
            {/* На вузькому екрані підпис лишається лише для екранного диктора. */}
            <span className="max-[420px]:sr-only">{t('limits.active')}</span>
          </label>
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
            aria-label={t('limits.editNamed', { name: limit.name })}
          >
            <Pencil className="size-4" aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            aria-label={t('limits.deleteNamed', { name: limit.name })}
          >
            <Trash2 className="size-4" aria-hidden />
          </Button>
        </div>
      </div>

      <p className="mt-3 mb-1.5 flex items-baseline justify-between gap-2 text-sm">
        <span className="text-ink-2 tabular-nums">
          {formatNumber(limit.usedKwh)} / {formatKwh(limit.thresholdKwh, 0)}
        </span>
        <span className="font-medium text-ink tabular-nums">{formatPercent(ratio * 100)}</span>
      </p>
      <Meter label={limit.name} value={limit.enabled ? ratio : 0} tone={tone} />
    </li>
  );
}

type Dialog =
  { kind: 'closed' } | { kind: 'form'; limit: Limit | null } | { kind: 'delete'; limit: Limit };

export function LimitsPage() {
  const { t } = useTranslation();
  const { data, isPending, isError, refetch } = useLimits();
  const deleteLimit = useDeleteLimit();
  const [dialog, setDialog] = useState<Dialog>({ kind: 'closed' });
  const close = () => setDialog({ kind: 'closed' });

  const confirmDelete = async (limit: Limit) => {
    try {
      await deleteLimit.mutateAsync(limit.id);
      toast.success(t('limits.deleted'));
      close();
    } catch {
      toast.error(t('common.unexpectedError'));
    }
  };

  const addButton = (
    <Button onClick={() => setDialog({ kind: 'form', limit: null })}>
      <Plus className="size-4" aria-hidden />
      {t('limits.add')}
    </Button>
  );

  return (
    <>
      <PageHeader title={t('limits.title')} description={t('limits.subtitle')} action={addButton} />

      {isPending ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      ) : isError ? (
        <Card>
          <ErrorState onRetry={() => void refetch()} />
        </Card>
      ) : data.length === 0 ? (
        <Card>
          <EmptyState
            title={t('limits.emptyTitle')}
            description={t('limits.emptyText')}
            action={addButton}
          />
        </Card>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {data.map((limit) => (
            <LimitRow
              key={limit.id}
              limit={limit}
              onEdit={() => setDialog({ kind: 'form', limit })}
              onDelete={() => setDialog({ kind: 'delete', limit })}
            />
          ))}
        </ul>
      )}

      <Modal
        open={dialog.kind === 'form'}
        title={dialog.kind === 'form' && dialog.limit ? t('limits.edit') : t('limits.add')}
        onClose={close}
      >
        <LimitForm limit={dialog.kind === 'form' ? dialog.limit : null} onDone={close} />
      </Modal>

      <Modal open={dialog.kind === 'delete'} title={t('limits.deleteTitle')} onClose={close}>
        {dialog.kind === 'delete' && (
          <>
            <p className="text-sm text-ink-2">
              {t('limits.deleteText', { name: dialog.limit.name })}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" onClick={close}>
                {t('common.cancel')}
              </Button>
              <Button
                variant="danger"
                loading={deleteLimit.isPending}
                onClick={() => void confirmDelete(dialog.limit)}
              >
                {t('common.delete')}
              </Button>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}
