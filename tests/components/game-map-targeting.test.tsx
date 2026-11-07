// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { GameSessionView } from "@/server/db/game-sessions";

vi.hoisted(() => {
  const items = new Map<string, string>();
  const storage = { getItem: (key: string) => items.get(key) ?? null, setItem: (key: string, value: string) => void items.set(key, value), removeItem: (key: string) => void items.delete(key) };
  Object.defineProperty(globalThis, "localStorage", { value: storage, configurable: true, writable: true });
  Object.defineProperty(window, "localStorage", { value: storage, configurable: true, writable: true });
});
const mocks = vi.hoisted(() => ({ blessRoomTargetsAction: vi.fn() }));
vi.mock("@/lib/actions/game-area-spells", () => ({ listAreaSpellsAction: vi.fn() }));
vi.mock("@/lib/actions/game-sessions", () => ({ blessRoomTargetsAction: mocks.blessRoomTargetsAction }));

import { describeMapTask, MapTargetingPanel } from "@/components/games/MapTargeting";
import { useRoomTabStore } from "@/components/games/room-tabs";
import { registerReadyMapBoard } from "@/lib/components/game/area-cast";
import { resetLiveSession, useGameSessionLiveStore } from "@/lib/components/game/game-session-live-store";
import { buildTargetRolls, confirmBlessing, confirmMapTargets, pickMapTarget, startBlessTargeting, startMapTargeting, useMapTargetingStore } from "@/lib/components/game/map-targeting";
import { useDiceUIStore, type DiceRollContext } from "@/lib/stores/diceUIStore";
import { useGameSessionStore } from "@/lib/stores/gameSessionStore";

const view = {
  id: 1, myRole: "GM", myPersId: null,
  members: [{ persId: 5, persName: "Пивослав", name: "Оксана" }],
  creatures: [{ id: 3, label: "Гоблін 1" }, { id: 4, label: "Огр" }],
} as unknown as GameSessionView;
const missile: DiceRollContext = {
  title: "Чарівна стріла",
  subtitle: "Слот 1 рівня",
  actions: [{ key: "spell-0", label: "Шкода", count: 3, sides: 4, bonus: 3, isD20: false }],
  autoRollKey: "spell-0",
  targetPicks: { count: 3, isSummed: true },
};
const ray: DiceRollContext = {
  title: "Пекучий промінь",
  actions: [{ key: "spell-attack", label: "Атака", count: 1, sides: 20, bonus: 5, isD20: true }, { key: "spell-0", label: "Шкода", count: 2, sides: 6, bonus: 0, isD20: false }],
  autoRollKey: "spell-attack",
  targetPicks: { count: 3, isSummed: false },
};
const nameTarget = (target: { creatureId: number } | { persId: number }) => ("creatureId" in target ? `істота ${target.creatureId}` : `герой ${target.persId}`);

function enterRoom() {
  useGameSessionStore.setState({ active: { id: 1, name: "Кімната" }, visibilityBySession: {}, targetCreatureBySession: {}, targetHeroBySession: {} });
  resetLiveSession(1);
  useGameSessionLiveStore.setState({ view });
  return registerReadyMapBoard(1, false);
}

afterEach(() => {
  cleanup();
  useDiceUIStore.getState().close();
  useMapTargetingStore.setState({ targeting: null });
  useGameSessionStore.setState({ active: null, visibilityBySession: {}, targetCreatureBySession: {}, targetHeroBySession: {} });
  resetLiveSession(null);
});

