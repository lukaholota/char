import { describe, expect, it } from "vitest";
import { characterLevelOnly } from "@/rules/character-level";
import { findGrantedSpells, findSpellSources, findSpellcastingSources, type SpellcastingClass } from "@/rules/spell-sources";

const paladin: SpellcastingClass = { name: "PALADIN_2024", spellcastingType: "HALF", primaryCastingStat: "CHA" };
const sorcerer: SpellcastingClass = { name: "SORCERER_2024", spellcastingType: "FULL", primaryCastingStat: "CHA" };
const wizard: SpellcastingClass = { name: "WIZARD_2024", spellcastingType: "FULL", primaryCastingStat: "INT" };
const cleric: SpellcastingClass = { name: "CLERIC_2024", spellcastingType: "FULL", primaryCastingStat: "WIS" };
const fighter: SpellcastingClass = { name: "FIGHTER_2024", spellcastingType: "NONE", primaryCastingStat: null };

function classSources(characterClasses: SpellcastingClass[], ruleset: "RULES_2014" | "RULES_2024" = "RULES_2024") {
  return findSpellSources({ ruleset, characterClasses, raceTraits: [], raceChoiceOptions: [], featOptions: [] })
    .filter((source) => source.kind === "CLASS")
    .map((source) => ({ source: source.key, ability: source.ability }));
}

describe("KR27.5 — джерело заклинань на кожен клас мультикласу 2024 (§15.9)", () => {
  it("чарівник і клірик — два джерела з різними характеристиками (№21)", () => {
    expect(classSources([wizard, cleric])).toEqual([
      { source: "WIZARD_2024", ability: "INT" },
      { source: "CLERIC_2024", ability: "WIS" },
    ]);
  });

  it("паладин і чародій — два джерела, хоч характеристика й та сама (№12)", () => {
    expect(classSources([paladin, sorcerer])).toEqual([
      { source: "PALADIN_2024", ability: "CHA" },
      { source: "SORCERER_2024", ability: "CHA" },
    ]);
  });

  it("клас без чаклунства джерелом не стає, і порядок — за порядком узяття класів (№17)", () => {
    expect(classSources([fighter, wizard])).toEqual([{ source: "WIZARD_2024", ability: "INT" }]);
  });

  it("персонаж 2014 джерел не має — його заклинання рахуються за старою схемою", () => {
    expect(classSources([wizard, cleric], "RULES_2014")).toEqual([]);
  });
});

const eldritchKnight = { name: "ELDRITCH_KNIGHT", spellcastingType: "THIRD", primaryCastingStat: "INT" as const };
const champion = { name: "CHAMPION", spellcastingType: "NONE", primaryCastingStat: null };
const rogue: SpellcastingClass = { name: "ROGUE_2024", spellcastingType: "NONE", primaryCastingStat: null };
const arcaneTrickster = { name: "ARCANE_TRICKSTER", spellcastingType: "THIRD", primaryCastingStat: "INT" as const };
const magicInitiate = { featName: "MAGIC_INITIATE", effectKind: "SPELL_LIST", effectAbility: "WIS" as const, featGrantsSpells: false };

function sheetSources(characterClasses: SpellcastingClass[], ruleset: "RULES_2014" | "RULES_2024") {
  return findSpellcastingSources({ ruleset, characterClasses, raceTraits: [], raceChoiceOptions: [], featOptions: [] }).map(
    (source) => ({ source: source.key, name: source.name, ability: source.ability }),
  );
}

