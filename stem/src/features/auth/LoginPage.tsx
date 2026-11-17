import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate } from 'react-router';
import { DEMO_ACCOUNTS } from '@/mocks/seed';
import { ApiError } from '@/shared/api/client';
import { loginSchema, type LoginValues } from '@/shared/lib/schemas';
import { Button } from '@/shared/ui/Button';
import { TextField } from '@/shared/ui/Field';
import { login } from './api';
import { AuthLayout, LINK_CLASS } from './AuthLayout';

/** Зворотний відлік блокування входу, секунди. */
function useCountdown(): [number, (seconds: number) => void] {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (seconds <= 0) return;
    const timer = window.setTimeout(() => setSeconds((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [seconds]);
  return [seconds, setSeconds];
}

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [formError, setFormError] = useState<string | null>(null);
  const [lockedFor, setLockedFor] = useCountdown();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await login(values);
      // Повертаємо туди, куди користувач ішов до перенаправлення на вхід.
      const from = (location.state as { from?: string } | null)?.from;
      void navigate(from ?? '/', { replace: true });
    } catch (error) {
      if (error instanceof ApiError && error.code === 'locked') {
        setLockedFor(Number(error.details.retryAfterSec) || 30);
      } else if (error instanceof ApiError && error.code === 'invalid_credentials') {
        setFormError(t('auth.invalidCredentials', { count: Number(error.details.attemptsLeft) }));
      } else {
        setFormError(t('common.unexpectedError'));
      }
    }
  });

  const fillDemo = (role: 'resident' | 'admin') => {
    const account = DEMO_ACCOUNTS.find((item) => item.role === role);
    if (!account) return;
    setValue('email', account.email, { shouldValidate: true });
    setValue('password', account.password, { shouldValidate: true });
  };

  return (
    <AuthLayout
      title={t('auth.loginTitle')}
      subtitle={t('auth.loginSubtitle')}
      footer={
        <>
          {t('auth.noAccount')}{' '}
          <Link to="/register" className={LINK_CLASS}>
            {t('auth.registerLink')}
          </Link>
        </>
      }
    >
      <form onSubmit={(event) => void onSubmit(event)} noValidate className="flex flex-col gap-4">
        <TextField
          label={t('auth.email')}
          type="email"
          autoComplete="username"
          inputMode="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <TextField
          label={t('auth.password')}
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />

        {lockedFor > 0 && (
          <p
            role="alert"
            className="rounded-lg bg-critical/10 px-3 py-2 text-sm text-critical-text"
          >
            {t('auth.locked', { count: lockedFor })}
          </p>
        )}
        {formError && lockedFor === 0 && (
          <p
            role="alert"
            className="rounded-lg bg-critical/10 px-3 py-2 text-sm text-critical-text"
          >
            {formError}
          </p>
        )}

        <Button type="submit" loading={isSubmitting} disabled={lockedFor > 0}>
          {t('auth.loginAction')}
        </Button>
        <Link to="/forgot" className={`${LINK_CLASS} text-center text-sm`}>
          {t('auth.forgotLink')}
        </Link>
      </form>

      <div className="mt-5 border-t border-line pt-4">
        <p className="mb-2 text-xs text-ink-2">{t('auth.demoHint')}</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => fillDemo('resident')}>
            {t('auth.demoResident')}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => fillDemo('admin')}>
            {t('auth.demoAdmin')}
          </Button>
        </div>
      </div>
    </AuthLayout>
  );
}
