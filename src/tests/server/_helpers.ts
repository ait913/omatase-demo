import { expect } from "vitest";
import { app } from "@/tests/helpers/app";
import { loginAsGuest } from "@/tests/helpers/auth-cookie";

export const jsonHeaders = { "content-type": "application/json" };

export async function readJson(res: Response) {
  const text = await res.text();
  return text.length > 0 ? JSON.parse(text) : null;
}

export function expectError(resOrJson: Response | { code?: string }, statusOrCode: number | string, code?: string) {
  if (resOrJson instanceof Response) {
    return (async () => {
      expect(resOrJson.status).toBe(statusOrCode);
      const body = await readJson(resOrJson);
      expect(body.code).toBe(code);
      return body;
    })();
  }

  expect(resOrJson.code).toBe(statusOrCode);
  return resOrJson;
}

export async function login(name: string) {
  const cookie = await loginAsGuest(name);
  const sessionRes = await app.request("/api/auth/get-session", {
    headers: { cookie },
  });
  expect(sessionRes.status).toBe(200);
  const session = await readJson(sessionRes);
  return { cookie, user: session.user };
}

export const loginUser = login;

export async function requestJson(
  path: string,
  options: {
    method?: string;
    cookie?: string;
    body?: Record<string, unknown>;
    headers?: Record<string, string>;
  } = {},
) {
  const headers: Record<string, string> = { ...(options.headers ?? {}) };
  if (options.cookie) headers.cookie = options.cookie;
  if (options.body !== undefined) headers["content-type"] = "application/json";
  const res = await app.request(path, {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const json = await readJson(res);
  return { res, json };
}

export async function createEvent(cookie: string, name = "大阪旅行") {
  const res = await app.request("/api/events", {
    method: "POST",
    headers: { ...jsonHeaders, cookie },
    body: JSON.stringify({ name }),
  });
  expect(res.status).toBe(201);
  const body = await readJson(res);
  return body.event;
}

export async function createEventWithHost(name = "Host", eventName = "大阪旅行") {
  const host = await login(name);
  const event = await createEvent(host.cookie, eventName);
  return { host, event };
}

export async function joinEvent(cookie: string, eventId: string) {
  const res = await app.request(`/api/events/${eventId}/join`, {
    method: "POST",
    headers: { cookie },
  });
  expect(res.status).toBe(200);
  const body = await readJson(res);
  return body.membership;
}

export async function loginAndJoin(name: string, eventId: string) {
  const member = await login(name);
  const membership = await joinEvent(member.cookie, eventId);
  return { ...member, membership };
}

export function scheduleInput(overrides: Record<string, unknown> = {}) {
  return {
    name: "集合",
    startAt: "2026-06-01T10:00:00.000Z",
    endAt: "2026-06-01T10:30:00.000Z",
    location: { lat: 35.681236, lng: 139.767125, label: "東京駅" },
    memo: "丸の内中央口",
    ...overrides,
  };
}

export async function createSchedule(
  cookie: string,
  eventId: string,
  overrides: Record<string, unknown> = {},
) {
  const res = await app.request(`/api/events/${eventId}/schedules`, {
    method: "POST",
    headers: { ...jsonHeaders, cookie },
    body: JSON.stringify(scheduleInput(overrides)),
  });
  expect(res.status).toBe(201);
  const body = await readJson(res);
  return body.schedule;
}

export async function createFeature(
  cookie: string,
  scheduleId: string,
  body: Record<string, unknown> = {
    kind: "meetup",
    config: { kind: "meetup", location: { inherit: true }, checkInEnabled: true },
  },
) {
  const res = await app.request(`/api/schedules/${scheduleId}/features`, {
    method: "POST",
    headers: { ...jsonHeaders, cookie },
    body: JSON.stringify(body),
  });
  expect(res.status).toBe(201);
  const json = await readJson(res);
  return json.feature;
}

export async function postAnnouncement(cookie: string, eventId: string, body: string) {
  const res = await app.request(`/api/events/${eventId}/announcements`, {
    method: "POST",
    headers: { ...jsonHeaders, cookie },
    body: JSON.stringify({ body }),
  });
  expect(res.status).toBe(201);
  return (await readJson(res)).announcement;
}

export async function postEventChat(cookie: string, eventId: string, body: string) {
  const res = await app.request(`/api/events/${eventId}/chat`, {
    method: "POST",
    headers: { ...jsonHeaders, cookie },
    body: JSON.stringify({ body }),
  });
  expect(res.status).toBe(201);
  return (await readJson(res)).message;
}

/**
 * 設計 §7.1 は日本語 name を要求するが、Hono の app.request は HTTP ヘッダ値が Latin-1 制約。
 * テスト helper (`loginAsGuest`) は non-latin1 文字を percent-encode で送るが、
 * better-auth の `generateName` 実装が raw bytes を保持するか decode するかは設計で曖昧。
 * 両対応の assert ヘルパ。
 */
export function expectNameMatches(actual: string, expected: string) {
  if (actual === expected) return;
  try {
    if (decodeURIComponent(actual) === expected) return;
  } catch { /* fallthrough */ }
  expect(actual).toBe(expected); // 失敗時の diff のため
}
