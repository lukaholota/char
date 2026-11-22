// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  addCreatures: vi.fn(),
  listImages: vi.fn(),
  refresh: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
  capture: vi.fn(),
}));

vi.mock("@/lib/actions/game-sessions", () => ({ addMapCreaturesAction: mocks.addCreatures }));
vi.mock("@/lib/actions/game-token-images", () => ({ listTokenImagesAction: mocks.listImages, uploadTokenImageAction: vi.fn(), setMapCreatureImageAction: vi.fn(), deleteTokenImageAction: vi.fn() }));
vi.mock("@/components/no-ai/NoAiModeProvider", () => ({ useModeRouter: () => ({ refresh: mocks.refresh }), useNoAiMode: () => ({ enabled: false }) }));
vi.mock("@/lib/monitoring/game-analytics", () => ({ captureGameEvent: mocks.capture }));
vi.mock("sonner", () => ({ toast: { error: mocks.toastError, success: mocks.toastSuccess } }));
vi.mock("@/components/no-ai/ContentImage", () => ({ ContentImage: ({ src }: { src: string }) => <img data-testid="npc-preview" src={src} alt="" /> }));

const { QuickNpcDialog } = await import("@/components/games/QuickNpcDialog");
const { STATBLOCK_PICKED_MESSAGE } = await import("@/components/bestiary/RoomCreatureAddPanel");

const postMessageFrom = (origin: string, data: unknown) => act(() => void window.dispatchEvent(new MessageEvent("message", { data, origin })));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.listImages.mockResolvedValue({ ok: true, value: ["token-images/1/face"] });
});
afterEach(cleanup);

const openDialog = () => {
  render(<QuickNpcDialog sessionId={5} />);
  fireEvent.click(screen.getByRole("button", { name: "НІП" }));
};

describe("швидкий НІП", () => {
  it("додає простолюдина-союзника з іменем і портретом без бестіарію й закривається", async () => {
    mocks.addCreatures.mockResolvedValue({ ok: true, value: { name: "Корчмар" } });
    openDialog();
    expect(screen.getByRole("button", { name: "Союзник" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByTestId("npc-preview").getAttribute("src")).toBe("/images/creatures/2014/xmm-commoner-c196b7bf41.webp");

    fireEvent.change(screen.getByLabelText("Імʼя для гравців"), { target: { value: "Корчмар" } });
    fireEvent.click(screen.getByRole("button", { name: "Обрати портрет" }));
    fireEvent.click(await screen.findByRole("button", { name: "Поставити зображення 1" }));
    await waitFor(() => expect(screen.queryByRole("button", { name: "Змінити портрет" })).not.toBeNull());
    fireEvent.click(screen.getByRole("button", { name: "Додати НІПа" }));

    await waitFor(() => expect(mocks.toastSuccess).toHaveBeenCalledWith("Корчмар — у розділі «Поза мапою»"));
    expect(mocks.addCreatures).toHaveBeenCalledWith(5, { creatureKey: "commoner", ruleset: "RULES_2014", count: 1, isAlly: true, customName: "Корчмар", imageKey: "token-images/1/face" });
    expect(mocks.refresh).toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("статблок обирається в бестіарії, зокрема хоумбрю 2024; імʼя й бік не губляться, чужі повідомлення — ні до чого", async () => {
    mocks.addCreatures.mockResolvedValue({ ok: true, value: { name: "Корчмар" } });
    openDialog();
    fireEvent.change(screen.getByLabelText("Імʼя для гравців"), { target: { value: "Корчмар" } });
    fireEvent.click(screen.getByRole("button", { name: "Ворог" }));
    fireEvent.click(screen.getByRole("button", { name: /Статблок Простолюдин/ }));
    expect(screen.getByTitle("Бестіарій").getAttribute("src")).toBe("/bestiary?room=5&pick=1");

    const picked = { type: STATBLOCK_PICKED_MESSAGE, key: "hb-innkeeper", name: "Корчмар-ветеран", ruleset: "RULES_2024", imageUrl: "/api/homebrew-image/7" };
    postMessageFrom("https://evil.example", picked);
    expect(screen.getByTitle("Бестіарій")).toBeTruthy();
    postMessageFrom(window.location.origin, picked);
    expect(screen.queryByTitle("Бестіарій")).toBeNull();
    expect(screen.getByRole("button", { name: /Статблок Корчмар-ветеран/ })).toBeTruthy();
    expect(screen.getByTestId("npc-preview").getAttribute("src")).toBe("/api/homebrew-image/7");
    fireEvent.click(screen.getByRole("button", { name: "Додати НІПа" }));

    await waitFor(() => expect(mocks.addCreatures).toHaveBeenCalledWith(5, expect.objectContaining({ creatureKey: "hb-innkeeper", ruleset: "RULES_2024", isAlly: false, customName: "Корчмар" })));
    expect(mocks.capture).toHaveBeenCalledWith("game_creatures_added", { count: 1, edition: "2024" });
  });

  it("помилка сервера лишає вікно відкритим з тим самим вибором", async () => {
    mocks.addCreatures.mockResolvedValue({ ok: false, error: "Спершу додайте мапу" });
    openDialog();
    fireEvent.click(screen.getByRole("button", { name: "Ворог" }));
    fireEvent.click(screen.getByRole("button", { name: "Додати НІПа" }));

    await waitFor(() => expect(mocks.toastError).toHaveBeenCalledWith("Спершу додайте мапу"));
    expect(mocks.addCreatures).toHaveBeenCalledWith(5, expect.objectContaining({ isAlly: false, customName: "", imageKey: null }));
    expect(screen.queryByRole("dialog")).not.toBeNull();
    expect(screen.getByRole("button", { name: "Ворог" }).getAttribute("aria-pressed")).toBe("true");
  });
});