describe("кидки по цілях з мапи", () => {
  it("дротики в одну ціль кидаються разом, частка кубиків і бонусу — за кількістю дротиків", () => {
    const [first, second] = buildTargetRolls({ roll: missile, maxPicks: 3, picks: [{ creatureId: 3 }, { creatureId: 4 }, { creatureId: 3 }] }, nameTarget);
    expect(first).toMatchObject({ rollTarget: { creatureId: 3 }, actions: [{ count: 2, bonus: 2 }], subtitle: "Слот 1 рівня · 2 дротики · ціль: істота 3" });
    expect(first.next).toBe(second);
    expect(second).toMatchObject({ rollTarget: { creatureId: 4 }, actions: [{ count: 1, bonus: 1 }], subtitle: "Слот 1 рівня · 1 дротик · ціль: істота 4" });
    expect(second.next).toBeUndefined();
  });

  it("кожен промінь — свій кидок атаки по своїй цілі, і по своїх теж", () => {
    const rolls = buildTargetRolls({ roll: ray, maxPicks: 3, picks: [{ creatureId: 3 }, { persId: 5 }, { creatureId: 3 }] }, nameTarget);
    expect(rolls.map((roll) => roll.rollTarget)).toEqual([{ creatureId: 3 }, { persId: 5 }, { creatureId: 3 }]);
    expect(rolls.map((roll) => roll.subtitle)).toEqual(["1 з 3 · ціль: істота 3", "2 з 3 · ціль: герой 5", "3 з 3 · ціль: істота 3"]);
    expect(rolls[0].actions).toBe(ray.actions);
  });

  it("без цілі — один кидок лише в журнал", () => {
    expect(buildTargetRolls({ roll: ray, maxPicks: 3, picks: [] }, nameTarget)).toEqual([{ ...ray, rollTarget: null }]);
  });

  it("без мапи кидок відкривається як завжди; одна закріплена ціль — без зайвого кроку", () => {
    useGameSessionStore.setState({ active: { id: 1, name: "Кімната" }, visibilityBySession: {}, targetCreatureBySession: { 1: 3 }, targetHeroBySession: {} });
    resetLiveSession(1);
    useGameSessionLiveStore.setState({ view });
    expect(startMapTargeting(ray)).toBe(false);
    const unregister = registerReadyMapBoard(1, false);
    expect(startMapTargeting({ ...ray, targetPicks: undefined })).toBe(false);
    expect(startMapTargeting({ ...ray, rollTarget: null })).toBe(false);
    unregister();
  });

  it("майстер обирає три промені, скасування нічого не кидає, «Кинути» відкриває перший промінь", () => {
    const unregister = enterRoom();
    expect(startMapTargeting(ray)).toBe(true);
    expect(useRoomTabStore.getState().tab).toBe("map");
    render(<MapTargetingPanel view={view} targeting={useMapTargetingStore.getState().targeting!} />);
    expect((screen.getByRole("button", { name: "Кинути" }) as HTMLButtonElement).disabled).toBe(true);
    cleanup();

    pickMapTarget({ creatureId: 3 });
    pickMapTarget({ persId: 5 });
    render(<MapTargetingPanel view={view} targeting={useMapTargetingStore.getState().targeting!} />);
    expect(screen.getByText("Обрано 2 з 3")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Ще 1" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Прибрати один заряд з «Пивослав»" }));
    expect(useMapTargetingStore.getState().targeting!.picks).toEqual([{ creatureId: 3 }]);
    fireEvent.click(screen.getByRole("button", { name: "Скасувати" }));
    expect(useMapTargetingStore.getState().targeting).toBeNull();
    expect(useDiceUIStore.getState().isOpen).toBe(false);

    startMapTargeting(ray);
    ["c3", "c4", "c3"].forEach((key) => pickMapTarget({ creatureId: Number(key.slice(1)) }));
    confirmMapTargets(view);
    expect(useMapTargetingStore.getState().targeting).toBeNull();
    expect(useDiceUIStore.getState().rollContext).toMatchObject({ rollTarget: { creatureId: 3 }, subtitle: "1 з 3 · ціль: Гоблін 1", next: { rollTarget: { creatureId: 4 } } });
    unregister();
  });

  it("гравець статблоком не цілиться: кидки істот — лише майстра", () => {
    const unregister = enterRoom();
    useGameSessionLiveStore.setState({ view: { ...view, myRole: "PLAYER" } as GameSessionView });
    const claw: DiceRollContext = { title: "Гоблін", actions: [{ key: "roll-0", label: "Атака", count: 1, sides: 20, bonus: 4, isD20: true }], autoRollKey: "roll-0", isCreatureRoll: true };
    expect(startMapTargeting(claw)).toBe(false);
    useGameSessionLiveStore.setState({ view });
    expect(startMapTargeting(claw)).toBe(true);
    unregister();
  });
});

describe("лікування на мапі", () => {
  const healingWord: DiceRollContext = { title: "Цілюще слово", actions: [{ key: "spell-0", label: "Лікування", count: 1, sides: 4, bonus: 3, isD20: false }], autoRollKey: "spell-0" };

  it("просить обрати героя навіть із закріпленою істотою-ціллю, а кидок іде на обраного героя", () => {
    const unregister = enterRoom();
    useGameSessionStore.setState({ targetCreatureBySession: { 1: 3 } });
    expect(startMapTargeting(healingWord)).toBe(true);
    expect(useMapTargetingStore.getState().targeting).toMatchObject({ isHeal: true, maxPicks: 1, picks: [] });
    render(<MapTargetingPanel view={view} targeting={useMapTargetingStore.getState().targeting!} />);
    expect(screen.getByText(/Кого лікуєте/)).toBeTruthy();
    expect(screen.getByText("Героя ще не обрано")).toBeTruthy();

    pickMapTarget({ persId: 5 });
    confirmMapTargets(view);
    expect(useDiceUIStore.getState().rollContext).toMatchObject({ rollTarget: { persId: 5 } });
    unregister();
  });

  it("групове «Лікування кожного» ціль не бере — кидок відкривається одразу", () => {
    const unregister = enterRoom();
    expect(startMapTargeting({ ...healingWord, actions: [{ ...healingWord.actions[0], label: "Лікування кожного" }] })).toBe(false);
    unregister();
  });
});

