// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { GameRollEventView } from "@/server/db/game-roll-events";
import type { GameSessionView } from "@/server/db/game-sessions";

vi.hoisted(() => {
  const items = new Map<string, string>();
  const storage = { getItem: (key: string) => items.get(key) ?? null, setItem: (key: string, value: string) => void items.set(key, value), removeItem: (key: string) => void items.delete(key), clear: () => items.clear() };
  Object.defineProperty(globalThis, "localStorage", { value: storage, configurable: true, writable: true });
  Object.defineProperty(window, "localStorage", { value: storage, configurable: true, writable: true });
});
const toastInfo = vi.hoisted(() => vi.fn());
const dice = vi.hoisted(() => ({ complete: null as null | ((result: { notation: string; total: number; rolls: Array<{ sides: number; value: number }> }) => void) }));
vi.mock("sonner", () => ({ toast: { info: toastInfo, error: vi.fn(), success: vi.fn() } }));
vi.mock("@/lib/actions/game-sessions", () => ({ undoSaveDamageAction: vi.fn(), undoRollDamageAction: vi.fn() }));
vi.mock("@/lib/monitoring/game-analytics", () => ({ captureGameEvent: vi.fn() }));
vi.mock("@/lib/components/game/play-roll-chime", () => ({ playRollChime: vi.fn() }));
vi.mock("@/lib/components/dice/diceService", () => ({
  diceService: { isInitialized: () => true, subscribeStatus: () => () => undefined, onRollComplete: (callback: typeof dice.complete) => { dice.complete = callback; }, roll: vi.fn(async () => {}), rollMany: vi.fn(async () => {}), removeByRollId: vi.fn(async () => {}), clear: vi.fn() },
}));
vi.mock("@/lib/components/dice/dice-tray-layout", () => ({ rollAfterHeldTrayResize: (roll: () => void) => roll() }));

import { GameJournal } from "@/components/games/GameJournal";
import { GameRollEntry } from "@/components/games/GameRollEntry";
import { FormattedDescription } from "@/components/ui/FormattedDescription";
import { DiceRollPanel } from "@/lib/components/dice/DiceRollPanel";
import { useDiceRolls } from "@/lib/components/dice/useDiceRolls";
import { castOnArea, registerReadyMapBoard } from "@/lib/components/game/area-cast";
import { readOutbox } from "@/lib/components/game/game-roll-outbox";
import { resetLiveSession, useGameSessionLiveStore } from "@/lib/components/game/game-session-live-store";
import { confirmMapTargets, useMapTargetingStore } from "@/lib/components/game/map-targeting";
import { settleRollVerdict, useRollVerdictStore } from "@/lib/components/game/roll-verdict";
import { useDiceUIStore } from "@/lib/stores/diceUIStore";
import { useGameSessionStore } from "@/lib/stores/gameSessionStore";

const GAZE = "<p><b>Погляд.</b> Ціль повинна пройти рятівний кидок Мудрості СК 12, інакше стає наляканою.</p>";
const RAY = "<p><b>Промінь.</b> Кидок дальньої атаки: +8, дальність 60 фт. Влучання: 9 (2к8) некротичних ушкоджень. Ціль повинна пройти рятівний кидок Статури СК 14, інакше стає отруєною.</p>";
const HOWL = "<p><b>Виття.</b> Кожна істота в межах 30 футів повинна пройти рятівний кидок Мудрості СК 11, інакше стає наляканою.</p>";

function enterRoom(myRole: "GM" | "PLAYER") {
  useGameSessionStore.setState({ active: { id: 1, name: "Кімната" }, visibilityBySession: {}, targetCreatureBySession: {}, targetHeroBySession: {} });
  resetLiveSession(1);
  useGameSessionLiveStore.setState({ view: { id: 1, myRole, myUserId: 7, members: [], creatures: [] } as unknown as GameSessionView });
}

function Tray() {
  const isOpen = useDiceUIStore((state) => state.isOpen);
  const context = useDiceUIStore((state) => state.rollContext);
  const dice = useDiceRolls(isOpen, context, true);
  return context ? <DiceRollPanel context={context} activeActionKey={dice.activeActionKey} isReady={dice.isReady} isRolling={dice.isRolling} outcome={dice.outcome} isSecret={false} onRoll={dice.rollAction} /> : null;
}

