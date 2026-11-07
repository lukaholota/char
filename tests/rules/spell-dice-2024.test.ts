import { describe, expect, it } from "vitest";
import spells from "../../data/2024/normalized/spells.json";
import { findSpellDice, listSpellDice, planSpellRolls, type SpellDice } from "@/rules/spell-dice";

const spells2024 = spells as Array<{ engName: string; level: number; description: string }>;

function plan(engName: string, slotLevel: number, characterLevel = 5, spellcastingModifier = 3) {
  const spell = spells2024.find((candidate) => candidate.engName === engName)!;
  return planSpellRolls(findSpellDice({ ...spell, ruleset: "RULES_2024" })!, { spellLevel: spell.level, slotLevel, characterLevel, spellcastingModifier });
}

const dice = (plan: ReturnType<typeof planSpellRolls>) => plan.rolls.map((roll) => `${roll.label} ${roll.count}к${roll.sides}${roll.bonus ? `+${roll.bonus}` : ""}`);

describe("кубики заклинань 2024 до 3-го рівня", () => {
  it("лікування 2024 кидає вдвічі більше кубиків, ніж 2014", () => {
    expect(dice(plan("Cure Wounds", 2))).toEqual(["Лікування 4к8+3"]);
    expect(dice(plan("Healing Word", 1))).toEqual(["Лікування 2к4+3"]);
    expect(dice(plan("Mass Healing Word", 4))).toEqual(["Лікування кожного 3к4+3"]);
    expect(dice(plan("Prayer of Healing", 3))).toEqual(["Лікування кожного 3к8"]);
  });

  it("правила 2024 не протікають у 2014 і навпаки", () => {
    expect(findSpellDice({ engName: "Inflict Wounds", level: 1, ruleset: "RULES_2024" })).toMatchObject({ save: "CON" });
    expect(findSpellDice({ engName: "Inflict Wounds", level: 1, ruleset: "RULES_2014" })).toMatchObject({ attack: true });
    expect(findSpellDice({ engName: "Booming Blade", level: 0, ruleset: "RULES_2024" })).toBeNull();
    expect(findSpellDice({ engName: "Sleep", level: 1, ruleset: "RULES_2024" })).toBeNull();
    expect(findSpellDice({ engName: "Sorcerous Burst", level: 0, ruleset: "RULES_2014" })).toBeNull();
  });

  it("кари кидаються одразу, а Справжній удар додає промені лише з 5 рівня", () => {
    expect(plan("Divine Smite", 2)).toMatchObject({ rollsLater: false });
    expect(dice(plan("Divine Smite", 2))).toEqual(["Шкода 3к8", "Почварі чи невмерлому 1к8"]);
    expect(dice(plan("True Strike", 0, 4))).toEqual([]);
    expect(dice(plan("True Strike", 0, 11))).toEqual(["Променева 2к6"]);
    expect(dice(plan("Spiritual Weapon", 3))).toEqual(["Шкода 2к8+3"]);
  });
});

const SAVE_STEMS = { STR: "Сил", DEX: "Спритн", CON: "Статур", INT: "Інтелект", WIS: "Мудр", CHA: "Харизм" } as const;

/// Кубики в описі є, але це не шкода й не лікування заклинанням.
const WITHOUT_ROLLS = [
  "Blade Ward", "Guidance", "Resistance", "Shillelagh", "Bane", "Bless", "Alter Self", "Enlarge/Reduce",
  "Ray of Enfeeblement", "Web", "Blink", "Meld Into Stone",
];

/// Вищий слот додає цілі, а не кубики.
const UPCAST_WITHOUT_DICE = ["Cordon of Arrows"];

describe("таблиця кубиків 2024 збігається з описами заклинань", () => {
  it("кожне заклинання таблиці є в каталозі 2024, а його кубики, ряткидок, атака й модифікатор — в описі", () => {
    const mismatches = listSpellDice("RULES_2024").flatMap(([engName, spellDice]) => findMismatches(engName, spellDice));
    expect(mismatches).toEqual([]);
  });

  it("кожне заклинання 0–3 рівня з кубиками в описі або має кидки, або свідомо пропущене", () => {
    const known = new Set([...listSpellDice("RULES_2024").map(([engName]) => engName), ...WITHOUT_ROLLS]);
    const missing = spells2024.filter((spell) => spell.level <= 3 && /\d+к\d+/u.test(spell.description) && !known.has(spell.engName)).map((spell) => spell.engName);
    expect(missing).toEqual([]);
  });
});

function findMismatches(engName: string, spellDice: SpellDice): string[] {
  const spell = spells2024.find((candidate) => candidate.engName === engName);
  if (!spell) return [`${engName}: немає в каталозі`];
  if (spell.level > 3) return [`${engName}: рівень ${spell.level}`];
  const [base, upcast = ""] = spell.description.split(/\*\*(?:На вищих рівнях|Покращення замовляння)\.\*\*/u);
  const problems = spellDice.rolls.filter((roll) => roll.count > 0 && !base.includes(`${roll.count}к${roll.sides}`)).map((roll) => `${engName}: немає ${roll.count}к${roll.sides}`);
  if (spellDice.save && !new RegExp(`(ряткид|рятівн)[^.]{0,40}${SAVE_STEMS[spellDice.save]}`, "iu").test(base)) problems.push(`${engName}: немає ряткидка ${spellDice.save}`);
  if (spellDice.attack && !/атак/iu.test(base)) problems.push(`${engName}: немає атаки`);
  if (spellDice.rolls.some((roll) => roll.addsModifier) && !/модифікатор/iu.test(base)) problems.push(`${engName}: немає модифікатора`);
  for (const roll of spellDice.rolls) {
    if (roll.perSlot && !upcast.includes(`${roll.perSlot}к${roll.sides}`)) problems.push(`${engName}: немає посилення ${roll.perSlot}к${roll.sides}`);
    if ((roll.slotsPerStep ?? 1) > 1 && !/кожні два/iu.test(upcast)) problems.push(`${engName}: посилення не через рівень`);
  }
  const hasUpcast = spellDice.rolls.some((roll) => roll.perSlot || roll.countFromSlot || roll.bonusPerSlot) || Boolean(spellDice.pieces?.perSlot);
  if (spell.level > 0 && !hasUpcast && /за кож\S* (рів|слот)/iu.test(upcast) && !UPCAST_WITHOUT_DICE.includes(engName)) problems.push(`${engName}: опис посилюється слотом`);
  return problems;
}
