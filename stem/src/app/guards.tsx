import { LoaderCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Navigate, Outlet, useLocation } from 'react-router';
import type { Role } from '@/shared/api/types';
import { useAuthStore } from '@/shared/stores/auth';

export function FullPageSpinner() {
  const { t } = useTranslation();
  return (
    <div role="status" className="grid min-h-dvh place-items-center text-ink-2">
      <LoaderCircle className="size-8 animate-spin" aria-hidden />
      <span className="sr-only">{t('common.loading')}</span>
    </div>
  );
}

/** Пускає лише авторизованих; решту відправляє на вхід і запам'ятовує, куди вони йшли. */
export function RequireAuth() {
  const status = useAuthStore((state) => state.status);
  const signedOut = useAuthStore((state) => state.signedOut);
  const location = useLocation();

  if (status === 'unknown') return <FullPageSpinner />;
  if (status === 'anonymous') {
    // Після свідомого виходу сторінку не запам'ятовуємо: наступним може увійти інший користувач.
    const state = signedOut ? null : { from: location.pathname };
    return <Navigate to="/login" replace state={state} />;
  }
  return <Outlet />;
}

/** Сторінки входу та реєстрації авторизованому користувачеві не потрібні. */
export function GuestOnly() {
  const status = useAuthStore((state) => state.status);
  if (status === 'unknown') return <FullPageSpinner />;
  if (status === 'authenticated') return <Navigate to="/" replace />;
  return <Outlet />;
}

/**
 * Обмеження за роллю. Це зручність інтерфейсу, а не захист: дані однаково
 * не віддасть сервер, який перевіряє роль у кожному запиті.
 */
export function RequireRole({ role }: { role: Role }) {
  const userRole = useAuthStore((state) => state.user?.role);
  if (userRole !== role) return <Navigate to="/" replace />;
  return <Outlet />;
}

/** Стартова сторінка залежить від ролі: мешканець бачить свою квартиру, адміністратор — будинок. */
export function HomeRedirect() {
  const role = useAuthStore((state) => state.user?.role);
  return <Navigate to={role === 'admin' ? '/admin' : '/dashboard'} replace />;
}
