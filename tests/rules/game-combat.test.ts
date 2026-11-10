import { describe, expect, it } from "vitest";
import {
  buildCombatView,
  findCombatNewcomers,
  findCombatOrder,
  findCreatureInitiativeBonus,
  findTurnIndex,
  moveTurn,
  parseInitiative,
  parseTurnStep,
  rollD20,
  rollInitiative,
  sortCombatants,
  type CombatantRow,
} from "@/rules/game-combat";
import type { MapCreatureView } from "@/rules/game-map-creatures";

const row = (overrides: Partial<CombatantRow>): CombatantRow => ({ id: 1, persId: 10, gameMapCreatureId: null, initiative: 10, initiativeBonus: 0, sortTiebreak: 0.5, ...overrides });

const goblin = (id: number, overrides: Partial<MapCreatureView> = {}): MapCreatureView => ({
  id, creatureKey: "goblin", ruleset: "RULES_2014", label: `Гоблін ${id}`, statblockName: null, customName: null, badge: id, isAlly: false, imageUrl: "/goblin.webp", isRoundImage: false, tokenSize: "small", token: { x: 0.5, y: 0.5 }, ...overrides,
});

describe("кидок ініціативи", () => {
  it("d20 покриває 1..20 і додає бонус", () => {
    expect(rollD20(() => 0)).toBe(1);
    expect(rollD20(() => 0.999)).toBe(20);
    expect(rollInitiative(3, () => 0.5)).toBe(14);
    expect(rollInitiative(-2, () => 0)).toBe(-1);
    expect(rollInitiative(0)).toBeGreaterThanOrEqual(1);
  });

  it("бонус істоти — модифікатор Спритності зі статблока 2014 і 2024", () => {
    expect(findCreatureInitiativeBonus("16 (+3)")).toBe(3);
    expect(findCreatureInitiativeBonus("8 (-1)")).toBe(-1);
    expect(findCreatureInitiativeBonus("11 (+0)")).toBe(0);
    expect(findCreatureInitiativeBonus("1 (-5)")).toBe(-5);
    expect(findCreatureInitiativeBonus("")).toBe(0);
    expect(findCreatureInitiativeBonus(undefined)).toBe(0);
  });

  it("число ініціативи від майстра — ціле в межах, хід — лише ±1", () => {
    expect(parseInitiative(17)).toBe(17);
    expect(parseInitiative(-3)).toBe(-3);
    expect(parseInitiative(100)).toBeNull();
    expect(parseInitiative(-100)).toBeNull();
    expect(parseInitiative(1.5)).toBeNull();
    expect(parseInitiative("12")).toBeNull();
    expect(parseTurnStep(1)).toBe(1);
    expect(parseTurnStep(-1)).toBe(-1);
    expect(parseTurnStep(2)).toBeNull();
    expect(parseTurnStep("1")).toBeNull();
  });
});

describe("порядок ходів", () => {
  it("вища ініціатива першою, за рівності — вищий бонус, далі жереб, далі id", () => {
    const rows = [
      row({ id: 1, initiative: 12, initiativeBonus: 1 }),
      row({ id: 2, initiative: 15 }),
      row({ id: 3, initiative: 12, initiativeBonus: 3 }),
      row({ id: 4, initiative: 12, initiativeBonus: 3, sortTiebreak: 0.9 }),
      row({ id: 6, initiative: 12, initiativeBonus: 3, sortTiebreak: 0.9 }),
      row({ id: 5, initiative: 12, initiativeBonus: 3, sortTiebreak: 0.9 }),
    ];
    expect(sortCombatants(rows).map((item) => item.id)).toEqual([2, 4, 5, 6, 3, 1]);
    expect(rows[0].id).toBe(1);
  });

  it("у порядку лишаються лише ті, хто ще в кімнаті чи на мапі", () => {
    const rows = [row({ id: 1, persId: 10 }), row({ id: 2, persId: 11 }), row({ id: 3, persId: null, gameMapCreatureId: 7 }), row({ id: 4, persId: null, gameMapCreatureId: 8 })];
    const order = findCombatOrder(rows, { persIds: new Set([10]), creatureIds: new Set([7]) });
    expect(order.map((item) => item.id)).toEqual([1, 3]);
  });

  it("хід тримається за поточним, а коли його прибрано, лишається на тому ж номері", () => {
    expect(findTurnIndex([5, 6, 7], 6, 0)).toBe(1);
    expect(findTurnIndex([5, 7], null, 1)).toBe(1);
    expect(findTurnIndex([5, 7], 6, 1)).toBe(1);
    expect(findTurnIndex([5, 7], 6, 2)).toBe(0);
    expect(findTurnIndex([], null, 0)).toBe(0);
  });

  it("наступний хід переходить у новий раунд, назад — у попередній, а перший хід першого раунду лишається", () => {
    expect(moveTurn({ round: 1, index: 0 }, 3, 1)).toEqual({ round: 1, index: 1 });
    expect(moveTurn({ round: 1, index: 2 }, 3, 1)).toEqual({ round: 2, index: 0 });
    expect(moveTurn({ round: 2, index: 1 }, 3, -1)).toEqual({ round: 2, index: 0 });
    expect(moveTurn({ round: 2, index: 0 }, 3, -1)).toEqual({ round: 1, index: 2 });
    expect(moveTurn({ round: 1, index: 0 }, 3, -1)).toEqual({ round: 1, index: 0 });
    expect(moveTurn({ round: 4, index: 0 }, 0, 1)).toEqual({ round: 4, index: 0 });
  });
});

