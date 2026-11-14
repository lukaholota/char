import { describe, expect, it } from "vitest";
import spells from "@/lib/generated/spells.json";
import { findCantripTier, findSpellDice, listSpellDice, planSpellRolls, type SpellDice } from "@/rules/spell-dice";

const spells2014 = (spells as Array<{ engName: string; level: number; description: string; ruleset?: string }>).filter((spell) => (spell.ruleset ?? "RULES_2014") === "RULES_2014");

function plan(engName: string, slotLevel: number, characterLevel = 5, spellcastingModifier = 3) {
  const spell = spells2014.find((candidate) => candidate.engName === engName)!;
  return planSpellRolls(findSpellDice(spell)!, { spellLevel: spell.level, slotLevel, characterLevel, spellcastingModifier });
}

const dice = (plan: ReturnType<typeof planSpellRolls>) =>
  plan.rolls.map((roll) => `${roll.label} ${[roll, ...(roll.secondDice ? [roll.secondDice] : [])].filter((part) => part.sides).map((part) => `${part.count}к${part.sides}`).join(" + ")}${roll.bonus ? `+${roll.bonus}` : ""}`);

describe("кубики заклинань 2014 до 9-го рівня", () => {
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

  it("заклинання 4–9 рівня кидають свої кубики й ростуть зі слотом", () => {
    expect(dice(plan("Cone of Cold", 5))).toEqual(["Шкода 8к8"]);
    expect(dice(plan("Cone of Cold", 7))).toEqual(["Шкода 10к8"]);
    expect(dice(plan("Disintegrate", 6))).toEqual(["Шкода 10к6+40"]);
    expect(dice(plan("Disintegrate", 8))).toEqual(["Шкода 16к6+40"]);
    expect(dice(plan("Finger of Death", 7))).toEqual(["Шкода 7к8+30"]);
    expect(dice(plan("Mass Cure Wounds", 6))).toEqual(["Лікування кожного 4к8+3"]);
    expect(plan("Meteor Swarm", 9)).toMatchObject({ save: "DEX" });
  });

  it("шкода двох типів — дві групи кубиків одного кидка", () => {
    expect(dice(plan("Ice Storm", 4))).toEqual(["Шкода 2к8 + 4к6"]);
    expect(dice(plan("Ice Storm", 6))).toEqual(["Шкода 4к8 + 4к6"]);
    expect(dice(plan("Flame Strike", 5))).toEqual(["Шкода 4к6 + 4к6"]);
    expect(dice(plan("Meteor Swarm", 9))).toEqual(["Шкода 20к6 + 20к6"]);
  });

  it("«Зцілення» — число без кубиків, що росте зі слотом", () => {
    expect(plan("Heal", 6).rolls).toEqual([{ key: "spell-0", label: "Лікування", count: 0, sides: 0, bonus: 70 }]);
    expect(dice(plan("Heal", 8))).toEqual(["Лікування +90"]);
    expect(dice(plan("Mass Heal", 9))).toEqual(["Запас лікування +700"]);
  });
});

const SAVE_STEMS = { STR: "Сил", DEX: "Спритн", CON: "Статур", INT: "Інтелект", WIS: "Мудр", CHA: "Харизм" } as const;

/// Кубики в описі є, але це не шкода й не лікування заклинанням.
const WITHOUT_ROLLS = [
  "Bless", "Gift of Alacrity", "Enlarge/Reduce", "Alter Self", "Enhance Ability", "Kinetic Jaunt", "Web", "Meld Into Stone",
  "Summon Greater Demon", "Animate Objects", "Infernal Calling", "Control Weather", "Wish",
];

/// Вищий слот додає цілі, а не кубики.
const UPCAST_WITHOUT_DICE = ["Cordon of Arrows", "Tasha's Mind Whip", "Elemental Bane", "Bones of the Earth", "Chain Lightning", "Crown of Stars"];

describe("таблиця кубиків збігається з описами заклинань", () => {
  it("кожне заклинання таблиці є в каталозі 2014, а його кубики, ряткидок і атака — в описі", () => {
    const mismatches = listSpellDice("RULES_2014").flatMap(([engName, spellDice]) => findMismatches(engName, spellDice));
    expect(mismatches).toEqual([]);
  });

  it("кожне заклинання з кубиками в описі або має кидки, або свідомо пропущене", () => {
    const known = new Set([...listSpellDice("RULES_2014").map(([engName]) => engName), ...WITHOUT_ROLLS]);
    const missing = spells2014.filter((spell) => /\d+к\d+/u.test(spell.description) && !known.has(spell.engName)).map((spell) => spell.engName);
    expect(missing).toEqual([]);
  });
});

/// Один кубик в описах буває без числа: «киньте к8».
function hasDice(text: string, count: number, sides: number): boolean {
  return text.includes(`${count}к${sides}`) || (count === 1 && new RegExp(`(^|\\D)к${sides}(\\D|$)`, "u").test(text));
}

function findMismatches(engName: string, spellDice: SpellDice): string[] {
  const spell = spells2014.find((candidate) => candidate.engName === engName);
  if (!spell) return [`${engName}: немає в каталозі`];
  const text = spell.description.replace(/<[^>]+>/gu, " ");
  const problems = spellDice.rolls.filter((roll) => roll.count > 0 && !hasDice(text, roll.count, roll.sides)).map((roll) => `${engName}: немає ${roll.count}к${roll.sides}`);
  for (const roll of spellDice.rolls) {
    if (roll.second && !text.includes(`${roll.second.count}к${roll.second.sides}`)) problems.push(`${engName}: немає ${roll.second.count}к${roll.second.sides}`);
    if (roll.sides === 0 && !text.includes(String(roll.bonus))) problems.push(`${engName}: немає числа ${roll.bonus}`);
  }
  if (spellDice.save && !new RegExp(`(ряткид|рятівн)[^.]{0,40}${SAVE_STEMS[spellDice.save]}`, "iu").test(text)) problems.push(`${engName}: немає ряткидка ${spellDice.save}`);
  if (spellDice.attack && !/атак/iu.test(text)) problems.push(`${engName}: немає атаки`);
  for (const roll of spellDice.rolls) if (roll.perSlot && !text.includes(`${roll.perSlot}к${roll.sides}`)) problems.push(`${engName}: немає посилення ${roll.perSlot}к${roll.sides}`);
  const hasUpcast = spellDice.rolls.some((roll) => roll.perSlot || roll.countFromSlot || roll.bonusPerSlot) || Boolean(spellDice.pieces?.perSlot);
  if (spell.level > 0 && !hasUpcast && /за кож\S* (рів|два)/iu.test(text) && !UPCAST_WITHOUT_DICE.includes(engName)) problems.push(`${engName}: опис посилюється слотом`);
  return problems;
}
