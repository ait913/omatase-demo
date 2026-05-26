import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { QK } from "@/client/api/queryKeys";
import { renderApp } from "@/tests/helpers/render";
import { eventId, installFetchMock, makeProgress, makeSchedule, scheduleId, setVisibilityState } from "./test-fixtures";

function queryOptions(queryClient: QueryClient, queryKey: readonly unknown[]) {
  const query = queryClient.getQueryCache().find({ queryKey });
  if (!query) throw new Error(`query not registered: ${JSON.stringify(queryKey)}`);
  return query.options;
}

function resolveInterval(options: ReturnType<typeof queryOptions>, data: unknown) {
  if (typeof options.refetchInterval === "function") {
    return options.refetchInterval({ state: { data } } as never);
  }
  return options.refetchInterval;
}

function expectPolling(options: ReturnType<typeof queryOptions>, interval: number) {
  expect(options.refetchIntervalInBackground).toBe(false);
  expect(options.staleTime).toBe(0);
  setVisibilityState("visible");
  expect(resolveInterval(options, makeProgress())).toBe(interval);
  setVisibilityState("hidden");
  expect(resolveInterval(options, makeProgress())).toBe(false);
}

describe("polling intervals (§7.10)", () => {
  it("進行ページ progress は 10000ms、visibility hidden で false、background polling 無効", async () => {
    installFetchMock({ progress: makeProgress() });

    const { queryClient } = await renderApp(`/e/${eventId}/progress`);

    expectPolling(queryOptions(queryClient, QK.progress(eventId)), 10000);
  });

  it("schedule chat は 2000ms、completed で false、background polling 無効", async () => {
    installFetchMock({ progress: makeProgress({ current: { ...makeSchedule(), features: [] } }) });

    const { queryClient } = await renderApp(`/e/${eventId}/progress`);
    const options = queryOptions(queryClient, QK.scheduleChat(scheduleId));

    expect(options.refetchIntervalInBackground).toBe(false);
    expect(options.staleTime).toBe(0);
    setVisibilityState("visible");
    expect(resolveInterval(options, { schedule: makeSchedule({ status: "active" }) })).toBe(2000);
    expect(resolveInterval(options, { schedule: makeSchedule({ status: "completed" }) })).toBe(false);
    setVisibilityState("hidden");
    expect(resolveInterval(options, { schedule: makeSchedule({ status: "active" }) })).toBe(false);
  });

  it("event chat は 5000ms、visibility hidden で false、background polling 無効", async () => {
    installFetchMock({ viewerIsHost: true, progress: makeProgress({ viewerIsHost: true }) });

    const { queryClient } = await renderApp(`/e/${eventId}`);

    expectPolling(queryOptions(queryClient, QK.eventChat(eventId)), 5000);
  });

  it("schedules は 30000ms、visibility hidden で false、background polling 無効", async () => {
    installFetchMock({ viewerIsHost: true, progress: makeProgress({ viewerIsHost: true }) });

    const { queryClient } = await renderApp(`/e/${eventId}`);

    expectPolling(queryOptions(queryClient, QK.schedules(eventId)), 30000);
  });

  it("members は 30000ms、visibility hidden で false、background polling 無効", async () => {
    installFetchMock({ viewerIsHost: true, progress: makeProgress({ viewerIsHost: true }) });

    const { queryClient } = await renderApp(`/e/${eventId}`);

    expectPolling(queryOptions(queryClient, QK.members(eventId)), 30000);
  });

  it("announcements は 30000ms、visibility hidden で false、background polling 無効", async () => {
    installFetchMock({ viewerIsHost: true, progress: makeProgress({ viewerIsHost: true }) });

    const { queryClient } = await renderApp(`/e/${eventId}`);

    expectPolling(queryOptions(queryClient, QK.announcements(eventId)), 30000);
  });
});
