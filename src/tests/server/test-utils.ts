import { expect } from "vitest";
import { app } from "@/tests/helpers/app";
import { loginAsGuest } from "@/tests/helpers/auth-cookie";

export const jsonHeaders = { "content-type": "application/json" };

export async function readJson<T = any>(res: Response): Promise<T> {
  const text = await res.text();
  return text ? JSON.parse(text) : (undefined as T);
}

export async function expectError(res: Response, status: number, code: string) {
  expect(res.status).toBe(status);
  const body = await readJson(res);
  expect(body.code).toBe(code);
  return body;
}

export async function getSession(cookie: string) {
  const res = await app.request("/api/auth/get-session", {
    headers: { cookie },
  });
  expect(res.status).toBe(200);
  return readJson(res);
}

export async function loginUser(name: string) {
  const cookie = await loginAsGuest(name);
  const session = await getSession(cookie);
  return { cookie, user: session.user, session: session.session };
}

export async function createEvent(cookie: string, name = uniqueName("イベント")) {
  const res = await app.request("/api/events", {
    method: "POST",
    headers: { ...jsonHeaders, cookie },
    body: JSON.stringify({ name }),
  });
  expect(res.status).toBe(201);
  const body = await readJson(res);
  return body.event;
}

export async function createEventAsHost(hostName = uniqueName("ホスト"), eventName = uniqueName("旅行")) {
  const host = await loginUser(hostName);
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

export async function loginAndJoin(eventId: string, name = uniqueName("ゲスト")) {
  const user = await loginUser(name);
  const membership = await joinEvent(user.cookie, eventId);
  return { ...user, membership };
}

export async function createSchedule(
  cookie: string,
  eventId: string,
  overrides: Record<string, unknown> = {},
) {
  const body = {
    name: uniqueName("集合"),
    startAt: "2026-06-01T10:00:00.000Z",
    endAt: "2026-06-01T10:30:00.000Z",
    location: { lat: 35.681236, lng: 139.767125, label: "東京駅" },
    memo: "memo",
    ...overrides,
  };
  const res = await app.request(`/api/events/${eventId}/schedules`, {
    method: "POST",
    headers: { ...jsonHeaders, cookie },
    body: JSON.stringify(body),
  });
  expect(res.status).toBe(201);
  const json = await readJson(res);
  return json.schedule;
}

export async function patchSchedule(cookie: string, scheduleId: string, patch: Record<string, unknown>) {
  const res = await app.request(`/api/schedules/${scheduleId}`, {
    method: "PATCH",
    headers: { ...jsonHeaders, cookie },
    body: JSON.stringify(patch),
  });
  expect(res.status).toBe(200);
  const json = await readJson(res);
  return json.schedule;
}

export async function createFeature(cookie: string, scheduleId: string, body: Record<string, unknown>) {
  const res = await app.request(`/api/schedules/${scheduleId}/features`, {
    method: "POST",
    headers: { ...jsonHeaders, cookie },
    body: JSON.stringify(body),
  });
  expect(res.status).toBe(201);
  const json = await readJson(res);
  return json.feature;
}

export function uniqueName(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

