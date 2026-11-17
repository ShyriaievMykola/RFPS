import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type {
  Announcement,
  AnnouncementInput,
  ApartmentSummary,
  AppNotification,
  BuildingOverview,
  ConsumptionPoint,
  Granularity,
  Invite,
  Limit,
  LimitInput,
  LiveReading,
  OutageSchedule,
  PowerStatus,
  SimulatedState,
  Tariffs,
} from './types';

export const queryKeys = {
  power: ['power'] as const,
  live: ['live'] as const,
  consumption: (from: string, to: string, granularity: Granularity) =>
    ['consumption', granularity, from, to] as const,
  outages: (from: string, to: string) => ['outages', from, to] as const,
  limits: ['limits'] as const,
  notifications: ['notifications'] as const,
  tariffs: ['tariffs'] as const,
  announcements: ['announcements'] as const,
  building: ['admin', 'building'] as const,
  apartments: ['admin', 'apartments'] as const,
  simulation: ['admin', 'simulation'] as const,
};

const SECOND = 1000;
const MINUTE = 60 * SECOND;

// --- Енергія -----------------------------------------------------------------

export function usePowerStatus() {
  return useQuery({
    queryKey: queryKeys.power,
    queryFn: ({ signal }) => api<PowerStatus>('/power/status', { signal }),
    refetchInterval: 5 * SECOND,
  });
}

export function useLivePower() {
  return useQuery({
    queryKey: queryKeys.live,
    queryFn: ({ signal }) => api<LiveReading>('/consumption/live', { signal }),
    refetchInterval: 3 * SECOND,
  });
}

interface ConsumptionArgs {
  from: Date;
  to: Date;
  granularity: Granularity;
  enabled?: boolean;
}

export function useConsumption({ from, to, granularity, enabled = true }: ConsumptionArgs) {
  const fromIso = from.toISOString();
  const toIso = to.toISOString();
  return useQuery({
    queryKey: queryKeys.consumption(fromIso, toIso, granularity),
    queryFn: ({ signal }) =>
      api<ConsumptionPoint[]>('/consumption', {
        params: { from: fromIso, to: toIso, granularity },
        signal,
      }),
    enabled,
    staleTime: MINUTE,
    refetchInterval: MINUTE,
    // Під час зміни періоду лишаємо попередній графік, щоб макет не «стрибав».
    placeholderData: keepPreviousData,
  });
}

export function useOutages(from: Date, to: Date) {
  const fromIso = from.toISOString();
  const toIso = to.toISOString();
  return useQuery({
    queryKey: queryKeys.outages(fromIso, toIso),
    queryFn: ({ signal }) =>
      api<OutageSchedule>('/outages', { params: { from: fromIso, to: toIso }, signal }),
    staleTime: 5 * MINUTE,
  });
}

export function useTariffs() {
  return useQuery({
    queryKey: queryKeys.tariffs,
    queryFn: ({ signal }) => api<Tariffs>('/tariffs', { signal }),
    staleTime: 10 * MINUTE,
  });
}

export function useUpdateTariffs() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tariffs: Tariffs) => api<Tariffs>('/tariffs', { method: 'PUT', body: tariffs }),
    onSuccess: (tariffs) => queryClient.setQueryData(queryKeys.tariffs, tariffs),
  });
}

// --- Ліміти ------------------------------------------------------------------

export function useLimits() {
  return useQuery({
    queryKey: queryKeys.limits,
    queryFn: ({ signal }) => api<Limit[]>('/limits', { signal }),
    refetchInterval: MINUTE,
  });
}

function useLimitMutation<TArgs>(mutationFn: (args: TArgs) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.limits }),
        queryClient.invalidateQueries({ queryKey: queryKeys.notifications }),
      ]),
  });
}

export function useCreateLimit() {
  return useLimitMutation((input: LimitInput) =>
    api<Limit>('/limits', { method: 'POST', body: input }),
  );
}

export function useUpdateLimit() {
  return useLimitMutation(({ id, input }: { id: string; input: Partial<LimitInput> }) =>
    api<Limit>(`/limits/${id}`, { method: 'PATCH', body: input }),
  );
}

export function useDeleteLimit() {
  return useLimitMutation((id: string) => api<void>(`/limits/${id}`, { method: 'DELETE' }));
}

// --- Сповіщення та оголошення ------------------------------------------------

export function useNotifications() {
  return useQuery({
    queryKey: queryKeys.notifications,
    queryFn: ({ signal }) => api<AppNotification[]>('/notifications', { signal }),
    refetchInterval: 20 * SECOND,
  });
}

export function useMarkNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api<void>('/notifications/read', { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications }),
  });
}

export function useAnnouncements() {
  return useQuery({
    queryKey: queryKeys.announcements,
    queryFn: ({ signal }) => api<Announcement[]>('/announcements', { signal }),
    staleTime: MINUTE,
  });
}

export function useCreateAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AnnouncementInput) =>
      api<Announcement>('/announcements', { method: 'POST', body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.announcements }),
  });
}

export function useDeleteAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<void>(`/announcements/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.announcements }),
  });
}

// --- Адміністратор -----------------------------------------------------------

export function useBuildingOverview() {
  return useQuery({
    queryKey: queryKeys.building,
    queryFn: ({ signal }) => api<BuildingOverview>('/admin/building', { signal }),
    refetchInterval: 10 * SECOND,
  });
}

export function useApartments() {
  return useQuery({
    queryKey: queryKeys.apartments,
    queryFn: ({ signal }) => api<ApartmentSummary[]>('/admin/apartments', { signal }),
    staleTime: MINUTE,
  });
}

export function useCreateInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (apartmentId: number) =>
      api<Invite>('/admin/invites', { method: 'POST', body: { apartmentId } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.apartments }),
  });
}

export function useSimulation() {
  return useQuery({
    queryKey: queryKeys.simulation,
    queryFn: ({ signal }) => api<{ state: SimulatedState }>('/admin/simulation', { signal }),
    // Симулятор сам переходить із «Запуску» в «Працює», тож список має це побачити.
    refetchInterval: 5 * SECOND,
  });
}

export function useSetSimulation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (state: SimulatedState) =>
      api<{ state: SimulatedState }>('/admin/simulation', { method: 'PUT', body: { state } }),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.simulation, data);
      return queryClient.invalidateQueries({ queryKey: queryKeys.power });
    },
  });
}
