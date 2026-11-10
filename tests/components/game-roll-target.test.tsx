// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { GameRoll } from "@/rules/game-roll";
import type { GameRollEventView } from "@/server/db/game-roll-events";
import type { GameSessionView } from "@/server/db/game-sessions";

vi.hoisted(() => {
  const items = new Map<string, string>();
  const storage = { getItem: (key: string) => items.get(key) ?? null, setItem: (key: string, value: string) => void items.set(key, value), removeItem: (key: string) => void items.delete(key) };
  Object.defineProperty(globalThis, "localStorage", { value: storage, configurable: true, writable: true });
  Object.defineProperty(window, "localStorage", { value: storage, configurable: true, writable: true });
});
const mocks = vi.hoisted(() => ({ undoRollDamageAction: vi.fn() }));
vi.mock("@/lib/actions/game-sessions", () => ({ undoRollDamageAction: mocks.undoRollDamageAction }));
vi.mock("@/lib/monitoring/game-analytics", () => ({ captureGameEvent: vi.fn() }));
vi.mock("@/lib/components/game/play-roll-chime", () => ({ playRollChime: vi.fn() }));

import { GameRollEntry } from "@/components/games/GameRollEntry";
import { GameRollTargetBar } from "@/components/games/GameRollTargetBar";
import { readOutbox } from "@/lib/components/game/game-roll-outbox";
import { captureGameRollTarget, publishGameRoll } from "@/lib/components/game/game-roll-publisher";
import { resetLiveSession, setSessionView, useGameSessionLiveStore } from "@/lib/components/game/game-session-live-store";
import { useGameSessionStore } from "@/lib/stores/gameSessionStore";
import { useSheetPersStore } from "@/lib/stores/sheetPersStore";

const damageRoll: GameRoll = { d20Mode: null, modeSources: [], groups: [{ sides: 8, values: [6] }], extra: [], bonus: 0, total: 6, check: null };
const noConditions = { conditions: [], exhaustionLevel: 0 };

const buildCreature = (id: number) => ({ id, creatureKey: "goblin", ruleset: "RULES_2014", label: `Гоблін ${id}`, statblockName: null, customName: null, badge: id, isAlly: false, imageUrl: null, isRoundImage: false, tokenSize: "medium", token: { x: 0.5, y: 0.5 }, hitPoints: null, isDown: false, conditions: noConditions });
const buildView = (creatureIds: number[]) =>
  ({ id: 1, name: "Кімната", isArchived: false, myUserId: 7, myRole: "PLAYER", myPersId: 5, myPersIds: [5], inviteToken: null, mapImageUrl: null, members: [], creatures: creatureIds.map(buildCreature), creatureNameMode: "short", combat: null }) as unknown as GameSessionView;

function enterRoom(creatureIds: number[]) {
  useGameSessionStore.setState({ active: { id: 1, name: "Кімната" }, visibilityBySession: {}, targetCreatureBySession: {} });
  useSheetPersStore.setState({ pers: { persId: 5, name: "Тарн" } as never });
  resetLiveSession(1);
  useGameSessionLiveStore.setState({ view: buildView(creatureIds) });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", vi.fn(() => new Promise(() => undefined)));
});
afterEach(() => {
  cleanup();
  useGameSessionStore.setState({ active: null, visibilityBySession: {}, targetCreatureBySession: {} });
  useSheetPersStore.setState({ pers: null });
  resetLiveSession(null);
  vi.unstubAllGlobals();
});

