import { bodySchema } from "../../shared/schema.js";
import { Hono } from "hono";
import { db } from "../db/client.js";
import { eventChatMessage, scheduleChatMessage } from "../db/domain-schema.js";
import { eventChatDTOs, scheduleChatDTOs } from "../lib/dto.js";
import { getRoleOrThrow, loadScheduleOrThrow, requireUser } from "../lib/guard.js";
import { makeId } from "../lib/id.js";
import type { AppEnv } from "../lib/types.js";

const chats = new Hono<AppEnv>();

chats.get("/events/:eventId/chat", requireUser, async (c) => {
  const user = c.var.user!;
  const eventId = c.req.param("eventId");
  await getRoleOrThrow(eventId, user.id);
  return c.json({ messages: await eventChatDTOs(eventId, c.req.query("afterId")) });
});

chats.post("/events/:eventId/chat", requireUser, async (c) => {
  const user = c.var.user!;
  const eventId = c.req.param("eventId");
  await getRoleOrThrow(eventId, user.id);
  const body = bodySchema.parse(await c.req.json());
  const id = makeId(12);
  db.insert(eventChatMessage).values({ id, eventId, authorUserId: user.id, body: body.body, createdAt: new Date() }).run();
  const messages = await eventChatDTOs(eventId);
  return c.json({ message: messages.find((m) => m.id === id)! }, 201);
});

chats.get("/schedules/:scheduleId/chat", requireUser, async (c) => {
  const user = c.var.user!;
  const scheduleRow = await loadScheduleOrThrow(c.req.param("scheduleId"));
  await getRoleOrThrow(scheduleRow.eventId, user.id);
  return c.json({ messages: await scheduleChatDTOs(scheduleRow.id, c.req.query("afterId")) });
});

chats.post("/schedules/:scheduleId/chat", requireUser, async (c) => {
  const user = c.var.user!;
  const scheduleRow = await loadScheduleOrThrow(c.req.param("scheduleId"));
  await getRoleOrThrow(scheduleRow.eventId, user.id);
  const body = bodySchema.parse(await c.req.json());
  const id = makeId(12);
  db.insert(scheduleChatMessage).values({ id, scheduleId: scheduleRow.id, authorUserId: user.id, body: body.body, createdAt: new Date() }).run();
  const messages = await scheduleChatDTOs(scheduleRow.id);
  return c.json({ message: messages.find((m) => m.id === id)! }, 201);
});

export default chats;
