import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { findCharacterCreationOptions } from "@/lib/content/creator-content";
import { getAllSpells } from "@/lib/spellsData";
import { buildReadyPresetDraft, readyPresetSchema } from "./ready-preset";
import { buildRecipeSchema } from "./schema";
import { buildReadyPresetOptions } from "./ready-preset-options";
import { isSavedPresetValid } from "./ready-preset-validation";
import { buildPresetSpellOptions, buildPresetSpellSelection } from "./ready-preset-spells";

function readPreset(slug: string) {
  const content = findCharacterCreationOptions("RULES_2014");
  const preset = readyPresetSchema.parse(JSON.parse(readFileSync(`data/rpgbot/ready-builds/${slug}.json`, "utf8")));
  const recipe = buildRecipeSchema.parse(JSON.parse(readFileSync(`data/rpgbot/builds/${preset.buildId}.json`, "utf8")));
  const draft = buildReadyPresetDraft(recipe, preset, content);
  return { draft, preset, content, options: buildReadyPresetOptions(draft, content) };
}

const candidates = getAllSpells("RULES_2014").map((spell) => ({ spellId: spell.spellId, engName: spell.engName, name: spell.name, level: spell.level,
  school: spell.school, ruleset: "RULES_2014" as const, spellLists: spell.spellClasses.map((entry) => entry.className) }));
const author = { sectionId: "section-race", explanation: "Author list", classCantripKeys: [], knownSpellKeys: [], spellbookKeys: [], preparedSpellKeys: [] };

describe("Canny and Favored Enemy count towards expertise and languages", () => {
  it("Deft Explorer gives one expertise and two languages, Natural Explorer none", () => {
    const canny = readPreset("ranger-hunter-leonin-2014");
    expect(canny.options.expertiseCount).toBe(1);
    expect(canny.draft.expertiseSchema?.expertises).toEqual(["PERCEPTION"]);
    expect(canny.options.languageCount).toBe(canny.preset.languages.length);
    const natural = readPreset("ranger-hunter-2014");
    expect(natural.options.expertiseCount).toBe(0);
  });
  it("Favored Enemy asks for one language that Favored Foe does not", () => {
    const enemy = readPreset("ranger-hunter-2014");
    expect(enemy.preset.classOptions).toContain("Favored Enemy");
    expect(enemy.options.languageCount).toBe(enemy.preset.languages.length);
    expect(enemy.options.languageCount).toBeGreaterThan(0);
  });
  it("rejects a saved Canny draft without its expertise or with a missing language", () => {
    const { draft, options } = readPreset("ranger-hunter-leonin-2014");
    expect(isSavedPresetValid(draft, draft, options)).toBe(true);
    expect(isSavedPresetValid({ ...draft, expertiseSchema: { expertises: [] } }, draft, options)).toBe(false);
    expect(isSavedPresetValid({ ...draft, languagesSchema: { languages: draft.languagesSchema!.languages.slice(1) } }, draft, options)).toBe(false);
  });
  it("locks the terrain and enemy groups because their options change expertise or languages", () => {
    const { options } = readPreset("ranger-hunter-leonin-2014");
    const locked = options.choiceGroups.classOptions.filter((group) => group.isLocked).map((group) => group.group);
    expect(locked).toEqual(["Налаштування Слідопита: ворог", "Налаштування Слідопита: місцевість"]);
  });
});

describe("race spell choices with their own spell list", () => {
  const astralElf = { race: "ASTRAL_ELF_SPELLJAMMER", subrace: null, chosenRaceOptionNames: [] };

  it("offers the three Astral Fire cantrips to a class that has no such spells on its list", () => {
    const options = buildPresetSpellOptions("BARBARIAN_2014", astralElf, candidates);
    expect(options.candidates.map((spell) => spell.engName).sort()).toEqual(["Dancing Lights", "Light", "Sacred Flame"]);
    const selection = buildPresetSpellSelection({ ...author, raceSpellKeys: ["light"] }, options);
    expect(selection.raceSpellIds).toEqual([candidates.find((spell) => spell.engName === "Light")!.spellId]);
    expect(() => buildPresetSpellSelection({ ...author, raceSpellKeys: ["fire-bolt"] }, options)).toThrow("Missing preset spell: fire-bolt");
  });

  it("offers a Half-Elf with the Cantrip descent the wizard cantrips, but not another descent", () => {
    const descent = buildPresetSpellOptions("ROGUE_2014", { race: "HALF_ELF_2014", subrace: null, chosenRaceOptionNames: ["Замовляння"] }, candidates);
    expect(buildPresetSpellSelection({ ...author, raceSpellKeys: ["booming-blade"] }, descent).raceSpellIds).toHaveLength(1);
    const skills = buildPresetSpellOptions("ROGUE_2014", { race: "HALF_ELF_2014", subrace: null, chosenRaceOptionNames: ["Універсальність навичок"] }, candidates);
    expect(skills.raceChoice).toBeNull();
    expect(() => buildPresetSpellSelection({ ...author, raceSpellKeys: ["booming-blade"] }, skills)).toThrow("Missing preset spell");
  });
});