describe("ціль кидка на лотку", () => {
  it("показує «Ціль: …» лише для кидка з листа персонажа, а хрестик її знімає", () => {
    enterRoom([61]);
    useGameSessionStore.getState().setRollTarget(1, 61);
    const { unmount } = render(<GameRollTargetBar isSheetRoll={false} />);
    expect(screen.queryByText(/Ціль:/)).toBeNull();
    unmount();

    render(<GameRollTargetBar isSheetRoll />);
    expect(screen.getByText(/Ціль:/).textContent).toBe("Ціль: Гоблін 61");
    fireEvent.click(screen.getByRole("button", { name: "Зняти ціль" }));
    expect(useGameSessionStore.getState().targetCreatureBySession).toEqual({});
    expect(screen.queryByText(/Ціль:/)).toBeNull();
  });

  it("сама скидає ціль, коли істота зникла з кімнати", () => {
    enterRoom([61, 62]);
    useGameSessionStore.getState().setRollTarget(1, 61);
    act(() => setSessionView(buildView([61, 62])));
    expect(useGameSessionStore.getState().targetCreatureBySession).toEqual({ 1: 61 });
    act(() => setSessionView(buildView([62])));
    expect(useGameSessionStore.getState().targetCreatureBySession).toEqual({});
  });

  it("знімає ціль, коли ворога повалили: наступний удар не піде в мертвого", () => {
    enterRoom([61]);
    useGameSessionStore.getState().setRollTarget(1, 61);
    const downed = buildView([61]);
    downed.creatures[0].isDown = true;
    act(() => setSessionView(downed));
    expect(useGameSessionStore.getState().targetCreatureBySession).toEqual({});
  });

  it("лікування не показує ціль: вона береться лише для атаки й шкоди", () => {
    enterRoom([61]);
    useGameSessionStore.getState().setRollTarget(1, 61);
    render(<GameRollTargetBar isSheetRoll canTarget={false} />);
    expect(screen.queryByText(/Ціль:/)).toBeNull();
  });
});

