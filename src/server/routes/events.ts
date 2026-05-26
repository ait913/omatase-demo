import { eventCreateSchema } from "../../shared/schema.js";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../db/client.js";
import { event, membership } from "../db/domain-schema.js";
import { announcementDTOs, loadMembers, toEventDTO } from "../lib/dto.js";
import { AppError } from "../lib/error.js";
import { getRoleOrThrow, requireUser } from "../lib/guard.js";
import { makeId } from "../lib/id.js";
import type { AppEnv } from "../lib/types.js";

const events = new Hono<AppEnv>();

events.post("/", requireUser, async (c) => {
  const user = c.var.user!;
  const body = eventCreateSchema.parse(await c.req.json());
  const now = new Date();
  const id = makeId(10);
  const row = {
    id,
    name: body.name,
    hostUserId: user.id,
    createdAt: now,
    updatedAt: now,
  };
  db.transaction((tx) => {
    tx.insert(event).values(row).run();
    tx.insert(membership).values({ eventId: id, userId: user.id, role: "host", joinedAt: now }).run();
  });
  return c.json({ event: toEventDTO(row, user.id) }, 201);
});

events.get("/:eventId", requireUser, async (c) => {
  const user = c.var.user!;
  const eventId = c.req.param("eventId");
  const row = await db.select().from(event).where(eq(event.id, eventId)).get();
  if (!row) throw new AppError(404, "EVENT_NOT_FOUND");
  const memberRow = await db
    .select()
    .from(membership)
    .where(and(eq(membership.eventId, eventId), eq(membership.userId, user.id)))
    .get();
  return c.json({
    event: toEventDTO(row, user.id),
    members: memberRow ? await loadMembers(eventId) : [],
    viewerIsMember: Boolean(memberRow),
  });
});

events.post("/:eventId/join", requireUser, async (c) => {
  const user = c.var.user!;
  const eventId = c.req.param("eventId");
  const row = await db.select().from(event).where(eq(event.id, eventId)).get();
  if (!row) throw new AppError(404, "EVENT_NOT_FOUND");
  const exists = await db
    .select()
    .from(membership)
    .where(and(eq(membership.eventId, eventId), eq(membership.userId, user.id)))
    .get();
  if (exists) throw new AppError(409, "ALREADY_MEMBER");
  const joinedAt = new Date();
  db.insert(membership).values({ eventId, userId: user.id, role: "member", joinedAt }).run();
  return c.json({ membership: { userId: user.id, name: user.name, role: "member", joinedAt: joinedAt.toISOString() } });
});

events.get("/:eventId/members", requireUser, async (c) => {
  const user = c.var.user!;
  const eventId = c.req.param("eventId");
  await getRoleOrThrow(eventId, user.id);
  return c.json({ members: await loadMembers(eventId) });
});

events.get("/:eventId/announcements", requireUser, async (c) => {
  const user = c.var.user!;
  const eventId = c.req.param("eventId");
  await getRoleOrThrow(eventId, user.id);
  return c.json({ announcements: await announcementDTOs(eventId, 20) });
});

export default events;
