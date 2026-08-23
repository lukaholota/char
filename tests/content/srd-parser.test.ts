import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

import {
  ABILITY_KEYS,
  ParsedCreature,
  findEmptyRequiredFields,
} from "../../scripts/aidedd/creature-schema";
import { parseMonster2014 } from "../../scripts/aidedd/parse-monster-2014";
import { parseMonster2024 } from "../../scripts/aidedd/parse-monster-2024";
import { splitImmunityLine, splitTypeLine } from "../../scripts/aidedd/statblock-fields";
import { readAllSrdCreatures } from "../../scripts/srd/parse-srd-monsters";

const srdCreatures = readAllSrdCreatures();
const byName = new Map(srdCreatures.map((creature) => [creature.nameEng, creature]));

const FIXTURE_DIR = join(process.cwd(), "tests/fixtures/aidedd");

function readSrd(name: string): ParsedCreature {
  const creature = byName.get(name);
  if (!creature) throw new Error(`У SRD немає статблока "${name}"`);
  return creature;
}

function readFixture(edition: "2014" | "2024", slug: string): ParsedCreature {
  const html = readFileSync(join(FIXTURE_DIR, edition, `${slug}.html`), "utf-8");
  return edition === "2024" ? parseMonster2024(html, slug) : parseMonster2014(html, slug);
}

/// aidedd separates the passive Perception with a comma, SRD with a semicolon.
/// A source formatting difference, not a parser one.
function normalizeSenses(value: string): string {
  return value.replace(/;/g, ",");
}

const SECTIONS = [
  "traits",
  "actions",
  "bonusActions",
  "reactions",
  "legendaryActions",
] as const;

/// Sorted on purpose: aidedd and the SRD print the same Vampire bonus actions in
/// different order, and section order is presentation, not data.
function readEntryNames(creature: ParsedCreature, section: (typeof SECTIONS)[number]): string[] {
  return creature[section].map((entry) => entry.name).sort();
}

