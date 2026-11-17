import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import i18n from '@/shared/i18n';

export type ThemeChoice = 'system' | 'light' | 'dark';
export type Language = 'uk' | 'en';

export const SETTINGS_STORAGE_KEY = 'em-settings';

interface SettingsState {
  theme: ThemeChoice;
  language: Language;
  /** За скільки хвилин до відключення нагадувати; 0 — не нагадувати. */
  reminderMinutes: number;
  browserNotifications: boolean;
  setTheme: (theme: ThemeChoice) => void;
  setLanguage: (language: Language) => void;
  setReminderMinutes: (minutes: number) => void;
  setBrowserNotifications: (enabled: boolean) => void;
}

const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');

function applyTheme(theme: ThemeChoice): void {
  const resolved = theme === 'system' ? (darkQuery.matches ? 'dark' : 'light') : theme;
  document.documentElement.dataset.theme = resolved;
}

function applyLanguage(language: Language): void {
  document.documentElement.lang = language;
  if (i18n.language !== language) void i18n.changeLanguage(language);
}

// Тут лише налаштування інтерфейсу — нічого чутливого, тому localStorage підходить.
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'system',
      language: 'uk',
      reminderMinutes: 30,
      browserNotifications: false,
      setTheme: (theme) => {
        applyTheme(theme);
        set({ theme });
      },
      setLanguage: (language) => {
        applyLanguage(language);
        set({ language });
      },
      setReminderMinutes: (reminderMinutes) => set({ reminderMinutes }),
      setBrowserNotifications: (browserNotifications) => set({ browserNotifications }),
    }),
    { name: SETTINGS_STORAGE_KEY },
  ),
);

/** Викликається один раз до першого рендера, щоб тема не «блимала». */
export function initSettings(): void {
  const { theme, language } = useSettingsStore.getState();
  applyTheme(theme);
  applyLanguage(language);
  darkQuery.addEventListener('change', () => applyTheme(useSettingsStore.getState().theme));
}
