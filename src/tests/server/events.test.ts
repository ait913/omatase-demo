import { beforeEach, describe, expect, it } from "vitest";
import { app } from "@/tests/helpers/app";
import { resetDb } from "@/tests/helpers/reset-db";
import {
  createEvent,
  createEventWithHost,
  expectError,
  joinEvent,
  login,
  loginAndJoin,
  readJson,
} from "./_helpers";

describe("server events and membership (§7.2)", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("7.2.1 creates an event and host membership for the caller", async () => {
    const host = await login("Host");
    const event = await createEvent(host.cookie, "大阪旅行");

    expect(event.name).toBe("大阪旅行");
    expect(event.viewerIsHost).toBe(true);

    const membersRes = await app.request(`/api/events/${event.id}/members`, {
      headers: { cookie: host.cookie },
    });
    expect(membersRes.status).toBe(200);
    expect((await readJson(membersRes)).members).toMatchObject([
      { userId: host.user.id, name: "Host", role: "host" },
    ]);
  });

  it("7.2.2 lets another user view the event name without membership", async () => {
    const { event } = await createEventWithHost();
    const other = await login("Guest");

    const res = await app.request(`/api/events/${event.id}`, {
      headers: { cookie: other.cookie },
    });

    expect(res.status).toBe(200);
    const body = await readJson(res);
    expect(body.event.name).toBe("大阪旅行");
    expect(body.viewerIsMember).toBe(false);
  });

  it("7.2.3 rejects member list access by a non-member", async () => {
    const { event } = await createEventWithHost();
    const other = await login("Guest");

    const res = await app.request(`/api/events/${event.id}/members`, {
      headers: { cookie: other.cookie },
    });

    await expectError(res, 403, "FORBIDDEN_NOT_MEMBER");
  });

  it("7.2.4 joins a non-member as role member", async () => {
    const { event } = await createEventWithHost();
    const guest = await login("Guest");

    const membership = await joinEvent(guest.cookie, event.id);

    expect(membership).toMatchObject({ userId: guest.user.id, name: "Guest", role: "member" });
  });

  it("7.2.5 returns ALREADY_MEMBER when an existing member joins again", async () => {
    const { event } = await createEventWithHost();
    const guest = await loginAndJoin("Guest", event.id);

    const res = await app.request(`/api/events/${event.id}/join`, {
      method: "POST",
      headers: { cookie: guest.cookie },
    });

    await expectError(res, 409, "ALREADY_MEMBER");
  });

  it("7.2.6 returns EVENT_NOT_FOUND for a missing event id", async () => {
    const user = await login("Guest");

    const res = await app.request("/api/events/nonexistent", {
      headers: { cookie: user.cookie },
    });

    await expectError(res, 404, "EVENT_NOT_FOUND");
  });
});
