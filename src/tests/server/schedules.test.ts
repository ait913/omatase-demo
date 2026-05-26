import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { app } from "@/tests/helpers/app";
import { resetDb } from "@/tests/helpers/reset-db";
import {
  createEventWithHost,
  createSchedule,
  expectError,
  jsonHeaders,
  login,
  loginAndJoin,
  readJson,
  scheduleInput,
} from "./_helpers";

describe("server schedules (§7.3, §7.4)", () => {
  beforeEach(async () => {
    await resetDb();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("7.3.1 lets a host create a schedule when endAt is after startAt", async () => {
    const { host, event } = await createEventWithHost();

    const schedule = await createSchedule(host.cookie, event.id);

    expect(schedule.status).toBe("upcoming");
  });

  it("7.3.2 rejects schedules whose endAt is not after startAt", async () => {
    const { host, event } = await createEventWithHost();

    const res = await app.request(`/api/events/${event.id}/schedules`, {
      method: "POST",
      headers: { ...jsonHeaders, cookie: host.cookie },
      body: JSON.stringify(
        scheduleInput({
          startAt: "2026-06-01T10:00:00.000Z",
          endAt: "2026-06-01T10:00:00.000Z",
        }),
      ),
    });

    await expectError(res, 409, "INVALID_SCHEDULE_TIME");
  });

  it("7.3.3 rejects schedule creation by a non-host member", async () => {
    const { event } = await createEventWithHost();
    const member = await loginAndJoin("Guest", event.id);

    const res = await app.request(`/api/events/${event.id}/schedules`, {
      method: "POST",
      headers: { ...jsonHeaders, cookie: member.cookie },
      body: JSON.stringify(scheduleInput()),
    });

    await expectError(res, 403, "FORBIDDEN_NOT_HOST");
  });

  it("7.3.4 returns schedules ordered by startAt and then position", async () => {
    const { host, event } = await createEventWithHost();
    await createSchedule(host.cookie, event.id, {
      name: "third",
      startAt: "2026-06-01T11:00:00.000Z",
      endAt: "2026-06-01T11:30:00.000Z",
      position: 0,
    });
    await createSchedule(host.cookie, event.id, {
      name: "second",
      startAt: "2026-06-01T10:00:00.000Z",
      endAt: "2026-06-01T10:30:00.000Z",
      position: 2,
    });
    await createSchedule(host.cookie, event.id, {
      name: "first",
      startAt: "2026-06-01T10:00:00.000Z",
      endAt: "2026-06-01T10:30:00.000Z",
      position: 1,
    });

    const res = await app.request(`/api/events/${event.id}/schedules`, {
      headers: { cookie: host.cookie },
    });

    expect(res.status).toBe(200);
    const schedules = (await readJson(res)).schedules;
    expect(schedules.at(-1).name).toBe("third");
    const tied = schedules.filter((s: any) => s.startAt === "2026-06-01T10:00:00.000Z");
    expect(tied.map((s: any) => s.position)).toEqual(
      [...tied].map((s: any) => s.position).sort((a: number, b: number) => a - b),
    );
  });

  it("7.3.5 picks the earliest startAt schedule as current when active windows overlap", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01T10:15:00.000Z"));
    const { host, event } = await createEventWithHost();
    await createSchedule(host.cookie, event.id, {
      name: "early",
      startAt: "2026-06-01T10:00:00.000Z",
      endAt: "2026-06-01T11:00:00.000Z",
      position: 2,
    });
    await createSchedule(host.cookie, event.id, {
      name: "late",
      startAt: "2026-06-01T10:10:00.000Z",
      endAt: "2026-06-01T10:40:00.000Z",
      position: 1,
    });

    const res = await app.request(`/api/events/${event.id}/progress`, {
      headers: { cookie: host.cookie },
    });

    expect(res.status).toBe(200);
    expect((await readJson(res)).current.name).toBe("early");
  });

  it("7.3.6 returns current null, first next, and prev null before the event starts", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01T09:00:00.000Z"));
    const { host, event } = await createEventWithHost();
    await createSchedule(host.cookie, event.id);

    const body = await readJson(
      await app.request(`/api/events/${event.id}/progress`, { headers: { cookie: host.cookie } }),
    );

    expect(body.current).toBeNull();
    expect(body.next.name).toBe("集合");
    expect(body.prev).toBeNull();
  });

  it("7.3.7 returns current null, last prev, and next null after all schedules end", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01T12:00:00.000Z"));
    const { host, event } = await createEventWithHost();
    await createSchedule(host.cookie, event.id, { name: "first" });
    await createSchedule(host.cookie, event.id, {
      name: "last",
      startAt: "2026-06-01T11:00:00.000Z",
      endAt: "2026-06-01T11:30:00.000Z",
    });

    const body = await readJson(
      await app.request(`/api/events/${event.id}/progress`, { headers: { cookie: host.cookie } }),
    );

    expect(body.current).toBeNull();
    expect(body.prev.name).toBe("last");
    expect(body.next).toBeNull();
  });

  it("7.3.8 excludes completed schedules from current even when server time is inside their window", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01T10:15:00.000Z"));
    const { host, event } = await createEventWithHost();
    const done = await createSchedule(host.cookie, event.id, { name: "done" });
    await createSchedule(host.cookie, event.id, {
      name: "next",
      startAt: "2026-06-01T10:10:00.000Z",
      endAt: "2026-06-01T11:00:00.000Z",
    });
    await app.request(`/api/schedules/${done.id}/complete`, {
      method: "POST",
      headers: { cookie: host.cookie },
    });

    const body = await readJson(
      await app.request(`/api/events/${event.id}/progress`, { headers: { cookie: host.cookie } }),
    );

    expect(body.current.name).toBe("next");
  });

  it("7.3.9 lets any member complete a schedule and progress moves to the next current candidate", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01T10:15:00.000Z"));
    const { host, event } = await createEventWithHost();
    const member = await loginAndJoin("Guest", event.id);
    const first = await createSchedule(host.cookie, event.id, { name: "first" });
    await createSchedule(host.cookie, event.id, {
      name: "second",
      startAt: "2026-06-01T10:10:00.000Z",
      endAt: "2026-06-01T11:00:00.000Z",
    });

    const completeRes = await app.request(`/api/schedules/${first.id}/complete`, {
      method: "POST",
      headers: { cookie: member.cookie },
    });
    expect(completeRes.status).toBe(200);
    expect((await readJson(completeRes)).schedule.status).toBe("completed");

    const progress = await readJson(
      await app.request(`/api/events/${event.id}/progress`, { headers: { cookie: member.cookie } }),
    );
    expect(progress.current.name).toBe("second");
  });

  it("7.3.10 does not backfill status to completed after endAt passes", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01T12:00:00.000Z"));
    const { host, event } = await createEventWithHost();
    const schedule = await createSchedule(host.cookie, event.id);

    await app.request(`/api/events/${event.id}/progress`, { headers: { cookie: host.cookie } });
    const res = await app.request(`/api/schedules/${schedule.id}`, { headers: { cookie: host.cookie } });

    expect(res.status).toBe(200);
    expect((await readJson(res)).schedule.status).toBe("upcoming");
  });

  it("7.3.11 includes ISO8601 serverNow in progress responses", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01T10:15:00.000Z"));
    const { host, event } = await createEventWithHost();

    const body = await readJson(
      await app.request(`/api/events/${event.id}/progress`, { headers: { cookie: host.cookie } }),
    );

    expect(body.serverNow).toBe("2026-06-01T10:15:00.000Z");
  });

  it("7.4.1 treats missing or null members as all event memberships in ScheduleDTO", async () => {
    const { host, event } = await createEventWithHost();
    const member = await loginAndJoin("Guest", event.id);

    const schedule = await createSchedule(host.cookie, event.id, { members: null });

    expect(schedule.members.sort()).toEqual([host.user.id, member.user.id].sort());
  });

  it("7.4.2 inserts explicit schedule members and returns exactly those user ids", async () => {
    const { host, event } = await createEventWithHost();
    const member = await loginAndJoin("Guest", event.id);

    const schedule = await createSchedule(host.cookie, event.id, { members: [member.user.id] });

    expect(schedule.members).toEqual([member.user.id]);
  });

  it("7.4.3 PATCH members [] clears explicit rows and returns to all event members", async () => {
    const { host, event } = await createEventWithHost();
    const member = await loginAndJoin("Guest", event.id);
    const schedule = await createSchedule(host.cookie, event.id, { members: [member.user.id] });

    const res = await app.request(`/api/schedules/${schedule.id}`, {
      method: "PATCH",
      headers: { ...jsonHeaders, cookie: host.cookie },
      body: JSON.stringify({ members: [] }),
    });

    expect(res.status).toBe(200);
    expect((await readJson(res)).schedule.members.sort()).toEqual(
      [host.user.id, member.user.id].sort(),
    );
  });

  it("7.4.4 PATCH members null leaves explicit members unchanged", async () => {
    const { host, event } = await createEventWithHost();
    const member = await loginAndJoin("Guest", event.id);
    const schedule = await createSchedule(host.cookie, event.id, { members: [member.user.id] });

    const res = await app.request(`/api/schedules/${schedule.id}`, {
      method: "PATCH",
      headers: { ...jsonHeaders, cookie: host.cookie },
      body: JSON.stringify({ members: null, memo: "updated" }),
    });

    expect(res.status).toBe(200);
    expect((await readJson(res)).schedule.members).toEqual([member.user.id]);
  });

  it("7.2.6 returns EVENT_NOT_FOUND for schedule operations using a missing event id", async () => {
    const user = await login("Host");

    const res = await app.request("/api/events/nonexistent/schedules", {
      method: "POST",
      headers: { ...jsonHeaders, cookie: user.cookie },
      body: JSON.stringify(scheduleInput()),
    });

    await expectError(res, 404, "EVENT_NOT_FOUND");
  });
});
