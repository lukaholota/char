import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { findCharacterCreationOptions } from "@/lib/content/creator-content";
import { buildReadyPresetDraft, readyPresetSchema } from "./ready-preset";
import { buildRecipeSchema } from "./schema";
import { buildReadyPresetOptions } from "./ready-preset-options";
import { findSavedPresetProblem, isSavedPresetCompatible, isSavedPresetValid } from "./ready-preset-validation";
import { buildReadyPresetSkillChoices } from "./ready-preset-skills";
import { buildEquipmentSelection, findSelectedEquipmentChoice } from "./ready-preset-equipment";
import { getAllSpells } from "@/lib/spellsData";

function readPreset(slug: string) {
  const content = findCharacterCreationOptions("RULES_2014");
  const preset = readyPresetSchema.parse(JSON.parse(readFileSync(`data/rpgbot/ready-builds/${slug}.json`, "utf8")));
  const recipe = buildRecipeSchema.parse(JSON.parse(readFileSync(`data/rpgbot/builds/${preset.buildId}.json`, "utf8")));
  const draft = buildReadyPresetDraft(recipe, preset, content);
  return { draft, preset, recipe, content, options: buildReadyPresetOptions(draft, content) };
}

describe("ready preset validation", () => {
  it("names the step that blocks creation instead of a generic message", () => {
    const { draft, options } = readPreset("druid-dreams-githzerai-2014");
    const lowerWisdom = { ...draft, asi: draft.asi.map((entry) => entry.ability === "WIS" ? { ...entry, value: 13 } : entry) };
    expect(findSavedPresetProblem(draft, draft, options)).toBeNull();
    expect(findSavedPresetProblem(lowerWisdom, draft, options)).toBe("Забагато підготовлених заклинань для вашої характеристики");
    expect(findSavedPresetProblem({ ...draft, languagesSchema: { languages: [] } }, draft, options)).toBe("Мови: оберіть усі мови без повторів.");
  });

  it("restores an unfinished selection but still rejects it at creation and rejects a changed identity", () => {
    const { draft, options } = readPreset("rogue-thief-2014");
    const unfinished = structuredClone(draft);
    unfinished.skillsSchema!.basicChoices.selectedClass.pop();
    expect(isSavedPresetCompatible(unfinished, draft)).toBe(true);
    expect(isSavedPresetValid(unfinished, draft, options)).toBe(false);
    expect(isSavedPresetCompatible({ ...unfinished, classId: 99999 }, draft)).toBe(false);
    expect(isSavedPresetCompatible({ ...unfinished, skillsSchema: undefined }, draft)).toBe(false);
    expect(isSavedPresetCompatible({ ...unfinished, isDefaultASI: !draft.isDefaultASI }, draft)).toBe(false);
    expect(isSavedPresetCompatible({ ...unfinished, ruleset: "RULES_2024" }, draft)).toBe(false);
  });
  it("requires a valid prepared subset of the wizard book and recomputes the limit after Intelligence changes", () => {
    const { draft, options } = readPreset("wizard-evocation-2014");
    expect(isSavedPresetValid(draft, draft, options)).toBe(true);
    expect(draft.initialPreparedSpellIds).toHaveLength(4);
    expect(isSavedPresetValid({ ...draft, initialPreparedSpellIds: [] }, draft, options)).toBe(false);
    expect(isSavedPresetValid({ ...draft, initialPreparedSpellIds: [999999] }, draft, options)).toBe(false);
    expect(isSavedPresetValid({ ...draft, initialPreparedSpellIds: [draft.initialPreparedSpellIds![0], draft.initialPreparedSpellIds![0]] }, draft, options)).toBe(false);
    const lowerIntelligence = { ...draft, asi: draft.asi!.map((score) => score.ability === "INT" ? { ...score, value: 13 } : score) };
    expect(isSavedPresetValid(lowerIntelligence, draft, options)).toBe(false);
    expect(isSavedPresetValid({ ...lowerIntelligence, initialPreparedSpellIds: draft.initialPreparedSpellIds!.slice(0, 3) }, draft, options)).toBe(true);
    expect(isSavedPresetValid({ ...draft, classSpells: { ...draft.classSpells!, spellbookIds: draft.classSpells!.spellbookIds.slice(1) } }, draft, options)).toBe(false);
  });
  it("keeps both Soldier replacements and rejects a missing one", () => {
    const { draft, options } = readPreset("fighter-champion-shield-2014");
    expect(isSavedPresetValid(draft, draft, options)).toBe(true);
    const changed = structuredClone(draft);
    changed.skillsSchema!.basicChoices.background.pop();
    expect(isSavedPresetValid(changed, draft, options)).toBe(false);
    expect(buildReadyPresetSkillChoices(changed.skillsSchema!.basicChoices, options.skills).choices.background).toHaveLength(2);
  });
  it("reconciles zero, one and two background overlaps", () => {
    const { draft, options } = readPreset("fighter-champion-shield-2014");
    const original = draft.skillsSchema!.basicChoices;
    expect(buildReadyPresetSkillChoices(original, options.skills).choices.background).toHaveLength(2);
    const changed = buildReadyPresetSkillChoices({ ...original, selectedClass: ["PERCEPTION", "HISTORY"] }, options.skills);
    expect(changed.choices.background).toHaveLength(1);
    expect(changed.skills).toHaveLength(5);
    const monk = readPreset("monk-shadow-2014");
    expect(buildReadyPresetSkillChoices({ ...monk.draft.skillsSchema!.basicChoices, selectedClass: ["HISTORY", "INSIGHT"] }, monk.options.skills).choices.background).toHaveLength(0);
  });
  it("requires four Rogue skills and distinct Expertise in current proficiencies", () => {
    const { draft, options } = readPreset("rogue-thief-2014");
    const missing = structuredClone(draft);
    missing.skillsSchema!.basicChoices.selectedClass.pop();
    expect(isSavedPresetValid(missing, draft, options)).toBe(false);
    expect(isSavedPresetValid({ ...draft, expertiseSchema: { expertises: ["STEALTH", "STEALTH"] } }, draft, options)).toBe(false);
    expect(isSavedPresetValid({ ...draft, expertiseSchema: { expertises: ["STEALTH", "ARCANA"] } }, draft, options)).toBe(false);
    expect(isSavedPresetValid({ ...draft, expertiseSchema: { expertises: ["STEALTH", "PERSUASION"] } }, draft, options)).toBe(true);
  });
  it("lets the player move flexible racial bonuses but keeps the race's groups and counts", () => {
    const { draft, options } = readPreset("rogue-inquisitive-2014");
    const [group, ...rest] = draft.racialBonusChoiceSchema!.tashaChoices;
    const moved = { ...group, selectedAbilities: (["STR", "DEX", "CON", "INT", "WIS", "CHA"] as const).filter((ability) => !group.selectedAbilities.includes(ability)).slice(0, group.choiceCount) };
    const withMoved = { ...draft, racialBonusChoiceSchema: { ...draft.racialBonusChoiceSchema!, tashaChoices: [moved, ...rest] } };
    expect(isSavedPresetValid(withMoved, draft, options)).toBe(true);
    expect(isSavedPresetCompatible(withMoved, draft)).toBe(true);
    const repeated = { ...moved, selectedAbilities: Array(group.choiceCount).fill(moved.selectedAbilities[0]) };
    const withRepeat = { ...draft, racialBonusChoiceSchema: { ...draft.racialBonusChoiceSchema!, tashaChoices: [repeated, ...rest] } };
    expect(isSavedPresetValid(withRepeat, draft, options)).toBe(group.choiceCount === 1);
    const withoutGroup = { ...draft, racialBonusChoiceSchema: { ...draft.racialBonusChoiceSchema!, tashaChoices: rest } };
    expect(isSavedPresetCompatible(withoutGroup, draft)).toBe(false);
  });

  it("rejects class, edition, subrace, fighting style and language drift", () => {
    const { draft, options } = readPreset("fighter-champion-shield-2014");
    for (const changed of [{ ...draft, classId: 3 }, { ...draft, ruleset: "RULES_2024" as const }, { ...draft, subraceId: 66 }, { ...draft, classChoiceSelections: {} }, { ...draft, languagesSchema: { languages: ["ELVISH"] } }]) {
      expect(isSavedPresetValid(changed, draft, options)).toBe(false);
    }
  });
  it("does not accept part of a compound equipment option or an extra weapon", () => {
    const { draft, options } = readPreset("rogue-thief-2014");
    const missing = structuredClone(draft);
    missing.equipmentSchema!.choiceGroupToId["4"].pop();
    expect(isSavedPresetValid(missing, draft, options)).toBe(false);
    const extra = structuredClone(draft);
    extra.equipmentSchema!.anyWeaponSelection["4"] = [1];
    expect(isSavedPresetValid(extra, draft, options)).toBe(false);
  });
  it("switches a Fighter from weapon and shield to two martial weapons with all rows", () => {
    const { draft, options } = readPreset("fighter-champion-shield-2014");
    const group = options.equipmentGroups.find((entry) => entry.group === "2")!;
    const choice = group.choices.find((entry) => entry.option === "b")!;
    const weaponIds = ["GREATAXE", "WARHAMMER"].map((name) => choice.weapons.find((weapon) => weapon.name === name)!.id);
    const selections = buildEquipmentSelection(draft.equipmentSchema!, group.group, choice, weaponIds);
    expect(findSelectedEquipmentChoice(selections, group)?.option).toBe("b");
    expect(isSavedPresetValid({ ...draft, equipmentSchema: selections }, draft, options)).toBe(true);
    selections.anyWeaponSelection["2"].pop();
    expect(isSavedPresetValid({ ...draft, equipmentSchema: selections }, draft, options)).toBe(false);
  });
  it("rejects a configuration without its starting class choice or a complete equipment group", () => {
    const { recipe, preset, content } = readPreset("fighter-champion-shield-2014");
    expect(() => buildReadyPresetDraft(recipe, { ...preset, classOptions: [] }, content)).toThrow("class options");
    expect(() => buildReadyPresetDraft(recipe, { ...preset, equipment: preset.equipment.slice(1) }, content)).toThrow("equipment groups");
  });
  describe("first-level subclass, class and race choices", () => {
    const otherOption = (groups: { group: string; options: { id: number }[] }[], group: string, current: number | number[]) =>
      groups.find((entry) => entry.group === group)!.options.find((option) => option.id !== [current].flat()[0])!.id;

    it("requires the Cleric's first-level domain and rejects a missing, other or late subclass", () => {
      const { draft, options, content } = readPreset("cleric-life-2014");
      expect(isSavedPresetValid(draft, draft, options)).toBe(true);
      const domains = content.classes.find((entry) => entry.classId === draft.classId)!.subclasses;
      expect(isSavedPresetValid({ ...draft, subclassId: undefined }, draft, options)).toBe(false);
      expect(isSavedPresetValid({ ...draft, subclassId: domains.find((entry) => entry.subclassId !== draft.subclassId)!.subclassId }, draft, options)).toBe(false);
    });
    it("rejects a subclass for a class that gets it later, before the server can accept it", () => {
      const { draft, options, content } = readPreset("druid-land-2014");
      const circle = content.classes.find((entry) => entry.classId === draft.classId)!.subclasses[0];
      expect(draft.subclassId).toBeUndefined();
      expect(isSavedPresetValid({ ...draft, subclassId: circle.subclassId }, draft, options)).toBe(false);
    });
    it("lets a platform-chosen Dragon Ancestor and Draconic Ancestry change within their groups only", () => {
      const { draft, options } = readPreset("sorcerer-draconic-2014");
      const { subclassOptions, raceOptions } = options.choiceGroups;
      const ancestor = draft.subclassChoiceSelections["Дракон-предок"];
      const ancestry = draft.raceChoiceSelections["Родовід дракона"];
      expect(isSavedPresetValid({ ...draft, subclassChoiceSelections: { "Дракон-предок": otherOption(subclassOptions, "Дракон-предок", ancestor) } }, draft, options)).toBe(true);
      expect(isSavedPresetValid({ ...draft, raceChoiceSelections: { "Родовід дракона": otherOption(raceOptions, "Родовід дракона", ancestry) } }, draft, options)).toBe(true);
      expect(isSavedPresetValid({ ...draft, subclassChoiceSelections: {} }, draft, options)).toBe(false);
      expect(isSavedPresetValid({ ...draft, raceChoiceSelections: {} }, draft, options)).toBe(false);
      expect(isSavedPresetValid({ ...draft, subclassChoiceSelections: { "Дракон-предок": ancestry } }, draft, options)).toBe(false);
      expect(isSavedPresetValid({ ...draft, subclassChoiceSelections: { "Дракон-предок": [ancestor, ancestor].flat() } }, draft, options)).toBe(false);
      expect(isSavedPresetValid({ ...draft, subclassChoiceSelections: { ...draft.subclassChoiceSelections, "Чужа група": 1 } }, draft, options)).toBe(false);
    });
    it("keeps a skill-changing Half-Elf option fixed", () => {
      const { draft, options } = readPreset("bard-lore-2014");
      const group = options.choiceGroups.raceOptions[0];
      expect(group.isLocked).toBe(true);
      const swiftFoot = group.options.find((option) => option.id !== draft.raceChoiceSelections[group.group])!.id;
      expect(isSavedPresetValid({ ...draft, raceChoiceSelections: { [group.group]: swiftFoot } }, draft, options)).toBe(false);
      expect(options.skills.raceCount).toBe(2);
    });
    it("requires both first-level Ranger options, keeps them fixed because they change expertise or languages, and ignores the later fighting style", () => {
      const { draft, options } = readPreset("ranger-hunter-2014");
      expect(options.choiceGroups.classOptions.map((entry) => entry.group)).toEqual(["Налаштування Слідопита: ворог", "Налаштування Слідопита: місцевість"]);
      expect(options.choiceGroups.classOptions.every((entry) => entry.isLocked)).toBe(true);
      const [enemyGroup] = options.choiceGroups.classOptions;
      const foe = otherOption(options.choiceGroups.classOptions, enemyGroup.group, draft.classChoiceSelections[enemyGroup.group]);
      expect(isSavedPresetValid({ ...draft, classChoiceSelections: { ...draft.classChoiceSelections, [enemyGroup.group]: foe } }, draft, options)).toBe(false);
      expect(isSavedPresetValid({ ...draft, classChoiceSelections: { [enemyGroup.group]: draft.classChoiceSelections[enemyGroup.group] } }, draft, options)).toBe(false);
      expect(isSavedPresetValid(draft, draft, options)).toBe(true);
    });
    it("rejects spell choices that the class cannot take and subclass choices the subclass does not grant", () => {
      const warlock = readPreset("warlock-fiend-2014");
      const magicMissile = getAllSpells("RULES_2014").find((spell) => spell.engName === "Magic Missile")!.spellId;
      const known = warlock.draft.classSpells!;
      expect(isSavedPresetValid({ ...warlock.draft, classSpells: { ...known, preparedIds: [magicMissile, known.preparedIds[1]] } }, warlock.draft, warlock.options)).toBe(false);
      expect(isSavedPresetValid({ ...warlock.draft, classSpells: { ...known, cantripIds: [...known.cantripIds, magicMissile] } }, warlock.draft, warlock.options)).toBe(false);
      expect(isSavedPresetValid({ ...warlock.draft, classOptionSpellIds: [magicMissile] }, warlock.draft, warlock.options)).toBe(false);
      const cleric = readPreset("cleric-life-2014");
      expect(isSavedPresetValid({ ...cleric.draft, classSpells: { ...cleric.draft.classSpells!, cantripIds: cleric.draft.classSpells!.cantripIds.slice(1) } }, cleric.draft, cleric.options)).toBe(false);
    });
  });
});
