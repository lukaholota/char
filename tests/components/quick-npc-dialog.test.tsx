// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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

const { QuickNpcDialog } = await import("@/components/games/QuickNpcDialog");

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
