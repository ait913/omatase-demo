import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QK } from "@/client/api/queryKeys";
import * as apiHooks from "@/client/api/hooks/useApi";
import { eventId, featureId, installFetchMock, scheduleId } from "./test-fixtures";

type MutationHook = (...args: unknown[]) => { mutateAsync: (args?: unknown) => Promise<unknown> };

function loadHook(exportNames: string[]): MutationHook {
  for (const name of exportNames) {
    const candidate = (apiHooks as Record<string, unknown>)[name];
    if (typeof candidate === "function") return candidate as MutationHook;
  }
  throw new Error(`Expected client mutation hook export. Tried: ${exportNames.join(", ")}`);
}

function makeClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 0 }, mutations: { retry: false } } });
}

async function runMutation(exportNames: string[], hookArgs: unknown[], mutationArgs: unknown) {
  installFetchMock();
  const queryClient = makeClient();
  const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
  const hook = loadHook(exportNames);
  const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;

  const { result } = renderHook(() => hook(...hookArgs), { wrapper });
  await result.current.mutateAsync(mutationArgs);

  return invalidateSpy;
}

function queryKeyFromCall(call: unknown[]) {
  const first = call[0] as { queryKey?: unknown } | unknown[] | undefined;
  return Array.isArray(first) ? first : first?.queryKey;
}

function expectInvalidated(invalidateSpy: ReturnType<typeof vi.spyOn>, queryKey: readonly unknown[]) {
  expect(invalidateSpy.mock.calls.some((call) => JSON.stringify(queryKeyFromCall(call)) === JSON.stringify(queryKey))).toBe(true);
}

describe("Mutation invalidate matrix (§7.11)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("POST /api/events invalidates QK.session and QK.event(newId)", async () => {
    const spy = await runMutation(["useCreateEvent", "useCreateEventMutation"], [], { name: "大阪旅行" });

    await waitFor(() => expectInvalidated(spy, QK.session));
    expectInvalidated(spy, QK.event(eventId));
  });

  it("POST /api/events/:id/join invalidates QK.event(id), QK.members(id), QK.session", async () => {
    const spy = await runMutation(["useJoinEvent", "useJoinEventMutation"], [eventId], undefined);

    await waitFor(() => expectInvalidated(spy, QK.event(eventId)));
    expectInvalidated(spy, QK.members(eventId));
    expectInvalidated(spy, QK.session);
  });

  it("POST /api/events/:id/schedules invalidates QK.schedules(eventId) and QK.progress(eventId)", async () => {
    const spy = await runMutation(["useCreateSchedule", "useCreateScheduleMutation"], [eventId], { name: "東京駅集合", startAt: "2026-06-01T01:00:00.000Z", endAt: "2026-06-01T01:30:00.000Z", location: null });

    await waitFor(() => expectInvalidated(spy, QK.schedules(eventId)));
    expectInvalidated(spy, QK.progress(eventId));
  });

  it("PATCH /api/schedules/:sid invalidates QK.schedule(sid), QK.schedules(eventId), QK.progress(eventId)", async () => {
    const spy = await runMutation(["useUpdateSchedule", "usePatchSchedule", "useUpdateScheduleMutation"], [scheduleId, eventId], { name: "東京駅集合" });

    await waitFor(() => expectInvalidated(spy, QK.schedule(scheduleId)));
    expectInvalidated(spy, QK.schedules(eventId));
    expectInvalidated(spy, QK.progress(eventId));
  });

  it("DELETE /api/schedules/:sid invalidates QK.schedule(sid), QK.schedules(eventId), QK.progress(eventId)", async () => {
    const spy = await runMutation(["useDeleteSchedule", "useDeleteScheduleMutation"], [scheduleId, eventId], undefined);

    await waitFor(() => expectInvalidated(spy, QK.schedule(scheduleId)));
    expectInvalidated(spy, QK.schedules(eventId));
    expectInvalidated(spy, QK.progress(eventId));
  });

  it("POST /api/schedules/:sid/complete invalidates QK.schedule(sid), QK.schedules(eventId), QK.progress(eventId)", async () => {
    const spy = await runMutation(["useCompleteSchedule", "useCompleteScheduleMutation"], [scheduleId, eventId], undefined);

    await waitFor(() => expectInvalidated(spy, QK.schedule(scheduleId)));
    expectInvalidated(spy, QK.schedules(eventId));
    expectInvalidated(spy, QK.progress(eventId));
  });

  it("POST /api/schedules/:sid/features invalidates QK.schedule(sid) and QK.progress(eventId)", async () => {
    const spy = await runMutation(["useCreateFeature", "useCreateFeatureMutation"], [scheduleId, eventId], { kind: "meetup", config: { kind: "meetup", location: { inherit: true }, checkInEnabled: true } });

    await waitFor(() => expectInvalidated(spy, QK.schedule(scheduleId)));
    expectInvalidated(spy, QK.progress(eventId));
  });

  it("PATCH /api/features/:fid invalidates QK.feature(fid), QK.schedule(sid), QK.progress(eventId)", async () => {
    const spy = await runMutation(["useUpdateFeature", "usePatchFeature", "useUpdateFeatureMutation"], [featureId, scheduleId, eventId], { position: 1 });

    await waitFor(() => expectInvalidated(spy, QK.feature(featureId)));
    expectInvalidated(spy, QK.schedule(scheduleId));
    expectInvalidated(spy, QK.progress(eventId));
  });

  it("DELETE /api/features/:fid invalidates QK.feature(fid), QK.schedule(sid), QK.progress(eventId)", async () => {
    const spy = await runMutation(["useDeleteFeature", "useDeleteFeatureMutation"], [featureId, scheduleId, eventId], undefined);

    await waitFor(() => expectInvalidated(spy, QK.feature(featureId)));
    expectInvalidated(spy, QK.schedule(scheduleId));
    expectInvalidated(spy, QK.progress(eventId));
  });

  it("PUT /api/features/:fid/state invalidates QK.feature(fid) and QK.progress(eventId)", async () => {
    const spy = await runMutation(["useUpdateFeatureState", "usePutFeatureState", "useUpdateFeatureStateMutation"], [featureId, eventId], { state: { kind: "meetup", checkedInAt: 1760000000000 } });

    await waitFor(() => expectInvalidated(spy, QK.feature(featureId)));
    expectInvalidated(spy, QK.progress(eventId));
  });

  it("POST /api/events/:id/announcements invalidates QK.announcements(id) and QK.progress(id)", async () => {
    const spy = await runMutation(["useCreateAnnouncement", "useCreateAnnouncementMutation"], [eventId], { body: "明日だよー" });

    await waitFor(() => expectInvalidated(spy, QK.announcements(eventId)));
    expectInvalidated(spy, QK.progress(eventId));
  });

  it("POST /api/events/:id/chat invalidates QK.eventChat(id)", async () => {
    const spy = await runMutation(["useSendEventChatMessage", "useCreateEventChatMessage", "useSendEventChat", "usePostEventChat"], [eventId], { body: "hi" });

    await waitFor(() => expectInvalidated(spy, QK.eventChat(eventId)));
  });

  it("POST /api/schedules/:sid/chat invalidates QK.scheduleChat(sid)", async () => {
    const spy = await runMutation(["useSendScheduleChatMessage", "useCreateScheduleChatMessage", "useSendScheduleChat", "usePostScheduleChat"], [scheduleId], { body: "hi" });

    await waitFor(() => expectInvalidated(spy, QK.scheduleChat(scheduleId)));
  });
});
