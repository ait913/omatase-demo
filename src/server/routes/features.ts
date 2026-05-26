import { featureCreateSchema, featurePatchSchema, featureStatePutSchema } from "../../shared/schema.js";
import { and, eq, max } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../db/client.js";
import { scheduleFeature, scheduleFeatureState } from "../db/domain-schema.js";
import { toFeatureDTO } from "../lib/dto.js";
import { AppError } from "../lib/error.js";
import { getRoleOrThrow, loadFeatureOrThrow, loadScheduleOrThrow, requireHostRole, requireUser } from "../lib/guard.js";
import { makeId } from "../lib/id.js";
import type { AppEnv } from "../lib/types.js";

const features = new Hono<AppEnv>();

function assertMeetupConfigCanUseScheduleLocation(config: unknown, scheduleRow: Awaited<ReturnType<typeof loadScheduleOrThrow>>) {
  const value = config as { kind?: string; location?: { inherit?: boolean } };
  if (
    value.kind === "meetup" &&
    value.location?.inherit === true &&
    (scheduleRow.locationLat == null || scheduleRow.locationLng == null || !scheduleRow.locationLabel)
  ) {
    throw new AppError(400, "BAD_REQUEST", "schedule has no location to inherit", "schedule has no location to inherit");
  }
}

features.post("/schedules/:scheduleId/features", requireUser, async (c) => {
  const user = c.var.user!;
  const scheduleRow = await loadScheduleOrThrow(c.req.param("scheduleId"));
  await requireHostRole(scheduleRow.eventId, user.id);
  const body = featureCreateSchema.parse(await c.req.json());
  assertMeetupConfigCanUseScheduleLocation(body.config, scheduleRow);
  const [{ value: maxPosition }] = await db
    .select({ value: max(scheduleFeature.position) })
    .from(scheduleFeature)
    .where(eq(scheduleFeature.scheduleId, scheduleRow.id));
  const now = new Date();
  const row = {
    id: makeId(12),
    scheduleId: scheduleRow.id,
    kind: body.kind,
    config: body.config,
    position: (maxPosition ?? -1) + 1,
    createdAt: now,
    updatedAt: now,
  };
  db.insert(scheduleFeature).values(row).run();
  return c.json({ feature: await toFeatureDTO(row, scheduleRow, user.id) }, 201);
});

features.get("/features/:featureId", requireUser, async (c) => {
  const user = c.var.user!;
  const { feature, schedule } = await loadFeatureOrThrow(c.req.param("featureId"));
  await getRoleOrThrow(schedule.eventId, user.id);
  return c.json({ feature: await toFeatureDTO(feature, schedule, user.id) });
});

features.patch("/features/:featureId", requireUser, async (c) => {
  const user = c.var.user!;
  const loaded = await loadFeatureOrThrow(c.req.param("featureId"));
  await requireHostRole(loaded.schedule.eventId, user.id);
  const body = featurePatchSchema.parse(await c.req.json());
  const config = body.config ?? loaded.feature.config;
  assertMeetupConfigCanUseScheduleLocation(config, loaded.schedule);
  db.update(scheduleFeature)
    .set({
      config,
      position: body.position ?? loaded.feature.position,
      updatedAt: new Date(),
    })
    .where(eq(scheduleFeature.id, loaded.feature.id))
    .run();
  const updated = await loadFeatureOrThrow(loaded.feature.id);
  return c.json({ feature: await toFeatureDTO(updated.feature, updated.schedule, user.id) });
});

features.delete("/features/:featureId", requireUser, async (c) => {
  const user = c.var.user!;
  const loaded = await loadFeatureOrThrow(c.req.param("featureId"));
  await requireHostRole(loaded.schedule.eventId, user.id);
  db.delete(scheduleFeature).where(eq(scheduleFeature.id, loaded.feature.id)).run();
  return c.body(null, 204);
});

features.put("/features/:featureId/state", requireUser, async (c) => {
  const user = c.var.user!;
  const loaded = await loadFeatureOrThrow(c.req.param("featureId"));
  await getRoleOrThrow(loaded.schedule.eventId, user.id);
  const body = featureStatePutSchema.parse(await c.req.json());
  const now = new Date();
  db.insert(scheduleFeatureState)
    .values({ featureId: loaded.feature.id, userId: user.id, state: body.state, updatedAt: now })
    .onConflictDoUpdate({
      target: [scheduleFeatureState.featureId, scheduleFeatureState.userId],
      set: { state: body.state, updatedAt: now },
    })
    .run();
  return c.json({ state: body.state });
});

export default features;
