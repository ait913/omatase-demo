export interface ScheduleTimeLike {
  startAt: string | Date;
  endAt: string | Date;
  status: "upcoming" | "active" | "completed";
  position: number;
}

function ms(value: string | Date) {
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

export function isTimeActive(schedule: ScheduleTimeLike, now: Date) {
  if (schedule.status === "completed") return false;
  const t = now.getTime();
  return ms(schedule.startAt) <= t && t < ms(schedule.endAt);
}

export function compareScheduleTime(a: ScheduleTimeLike, b: ScheduleTimeLike) {
  const diff = ms(a.startAt) - ms(b.startAt);
  return diff === 0 ? a.position - b.position : diff;
}
