import { describe, expect, it } from "vitest";
import {
  createEvent,
  createFeature,
  createSchedule,
  expectError,
  joinEvent,
  loginUser,
  requestJson,
} from "./_helpers";

describe("server features (§7.5)", () => {
  it("7.5.1 creates a meetup feature inheriting the schedule location", async () => {
    const host = await loginUser("ホスト");
    const event = await createEvent(host.cookie);
    const schedule = await createSchedule(host.cookie, event.id);

    const feature = await createFeature(host.cookie, schedule.id, {
      kind: "meetup",
      config: { kind: "meetup", location: { inherit: true }, checkInEnabled: true },
    });

    expect(feature).toEqual(expect.objectContaining({ kind: "meetup" }));
  });

  it("7.5.2 rejects meetup inherit=true when the schedule has no location", async () => {
    const host = await loginUser("ホスト");
    const event = await createEvent(host.cookie);
    const schedule = await createSchedule(host.cookie, event.id, { location: null });

    const { res, json } = await requestJson(`/api/schedules/${schedule.id}/features`, {
      method: "POST",
      cookie: host.cookie,
      body: {
        kind: "meetup",
        config: { kind: "meetup", location: { inherit: true }, checkInEnabled: true },
      },
    });

    expect(res.status).toBe(400);
    expectError(json, "BAD_REQUEST");
  });

  it("7.5.3 rejects checklist features with no items", async () => {
    const host = await loginUser("ホスト");
    const event = await createEvent(host.cookie);
    const schedule = await createSchedule(host.cookie, event.id);

    const { res, json } = await requestJson(`/api/schedules/${schedule.id}/features`, {
      method: "POST",
      cookie: host.cookie,
      body: { kind: "checklist", config: { kind: "checklist", items: [] } },
    });

    expect(res.status).toBe(400);
    expectError(json, "BAD_REQUEST");
  });

  it("7.5.4 upserts caller feature state and returns it on the next GET", async () => {
    const host = await loginUser("ホスト");
    const guest = await loginUser("ゲスト");
    const event = await createEvent(host.cookie);
    await joinEvent(guest.cookie, event.id);
    const schedule = await createSchedule(host.cookie, event.id);
    const feature = await createFeature(host.cookie, schedule.id, {
      kind: "checklist",
      config: { kind: "checklist", items: [{ id: "passport", label: "パスポート", required: true }] },
    });

    const update = await requestJson(`/api/features/${feature.id}/state`, {
      method: "PUT",
      cookie: guest.cookie,
      body: { state: { kind: "checklist", checked: { passport: true } } },
    });
    expect(update.res.status).toBe(200);

    const get = await requestJson(`/api/features/${feature.id}`, { cookie: guest.cookie });
    expect(get.res.status).toBe(200);
    expect(get.json.feature.state).toEqual({ kind: "checklist", checked: { passport: true } });
  });

  it("7.5.5 returns only the caller state while exposing other users only through aggregate", async () => {
    const host = await loginUser("ホスト");
    const guestA = await loginUser("ゲストA");
    const guestB = await loginUser("ゲストB");
    const event = await createEvent(host.cookie);
    await joinEvent(guestA.cookie, event.id);
    await joinEvent(guestB.cookie, event.id);
    const schedule = await createSchedule(host.cookie, event.id);
    const feature = await createFeature(host.cookie, schedule.id, {
      kind: "checklist",
      config: { kind: "checklist", items: [{ id: "item", label: "持ち物", required: true }] },
    });
    await requestJson(`/api/features/${feature.id}/state`, {
      method: "PUT",
      cookie: guestA.cookie,
      body: { state: { kind: "checklist", checked: { item: true } } },
    });
    await requestJson(`/api/features/${feature.id}/state`, {
      method: "PUT",
      cookie: guestB.cookie,
      body: { state: { kind: "checklist", checked: { item: false } } },
    });

    const { res, json } = await requestJson(`/api/features/${feature.id}`, { cookie: guestA.cookie });

    expect(res.status).toBe(200);
    expect(json.feature.state).toEqual({ kind: "checklist", checked: { item: true } });
    expect(json.feature.aggregate).toEqual(expect.objectContaining({ doneCount: 1, totalMembers: 3 }));
    expect(JSON.stringify(json.feature.state)).not.toContain(guestB.user.id);
  });

  it("7.5.6 counts only members with all required checklist items checked", async () => {
    const host = await loginUser("ホスト");
    const guestA = await loginUser("ゲストA");
    const guestB = await loginUser("ゲストB");
    const event = await createEvent(host.cookie);
    await joinEvent(guestA.cookie, event.id);
    await joinEvent(guestB.cookie, event.id);
    const schedule = await createSchedule(host.cookie, event.id);
    const feature = await createFeature(host.cookie, schedule.id, {
      kind: "checklist",
      config: {
        kind: "checklist",
        items: [
          { id: "must", label: "必須", required: true },
          { id: "maybe", label: "任意", required: false },
        ],
      },
    });
    await requestJson(`/api/features/${feature.id}/state`, {
      method: "PUT",
      cookie: guestA.cookie,
      body: { state: { kind: "checklist", checked: { must: true, maybe: false } } },
    });
    await requestJson(`/api/features/${feature.id}/state`, {
      method: "PUT",
      cookie: guestB.cookie,
      body: { state: { kind: "checklist", checked: { must: false, maybe: true } } },
    });

    const { res, json } = await requestJson(`/api/features/${feature.id}`, { cookie: host.cookie });

    expect(res.status).toBe(200);
    expect(json.feature.aggregate.doneCount).toBe(1);
  });

  it("7.5.7 counts meetup members with checkedInAt !== null", async () => {
    const host = await loginUser("ホスト");
    const guestA = await loginUser("ゲストA");
    const guestB = await loginUser("ゲストB");
    const event = await createEvent(host.cookie);
    await joinEvent(guestA.cookie, event.id);
    await joinEvent(guestB.cookie, event.id);
    const schedule = await createSchedule(host.cookie, event.id);
    const feature = await createFeature(host.cookie, schedule.id, {
      kind: "meetup",
      config: { kind: "meetup", location: { inherit: true }, checkInEnabled: true },
    });
    await requestJson(`/api/features/${feature.id}/state`, {
      method: "PUT",
      cookie: guestA.cookie,
      body: { state: { kind: "meetup", checkedInAt: 1780308000000 } },
    });
    await requestJson(`/api/features/${feature.id}/state`, {
      method: "PUT",
      cookie: guestB.cookie,
      body: { state: { kind: "meetup", checkedInAt: null } },
    });

    const { res, json } = await requestJson(`/api/features/${feature.id}`, { cookie: host.cookie });

    expect(res.status).toBe(200);
    expect(json.feature.aggregate.doneCount).toBe(1);
  });

  it("7.5.8 deletes a feature and makes it unavailable", async () => {
    const host = await loginUser("ホスト");
    const event = await createEvent(host.cookie);
    const schedule = await createSchedule(host.cookie, event.id);
    const feature = await createFeature(host.cookie, schedule.id, {
      kind: "checklist",
      config: { kind: "checklist", items: [{ id: "item", label: "持ち物", required: true }] },
    });

    const del = await requestJson(`/api/features/${feature.id}`, {
      method: "DELETE",
      cookie: host.cookie,
    });
    expect(del.res.status).toBe(204);

    const get = await requestJson(`/api/features/${feature.id}`, { cookie: host.cookie });
    expect(get.res.status).toBe(404);
    expectError(get.json, "FEATURE_NOT_FOUND");
  });

  it("7.5.9 rejects feature creation and deletion by non-host members", async () => {
    const host = await loginUser("ホスト");
    const guest = await loginUser("ゲスト");
    const event = await createEvent(host.cookie);
    await joinEvent(guest.cookie, event.id);
    const schedule = await createSchedule(host.cookie, event.id);
    const feature = await createFeature(host.cookie, schedule.id, {
      kind: "checklist",
      config: { kind: "checklist", items: [{ id: "item", label: "持ち物", required: true }] },
    });

    const create = await requestJson(`/api/schedules/${schedule.id}/features`, {
      method: "POST",
      cookie: guest.cookie,
      body: {
        kind: "meetup",
        config: { kind: "meetup", location: { inherit: true }, checkInEnabled: true },
      },
    });
    expect(create.res.status).toBe(403);
    expectError(create.json, "FORBIDDEN_NOT_HOST");

    const del = await requestJson(`/api/features/${feature.id}`, {
      method: "DELETE",
      cookie: guest.cookie,
    });
    expect(del.res.status).toBe(403);
    expectError(del.json, "FORBIDDEN_NOT_HOST");
  });
});
