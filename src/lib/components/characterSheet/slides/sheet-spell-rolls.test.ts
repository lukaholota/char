import { describe, expect, it } from "vitest";
import type { PersWithRelations } from "@/lib/actions/pers";
import type { SpellcastingStatRow } from "@/lib/logic/spellcasting-stats";
import { buildSheetSpellRoll } from "./sheet-spell-rolls";

const pers = {
  persId: 1, level: 5, ruleset: "RULES_2014", str: 8, dex: 14, con: 14, int: 18, wis: 16, cha: 10,
  statBonuses: {}, statModifierBonuses: {}, saveBonuses: {}, skillBonuses: {}, features: [], race: { traits: [] }, subrace: null,
  raceVariants: [], raceChoiceOptions: [], class: { features: [] }, subclass: null, multiclasses: [], classOptionalFeatures: [], choiceOptions: [], feats: [], magicItems: [],
} as unknown as PersWithRelations;

const statRows: SpellcastingStatRow[] = [
  { key: "wizard", label: "Чарівник", ability: "INT", attackBonus: 7, saveDC: 15 },
  { key: "cleric", label: "Жрець", ability: "WIS", attackBonus: 6, saveDC: 14 },
];

const fireball = { spellId: 10, spell: { spellId: 10, name: "Вогняна куля", engName: "Fireball", level: 3, ruleset: "RULES_2014" } };
const cureWounds = { spellId: 11, badgeText: "Жрець", spell: { spellId: 11, name: "Лікування ран", engName: "Cure Wounds", level: 1, ruleset: "RULES_2014" } };

describe("кидок заклинання з листа", () => {
  it("Вогняна куля слотом 4-го рівня кидає 9к6 і показує СК першого джерела", () => {
    const roll = buildSheetSpellRoll({ pers, persSpell: fireball, statRows, slot: { slotLevel: 4, slotLabel: "Слот 4-го рівня" } });
    expect(roll).toMatchObject({ title: "Вогняна куля", subtitle: "Слот 4-го рівня", targetSave: { abilityName: "Спритності", dc: 15 } });
    expect(roll?.actions).toMatchObject([{ count: 9, sides: 6, bonus: 0 }]);
  });

  it("бейдж класу бере модифікатор цього класу", () => {
    const roll = buildSheetSpellRoll({ pers, persSpell: cureWounds, statRows, slot: null });
    expect(roll?.actions).toMatchObject([{ label: "Лікування", count: 1, sides: 8, bonus: 3 }]);
  });

  it("домашнє заклинання з книжною назвою кубиків не має", () => {
    const homebrew = { spellId: -5, spell: { ...fireball.spell, spellId: -5 } };
    expect(buildSheetSpellRoll({ pers, persSpell: homebrew, statRows, slot: null })).toBeNull();
  });

  it("персонаж 2024 кидає за правилами 2024", () => {
    const pers2024 = { ...pers, ruleset: "RULES_2024" } as PersWithRelations;
    const cure2024 = { ...cureWounds, spell: { ...cureWounds.spell, spellId: 20050, ruleset: undefined } };
    expect(buildSheetSpellRoll({ pers: pers2024, persSpell: cure2024, statRows, slot: null })?.actions).toMatchObject([{ label: "Лікування", count: 2, sides: 8, bonus: 3 }]);
  });
});
