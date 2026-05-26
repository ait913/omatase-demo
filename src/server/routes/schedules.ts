import { scheduleCreateSchema, schedulePatchSchema } from "../../shared/schema.js";
import { and, asc, eq, max } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../db/client.js";
import { membership, schedule, scheduleMember } from "../db/domain-schema.js";
import { schedulesForEvent, toScheduleDTO, toScheduleWithFeaturesDTO } from "../lib/dto.js";
import { AppError } from "../lib/error.js";
import { getRoleOrThrow, loadScheduleOrThrow, requireHostRole, requireUser } from "../lib/guard.js";
import { makeId } from "../lib/id.js";
import type { AppEnv } from "../lib/types.js";

const schedules = new Hono<AppEnv>();

function assertTime(startAt: Date, endAt: Date) {
  if (endAt.getTime() <= startAt.getTime()) throw new AppError(409, "INVALID_SCHEDULE_TIME");
}

function locationValues(location: { lat: number; lng: number; label: string } | null | undefined) {
  return {
    locationLat: location?.lat ?? null,
    locationLng: location?.lng ?? null,
    locationLabel: location?.label ?? null,
  };
}

async function writeMembers(scheduleId: string, ids: string[] | null | undefined, eventId: string, replace: boolean) {
  if (ids == null) return;
  const unique = [...new Set(ids)];
  if (replace) db.delete(scheduleMember).where(eq(scheduleMember.scheduleId, scheduleId)).run();
  if (unique.length === 0) return;
  const rows = await db.select().from(membership).where(eq(membership.eventId, eventId));
  const allowed = new Set(rows.map((row) => row.userId));
  if (unique.some((id) => !allowed.has(id))) throw new AppError(403, "FORBIDDEN_NOT_MEMBER");
  const now = new Date();
  db.insert(scheduleMember)
    .values(unique.map((userId) => ({ scheduleId, userId, joinedAt: now })))
    .run();
}

schedules.get("/events/:eventId/schedules", requireUser, async (c) => {
  const user = c.var.user!;
  const eventId = c.req.param("eventId");
  await getRoleOrThrow(eventId, user.id);
  const rows = await schedulesForEvent(eventId);
  return c.json({ schedules: await Promise.all(rows.map(toScheduleDTO)) });
});

schedules.post("/events/:eventId/schedules", requireUser, async (c) => {
  const user = c.var.user!;
  const eventId = c.req.param("eventId");
  await requireHostRole(eventId, user.id);
  const body = scheduleCreateSchema.parse(await c.req.json());
  const startAt = new Date(body.startAt);
  const endAt = new Date(body.endAt);
  assertTime(startAt, endAt);
  const [{ value: maxPosition }] = await db.select({ value: max(schedule.position) }).from(schedule).where(eq(schedule.eventId, eventId));
  const now = new Date();
  const id = makeId(12);
  const row = {
    id,
    eventId,
    name: body.name,
    startAt,
    endAt,
    ...locationValues(body.location),
    memo: body.memo ?? null,
    status: "upcoming" as const,
    position: (maxPosition ?? -1) + 1,
    createdAt: now,
    updatedAt: now,
  };
  db.insert(schedule).values(row).run();
  await writeMembers(id, body.members, eventId, false);
  return c.json({ schedule: await toScheduleDTO(row) }, 201);
});

schedules.get("/schedules/:scheduleId", requireUser, async (c) => {
  const user = c.var.user!;
  const row = await loadScheduleOrThrow(c.req.param("scheduleId"));
  await getRoleOrThrow(row.eventId, user.id);
  return c.json({ schedule: await toScheduleWithFeaturesDTO(row, user.id) });
});

schedules.patch("/schedules/:scheduleId", requireUser, async (c) => {
  const user = c.var.user!;
  const scheduleId = c.req.param("scheduleId");
  const row = await loadScheduleOrThrow(scheduleId);
  await requireHostRole(row.eventId, user.id);
  const body = schedulePatchSchema.parse(await c.req.json());
  const startAt = body.startAt ? new Date(body.startAt) : row.startAt;
  const endAt = body.endAt ? new Date(body.endAt) : row.endAt;
  assertTime(startAt, endAt);
  const patch = {
    name: body.name ?? row.name,
    startAt,
    endAt,
    ...(body.location === undefined ? {} : locationValues(body.location)),
    memo: body.memo === undefined ? row.memo : body.memo,
    updatedAt: new Date(),
  };
  db.update(schedule).set(patch).where(eq(schedule.id, scheduleId)).run();
  await writeMembers(scheduleId, body.members, row.eventId, true);
  const updated = await loadScheduleOrThrow(scheduleId);
  return c.json({ schedule: await toScheduleDTO(updated) });
});

schedules.delete("/schedules/:scheduleId", requireUser, async (c) => {
  const user = c.var.user!;
  const row = await loadScheduleOrThrow(c.req.param("scheduleId"));
  await requireHostRole(row.eventId, user.id);
  db.delete(schedule).where(eq(schedule.id, row.id)).run();
  return c.body(null, 204);
});

schedules.post("/schedules/:scheduleId/complete", requireUser, async (c) => {
  const user = c.var.user!;
  const row = await loadScheduleOrThrow(c.req.param("scheduleId"));
  await getRoleOrThrow(row.eventId, user.id);
  db.update(schedule).set({ status: "completed", updatedAt: new Date() }).where(eq(schedule.id, row.id)).run();
  const updated = await loadScheduleOrThrow(row.id);
  return c.json({ schedule: await toScheduleDTO(updated) });
});

export default schedules;
