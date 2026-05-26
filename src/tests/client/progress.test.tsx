import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderApp } from "@/tests/helpers/render";
import { eventId, installFetchMock, makeProgress } from "./test-fixtures";

describe("progress UI (§12.9)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("current schedule の名前・時刻、prev/next ナビ、「完了」ボタンを表示する", async () => {
    installFetchMock({ progress: makeProgress() });

    await renderApp(`/e/${eventId}/progress`);

    expect(await screen.findByText("東京駅集合")).toBeInTheDocument();
    expect(screen.getByText(/10:00/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /前へ/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "完了" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /次/ })).toBeInTheDocument();
  });
});
