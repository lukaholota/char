import { describe, expect, it } from "vitest";
import {
  buildCreatureInitials,
  buildMapCreatureViews,
  findFreeCreatureNumbers,
  findStatblockTokenSize,
  parseCreatureTokenSize,
  parseNewMapCreatures,
  parseTokenNameMode,
  type MapCreatureRow,
} from "@/rules/game-map-creatures";

const goblin = { name: "Гоблін", size: "Малий", imageUrl: "/images/goblin.webp" };
const wolf = { name: "Вовк", size: "Середній", imageUrl: "/images/wolf.webp", imageShape: "round" as const };
const findEntry = (key: string) => ({ goblin, wolf })[key as "goblin" | "wolf"] ?? null;

const row = (overrides: Partial<MapCreatureRow>): MapCreatureRow => ({
  id: 1,
  creatureKey: "goblin",
  ruleset: "RULES_2014",
  number: 1,
  isAlly: false,
  customName: null,
  tokenSize: null,
  tokenX: null,
  tokenY: null,
  ...overrides,
});

describe("істоти на мапі кімнати", () => {
  it("приймає лише відому редакцію, рядковий ключ і від 1 до 10 копій", () => {
    const valid = { creatureKey: "goblin", ruleset: "RULES_2014", count: 3, isAlly: false };
    expect(parseNewMapCreatures(valid)).toEqual({ ...valid, customName: null });
    expect(parseNewMapCreatures({ ...valid, count: 0 })).toBeNull();
    expect(parseNewMapCreatures({ ...valid, count: 11 })).toBeNull();
    expect(parseNewMapCreatures({ ...valid, count: 1.5 })).toBeNull();
    expect(parseNewMapCreatures({ ...valid, ruleset: "RULES_2030" })).toBeNull();
    expect(parseNewMapCreatures({ ...valid, creatureKey: "" })).toBeNull();
    expect(parseNewMapCreatures({ ...valid, creatureKey: "x".repeat(121) })).toBeNull();
    expect(parseNewMapCreatures({ ...valid, isAlly: "yes" })).toBeNull();
    expect(parseNewMapCreatures(null)).toBeNull();
  });

  it("чистить власне імʼя: пробіли стискає, порожнє — як без імені, задовге чи не рядок — відмова", () => {
    const valid = { creatureKey: "goblin", ruleset: "RULES_2014", count: 1, isAlly: false };
    expect(parseNewMapCreatures({ ...valid, customName: "  Тінь   з  лісу " })?.customName).toBe("Тінь з лісу");
    expect(parseNewMapCreatures({ ...valid, customName: "   " })?.customName).toBeNull();
    expect(parseNewMapCreatures({ ...valid, customName: "x".repeat(41) })).toBeNull();
    expect(parseNewMapCreatures({ ...valid, customName: 7 })).toBeNull();
  });

  it("розмір токена береться зі статблоку, а вибір майстра його перекриває", () => {
    expect(findStatblockTokenSize("Величезний")).toBe("huge");
    expect(findStatblockTokenSize("Малий або Середній")).toBe("small");
    expect(findStatblockTokenSize(undefined)).toBe("medium");
    expect(parseCreatureTokenSize("gargantuan")).toBe("gargantuan");
    expect(parseCreatureTokenSize("colossal")).toBeNull();
    expect(parseTokenNameMode("wrap")).toBe("wrap");
    expect(parseTokenNameMode("tiny")).toBeNull();

    const [ownSize, chosenSize] = buildMapCreatureViews([row({ id: 1 }), row({ id: 2, number: 2, tokenSize: "huge" })], findEntry, true);
    expect([ownSize.tokenSize, chosenSize.tokenSize]).toEqual(["small", "huge"]);
  });

  it("перейменована істота ховає від гравців статблок і картинку, а номери рахує за своїм імʼям", () => {
    const rows = [
      row({ id: 1, number: 1, customName: "Тінь", tokenX: 0.2, tokenY: 0.2 }),
      row({ id: 2, number: 2, customName: "Тінь", tokenX: 0.4, tokenY: 0.4 }),
      row({ id: 3, number: 1, tokenX: 0.6, tokenY: 0.6 }),
    ];
    const players = buildMapCreatureViews(rows, findEntry, false);
    expect(players.map((view) => [view.label, view.creatureKey, view.imageUrl])).toEqual([
      ["Тінь 1", null, null],
      ["Тінь 2", null, null],
      ["Гоблін", "goblin", "/images/goblin.webp"],
    ]);
    expect(players[0].statblockName).toBeNull();

    const [gmShadow] = buildMapCreatureViews(rows, findEntry, true);
    expect(gmShadow).toMatchObject({ label: "Тінь 1", creatureKey: "goblin", statblockName: "Гоблін", imageUrl: "/images/goblin.webp" });
  });

  it("нумерує нові копії найменшими вільними номерами", () => {
    expect(findFreeCreatureNumbers([], 3)).toEqual([1, 2, 3]);
    expect(findFreeCreatureNumbers([1, 3], 2)).toEqual([2, 4]);
    expect(findFreeCreatureNumbers([2], 1)).toEqual([1]);
  });

  it("показує номер лише коли однакових істот кілька, а гравцям — тільки тих, що на мапі", () => {
    const rows = [
      row({ id: 1, number: 1, tokenX: 0.2, tokenY: 0.3 }),
      row({ id: 2, number: 2 }),
      row({ id: 3, creatureKey: "wolf", isAlly: true, tokenX: 0.5, tokenY: 0.5 }),
      row({ id: 4, creatureKey: "goblin", ruleset: "RULES_2024", tokenX: 0.1, tokenY: 0.1 }),
    ];
    const gmViews = buildMapCreatureViews(rows, findEntry, true);
    expect(gmViews.map((view) => [view.label, view.badge])).toEqual([["Гоблін 1", 1], ["Гоблін 2", 2], ["Вовк", null], ["Гоблін", null]]);
    expect(gmViews[0].token).toEqual({ x: 0.2, y: 0.3 });
    expect(gmViews[2]).toMatchObject({ isAlly: true, isRoundImage: true, imageUrl: "/images/wolf.webp" });

    const playerViews = buildMapCreatureViews(rows, findEntry, false);
    expect(playerViews.map((view) => view.id)).toEqual([1, 3, 4]);
    expect(playerViews[0].label).toBe("Гоблін 1");
  });

  it("лишає ключ замість назви, якщо істоти вже немає в каталозі", () => {
    const [view] = buildMapCreatureViews([row({ creatureKey: "gone-beast" })], () => null, true);
    expect(view).toMatchObject({ label: "gone-beast", imageUrl: null, isRoundImage: false });
  });

  it("бере ініціали без номера копії", () => {
    expect(buildCreatureInitials("Гоблін 2")).toBe("ГО");
    expect(buildCreatureInitials("Молодий червоний дракон")).toBe("МЧ");
    expect(buildCreatureInitials("Вовк-перевертень 12")).toBe("ВП");
  });
});
