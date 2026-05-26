import { vi } from "vitest";

export const eventId = "eid";
export const scheduleId = "sid";
export const featureId = "fid";

export const hostUser = { id: "host-user", name: "ホスト", isAnonymous: true };
export const memberUser = { id: "member-user", name: "たんり", isAnonymous: true };

const iso = {
  now: "2026-06-01T10:05:00.000Z",
  start: "2026-06-01T01:00:00.000Z",
  end: "2026-06-01T01:30:00.000Z",
  nextStart: "2026-06-01T05:00:00.000Z",
  nextEnd: "2026-06-01T06:00:00.000Z",
};

export function makeEvent(viewerIsHost = false) {
  return {
    id: eventId,
    name: "大阪旅行",
    hostUserId: hostUser.id,
    createdAt: iso.now,
    updatedAt: iso.now,
    viewerIsHost,
  };
}

export function makeMembers() {
  return [
    { userId: hostUser.id, name: "ホスト", role: "host", joinedAt: iso.now },
    { userId: memberUser.id, name: "たんり", role: "member", joinedAt: iso.now },
  ];
}

export function makeSchedule(overrides: Record<string, unknown> = {}) {
  return {
    id: scheduleId,
    eventId,
    name: "東京駅集合",
    startAt: iso.start,
    endAt: iso.end,
    location: { lat: 35.681236, lng: 139.767125, label: "東京駅 丸の内中央口" },
    memo: "中央改札前",
    status: "active",
    position: 0,
    members: [hostUser.id, memberUser.id],
    featureSummaries: [{ id: featureId, kind: "meetup", position: 0, summary: { doneCount: 1, totalMembers: 2 } }],
    ...overrides,
  };
}

export function makeProgress(options: { viewerIsHost?: boolean; current?: unknown | null; prev?: unknown | null; next?: unknown | null } = {}) {
  const current =
    options.current === undefined
      ? {
          ...makeSchedule(),
          features: [
            {
              id: featureId,
              scheduleId,
              kind: "meetup",
              position: 0,
              config: { kind: "meetup", location: { inherit: true }, checkInEnabled: true },
              state: { kind: "meetup", checkedInAt: null },
              aggregate: { doneCount: 1, totalMembers: 2 },
            },
          ],
        }
      : options.current;

  return {
    event: makeEvent(options.viewerIsHost ?? false),
    members: makeMembers(),
    current,
    prev: options.prev ?? null,
    next: options.next ?? makeSchedule({ id: "sid-next", name: "ホテルチェックイン", startAt: iso.nextStart, endAt: iso.nextEnd, status: "upcoming", position: 1 }),
    latestAnnouncement: { id: "ann-1", authorUserId: hostUser.id, authorName: "ホスト", body: "明日だよー", createdAt: iso.now },
    serverNow: iso.now,
  };
}

export function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { "content-type": "application/json", ...(init.headers ?? {}) },
  });
}

export function noContentResponse() {
  return new Response(null, { status: 204 });
}

export function setVisibilityState(value: DocumentVisibilityState) {
  Object.defineProperty(document, "visibilityState", { value, configurable: true });
  document.dispatchEvent(new Event("visibilitychange"));
}

export function installFetchMock(options: {
  session?: null | { user: typeof hostUser | typeof memberUser; session?: Record<string, unknown> };
  viewerIsHost?: boolean;
  viewerIsMember?: boolean;
  progress?: ReturnType<typeof makeProgress>;
} = {}) {
  const session = options.session === undefined ? { user: memberUser, session: { id: "sess" } } : options.session;
  const viewerIsHost = options.viewerIsHost ?? false;
  const viewerIsMember = options.viewerIsMember ?? session !== null;
  const progress = options.progress ?? makeProgress({ viewerIsHost });

  return vi.spyOn(global, "fetch").mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url, "http://localhost");
    const method = (init?.method ?? "GET").toUpperCase();
    const path = url.pathname;

    if (path === "/api/auth/get-session") return jsonResponse(session);
    if (path === "/api/auth/sign-in/anonymous") return jsonResponse({ user: memberUser, session: { id: "sess" } }, { headers: { "set-cookie": "better-auth.session_token=test" } });
    if (path === `/api/events/${eventId}/progress`) return jsonResponse(progress);
    if (path === `/api/events/${eventId}` && method === "GET") return jsonResponse({ event: makeEvent(viewerIsHost), members: makeMembers(), viewerIsMember });
    if (path === `/api/events/${eventId}/members`) return jsonResponse({ members: makeMembers() });
    if (path === `/api/events/${eventId}/schedules` && method === "POST") return jsonResponse({ schedule: makeSchedule() }, { status: 201 });
    if (path === `/api/events/${eventId}/schedules`) return jsonResponse({ schedules: [makeSchedule()] });
    if (path === `/api/events/${eventId}/announcements`) return jsonResponse({ announcements: [progress.latestAnnouncement] });
    if (path === `/api/events/${eventId}/chat`) return method === "GET" ? jsonResponse({ messages: [] }) : jsonResponse({ message: { id: "msg-1", authorUserId: memberUser.id, authorName: "たんり", body: "hi", createdAt: iso.now } }, { status: 201 });
    if (path === `/api/schedules/${scheduleId}`) return jsonResponse({ schedule: { ...makeSchedule(), features: [] } });
    if (path === `/api/schedules/${scheduleId}/chat`) return method === "GET" ? jsonResponse({ messages: [] }) : jsonResponse({ message: { id: "smsg-1", authorUserId: memberUser.id, authorName: "たんり", body: "hi", createdAt: iso.now } }, { status: 201 });
    if (path === `/api/events/${eventId}/join`) return jsonResponse({ membership: makeMembers()[1] });

    if (path === "/api/events" && method === "POST") return jsonResponse({ event: makeEvent(true) }, { status: 201 });
    if (path === `/api/schedules/${scheduleId}` && method === "PATCH") return jsonResponse({ schedule: makeSchedule() });
    if (path === `/api/schedules/${scheduleId}` && method === "DELETE") return noContentResponse();
    if (path === `/api/schedules/${scheduleId}/complete`) return jsonResponse({ schedule: makeSchedule({ status: "completed" }) });
    if (path === `/api/schedules/${scheduleId}/features` && method === "POST") return jsonResponse({ feature: { id: featureId, scheduleId, kind: "meetup", position: 0, config: { kind: "meetup", location: { inherit: true }, checkInEnabled: true }, state: {}, aggregate: { doneCount: 0, totalMembers: 2 } } }, { status: 201 });
    if (path === `/api/features/${featureId}` && method === "PATCH") return jsonResponse({ feature: { id: featureId, scheduleId, kind: "meetup", position: 0, config: { kind: "meetup", location: { inherit: true }, checkInEnabled: true }, state: {}, aggregate: { doneCount: 0, totalMembers: 2 } } });
    if (path === `/api/features/${featureId}` && method === "DELETE") return noContentResponse();
    if (path === `/api/features/${featureId}/state`) return jsonResponse({ state: { kind: "meetup", checkedInAt: Date.now() } });
    if (path === `/api/events/${eventId}/announcements` && method === "POST") return jsonResponse({ announcement: progress.latestAnnouncement }, { status: 201 });

    return jsonResponse({ code: "UNMOCKED", message: `${method} ${path}` }, { status: 500 });
  });
}
