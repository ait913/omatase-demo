import { announcementSchema } from "../../shared/schema.js";
import { Hono } from "hono";
import { db } from "../db/client.js";
import { announcement } from "../db/domain-schema.js";
import { announcementDTOs } from "../lib/dto.js";
import { requireHostRole, requireUser } from "../lib/guard.js";
import { makeId } from "../lib/id.js";
import type { AppEnv } from "../lib/types.js";

const announcements = new Hono<AppEnv>();

announcements.post("/events/:eventId/announcements", requireUser, async (c) => {
  const user = c.var.user!;
  const eventId = c.req.param("eventId");
  await requireHostRole(eventId, user.id);
  const body = announcementSchema.parse(await c.req.json());
  const now = new Date();
  const id = makeId(12);
  db.insert(announcement).values({ id, eventId, authorUserId: user.id, body: body.body, createdAt: now }).run();
  const [created] = await announcementDTOs(eventId, 1);
  return c.json({ announcement: created }, 201);
});

export default announcements;
