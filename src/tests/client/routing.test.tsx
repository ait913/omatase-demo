import { screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderApp } from "@/tests/helpers/render";
import { installFetchMock, makeProgress, eventId } from "./test-fixtures";

describe("client routing (§7.9)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("7.9.1: 未ログインで /e/eid を開くと join にリダイレクトする", async () => {
    installFetchMock({ session: null, viewerIsMember: false });

    const { router } = await renderApp(`/e/${eventId}`);

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(`/e/${eventId}/join`);
    });
  });

  it("7.9.2: ログイン済み非 member で /e/eid を開くと join にリダイレクトする", async () => {
    installFetchMock({ viewerIsMember: false });

    const { router } = await renderApp(`/e/${eventId}`);

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(`/e/${eventId}/join`);
    });
  });

  it("7.9.3: ログイン済み member non-host で active schedule があると progress にリダイレクトする", async () => {
    installFetchMock({ viewerIsHost: false, viewerIsMember: true, progress: makeProgress({ viewerIsHost: false }) });

    const { router } = await renderApp(`/e/${eventId}`);

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(`/e/${eventId}/progress`);
    });
  });

  it("7.9.4: host は active schedule があってもイベントホームに留まる", async () => {
    installFetchMock({ viewerIsHost: true, viewerIsMember: true, progress: makeProgress({ viewerIsHost: true }) });

    const { router } = await renderApp(`/e/${eventId}`);

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(`/e/${eventId}`);
    });
    expect(await screen.findByText("大阪旅行")).toBeInTheDocument();
  });

  it("7.9.5: progress で active schedule が無いと開始前の空状態を表示する", async () => {
    installFetchMock({ progress: makeProgress({ current: null, next: { id: "next", name: "東京駅集合", startAt: "2026-06-01T10:00:00.000Z", endAt: "2026-06-01T10:30:00.000Z", status: "upcoming", position: 0, eventId, location: null, memo: null, members: [], featureSummaries: [] } }) });

    await renderApp(`/e/${eventId}/progress`);

    expect(await screen.findByText(/まだ始まっていません|おつかれさまでした/)).toBeInTheDocument();
  });

  it("7.9.6: 未ログインで join を開くと名前入力フォームを表示する", async () => {
    installFetchMock({ session: null, viewerIsMember: false });

    const { router } = await renderApp(`/e/${eventId}/join`);

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(`/e/${eventId}/join`);
    });
    expect(await screen.findByText("あなたを招待中")).toBeInTheDocument();
    expect(screen.getByLabelText("あなたの表示名")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "参加する" })).toBeInTheDocument();
  });
});
