import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderApp } from "@/tests/helpers/render";
import { installFetchMock } from "./test-fixtures";

describe("landing UI (§12.1)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("OMATASE タイトルと CTA を表示し、クリックで /create に遷移する", async () => {
    installFetchMock({ session: null });
    const user = userEvent.setup();

    const { router } = await renderApp("/");

    expect(await screen.findByText("OMATASE")).toBeInTheDocument();
    const cta = screen.getByRole("link", { name: /\+ イベントを作る|イベントを作る/ });
    expect(cta).toBeInTheDocument();

    await user.click(cta);

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/create");
    });
  });
});
