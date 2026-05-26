export const QK = {
  session: ["session"] as const,
  event: (id: string) => ["event", id] as const,
  members: (id: string) => ["members", id] as const,
  schedules: (eventId: string) => ["schedules", eventId] as const,
  schedule: (sid: string) => ["schedule", sid] as const,
  feature: (fid: string) => ["feature", fid] as const,
  progress: (eventId: string) => ["progress", eventId] as const,
  announcements: (eventId: string) => ["announcements", eventId] as const,
  eventChat: (eventId: string) => ["event-chat", eventId] as const,
  scheduleChat: (sid: string) => ["schedule-chat", sid] as const,
} as const;
