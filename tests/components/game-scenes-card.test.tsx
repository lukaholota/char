// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { GameSessionView } from "@/server/db/game-sessions";
import type { LibraryMap } from "@/lib/refs/map-library";

const mocks = vi.hoisted(() => ({
  activateGameSceneAction: vi.fn(),
  openGameSceneAction: vi.fn(),
  createGameSceneAction: vi.fn(),
  renameGameSceneAction: vi.fn(),
  replaceGameSceneMapAction: vi.fn(),
  deleteGameSceneAction: vi.fn(),
  listMapLibraryAction: vi.fn(),
  refresh: vi.fn(),
  toastError: vi.fn(),
}));
vi.mock("@/lib/actions/game-sessions", () => ({
  activateGameSceneAction: mocks.activateGameSceneAction,
  openGameSceneAction: mocks.openGameSceneAction,
  createGameSceneAction: mocks.createGameSceneAction,
  renameGameSceneAction: mocks.renameGameSceneAction,
  replaceGameSceneMapAction: mocks.replaceGameSceneMapAction,
  deleteGameSceneAction: mocks.deleteGameSceneAction,
  listMapLibraryAction: mocks.listMapLibraryAction,
}));
vi.mock("@/components/no-ai/NoAiModeProvider", () => ({ useModeRouter: () => ({ refresh: mocks.refresh }), useNoAiMode: () => ({ enabled: false }) }));
vi.mock("@/lib/monitoring/game-analytics", () => ({ captureGameEvent: vi.fn() }));
vi.mock("sonner", () => ({ toast: { error: mocks.toastError } }));

import { GameScenesCard } from "@/components/games/GameScenesCard";
import { ConfirmDialogHost } from "@/components/ui/confirm-dialog";

const forest: LibraryMap = { slug: "forest", name: "Ліс", originalName: "Forest", pack: "dndavid", key: "library/maps/forest", width: 100, height: 80, grid: null };
const castle: LibraryMap = { slug: "castle", name: "Замок", originalName: "Castle", pack: "theros", key: "library/maps/castle", width: 100, height: 80, grid: null };

beforeEach(() => {
  vi.clearAllMocks();
  for (const action of [mocks.activateGameSceneAction, mocks.openGameSceneAction, mocks.createGameSceneAction, mocks.deleteGameSceneAction]) action.mockResolvedValue({ ok: true, value: null });
  mocks.listMapLibraryAction.mockResolvedValue({ ok: true, value: [forest, castle] });
});
afterEach(cleanup);

function buildView(overrides: Partial<GameSessionView> = {}): GameSessionView {
  return {
    id: 7, name: "Печера", isArchived: false, myUserId: 1, myRole: "GM", myPersId: null, myPersIds: [], inviteToken: null, mapImageUrl: null,
    members: [], creatures: [], creatureNameMode: "short", combat: null, grid: null, fog: null, areas: [],
    viewedSceneId: 1, activeSceneId: 1,
    scenes: [
      { id: 1, name: "Лісова дорога", hasMap: true, isActive: true },
      { id: 2, name: "Підземелля", hasMap: false, isActive: false },
    ],
    ...overrides,
  };
}

