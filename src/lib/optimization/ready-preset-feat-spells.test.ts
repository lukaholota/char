import { describe, expect, it } from "vitest";
import { findCharacterCreationOptions } from "@/lib/content/creator-content";
import { getAllSpells } from "@/lib/spellsData";
import { buildReadyPresetDraft } from "./ready-preset";
import { buildReadyPresetOptions } from "./ready-preset-options";
import { isSavedPresetValid } from "./ready-preset-validation";
import { findReadyPresetProblems } from "./preset-diagnostics";
import { buildFeatSpellsForList } from "./ready-preset-spells";
import { buildFeatPresetFixture } from "./ready-preset-feat-fixture.test-helper";
import { findFeatSpellRule2014 } from "@/rules/feat-spells-2014";

const content = findCharacterCreationOptions("RULES_2014");
const spellId = (engName: string) => getAllSpells("RULES_2014").find((spell) => spell.engName === engName)!.spellId;

const magicInitiate = { featKey: "MAGIC_INITIATE", featOptionName: null, featSpellKeys: ["guidance", "light", "bless"] };
const feyTouched = { featKey: "FEY_TOUCHED", featOptionName: "FEY_TOUCHED Ability (Wisdom)", featSpellKeys: ["charm-person"] };
const telekinetic = { featKey: "TELEKINETIC", featOptionName: "TELEKINETIC Ability (Charisma)", featSpellKeys: [] };

function assemble(fixture: Parameters<typeof buildFeatPresetFixture>[0]) {
  const { recipe, preset } = buildFeatPresetFixture(fixture);
  const draft = buildReadyPresetDraft(recipe, preset, content);
  return { recipe, preset, draft, options: buildReadyPresetOptions(draft, content) };
}

describe("ready preset with spells from a 2014 feat", () => {
  it("puts the chosen spells under the feat source in the draft", () => {
    const { draft } = assemble(magicInitiate);
    expect(draft.featSpellSelections).toEqual({ CLASS_ASI: [spellId("Guidance"), spellId("Light"), spellId("Bless")] });
  });

  it("keeps a named-only feat in the draft with an empty choice so the server grants its spell", () => {
    const { draft, options } = assemble(telekinetic);
    expect(draft.featSpellSelections).toEqual({ CLASS_ASI: [] });
    expect(options.spells.featChoice?.namedSpells.map((spell) => spell.engName)).toEqual(["Mage Hand"]);
  });

  it("accepts the saved draft and rejects other lists, other schools, a missing choice and a dropped spell", () => {
    const { draft, options } = assemble(magicInitiate);
    expect(isSavedPresetValid(draft, draft, options)).toBe(true);
    expect(isSavedPresetValid({ ...draft, featSpellSelections: { CLASS_ASI: [spellId("Guidance"), spellId("Mage Hand"), spellId("Bless")] } }, draft, options)).toBe(false);
    expect(isSavedPresetValid({ ...draft, featSpellSelections: { CLASS_ASI: draft.featSpellSelections!.CLASS_ASI!.slice(1) } }, draft, options)).toBe(false);
    expect(isSavedPresetValid({ ...draft, featSpellSelections: undefined }, draft, options)).toBe(false);
    const fey = assemble(feyTouched);
    expect(isSavedPresetValid({ ...fey.draft, featSpellSelections: { CLASS_ASI: [spellId("False Life")] } }, fey.draft, fey.options)).toBe(false);
  });

  it("refuses to build a preset whose feat spells break the feat rule", () => {
    expect(() => assemble({ ...magicInitiate, featSpellKeys: ["guidance", "mage-hand", "bless"] })).toThrow("Incomplete preset spells");
    expect(() => assemble({ ...magicInitiate, featSpellKeys: [] })).toThrow("Incomplete preset spells");
    expect(() => assemble({ ...feyTouched, featSpellKeys: ["false-life"] })).toThrow("Missing preset spell: false-life");
  });

  it("explains a broken feat choice in the author diagnostics", () => {
    const { recipe, preset } = buildFeatPresetFixture({ ...magicInitiate, featSpellKeys: ["guidance", "mage-hand", "bless"] });
    expect(findReadyPresetProblems({ recipe, preset, content }).errors.join("\n")).toContain("з одного списку");
  });

  it("builds a default selection for a chosen class list", () => {
    const { options } = assemble(magicInitiate);
    const rule = findFeatSpellRule2014("MAGIC_INITIATE")!;
    const druid = buildFeatSpellsForList(rule, "Друїд", options.spells.candidates, []);
    expect(druid).toHaveLength(3);
    expect(druid.every((id) => options.spells.candidates.find((spell) => spell.spellId === id)!.spellLists!.includes("Друїд"))).toBe(true);
    expect(buildFeatSpellsForList(rule, "Воїн", options.spells.candidates, [])).toEqual([]);
    expect(buildFeatSpellsForList(rule, "Друїд", options.spells.candidates, druid)).not.toEqual(druid);
  });
});
