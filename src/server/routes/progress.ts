import { compareScheduleTime, isTimeActive } from "../../shared/time.js";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../db/client.js";
import { event } from "../db/domain-schema.js";
import { announcementDTOs, loadMembers, schedulesForEvent, toEventDTO, toScheduleDTO, toScheduleWithFeaturesDTO } from "../lib/dto.js";
import { AppError } from "../lib/error.js";
import { getRoleOrThrow, requireUser } from "../lib/guard.js";
import type { AppEnv } from "../lib/types.js";

const progress = new Hono<AppEnv>();

progress.get("/events/:eventId/progress", requireUser, async (c) => {
  const user = c.var.user!;
  const eventId = c.req.param("eventId");
  const eventRow = await db.select().from(event).where(eq(event.id, eventId)).get();
  if (!eventRow) throw new AppError(404, "EVENT_NOT_FOUND");
  await getRoleOrThrow(eventId, user.id);
  const now = new Date();
  const rows = (await schedulesForEvent(eventId)).sort(compareScheduleTime);
  const active = rows.filter((row) => isTimeActive(row, now)).sort(compareScheduleTime)[0] ?? null;
  let prev = null;
  let next = null;
  if (active) {
    const index = rows.findIndex((row) => row.id === active.id);
    prev = index > 0 ? rows[index - 1] : null;
    next = rows.slice(index + 1).find((row) => row.status !== "completed") ?? null;
  } else {
    prev = [...rows].filter((row) => row.startAt.getTime() <= now.getTime()).pop() ?? null;
    next = rows.find((row) => row.startAt.getTime() > now.getTime() && row.status !== "completed") ?? null;
  }
  const latestAnnouncement = (await announcementDTOs(eventId, 1))[0] ?? null;
  return c.json({
    event: toEventDTO(eventRow, user.id),
    members: await loadMembers(eventId),
    current: active ? await toScheduleWithFeaturesDTO(active, user.id) : null,
    prev: prev ? await toScheduleDTO(prev) : null,
    next: next ? await toScheduleDTO(next) : null,
    latestAnnouncement,
    serverNow: now.toISOString(),
  });
});

export default progress;
