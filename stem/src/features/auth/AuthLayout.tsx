import { Zap } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '@/shared/stores/settings';

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  const { t } = useTranslation();
  const language = useSettingsStore((state) => state.language);
  const setLanguage = useSettingsStore((state) => state.setLanguage);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-8">
      <main className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-between">
          <p className="flex items-center gap-2 text-lg font-semibold text-ink">
            <span className="grid size-9 place-items-center rounded-lg bg-accent text-white">
              <Zap className="size-5" aria-hidden />
            </span>
            {t('app.name')}
          </p>
          <button
            type="button"
            onClick={() => setLanguage(language === 'uk' ? 'en' : 'uk')}
            className="min-h-9 rounded-lg px-2 text-sm font-medium text-ink-2 hover:bg-surface-2"
            aria-label={t('settings.language')}
          >
            {language === 'uk' ? 'EN' : 'УКР'}
          </button>
        </div>

        <div className="rounded-xl border border-line bg-surface p-5 sm:p-6">
          <h1 className="text-xl font-semibold text-ink">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-ink-2">{subtitle}</p>}
          <div className="mt-5">{children}</div>
        </div>

        {footer && <div className="mt-4 text-center text-sm text-ink-2">{footer}</div>}
      </main>
    </div>
  );
}

export const LINK_CLASS = 'font-medium text-accent-text underline-offset-2 hover:underline';
