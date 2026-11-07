import { describe, expect, it } from "vitest";
import spells from "@/lib/generated/spells.json";
import { findCantripTier, findSpellDice, listSpellDice, planSpellRolls, type SpellDice } from "@/rules/spell-dice";

const spells2014 = (spells as Array<{ engName: string; level: number; description: string; ruleset?: string }>).filter((spell) => (spell.ruleset ?? "RULES_2014") === "RULES_2014");

function plan(engName: string, slotLevel: number, characterLevel = 5, spellcastingModifier = 3) {
  const spell = spells2014.find((candidate) => candidate.engName === engName)!;
  return planSpellRolls(findSpellDice(spell)!, { spellLevel: spell.level, slotLevel, characterLevel, spellcastingModifier });
}

const dice = (plan: ReturnType<typeof planSpellRolls>) => plan.rolls.map((roll) => `${roll.label} ${roll.count}к${roll.sides}${roll.bonus ? `+${roll.bonus}` : ""}`);

describe("кубики заклинань 2014 до 3-го рівня", () => {
  it("Вогняна куля: 8к6 і ще к6 за кожен рівень слота понад третій, ряткидок Спритності", () => {
    expect(dice(plan("Fireball", 3))).toEqual(["Шкода 8к6"]);
    expect(dice(plan("Fireball", 5))).toEqual(["Шкода 10к6"]);
    expect(plan("Fireball", 3)).toMatchObject({ save: "DEX", attack: false, rollsLater: false });
  });

  it("Чарівна стріла кидає всі дротики разом, Пекучий промінь — по променю", () => {
    expect(dice(plan("Magic Missile", 2))).toEqual(["Шкода 4к4+4"]);
    expect(plan("Magic Missile", 2).pieces).toBeNull();
    expect(plan("Magic Missile", 2).darts).toBe(4);
    expect(plan("Scorching Ray", 3).darts).toBeUndefined();
    expect(plan("Scorching Ray", 3)).toMatchObject({ attack: true, pieces: { label: "Променів", count: 4 } });
    expect(dice(plan("Scorching Ray", 3))).toEqual(["Шкода 2к6"]);
  });

  it("замовляння ростуть від рівня персонажа, а не слота", () => {
    expect(dice(plan("Fire Bolt", 0, 4))).toEqual(["Шкода 1к10"]);
    expect(dice(plan("Fire Bolt", 0, 11))).toEqual(["Шкода 3к10"]);
    expect(plan("Eldritch Blast", 0, 17).pieces).toEqual({ label: "Променів", count: 4 });
    expect(dice(plan("Eldritch Blast", 0, 17))).toEqual(["Шкода 1к10"]);
    expect(dice(plan("Booming Blade", 0, 1))).toEqual(["Рух 1к8"]);
    expect(dice(plan("Booming Blade", 0, 5))).toEqual(["Влучання 1к8", "Рух 2к8"]);
    expect(dice(plan("Magic Stone", 0, 17))).toEqual(["Шкода 1к6+3"]);
    expect([1, 4, 5, 10, 11, 16, 17, 20].map(findCantripTier)).toEqual([1, 1, 2, 2, 3, 3, 4, 4]);
  });

  it("нерівні кроки посилення: кожні два рівні, таблиця слотів, стеля", () => {
    expect(dice(plan("Spiritual Weapon", 3))).toEqual(["Шкода 1к8+3"]);
    expect(dice(plan("Spiritual Weapon", 4))).toEqual(["Шкода 2к8+3"]);
    expect([2, 3, 4, 5, 7, 9].map((slot) => plan("Shadow Blade", slot).rolls[0].count)).toEqual([2, 3, 3, 4, 5, 5]);
    expect(plan("Hail of Thorns", 9).rolls[0].count).toBe(6);
    expect(dice(plan("False Life", 3))).toEqual(["Тимчасові хіти 1к4+14"]);
  });

  it("лікування додає модифікатор заклинань", () => {
    expect(dice(plan("Cure Wounds", 2))).toEqual(["Лікування 2к8+3"]);
  });

  it("заклинання вище 3-го рівня не мають кубиків", () => {
    expect(findSpellDice({ engName: "Cone of Cold", level: 5, ruleset: "RULES_2014" })).toBeNull();
  });
});

const SAVE_STEMS = { STR: "Сил", DEX: "Спритн", CON: "Статур", INT: "Інтелект", WIS: "Мудр", CHA: "Харизм" } as const;

/// Кубики в описі є, але це не шкода й не лікування заклинанням.
const WITHOUT_ROLLS = ["Bless", "Gift of Alacrity", "Enlarge/Reduce", "Alter Self", "Enhance Ability", "Kinetic Jaunt", "Web", "Meld Into Stone"];

/// Вищий слот додає цілі, а не кубики.
const UPCAST_WITHOUT_DICE = ["Cordon of Arrows", "Tasha's Mind Whip"];

describe("таблиця кубиків збігається з описами заклинань", () => {
  it("кожне заклинання таблиці є в каталозі 2014, а його кубики, ряткидок і атака — в описі", () => {
    const mismatches = listSpellDice("RULES_2014").flatMap(([engName, spellDice]) => findMismatches(engName, spellDice));
    expect(mismatches).toEqual([]);
  });

  it("кожне заклинання 0–3 рівня з кубиками в описі або має кидки, або свідомо пропущене", () => {
    const known = new Set([...listSpellDice("RULES_2014").map(([engName]) => engName), ...WITHOUT_ROLLS]);
    const missing = spells2014.filter((spell) => spell.level <= 3 && /\d+к\d+/u.test(spell.description) && !known.has(spell.engName)).map((spell) => spell.engName);
    expect(missing).toEqual([]);
  });
});

function findMismatches(engName: string, spellDice: SpellDice): string[] {
  const spell = spells2014.find((candidate) => candidate.engName === engName);
  if (!spell) return [`${engName}: немає в каталозі`];
  if (spell.level > 3) return [`${engName}: рівень ${spell.level}`];
  const text = spell.description.replace(/<[^>]+>/gu, " ");
  const problems = spellDice.rolls.filter((roll) => roll.count > 0 && !text.includes(`${roll.count}к${roll.sides}`)).map((roll) => `${engName}: немає ${roll.count}к${roll.sides}`);
  if (spellDice.save && !new RegExp(`(ряткид|рятівн)[^.]{0,40}${SAVE_STEMS[spellDice.save]}`, "iu").test(text)) problems.push(`${engName}: немає ряткидка ${spellDice.save}`);
  if (spellDice.attack && !/атак/iu.test(text)) problems.push(`${engName}: немає атаки`);
  for (const roll of spellDice.rolls) if (roll.perSlot && !text.includes(`${roll.perSlot}к${roll.sides}`)) problems.push(`${engName}: немає посилення ${roll.perSlot}к${roll.sides}`);
  const hasUpcast = spellDice.rolls.some((roll) => roll.perSlot || roll.countFromSlot || roll.bonusPerSlot) || Boolean(spellDice.pieces?.perSlot);
  if (spell.level > 0 && !hasUpcast && /за кож\S* (рів|два)/iu.test(text) && !UPCAST_WITHOUT_DICE.includes(engName)) problems.push(`${engName}: опис посилюється слотом`);
  return problems;
}
