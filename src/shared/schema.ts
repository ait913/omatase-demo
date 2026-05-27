import { z } from "zod";
import { featureConfigSchema, featureStateSchema } from "./feature-config.js";

export const locationSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  label: z.string().min(1).max(80),
});

export const periodSummarySchema = z.object({
  startAt: z.string().datetime({ offset: true }),
  endAt: z.string().datetime({ offset: true }),
  sameDay: z.boolean(),
});

export const eventCreateSchema = z.object({
  name: z.string().min(1).max(80),
});

export const scheduleCreateSchema = z.object({
  name: z.string().min(1).max(80),
  startAt: z.string().datetime({ offset: true }),
  endAt: z.string().datetime({ offset: true }),
  location: locationSchema.nullable(),
  memo: z.string().max(2000).optional().nullable(),
  members: z.array(z.string()).optional().nullable(),
});

export const schedulePatchSchema = scheduleCreateSchema.partial().extend({
  members: z.array(z.string()).optional().nullable(),
});

export const featureCreateSchema = z.object({
  kind: z.enum(["meetup", "checklist"]),
  config: featureConfigSchema,
});

export const featurePatchSchema = z.object({
  config: featureConfigSchema.optional(),
  position: z.number().int().optional(),
});

export const featureStatePutSchema = z.object({
  state: featureStateSchema,
});

export const bodySchema = z.object({
  body: z.string().min(1).max(2000),
});

export const announcementSchema = z.object({
  body: z.string().min(1).max(500),
});
