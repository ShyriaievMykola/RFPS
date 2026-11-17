import { toast } from 'sonner';
import { useSettingsStore } from '@/shared/stores/settings';

/** Показує нове сповіщення як toast і, якщо дозволено, як системне сповіщення браузера. */
export function announce(title: string, body: string): void {
  toast(title, { description: body });
  const { browserNotifications } = useSettingsStore.getState();
  if (browserNotifications && 'Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/favicon.svg' });
  }
}
