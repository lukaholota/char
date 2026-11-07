// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { CombatView } from "@/rules/game-combat";
import type { GameSessionView } from "@/server/db/game-sessions";

const mocks = vi.hoisted(() => ({
  startCombatAction: vi.fn(),
  endCombatAction: vi.fn(),
  advanceCombatTurnAction: vi.fn(),
  endOwnCombatTurnAction: vi.fn(),
  setCombatantInitiativeAction: vi.fn(),
  addCombatantsAction: vi.fn(),
  refresh: vi.fn(),
  toastError: vi.fn(),
  captureGameEvent: vi.fn(),
}));
vi.mock("@/lib/actions/game-sessions", () => ({
  startCombatAction: mocks.startCombatAction,
  endCombatAction: mocks.endCombatAction,
  advanceCombatTurnAction: mocks.advanceCombatTurnAction,
  endOwnCombatTurnAction: mocks.endOwnCombatTurnAction,
  setCombatantInitiativeAction: mocks.setCombatantInitiativeAction,
  addCombatantsAction: mocks.addCombatantsAction,
}));
vi.mock("@/components/no-ai/NoAiModeProvider", () => ({ useModeRouter: () => ({ refresh: mocks.refresh }), useNoAiMode: () => ({ enabled: false }) }));
vi.mock("sonner", () => ({ toast: { error: mocks.toastError, info: vi.fn() } }));
vi.mock("@/lib/monitoring/game-analytics", () => ({ captureGameEvent: mocks.captureGameEvent }));

import { CombatTracker, CompactCombatContext } from "@/components/games/CombatTracker";
import { ConfirmDialogHost } from "@/components/ui/confirm-dialog";
import { CombatTurnProvider } from "@/components/games/combat-turn";
import { resetOptimisticValues } from "@/components/games/optimistic-values";

beforeEach(() => {
  vi.clearAllMocks();
  resetOptimisticValues();
  mocks.advanceCombatTurnAction.mockResolvedValue({ ok: true, value: null });
  mocks.endOwnCombatTurnAction.mockResolvedValue({ ok: true, value: null });
  mocks.setCombatantInitiativeAction.mockResolvedValue({ ok: true, value: null });
  mocks.startCombatAction.mockResolvedValue({ ok: true, value: { combatantCount: 3 } });
  mocks.endCombatAction.mockResolvedValue({ ok: true, value: { rounds: 2 } });
  mocks.addCombatantsAction.mockResolvedValue({ ok: true, value: { addedCount: 1 } });
});
afterEach(cleanup);

const combat: CombatView = {
  round: 2,
  currentId: 12,
  combatants: [
    { id: 11, initiative: 18, hero: { userId: 2, name: "Арвен", avatarUrl: null }, creature: null },
    { id: 12, initiative: 14, hero: null, creature: { id: 5, creatureKey: null, ruleset: "RULES_2014", label: "Тінь", statblockName: null, customName: null, badge: null, isAlly: false, imageUrl: null, isRoundImage: false, tokenSize: "medium", token: { x: 0.5, y: 0.5 }, hitPoints: null, isDown: false, conditions: { conditions: [], exhaustionLevel: 0 } } },
    { id: 13, initiative: 7, hero: { userId: 3, name: "Торин", avatarUrl: null }, creature: null },
  ],
};

const buildView = (overrides: Partial<GameSessionView> = {}): GameSessionView => ({
  id: 7, name: "Печера", isArchived: false, myUserId: 2, myRole: "PLAYER", myPersId: 20, inviteToken: null, mapImageUrl: null, members: [], creatures: [], creatureNameMode: "short", combat: null, grid: null, fog: null, areas: [], viewedSceneId: null, activeSceneId: null, scenes: [], ...overrides,
});
const gmView = (overrides: Partial<GameSessionView> = {}) => buildView({ myUserId: 1, myRole: "GM", myPersId: null, ...overrides });
const listItems = () => within(screen.getByRole("list", { name: "Черга ходів" })).getAllByRole("listitem");

