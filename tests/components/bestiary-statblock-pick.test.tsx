// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ add: vi.fn() }));

vi.mock("@/lib/actions/game-sessions", () => ({ addMapCreaturesAction: mocks.add }));
vi.mock("@/components/no-ai/NoAiModeProvider", () => ({ useModeRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/components/no-ai/ContentImage", () => ({ ContentImage: () => null }));
vi.mock("@/components/games/CreatureImageSection", () => ({ TokenImageLibrary: () => null }));
vi.mock("@/lib/monitoring/game-analytics", () => ({ captureGameEvent: vi.fn() }));

const { RoomCreatureAddPanel, STATBLOCK_PICKED_MESSAGE } = await import("@/components/bestiary/RoomCreatureAddPanel");

afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", "/");
});

describe("бестіарій у режимі вибору статблока НІПа", () => {
  it("бестіарій у режимі вибору надсилає ключ, назву, редакцію й картинку замість додавання на мапу", async () => {
    window.history.replaceState(null, "", "/bestiary?room=5&pick=1");
    const post = vi.spyOn(window, "postMessage");
    render(<RoomCreatureAddPanel creature={{ key: "hb-innkeeper", name: "Корчмар", imageUrl: "/api/homebrew-image/7" } as never} ruleset="RULES_2024" />);

    fireEvent.click(await screen.findByRole("button", { name: "Обрати для НІПа" }));

    expect(post).toHaveBeenCalledWith({ type: STATBLOCK_PICKED_MESSAGE, key: "hb-innkeeper", name: "Корчмар", ruleset: "RULES_2024", imageUrl: "/api/homebrew-image/7" }, window.location.origin);
    expect(screen.queryByText("На мапу кампанії")).toBeNull();
  });
});
