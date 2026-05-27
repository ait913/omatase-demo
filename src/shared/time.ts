export interface ScheduleTimeLike {
  startAt: string | Date;
  endAt: string | Date;
  status: "upcoming" | "active" | "completed";
  position: number;
}

export interface PeriodScheduleLike {
  startAt: string | Date;
  endAt: string | Date;
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

function jstDateKey(value: string | Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value instanceof Date ? value : new Date(value));
}

export function isSameDayJst(a: string | Date, b: string | Date) {
  return jstDateKey(a) === jstDateKey(b);
}

export function computePeriod(schedules: PeriodScheduleLike[]) {
  if (schedules.length === 0) return null;
  const starts = schedules.map((schedule) => ms(schedule.startAt));
  const ends = schedules.map((schedule) => ms(schedule.endAt));
  const startAt = new Date(Math.min(...starts));
  const endAt = new Date(Math.max(...ends));
  return {
    startAt: startAt.toISOString(),
    endAt: endAt.toISOString(),
    sameDay: isSameDayJst(startAt, endAt),
  };
}
