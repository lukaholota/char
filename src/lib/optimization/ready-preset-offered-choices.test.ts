import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { findCharacterCreationOptions } from "@/lib/content/creator-content";
import { LanguageTranslations } from "@/lib/refs/translation";
import { listChoosableLanguages } from "@/rules/languages";
import type { PersFormData } from "@/lib/zod/schemas/persCreateSchema";
import { keepAllowedWeaponPicks, listAnyWeaponChoices } from "@/lib/components/characterCreator/any-weapon-picks";
import { buildReadyPresetDraft, readyPresetSchema } from "./ready-preset";
import { buildRecipeSchema } from "./schema";
import { countRemainingBuildPoints } from "./build-draft";
import { buildReadyPresetOptions, type ReadyPresetOptions } from "./ready-preset-options";
import { findPreparedSpellsWithinLimit, listSavedPresetIssues, type PresetStepKind } from "./ready-preset-validation";
import { buildReconciledSkillPatch, listSkillPickOptions, listTakenSkillPicks, type SkillPickGroup } from "./ready-preset-skills";
import { buildFeatSpellsForList, buildPresetSpellChoicePatch, buildPresetSpellGroups, isPresetSpellLevelOpen, listPresetPreparedPool, listPresetSpellGroupCandidates } from "./ready-preset-spells";

/// Кожен варіант, який крок пресета показує гравцеві, має проходити фінальну перевірку створення.
/// Інакше гравець бачить на кроці галочку, а на «Імʼя» — блок, як Адам із мовою Ґітська.

const content = findCharacterCreationOptions("RULES_2014");
const slugs = readdirSync("data/rpgbot/ready-builds").filter((file) => file.endsWith(".json")).map((file) => file.slice(0, -".json".length));

type Draft = Partial<PersFormData>;
type Change = { label: string; draft: Draft; downstream?: PresetStepKind[] };

function readPreset(slug: string) {
  const preset = readyPresetSchema.parse(JSON.parse(readFileSync(`data/rpgbot/ready-builds/${slug}.json`, "utf8")));
  const recipe = buildRecipeSchema.parse(JSON.parse(readFileSync(`data/rpgbot/builds/${preset.buildId}.json`, "utf8")));
  const draft = buildReadyPresetDraft(recipe, preset, content);
  return { draft, options: buildReadyPresetOptions(draft, content) };
}

function listLanguageChanges(draft: PersFormData, options: ReadyPresetOptions): Change[] {
  const chosen = draft.languagesSchema?.languages ?? [];
  if (!chosen.length) return [];
  const creatorFormLanguages = listChoosableLanguages("RULES_2014", Object.keys(LanguageTranslations), options.knownLanguages);
  return [...new Set([...options.languages, ...creatorFormLanguages])].filter((language) => !chosen.includes(language))
    .map((language) => ({ label: `мова ${language}`, draft: { ...draft, languagesSchema: { languages: [language, ...chosen.slice(1)] } } }));
}

function listExpertiseChanges(draft: PersFormData): Change[] {
  const chosen = draft.expertiseSchema?.expertises ?? [];
  if (!chosen.length) return [];
  return draft.skills.filter((skill) => !chosen.includes(skill as never))
    .map((skill) => ({ label: `експертиза ${skill}`, draft: { ...draft, expertiseSchema: { expertises: [skill as never, ...chosen.slice(1)] } } }));
}

function listSkillChanges(draft: PersFormData, options: ReadyPresetOptions): Change[] {
  const schema = draft.skillsSchema!;
  return Object.entries(schema.basicChoices).filter(([, skills]) => skills?.length).flatMap(([key, selected]) => {
    const group = key as SkillPickGroup;
    const taken = listTakenSkillPicks(group, schema.basicChoices, options.skills);
    return listSkillPickOptions(group, options.skills).filter((skill) => !selected!.includes(skill) && !taken.has(skill)).map((skill) => {
      const changed = { ...draft, skillsSchema: { ...schema, basicChoices: { ...schema.basicChoices, [group]: [skill, ...selected!.slice(1)] } } };
      return { label: `навичка ${group} ${skill}`, draft: { ...changed, ...buildReconciledSkillPatch(changed, options.skills) }, downstream: ["expertise"] };
    });
  });
}

function listAbilityChanges(draft: PersFormData, options: ReadyPresetOptions): Change[] {
  return draft.asi.flatMap((score, index) => [8, 9, 10, 11, 12, 13, 14, 15].filter((value) => value !== score.value).flatMap((value) => {
    const asi = draft.asi.map((entry, position) => position === index ? { ...entry, value } : entry);
    if (countRemainingBuildPoints(asi) < 0) return [];
    const changed = { ...draft, asi };
    return [{ label: `${score.ability}=${value}`, draft: { ...changed, initialPreparedSpellIds: findPreparedSpellsWithinLimit(changed, options, 1) } }];
  }));
}

