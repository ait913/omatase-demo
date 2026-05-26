import { z } from "zod";

export const meetupConfigSchema = z.object({
  kind: z.literal("meetup"),
  location: z.discriminatedUnion("inherit", [
    z.object({ inherit: z.literal(true) }),
    z.object({
      inherit: z.literal(false),
      lat: z.number(),
      lng: z.number(),
      label: z.string().min(1).max(80),
    }),
  ]),
  checkInEnabled: z.boolean().default(true),
});

export const checklistConfigSchema = z.object({
  kind: z.literal("checklist"),
  items: z
    .array(
      z.object({
        id: z.string().min(1),
        label: z.string().min(1).max(80),
        required: z.boolean().default(true),
      }),
    )
    .min(1)
    .max(50),
});

export const featureConfigSchema = z.discriminatedUnion("kind", [
  meetupConfigSchema,
  checklistConfigSchema,
]);

export type FeatureConfig = z.infer<typeof featureConfigSchema>;
export type MeetupConfig = z.infer<typeof meetupConfigSchema>;
export type ChecklistConfig = z.infer<typeof checklistConfigSchema>;

export const checklistStateSchema = z.object({
  kind: z.literal("checklist"),
  checked: z.record(z.string(), z.boolean()),
});

export const meetupStateSchema = z.object({
  kind: z.literal("meetup"),
  checkedInAt: z.number().nullable(),
});

export const featureStateSchema = z.discriminatedUnion("kind", [
  checklistStateSchema,
  meetupStateSchema,
]);

export type ChecklistState = z.infer<typeof checklistStateSchema>;
export type MeetupState = z.infer<typeof meetupStateSchema>;
export type FeatureState = z.infer<typeof featureStateSchema>;
