import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { app } from "@/tests/helpers/app";
import {
  createEventAsHost,
  createFeature,
  createSchedule,
  expectError,
  loginAndJoin,
  loginUser,
  readJson,
} from "./test-utils";

describe("server progress - design §7.3 progress / §7.8", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01T10:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("7.3.5 chooses the overlapping schedule with the earliest startAt as current", async () => {
    const { host, event } = await createEventAsHost();
    await createSchedule(host.cookie, event.id, {
      name: "遅い重複",
      startAt: "2026-06-01T09:30:00.000Z",
      endAt: "2026-06-01T10:30:00.000Z",
    });
    await createSchedule(host.cookie, event.id, {
      name: "早い重複",
      startAt: "2026-06-01T09:00:00.000Z",
      endAt: "2026-06-01T10:15:00.000Z",
    });

    const res = await app.request(`/api/events/${event.id}/progress`, { headers: { cookie: host.cookie } });

    expect(res.status).toBe(200);
    const body = await readJson(res);
    expect(body.current.name).toBe("早い重複");
  });

  it("7.3.5 uses position ascending when overlapping startAt ties", async () => {
    const { host, event } = await createEventAsHost();
    const position2 = await createSchedule(host.cookie, event.id, {
      name: "position 2",
      startAt: "2026-06-01T09:30:00.000Z",
      endAt: "2026-06-01T10:30:00.000Z",
      position: 2,
    });
    const position1 = await createSchedule(host.cookie, event.id, {
      name: "position 1",
      startAt: "2026-06-01T09:30:00.000Z",
      endAt: "2026-06-01T10:30:00.000Z",
      position: 1,
    });

    const body = await readJson(
      await app.request(`/api/events/${event.id}/progress`, { headers: { cookie: host.cookie } }),
    );
    const expected = [position2, position1].sort((a: any, b: any) => a.position - b.position)[0];
    expect(body.current.name).toBe(expected.name);
  });

  it("7.3.6 returns current null, next first, prev null before event start", async () => {
    const { host, event } = await createEventAsHost();
    await createSchedule(host.cookie, event.id, {
      name: "未来",
      startAt: "2026-06-01T11:00:00.000Z",
      endAt: "2026-06-01T11:30:00.000Z",
    });

    const body = await readJson(
      await app.request(`/api/events/${event.id}/progress`, { headers: { cookie: host.cookie } }),
    );
    expect(body.current).toBeNull();
    expect(body.prev).toBeNull();
    expect(body.next.name).toBe("未来");
  });

  it("7.3.7 returns current null, prev last, next null after all schedules end", async () => {
    const { host, event } = await createEventAsHost();
    await createSchedule(host.cookie, event.id, {
      name: "過去1",
      startAt: "2026-06-01T08:00:00.000Z",
      endAt: "2026-06-01T08:30:00.000Z",
    });
    await createSchedule(host.cookie, event.id, {
      name: "過去2",
      startAt: "2026-06-01T09:00:00.000Z",
      endAt: "2026-06-01T09:30:00.000Z",
    });

    const body = await readJson(
      await app.request(`/api/events/${event.id}/progress`, { headers: { cookie: host.cookie } }),
    );
    expect(body.current).toBeNull();
    expect(body.prev.name).toBe("過去2");
    expect(body.next).toBeNull();
  });

  it("7.3.8 excludes completed schedules from current even when time is active", async () => {
    const { host, event } = await createEventAsHost();
    const completed = await createSchedule(host.cookie, event.id, {
      name: "完了済み",
      startAt: "2026-06-01T09:00:00.000Z",
      endAt: "2026-06-01T10:30:00.000Z",
    });
    await createSchedule(host.cookie, event.id, {
      name: "次候補",
      startAt: "2026-06-01T09:30:00.000Z",
      endAt: "2026-06-01T10:30:00.000Z",
    });
    await app.request(`/api/schedules/${completed.id}/complete`, { method: "POST", headers: { cookie: host.cookie } });

    const body = await readJson(
      await app.request(`/api/events/${event.id}/progress`, { headers: { cookie: host.cookie } }),
    );
    expect(body.current.name).toBe("次候補");
  });

  it("7.3.10 does not backfill status to completed for schedules whose endAt is in the past", async () => {
    const { host, event } = await createEventAsHost();
    const schedule = await createSchedule(host.cookie, event.id, {
      name: "終了済み未書換",
      startAt: "2026-06-01T09:00:00.000Z",
      endAt: "2026-06-01T09:30:00.000Z",
    });

    const progress = await readJson(
      await app.request(`/api/events/${event.id}/progress`, { headers: { cookie: host.cookie } }),
    );
    expect(progress.current).toBeNull();
    const scheduleRes = await app.request(`/api/schedules/${schedule.id}`, { headers: { cookie: host.cookie } });
    const scheduleBody = await readJson(scheduleRes);
    expect(scheduleBody.schedule.status).toBe("upcoming");
  });

  it("7.3.11 and 7.8.2 always includes serverNow as ISO", async () => {
    const { host, event } = await createEventAsHost();

    const body = await readJson(
      await app.request(`/api/events/${event.id}/progress`, { headers: { cookie: host.cookie } }),
    );

    expect(body.serverNow).toBe("2026-06-01T10:00:00.000Z");
  });

  it("7.8.1 returns ProgressDTO for a member", async () => {
    const { host, event } = await createEventAsHost();
    await createSchedule(host.cookie, event.id);
    const member = await loginAndJoin(event.id, "進行メンバー");

    const res = await app.request(`/api/events/${event.id}/progress`, { headers: { cookie: member.cookie } });

    expect(res.status).toBe(200);
    const body = await readJson(res);
    expect(body.event.id).toBe(event.id);
    expect(Array.isArray(body.members)).toBe(true);
    expect(body.current).toBeTruthy();
  });

  it("7.8.3 includes current feature state and aggregate", async () => {
    const { host, event } = await createEventAsHost();
    const member = await loginAndJoin(event.id, "状態メンバー");
    const schedule = await createSchedule(host.cookie, event.id, {
      startAt: "2026-06-01T09:30:00.000Z",
      endAt: "2026-06-01T10:30:00.000Z",
    });
    const feature = await createFeature(host.cookie, schedule.id, {
      kind: "checklist",
      config: {
        kind: "checklist",
        items: [{ id: "passport", label: "パスポート", required: true }],
      },
    });
    await app.request(`/api/features/${feature.id}/state`, {
      method: "PUT",
      headers: { "content-type": "application/json", cookie: member.cookie },
      body: JSON.stringify({ state: { kind: "checklist", checked: { passport: true } } }),
    });

    const body = await readJson(
      await app.request(`/api/events/${event.id}/progress`, { headers: { cookie: member.cookie } }),
    );

    expect(body.current.features[0].state).toEqual({ kind: "checklist", checked: { passport: true } });
    expect(body.current.features[0].aggregate).toEqual(expect.objectContaining({ doneCount: 1, totalMembers: 2 }));
  });

  it("7.8.4 rejects progress for a non-member", async () => {
    const { event } = await createEventAsHost();
    const nonMember = await loginUser("非参加進行");

    const res = await app.request(`/api/events/${event.id}/progress`, { headers: { cookie: nonMember.cookie } });

    await expectError(res, 403, "FORBIDDEN_NOT_MEMBER");
  });
});
