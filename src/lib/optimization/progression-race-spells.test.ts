import { describe, expect, it } from "vitest";
import type { SpecLevel } from "./build-spec-progression";
import { compileSpecWithLevels, readReadySpec } from "./progression-walk-fixture.test-helper";

const FIEND_TIEFLING = "warlock-tiefling-fiend-iconic-2014";
const GENIE = "warlock-genie-2014";

function changeLevel(slug: string, level: number, change: Partial<SpecLevel>): SpecLevel[] {
  return readReadySpec(slug).levels!.map((entry) => (entry.level === level ? { ...entry, ...change } : entry));
}

function listErrors(slug: string, levels: SpecLevel[]): string {
  return compileSpecWithLevels(slug, levels).report.errors.join("\n");
}

const sixthLevelWithCatchUp = (extra: string): Partial<SpecLevel> => ({ spells: { cantripKeys: [], knownSpellKeys: ["summon-undead", extra], spellbookKeys: [] } });

describe("a race that grants a spell takes over the one the class already knows", () => {
  it("lets the tiefling warlock learn one more spell after Darkness became a race spell on level 5", () => {
    expect(listErrors(FIEND_TIEFLING, changeLevel(FIEND_TIEFLING, 6, sixthLevelWithCatchUp("vampiric-touch")))).toBe("");
  });

  it("does not give that extra spell before the race grant", () => {
    const levels = changeLevel(FIEND_TIEFLING, 4, { spells: { cantripKeys: ["green-flame-blade"], knownSpellKeys: ["scorching-ray", "vampiric-touch"], spellbookKeys: [] } });
    expect(listErrors(FIEND_TIEFLING, levels)).toContain("Оберіть нових заклинань");
  });

  it("does not offer a spell that the race already granted", () => {
    const levels = changeLevel(FIEND_TIEFLING, 6, { spells: { cantripKeys: [], knownSpellKeys: ["darkness"], spellbookKeys: [] } });
    expect(listErrors(FIEND_TIEFLING, levels)).toContain("Це заклинання вже дає інше джерело");
  });
});

describe("a genie warlock is offered only the spells of the chosen kind", () => {
  it("rejects a spell of another genie kind", () => {
    const levels = changeLevel(GENIE, 12, { openSpellPicks: undefined, spells: { cantripKeys: [], knownSpellKeys: ["wall-of-stone"], spellbookKeys: [] } });
    expect(listErrors(GENIE, levels)).toContain("не з вашого списку класу");
  });
});