describe("KR12.1 — парсер SRD 5.2.1 як еталон", () => {
  it("розбирає всі 330 статблоків SRD", () => {
    expect(srdCreatures).toHaveLength(330);
  });

  it("не лишає жодного порожнього обов'язкового поля в жодному статблоці", () => {
    const broken = srdCreatures
      .map((creature) => ({ name: creature.nameEng, empty: findEmptyRequiredFields(creature) }))
      .filter((entry) => entry.empty.length > 0);

    expect(broken).toEqual([]);
  });

  it("дає унікальний слаг кожному статблоку", () => {
    const slugs = srdCreatures.map((creature) => creature.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("читає CR разом із XP, XP у лігві та бонусом майстерності", () => {
    const aboleth = readSrd("Aboleth");
    expect(aboleth.challenge).toBe("10");
    expect(aboleth.xp).toBe("5900");
    expect(aboleth.xpInLair).toBe("7200");
    expect(aboleth.proficiencyBonus).toBe("+4");

    const bandit = readSrd("Bandit");
    expect(bandit.challenge).toBe("1/8");
    expect(bandit.xp).toBe("25");
    expect(bandit.xpInLair).toBe("");
    expect(bandit.proficiencyBonus).toBe("+2");
  });

  it("розділяє рядок типу на розмір, тип і світогляд", () => {
    expect(splitTypeLine("Large Aberration, Lawful Evil")).toEqual({
      size: "Large",
      type: "Aberration",
      alignment: "Lawful Evil",
    });
    expect(splitTypeLine("Medium or Small Humanoid, Neutral")).toEqual({
      size: "Medium or Small",
      type: "Humanoid",
      alignment: "Neutral",
    });
    expect(splitTypeLine("Large Beast (Dinosaur), Unaligned")).toEqual({
      size: "Large",
      type: "Beast (Dinosaur)",
      alignment: "Unaligned",
    });
    expect(splitTypeLine("Huge dragon (Chromatic), chaotic evil")).toEqual({
      size: "Huge",
      type: "dragon (Chromatic)",
      alignment: "chaotic evil",
    });
  });

  it("розводить об'єднаний рядок імунітетів 2024 на ушкодження та стани", () => {
    expect(splitImmunityLine("Poison; Exhaustion, Poisoned")).toEqual({
      damage: "Poison",
      conditions: "Exhaustion, Poisoned",
    });
    expect(splitImmunityLine("Acid")).toEqual({ damage: "Acid", conditions: "" });
    expect(splitImmunityLine("Charmed, Frightened")).toEqual({
      damage: "",
      conditions: "Charmed, Frightened",
    });
  });

  it("заповнює нові поля 2024 рівно там, де вони є в джерелі", () => {
    expect(srdCreatures.filter((creature) => creature.damageVulnerability !== "")).toHaveLength(15);
    expect(srdCreatures.filter((creature) => creature.gear !== "")).toHaveLength(45);
    expect(srdCreatures.filter((creature) => creature.initiative !== "")).toHaveLength(330);
    expect(srdCreatures.filter((creature) => creature.xpInLair !== "")).toHaveLength(27);

    const skeleton = readSrd("Skeleton");
    expect(skeleton.damageVulnerability).toBe("Bludgeoning");
    expect(skeleton.damageImmunity).toBe("Poison");
    expect(skeleton.conditionImmunity).toBe("Exhaustion, Poisoned");
    expect(skeleton.gear).toBe("Shortbow, Shortsword");
  });

  it("збирає секцію бонусних дій", () => {
    expect(readSrd("Goblin Warrior").bonusActions.map((entry) => entry.name)).toEqual([
      "Nimble Escape",
    ]);
    expect(srdCreatures.filter((creature) => creature.bonusActions.length > 0)).toHaveLength(71);
  });

  it("тримає модифікатор узгодженим із характеристикою всюди, крім однієї помилки самого SRD", () => {
    const mismatched = srdCreatures.flatMap((creature) =>
      ABILITY_KEYS.filter((key) => {
        const ability = creature.abilities[key];
        return (
          !Number.isFinite(ability.save) ||
          ability.modifier !== Math.floor((ability.score - 10) / 2)
        );
      }).map((key) => `${creature.nameEng}.${key}`)
    );

    // Will-o'-Wisp має в SRD зсунутий рядок Сили: замість «1 (−5)» записано «−5», а клітинка
    // рятівного кидка загублена. Список фіксований, щоб нова така поломка не пройшла тихо.
    expect(mismatched).toEqual(["Will-o'-Wisp.strength"]);
  });

  it("читає характеристики навіть із двох статблоків зі злитими комірками таблиці", () => {
    const dragon = readSrd("Ancient Red Dragon");
    expect(dragon.abilities.dexterity).toEqual({ score: 10, modifier: 0, save: 7 });
    expect(dragon.abilities.wisdom).toEqual({ score: 15, modifier: 2, save: 9 });
    expect(dragon.savingThrows).toBe("Dex +7, Wis +9");

    const remorhaz = readSrd("Remorhaz");
    expect(remorhaz.abilities.dexterity).toEqual({ score: 13, modifier: 1, save: 1 });
    expect(remorhaz.abilities.charisma).toEqual({ score: 5, modifier: -3, save: -3 });
    expect(remorhaz.savingThrows).toBe("");
  });

  it("не дає рядку характеристики забрати числа наступного, коли клітинка загублена", () => {
    const wisp = readSrd("Will-o'-Wisp");

    // Рядок Сили обірваний у самому SRD, тож рятівний кидок береться з модифікатора,
    // а не з чисел Спритності, що стоять наступними в таблиці.
    expect(wisp.abilities.strength).toEqual({ score: -5, modifier: -5, save: -5 });
    expect(wisp.abilities.dexterity).toEqual({ score: 28, modifier: 9, save: 9 });
    expect(wisp.savingThrows).toBe("");
  });

  it("бере назву й текст кожного запису секції", () => {
    const aboleth = readSrd("Aboleth");
    expect(aboleth.traits.map((entry) => entry.name)).toEqual([
      "Amphibious",
      "Eldritch Restoration",
      "Legendary Resistance (3/Day, or 4/Day in Lair)",
      "Mucus Cloud",
      "Probing Telepathy",
    ]);
    expect(aboleth.actions[1]).toEqual({
      name: "Tentacle",
      text:
        "Melee Attack Roll: +9, reach 15 ft. Hit: 12 (2d6 + 5) Bludgeoning damage. " +
        "If the target is a Large or smaller creature, it has the Grappled condition " +
        "(escape DC 14) from one of four tentacles.",
    });
    expect(aboleth.legendaryActionUses).toContain("Legendary Action Uses: 3 (4 in Lair).");
  });
});

describe("KR12.1 — парсер сторінок aidedd 2024 проти еталона SRD", () => {
  const slugs = ["aboleth", "skeleton", "bandit", "goblin-warrior", "adult-red-dragon", "vampire"];

  it.each(slugs)("%s збігається з SRD за всіма полями статблока", (slug) => {
    const parsed = readFixture("2024", slug);
    const expected = readSrd(parsed.nameEng);

    expect(findEmptyRequiredFields(parsed)).toEqual([]);
    expect(parsed.ruleset).toBe("RULES_2024");
    expect(parsed.size).toBe(expected.size);
    expect(parsed.type).toBe(expected.type);
    expect(parsed.alignment).toBe(expected.alignment);
    expect(parsed.ac).toBe(expected.ac);
    expect(parsed.hp).toBe(expected.hp);
    expect(parsed.initiative).toBe(expected.initiative);
    expect(parsed.speed).toBe(expected.speed);
    expect(parsed.abilities).toEqual(expected.abilities);
    expect(parsed.savingThrows).toBe(expected.savingThrows);
    expect(parsed.skills).toBe(expected.skills);
    expect(parsed.damageVulnerability).toBe(expected.damageVulnerability);
    expect(parsed.damageResistance).toBe(expected.damageResistance);
    expect(parsed.damageImmunity).toBe(expected.damageImmunity);
    expect(parsed.conditionImmunity).toBe(expected.conditionImmunity);
    expect(parsed.gear).toBe(expected.gear);
    expect(normalizeSenses(parsed.senses)).toBe(normalizeSenses(expected.senses));
    expect(parsed.languages).toBe(expected.languages);
    expect(parsed.challenge).toBe(expected.challenge);
    expect(parsed.xp).toBe(expected.xp);
    expect(parsed.xpInLair).toBe(expected.xpInLair);
    expect(parsed.proficiencyBonus).toBe(expected.proficiencyBonus);
    for (const section of SECTIONS) {
      expect(readEntryNames(parsed, section)).toEqual(readEntryNames(expected, section));
    }
  });

  it("бере з aidedd те, чого в SRD немає: картинку, середовище, скарби й книгу", () => {
    const aboleth = readFixture("2024", "aboleth");
    expect(aboleth.imageUrl).toBe("https://www.aidedd.org/monster/img/aboleth.jpg");
    expect(aboleth.habitat).toBe("Underdark, Underwater");
    expect(aboleth.treasure).toBe("Relics");
    expect(aboleth.source).toBe("Monster Manual 2024 (BR)");
  });
});

describe("KR12.1 — парсер сторінок aidedd 2014", () => {
  it("читає статблок старого формату в той самий внутрішній тип", () => {
    const aboleth = readFixture("2014", "aboleth");

    expect(findEmptyRequiredFields(aboleth)).toEqual([]);
    expect(aboleth.ruleset).toBe("RULES_2014");
    expect(aboleth.size).toBe("Large");
    expect(aboleth.type).toBe("aberration");
    expect(aboleth.alignment).toBe("lawful evil");
    expect(aboleth.ac).toBe("17 (natural armor)");
    expect(aboleth.hp).toBe("135 (18d10 + 36)");
    expect(aboleth.savingThrows).toBe("Con +6, Int +8, Wis +6");
    expect(aboleth.challenge).toBe("10");
    expect(aboleth.xp).toBe("5900");
    expect(aboleth.proficiencyBonus).toBe("+4");
    expect(aboleth.abilities.strength).toEqual({ score: 21, modifier: 5, save: 5 });
    expect(aboleth.traits.map((entry) => entry.name)).toEqual([
      "Amphibious",
      "Mucous Cloud",
      "Probing Telepathy",
    ]);
    expect(aboleth.actions.map((entry) => entry.name)).toEqual([
      "Multiattack",
      "Tentacle",
      "Tail",
      "Enslave (3/Day)",
    ]);
    expect(aboleth.legendaryActions.map((entry) => entry.name)).toEqual([
      "Detect",
      "Tail Swipe",
      "Psychic Drain (Costs 2 Actions)",
    ]);
  });

  it("лишає порожніми поля, яких у 2014 не існує, і заповнює вразливість", () => {
    const skeleton = readFixture("2014", "skeleton");

    expect(skeleton.initiative).toBe("");
    expect(skeleton.gear).toBe("");
    expect(skeleton.xpInLair).toBe("");
    expect(skeleton.damageVulnerability).toBe("bludgeoning");
    expect(skeleton.damageImmunity).toBe("poison");
    expect(skeleton.conditionImmunity).toBe("exhaustion, poisoned");
    expect(skeleton.imageUrl).toBe("https://www.aidedd.org/dnd/images/skeleton.jpg");
  });

  it("виводить бонус майстерності з CR, бо сторінки 2014 його не друкують", () => {
    expect(readFixture("2014", "wight").proficiencyBonus).toBe("+2");
    expect(readFixture("2014", "adult-red-dragon").proficiencyBonus).toBe("+6");
  });
});