describe("KR31.5 — третинний заклинач чаклує характеристикою підкласу", () => {
  it("Лицар-Чаклун 2024 — джерело класу з Інтелектом підкласу", () => {
    expect(classSources([{ ...fighter, subclass: eldritchKnight }])).toEqual([{ source: "FIGHTER_2024", ability: "INT" }]);
  });

  it("джерело називається підкласом, бо саме він чаклує", () => {
    expect(sheetSources([{ ...rogue, subclass: arcaneTrickster }], "RULES_2024")).toEqual([
      { source: "ROGUE_2024", name: "ARCANE_TRICKSTER", ability: "INT" },
    ]);
  });

  it("підклас без чаклунства джерела не дає", () => {
    expect(classSources([{ ...fighter, subclass: champion }])).toEqual([]);
  });

  it("клас, що чаклує сам, не віддає характеристику підкласові", () => {
    expect(sheetSources([{ ...wizard, subclass: eldritchKnight }], "RULES_2024")).toEqual([
      { source: "WIZARD_2024", name: "WIZARD_2024", ability: "INT" },
    ]);
  });
});

describe("KR31.5 — аасімар 2024: «Світлоносець» дає Світло з Харизмою (L01-species-04)", () => {
  const lightSpellId = 1564;
  const lightBearer = { engName: "Aasimar: Light Bearer (2024)", name: "Світлоносець", spellIds: [lightSpellId] };
  const healingHands = { engName: "Aasimar: Healing Hands (2024)", name: "Цілющі руки", spellIds: [] };
  const aasimar = { raceTraits: [healingHands, lightBearer], raceChoiceOptions: [] };

  it("джерело виду несе Харизму, хоч вибору характеристики в аасімара немає", () => {
    const sources = findSpellSources({ ruleset: "RULES_2024", characterClasses: [], featOptions: [], ...aasimar });

    expect(sources).toEqual([{ key: lightBearer.engName, name: "Світлоносець", ability: "CHA", kind: "SPECIES" }]);
  });

  it("Світло видається на першому рівні з тією ж Харизмою", () => {
    const granted = findGrantedSpells({ ruleset: "RULES_2024", levels: characterLevelOnly(1), ...aasimar });

    expect(granted).toEqual([
      { spellId: lightSpellId, sourceKey: lightBearer.engName, sourceName: "Світлоносець", ability: "CHA" },
    ]);
  });
});

describe("KR31.5 — джерела для КС і атаки на листі в обох редакціях", () => {
  const cleric2014: SpellcastingClass = { name: "CLERIC_2014", spellcastingType: "FULL", primaryCastingStat: "WIS" };
  const sorcerer2014: SpellcastingClass = { name: "SORCERER_2014", spellcastingType: "FULL", primaryCastingStat: "CHA" };
  const fighter2014: SpellcastingClass = { name: "FIGHTER_2014", spellcastingType: "NONE", primaryCastingStat: null };

  it("мультиклас 2014 — по джерелу на клас, кожне зі своєю характеристикою (PHB 2014, с. 164)", () => {
    expect(sheetSources([cleric2014, sorcerer2014], "RULES_2014")).toEqual([
      { source: "CLERIC_2014", name: "CLERIC_2014", ability: "WIS" },
      { source: "SORCERER_2014", name: "SORCERER_2014", ability: "CHA" },
    ]);
  });

  it("Лицар-Чаклун 2014 — Інтелект, а не порожнє джерело", () => {
    expect(sheetSources([{ ...fighter2014, subclass: eldritchKnight }], "RULES_2014")).toEqual([
      { source: "FIGHTER_2014", name: "ELDRITCH_KNIGHT", ability: "INT" },
    ]);
  });

  it("воїн 2014 без чаклунського підкласу джерел не має", () => {
    expect(sheetSources([{ ...fighter2014, subclass: champion }], "RULES_2014")).toEqual([]);
  });

  it("2014 не бачить джерел виду й рис — вони поняття 2024", () => {
    const withFeat = { characterClasses: [cleric2014], raceTraits: [], raceChoiceOptions: [], featOptions: [magicInitiate] };
    expect(findSpellcastingSources({ ruleset: "RULES_2014", ...withFeat }).map((source) => source.key)).toEqual(["CLERIC_2014"]);
    expect(findSpellcastingSources({ ruleset: "RULES_2024", ...withFeat }).map((source) => source.key)).toEqual([
      "CLERIC_2014",
      "MAGIC_INITIATE",
    ]);
  });
});
