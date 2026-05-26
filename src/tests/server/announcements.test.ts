import { afterEach, describe, expect, it, vi } from "vitest";
import { createEvent, expectError, joinEvent, loginUser, requestJson } from "./_helpers";

describe("server announcements (§7.6)", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("7.6.1 lets a host post an announcement", async () => {
    const host = await loginUser("ホスト");
    const event = await createEvent(host.cookie);

    const { res, json } = await requestJson(`/api/events/${event.id}/announcements`, {
      method: "POST",
      cookie: host.cookie,
      body: { body: "明日だよー" },
    });

    expect(res.status).toBe(201);
    expect(json.announcement).toEqual(
      expect.objectContaining({ authorUserId: host.user.id, body: "明日だよー" }),
    );
  });

  it("7.6.2 rejects announcement posts by non-host members", async () => {
    const host = await loginUser("ホスト");
    const guest = await loginUser("ゲスト");
    const event = await createEvent(host.cookie);
    await joinEvent(guest.cookie, event.id);

    const { res, json } = await requestJson(`/api/events/${event.id}/announcements`, {
      method: "POST",
      cookie: guest.cookie,
      body: { body: "メンバー投稿" },
    });

    expect(res.status).toBe(403);
    expectError(json, "FORBIDDEN_NOT_HOST");
  });

  it("7.6.3 lists announcements newest-first with a maximum of 20", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01T10:00:00Z"));
    const host = await loginUser("ホスト");
    const event = await createEvent(host.cookie);

    for (let i = 0; i < 25; i += 1) {
      vi.setSystemTime(new Date(Date.UTC(2026, 5, 1, 10, 0, i)));
      const post = await requestJson(`/api/events/${event.id}/announcements`, {
        method: "POST",
        cookie: host.cookie,
        body: { body: `告知-${i}` },
      });
      expect(post.res.status).toBe(201);
    }

    const { res, json } = await requestJson(`/api/events/${event.id}/announcements`, {
      cookie: host.cookie,
    });

    expect(res.status).toBe(200);
    expect(json.announcements).toHaveLength(20);
    expect(json.announcements[0].body).toBe("告知-24");
    expect(json.announcements.at(-1).body).toBe("告知-5");
  });

  it("7.6.4 rejects blank and 501-character announcement bodies", async () => {
    const host = await loginUser("ホスト");
    const event = await createEvent(host.cookie);

    const blank = await requestJson(`/api/events/${event.id}/announcements`, {
      method: "POST",
      cookie: host.cookie,
      body: { body: "" },
    });
    expect(blank.res.status).toBe(400);
    expectError(blank.json, "BAD_REQUEST");

    const tooLong = await requestJson(`/api/events/${event.id}/announcements`, {
      method: "POST",
      cookie: host.cookie,
      body: { body: "あ".repeat(501) },
    });
    expect(tooLong.res.status).toBe(400);
    expectError(tooLong.json, "BAD_REQUEST");
  });
});
