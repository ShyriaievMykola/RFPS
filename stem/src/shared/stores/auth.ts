import { create } from 'zustand';
import type { User } from '@/shared/api/types';

type AuthStatus = 'unknown' | 'authenticated' | 'anonymous';

interface AuthState {
  status: AuthStatus;
  user: User | null;
  /**
   * Access-токен живе лише в пам'яті вкладки: у localStorage його міг би прочитати
   * будь-який скрипт у разі XSS. Після перезавантаження сесію відновлює /auth/refresh.
   */
  accessToken: string | null;
  /** true після свідомого виходу: тоді наступний вхід не повертає на попередню сторінку. */
  signedOut: boolean;
  setSession: (user: User, accessToken: string) => void;
  clearSession: (signedOut?: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'unknown',
  user: null,
  accessToken: null,
  signedOut: false,
  setSession: (user, accessToken) =>
    set({ status: 'authenticated', user, accessToken, signedOut: false }),
  clearSession: (signedOut = false) =>
    set({ status: 'anonymous', user: null, accessToken: null, signedOut }),
}));

/** Для компонентів усередині захищених маршрутів, де користувач гарантовано є. */
export function useCurrentUser(): User {
  const user = useAuthStore((state) => state.user);
  if (!user) throw new Error('useCurrentUser викликано поза захищеним маршрутом');
  return user;
}