describe("вигляд бою для глядача", () => {
  const heroes = new Map([[10, { persId: 10, userId: 2, name: "Арвен", avatarUrl: "/arven.webp" }]]);
  const rows = [
    row({ id: 1, persId: 10, initiative: 9, initiativeBonus: 2 }),
    row({ id: 2, persId: null, gameMapCreatureId: 7, initiative: 18, initiativeBonus: 4 }),
    row({ id: 3, persId: 11, initiative: 20 }),
  ];

  it("без бою вигляду немає", () => {
    expect(buildCombatView({ state: { round: null, turn: null, currentCombatantId: null }, rows, heroesByPersId: heroes, creatures: [] })).toBeNull();
  });

  it("впорядковує, відкидає тих, кого глядач не бачить, і не віддає бонус", () => {
    const view = buildCombatView({ state: { round: 2, turn: 0, currentCombatantId: 1 }, rows, heroesByPersId: heroes, creatures: [goblin(7, { creatureKey: null, imageUrl: null, label: "Тінь" })] })!;
    expect(view.round).toBe(2);
    expect(view.currentId).toBe(1);
    expect(view.combatants.map((combatant) => combatant.id)).toEqual([2, 1]);
    expect(view.combatants[0]).toEqual({ id: 2, initiative: 18, hero: null, creature: expect.objectContaining({ label: "Тінь", creatureKey: null, imageUrl: null }) });
    expect(view.combatants[1].hero).toEqual({ persId: 10, userId: 2, name: "Арвен", avatarUrl: "/arven.webp" });
    expect(JSON.stringify(view)).not.toContain("initiativeBonus");
    expect(JSON.stringify(view)).not.toContain("sortTiebreak");
  });

  it("якщо поточного прибрано, хід лишається на тому ж номері, а порожній бій не має поточного", () => {
    const state = { round: 1, turn: 1, currentCombatantId: null };
    expect(buildCombatView({ state, rows, heroesByPersId: heroes, creatures: [goblin(7)] })!.currentId).toBe(1);
    expect(buildCombatView({ state, rows: [], heroesByPersId: heroes, creatures: [] })).toEqual({ round: 1, currentId: null, combatants: [] });
  });

  it("тримається за поточного після зміни порядку", () => {
    const edited = rows.map((item) => (item.id === 1 ? { ...item, initiative: 30 } : item));
    const view = buildCombatView({ state: { round: 1, turn: 1, currentCombatantId: 1 }, rows: edited, heroesByPersId: heroes, creatures: [goblin(7)] })!;
    expect(view.combatants.map((combatant) => combatant.id)).toEqual([1, 2]);
    expect(view.currentId).toBe(1);
  });
});

describe("нові учасники бою", () => {
  const combat = { round: 1, currentId: 1, combatants: [
    { id: 1, initiative: 12, hero: { persId: 5, userId: 5, name: "Арвен", avatarUrl: null }, creature: null },
    { id: 2, initiative: 8, hero: null, creature: goblin(7) },
  ] };

  it("називає героїв і поставлених істот поза чергою, а неставлених пропускає", () => {
    const heroes = [{ persId: 5, name: "Арвен" }, { persId: 6, name: "Борін" }];
    const creatures = [goblin(7), goblin(8), goblin(9, { token: null })];
    expect(findCombatNewcomers(combat, { heroes, creatures })).toEqual(["Борін", "Гоблін 8"]);
  });

  it("без істот активної сцени не вгадує", () => {
    expect(findCombatNewcomers(combat, { heroes: [], creatures: null })).toBeNull();
  });
});
