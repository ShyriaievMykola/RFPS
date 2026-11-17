import type { TFunction } from 'i18next';
import { Bell } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMarkNotificationsRead, useNotifications } from '@/shared/api/hooks';
import type { AppNotification } from '@/shared/api/types';
import { formatDateTime, formatNumber } from '@/shared/lib/format';
import { EmptyState } from '@/shared/ui/feedback';
import { announce } from './announce';

const EMPTY: AppNotification[] = [];

function describe(notification: AppNotification, t: TFunction): { title: string; body: string } {
  // Числа з сервера форматуємо за локаллю: «2,6», а не «2.6».
  const params = Object.fromEntries(
    Object.entries(notification.params).map(([key, value]) => [
      key,
      typeof value === 'number' ? formatNumber(value, Number.isInteger(value) ? 0 : 1) : value,
    ]),
  );
  return {
    title: t(`notifications.${notification.kind}.title`, params),
    body: t(`notifications.${notification.kind}.body`, params),
  };
}

export function NotificationBell() {
  const { t } = useTranslation();
  const { data } = useNotifications();
  const notifications = data ?? EMPTY;
  const markRead = useMarkNotificationsRead();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const seenIds = useRef<Set<string> | null>(null);

  const unread = notifications.filter((item) => !item.read).length;

  // Сповіщаємо лише про те, що з'явилося вже під час роботи, а не про весь список на старті.
  useEffect(() => {
    if (!data) return;
    if (seenIds.current === null) {
      seenIds.current = new Set(data.map((item) => item.id));
      return;
    }
    for (const notification of data) {
      if (seenIds.current.has(notification.id)) continue;
      seenIds.current.add(notification.id);
      if (!notification.read) {
        const { title, body } = describe(notification, t);
        announce(title, body);
      }
    }
  }, [data, t]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const toggle = () => {
    setOpen((value) => !value);
    if (!open && unread > 0) markRead.mutate();
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={
          unread > 0 ? t('notifications.openUnread', { count: unread }) : t('notifications.open')
        }
        className="relative grid size-10 place-items-center rounded-lg text-ink-2 hover:bg-surface-2"
      >
        <Bell className="size-5" aria-hidden />
        {unread > 0 && (
          <span
            aria-hidden
            className="absolute top-1 right-1 grid min-w-4 place-items-center rounded-full bg-critical px-1 text-[10px] leading-4 font-semibold text-white"
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <section
          aria-label={t('notifications.title')}
          className="absolute right-0 z-30 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-line bg-surface shadow-lg max-sm:fixed max-sm:inset-x-4 max-sm:w-auto"
        >
          <h2 className="border-b border-line px-4 py-3 text-sm font-semibold text-ink">
            {t('notifications.title')}
          </h2>
          {notifications.length === 0 ? (
            <EmptyState title={t('notifications.empty')} />
          ) : (
            <ul className="max-h-96 overflow-auto">
              {notifications.map((notification) => {
                const { title, body } = describe(notification, t);
                return (
                  <li
                    key={notification.id}
                    className="border-b border-line px-4 py-3 last:border-b-0"
                  >
                    <p className="text-sm font-medium text-ink">{title}</p>
                    <p className="mt-0.5 text-sm text-ink-2">{body}</p>
                    <p className="mt-1 text-xs text-muted">
                      {formatDateTime(notification.createdAt)}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
