import type {
  Announcement,
  AppNotification,
  LimitInput,
  Role,
  SimulatedState,
  Tariffs,
} from '@/shared/api/types';
import { hash01 } from './generator';
import { DEMO_ACCOUNTS, DEMO_INVITE } from './seed';

/**
 * «База даних» мок-сервера. Зберігається в localStorage, щоб створені ліміти,
 * оголошення та зареєстровані користувачі переживали перезавантаження сторінки.
 */

export interface DbUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  apartmentId: number | null;
  passwordHash: string;
  salt: string;
}

export interface DbLimit extends LimitInput {
  id: string;
  userId: string;
}

export interface DbNotification extends AppNotification {
  userId: string;
  /** Ключ події: не дає створити те саме сповіщення двічі за один період. */
  key: string;
}

export interface DbApartment {
  id: number;
  floor: number;
  /** Ім'я мешканця без облікового запису (заповнено для частини квартир). */
  residentName: string | null;
}

interface DbInvite {
  code: string;
  apartmentId: number;
  used: boolean;
}

interface LoginAttempts {
  count: number;
  lockedUntil: number;
}

interface Database {
  users: DbUser[];
  apartments: DbApartment[];
  invites: DbInvite[];
  limits: DbLimit[];
  notifications: DbNotification[];
  announcements: Announcement[];
  tariffs: Tariffs;
  simulation: SimulatedState;
  simulationSince?: string;
  loginAttempts: Record<string, LoginAttempts>;
}

const STORAGE_KEY = 'em-mock-db-v1';
const FLOORS = 9;
const APARTMENTS_PER_FLOOR = 4;

const RESIDENT_NAMES = [
  'Олена Коваленко',
  'Андрій Мельник',
  'Наталія Шевченко',
  'Сергій Бондаренко',
  'Ірина Ткаченко',
  'Володимир Кравченко',
  'Тетяна Олійник',
  'Дмитро Поліщук',
  'Оксана Савченко',
  'Юрій Лисенко',
];

export function newId(): string {
  return crypto.randomUUID();
}

export async function hashPassword(password: string, salt: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${salt}:${password}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function seed(): Promise<Database> {
  const apartments: DbApartment[] = [];
  for (let id = 1; id <= FLOORS * APARTMENTS_PER_FLOOR; id++) {
    const occupied = hash01(id, 11) < 0.7;
    const name = RESIDENT_NAMES[Math.floor(hash01(id, 12) * RESIDENT_NAMES.length)] ?? null;
    apartments.push({
      id,
      floor: Math.ceil(id / APARTMENTS_PER_FLOOR),
      residentName: occupied ? name : null,
    });
  }

  const users: DbUser[] = [];
  for (const account of DEMO_ACCOUNTS) {
    const salt = newId();
    users.push({
      id: newId(),
      name: account.name,
      email: account.email,
      role: account.role,
      apartmentId: account.apartmentId,
      salt,
      passwordHash: await hashPassword(account.password, salt),
    });
    const apartment = apartments.find((item) => item.id === account.apartmentId);
    if (apartment) apartment.residentName = null;
  }
  // Квартира з демо-запрошенням має бути вільною.
  const invited = apartments.find((item) => item.id === DEMO_INVITE.apartmentId);
  if (invited) invited.residentName = null;

  const resident = users.find((user) => user.role === 'resident');
  const admin = users.find((user) => user.role === 'admin');

  return {
    users,
    apartments,
    invites: [{ ...DEMO_INVITE, used: false }],
    limits: resident
      ? [
          {
            id: newId(),
            userId: resident.id,
            name: 'Місячний бюджет',
            period: 'month',
            thresholdKwh: 250,
            enabled: true,
          },
          {
            id: newId(),
            userId: resident.id,
            name: 'Добова норма',
            period: 'day',
            thresholdKwh: 12,
            enabled: true,
          },
        ]
      : [],
    notifications: [],
    announcements: [
      {
        id: newId(),
        title: 'Планове обслуговування генератора',
        bodyHtml:
          '<p>У суботу з <b>10:00 до 12:00</b> проводитиметься технічне обслуговування генератора. ' +
          'У цей час резервне живлення ліфтів буде недоступне.</p>',
        createdAt: new Date(Date.now() - 2 * 86_400_000).toISOString(),
        author: admin?.name ?? 'Правління ОСББ',
      },
    ],
    tariffs: { day: 4.32, night: 2.16 },
    simulation: 'auto',
    loginAttempts: {},
  };
}

let database: Database | null = null;

export async function initDb(): Promise<void> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      database = JSON.parse(raw) as Database;
      return;
    }
  } catch {
    // Пошкоджені або недоступні дані — просто створюємо базу заново.
  }
  database = await seed();
  persist();
}

function persist(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(database));
  } catch {
    // Приватний режим або переповнене сховище: працюємо лише в пам'яті.
  }
}

export function db(): Database {
  if (!database) throw new Error('Мок-базу не ініціалізовано: спершу викличте initDb()');
  return database;
}

/** Змінює базу й одразу зберігає її. */
export function mutate<T>(change: (data: Database) => T): T {
  const result = change(db());
  persist();
  return result;
}

// Синхронізація вкладок: справжній сервер один для всіх клієнтів, а мок живе в кожній
// вкладці окремо. Подія storage приходить, коли базу змінила інша вкладка цього браузера, —
// перечитуємо її, і наступне опитування поверне вже новий стан (напр. стан симулятора).
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY || event.newValue === null) return;
    try {
      database = JSON.parse(event.newValue) as Database;
    } catch {
      // Пошкоджені дані з іншої вкладки ігноруємо й лишаємо поточну базу.
    }
  });
}
