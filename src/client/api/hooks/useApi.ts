import type { AnnouncementDTO, ChatMessageDTO, EventDTO, MemberDTO, ProgressDTO, ScheduleDTO, ScheduleLocationDTO, ScheduleWithFeaturesDTO } from "@/shared/types";
import type { FeatureConfig, FeatureState } from "@/shared/feature-config";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, getSession, signInAsGuest } from "../client";
import { QK } from "../queryKeys";
import { isVisible } from "../../lib/visibility";

export function useSession() {
  return useQuery({ queryKey: QK.session, queryFn: getSession });
}

export function useEvent(eventId: string) {
  return useQuery({
    queryKey: QK.event(eventId),
    queryFn: () => api<{ event: EventDTO; members: MemberDTO[]; viewerIsMember: boolean }>(`/api/events/${eventId}`),
    enabled: Boolean(eventId),
  });
}

export function useMembers(eventId: string) {
  return useQuery({
    queryKey: QK.members(eventId),
    queryFn: () => api<{ members: MemberDTO[] }>(`/api/events/${eventId}/members`),
    refetchInterval: () => (isVisible() ? 30000 : false),
    refetchIntervalInBackground: false,
    enabled: Boolean(eventId),
  });
}

export function useSchedules(eventId: string) {
  return useQuery({
    queryKey: QK.schedules(eventId),
    queryFn: () => api<{ schedules: ScheduleDTO[] }>(`/api/events/${eventId}/schedules`),
    refetchInterval: () => (isVisible() ? 30000 : false),
    refetchIntervalInBackground: false,
    enabled: Boolean(eventId),
  });
}

export function useProgress(eventId: string) {
  return useQuery({
    queryKey: QK.progress(eventId),
    queryFn: () => api<ProgressDTO>(`/api/events/${eventId}/progress`),
    refetchInterval: (query) => {
      if (!isVisible()) return false;
      const data = query.state.data;
      if (data?.current == null && data?.next == null) return false;
      return 10000;
    },
    refetchIntervalInBackground: false,
    enabled: Boolean(eventId),
  });
}

export function useAnnouncements(eventId: string) {
  return useQuery({
    queryKey: QK.announcements(eventId),
    queryFn: () => api<{ announcements: AnnouncementDTO[] }>(`/api/events/${eventId}/announcements`),
    refetchInterval: () => (isVisible() ? 30000 : false),
    refetchIntervalInBackground: false,
    enabled: Boolean(eventId),
  });
}

export function useEventChat(eventId: string) {
  return useQuery({
    queryKey: QK.eventChat(eventId),
    queryFn: () => api<{ messages: ChatMessageDTO[] }>(`/api/events/${eventId}/chat`),
    refetchInterval: () => (isVisible() ? 5000 : false),
    refetchIntervalInBackground: false,
    enabled: Boolean(eventId),
  });
}

export function useScheduleChat(scheduleId?: string, completed?: boolean) {
  return useQuery({
    queryKey: QK.scheduleChat(scheduleId ?? ""),
    queryFn: () => api<{ messages: ChatMessageDTO[] }>(`/api/schedules/${scheduleId}/chat`),
    refetchInterval: () => (isVisible() && !completed ? 2000 : false),
    refetchIntervalInBackground: false,
    enabled: Boolean(scheduleId),
  });
}

export function useCreateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { eventName: string; guestName: string }) => {
      await signInAsGuest(vars.guestName);
      return api<{ event: EventDTO }>("/api/events", { method: "POST", body: JSON.stringify({ name: vars.eventName }) });
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: QK.session });
      qc.invalidateQueries({ queryKey: QK.event(data.event.id) });
    },
  });
}

export function useJoinEvent(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      await signInAsGuest(name);
      return api<{ membership: MemberDTO }>(`/api/events/${eventId}/join`, { method: "POST" });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.event(eventId) });
      qc.invalidateQueries({ queryKey: QK.members(eventId) });
      qc.invalidateQueries({ queryKey: QK.session });
    },
  });
}

export function useCreateSchedule(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; startAt: string; endAt: string; location: ScheduleLocationDTO | null; memo?: string | null; members?: string[] | null }) =>
      api<{ schedule: ScheduleDTO }>(`/api/events/${eventId}/schedules`, { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.schedules(eventId) });
      qc.invalidateQueries({ queryKey: QK.progress(eventId) });
    },
  });
}

export function useCreateFeature(eventId: string, scheduleId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { kind: "meetup" | "checklist"; config: FeatureConfig }) =>
      api(`/api/schedules/${scheduleId}/features`, { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.schedule(scheduleId) });
      qc.invalidateQueries({ queryKey: QK.progress(eventId) });
    },
  });
}

export function usePostAnnouncement(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => api(`/api/events/${eventId}/announcements`, { method: "POST", body: JSON.stringify({ body }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.announcements(eventId) });
      qc.invalidateQueries({ queryKey: QK.progress(eventId) });
    },
  });
}

export function usePostEventChat(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => api(`/api/events/${eventId}/chat`, { method: "POST", body: JSON.stringify({ body }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.eventChat(eventId) }),
  });
}

export function usePostScheduleChat(scheduleId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => api(`/api/schedules/${scheduleId}/chat`, { method: "POST", body: JSON.stringify({ body }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.scheduleChat(scheduleId) }),
  });
}

export function useCompleteSchedule(eventId: string, scheduleId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api<{ schedule: ScheduleDTO }>(`/api/schedules/${scheduleId}/complete`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.schedule(scheduleId) });
      qc.invalidateQueries({ queryKey: QK.schedules(eventId) });
      qc.invalidateQueries({ queryKey: QK.progress(eventId) });
    },
  });
}

export function usePutFeatureState(eventId: string, featureId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (state: FeatureState) => api(`/api/features/${featureId}/state`, { method: "PUT", body: JSON.stringify({ state }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.feature(featureId) });
      qc.invalidateQueries({ queryKey: QK.progress(eventId) });
    },
  });
}

export type { ScheduleWithFeaturesDTO };
