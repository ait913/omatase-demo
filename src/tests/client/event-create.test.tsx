import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderApp } from "@/tests/helpers/render";
import { installFetchMock } from "./test-fixtures";

describe("event create UI (§12.2)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("/create はイベント名・表示名 input と「つぎへ」ボタンを表示する", async () => {
    installFetchMock({ session: null });

    await renderApp("/create");

    expect(await screen.findByRole("heading", { name: "イベントを作る" })).toBeInTheDocument();
    expect(screen.getByLabelText("イベント名")).toBeInTheDocument();
    expect(screen.getByText("あなたの表示名")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /つぎへ/ })).toBeInTheDocument();
  });
});
