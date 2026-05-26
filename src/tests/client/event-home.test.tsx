import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderApp } from "@/tests/helpers/render";
import { eventId, installFetchMock, makeProgress } from "./test-fixtures";

describe("event home UI (§12.4, §12.5)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("イベント名とアナウンス・スケジュール・メンバー・チャットの主要セクションを表示する", async () => {
    installFetchMock({ viewerIsHost: true, viewerIsMember: true, progress: makeProgress({ viewerIsHost: true }) });

    await renderApp(`/e/${eventId}`);

    expect(await screen.findByText("大阪旅行")).toBeInTheDocument();
    expect(screen.getByText("アナウンス")).toBeInTheDocument();
    expect(screen.getByText("スケジュール")).toBeInTheDocument();
    expect(screen.getByText("メンバー")).toBeInTheDocument();
    expect(screen.getByText("チャット")).toBeInTheDocument();
  });
});