describe("трекер бою", () => {
  it("без бою гравець нічого не бачить, а майстер бачить «Почати бій»", async () => {
    const { container } = render(<CombatTracker view={buildView()} />);
    expect(container.firstChild).toBeNull();
    cleanup();

    render(<CombatTracker view={gmView()} />);
    fireEvent.click(screen.getByRole("button", { name: "Почати бій" }));
    await waitFor(() => expect(mocks.startCombatAction).toHaveBeenCalledWith(7));
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalled());
    expect(mocks.captureGameEvent).toHaveBeenCalledWith("game_combat_started", { combatant_count: 3 });
  });

  it("в архівній кімнаті майстер не бачить кнопок початку й керування", () => {
    render(<CombatTracker view={gmView({ isArchived: true })} />);
    expect(screen.queryByRole("button", { name: "Почати бій" })).toBeNull();
    cleanup();
    render(<CombatTracker view={gmView({ isArchived: true, combat })} />);
    expect(screen.queryByRole("button", { name: /Наступний хід/ })).toBeNull();
  });

  it("гравець бачить раунд, чергу та поточний хід, але не кнопки керування й не редагує ініціативу", () => {
    render(<CombatTracker view={buildView({ combat })} />);
    expect(screen.getByRole("heading", { name: "Бій · раунд 2" })).toBeTruthy();
    const items = listItems();
    expect(items).toHaveLength(3);
    expect(within(items[0]).getByText("Арвен")).toBeTruthy();
    expect(within(items[1]).getByLabelText("Ініціатива 14")).toBeTruthy();
    expect(items[1].getAttribute("aria-current")).toBe("true");
    expect(items[0].getAttribute("aria-current")).toBeNull();
    expect(screen.getByText("Зараз ходить: Тінь · ваш хід через 2")).toBeTruthy();
    expect(screen.getAllByRole("button").map((button) => button.getAttribute("aria-label"))).toEqual(["Згорнути чергу"]);
  });

  it("повалена істота лишається в черзі, але закреслена й озвучена як повалена", () => {
    const shade = combat.combatants[1];
    const downed = { ...shade, creature: { ...shade.creature!, hitPoints: { current: 0, max: 12 }, isDown: true } };
    render(<CombatTracker view={buildView({ combat: { ...combat, combatants: [combat.combatants[0], downed, combat.combatants[2]] } })} />);
    const name = within(listItems()[1]).getByText("Тінь", { exact: false });
    expect(name.textContent).toBe("Тінь, повалений");
    expect(name.className).toContain("line-through");
    expect(within(listItems()[0]).getByText("Арвен").className).not.toContain("line-through");
  });

  it("згорнута черга ховає учасників, але лишає раунд і поточний хід", () => {
    render(<CombatTracker view={buildView({ combat })} />);
    fireEvent.click(screen.getByRole("button", { name: "Згорнути чергу" }));
    expect(screen.queryByRole("list", { name: "Черга ходів" })).toBeNull();
    expect(screen.getByText("Зараз ходить: Тінь · ваш хід через 2")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Показати чергу" }).getAttribute("aria-expanded")).toBe("false");
  });

  it("майстер переходить уперед і назад, додає нових і завершує бій лише після підтвердження", async () => {
    const borin = { userId: 4, name: "Оля", role: "PLAYER" as const, persId: 40, persName: "Борін", avatarUrl: null, isOnline: true, token: null, conditions: { conditions: [], exhaustionLevel: 0 }, lifeState: { kind: "up" as const } };
    render(<><CombatTracker view={gmView({ combat, members: [borin] })} /><ConfirmDialogHost /></>);
    fireEvent.click(screen.getByRole("button", { name: /Наступний хід/ }));
    await waitFor(() => expect(mocks.advanceCombatTurnAction).toHaveBeenCalledWith(7, 1));
    fireEvent.click(screen.getByRole("button", { name: /Назад/ }));
    await waitFor(() => expect(mocks.advanceCombatTurnAction).toHaveBeenCalledWith(7, -1));
    fireEvent.click(screen.getByRole("button", { name: "Додати в бій: Борін" }));
    await waitFor(() => expect(mocks.addCombatantsAction).toHaveBeenCalledWith(7));

    fireEvent.click(screen.getByRole("button", { name: "Завершити бій" }));
    fireEvent.click(within(await screen.findByRole("dialog", { name: "Завершити бій?" })).getByRole("button", { name: "Скасувати" }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Завершити бій?" })).toBeNull());
    expect(mocks.endCombatAction).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Завершити бій" }));
    fireEvent.click(within(await screen.findByRole("dialog", { name: "Завершити бій?" })).getByRole("button", { name: "Завершити бій" }));
    await waitFor(() => expect(mocks.endCombatAction).toHaveBeenCalledWith(7));
    expect(mocks.captureGameEvent).toHaveBeenCalledWith("game_combat_ended", { rounds: 2 });
  });

  it("коли додавати нікого, кнопки додавання немає; коли майстер дивиться іншу сцену — загальна кнопка", () => {
    render(<CombatTracker view={gmView({ combat })} />);
    expect(screen.queryByRole("button", { name: /Додати в бій/ })).toBeNull();
    cleanup();
    render(<CombatTracker view={gmView({ combat, viewedSceneId: 2, activeSceneId: 1 })} />);
    expect(screen.getByRole("button", { name: "Додати в бій нових з мапи" })).toBeTruthy();
  });

  it("майстер правит ініціативу: Enter зберігає, Escape скасовує, те саме число нічого не шле, помилка показується", async () => {
    render(<CombatTracker view={gmView({ combat })} />);
    fireEvent.click(screen.getByRole("button", { name: "Ініціатива Торин: 7. Змінити" }));
    const input = screen.getByRole("spinbutton", { name: "Ініціатива: Торин" });
    fireEvent.change(input, { target: { value: "25" } });
    fireEvent.submit(input.closest("form")!);
    await waitFor(() => expect(mocks.setCombatantInitiativeAction).toHaveBeenCalledWith(7, 13, 25));

    fireEvent.click(screen.getByRole("button", { name: "Ініціатива Арвен: 18. Змінити" }));
    fireEvent.keyDown(screen.getByRole("spinbutton", { name: "Ініціатива: Арвен" }), { key: "Escape" });
    expect(screen.queryByRole("spinbutton")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Ініціатива Арвен: 18. Змінити" }));
    fireEvent.blur(screen.getByRole("spinbutton", { name: "Ініціатива: Арвен" }));
    expect(mocks.setCombatantInitiativeAction).toHaveBeenCalledTimes(1);

    mocks.advanceCombatTurnAction.mockResolvedValueOnce({ ok: false, error: "Бій уже завершено" });
    fireEvent.click(screen.getByRole("button", { name: /Наступний хід/ }));
    await waitFor(() => expect(mocks.toastError).toHaveBeenCalledWith("Бій уже завершено"));
  });

  it("поточний хід підсвічує токен: істоту, але не героя, що чекає", () => {
    render(
      <CombatTurnProvider combat={combat}>
        <CombatTracker view={buildView({ combat })} />
      </CombatTurnProvider>,
    );
    const items = listItems();
    expect(items[1].querySelector(".ring-arcane-300")).not.toBeNull();
    expect(items[2].querySelector(".ring-arcane-300")).toBeNull();
  });

  it("гравець у свій хід бачить «Ваш хід» і сам завершує його: хід одразу переходить до наступного", async () => {
    render(<CombatTracker view={buildView({ combat: { ...combat, currentId: 11 } })} />);
    expect(screen.getByText("Ваш хід")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Наступний хід" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Завершити хід" }));
    await waitFor(() => expect(mocks.endOwnCombatTurnAction).toHaveBeenCalledWith(7, 11));
    expect(screen.getByText("Зараз ходить: Тінь · ваш хід через 2")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Завершити хід" })).toBeNull();
  });

  it("поки на мапі відкрита панель чи лоток, бій стиснутий у рядок: раунд, хто ходить і «Завершити хід», без черги", () => {
    render(<CompactCombatContext.Provider value><CombatTracker view={buildView({ combat: { ...combat, currentId: 11 } })} /></CompactCombatContext.Provider>);
    expect(screen.getByRole("heading", { name: "Раунд 2" })).toBeTruthy();
    expect(screen.getByText("Ваш хід")).toBeTruthy();
    expect(screen.queryByRole("list", { name: "Черга ходів" })).toBeNull();
    expect(screen.getAllByRole("button").map((button) => button.textContent)).toEqual(["Завершити хід"]);
  });

  it("чужий хід, хід наступного героя й архівна кімната — без кнопки завершення", () => {
    const { rerender } = render(<CombatTracker view={buildView({ combat, myUserId: 3, myPersId: 30 })} />);
    expect(screen.getByText("Зараз ходить: Тінь · ваш хід наступний")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Завершити хід" })).toBeNull();
    rerender(<CombatTracker view={buildView({ combat: { ...combat, currentId: 11 }, isArchived: true })} />);
    expect(screen.queryByRole("button", { name: "Завершити хід" })).toBeNull();
    rerender(<CombatTracker view={gmView({ combat: { ...combat, currentId: 11 } })} />);
    expect(screen.getByText("Зараз ходить: Арвен")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Завершити хід" })).toBeNull();
  });
});
