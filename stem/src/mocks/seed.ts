import type { Role } from '@/shared/api/types';

/**
 * Демо-дані для мок-сервера. Це НЕ справжні облікові записи: вони існують лише
 * в localStorage браузера і потрібні, щоб застосунок можна було показати без бекенду.
 */

interface DemoAccount {
  name: string;
  email: string;
  password: string;
  role: Role;
  apartmentId: number | null;
}

export const DEMO_ACCOUNTS: readonly DemoAccount[] = [
  {
    name: 'Марія Петренко',
    email: 'resident@demo.ua',
    password: 'Demo1234',
    role: 'resident',
    apartmentId: 12,
  },
  {
    name: 'Олег Гнатюк',
    email: 'admin@demo.ua',
    password: 'Admin1234',
    role: 'admin',
    apartmentId: null,
  },
];

/** Запрошення для демонстрації реєстрації нового мешканця. */
export const DEMO_INVITE = { code: 'OSBB-KV07-2026', apartmentId: 7 } as const;
