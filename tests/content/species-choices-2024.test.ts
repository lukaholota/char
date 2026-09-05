import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { LINEAGE_OPTION_FEATURE_ENG_NAMES } from "../../prisma/seed/speciesChoices2024";

/**
 * KR18.4 — інваріанти виборів видів 2024 у базі. Тест приймання `rules-2024/acceptance-ten`
 * ловить ті самі поломки, але через десять персонажів; тут вони видно одразу і з назвою рядка.
 */
describe("KR18.4 — вибори видів 2024 в базі", () => {
  it("кожен вибір виду 2024 знає, якій рисі він належить, і має англійський ключ", async () => {
    const orphans = await prisma.raceChoiceOption.findMany({
      where: { ruleset: "RULES_2024", OR: [{ traitFeatureId: null }, { optionNameEng: null }] },
      select: { choiceGroupName: true, optionName: true },
    });

    expect(orphans).toEqual([]);
  });

  it("родоводи, що дають заклинання, дають і вибір характеристики замовляння", async () => {
    const spellGrantingTraits = await prisma.raceChoiceOption.findMany({
      where: { ruleset: "RULES_2024", traits: { some: { feature: { givesSpells: { some: {} } } } } },
      select: { raceId: true, traitFeature: { select: { engName: true } } },
    });
    const abilityChoices = await prisma.raceChoiceOption.findMany({
      where: { ruleset: "RULES_2024", spellcastingAbility: { not: null } },
      select: { raceId: true, spellcastingAbility: true, traitFeature: { select: { engName: true } } },
    });

    const withAbilityChoice = new Set(abilityChoices.map((option) => option.traitFeature?.engName));
    const missing = spellGrantingTraits
      .map((option) => option.traitFeature?.engName)
      .filter((engName) => engName && !withAbilityChoice.has(engName));

    expect(Array.from(new Set(missing))).toEqual([]);
    // Інтелект, Мудрість або Харизма — рівно три варіанти на кожну таку рису.
    expect(new Set(abilityChoices.map((option) => option.spellcastingAbility))).toEqual(new Set(["INT", "WIS", "CHA"]));
  });

  it("родовід гнома не є безумовною рисою виду — інакше гном виходить і лісовим, і скельним", async () => {
    const unconditional = await prisma.raceTrait.findMany({
      where: { ruleset: "RULES_2024", feature: { engName: { in: LINEAGE_OPTION_FEATURE_ENG_NAMES } } },
      select: { feature: { select: { engName: true } }, race: { select: { name: true } } },
    });

    expect(unconditional).toEqual([]);
  });

  it("кожна риса походження 2024 доступна Людині як вибір виду й веде до самої риси", async () => {
    const originFeats = await prisma.feat.count({ where: { ruleset: "RULES_2024", category: "ORIGIN" } });
    const humanChoices = await prisma.raceChoiceOption.findMany({
      where: { ruleset: "RULES_2024", race: { name: "HUMAN_2024" }, choiceGroupName: "Риса походження" },
      select: {
        optionNameEng: true,
        traits: { select: { feature: { select: { grantsByFeat: { select: { name: true } } } } } },
      },
    });

    expect(humanChoices).toHaveLength(originFeats);
    const withoutFeat = humanChoices
      .filter((option) => option.traits.every((trait) => trait.feature.grantsByFeat.length === 0))
      .map((option) => option.optionNameEng);

    expect(withoutFeat).toEqual([]);
  });
});
