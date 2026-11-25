// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

vi.hoisted(() => {
  const items = new Map<string, string>();
  const storage = { getItem: (key: string) => items.get(key) ?? null, setItem: (key: string, value: string) => void items.set(key, value), removeItem: (key: string) => void items.delete(key) };
  Object.defineProperty(globalThis, "localStorage", { value: storage, configurable: true, writable: true });
  Object.defineProperty(window, "localStorage", { value: storage, configurable: true, writable: true });
});

const mocks = vi.hoisted(() => ({ listSummonSpellsAction: vi.fn(), summonMapCreatureAction: vi.fn(), refresh: vi.fn() }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("@/components/no-ai/NoAiModeProvider", () => ({ useModeRouter: () => ({ refresh: mocks.refresh }) }));
vi.mock("@/lib/actions/game-area-spells", () => ({ listSummonSpellsAction: mocks.listSummonSpellsAction }));
vi.mock("@/lib/actions/game-sessions", () => ({ summonMapCreatureAction: mocks.summonMapCreatureAction }));
import { toast } from "sonner";
import { SummonPanel } from "@/components/games/SummonPanel";
import { useRoomTabStore } from "@/components/games/room-tabs";
import { registerReadyMapBoard } from "@/lib/components/game/area-cast";
import { resetLiveSession, useGameSessionLiveStore } from "@/lib/components/game/game-session-live-store";
import { startSummonCast, useSummonCastStore } from "@/lib/components/game/summon-cast";
import { useGameSessionStore } from "@/lib/stores/gameSessionStore";
import type { GameSessionView } from "@/server/db/game-sessions";

const familiar = { engName: "Find Familiar", name: "Пошук фамільяра", isKnown: true, creatures: [{ key: "owl", name: "Сова", isChainOnly: false }, { key: "imp", name: "Імп (Бісеня)", isChainOnly: true }] };
const steed = { engName: "Find Steed", name: "Пошук скакуна", isKnown: false, creatures: [{ key: "warhorse", name: "Бойовий кінь", isChainOnly: false }] };

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  useSummonCastStore.setState({ cast: null });
  useGameSessionStore.setState({ active: null });
  resetLiveSession(null);
});

function enterRoom(myRole: "PLAYER" | "GM") {
  useGameSessionStore.setState({ active: { id: 7, name: "Кімната" } } as never);
  resetLiveSession(7);
  useGameSessionLiveStore.setState({ view: { id: 7, myRole, members: [], creatures: [] } as unknown as GameSessionView });
}

function renderPanel() {
  const onClose = vi.fn();
  render(<SummonPanel sessionId={7} findPosition={() => ({ x: 0.25, y: 0.5 })} onClose={onClose} />);
  return onClose;
}

describe("панель виклику істоти", () => {
  it("гравець обирає своє заклинання й форму: сова стає посеред видимої мапи, панель закривається", async () => {
    mocks.listSummonSpellsAction.mockResolvedValue({ ok: true, value: [familiar, steed] });
    mocks.summonMapCreatureAction.mockResolvedValue({ ok: true, value: { name: "Сова" } });
    const onClose = renderPanel();

    const spells = await screen.findByRole("list", { name: "Заклинання виклику" });
    expect(spells.textContent).toMatch(/Пошук фамільяра\s*ваше.*Пошук скакуна/);
    fireEvent.click(screen.getByRole("button", { name: /Пошук фамільяра/ }));
    expect(screen.getByRole("button", { name: /Імп.*Пакт ланцюга/ })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Сова" }));

    await vi.waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(mocks.summonMapCreatureAction).toHaveBeenCalledWith(7, { spellEngName: "Find Familiar", creatureKey: "owl", position: { x: 0.25, y: 0.5 } });
    expect(toast.success).toHaveBeenCalledWith(expect.stringContaining("Сова"));
    expect(mocks.refresh).toHaveBeenCalled();
  });

  it("відмова сервера лишає панель відкритою з поясненням, «Інше заклинання» повертає до списку", async () => {
    mocks.listSummonSpellsAction.mockResolvedValue({ ok: true, value: [steed] });
    mocks.summonMapCreatureAction.mockResolvedValue({ ok: false, error: "На мапі вже 40 істот — приберіть зайвих" });
    const onClose = renderPanel();

    fireEvent.click(await screen.findByRole("button", { name: /Пошук скакуна/ }));
    fireEvent.click(screen.getByRole("button", { name: "Бойовий кінь" }));
    await vi.waitFor(() => expect(toast.error).toHaveBeenCalledWith("На мапі вже 40 істот — приберіть зайвих"));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /Інше заклинання/ }));
    expect(screen.getByRole("list", { name: "Заклинання виклику" })).toBeTruthy();
  });

  it("список не завантажився — каже про це, а не показує порожнечу", async () => {
    mocks.listSummonSpellsAction.mockResolvedValue({ ok: false, error: "not_found" });
    renderPanel();
    expect(await screen.findByText(/Не вдалося завантажити заклинання/)).toBeTruthy();
  });

  it("каст фамільяра з листа гравця відкриває мапу з цим заклинанням: лишається обрати форму", async () => {
    mocks.listSummonSpellsAction.mockResolvedValue({ ok: true, value: [familiar, steed] });
    enterRoom("PLAYER");
    const unregister = registerReadyMapBoard(7, false);
    useRoomTabStore.setState({ tab: "hero" });
    expect(startSummonCast("Fireball")).toBe(false);
    expect(startSummonCast("Find Familiar")).toBe(true);
    expect(useRoomTabStore.getState().tab).toBe("map");

    renderPanel();
    expect(await screen.findByRole("button", { name: "Сова" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Інше заклинання/ }));
    expect(screen.getByRole("list", { name: "Заклинання виклику" })).toBeTruthy();
    expect(useSummonCastStore.getState().cast).toBeNull();
    unregister();
  });

  it("майстрові й поза мапою каст нічого не відкриває", () => {
    enterRoom("GM");
    const unregister = registerReadyMapBoard(7, true);
    expect(startSummonCast("Find Familiar")).toBe(false);
    unregister();
    enterRoom("PLAYER");
    expect(startSummonCast("Find Familiar")).toBe(false);
  });
});
