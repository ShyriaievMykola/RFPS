import { startOfMonth } from 'date-fns';
import { delay, http, HttpResponse } from 'msw';
import type {
  Announcement,
  ApartmentSummary,
  BuildingOverview,
  CommonMeter,
  CommonMeterId,
  Invite,
  SimulatedState,
} from '@/shared/api/types';
import { announcementSchema } from '@/shared/lib/schemas';
import { db, mutate, newId } from '../db';
import { livePowerKw, totalBetween, type MeterOptions } from '../generator';
import { fail, requireUser } from '../session';
import { syncSimulation } from './energy';

// Спільні споживачі будинку: окремі «лічильники» з більшою потужністю,
// які продовжують працювати від генератора під час відключень.
const COMMON_METERS: readonly { id: CommonMeterId; meterId: number; options: MeterOptions }[] = [
  { id: 'elevator', meterId: 9001, options: { scale: 4.5, survivesOutage: true } },
  { id: 'lighting', meterId: 9002, options: { scale: 2.2, survivesOutage: true } },
  { id: 'pumps', meterId: 9003, options: { scale: 3.4, survivesOutage: true } },
];

const SIMULATED_STATES: readonly SimulatedState[] = [
  'auto',
  'grid',
  'starting',
  'running',
  'lowFuel',
  'battery',
  'fault',
];

function residentName(apartmentId: number): string | null {
  const account = db().users.find((user) => user.apartmentId === apartmentId);
  if (account) return account.name;
  return db().apartments.find((item) => item.id === apartmentId)?.residentName ?? null;
}

function generateInviteCode(apartmentId: number): string {
  const random = newId().slice(0, 4).toUpperCase();
  return `OSBB-KV${String(apartmentId).padStart(2, '0')}-${random}`;
}

export const adminHandlers = [
  http.get('/api/admin/building', async ({ request }) => {
    requireUser(request, 'admin');
    await delay(350);
    const now = new Date();
    const monthStart = startOfMonth(now);

    const meters: CommonMeter[] = COMMON_METERS.map(({ id, meterId, options }) => ({
      id,
      powerKw: livePowerKw(meterId, now, options),
      monthKwh: totalBetween(meterId, monthStart, now, now, options),
    }));
    const apartments = db().apartments;
    const body: BuildingOverview = {
      apartmentsTotal: apartments.length,
      apartmentsOccupied: apartments.filter((item) => residentName(item.id) !== null).length,
      monthKwhApartments: apartments.reduce(
        (sum, item) => sum + totalBetween(item.id, monthStart, now, now),
        0,
      ),
      monthKwhCommon: meters.reduce((sum, meter) => sum + meter.monthKwh, 0),
      meters,
    };
    return HttpResponse.json(body);
  }),

  http.get('/api/admin/apartments', async ({ request }) => {
    requireUser(request, 'admin');
    await delay(350);
    const now = new Date();
    const monthStart = startOfMonth(now);
    const body: ApartmentSummary[] = db().apartments.map((apartment) => ({
      id: apartment.id,
      floor: apartment.floor,
      residentName: residentName(apartment.id),
      monthKwh: totalBetween(apartment.id, monthStart, now, now),
      inviteCode:
        db().invites.find((invite) => invite.apartmentId === apartment.id && !invite.used)?.code ??
        null,
    }));
    return HttpResponse.json(body);
  }),

  http.post('/api/admin/invites', async ({ request }) => {
    requireUser(request, 'admin');
    const { apartmentId } = (await request.json()) as { apartmentId?: unknown };
    const apartment = db().apartments.find((item) => item.id === apartmentId);
    if (!apartment) return fail(404, 'not_found');
    if (residentName(apartment.id) !== null) return fail(409, 'apartment_occupied');
    await delay(300);

    const existing = db().invites.find((item) => item.apartmentId === apartment.id && !item.used);
    const invite: Invite = existing
      ? { code: existing.code, apartmentId: apartment.id }
      : { code: generateInviteCode(apartment.id), apartmentId: apartment.id };
    if (!existing) mutate((data) => data.invites.push({ ...invite, used: false }));
    return HttpResponse.json(invite, { status: 201 });
  }),

  http.get('/api/admin/simulation', ({ request }) => {
    requireUser(request, 'admin');
    syncSimulation(new Date());
    return HttpResponse.json({ state: db().simulation });
  }),

  http.put('/api/admin/simulation', async ({ request }) => {
    requireUser(request, 'admin');
    const { state } = (await request.json()) as { state?: SimulatedState };
    if (!state || !SIMULATED_STATES.includes(state)) return fail(400, 'validation');
    mutate((data) => {
      data.simulation = state;
      data.simulationSince = new Date().toISOString();
    });
    return HttpResponse.json({ state });
  }),

  // --- Оголошення: читати можуть усі, змінювати — лише адміністратор ---

  http.get('/api/announcements', async ({ request }) => {
    requireUser(request);
    await delay(300);
    const body = [...db().announcements].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return HttpResponse.json(body);
  }),

  http.post('/api/announcements', async ({ request }) => {
    const user = requireUser(request, 'admin');
    const parsed = announcementSchema.safeParse(await request.json());
    if (!parsed.success) return fail(400, 'validation');
    await delay(350);

    const announcement: Announcement = {
      id: newId(),
      title: parsed.data.title,
      bodyHtml: parsed.data.bodyHtml,
      createdAt: new Date().toISOString(),
      author: user.name,
    };
    mutate((data) => {
      data.announcements.push(announcement);
      for (const recipient of data.users) {
        if (recipient.id === user.id) continue;
        data.notifications.push({
          id: newId(),
          userId: recipient.id,
          key: `announcement:${announcement.id}`,
          kind: 'announcement',
          params: { title: announcement.title },
          createdAt: announcement.createdAt,
          read: false,
        });
      }
    });
    return HttpResponse.json(announcement, { status: 201 });
  }),

  http.delete('/api/announcements/:id', async ({ request, params }) => {
    requireUser(request, 'admin');
    if (!db().announcements.some((item) => item.id === params.id)) return fail(404, 'not_found');
    await delay(250);
    mutate((data) => {
      data.announcements = data.announcements.filter((item) => item.id !== params.id);
    });
    return new HttpResponse(null, { status: 204 });
  }),
];
