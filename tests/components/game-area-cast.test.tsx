// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { GameRollEventView } from "@/server/db/game-roll-events";
import type { GameSessionView } from "@/server/db/game-sessions";

vi.hoisted(() => {
  const items = new Map<string, string>();
  const storage = { getItem: (key: string) => items.get(key) ?? null, setItem: (key: string, value: string) => void items.set(key, value), removeItem: (key: string) => void items.delete(key) };
  Object.defineProperty(globalThis, "localStorage", { value: storage, configurable: true, writable: true });
  Object.defineProperty(window, "localStorage", { value: storage, configurable: true, writable: true });
});
const mocks = vi.hoisted(() => ({ listAreaSpellsAction: vi.fn(), undoSaveDamageAction: vi.fn() }));
vi.mock("@/lib/actions/game-area-spells", () => ({ listAreaSpellsAction: mocks.listAreaSpellsAction }));
vi.mock("@/lib/actions/game-sessions", () => ({ undoSaveDamageAction: mocks.undoSaveDamageAction, undoRollDamageAction: vi.fn() }));
vi.mock("@/lib/monitoring/game-analytics", () => ({ captureGameEvent: vi.fn() }));

import { AreaPanel } from "@/components/games/AreaToolPanel";
import { GameRollEntry } from "@/components/games/GameRollEntry";
import { useRoomTabStore } from "@/components/games/room-tabs";
import { castOnArea, registerReadyMapBoard, startAreaCast, useAreaCastStore } from "@/lib/components/game/area-cast";
import { openRoomRoll } from "@/lib/components/game/open-room-roll";
import { resetLiveSession, useGameSessionLiveStore } from "@/lib/components/game/game-session-live-store";
import { useDiceUIStore, type DiceRollContext } from "@/lib/stores/diceUIStore";
import { useGameSessionStore } from "@/lib/stores/gameSessionStore";

const fireball: DiceRollContext = {
  title: "Вогняна куля",
  actions: [{ key: "damage", label: "Шкода", count: 8, sides: 6, bonus: 0, isD20: false }],
  targetSave: { abilityName: "Спритності", dc: 15, spell: { engName: "Fireball", level: 3, ruleset: "RULES_2014" } },
};
const fireballArea = { name: "Вогняна куля", engName: "Fireball", shape: "circle", sizeFeet: 20, isKnown: true };

function enterRoom() {
  useGameSessionStore.setState({ active: { id: 1, name: "Кімната" }, visibilityBySession: {}, targetCreatureBySession: {} });
  resetLiveSession(1);
  useGameSessionLiveStore.setState({ view: { id: 1, myRole: "PLAYER", members: [], creatures: [] } as unknown as GameSessionView });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.listAreaSpellsAction.mockResolvedValue({ ok: true, value: { ruleset: "RULES_2014", spells: [fireballArea] } });
  useRoomTabStore.setState({ tab: "hero", sideTab: "hero", isSideFolded: false });
});
afterEach(() => {
  cleanup();
  useDiceUIStore.getState().close();
  useAreaCastStore.setState({ cast: null });
  useGameSessionStore.setState({ active: null, visibilityBySession: {}, targetCreatureBySession: {} });
  resetLiveSession(null);
});

