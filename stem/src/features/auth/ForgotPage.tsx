import { zodResolver } from '@hookform/resolvers/zod';
import { MailCheck } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { forgotSchema, type ForgotValues } from '@/shared/lib/schemas';
import { Button } from '@/shared/ui/Button';
import { TextField } from '@/shared/ui/Field';
import { requestPasswordReset } from './api';
import { AuthLayout, LINK_CLASS } from './AuthLayout';

export function ForgotPage() {
  const { t } = useTranslation();
  const [sent, setSent] = useState(false);
  const [failed, setFailed] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotValues>({ resolver: zodResolver(forgotSchema) });

  const onSubmit = handleSubmit(async ({ email }) => {
    setFailed(false);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch {
      setFailed(true);
    }
  });

  return (
    <AuthLayout
      title={t('auth.forgotTitle')}
      subtitle={sent ? undefined : t('auth.forgotSubtitle')}
      footer={
        <Link to="/login" className={LINK_CLASS}>
          {t('auth.backToLogin')}
        </Link>
      }
    >
      {sent ? (
        <div role="status" className="flex flex-col items-center gap-3 text-center">
          <MailCheck className="size-10 text-good-text" aria-hidden />
          {/* Текст однаковий для будь-якої адреси: не підказуємо, чи вона зареєстрована. */}
          <p className="text-sm text-ink-2">{t('auth.forgotSent')}</p>
        </div>
      ) : (
        <form onSubmit={(event) => void onSubmit(event)} noValidate className="flex flex-col gap-4">
          <TextField
            label={t('auth.email')}
            type="email"
            autoComplete="username"
            inputMode="email"
            error={errors.email?.message}
            {...register('email')}
          />
          {failed && (
            <p
              role="alert"
              className="rounded-lg bg-critical/10 px-3 py-2 text-sm text-critical-text"
            >
              {t('common.unexpectedError')}
            </p>
          )}
          <Button type="submit" loading={isSubmitting}>
            {t('auth.forgotAction')}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
