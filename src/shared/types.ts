import type { FeatureConfig } from "./feature-config.js";

export type Iso = string;

export interface EventDTO {
  id: string;
  name: string;
  hostUserId: string;
  createdAt: Iso;
  updatedAt: Iso;
  viewerIsHost: boolean;
}

export interface MemberDTO {
  userId: string;
  name: string;
  role: "host" | "member";
  joinedAt: Iso;
}

export interface ScheduleLocationDTO {
  lat: number;
  lng: number;
  label: string;
}

export interface FeatureSummaryDTO {
  id: string;
  kind: "meetup" | "checklist";
  position: number;
  summary: { doneCount: number; totalMembers: number };
}

export interface ScheduleDTO {
  id: string;
  eventId: string;
  name: string;
  startAt: Iso;
  endAt: Iso;
  location: ScheduleLocationDTO | null;
  memo: string | null;
  status: "upcoming" | "active" | "completed";
  position: number;
  members: string[];
  featureSummaries: FeatureSummaryDTO[];
}

export interface FeatureDTO {
  id: string;
  scheduleId: string;
  kind: "meetup" | "checklist";
  position: number;
  config: FeatureConfig;
  state: Record<string, unknown>;
  aggregate?: {
    doneCount: number;
    totalMembers: number;
    perItem?: Record<string, number>;
  };
}

export interface ChatMessageDTO {
  id: string;
  authorUserId: string;
  authorName: string;
  body: string;
  createdAt: Iso;
}

export interface AnnouncementDTO {
  id: string;
  authorUserId: string;
  authorName: string;
  body: string;
  createdAt: Iso;
}

export interface ScheduleWithFeaturesDTO extends ScheduleDTO {
  features: FeatureDTO[];
}

export interface ProgressDTO {
  event: EventDTO;
  members: MemberDTO[];
  current: ScheduleWithFeaturesDTO | null;
  prev: ScheduleDTO | null;
  next: ScheduleDTO | null;
  latestAnnouncement: AnnouncementDTO | null;
  serverNow: Iso;
}
