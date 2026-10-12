import { readFileSync, existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { findCharacterCreationOptions } from "@/lib/content/creator-content";
import { fullCharacterSchema } from "@/lib/zod/schemas/persCreateSchema";
import { buildCreationAbilityScores } from "@/rules/character-creation";
import { buildRecipeSchema } from "./schema";
import { buildReadyPresetDraft, readyPresetSchema } from "./ready-preset";
import { buildReadyPresetSkillChoices } from "./ready-preset-skills";
import { buildReadyPresetOptions } from "./ready-preset-options";

describe.skipIf(!existsSync("data/rpgbot/ready-builds/monk-shadow-2014.json"))("ready Monk preset", () => {
  const read = (path: string) => JSON.parse(readFileSync(path, "utf8"));
  it("fills source skills, exact feat option and all starting equipment groups", () => {
    const preset = readyPresetSchema.parse(read("data/rpgbot/ready-builds/monk-shadow-2014.json"));
    const recipe = buildRecipeSchema.parse(read("data/rpgbot/builds/build-monk-shadow-2014.json"));
    const content = findCharacterCreationOptions("RULES_2014");
    const draft = buildReadyPresetDraft(recipe, preset, content);
    expect(fullCharacterSchema.safeParse(draft).success).toBe(true);
    expect(draft.skills?.sort()).toEqual(["INSIGHT", "STEALTH", "SLEIGHT_OF_HAND", "PERCEPTION", "INVESTIGATION"].sort());
    const feat = content.feats.find((entry) => entry.featId === draft.featId)!;
    const optionId = Object.values(draft.featChoiceSelections)[0];
    expect(feat.featChoiceOptions.find((entry) => entry.choiceOptionId === optionId)?.choiceOption.optionNameEng).toBe("Devil's Sight");
    const monk = content.classes.find((entry) => entry.classId === draft.classId)!;
    expect(Object.keys(draft.equipmentSchema!.choiceGroupToId)).toHaveLength(new Set(monk.startingEquipmentOption.map((row) => row.choiceGroup)).size);
    expect(content.weapons.find((entry) => entry.weaponId === draft.equipmentSchema!.anyWeaponSelection["1"][0])?.name).toBe("QUARTERSTAFF");
    const chosenRows = Object.values(draft.equipmentSchema!.choiceGroupToId).flat();
    expect(monk.startingEquipmentOption.filter((row) => chosenRows.includes(row.optionId)).map((row) => row.equipmentPack?.name ?? row.weapon?.name ?? "ANY_WEAPON")).toEqual(["ANY_WEAPON", "EXPLORERS_PACK", "DART"]);
    const human = content.races.find((entry) => entry.raceId === draft.raceId)!;
    const variant = human.raceVariants.find((entry) => entry.raceVariantId === draft.raceVariantId)!;
    const scores = buildCreationAbilityScores({ ruleset: "RULES_2014", asiSystem: draft.asiSystem, pointBuy: draft.asi, simple: [], isDefaultASI: true, raceASI: human.ASI, variantASI: variant.overridesRaceASI, racialChoices: draft.racialBonusChoiceSchema, subraceReplacesASI: false, feats: [] }).scores;
    expect(scores).toEqual({ STR: 8, DEX: 16, CON: 15, INT: 8, WIS: 16, CHA: 8 });
    expect(draft.subclassId).toBeUndefined(); expect(draft.levelUpPath).toBeUndefined();
  });
  it("rejects an edition or revision mismatch before populating the creator", () => {
    const preset = readyPresetSchema.parse(read("data/rpgbot/ready-builds/monk-shadow-2014.json"));
    const recipe = buildRecipeSchema.parse(read("data/rpgbot/builds/build-monk-shadow-2014.json"));
    const content = findCharacterCreationOptions("RULES_2014");
    expect(() => buildReadyPresetDraft({ ...recipe, ruleset: "RULES_2024" }, preset, content)).toThrow("revision mismatch");
    expect(() => buildReadyPresetDraft({ ...recipe, revisionId: "changed" }, preset, content)).toThrow("revision mismatch");
  });
  it("uses source sections from the current local translation", () => {
    const preset = readyPresetSchema.parse(read("data/rpgbot/ready-builds/monk-shadow-2014.json"));
    const document = read("data/rpgbot/uk/rpgbot-monk-shadow-2014.json");
    const sectionIds = document.translations.at(-1).sections.map((section: { sectionId: string }) => section.sectionId);
    expect(sectionIds).toEqual(expect.arrayContaining([preset.skillSection, preset.featSection, preset.equipmentSection]));
  });
  it("removes the replacement skill when class choices no longer duplicate the background", () => {
    const preset = readyPresetSchema.parse(read("data/rpgbot/ready-builds/monk-shadow-2014.json"));
    const recipe = buildRecipeSchema.parse(read("data/rpgbot/builds/build-monk-shadow-2014.json"));
    const content = findCharacterCreationOptions("RULES_2014");
    const sources = buildReadyPresetOptions(buildReadyPresetDraft(recipe, preset, content), content).skills;
    const changed = buildReadyPresetSkillChoices({ selectedClass: ["INSIGHT", "HISTORY"], race: ["INVESTIGATION"], background: ["PERCEPTION"] }, sources);
    expect(changed.choices.background).toEqual([]);
    expect(changed.skills).toHaveLength(5);
    expect(changed.skills).not.toContain("PERCEPTION");
    const restored = buildReadyPresetSkillChoices({ ...changed.choices, selectedClass: ["INSIGHT", "STEALTH"] }, sources);
    expect(restored.choices.background).toEqual(["PERCEPTION"]);
    expect(restored.skills).toHaveLength(5);
  });
});