describe("каст заклинання з областю", () => {
  it("без мапи кімнати кидок відкривається одразу, як раніше", async () => {
    enterRoom();
    openRoomRoll(fireball);
    expect(useDiceUIStore.getState().rollContext).toBe(fireball);
    expect(useAreaCastStore.getState().cast).toBeNull();
  });

  it("з мапою перемикає на неї й чекає зону, а «Накласти» кидає шкоду для істот у зоні", async () => {
    enterRoom();
    const unregister = registerReadyMapBoard(1, true);
    expect(await startAreaCast(fireball)).toBe(true);
    expect(useDiceUIStore.getState().isOpen).toBe(false);
    expect(useRoomTabStore.getState().tab).toBe("map");
    const cast = useAreaCastStore.getState().cast!;
    expect(cast).toMatchObject({ sessionId: 1, area: { name: "Вогняна куля", shape: "circle", sizeFeet: 20 }, isPlaced: false });

    castOnArea(cast, { creatureIds: [3, 4], persIds: [7] });
    expect(useAreaCastStore.getState().cast).toBeNull();
    expect(useDiceUIStore.getState().rollContext).toMatchObject({ title: "Вогняна куля", areaTargets: { creatureIds: [3, 4], persIds: [7] }, autoRollKey: "damage" });
    unregister();
  });

  it("мапа без сітки зони не ставить: кидок піде звичайним прицілюванням по токену", async () => {
    enterRoom();
    const unregister = registerReadyMapBoard(1, false);
    expect(await startAreaCast(fireball)).toBe(false);
    unregister();
  });

  it("заклинання без області чи без ряткидка не просить зону", async () => {
    enterRoom();
    const unregister = registerReadyMapBoard(1, true);
    const mindSpike = { ...fireball, targetSave: { ...fireball.targetSave!, spell: { engName: "Mind Spike", level: 2, ruleset: "RULES_2014" as const } } };
    expect(await startAreaCast(mindSpike)).toBe(false);
    expect(await startAreaCast({ ...fireball, targetSave: undefined })).toBe(false);
    expect(useAreaCastStore.getState().cast).toBeNull();
    unregister();
  });

  it("подих зі статблоку бере зону з дії, без списку заклинань", async () => {
    enterRoom();
    const unregister = registerReadyMapBoard(1, true);
    const breath = { ...fireball, title: "Червоний дракон", isCreatureRoll: true, targetSave: { abilityName: "Спритності", dc: 21, effect: { ability: "DEX" as const, damageType: "fire" as const, isHalfOnSave: true } }, targetArea: { label: "Вогняний подих", shape: "cone" as const, sizeFeet: 60 } };
    expect(await startAreaCast(breath)).toBe(true);
    expect(useAreaCastStore.getState().cast?.area).toEqual({ name: "Вогняний подих", shape: "cone", sizeFeet: 60 });
    expect(mocks.listAreaSpellsAction).not.toHaveBeenCalled();
    unregister();
  });

  it("панель зони зачіпає всіх у зоні, і своїх, а дотик по імені виключає ціль", () => {
    const onCast = vi.fn();
    const onToggle = vi.fn();
    const at = { x: 0.5, y: 0.5 };
    const targets = [{ key: "c3", name: "Гоблін 1", position: at, cells: 1, creatureId: 3 }, { key: "p7", name: "Тарн", position: at, cells: 1, persId: 7 }];
    const draft = { id: null, canEdit: true, placement: { shape: "circle" as const, sizeFeet: 20, label: "Вогняна куля", origin: { x: 0.5, y: 0.5 }, angle: 0 } };
    render(
      <AreaPanel sessionId={1} hasGrid isGm={false} draft={draft} targets={targets} savedCount={0} onStart={vi.fn()} onChange={vi.fn()} onShare={vi.fn()} onRemove={vi.fn()} onDone={vi.fn()} onClose={vi.fn()} cast={{ save: "ряткидок Спритності СК 15", skippedKeys: ["c3"], onToggle, onCast }} />,
    );
    expect(screen.getByText(/і вороги, і свої — свій ряткидок Спритності СК 15/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Показати всім" })).toBeNull();
    fireEvent.click(screen.getByText("Гоблін 1"));
    expect(onToggle).toHaveBeenCalledWith("c3");
    fireEvent.click(screen.getByRole("button", { name: "Накласти (1)" }));
    expect(onCast).toHaveBeenCalledOnce();
  });
});

describe("ряткидки цілей у журналі", () => {
  const roll = { d20Mode: null, modeSources: [], groups: [{ sides: 6, values: [6, 6, 6] }], extra: [], bonus: 0, total: 18, check: null };
  const gmRow = { d20: [12], mode: "NORMAL" as const, bonus: 2, dice: [], total: 14, isAutoFail: false, defense: "resistant" as const, hitPointsBefore: 20, hitPointsAfter: 16, canUndo: true, isUndone: false };
  const event: GameRollEventView = {
    seq: 9, authorUserId: 7, authorName: "Оксана", persName: "Тарн", avatarUrl: null, source: "CHARACTER", visibility: "PUBLIC", label: "Вогняна куля · Шкода", roll, total: 18,
    rolledAt: "2026-11-07T10:00:00.000Z", createdAt: "2026-11-07T10:00:00.000Z", target: null,
    saves: { ability: "DEX", dc: 15, damageType: "fire", rows: [{ name: "Гоблін 1", persId: null, isSaved: false, damage: 18, gm: null }, { name: "Огр", persId: null, isSaved: true, damage: 4, gm: null }] },
  };

  it("гравець бачить успіх чи провал і шкоду кожної цілі, без кидка й хітів", () => {
    render(<ol><GameRollEntry event={event} isMine isNew={false} /></ol>);
    const rows = screen.getAllByRole("listitem").filter((item) => item.closest("ul"));
    expect(rows.map((row) => row.textContent)).toEqual(["→ Гоблін 1провал−18", "→ Огруспіх−4"]);
    expect(screen.queryByText(/к20/)).toBeNull();
    expect(screen.queryByRole("button", { name: /Скасувати/ })).toBeNull();
  });

  it("майстер бачить кидок, опір і хіти та скасовує шкоду одного рядка", async () => {
    enterRoom();
    const forGm = { ...event, saves: { ...event.saves!, rows: [{ ...event.saves!.rows[0], gm: { ...gmRow, defense: null, hitPointsAfter: 2 } }, { ...event.saves!.rows[1], gm: gmRow }] } };
    mocks.undoSaveDamageAction.mockResolvedValue({ ok: true, value: forGm });
    render(<ol><GameRollEntry event={forGm} isMine={false} isNew={false} /></ol>);
    expect(screen.getByText("к20 12 +2 = 14 · опір · хіти 20 → 16")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Скасувати шкоду: Огр" }));
    await waitFor(() => expect(mocks.undoSaveDamageAction).toHaveBeenCalledWith(1, 9, 1));
  });

  it("гравець, чий герой у зоні, знімає свою шкоду з листа один раз", () => {
    enterRoom();
    useGameSessionLiveStore.setState({ view: { id: 1, myRole: "PLAYER", myPersId: 7, myPersIds: [7], members: [], creatures: [] } as unknown as GameSessionView });
    const withHero = { ...event, saves: { ...event.saves!, rows: [...event.saves!.rows, { name: "Тарн", persId: 7, isSaved: false, damage: 18, gm: null }, { name: "Віра", persId: 8, isSaved: false, damage: 18, gm: null }] } };
    render(<ol><GameRollEntry event={withHero} isMine={false} isNew={false} /></ol>);
    const buttons = screen.getAllByRole("button", { name: "Зняти 18 хітів з листа" });
    expect(buttons).toHaveLength(1);
    fireEvent.click(buttons[0]);
    expect(screen.getByRole("button", { name: "Знято 18 з листа" })).toHaveProperty("disabled", true);
  });
});
