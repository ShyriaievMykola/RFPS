import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';
import { ApiError } from '@/shared/api/client';
import { registerSchema, type RegisterValues } from '@/shared/lib/schemas';
import { Button } from '@/shared/ui/Button';
import { TextField } from '@/shared/ui/Field';
import { register as registerAccount } from './api';
import { AuthLayout, LINK_CLASS } from './AuthLayout';

export function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({ resolver: zodResolver(registerSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await registerAccount(values);
      void navigate('/', { replace: true });
    } catch (error) {
      // Помилки сервера прив'язуємо до конкретного поля, щоб було зрозуміло, що виправляти.
      if (error instanceof ApiError && error.code === 'invalid_invite') {
        setError('inviteCode', { message: 'auth.invalidInvite' }, { shouldFocus: true });
      } else if (error instanceof ApiError && error.code === 'email_taken') {
        setError('email', { message: 'auth.emailTaken' }, { shouldFocus: true });
      } else {
        setFormError(t('common.unexpectedError'));
      }
    }
  });

  return (
    <AuthLayout
      title={t('auth.registerTitle')}
      subtitle={t('auth.registerSubtitle')}
      footer={
        <>
          {t('auth.haveAccount')}{' '}
          <Link to="/login" className={LINK_CLASS}>
            {t('auth.loginLink')}
          </Link>
        </>
      }
    >
      <form onSubmit={(event) => void onSubmit(event)} noValidate className="flex flex-col gap-4">
        <TextField
          label={t('auth.inviteCode')}
          hint={t('auth.inviteHint')}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          error={errors.inviteCode?.message}
          {...register('inviteCode')}
        />
        <TextField
          label={t('auth.name')}
          autoComplete="name"
          error={errors.name?.message}
          {...register('name')}
        />
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
          autoComplete="new-password"
          hint={t('auth.passwordHint')}
          error={errors.password?.message}
          {...register('password')}
        />
        <TextField
          label={t('auth.passwordConfirm')}
          type="password"
          autoComplete="new-password"
          error={errors.passwordConfirm?.message}
          {...register('passwordConfirm')}
        />

        {formError && (
          <p
            role="alert"
            className="rounded-lg bg-critical/10 px-3 py-2 text-sm text-critical-text"
          >
            {formError}
          </p>
        )}

        <Button type="submit" loading={isSubmitting}>
          {t('auth.registerAction')}
        </Button>
      </form>
    </AuthLayout>
  );
}