function renderStatblock(content: string) {
  return render(
    <>
      <FormattedDescription content={content} rollsForCreature="Банка" />
      <Tray />
    </>,
  );
}

const pressSaveChip = () => fireEvent.click(screen.getByRole("button", { name: /^Кинути: ряткидок цілі/ }));
const readDrafts = () => readOutbox(window.localStorage).map((item) => item.draft);

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", vi.fn(() => new Promise(() => undefined)));
  window.localStorage.clear();
});
afterEach(() => {
  cleanup();
  useDiceUIStore.getState().close();
  useMapTargetingStore.setState({ targeting: null });
  useRollVerdictStore.setState({ key: null, event: null });
  useGameSessionStore.setState({ active: null, visibilityBySession: {}, targetCreatureBySession: {}, targetHeroBySession: {} });
  resetLiveSession(null);
  vi.unstubAllGlobals();
});

describe("ряткидок цілі зі статблоку", () => {
  it("кнопка є лише в майстра кімнати: поза нею й у гравця — звичайний текст", () => {
    const { unmount } = render(<FormattedDescription content={GAZE} rollsForCreature="Банка" />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByText(/рятівний кидок Мудрості СК 12/)).toBeTruthy();
    unmount();

    enterRoom("PLAYER");
    const player = render(<FormattedDescription content={GAZE} rollsForCreature="Банка" />);
    expect(screen.queryByRole("button")).toBeNull();
    player.unmount();

    enterRoom("GM");
    render(<FormattedDescription content={GAZE} rollsForCreature="Банка" />);
    expect(screen.getByRole("button").textContent).toContain("рятівний кидок Мудрості СК 12");
  });

  it("із закріпленою ціллю кидок іде одразу без кубиків, а лоток показує вердикт кімнати", async () => {
    enterRoom("GM");
    useGameSessionStore.getState().setHeroTarget(1, 5);
    renderStatblock(GAZE);
    pressSaveChip();

    const [draft] = readDrafts();
    expect(draft).toMatchObject({ source: "FREE", persId: null, label: "Банка · Погляд · ряткидок Мудрості СК 12", roll: { groups: [], total: 0 }, target: null, saves: { creatureIds: [], persIds: [5], spell: null, dc: 12, effect: { ability: "WIS", damageType: null, isHalfOnSave: false, condition: "frightened" } } });
    expect(screen.getByText(/Ціль кидає ряткидок Мудрості/).textContent).toContain("При провалі — Наляканий");
    expect(screen.getByRole("status").textContent).toContain("Кімната звіряє");
    expect((screen.getByRole("button", { name: "Кинути ряткидок" }) as HTMLButtonElement).disabled).toBe(true);

    const event = { target: null, heroTarget: null, saves: { ability: "WIS", dc: 12, damageType: null, rows: [{ name: "Варлок", persId: 5, isSaved: false, damage: 0, condition: "frightened", isAppliedToSheet: false, gm: null }] } } as unknown as GameRollEventView;
    act(() => settleRollVerdict(draft.idempotencyKey, event));
    expect(screen.getByRole("status").textContent).toBe("Варлок — провал · Наляканий");
    expect((screen.getByRole("button", { name: "Кинути ряткидок" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("без цілі нічого не надсилає й підказує обрати ціль", () => {
    enterRoom("GM");
    renderStatblock(GAZE);
    pressSaveChip();
    expect(readDrafts()).toEqual([]);
    expect(toastInfo).toHaveBeenCalledWith("Оберіть ціль ряткидка на мапі або в лотку");
  });

  it("на мапі просить обрати ціль, «Без цілі» нічого не кидає", () => {
    enterRoom("GM");
    const release = registerReadyMapBoard(1, false);
    renderStatblock(GAZE);
    pressSaveChip();
    expect(useMapTargetingStore.getState().targeting).toMatchObject({ isHeal: false, maxPicks: 1 });
    act(() => confirmMapTargets(useGameSessionLiveStore.getState().view as GameSessionView, []));
    expect(readDrafts()).toEqual([]);
    release();
  });

  it("промінь: шкода лишається звичайною, ряткидок — окрема кнопка по тій самій цілі", () => {
    enterRoom("GM");
    useGameSessionStore.getState().setHeroTarget(1, 5);
    renderStatblock(RAY);
    fireEvent.click(screen.getByRole("button", { name: "Кинути: шкода, Промінь" }));
    expect(useDiceUIStore.getState().rollContext?.targetSave).toBeUndefined();
    act(() => dice.complete?.({ notation: "", total: 9, rolls: [{ sides: 8, value: 4 }, { sides: 8, value: 5 }] }));
    expect(readDrafts()[0].saves ?? null).toBeNull();
    expect(readDrafts()[0].roll.total).toBe(9);

    fireEvent.click(screen.getByRole("button", { name: /^Ряткидок СК 14/ }));
    expect(readDrafts()[1]).toMatchObject({ roll: { groups: [] }, saves: { persIds: [5], dc: 14, effect: { ability: "CON", damageType: null, condition: "poisoned" } } });
  });

  it("зона: ряткидок кидають усі, хто в ній, і саме ряткидок лишається натиснутим", () => {
    enterRoom("GM");
    const release = registerReadyMapBoard(1, true);
    renderStatblock(HOWL);
    pressSaveChip();
    return vi.waitFor(() => expect(useDiceUIStore.getState().isOpen).toBe(false)).then(async () => {
      const { useAreaCastStore } = await import("@/lib/components/game/area-cast");
      await vi.waitFor(() => expect(useAreaCastStore.getState().cast?.area).toMatchObject({ shape: "circle", sizeFeet: 30 }));
      const cast = useAreaCastStore.getState().cast;
      act(() => castOnArea(cast as NonNullable<typeof cast>, { creatureIds: [3, 4], persIds: [5] }));
      expect(readDrafts()[0]).toMatchObject({ saves: { creatureIds: [3, 4], persIds: [5], dc: 11, effect: { condition: "frightened" } } });
      release();
    });
  });
});

describe("журнал ряткидка без шкоди", () => {
  const event = {
    seq: 4, authorUserId: 7, authorName: "Майстер", persName: null, avatarUrl: null, source: "FREE", visibility: "PUBLIC", label: "Банка · Погляд · ряткидок Мудрості СК 12",
    roll: { d20Mode: null, modeSources: [], groups: [], extra: [], bonus: 0, total: 0, check: null }, total: 0, rolledAt: "2026-11-08T10:00:00Z", createdAt: "2026-11-08T10:00:00Z", target: null, heroTarget: null,
    saves: { ability: "WIS", dc: 12, damageType: null, rows: [{ name: "Варлок", persId: 5, isSaved: false, damage: 0, condition: "frightened", isAppliedToSheet: false, gm: { d20: [7], mode: "NORMAL", bonus: 2, dice: [], total: 9, isAutoFail: false, defense: null, hitPointsBefore: null, hitPointsAfter: null, canUndo: true, isUndone: false } }] },
  } as unknown as GameRollEventView;

  it("озвучує результат ряткидка, а не нульовий підсумок", () => {
    useGameSessionLiveStore.setState({ events: [{ ...event, seq: 3 }] });
    const { container } = render(<GameJournal myUserId={7} />);
    act(() => useGameSessionLiveStore.setState({ events: [{ ...event, seq: 3 }, event] }));
    const announced = [...container.querySelectorAll("p")].find((node) => node.textContent?.startsWith("Майстер:"));
    expect(announced?.textContent).toBe("Майстер: Банка · Погляд · ряткидок Мудрості СК 12 — Варлок — провал · Наляканий");
  });

  it("показує провал, стан і кидок; без «−0», нульового підсумку й порожнього рядка кубиків", () => {
    const { container } = render(<ul><GameRollEntry event={event} isMine isNew={false} /></ul>);
    const text = container.textContent ?? "";
    expect(text).toContain("→ Варлок");
    expect(text).toContain("провал");
    expect(text).toContain("Наляканий");
    expect(text).toContain("к20 7 +2 = 9");
    expect(text).not.toContain("−0");
    expect(screen.queryByLabelText("Разом 0")).toBeNull();
    expect(screen.getByRole("button", { name: "Скасувати ефект: Варлок" })).toBeTruthy();
  });
});
