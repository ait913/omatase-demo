import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, vi } from "vitest";

export const eventId = "eid";
export const scheduleId = "sid";
export const featureId = "fid";

export const hostSession = {
  user: { id: "host-user", name: "ホスト", isAnonymous: true },
  session: { id: "session-host", userId: "host-user" },
};

export const memberSession = {
  user: { id: "member-user", name: "たんり", isAnonymous: true },
  session: { id: "session-member", userId: "member-user" },
};

export const eventDTO = {
  id: eventId,
  name: "大阪旅行",
  hostUserId: "host-user",
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-01T00:00:00.000Z",
  viewerIsHost: false,
};

export const hostEventDTO = { ...eventDTO, viewerIsHost: true };

export const members = [
  { userId: "host-user", name: "ホスト", role: "host", joinedAt: "2026-06-01T00:00:00.000Z" },
  { userId: "member-user", name: "たんり", role: "member", joinedAt: "2026-06-01T00:01:00.000Z" },
];

export const currentSchedule = {
  id: scheduleId,
  eventId,
  name: "東京駅集合",
  startAt: "2026-06-01T10:00:00.000Z",
  endAt: "2026-06-01T10:30:00.000Z",
  location: { lat: 35.681236, lng: 139.767125, label: "東京駅 丸の内中央口" },
  memo: null,
  status: "active",
  position: 0,
  members: ["host-user", "member-user"],
  featureSummaries: [
    { id: featureId, kind: "meetup", position: 0, summary: { doneCount: 1, totalMembers: 2 } },
  ],
};

export const nextSchedule = {
  ...currentSchedule,
  id: "sid-next",
  name: "ホテルチェックイン",
  startAt: "2026-06-01T14:00:00.000Z",
  endAt: "2026-06-01T15:00:00.000Z",
  status: "upcoming",
  position: 1,
};

export const progressActive = {
  event: eventDTO,
  members,
  current: {
    ...currentSchedule,
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
  },
  prev: null,
  next: nextSchedule,
  latestAnnouncement: {
    id: "ann-1",
    authorUserId: "host-user",
    authorName: "ホスト",
    body: "明日だよー",
    createdAt: "2026-06-01T01:00:00.000Z",
  },
  serverNow: "2026-06-01T10:05:00.000Z",
};

export const progressBeforeStart = {
  event: eventDTO,
  members,
  current: null,
  prev: null,
  next: currentSchedule,
  latestAnnouncement: null,
  serverNow: "2026-06-01T09:00:00.000Z",
};

export const progressFinished = {
  event: eventDTO,
  members,
  current: null,
  prev: currentSchedule,
  next: null,
  latestAnnouncement: null,
  serverNow: "2026-06-01T19:00:00.000Z",
};

export function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return Promise.resolve(
    new Response(body === undefined ? undefined : JSON.stringify(body), {
      status: init.status ?? 200,
      headers: { "content-type": "application/json", ...(init.headers ?? {}) },
      ...init,
    }),
  );
}

export function pathOf(input: RequestInfo | URL) {
  const raw = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
  return new URL(raw, "http://localhost").pathname;
}

export function installFetchMock(
  handler: (path: string, init: RequestInit | undefined, input: RequestInfo | URL) => Promise<Response>,
) {
  return vi.spyOn(global, "fetch").mockImplementation((input, init) => handler(pathOf(input), init, input));
}

export function installDefaultFetchMock(options: {
  session?: unknown;
  event?: unknown;
  progress?: unknown;
  schedules?: unknown[];
} = {}) {
  const session = options.session ?? null;
  const event = options.event ?? eventDTO;
  const progress = options.progress ?? progressActive;
  const schedules = options.schedules ?? [currentSchedule, nextSchedule];

  return installFetchMock(async (path, init) => {
    const method = init?.method?.toUpperCase() ?? "GET";
    if (path === "/api/auth/get-session") return jsonResponse(session);
    if (path === "/api/auth/sign-in/anonymous") return jsonResponse(memberSession, { status: 200 });
    if (path === `/api/events/${eventId}`) {
      return jsonResponse({ event, members, viewerIsMember: Boolean(session) && event !== null });
    }
    if (path === `/api/events/${eventId}/join` && method === "POST") {
      return jsonResponse({ membership: members[1] });
    }
    if (path === `/api/events/${eventId}/progress`) return jsonResponse(progress);
    if (path === `/api/events/${eventId}/schedules`) return jsonResponse({ schedules });
    if (path === `/api/events/${eventId}/members`) return jsonResponse({ members });
    if (path === `/api/events/${eventId}/announcements`) {
      return jsonResponse({ announcements: progressActive.latestAnnouncement ? [progressActive.latestAnnouncement] : [] });
    }
    if (path === `/api/events/${eventId}/chat`) return jsonResponse({ messages: [] });
    if (path === `/api/schedules/${scheduleId}/chat`) return jsonResponse({ messages: [] });
    return jsonResponse({ code: "BAD_TEST_ROUTE", message: `${method} ${path}` }, { status: 404 });
  });
}

export async function waitForPath(router: { state: { location: { pathname: string } } }, pathname: string) {
  await waitFor(() => expect(router.state.location.pathname).toBe(pathname));
}

export function setVisibilityState(value: DocumentVisibilityState) {
  Object.defineProperty(document, "visibilityState", { value, configurable: true });
}

export function createQueryWrapper(queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 0 } } })) {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { wrapper, queryClient };
}

export function renderApiHook<T>(hook: () => T, queryClient?: QueryClient) {
  const { wrapper, queryClient: qc } = createQueryWrapper(queryClient);
  return { ...renderHook(hook, { wrapper }), queryClient: qc };
}

export function requireExport<T extends (...args: any[]) => unknown>(module: Record<string, unknown>, names: string[]): T {
  for (const name of names) {
    const candidate = module[name];
    if (typeof candidate === "function") return candidate as T;
  }
  throw new Error(`Missing API hook export. Tried: ${names.join(", ")}`);
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  setVisibilityState("visible");
});
