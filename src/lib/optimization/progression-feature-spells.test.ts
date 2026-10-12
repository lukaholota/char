import { describe, expect, it } from "vitest";
import type { SpecLevel } from "./build-spec-progression";
import { compileSpecWithLevels, readReadySpec } from "./progression-walk-fixture.test-helper";

const LAND_DRUID = "druid-land-owlin-2014";
const ARCANE_ARCHER = "fighter-arcane-archer-2014";
const LORE_BARD = "bard-lore-sorcerers-apprentice-2014";

const landDruidLevels = (bonusCantrip: string[]): SpecLevel[] => [
  { level: 2, subclassKey: "CIRCLE_OF_THE_LAND", ...(bonusCantrip.length ? { classOptionSpellKeys: bonusCantrip } : {}) },
  { level: 3, subclassOptions: [{ optionNameEng: "Circle Spells — Forest" }] },
];
const arcaneArcherLevels = (loreCantrip: string[]): SpecLevel[] => [
  { level: 2 },
  { level: 3, subclassKey: "ARCANE_ARCHER", ...(loreCantrip.length ? { classOptionSpellKeys: loreCantrip } : {}), subclassOptions: [{ optionNameEng: "Piercing Arrow (Arcane Shot)" }, { optionNameEng: "Shadow Arrow (Arcane Shot)" }] },
];
const loreBardLevels = (secrets: string[]): SpecLevel[] => [
  ...readReadySpec(LORE_BARD).levels!.filter((entry) => entry.level <= 5),
  { level: 6, spells: { cantripKeys: [], knownSpellKeys: ["fear"], spellbookKeys: [] }, ...(secrets.length ? { classOptionSpellKeys: secrets } : {}) },
];

function listErrors(slug: string, levels: SpecLevel[]): string {
  return compileSpecWithLevels(slug, levels).report.errors.join("\n");
}

describe("levels name the spells that a subclass feature asks for", () => {
  it.each([
    ["the Circle of the Land bonus cantrip", LAND_DRUID, landDruidLevels(["shape-water"])],
    ["the Arcane Archer Lore cantrip", ARCANE_ARCHER, arcaneArcherLevels(["prestidigitation"])],
    ["the Lore Bard Additional Magical Secrets", LORE_BARD, loreBardLevels(["fire-bolt", "cure-wounds"])],
  ])("accepts %s", (_name, slug, levels) => {
    expect(listErrors(slug, levels)).toBe("");
  });

  it.each([
    ["Circle of the Land", LAND_DRUID, landDruidLevels([]), "classOptionSpellKeys: Оберіть 1 замовляння: Додаткове замовляння"],
    ["Arcane Archer", ARCANE_ARCHER, arcaneArcherLevels([]), "classOptionSpellKeys: Оберіть 1 замовляння: Знання містичного лучника"],
    ["Lore Bard", LORE_BARD, loreBardLevels([]), "classOptionSpellKeys: Оберіть 2 заклинання: Додаткові магічні таємниці"],
  ])("asks for the spells when a %s level names none", (_name, slug, levels, expected) => {
    expect(listErrors(slug, levels)).toContain(expected);
  });

  it.each([
    ["a cantrip outside the druid list", LAND_DRUID, landDruidLevels(["fire-bolt"]), "Обране заклинання не підходить: Додаткове замовляння"],
    ["a cantrip outside the Arcane Archer choice", ARCANE_ARCHER, arcaneArcherLevels(["light"]), "Обране заклинання не підходить: Знання містичного лучника"],
    ["a spell above the level the bard can cast", LORE_BARD, loreBardLevels(["fire-bolt", "wish"]), "Обране заклинання не підходить: Додаткові магічні таємниці"],
    ["a spell that does not exist", LAND_DRUID, landDruidLevels(["shape-watr"]), "classOptionSpellKeys: немає заклинання shape-watr"],
    ["a spell the character already has", LAND_DRUID, landDruidLevels(["guidance"]), "Це заклинання у вас уже є"],
  ])("rejects %s", (_name, slug, levels, expected) => {
    expect(listErrors(slug, levels)).toContain(expected);
  });

  it("rejects spells on a level whose features do not ask for any", () => {
    const levels = landDruidLevels(["shape-water"]).map((entry) => (entry.level === 3 ? { ...entry, classOptionSpellKeys: ["shape-water"] } : entry));
    expect(listErrors(LAND_DRUID, levels)).toContain("на цьому рівні жодна здатність класу чи підкласу не дає обрати заклинання");
  });

  it("prints the feature spells in the per level summary", () => {
    const { report } = compileSpecWithLevels(LAND_DRUID, landDruidLevels(["shape-water"]));
    expect(report.summary.join("\n")).toContain("Рівень 2 · Друїд 2: підклас CIRCLE_OF_THE_LAND; заклинання від уміння: shape-water");
  });
});