function listEquipmentChanges(draft: PersFormData, options: ReadyPresetOptions): Change[] {
  const rows = content.classes.find((entry) => entry.classId === draft.classId)!.startingEquipmentOption;
  const current = draft.equipmentSchema!;
  const pick = (choiceGroupToId: Record<string, number[]>, picks: Record<string, number[]>) =>
    ({ ...draft, equipmentSchema: { ...current, choiceGroupToId, anyWeaponSelection: keepAllowedWeaponPicks(rows, choiceGroupToId, picks, content.weapons) } });
  return options.equipmentGroups.flatMap((group) => group.choices.flatMap((choice) => {
    const selection = { ...current.choiceGroupToId, [group.group]: choice.optionIds };
    const anyWeaponRow = rows.find((row) => row.chooseAnyWeapon && choice.optionIds.includes(row.optionId));
    const weaponChanges = anyWeaponRow ? listAnyWeaponChoices(anyWeaponRow, content.weapons).map((weapon) =>
      ({ label: `спорядження ${group.group}${choice.option} зброя ${weapon.name}`, draft: pick(selection, { ...current.anyWeaponSelection, [group.group]: [weapon.weaponId] }) })) : [];
    return [
      { label: `спорядження ${group.group}${choice.option}`, draft: pick(selection, current.anyWeaponSelection) },
      { label: `спорядження ${group.group}${choice.option} зі старою зброєю в групі`, draft: pick(selection, { ...current.anyWeaponSelection, [group.group]: [content.weapons[0].weaponId] }) },
      ...weaponChanges,
    ];
  }));
}

function listSpellChanges(draft: PersFormData, options: ReadyPresetOptions): Change[] {
  const spells = options.spells;
  const groups = buildPresetSpellGroups(spells, draft);
  const taken = groups.flatMap((group) => group.selected);
  const groupChanges = groups.filter((group) => group.selected.length).flatMap((group) => {
    const level = (spellId: number) => spells.candidates.find((spell) => spell.spellId === spellId)?.level;
    return listPresetSpellGroupCandidates(spells, group, taken).filter((spell) => !group.selected.includes(spell.spellId)).flatMap((spell) => {
      const replaced = group.selected.find((spellId) => level(spellId) === spell.level);
      if (replaced === undefined) return [];
      const freed = { ...group, selected: group.selected.filter((spellId) => spellId !== replaced) };
      if (!isPresetSpellLevelOpen(spells, freed, group, spell.level)) return [];
      return [{ label: `заклинання ${group.id} ${spell.engName}`, draft: { ...draft, ...buildPresetSpellChoicePatch(draft, group, [...freed.selected, spell.spellId]) } }];
    });
  });
  const prepared = draft.initialPreparedSpellIds ?? [];
  const pool = spells.usesSpellbook ? draft.classSpells?.spellbookIds ?? [] : listPresetPreparedPool(spells).map((spell) => spell.spellId);
  const preparedChanges = prepared.length ? pool.filter((spellId) => !prepared.includes(spellId))
    .map((spellId) => ({ label: `підготовлене ${spellId}`, draft: { ...draft, initialPreparedSpellIds: [spellId, ...prepared.slice(1)] } })) : [];
  const rule = spells.featChoice?.rule;
  const featTaken = taken.filter((spellId) => !draft.featSpellSelections?.CLASS_ASI?.includes(spellId));
  const featListChanges = (rule?.sharedSpellLists ?? []).map((list) =>
    ({ label: `список риси ${list}`, draft: { ...draft, featSpellSelections: { ...draft.featSpellSelections, CLASS_ASI: buildFeatSpellsForList(rule!, list, spells.candidates, featTaken) } } }));
  return [...groupChanges, ...preparedChanges, ...featListChanges];
}

function listChoiceChanges(draft: PersFormData, options: ReadyPresetOptions): Change[] {
  const fields = { classOptions: "classChoiceSelections", subclassOptions: "subclassChoiceSelections", raceOptions: "raceChoiceSelections" } as const;
  return (Object.keys(fields) as (keyof typeof fields)[]).flatMap((kind) => options.choiceGroups[kind]
    .filter((group) => !group.isLocked && group.options.length > 1 && typeof draft[fields[kind]][group.group] === "number")
    .flatMap((group) => group.options.map((option) => ({ label: `${kind} ${group.group} ${option.label}`, draft: { ...draft, [fields[kind]]: { ...draft[fields[kind]], [group.group]: option.id } } }))));
}

function findRejectedChanges(draft: PersFormData, options: ReadyPresetOptions): string[] {
  const changes: Change[] = [{ label: "без змін", draft }, ...listLanguageChanges(draft, options), ...listExpertiseChanges(draft), ...listSkillChanges(draft, options),
    ...listAbilityChanges(draft, options), ...listEquipmentChanges(draft, options), ...listSpellChanges(draft, options), ...listChoiceChanges(draft, options)];
  return changes.flatMap(({ label, draft: changed, downstream = [] }) => {
    const issues = listSavedPresetIssues(changed, draft, options).filter((issue) => !downstream.includes(issue.step!));
    return issues.length ? [`${label} → ${issues.map((issue) => issue.message).join("; ")}`] : [];
  });
}

describe("every choice a ready preset step offers is accepted at creation", () => {
  it.each(slugs)("%s", (slug) => {
    const { draft, options } = readPreset(slug);
    expect(findRejectedChanges(draft, options).slice(0, 8)).toEqual([]);
  });
});
