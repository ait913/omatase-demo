import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createEvent,
  createSchedule,
  expectError,
  expectNameMatches,
  joinEvent,
  loginUser,
  requestJson,
} from "./_helpers";

describe("server chats (§7.7)", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("7.7.1 lets a member post event chat with authorName=user.name", async () => {
    const host = await loginUser("ホスト");
    const guest = await loginUser("たんり");
    const event = await createEvent(host.cookie);
    await joinEvent(guest.cookie, event.id);

    const { res, json } = await requestJson(`/api/events/${event.id}/chat`, {
      method: "POST",
      cookie: guest.cookie,
      body: { body: "hi" },
    });

    expect(res.status).toBe(201);
    expect(json.message.authorUserId).toBe(guest.user.id);
    expect(json.message.body).toBe("hi");
    expectNameMatches(json.message.authorName, "たんり");
  });

  it("7.7.2 returns the latest 100 event messages in createdAt ascending order", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01T10:00:00Z"));
    const host = await loginUser("ホスト");
    const event = await createEvent(host.cookie);

    for (let i = 0; i < 105; i += 1) {
      vi.setSystemTime(new Date(Date.UTC(2026, 5, 1, 10, 0, i)));
      const post = await requestJson(`/api/events/${event.id}/chat`, {
        method: "POST",
        cookie: host.cookie,
        body: { body: `msg-${i}` },
      });
      expect(post.res.status).toBe(201);
    }

    const { res, json } = await requestJson(`/api/events/${event.id}/chat`, {
      cookie: host.cookie,
    });

    expect(res.status).toBe(200);
    expect(json.messages).toHaveLength(100);
    expect(json.messages[0].body).toBe("msg-5");
    expect(json.messages.at(-1).body).toBe("msg-104");
  });

  it("7.7.3 returns only messages after afterId, excluding afterId itself", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01T10:00:00Z"));
    const host = await loginUser("ホスト");
    const event = await createEvent(host.cookie);

    const messages: Array<{ id: string }> = [];
    for (let i = 0; i < 3; i += 1) {
      vi.setSystemTime(new Date(Date.UTC(2026, 5, 1, 10, 0, i)));
      const post = await requestJson(`/api/events/${event.id}/chat`, {
        method: "POST",
        cookie: host.cookie,
        body: { body: `after-${i}` },
      });
      messages.push(post.json.message);
    }

    const { res, json } = await requestJson(
      `/api/events/${event.id}/chat?afterId=${messages[0].id}`,
      { cookie: host.cookie },
    );

    expect(res.status).toBe(200);
    expect(json.messages.map((m: { body: string }) => m.body)).toEqual(["after-1", "after-2"]);
  });

  it("7.7.4 rejects event chat GET and POST by non-members", async () => {
    const host = await loginUser("ホスト");
    const outsider = await loginUser("外部");
    const event = await createEvent(host.cookie);

    const get = await requestJson(`/api/events/${event.id}/chat`, { cookie: outsider.cookie });
    expect(get.res.status).toBe(403);
    expectError(get.json, "FORBIDDEN_NOT_MEMBER");

    const post = await requestJson(`/api/events/${event.id}/chat`, {
      method: "POST",
      cookie: outsider.cookie,
      body: { body: "hi" },
    });
    expect(post.res.status).toBe(403);
    expectError(post.json, "FORBIDDEN_NOT_MEMBER");
  });

  it("7.7.5 applies the same rules to schedule chat using event membership", async () => {
    const host = await loginUser("ホスト");
    const guest = await loginUser("ゲスト");
    const outsider = await loginUser("外部");
    const event = await createEvent(host.cookie);
    await joinEvent(guest.cookie, event.id);
    const schedule = await createSchedule(host.cookie, event.id);

    const post = await requestJson(`/api/schedules/${schedule.id}/chat`, {
      method: "POST",
      cookie: guest.cookie,
      body: { body: "schedule hi" },
    });
    expect(post.res.status).toBe(201);
    expect(post.json.message.authorUserId).toBe(guest.user.id);
    expectNameMatches(post.json.message.authorName, "ゲスト");

    const get = await requestJson(`/api/schedules/${schedule.id}/chat`, { cookie: guest.cookie });
    expect(get.res.status).toBe(200);
    expect(get.json.messages.map((m: { body: string }) => m.body)).toEqual(["schedule hi"]);

    const outsiderGet = await requestJson(`/api/schedules/${schedule.id}/chat`, {
      cookie: outsider.cookie,
    });
    expect(outsiderGet.res.status).toBe(403);
    expectError(outsiderGet.json, "FORBIDDEN_NOT_MEMBER");
  });

  it("7.7.6 rejects blank and 2001-character chat bodies", async () => {
    const host = await loginUser("ホスト");
    const event = await createEvent(host.cookie);

    const blank = await requestJson(`/api/events/${event.id}/chat`, {
      method: "POST",
      cookie: host.cookie,
      body: { body: "" },
    });
    expect(blank.res.status).toBe(400);
    expectError(blank.json, "BAD_REQUEST");

    const tooLong = await requestJson(`/api/events/${event.id}/chat`, {
      method: "POST",
      cookie: host.cookie,
      body: { body: "a".repeat(2001) },
    });
    expect(tooLong.res.status).toBe(400);
    expectError(tooLong.json, "BAD_REQUEST");
  });
});
