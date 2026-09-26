import { afterAll, describe, expect, it } from "vitest";
import { Classes } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { disconnectDatabase } from "../user-data";
import { BLOOD_HUNTER_SUBCLASS_NAMES } from "../../prisma/seed/bloodHunter";

const SUBCLASS_LEVELS = [
  // PHB 2014, с. 48, 52, 56, 64, 70, 76, 82, 88, 94, 100, 106, 112.
  [Classes.BARBARIAN_2014, 3], [Classes.BARD_2014, 3], [Classes.CLERIC_2014, 1],
  [Classes.DRUID_2014, 2], [Classes.FIGHTER_2014, 3], [Classes.MONK_2014, 3],
  [Classes.PALADIN_2014, 3], [Classes.RANGER_2014, 3], [Classes.ROGUE_2014, 3],
  [Classes.SORCERER_2014, 1], [Classes.WARLOCK_2014, 1], [Classes.WIZARD_2014, 2],
] as const;

const ABILITY_SCORE_UP_LEVELS = [
  // PHB 2014, с. 48, 52, 56, 64, 70, 76, 82, 88, 94, 100, 106, 112.
  [Classes.BARBARIAN_2014, [4, 8, 12, 16, 19]],
  [Classes.BARD_2014, [4, 8, 12, 16, 19]],
  [Classes.CLERIC_2014, [4, 8, 12, 16, 19]],
  [Classes.DRUID_2014, [4, 8, 12, 16, 19]],
  [Classes.FIGHTER_2014, [4, 6, 8, 12, 14, 16, 19]],
  [Classes.MONK_2014, [4, 8, 12, 16, 19]],
  [Classes.PALADIN_2014, [4, 8, 12, 16, 19]],
  [Classes.RANGER_2014, [4, 8, 12, 16, 19]],
  [Classes.ROGUE_2014, [4, 8, 10, 12, 16, 19]],
  [Classes.SORCERER_2014, [4, 8, 12, 16, 19]],
  [Classes.WARLOCK_2014, [4, 8, 12, 16, 19]],
  [Classes.WIZARD_2014, [4, 8, 12, 16, 19]],
] as const;

const ABILITY_SCORE_UP_LEVELS_2024 = [
  // SRD 5.2.1, data/2024/srd/classes.md — «You gain this feature again at <Class> levels …».
  // 19-й рівень — Епічний дар, не ASI. Винахідника в SRD немає; додаткових ASI він не має.
  [Classes.BARBARIAN_2024, [4, 8, 12, 16]],
  [Classes.BARD_2024, [4, 8, 12, 16]],
  [Classes.CLERIC_2024, [4, 8, 12, 16]],
  [Classes.DRUID_2024, [4, 8, 12, 16]],
  [Classes.FIGHTER_2024, [4, 6, 8, 12, 14, 16]],
  [Classes.MONK_2024, [4, 8, 12, 16]],
  [Classes.PALADIN_2024, [4, 8, 12, 16]],
  [Classes.RANGER_2024, [4, 8, 12, 16]],
  [Classes.ROGUE_2024, [4, 8, 10, 12, 16]],
  [Classes.SORCERER_2024, [4, 8, 12, 16]],
  [Classes.WARLOCK_2024, [4, 8, 12, 16]],
  [Classes.WIZARD_2024, [4, 8, 12, 16]],
  [Classes.ARTIFICER_2024, [4, 8, 12, 16]],
] as const;

afterAll(disconnectDatabase);

describe("KR2.5 — subclass та ASI levels 12 PHB-класів", () => {
  // Artificer належить TCoE; він не входить у 12 класів PHB, визначених цим KR.
  it.each(SUBCLASS_LEVELS)("%s обирає підклас на %i рівні", async (className, expectedLevel) => {
    const characterClass = await classByName(className);
    expect(characterClass.subclassLevel).toBe(expectedLevel);
  });

  it.each(ABILITY_SCORE_UP_LEVELS)("%s має рівні ASI %j", async (className, expectedLevels) => {
    const characterClass = await classByName(className);
    expect(characterClass.abilityScoreUpLevels).toEqual(expectedLevels);
  });
});

describe("KR27.3 — рівні ASI 13 класів 2024 у базі", () => {
  it.each(ABILITY_SCORE_UP_LEVELS_2024)("%s має рівні ASI %j", async (className, expectedLevels) => {
    const characterClass = await classByName(className);
    expect(characterClass.abilityScoreUpLevels).toEqual(expectedLevels);
  });
});

describe("KR27.6 — третинні підкласи 2024 у базі", () => {
  it("лише Лицар-Чаклун і Таємний Пройдисвіт 2024 мають чаклування підкласу — THIRD з INT", async () => {
    const casters = await prisma.subclass.findMany({
      // Орден нечестивої душі Мисливця за кровʼю (носій O45) — PACT; його звіряє profane-soul-pact.
      where: { ruleset: "RULES_2024", name: { notIn: [...BLOOD_HUNTER_SUBCLASS_NAMES] }, spellcastingType: { not: "NONE" } },
      select: { name: true, spellcastingType: true, primaryCastingStat: true },
    });
    // `orderBy: { name }` сортує за порядком енама, не за абеткою.
    expect(casters.sort((left, right) => left.name.localeCompare(right.name))).toEqual([
      { name: "ARCANE_TRICKSTER", spellcastingType: "THIRD", primaryCastingStat: "INT" },
      { name: "ELDRITCH_KNIGHT", spellcastingType: "THIRD", primaryCastingStat: "INT" },
    ]);
  });
});

function classByName(name: Classes) {
  return prisma.class.findFirstOrThrow({
    where: { name },
    select: { subclassLevel: true, abilityScoreUpLevels: true },
  });
}