describe("сцени кімнати", () => {
  it("майстер бачить список: активну сцену позначено, відкрита має aria-current", () => {
    render(<GameScenesCard view={buildView()} />);
    expect(screen.getByText("Гравці бачать", { exact: false })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^Лісова дорога/ }).getAttribute("aria-current")).toBe("true");
    expect(screen.getByRole("button", { name: /^Підземелля/ }).getAttribute("aria-current")).toBeNull();
    expect(screen.getAllByRole("button", { name: "Показати гравцям" })).toHaveLength(1);
  });

  it("«Показати гравцям» активує сцену й оновлює кімнату; помилка показується тостом", async () => {
    render(<GameScenesCard view={buildView()} />);
    fireEvent.click(screen.getByRole("button", { name: "Показати гравцям" }));
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalled());
    expect(mocks.activateGameSceneAction).toHaveBeenCalledWith(7, 2);

    mocks.activateGameSceneAction.mockResolvedValue({ ok: false, error: "Спершу завершіть бій" });
    fireEvent.click(screen.getByRole("button", { name: "Показати гравцям" }));
    await waitFor(() => expect(mocks.toastError).toHaveBeenCalledWith("Спершу завершіть бій"));
  });

  it("клік по назві відкриває сцену для майстра", async () => {
    render(<GameScenesCard view={buildView()} />);
    fireEvent.click(screen.getByRole("button", { name: /^Підземелля/ }));
    await waitFor(() => expect(mocks.openGameSceneAction).toHaveBeenCalledWith(7, 2));
  });

  it("порожня кімната пропонує додати першу сцену, і її можна створити з бібліотеки", async () => {
    render(<GameScenesCard view={buildView({ scenes: [], viewedSceneId: null, activeSceneId: null })} />);
    fireEvent.click(screen.getByRole("button", { name: "Додайте першу сцену" }));
    fireEvent.change(screen.getByLabelText("Назва сцени"), { target: { value: "Таверна" } });
    fireEvent.click(screen.getByRole("button", { name: "Усі мапи" }));

    expect(await screen.findByText("Ліс")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Пошук мапи за назвою"), { target: { value: "castle" } });
    expect(screen.queryByText("Ліс")).toBeNull();
    fireEvent.click(screen.getByText("Замок"));

    expect((screen.getByLabelText("Назва сцени") as HTMLInputElement).value).toBe("Таверна");
    fireEvent.click(screen.getByRole("button", { name: "Створити" }));
    await waitFor(() => expect(mocks.createGameSceneAction).toHaveBeenCalled());
    const [sessionId, name, formData] = mocks.createGameSceneAction.mock.calls[0] as [number, string, FormData];
    expect([sessionId, name, formData.get("library")]).toEqual([7, "Таверна", "castle"]);
  });

  it("швидкий вибір мапи підставляє її назву, поки майстер не ввів свою, і показує обрану мапу", async () => {
    render(<GameScenesCard view={buildView({ scenes: [], viewedSceneId: null, activeSceneId: null })} />);
    fireEvent.click(screen.getByRole("button", { name: "Додайте першу сцену" }));
    const nameInput = screen.getByLabelText("Назва сцени") as HTMLInputElement;

    fireEvent.click(await screen.findByRole("button", { name: "Ліс" }));
    expect(nameInput.value).toBe("Ліс");
    expect(screen.getByRole("button", { name: "Ліс" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText("Базова мапа")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Замок" }));
    expect(nameInput.value).toBe("Замок");

    fireEvent.change(nameInput, { target: { value: "Таверна" } });
    fireEvent.click(screen.getByRole("button", { name: "Ліс" }));
    expect(nameInput.value).toBe("Таверна");

    fireEvent.click(screen.getByRole("button", { name: "Прибрати обрану мапу" }));
    expect(screen.queryByText("Базова мапа")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Замок" }));
    fireEvent.click(screen.getByRole("button", { name: "Створити" }));
    await waitFor(() => expect(mocks.createGameSceneAction).toHaveBeenCalled());
    const [, name, formData] = mocks.createGameSceneAction.mock.calls[0] as [number, string, FormData];
    expect([name, formData.get("library")]).toEqual(["Таверна", "castle"]);
  });

  it("порожня бібліотека підказує завантажити свою мапу", async () => {
    mocks.listMapLibraryAction.mockResolvedValue({ ok: true, value: [] });
    render(<GameScenesCard view={buildView({ scenes: [], viewedSceneId: null, activeSceneId: null })} />);
    fireEvent.click(screen.getByRole("button", { name: "Додайте першу сцену" }));
    fireEvent.click(screen.getByRole("button", { name: "Усі мапи" }));
    expect(await screen.findByText(/Бібліотека поки порожня/)).toBeTruthy();
  });

  it("видалення сцени питає підтвердження", async () => {
    render(<><GameScenesCard view={buildView()} /><ConfirmDialogHost /></>);
    fireEvent.click(screen.getByRole("button", { name: "Налаштування сцени «Підземелля»" }));
    fireEvent.click(screen.getByRole("button", { name: "Видалити сцену" }));
    fireEvent.click(within(await screen.findByRole("dialog", { name: "Видалити сцену «Підземелля»?" })).getByRole("button", { name: "Скасувати" }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Видалити сцену «Підземелля»?" })).toBeNull());
    expect(mocks.deleteGameSceneAction).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Видалити сцену" }));
    fireEvent.click(within(await screen.findByRole("dialog", { name: "Видалити сцену «Підземелля»?" })).getByRole("button", { name: "Видалити" }));
    await waitFor(() => expect(mocks.deleteGameSceneAction).toHaveBeenCalledWith(7, 2));
  });
});
