import type {
  AnnouncementDTO,
  ChatMessageDTO,
  EventDTO,
  FeatureDTO,
  FeatureSummaryDTO,
  MemberDTO,
  ScheduleDTO,
  ScheduleLocationDTO,
  ScheduleWithFeaturesDTO,
} from "../../shared/types.js";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "../db/client.js";
import { user } from "../db/auth-schema.js";
import {
  announcement,
  event as eventTable,
  eventChatMessage,
  membership,
  schedule,
  scheduleChatMessage,
  scheduleFeature,
  scheduleFeatureState,
  scheduleMember,
} from "../db/domain-schema.js";

type EventRow = typeof eventTable.$inferSelect;
type ScheduleRow = typeof schedule.$inferSelect;
type FeatureRow = typeof scheduleFeature.$inferSelect;

export function iso(date: Date) {
  return date.toISOString();
}

export function toEventDTO(row: EventRow, viewerUserId: string): EventDTO {
  return {
    id: row.id,
    name: row.name,
    hostUserId: row.hostUserId,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
    viewerIsHost: row.hostUserId === viewerUserId,
  };
}

export async function loadMembers(eventId: string): Promise<MemberDTO[]> {
  const rows = await db
    .select({
      userId: membership.userId,
      name: user.name,
      role: membership.role,
      joinedAt: membership.joinedAt,
    })
    .from(membership)
    .innerJoin(user, eq(membership.userId, user.id))
    .where(eq(membership.eventId, eventId))
    .orderBy(asc(membership.joinedAt));
  return rows.map((row) => ({
    userId: row.userId,
    name: row.name,
    role: row.role,
    joinedAt: iso(row.joinedAt),
  }));
}

function location(row: ScheduleRow): ScheduleLocationDTO | null {
  if (row.locationLat == null || row.locationLng == null || !row.locationLabel) return null;
  return { lat: row.locationLat, lng: row.locationLng, label: row.locationLabel };
}

export async function scheduleMemberIds(row: ScheduleRow) {
  const explicit = await db.select().from(scheduleMember).where(eq(scheduleMember.scheduleId, row.id));
  if (explicit.length > 0) return explicit.map((m) => m.userId);
  const members = await db.select().from(membership).where(eq(membership.eventId, row.eventId));
  return members.map((m) => m.userId);
}

export async function aggregateFeature(row: FeatureRow, memberIds: string[]): Promise<FeatureSummaryDTO["summary"] & { perItem?: Record<string, number> }> {
  const states = await db.select().from(scheduleFeatureState).where(eq(scheduleFeatureState.featureId, row.id));
  if (row.kind === "meetup") {
    const doneCount = states.filter((s) => {
      const state = s.state as { kind?: string; checkedInAt?: number | null };
      return state.kind === "meetup" && state.checkedInAt != null;
    }).length;
    return { doneCount, totalMembers: memberIds.length };
  }
  const config = row.config;
  if (config.kind !== "checklist") return { doneCount: 0, totalMembers: memberIds.length };
  const required = config.items.filter((item) => item.required).map((item) => item.id);
  const perItem: Record<string, number> = {};
  for (const item of config.items) perItem[item.id] = 0;
  let doneCount = 0;
  for (const record of states) {
    const state = record.state as { kind?: string; checked?: Record<string, boolean> };
    if (state.kind !== "checklist") continue;
    for (const item of config.items) if (state.checked?.[item.id]) perItem[item.id] += 1;
    if (required.every((id) => state.checked?.[id])) doneCount += 1;
  }
  return { doneCount, totalMembers: memberIds.length, perItem };
}

export async function toScheduleDTO(row: ScheduleRow): Promise<ScheduleDTO> {
  const members = await scheduleMemberIds(row);
  const features = await db
    .select()
    .from(scheduleFeature)
    .where(eq(scheduleFeature.scheduleId, row.id))
    .orderBy(asc(scheduleFeature.position));
  const featureSummaries: FeatureSummaryDTO[] = [];
  for (const feature of features) {
    if (feature.kind !== "meetup" && feature.kind !== "checklist") continue;
    featureSummaries.push({
      id: feature.id,
      kind: feature.kind,
      position: feature.position,
      summary: await aggregateFeature(feature, members),
    });
  }
  return {
    id: row.id,
    eventId: row.eventId,
    name: row.name,
    startAt: iso(row.startAt),
    endAt: iso(row.endAt),
    location: location(row),
    memo: row.memo,
    status: row.status,
    position: row.position,
    members,
    featureSummaries,
  };
}

