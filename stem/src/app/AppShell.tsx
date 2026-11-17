import {
  Building2,
  CalendarClock,
  ChartColumn,
  FileText,
  Gauge,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Settings,
  Users,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { NavLink, Outlet } from 'react-router';
import { logout } from '@/features/auth/api';
import { NotificationBell } from '@/features/notifications/NotificationBell';
import { useOutageReminder } from '@/features/outages/useOutageReminder';
import type { Role } from '@/shared/api/types';
import { cn } from '@/shared/lib/cn';
import { useCurrentUser } from '@/shared/stores/auth';

interface NavItem {
  to: string;
  labelKey: string;
  icon: LucideIcon;
  end?: boolean;
}

const NAV: Record<Role, NavItem[]> = {
  resident: [
    { to: '/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard },
    { to: '/analytics', labelKey: 'nav.analytics', icon: ChartColumn },
    { to: '/outages', labelKey: 'nav.outages', icon: CalendarClock },
    { to: '/limits', labelKey: 'nav.limits', icon: Gauge },
    { to: '/reports', labelKey: 'nav.reports', icon: FileText },
  ],
  admin: [
    { to: '/admin', labelKey: 'nav.building', icon: Building2, end: true },
    { to: '/admin/apartments', labelKey: 'nav.apartments', icon: Users },
    { to: '/admin/announcements', labelKey: 'nav.announcements', icon: Megaphone },
    { to: '/outages', labelKey: 'nav.outages', icon: CalendarClock },
  ],
};

const SETTINGS_ITEM: NavItem = { to: '/settings', labelKey: 'nav.settings', icon: Settings };

function SideLink({ item }: { item: NavItem }) {
  const { t } = useTranslation();
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        cn(
          'flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium',
          isActive
            ? 'bg-accent-soft text-accent-text'
            : 'text-ink-2 hover:bg-surface-2 hover:text-ink',
        )
      }
    >
      <Icon className="size-5 shrink-0" aria-hidden />
      {t(item.labelKey)}
    </NavLink>
  );
}

function TabLink({ item }: { item: NavItem }) {
  const { t } = useTranslation();
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        cn(
          'flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-medium',
          isActive ? 'text-accent-text' : 'text-ink-2',
        )
      }
    >
      <Icon className="size-5" aria-hidden />
      <span className="max-w-full truncate">{t(item.labelKey)}</span>
    </NavLink>
  );
}

export function AppShell() {
  const { t } = useTranslation();
  const user = useCurrentUser();
  const items = NAV[user.role];
  useOutageReminder();

  return (
    <div className="lg:grid lg:min-h-dvh lg:grid-cols-[15rem_1fr]">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-accent focus:px-3 focus:py-2 focus:text-sm focus:text-white"
      >
        {t('nav.skipToContent')}
      </a>

      {/* Бічне меню — лише на широких екранах */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-surface p-3 lg:flex">
        <p className="mb-4 flex items-center gap-2 px-2 py-2 text-base font-semibold text-ink">
          <span className="grid size-8 place-items-center rounded-lg bg-accent text-white">
            <Zap className="size-4" aria-hidden />
          </span>
          {t('app.name')}
        </p>
        <nav aria-label={t('nav.main')} className="flex flex-1 flex-col gap-1">
          {items.map((item) => (
            <SideLink key={item.to} item={item} />
          ))}
          <div className="mt-auto">
            <SideLink item={SETTINGS_ITEM} />
          </div>
        </nav>
      </aside>

      <div className="flex min-h-dvh min-w-0 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-line bg-surface/95 px-4 py-2 backdrop-blur lg:px-6">
          <p className="flex items-center gap-2 font-semibold text-ink lg:hidden">
            <span className="grid size-8 place-items-center rounded-lg bg-accent text-white">
              <Zap className="size-4" aria-hidden />
            </span>
            <span className="max-[380px]:sr-only">{t('app.name')}</span>
          </p>
          <div className="ml-auto flex items-center gap-1">
            <div className="mr-2 hidden text-right sm:block">
              <p className="text-sm font-medium text-ink">{user.name}</p>
              <p className="text-xs text-ink-2">
                {user.apartmentId === null
                  ? t('roles.admin')
                  : t('roles.residentOf', { apartment: user.apartmentId })}
              </p>
            </div>
            <NotificationBell />
            <NavLink
              to="/settings"
              aria-label={t('nav.settings')}
              className="grid size-10 place-items-center rounded-lg text-ink-2 hover:bg-surface-2 lg:hidden"
            >
              <Settings className="size-5" aria-hidden />
            </NavLink>
            <button
              type="button"
              onClick={() => void logout()}
              aria-label={t('auth.logout')}
              title={t('auth.logout')}
              className="grid size-10 place-items-center rounded-lg text-ink-2 hover:bg-surface-2"
            >
              <LogOut className="size-5" aria-hidden />
            </button>
          </div>
        </header>

        <main
          id="main"
          tabIndex={-1}
          className="mx-auto w-full max-w-6xl flex-1 px-4 py-5 pb-24 lg:px-6 lg:pb-8"
        >
          <Outlet />
        </main>
      </div>

      {/* Нижня панель вкладок — на телефонах і планшетах */}
      <nav
        aria-label={t('nav.main')}
        className="fixed inset-x-0 bottom-0 z-20 flex border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        {items.map((item) => (
          <TabLink key={item.to} item={item} />
        ))}
      </nav>
    </div>
  );
}
