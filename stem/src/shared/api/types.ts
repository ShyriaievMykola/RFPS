// Контракт між клієнтом і сервером. Мок-сервер (src/mocks) реалізує саме ці типи,
// тому заміна на справжній бекенд не зачіпає решту застосунку.

export type Role = 'resident' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  apartmentId: number | null;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export type PowerSource = 'grid' | 'generator' | 'battery' | 'fault';
export type GeneratorState = 'off' | 'starting' | 'running' | 'lowFuel';

export interface PowerStatus {
  source: PowerSource;
  /** ISO-час, відколи діє поточне джерело. */
  since: string;
  generator: { state: GeneratorState; fuelPct: number; engineHours: number };
  battery: { chargePct: number };
  /** true, якщо стан задано вручну через симулятор адміністратора. */
  simulated: boolean;
}

export type SimulatedState =
  'auto' | 'grid' | 'starting' | 'running' | 'lowFuel' | 'battery' | 'fault';

export type Granularity = 'hour' | 'day' | 'month';

/** Споживання за інтервал, кВт·год, розділене за тарифними зонами. */
export interface ConsumptionPoint {
  ts: string;
  day: number;
  night: number;
}

export interface LiveReading {
  ts: string;
  powerKw: number;
}

export type OutageKind = 'planned' | 'emergency';

export interface Outage {
  id: string;
  start: string;
  end: string;
  kind: OutageKind;
}

export interface OutageSchedule {
  queue: string;
  outages: Outage[];
}

export type LimitPeriod = 'day' | 'month';

export interface Limit {
  id: string;
  name: string;
  period: LimitPeriod;
  thresholdKwh: number;
  enabled: boolean;
  /** Споживання за поточний період, рахує сервер. */
  usedKwh: number;
}

export type LimitInput = Pick<Limit, 'name' | 'period' | 'thresholdKwh' | 'enabled'>;

export type NotificationKind = 'limitWarning' | 'limitExceeded' | 'announcement';

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  /** Параметри для локалізованого шаблону тексту. */
  params: Record<string, string | number>;
  createdAt: string;
  read: boolean;
}

export interface Tariffs {
  /** грн за кВт·год */
  day: number;
  night: number;
}

export interface Announcement {
  id: string;
  title: string;
  /** HTML від адміністратора; перед показом очищається DOMPurify. */
  bodyHtml: string;
  createdAt: string;
  author: string;
}

export type AnnouncementInput = Pick<Announcement, 'title' | 'bodyHtml'>;

export type CommonMeterId = 'elevator' | 'lighting' | 'pumps';

export interface CommonMeter {
  id: CommonMeterId;
  powerKw: number;
  monthKwh: number;
}

export interface BuildingOverview {
  apartmentsTotal: number;
  apartmentsOccupied: number;
  monthKwhApartments: number;
  monthKwhCommon: number;
  meters: CommonMeter[];
}

export interface ApartmentSummary {
  id: number;
  floor: number;
  residentName: string | null;
  monthKwh: number;
  inviteCode: string | null;
}

export interface Invite {
  code: string;
  apartmentId: number;
}