export async function toFeatureDTO(row: FeatureRow, scheduleRow: ScheduleRow, viewerUserId: string): Promise<FeatureDTO> {
  const members = await scheduleMemberIds(scheduleRow);
  const stateRow = await db
    .select()
    .from(scheduleFeatureState)
    .where(and(eq(scheduleFeatureState.featureId, row.id), eq(scheduleFeatureState.userId, viewerUserId)))
    .get();
  return {
    id: row.id,
    scheduleId: row.scheduleId,
    kind: row.kind as "meetup" | "checklist",
    position: row.position,
    config: row.config,
    state: (stateRow?.state as Record<string, unknown> | undefined) ?? {},
    aggregate: await aggregateFeature(row, members),
  };
}

export async function toScheduleWithFeaturesDTO(row: ScheduleRow, viewerUserId: string): Promise<ScheduleWithFeaturesDTO> {
  const dto = await toScheduleDTO(row);
  const features = await db
    .select()
    .from(scheduleFeature)
    .where(eq(scheduleFeature.scheduleId, row.id))
    .orderBy(asc(scheduleFeature.position));
  return {
    ...dto,
    features: await Promise.all(features.map((feature) => toFeatureDTO(feature, row, viewerUserId))),
  };
}

export async function announcementDTOs(eventId: string, limit = 20): Promise<AnnouncementDTO[]> {
  const rows = await db
    .select({ id: announcement.id, authorUserId: announcement.authorUserId, authorName: user.name, body: announcement.body, createdAt: announcement.createdAt })
    .from(announcement)
    .innerJoin(user, eq(announcement.authorUserId, user.id))
    .where(eq(announcement.eventId, eventId))
    .orderBy(asc(announcement.createdAt));
  return rows
    .slice(-limit)
    .reverse()
    .map((row) => ({ ...row, createdAt: iso(row.createdAt) }));
}

export async function eventChatDTOs(eventId: string, afterId?: string): Promise<ChatMessageDTO[]> {
  const rows = await db
    .select({ id: eventChatMessage.id, authorUserId: eventChatMessage.authorUserId, authorName: user.name, body: eventChatMessage.body, createdAt: eventChatMessage.createdAt })
    .from(eventChatMessage)
    .innerJoin(user, eq(eventChatMessage.authorUserId, user.id))
    .where(eq(eventChatMessage.eventId, eventId))
    .orderBy(asc(eventChatMessage.createdAt));
  const after = afterId ? rows.find((row) => row.id === afterId)?.createdAt.getTime() : undefined;
  return rows
    .filter((row) => after == null || row.createdAt.getTime() > after)
    .slice(-100)
    .map((row) => ({ ...row, createdAt: iso(row.createdAt) }));
}

export async function scheduleChatDTOs(scheduleId: string, afterId?: string): Promise<ChatMessageDTO[]> {
  const rows = await db
    .select({ id: scheduleChatMessage.id, authorUserId: scheduleChatMessage.authorUserId, authorName: user.name, body: scheduleChatMessage.body, createdAt: scheduleChatMessage.createdAt })
    .from(scheduleChatMessage)
    .innerJoin(user, eq(scheduleChatMessage.authorUserId, user.id))
    .where(eq(scheduleChatMessage.scheduleId, scheduleId))
    .orderBy(asc(scheduleChatMessage.createdAt));
  const after = afterId ? rows.find((row) => row.id === afterId)?.createdAt.getTime() : undefined;
  return rows
    .filter((row) => after == null || row.createdAt.getTime() > after)
    .slice(-100)
    .map((row) => ({ ...row, createdAt: iso(row.createdAt) }));
}

export async function schedulesForEvent(eventId: string) {
  return db.select().from(schedule).where(eq(schedule.eventId, eventId)).orderBy(asc(schedule.startAt), asc(schedule.position));
}

export async function assertMemberIds(eventId: string, ids: string[]) {
  if (ids.length === 0) return;
  const rows = await db.select().from(membership).where(and(eq(membership.eventId, eventId), inArray(membership.userId, ids)));
  if (rows.length !== new Set(ids).size) throw new Error("member mismatch");
}
