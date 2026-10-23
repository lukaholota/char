import { describe, expect, it } from "vitest";
import { findStaleDraftReset } from "./creation-draft-reset";

const racialChoices = { basicChoices: [], tashaChoices: [{ groupIndex: 0, choiceCount: 6, selectedAbilities: ["STR", "DEX", "CON", "INT", "WIS", "CHA"] as never[] }] };

describe("findStaleDraftReset", () => {
  it("зміна варіанту раси скидає расові бонуси, рису, расові навички й мови", () => {
    const previous = { raceId: 1, raceVariantId: null, racialBonusChoiceSchema: racialChoices, featId: 9, skills: ["ATHLETICS"], languagesSchema: { languages: ["ELVISH"] } as never, classId: 3, classChoiceSelections: { A: 1 } };
    expect(findStaleDraftReset(previous, { ...previous, raceVariantId: 5 })).toEqual({
      racialBonusChoiceSchema: undefined,
      featId: undefined,
      skills: [],
      languagesSchema: undefined,
    });
  });

  it("зміна підраси скидає расові опції й заклинання раси, але не клас", () => {
    const previous = { raceId: 1, subraceId: 2, raceChoiceSelections: { Cantrip: 4 }, raceSpellIds: [10], classId: 3, classSpells: { cantripIds: [1] } as never };
    expect(findStaleDraftReset(previous, { ...previous, subraceId: 7 })).toEqual({ raceChoiceSelections: {}, raceSpellIds: undefined });
  });

  it("зміна раси скидає підрасу й варіант, а заклинання риси від походження лишає", () => {
    const previous = { raceId: 1, subraceId: 2, featSpellSelections: { SPECIES_VERSATILITY: [1], BACKGROUND_ORIGIN: [2] } as never };
    expect(findStaleDraftReset(previous, { ...previous, raceId: 4 })).toEqual({
      subraceId: undefined,
      featSpellSelections: { BACKGROUND_ORIGIN: [2] },
    });
  });

  it("зміна підкласу скидає заклинання класу, але навички лишає підкласовому кроку", () => {
    const previous = { classId: 3, subclassId: 5, classSpells: { cantripIds: [1] } as never, skills: ["ARCANA"] };
    expect(findStaleDraftReset(previous, { ...previous, subclassId: 6 })).toEqual({ classSpells: undefined });
  });

  it("зміна класу скидає все класове", () => {
    const previous = { classId: 3, subclassId: 5, classChoiceSelections: { A: 1 }, weaponMasteryWeaponIds: [2], equipment: [1] };
    expect(findStaleDraftReset(previous, { ...previous, classId: 4 })).toEqual({
      subclassId: undefined,
      classChoiceSelections: {},
      weaponMasteryWeaponIds: [],
      equipment: [],
    });
  });

  it("поле, яке змінилось разом із джерелом (пресет), лишається", () => {
    const previous = { raceId: 1, racialBonusChoiceSchema: racialChoices };
    const next = { raceId: 2, racialBonusChoiceSchema: { basicChoices: [], tashaChoices: [] } };
    expect(findStaleDraftReset(previous, next)).toEqual({});
  });

  it("порожні значення не вважаються зміною джерела", () => {
    const previous = { raceId: 1, raceVariantId: undefined, raceChoiceSelections: undefined, skills: ["ATHLETICS"] };
    expect(findStaleDraftReset(previous, { ...previous, raceVariantId: null, raceChoiceSelections: {} })).toEqual({});
  });
});