describe("ціль у кидку", () => {
  it("несе ціль і вид кидка лише з листа персонажа; вільні кубики й пул цілі не мають", () => {
    enterRoom([61]);
    useGameSessionStore.getState().setRollTarget(1, 61);
    expect(captureGameRollTarget("sheet")?.creatureId).toBe(61);
    expect(captureGameRollTarget("pool")?.creatureId).toBeNull();
    expect(captureGameRollTarget("free")?.creatureId).toBeNull();
  });

  it("кладе ціль у чергу надсилання, щоб офлайн-кидок не загубив її", () => {
    enterRoom([61]);
    useGameSessionStore.getState().setRollTarget(1, 61);
    const target = captureGameRollTarget("sheet")!;
    publishGameRoll(target, { label: "Шкода", roll: damageRoll, isFromSheet: true, kind: "damage" });
    const body = JSON.parse((vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string);
    expect(body.target).toEqual({ creatureId: 61, kind: "damage" });

    publishGameRoll(target, { label: "Перевірка", roll: damageRoll, isFromSheet: true, kind: null });
    expect(readOutbox(window.localStorage).at(-1)?.draft.target).toBeNull();
  });
});

describe("ряткидки цілей у кидку", () => {
  const save = { spell: { engName: "Fireball", level: 3, ruleset: "RULES_2014" as const }, dc: 15 };
  const sentBody = () => readOutbox(window.localStorage).at(-1)!.draft;

  it("шкода заклинання з ряткидком іде обраній істоті ряткидком, а не повною шкодою", () => {
    enterRoom([61]);
    useGameSessionStore.getState().setRollTarget(1, 61);
    publishGameRoll(captureGameRollTarget("sheet")!, { label: "Шкода", roll: damageRoll, isFromSheet: true, kind: "damage", save });
    expect(sentBody()).toMatchObject({ target: null, saves: { creatureIds: [61], persIds: [], ...save } });
  });

  it("зона з мапи замінює обрану ціль, а порожня зона не зачіпає нікого", () => {
    enterRoom([61, 62]);
    useGameSessionStore.getState().setRollTarget(1, 61);
    const target = captureGameRollTarget("sheet")!;
    publishGameRoll(target, { label: "Шкода", roll: damageRoll, isFromSheet: true, kind: "damage", save, areaTargets: { creatureIds: [62], persIds: [5] } });
    expect(sentBody()).toMatchObject({ target: null, saves: { creatureIds: [62], persIds: [5] } });

    publishGameRoll(target, { label: "Шкода", roll: damageRoll, isFromSheet: true, kind: "damage", save, areaTargets: { creatureIds: [], persIds: [] } });
    expect(sentBody()).toMatchObject({ target: null });
    expect(sentBody().saves).toBeUndefined();
  });
});

describe("рядок цілі в журналі", () => {
  const damaged: GameRollEventView = {
    seq: 4, authorUserId: 7, authorName: "Оксана", persName: "Тарн", avatarUrl: null, source: "CHARACTER", visibility: "PUBLIC", label: "Шкода", roll: damageRoll, total: 6,
    rolledAt: "2026-11-06T10:00:00.000Z", createdAt: "2026-11-06T10:00:00.000Z",
    target: { name: "Гоблін 1", kind: "damage", isHit: null, damage: 6, isDowned: false, gm: null },
  };
  const gmTarget = { armorClass: null, hitPointsBefore: 10, hitPointsAfter: 4, canUndo: true, isUndone: false };

  it("гравець бачить лише ціль і число шкоди, без хітів і кнопки скасування", () => {
    render(<ol><GameRollEntry event={damaged} isMine isNew={false} /></ol>);
    expect(screen.getByText("→ Гоблін 1")).toBeTruthy();
    expect(screen.getByText("· −6")).toBeTruthy();
    expect(screen.queryByText(/Хіти/)).toBeNull();
    expect(screen.queryByRole("button", { name: "Скасувати" })).toBeNull();
  });

  it("гравець бачить влучання чи промах без КЗ, майстер — ще й КЗ", () => {
    const attack = { ...damaged, label: "Атака", target: { name: "Гоблін 1", kind: "attack" as const, isHit: true, damage: null, isDowned: false, gm: null } };
    const { unmount } = render(<ol><GameRollEntry event={attack} isMine isNew={false} /></ol>);
    expect(screen.getByText("· Влучання")).toBeTruthy();
    expect(screen.queryByText(/КЗ/)).toBeNull();
    unmount();

    const forGm = { ...attack, target: { ...attack.target, isHit: false, gm: { ...gmTarget, armorClass: 15, canUndo: false } } };
    render(<ol><GameRollEntry event={forGm} isMine={false} isNew={false} /></ol>);
    expect(screen.getByText("· Промах")).toBeTruthy();
    expect(screen.getByText("КЗ 15")).toBeTruthy();
  });

  it("майстер бачить хіти до й після та скасовує шкоду один раз: рядок оновлюється відповіддю сервера", async () => {
    enterRoom([61]);
    const forGm = { ...damaged, target: { ...damaged.target!, gm: gmTarget } };
    const undone = { ...damaged, target: { ...damaged.target!, gm: { ...gmTarget, canUndo: false, isUndone: true } } };
    mocks.undoRollDamageAction.mockResolvedValue({ ok: true, value: undone });
    useGameSessionLiveStore.setState({ events: [forGm] });
    const Journal = () => <ol>{useGameSessionLiveStore((state) => state.events).map((event) => <GameRollEntry key={event.seq} event={event} isMine={false} isNew={false} />)}</ol>;
    render(<Journal />);
    expect(screen.getByText("Хіти 10 → 4")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Скасувати" }));
    expect(mocks.undoRollDamageAction).toHaveBeenCalledWith(1, 4);
    await waitFor(() => expect(screen.getByText("скасовано")).toBeTruthy());
    expect(screen.queryByRole("button", { name: "Скасувати" })).toBeNull();
  });

  it("показує причину, коли сервер відмовив у скасуванні, і лишає кнопку", async () => {
    enterRoom([61]);
    mocks.undoRollDamageAction.mockResolvedValue({ ok: false, error: "Цю шкоду вже скасовано" });
    render(<ol><GameRollEntry event={{ ...damaged, target: { ...damaged.target!, gm: gmTarget } }} isMine={false} isNew={false} /></ol>);
    fireEvent.click(screen.getByRole("button", { name: "Скасувати" }));
    await waitFor(() => expect(mocks.undoRollDamageAction).toHaveBeenCalled());
    expect(screen.getByRole("button", { name: "Скасувати" })).toBeTruthy();
  });

  it("без заданих хітів у істоти майстер бачить, що хіти не змінено", () => {
    render(<ol><GameRollEntry event={{ ...damaged, target: { ...damaged.target!, gm: { ...gmTarget, hitPointsBefore: null, hitPointsAfter: null, canUndo: false } } }} isMine={false} isNew={false} /></ol>);
    expect(screen.getByText("Хіти не змінено: у істоти їх не задано")).toBeTruthy();
  });
});
