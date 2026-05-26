import type { FeatureConfig, FeatureState } from "../../shared/feature-config.js";
import { index, integer, primaryKey, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { user } from "./auth-schema.js";

export const event = sqliteTable(
  "event",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    hostUserId: text("host_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [index("event_host_idx").on(t.hostUserId)],
);

export const membership = sqliteTable(
  "membership",
  {
    eventId: text("event_id")
      .notNull()
      .references(() => event.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["host", "member"] }).notNull(),
    joinedAt: integer("joined_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.eventId, t.userId] }), index("membership_event_idx").on(t.eventId)],
);

export const schedule = sqliteTable(
  "schedule",
  {
    id: text("id").primaryKey(),
    eventId: text("event_id")
      .notNull()
      .references(() => event.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    startAt: integer("start_at", { mode: "timestamp_ms" }).notNull(),
    endAt: integer("end_at", { mode: "timestamp_ms" }).notNull(),
    locationLat: real("location_lat"),
    locationLng: real("location_lng"),
    locationLabel: text("location_label"),
    memo: text("memo"),
    status: text("status", { enum: ["upcoming", "active", "completed"] }).default("upcoming").notNull(),
    position: integer("position").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [
    index("schedule_event_time_idx").on(t.eventId, t.startAt, t.endAt),
    index("schedule_event_status_idx").on(t.eventId, t.status),
  ],
);

export const scheduleMember = sqliteTable(
  "schedule_member",
  {
    scheduleId: text("schedule_id")
      .notNull()
      .references(() => schedule.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    joinedAt: integer("joined_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.scheduleId, t.userId] })],
);

export const scheduleFeature = sqliteTable(
  "schedule_feature",
  {
    id: text("id").primaryKey(),
    scheduleId: text("schedule_id")
      .notNull()
      .references(() => schedule.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    config: text("config", { mode: "json" }).$type<FeatureConfig>().notNull(),
    position: integer("position").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [index("schedule_feature_schedule_idx").on(t.scheduleId, t.position)],
);

export const scheduleFeatureState = sqliteTable(
  "schedule_feature_state",
  {
    featureId: text("feature_id")
      .notNull()
      .references(() => scheduleFeature.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    state: text("state", { mode: "json" }).$type<FeatureState | Record<string, never>>().notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.featureId, t.userId] })],
);

export const announcement = sqliteTable(
  "announcement",
  {
    id: text("id").primaryKey(),
    eventId: text("event_id")
      .notNull()
      .references(() => event.id, { onDelete: "cascade" }),
    authorUserId: text("author_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [index("announcement_event_idx").on(t.eventId, t.createdAt)],
);

export const eventChatMessage = sqliteTable(
  "event_chat_message",
  {
    id: text("id").primaryKey(),
    eventId: text("event_id")
      .notNull()
      .references(() => event.id, { onDelete: "cascade" }),
    authorUserId: text("author_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [index("event_chat_event_idx").on(t.eventId, t.createdAt)],
);

export const scheduleChatMessage = sqliteTable(
  "schedule_chat_message",
  {
    id: text("id").primaryKey(),
    scheduleId: text("schedule_id")
      .notNull()
      .references(() => schedule.id, { onDelete: "cascade" }),
    authorUserId: text("author_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [index("schedule_chat_schedule_idx").on(t.scheduleId, t.createdAt)],
);