describe("«Благословення» на мапі", () => {
  it("цілей 3 на першому колі й ще одна за коло вище; дотик по обраній знімає її; без мапи — звичайний каст", () => {
    useGameSessionStore.setState({ active: { id: 1, name: "Кімната" }, visibilityBySession: {}, targetCreatureBySession: {}, targetHeroBySession: {} });
    resetLiveSession(1);
    useGameSessionLiveStore.setState({ view });
    expect(startBlessTargeting("Благословення", 1)).toBe(false);
    const unregister = registerReadyMapBoard(1, false);
    expect(startBlessTargeting("Благословення", 2)).toBe(true);
    expect(useMapTargetingStore.getState().targeting).toMatchObject({ maxPicks: 4, picks: [] });
    startBlessTargeting("Благословення", 1);
    pickMapTarget({ persId: 5 });
    pickMapTarget({ creatureId: 3 });
    pickMapTarget({ persId: 5 });
    expect(useMapTargetingStore.getState().targeting).toMatchObject({ maxPicks: 3, picks: [{ creatureId: 3 }] });
    unregister();
  });

  it("«Благословити» вимкнене без цілей, далі кладе позначку на обраних і закриває вибір", async () => {
    const unregister = enterRoom();
    mocks.blessRoomTargetsAction.mockResolvedValue({ ok: true, value: null });
    startBlessTargeting("Благословення", 1);
    render(<MapTargetingPanel view={view} targeting={useMapTargetingStore.getState().targeting!} />);
    expect((screen.getByRole("button", { name: "Благословити" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByRole("button", { name: "Без цілі" })).toBeNull();
    cleanup();

    pickMapTarget({ persId: 5 });
    pickMapTarget({ creatureId: 4 });
    await confirmBlessing(view);
    expect(mocks.blessRoomTargetsAction).toHaveBeenCalledWith(1, { creatureIds: [4], persIds: [5] });
    expect(useMapTargetingStore.getState().targeting).toBeNull();
    expect(useDiceUIStore.getState().isOpen).toBe(false);
    unregister();
  });

  it("сервер не прийняв — вибір лишається, щоб натиснути ще раз", async () => {
    const unregister = enterRoom();
    mocks.blessRoomTargetsAction.mockRejectedValue(new Error("offline"));
    startBlessTargeting("Благословення", 1);
    pickMapTarget({ persId: 5 });
    await confirmBlessing(view);
    expect(useMapTargetingStore.getState().targeting).toMatchObject({ picks: [{ persId: 5 }] });
    unregister();
  });
});

describe("підказка над мапою", () => {
  const targetingBase = { sessionId: 1, maxPicks: 1, picks: [] };
  const bite: DiceRollContext = { title: "Тлінкаллі", subtitle: "Укус", actions: [], isCreatureRoll: true };

  it("каже, що робити зараз: ціль, решту зарядів, благословенних чи зону", () => {
    expect(describeMapTask(null, null)).toBeNull();
    expect(describeMapTask({ ...targetingBase, roll: bite }, null)).toEqual({ tone: "hostile", label: "Тлінкаллі · Укус", task: "торкніться цілі на мапі" });
    expect(describeMapTask({ ...targetingBase, roll: bite, picks: [{ persId: 5 }] }, null)?.task).toBe("натисніть «Кинути» або оберіть іншу ціль");
    expect(describeMapTask({ ...targetingBase, roll: missile, maxPicks: 3, picks: [{ creatureId: 3 }] }, null)).toMatchObject({ label: "Чарівна стріла", task: "торкніться цілі на мапі — ще 2 з 3" });
    expect(describeMapTask({ ...targetingBase, roll: missile, maxPicks: 3, picks: [{ creatureId: 3 }, { creatureId: 3 }, { creatureId: 4 }] }, null)?.task).toBe("усі цілі обрано — натисніть «Кинути»");
    expect(describeMapTask({ ...targetingBase, maxPicks: 3, blessing: { title: "Благословення" } }, null)).toEqual({ tone: "friendly", label: "Благословення", task: "торкніться до 3 цілей на мапі" });
    expect(describeMapTask({ ...targetingBase, maxPicks: 3, picks: [{ persId: 5 }], blessing: { title: "Благословення" } }, null)?.task).toBe("обрано 1 з 3 — натисніть «Благословити»");
    const cast = { sessionId: 1, roll: missile, area: { name: "Вогняна куля", shape: "circle" as const, sizeFeet: 20 }, isPlaced: true };
    expect(describeMapTask(null, cast)).toEqual({ tone: "area", label: "Вогняна куля", task: "посуньте зону на мапі й натисніть «Накласти»" });
  });
});
