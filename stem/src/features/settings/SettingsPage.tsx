import { zodResolver } from '@hookform/resolvers/zod';
import { Monitor, Moon, Sun, type LucideIcon } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { logout } from '@/features/auth/api';
import { useTariffs, useUpdateTariffs } from '@/shared/api/hooks';
import { cn } from '@/shared/lib/cn';
import { formatMoney } from '@/shared/lib/format';
import { tariffsSchema, type TariffsValues } from '@/shared/lib/schemas';
import { NIGHT_END_HOUR, NIGHT_START_HOUR } from '@/shared/lib/tariff';
import { useCurrentUser } from '@/shared/stores/auth';
import { useSettingsStore, type Language, type ThemeChoice } from '@/shared/stores/settings';
import { Button } from '@/shared/ui/Button';
import { Card, CardHeader, PageHeader } from '@/shared/ui/Card';
import { SelectField, TextField } from '@/shared/ui/Field';
import { ErrorState, Skeleton } from '@/shared/ui/feedback';

const THEMES: readonly { id: ThemeChoice; icon: LucideIcon }[] = [
  { id: 'system', icon: Monitor },
  { id: 'light', icon: Sun },
  { id: 'dark', icon: Moon },
];

function AppearanceCard() {
  const { t } = useTranslation();
  const { theme, language, setTheme, setLanguage } = useSettingsStore();

  return (
    <Card>
      <CardHeader title={t('settings.appearance')} />
      <div className="flex flex-col gap-4">
        <div>
          <p id="theme-label" className="mb-1.5 text-sm font-medium text-ink">
            {t('settings.theme')}
          </p>
          <div
            role="group"
            aria-labelledby="theme-label"
            className="flex gap-1 rounded-lg border border-line p-1"
          >
            {THEMES.map(({ id, icon: Icon }) => (
              <button
                key={id}
                type="button"
                aria-pressed={theme === id}
                onClick={() => setTheme(id)}
                className={cn(
                  'flex min-h-9 flex-1 items-center justify-center gap-2 rounded-md px-2 text-sm font-medium',
                  theme === id ? 'bg-accent text-white' : 'text-ink-2 hover:bg-surface-2',
                )}
              >
                <Icon className="size-4" aria-hidden />
                {t(`settings.themes.${id}`)}
              </button>
            ))}
          </div>
        </div>
        <SelectField
          label={t('settings.language')}
          value={language}
          onChange={(event) => setLanguage(event.target.value as Language)}
        >
          <option value="uk">Українська</option>
          <option value="en">English</option>
        </SelectField>
      </div>
    </Card>
  );
}

function NotificationsCard() {
  const { t } = useTranslation();
  const { browserNotifications, setBrowserNotifications } = useSettingsStore();
  const supported = 'Notification' in window;

  const toggle = async (enabled: boolean) => {
    if (!enabled) {
      setBrowserNotifications(false);
      return;
    }
    // Дозвіл запитуємо лише у відповідь на дію користувача — так вимагають браузери.
    const permission = await Notification.requestPermission();
    setBrowserNotifications(permission === 'granted');
    if (permission !== 'granted') toast.error(t('settings.notificationsDenied'));
  };

  return (
    <Card>
      <CardHeader title={t('settings.notifications')} subtitle={t('settings.notificationsHint')} />
      <label className="flex min-h-10 items-center gap-3 text-sm text-ink">
        <input
          type="checkbox"
          className="size-4 accent-(--accent)"
          checked={browserNotifications && supported}
          disabled={!supported}
          onChange={(event) => void toggle(event.target.checked)}
        />
        {t('settings.browserNotifications')}
      </label>
      {!supported && (
        <p className="mt-1 text-xs text-ink-2">{t('settings.notificationsUnsupported')}</p>
      )}
    </Card>
  );
}

function TariffsCard() {
  const { t } = useTranslation();
  const user = useCurrentUser();
  const { data, isPending, isError, refetch } = useTariffs();
  const updateTariffs = useUpdateTariffs();
  const canEdit = user.role === 'admin';

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<TariffsValues>({ resolver: zodResolver(tariffsSchema) });

  useEffect(() => {
    if (data) reset(data);
  }, [data, reset]);

  const onSubmit = handleSubmit((values) =>
    updateTariffs.mutate(values, {
      onSuccess: () => toast.success(t('settings.tariffsSaved')),
      onError: () => toast.error(t('common.unexpectedError')),
    }),
  );

  const zoneHint = t('settings.nightZone', { from: NIGHT_START_HOUR, to: NIGHT_END_HOUR });

  return (
    <Card>
      <CardHeader
        title={t('settings.tariffs')}
        subtitle={canEdit ? t('settings.tariffsAdminHint') : zoneHint}
      />
      {isPending ? (
        <Skeleton className="h-20 w-full" />
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : canEdit ? (
        <form onSubmit={(event) => void onSubmit(event)} noValidate className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label={t('settings.dayTariff')}
              type="number"
              inputMode="decimal"
              step="0.01"
              min={0}
              error={errors.day?.message}
              {...register('day', { valueAsNumber: true })}
            />
            <TextField
              label={t('settings.nightTariff')}
              type="number"
              inputMode="decimal"
              step="0.01"
              min={0}
              hint={zoneHint}
              error={errors.night?.message}
              {...register('night', { valueAsNumber: true })}
            />
          </div>
          <Button
            type="submit"
            className="self-start"
            loading={updateTariffs.isPending}
            disabled={!isDirty}
          >
            {t('common.save')}
          </Button>
        </form>
      ) : (
        <dl className="grid grid-cols-2 gap-4">
          <div>
            <dt className="text-sm text-ink-2">{t('settings.dayTariff')}</dt>
            <dd className="text-lg font-semibold text-ink">{formatMoney(data.day)}</dd>
          </div>
          <div>
            <dt className="text-sm text-ink-2">{t('settings.nightTariff')}</dt>
            <dd className="text-lg font-semibold text-ink">{formatMoney(data.night)}</dd>
          </div>
        </dl>
      )}
    </Card>
  );
}

function ProfileCard() {
  const { t } = useTranslation();
  const user = useCurrentUser();

  return (
    <Card>
      <CardHeader title={t('settings.profile')} />
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-ink-2">{t('auth.name')}</dt>
          <dd className="font-medium text-ink">{user.name}</dd>
        </div>
        <div>
          <dt className="text-ink-2">{t('auth.email')}</dt>
          <dd className="font-medium break-all text-ink">{user.email}</dd>
        </div>
        <div>
          <dt className="text-ink-2">{t('settings.role')}</dt>
          <dd className="font-medium text-ink">
            {user.apartmentId === null
              ? t('roles.admin')
              : t('roles.residentOf', { apartment: user.apartmentId })}
          </dd>
        </div>
      </dl>
      <Button variant="secondary" className="mt-4" onClick={() => void logout()}>
        {t('auth.logout')}
      </Button>
    </Card>
  );
}

export function SettingsPage() {
  const { t } = useTranslation();
  return (
    <>
      <PageHeader title={t('settings.title')} />
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <ProfileCard />
        <AppearanceCard />
        <TariffsCard />
        <NotificationsCard />
      </div>
    </>
  );
}
