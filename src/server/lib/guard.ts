import { and, eq } from "drizzle-orm";
import type { MiddlewareHandler } from "hono";
import { db } from "../db/client.js";
import { event, membership, schedule, scheduleFeature } from "../db/domain-schema.js";
import { AppError } from "./error.js";
import type { AppEnv } from "./types.js";

export const requireUser: MiddlewareHandler<AppEnv> = async (c, next) => {
  if (!c.var.user) throw new AppError(401, "UNAUTHENTICATED");
  await next();
};

export async function ensureEvent(eventId: string) {
  const row = await db.select().from(event).where(eq(event.id, eventId)).get();
  if (!row) throw new AppError(404, "EVENT_NOT_FOUND");
  return row;
}

export async function getRoleOrThrow(eventId: string, userId: string) {
  await ensureEvent(eventId);
  const row = await db
    .select()
    .from(membership)
    .where(and(eq(membership.eventId, eventId), eq(membership.userId, userId)))
    .get();
  if (!row) throw new AppError(403, "FORBIDDEN_NOT_MEMBER");
  return row.role;
}

export async function requireHostRole(eventId: string, userId: string) {
  const role = await getRoleOrThrow(eventId, userId);
  if (role !== "host") throw new AppError(403, "FORBIDDEN_NOT_HOST");
}

export async function loadScheduleOrThrow(scheduleId: string) {
  const row = await db.select().from(schedule).where(eq(schedule.id, scheduleId)).get();
  if (!row) throw new AppError(404, "SCHEDULE_NOT_FOUND");
  return row;
}

export async function loadFeatureOrThrow(featureId: string) {
  const rows = await db
    .select({ feature: scheduleFeature, schedule })
    .from(scheduleFeature)
    .innerJoin(schedule, eq(scheduleFeature.scheduleId, schedule.id))
    .where(eq(scheduleFeature.id, featureId));
  const row = rows[0];
  if (!row) throw new AppError(404, "FEATURE_NOT_FOUND");
  return row;
}
