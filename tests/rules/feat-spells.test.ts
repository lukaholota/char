import { describe, expect, it } from "vitest";
import { findEarnedFeatSpells, type SpellGrantingFeat } from "@/rules/feat-spells";
import { findSpellSources } from "@/rules/spell-sources";

const MISTY_STEP = 101;
const INVISIBILITY = 102;

const feyMagic = { engName: "Fey Touched: Fey Magic (2024)", name: "Доторк феї: Магія фей", spellIds: [MISTY_STEP] };
const shadowMagic = { engName: "Shadow Touched: Shadow Magic (2024)", name: "Доторк тіні: Тіньова Магія", spellIds: [INVISIBILITY] };

const feyTouched: SpellGrantingFeat = { featName: "FEY_TOUCHED", featLabel: "Доторк феї", features: [feyMagic], increasedAbility: "WIS" };
const shadowTouched: SpellGrantingFeat = { featName: "SHADOW_TOUCHED", featLabel: "Доторк тіні", features: [shadowMagic], increasedAbility: "CHA" };

describe("KR31.5 — поіменні заклинання рис 2024 (L03-feats-10)", () => {
  it("Доторк феї дає Туманний крок з характеристикою, яку риса підвищила", () => {
    expect(findEarnedFeatSpells([feyTouched], [])).toEqual([
      { spellId: MISTY_STEP, sourceKey: "FEY_TOUCHED", sourceName: "Доторк феї", ability: "WIS" },
    ]);
  });

  it("дві риси — два заклинання, кожне зі своєю характеристикою", () => {
    expect(findEarnedFeatSpells([feyTouched, shadowTouched], []).map((spell) => [spell.spellId, spell.ability])).toEqual([
      [MISTY_STEP, "WIS"],
      [INVISIBILITY, "CHA"],
    ]);
  });

  it("заклинання, яке персонаж уже має, другим рядком не лягає (Р38)", () => {
    expect(findEarnedFeatSpells([feyTouched, shadowTouched], [MISTY_STEP]).map((spell) => spell.spellId)).toEqual([INVISIBILITY]);
  });

  it("риса без заклинань нічого не дає", () => {
    const alert: SpellGrantingFeat = { featName: "ALERT", featLabel: "Пильний", features: [{ engName: "Alert", name: "Пильний", spellIds: [] }], increasedAbility: null };
    expect(findEarnedFeatSpells([alert], [])).toEqual([]);
  });
});

describe("KR31.5 — риса із заклинаннями стає джерелом із характеристикою свого підвищення", () => {
  function featSources(featOptions: Parameters<typeof findSpellSources>[0]["featOptions"]) {
    return findSpellSources({ ruleset: "RULES_2024", characterClasses: [], raceTraits: [], raceChoiceOptions: [], featOptions });
  }

  it("підвищення Мудрості в Доторку феї робить рису джерелом FEY_TOUCHED · WIS", () => {
    expect(featSources([{ featName: "FEY_TOUCHED", effectKind: "ASI", effectAbility: "WIS", featGrantsSpells: true }])).toEqual([
      { key: "FEY_TOUCHED", name: "FEY_TOUCHED", ability: "WIS", kind: "FEAT" },
    ]);
  });

  it("підвищення в рисі без заклинань джерелом не стає — це лише +1 до значення", () => {
    expect(featSources([{ featName: "GRAPPLER", effectKind: "ASI", effectAbility: "DEX", featGrantsSpells: false }])).toEqual([]);
  });
});
