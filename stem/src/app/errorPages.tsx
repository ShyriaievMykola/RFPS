import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

const ACTION =
  'inline-flex min-h-10 items-center rounded-lg bg-accent px-4 text-sm font-medium text-white hover:bg-accent-hover';

export function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-16 text-center">
      <p className="text-5xl font-semibold text-ink">404</p>
      <h1 className="text-lg font-medium text-ink">{t('errors.notFoundTitle')}</h1>
      <p className="max-w-sm text-sm text-ink-2">{t('errors.notFoundText')}</p>
      <Link to="/" className={ACTION}>
        {t('errors.goHome')}
      </Link>
    </div>
  );
}

/** Запасний екран на випадок помилки під час рендера або завантаження сторінки. */
export function RouteErrorPage() {
  const { t } = useTranslation();
  return (
    <div
      role="alert"
      className="flex min-h-dvh flex-col items-center justify-center gap-3 px-4 text-center"
    >
      <h1 className="text-lg font-medium text-ink">{t('errors.crashTitle')}</h1>
      <p className="max-w-sm text-sm text-ink-2">{t('errors.crashText')}</p>
      <button type="button" className={ACTION} onClick={() => window.location.reload()}>
        {t('errors.reload')}
      </button>
    </div>
  );
}
