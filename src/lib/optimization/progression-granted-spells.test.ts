import { describe, expect, it } from "vitest";
import type { SpecLevel } from "./build-spec-progression";
import { compileSpecWithLevels, readReadySpec, walkSpecLevels } from "./progression-walk-fixture.test-helper";

const LIGHT_CLERIC = "cleric-light-2014";
const ABERRANT_MIND = "sorcerer-warforged-aberrant-mind-2014";
const ILLUSION_WIZARD = "wizard-illusion-2014";
const lightClericLevels: SpecLevel[] = [
  { level: 2 },
  { level: 3 },
  { level: 4, abilityScoreIncrease: [{ ability: "WIS", amount: 2 }], spells: { cantripKeys: [], knownSpellKeys: [], spellbookKeys: [] }, openSpellPicks: [{ category: "cantrips", count: 1 }] },
];

describe("open spell picks skip what the subclass already grants", () => {
  it("does not offer Light to a Light Domain cleric", () => {
    const walk = walkSpecLevels(LIGHT_CLERIC, lightClericLevels);
    expect(walk.errors).toEqual([]);
    const [pick] = walk.openSelections;
    expect(pick.characterLevel).toBe(4);
    expect(pick.cantripKeys).toHaveLength(1);
    expect(pick.cantripKeys).not.toContain("light");
  });

  it("rejects a named spell that the subclass already grants", () => {
    const levels = lightClericLevels.map((entry) => (entry.level === 4 ? { ...entry, spells: { cantripKeys: ["light"], knownSpellKeys: [], spellbookKeys: [] }, openSpellPicks: undefined } : entry));
    const { report } = compileSpecWithLevels(LIGHT_CLERIC, levels);
    expect(report.errors.join("\n")).toContain("Це заклинання вже дає інше джерело");
  });

  it("rejects a spell that the subclass grants on a later class level", () => {
    const levels = readReadySpec(ABERRANT_MIND).levels!.map((entry) => (entry.level === 3 ? { ...entry, spells: { cantripKeys: [], knownSpellKeys: ["detect-thoughts"], spellbookKeys: [] } } : entry));
    expect(compileSpecWithLevels(ABERRANT_MIND, levels).report.errors.join("\n")).toContain("Це заклинання вже дає інше джерело");
  });

  it("frees the cantrip slot that the subclass takes over, as the server does", () => {
    const wizardLevels = readReadySpec(ILLUSION_WIZARD).levels!;
    const withCatchUpCantrip = wizardLevels.map((entry) => (entry.level === 3 ? { ...entry, spells: { cantripKeys: ["ray-of-frost"], knownSpellKeys: [], spellbookKeys: entry.spells?.spellbookKeys ?? [] } } : entry));
    expect(compileSpecWithLevels(ILLUSION_WIZARD, withCatchUpCantrip).report.errors).toEqual([]);
  });
});
