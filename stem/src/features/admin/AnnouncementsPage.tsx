import { zodResolver } from '@hookform/resolvers/zod';
import { Trash2 } from 'lucide-react';
import { useId } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAnnouncements, useCreateAnnouncement, useDeleteAnnouncement } from '@/shared/api/hooks';
import { formatDateTime } from '@/shared/lib/format';
import { announcementSchema, type AnnouncementValues } from '@/shared/lib/schemas';
import { Button } from '@/shared/ui/Button';
import { Card, CardHeader, PageHeader } from '@/shared/ui/Card';
import { TextField } from '@/shared/ui/Field';
import { EmptyState, ErrorState, Skeleton } from '@/shared/ui/feedback';
import { SafeHtml } from '@/shared/ui/SafeHtml';

function AnnouncementForm() {
  const { t } = useTranslation();
  const bodyId = useId();
  const createAnnouncement = useCreateAnnouncement();
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<AnnouncementValues>({
    resolver: zodResolver(announcementSchema),
    defaultValues: { title: '', bodyHtml: '' },
  });
  const body = useWatch({ control, name: 'bodyHtml' });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await createAnnouncement.mutateAsync(values);
      toast.success(t('announcements.published'));
      reset();
    } catch {
      toast.error(t('common.unexpectedError'));
    }
  });

  return (
    <form onSubmit={(event) => void onSubmit(event)} noValidate className="flex flex-col gap-4">
      <TextField
        label={t('announcements.fieldTitle')}
        error={errors.title?.message}
        {...register('title')}
      />
      <div className="flex flex-col gap-1.5">
        <label htmlFor={bodyId} className="text-sm font-medium text-ink">
          {t('announcements.fieldBody')}
        </label>
        <textarea
          id={bodyId}
          rows={5}
          aria-invalid={errors.bodyHtml ? true : undefined}
          aria-describedby={`${bodyId}-hint`}
          className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted"
          {...register('bodyHtml')}
        />
        <p id={`${bodyId}-hint`} className="text-xs text-ink-2">
          {t('announcements.bodyHint')}
        </p>
        {errors.bodyHtml?.message && (
          <p role="alert" className="text-xs text-critical-text">
            {t(errors.bodyHtml.message)}
          </p>
        )}
      </div>

      {body.trim() !== '' && (
        <div>
          <p className="mb-1.5 text-sm font-medium text-ink">{t('announcements.preview')}</p>
          {/* Перегляд проходить те саме очищення, що й показ мешканцям: небезпечний код тут уже вирізано. */}
          <SafeHtml html={body} className="rounded-lg border border-dashed border-line p-3" />
        </div>
      )}

      <Button type="submit" loading={isSubmitting} className="self-start">
        {t('announcements.publish')}
      </Button>
    </form>
  );
}

export function AnnouncementsPage() {
  const { t } = useTranslation();
  const { data, isPending, isError, refetch } = useAnnouncements();
  const deleteAnnouncement = useDeleteAnnouncement();

  return (
    <>
      <PageHeader title={t('announcements.title')} description={t('announcements.subtitle')} />

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title={t('announcements.new')} />
          <AnnouncementForm />
        </Card>

        <Card>
          <CardHeader title={t('announcements.publishedList')} />
          {isPending ? (
            <Skeleton className="h-40 w-full" />
          ) : isError ? (
            <ErrorState onRetry={() => void refetch()} />
          ) : data.length === 0 ? (
            <EmptyState title={t('announcements.empty')} />
          ) : (
            <ul className="flex flex-col">
              {data.map((item) => (
                <li key={item.id} className="border-t border-line py-4 first:border-t-0 first:pt-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-ink">{item.title}</p>
                      <p className="mb-1 text-xs text-ink-2">
                        {item.author} · {formatDateTime(item.createdAt)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={t('announcements.deleteNamed', { title: item.title })}
                      disabled={deleteAnnouncement.isPending}
                      onClick={() =>
                        deleteAnnouncement.mutate(item.id, {
                          onSuccess: () => toast.success(t('announcements.deleted')),
                          onError: () => toast.error(t('common.unexpectedError')),
                        })
                      }
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </Button>
                  </div>
                  <SafeHtml html={item.bodyHtml} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
