import type { CreatorContent } from "@/server/db/creator-content-query";
import type { PersFormData } from "@/lib/zod/schemas/persCreateSchema";
import { readRacialChoiceGroup } from "@/rules/racial-ability-choices";
import { findBackgroundCustomizationProblem, isCustomBackground } from "@/rules/background-customization";
import { SkillsEnum } from "@/lib/types/enums";
import { ToolCategory } from "@/lib/prisma-enums";
import { translateValue } from "@/lib/components/characterCreator/infoUtils";
import { findCharacterCreatorOptions } from "@/lib/content/creator-content";
import { findCatalogKeyProblems } from "./build-catalog-keys";
import { findProgressionProblems, type ProgressionReport } from "./progression-diagnostics";
import { buildLevelOneDraft } from "./build-assembly";
import { buildReadyPresetDraft, buildPresetSkillsSchema, readyPresetSchema, applyPresetBackgroundCustomization, listPresetFeatOptionNames, type ReadyPreset } from "./ready-preset";
import { buildReadyPresetOptions, type ReadyPresetOptions } from "./ready-preset-options";
import { buildReadyPresetSkillChoices, listAvailableSkillPicks } from "./ready-preset-skills";
import { buildPresetSpellSelection } from "./ready-preset-spells";
import { buildPresetAbilityScores, buildPresetAbilitySources } from "./ready-preset-abilities";
import { findPresetRacialAbilityMode, findPresetRacialAbilityProblem, listPresetRacialGroups } from "./ready-preset-racial-abilities";
import { countGroupPicks, findPresetClassSelections, findPresetRaceSelections, findPresetSubclassSelection, listFirstLevelClassOptions, listFirstLevelSubclassOptions, listRaceChoiceOptions } from "./ready-preset-identity";
import type { ArticleDocument, BuildRecipe } from "./types";

export type PresetReport = { errors: string[]; warnings: string[]; summary: string[] };
export type PresetDiagnosisInput = { recipe: BuildRecipe; preset: ReadyPreset; content: CreatorContent; fullContent?: CreatorContent; document?: ArticleDocument };

type Skill = ReadyPreset["skills"]["selectedClass"][number];

export function findReadyPresetProblems(rawInput: PresetDiagnosisInput): PresetReport {
  const input = { ...rawInput, preset: readyPresetSchema.parse(rawInput.preset) };
  const sourceProblems = [...findIdentityProblems(input), ...findSourceProblems(input)];
  const keyProblems = findRecipeKeyProblems(input);
  if (keyProblems.length) return { errors: [...sourceProblems, ...keyProblems], warnings: [], summary: [] };
  const start = buildStartDraft(input);
  const options = buildReadyPresetOptions({ ...start, skillsSchema: buildPresetSkillsSchema(input.preset) }, input.content);
  const choiceProblems = [
    ...findRacialAbilityProblems(input, start),
    ...findChoiceGroupProblems(input, start),
    ...findFeatOptionProblems(input, start),
    ...findBackgroundCustomizationProblems(input, start),
    ...findSkillProblems(input.preset, options),
    ...findExpertiseProblems(input.preset, options),
    ...findLanguageProblems(input.preset, options),
    ...findEquipmentProblems(input.preset, options),
    ...findSpellProblems(input.preset, options),
  ];
  const errors = [...sourceProblems, ...choiceProblems];
  const assembled = errors.length ? null : assembleDraft(input);
  if (assembled?.problem) errors.push(assembled.problem);
  const progression = assembled?.draft ? findPresetProgressionProblems(input, assembled.draft) : NO_PROGRESSION;
  errors.push(...progression.errors);
  const summary = assembled?.draft ? [...describeStart(input, assembled.draft, options), ...progression.summary] : [];
  return { errors, warnings: [...findPlatformChoiceWarnings(input.preset, options), ...progression.warnings], summary };
}

const NO_PROGRESSION: ProgressionReport = { errors: [], warnings: [], summary: [] };

function findPresetProgressionProblems({ recipe, preset, fullContent }: PresetDiagnosisInput, draft: PersFormData): ProgressionReport {
  return findProgressionProblems({ recipe, preset, draft, content: fullContent ?? findCharacterCreatorOptions("RULES_2014") });
}

function findIdentityProblems({ recipe, preset }: PresetDiagnosisInput): string[] {
  const problems: string[] = [];
  if (recipe.ruleset !== "RULES_2014") problems.push(`Рецепт ${recipe.buildId} має редакцію ${recipe.ruleset}; пресети підтримують лише RULES_2014`);
  if (recipe.buildId !== preset.buildId) problems.push(`buildId пресета (${preset.buildId}) не збігається з рецептом (${recipe.buildId})`);
  if (recipe.revisionId !== preset.revisionId) problems.push(`revisionId пресета (${preset.revisionId}) не збігається з рецептом (${recipe.revisionId}); перекомпілюйте специфікацію`);
  if (!recipe.details) problems.push(`Рецепт ${recipe.buildId} не має details (стартового знімка)`);
  return problems;
}

function findSourceProblems({ recipe, preset, document }: PresetDiagnosisInput): string[] {
  if (!document) return [];
  const primary = recipe.sourceRefs[0];
  const translation = document.translations.find((entry) => entry.translationRevisionId === primary.translationRevisionId);
  if (!translation || document.article.articleId !== primary.articleId || translation.sourceRevisionId !== primary.sourceRevisionId) {
    return [`Рецепт посилається на ${primary.translationRevisionId} / ${primary.sourceRevisionId}, якого немає в статті ${preset.articleSlug}: перекомпілюйте специфікацію`];
  }
  const problems = findRefMismatchProblems(recipe, primary);
  const latest = document.translations.at(-1);
  if (latest && latest.translationRevisionId !== primary.translationRevisionId) problems.push(`Рецепт зібрано з ${primary.translationRevisionId}, а стаття вже має ${latest.translationRevisionId}: перекомпілюйте специфікацію`);
  const known = new Set(translation.sections.map((section) => section.sectionId));
  const used = [preset.skillSection, preset.equipmentSection, ...(preset.featSection ? [preset.featSection] : []), ...(preset.spells ? [preset.spells.sectionId] : []), ...listRecipeRefs(recipe).map((ref) => ref.sectionId)];
  return [...problems, ...[...new Set(used)].filter((sectionId) => !known.has(sectionId)).map((sectionId) => `Розділу «${sectionId}» немає в статті ${preset.articleSlug}`)];
}

function listRecipeRefs(recipe: BuildRecipe) {
  return [...recipe.sourceRefs, ...(recipe.details?.nodes.flatMap((node) => node.sourceRefs) ?? []), ...(recipe.details?.levelPlans.flatMap((plan) => plan.sourceRefs) ?? [])];
}

function findRefMismatchProblems(recipe: BuildRecipe, primary: BuildRecipe["sourceRefs"][number]): string[] {
  const mismatched = listRecipeRefs(recipe).filter((ref) => ref.articleId !== primary.articleId || ref.translationRevisionId !== primary.translationRevisionId || ref.sourceRevisionId !== primary.sourceRevisionId);
  return mismatched.length ? [`${mismatched.length} посилань рецепта мають іншу ревізію статті, ніж перше посилання`] : [];
}

function findRecipeKeyProblems({ recipe, preset, content }: PresetDiagnosisInput): string[] {
  const details = recipe.details;
  if (!details) return [];
  return findCatalogKeyProblems({
    classKey: recipe.startingClassKey, subclassKey: details.subclassKey, raceKey: details.raceKey, variantKey: details.variantKey,
    subraceKey: preset.subraceKey, backgroundKey: details.backgroundKey, featKey: details.featKey,
    weapons: preset.equipment.flatMap((pick) => pick.weapons),
  }, content);
}

function buildStartDraft({ recipe, preset, content }: PresetDiagnosisInput): Partial<PersFormData> {
  const catalog = {
    classes: content.classes.map((entry) => ({ key: entry.name, id: entry.classId })),
    races: content.races.map((entry) => ({ key: entry.name, id: entry.raceId, variants: entry.raceVariants.map((variant) => ({ key: variant.name, id: variant.raceVariantId })) })),
    backgrounds: content.backgrounds.map((entry) => ({ key: entry.name, id: entry.backgroundId })),
    feats: content.feats.map((entry) => ({ key: entry.name, id: entry.featId })),
  };
  const start = buildLevelOneDraft(recipe, catalog);
  const characterClass = content.classes.find((entry) => entry.classId === start.classId)!;
  const race = content.races.find((entry) => entry.raceId === start.raceId)!;
  const subrace = race.subraces.find((entry) => entry.name === preset.subraceKey);
  return applyPresetBackgroundCustomization({
    ...start,
    ...(subrace ? { subraceId: subrace.subraceId } : {}),
    raceChoiceSelections: readOrFallback(() => findPresetRaceSelections(race, subrace?.subraceId, preset.raceOptions), {}),
    classChoiceSelections: readOrFallback(() => findPresetClassSelections(characterClass, preset.classOptions), {}),
    ...readOrFallback(() => findPresetSubclassSelection(characterClass, recipe.details!.subclassKey, preset.subclassOptions), { subclassChoiceSelections: {} }),
  }, preset, []);
}

function readOrFallback<T>(read: () => T, fallback: T): T {
  try {
    return read();
  } catch {
    return fallback;
  }
}

function findRacialAbilityProblems({ preset, content }: PresetDiagnosisInput, start: Partial<PersFormData>): string[] {
  const race = content.races.find((entry) => entry.raceId === start.raceId)!;
  const variant = race.raceVariants.find((entry) => entry.raceVariantId === start.raceVariantId);
  const subrace = race.subraces.find((entry) => entry.name === preset.subraceKey);
  const problem = findPresetRacialAbilityProblem({ race, variant, subrace }, preset);
  if (!problem) return [];
  const mode = findPresetRacialAbilityMode(preset);
  const groups = listPresetRacialGroups({ race, variant, subrace }, mode).map(describeRacialGroup).join("; ") || "виборів немає";
  return [`racialAbilities (${mode === "tasha" ? "правила Таші" : "класичні підвищення"}), «${variant?.name ?? subrace?.name ?? race.name}»: ${problem}. Групи: ${groups}`];
}

function describeRacialGroup(group: unknown, index: number): string {
  const { value, choiceCount, unique } = readRacialChoiceGroup(group);
  return `${index + 1}) +${value} до ${choiceCount} ${unique ? "різних характеристик" : "характеристик (повтор між групами дозволено)"}`;
}

type NamedOption = ReturnType<typeof listFirstLevelClassOptions>[number];

function findChoiceGroupProblems({ preset, content }: PresetDiagnosisInput, start: Partial<PersFormData>): string[] {
  const characterClass = content.classes.find((entry) => entry.classId === start.classId)!;
  const race = content.races.find((entry) => entry.raceId === start.raceId)!;
  const subclass = characterClass.subclasses.find((entry) => entry.subclassId === start.subclassId);
  return [
    ...findOptionNameProblems("classOptions", listFirstLevelClassOptions(characterClass), preset.classOptions),
    ...findOptionNameProblems("raceOptions", listRaceChoiceOptions(race, start.subraceId), preset.raceOptions),
    ...findOptionNameProblems("subclassOptions", subclass ? listFirstLevelSubclassOptions(subclass) : [], preset.subclassOptions),
  ];
}

function findOptionNameProblems(field: string, options: readonly NamedOption[], names: readonly string[]): string[] {
  const groups = [...new Set(options.map((option) => option.group))];
  const describeGroup = (group: string) => options.filter((option) => option.group === group).map((option) => option.name).join(", ");
  const everything = groups.map((group) => `${group}: ${describeGroup(group)}`).join("; ") || "виборів цього типу на 1-му рівні немає";
  const unknown = names.filter((name) => !options.some((option) => option.name === name)).map((name) => `Невідомий вибір «${name}» у ${field}. Доступні: ${everything}`);
  const chosenGroups = names.map((name) => options.find((option) => option.name === name)?.group);
  const perGroup = groups.flatMap((group) => {
    const count = chosenGroups.filter((chosen) => chosen === group).length;
    const expected = countGroupPicks(group);
    if (count < expected) return [`Бракує вибору «${group}» у ${field}: потрібно ${expected}, а є ${count}. Доступні: ${describeGroup(group)}`];
    return count > expected ? [`У ${field} забагато виборів для «${group}»: потрібно ${expected}, а є ${count}`] : [];
  });
  return [...unknown, ...perGroup];
}

function findFeatOptionProblems({ preset, content }: PresetDiagnosisInput, start: Partial<PersFormData>): string[] {
  const feat = content.feats.find((entry) => entry.featId === start.featId);
  if (!feat) return preset.featOptionName ? [`featOptionName «${preset.featOptionName}» заданий, але в рецепті немає риси (featKey)`] : [];
  const names = feat.featChoiceOptions.map((entry) => entry.choiceOption.optionNameEng);
  if (!names.length) return preset.featOptionName ? [`Риса ${feat.name} не має варіантів вибору в каталозі, тож featOptionName має бути null (зараз «${preset.featOptionName}»)`] : [];
  const chosen = listPresetFeatOptionNames(preset);
  const unknown = chosen.length ? chosen.filter((name) => !names.includes(name)) : [null];
  return unknown.map((name) => `featOptionName «${name}» не належить риси ${feat.name}. Доступні: ${names.join(", ")}`);
}

function findSkillProblems(preset: ReadyPreset, options: ReadyPresetOptions): string[] {
  const sources = options.skills;
  const { selectedClass, race, background } = preset.skills;
  const subclass = preset.skills.subclass ?? [];
  const available = listAvailableSkillPicks(preset.skills, sources);
  const outsideBackground = new Set<Skill>([...sources.fixedRace, ...sources.fixedSubclass, ...selectedClass, ...race, ...subclass]);
  const taken = new Set<Skill>([...outsideBackground, ...sources.fixedBackground]);
  return [
    ...findPickProblems("skills.selectedClass", "навичок класу", selectedClass, sources.classCount, available.selectedClass),
    ...findPickProblems("skills.race", "навичок раси", race, sources.raceCount, available.race),
    ...findPickProblems("skills.subclass", "навичок підкласу", subclass, sources.subclassCount, available.subclass),
    ...(sources.customBackgroundSkillCount
      ? findCustomBackgroundSkillProblems(background, sources.customBackgroundSkillCount, taken)
      : findBackgroundReplacementProblems(background, sources.fixedBackground.filter((skill) => outsideBackground.has(skill)), taken)),
  ];
}

function findCustomBackgroundSkillProblems(background: Skill[], count: number, taken: Set<Skill>): string[] {
  const label = (skills: readonly string[]) => skills.map((skill) => translateValue(skill)).join(", ");
  const problems: string[] = [];
  if (background.length !== count) problems.push(`Налаштована передісторія дає рівно ${count} навички: у skills.background їх ${background.length}`);
  const repeated = background.filter((skill) => taken.has(skill));
  if (repeated.length) problems.push(`skills.background повторює навичку з іншого джерела: ${label(repeated)}. Оберіть іншу або змініть навичку класу/раси`);
  if (new Set(background).size !== background.length) problems.push("skills.background містить повтор");
  return problems;
}

function findBackgroundCustomizationProblems({ preset, content }: PresetDiagnosisInput, start: Partial<PersFormData>): string[] {
  const background = content.backgrounds.find((entry) => entry.backgroundId === start.backgroundId)!;
  const customization = preset.backgroundCustomization;
  if (!customization) return isCustomBackground(background.name) ? ["Власна передісторія CUSTOM потребує backgroundCustomization: { tools: [...] } і дві навички в skills.background"] : [];
  const base = { name: background.name, fixedTools: Array.isArray(background.toolProficiencies) ? background.toolProficiencies.map(String) : [], languageChoiceCount: background.languagesToChooseCount ?? 0 };
  const problem = findBackgroundCustomizationProblem(base, { skills: preset.skills.background, tools: customization.tools }, { skills: SkillsEnum, tools: Object.values(ToolCategory) });
  return problem ? [`backgroundCustomization: ${problem}`] : [];
}

function findBackgroundReplacementProblems(background: Skill[], duplicates: Skill[], taken: Set<Skill>): string[] {
  const label = (skills: readonly string[]) => skills.map((skill) => translateValue(skill)).join(", ");
  const problems: string[] = [];
  if (background.length !== duplicates.length) {
    problems.push(duplicates.length
      ? `Передісторія дублює ${duplicates.length} навичок (${label(duplicates)}): у skills.background потрібно рівно ${duplicates.length} замін, а їх ${background.length}`
      : `Передісторія нічого не дублює, тому skills.background має бути порожнім (зараз: ${label(background)}). Якщо автор змінює навички передісторії, задайте backgroundCustomization`);
  }
  const repeated = background.filter((skill) => taken.has(skill));
  if (repeated.length) problems.push(`Заміна у skills.background повторює вже наявну навичку: ${label(repeated)}`);
  if (new Set(background).size !== background.length) problems.push("skills.background містить повтор");
  return problems;
}

function findPickProblems(field: string, label: string, picked: readonly string[], count: number, available: readonly string[]): string[] {
  const problems: string[] = [];
  if (picked.length !== count) problems.push(`${field}: потрібно ${count} ${label}, а в пресеті ${picked.length}`);
  if (new Set(picked).size !== picked.length) problems.push(`${field} містить повтор: ${picked.join(", ")}`);
  const outside = picked.filter((skill) => !available.includes(skill));
  if (outside.length) problems.push(`${field}: ${outside.join(", ")} недоступн${outside.length > 1 ? "і" : "а"} (немає в списку джерела або вже дається фіксовано). Доступні: ${available.join(", ")}`);
  return problems;
}

function findExpertiseProblems(preset: ReadyPreset, options: ReadyPresetOptions): string[] {
  const skills = buildReadyPresetSkillChoices(preset.skills, options.skills).skills;
  const problems: string[] = [];
  if (preset.expertise.length !== options.expertiseCount) problems.push(`Експертиза: клас дає ${options.expertiseCount}, а в пресеті ${preset.expertise.length}`);
  const outside = preset.expertise.filter((skill) => !skills.includes(skill));
  if (outside.length) problems.push(`Експертиза не з навичок персонажа: ${outside.join(", ")}. Навички: ${skills.join(", ")}`);
  if (new Set(preset.expertise).size !== preset.expertise.length) problems.push("Експертиза містить повтор");
  return problems;
}

function findLanguageProblems(preset: ReadyPreset, options: ReadyPresetOptions): string[] {
  const picked = preset.languages;
  const problems: string[] = [];
  if (picked.length !== options.languageCount) problems.push(`Мови: персонаж обирає ${options.languageCount}, а в пресеті ${picked.length}`);
  if (new Set(picked).size !== picked.length) problems.push(`languages містить повтор: ${picked.join(", ")}`);
  for (const language of picked) {
    if ((options.knownLanguages as readonly string[]).includes(language)) problems.push(`Мова ${language} вже відома персонажу (раса/клас), оберіть іншу`);
    else if (!(options.languages as readonly string[]).includes(language)) problems.push(`Мова ${language} недоступна для вибору. Доступні: ${options.languages.join(", ")}`);
  }
  return problems;
}

function findEquipmentProblems(preset: ReadyPreset, options: ReadyPresetOptions): string[] {
  const groups = options.equipmentGroups;
  const problems = preset.equipment.filter((pick) => !groups.some((group) => group.group === String(pick.group)))
    .map((pick) => `Групи спорядження ${pick.group} у класі немає. Групи: ${groups.map((group) => group.group).join(", ")}`);
  for (const group of groups) {
    const picks = preset.equipment.filter((pick) => String(pick.group) === group.group);
    const variants = group.choices.map((choice) => `${choice.option}: ${choice.label}`).join(" | ");
    if (picks.length !== 1) problems.push(`Група спорядження ${group.group} («${group.label}») має ${picks.length} виборів, потрібен один. Варіанти: ${variants}`);
    else problems.push(...findEquipmentPickProblems(picks[0], group, variants));
  }
  return problems;
}

function findEquipmentPickProblems(pick: ReadyPreset["equipment"][number], group: ReadyPresetOptions["equipmentGroups"][number], variants: string): string[] {
  const choice = group.choices.find((entry) => entry.option === pick.option);
  if (!choice) return [`Група спорядження ${group.group} не має варіанта ${pick.option}. Варіанти: ${variants}`];
  const problems: string[] = [];
  if (choice.weaponCount !== pick.weapons.length) problems.push(`Група ${group.group}/${pick.option} («${choice.label}») потребує ${choice.weaponCount} видів зброї за вибором, а в пресеті ${pick.weapons.length}`);
  const available = choice.weapons.map((weapon) => weapon.name);
  const outside = pick.weapons.filter((weapon) => !available.includes(weapon));
  if (outside.length) problems.push(`Зброя ${outside.join(", ")} недоступна у групі ${group.group}/${pick.option}. Доступні: ${available.join(", ") || "вибір зброї тут не передбачено"}`);
  return problems;
}

function findSpellProblems(preset: ReadyPreset, options: ReadyPresetOptions): string[] {
  try {
    buildPresetSpellSelection(preset.spells, options.spells);
    return [];
  } catch (error) {
    return [`Заклинання: ${error instanceof Error ? error.message : String(error)}`];
  }
}

function assembleDraft({ recipe, preset, content }: PresetDiagnosisInput): { draft?: PersFormData; problem?: string } {
  try {
    return { draft: buildReadyPresetDraft(recipe, preset, content) };
  } catch (error) {
    return { problem: `Збирання чернетки: ${error instanceof Error ? error.message : String(error)}` };
  }
}

const PLATFORM_MARKER = /за вас|вибір платформи|платформ/i;

function findPlatformChoiceWarnings(preset: ReadyPreset, options: ReadyPresetOptions): string[] {
  const explanations = [preset.abilityExplanation, preset.skillExplanation, preset.equipmentExplanation].join(" ");
  if (PLATFORM_MARKER.test(explanations)) return [];
  const platformGuesses = [
    ...(preset.languages.length ? ["мови (languages)"] : []),
    ...(preset.skills.background.length && !preset.backgroundCustomization ? ["заміна навички передісторії (skills.background)"] : []),
    ...options.equipmentGroups.filter((group) => group.label === "Набір для подорожей" && group.choices.length > 1).map((group) => `набір для подорожей (група ${group.group})`),
  ];
  return platformGuesses.length
    ? [`Імовірні вибори платформи без позначки: ${platformGuesses.join("; ")}. Якщо автор їх не називає, напишіть у поясненні «ми обрали за вас» / «вибір платформи».`]
    : [];
}

function describeStart({ recipe, preset, content }: PresetDiagnosisInput, draft: PersFormData, options: ReadyPresetOptions): string[] {
  const scores = buildPresetAbilityScores(draft, buildPresetAbilitySources(draft, content));
  return [
    `${recipe.startingClassKey}${recipe.details!.subclassKey ? ` / ${recipe.details!.subclassKey}` : " (без підкласу на старті)"} · ${recipe.details!.raceKey}${preset.subraceKey ? ` (${preset.subraceKey})` : ""} · ${recipe.details!.backgroundKey}`,
    `Характеристики з бонусами раси й риси${preset.racialAbilityRules === "tasha" ? " (расові за правилами Таші)" : ""}: ${Object.entries(scores).map(([ability, value]) => `${ability} ${value}`).join(", ")}`,
    ...describeRacialChoices(draft),
    ...describeBackgroundCustomization(draft),
    ...(preset.skills.subclass?.length ? [`Навичка підкласу: ${preset.skills.subclass.join(", ")}`] : []),
    `Навички (${draft.skills?.length ?? 0}): ${(draft.skills ?? []).join(", ")}`,
    `Експертиза: ${preset.expertise.join(", ") || "немає"}; мови: ${preset.languages.join(", ") || "не обираються"}`,
    ...describeInitialPrepared(draft, options),
    ...options.equipmentGroups.map((group) => describeEquipmentGroup(preset, group)),
  ];
}

function describeInitialPrepared(draft: PersFormData, options: ReadyPresetOptions): string[] {
  const names = (draft.initialPreparedSpellIds ?? []).flatMap((spellId) => options.spells.candidates.find((spell) => spell.spellId === spellId)?.engName ?? []);
  return names.length ? [`Підготовлені заклинання на старті: ${names.join(", ")}`] : [];
}

function describeBackgroundCustomization(draft: PersFormData): string[] {
  const customization = draft.backgroundCustomization;
  if (!customization) return [];
  const tools = customization.tools.length ? `; інструменти замість мов: ${customization.tools.join(", ")}` : "";
  return [`Налаштована передісторія: навички ${customization.skills.join(", ")}${tools}`];
}

function describeRacialChoices(draft: PersFormData): string[] {
  const choices = draft.isDefaultASI === false ? draft.racialBonusChoiceSchema?.tashaChoices : draft.racialBonusChoiceSchema?.basicChoices;
  if (!choices?.length) return [];
  const label = draft.isDefaultASI === false ? "Расові підвищення за правилами Таші" : "Расові підвищення на вибір";
  return [`${label}: ${choices.map((choice) => `група ${choice.groupIndex + 1} → ${choice.selectedAbilities.join(", ")}`).join("; ")}`];
}

function describeEquipmentGroup(preset: ReadyPreset, group: ReadyPresetOptions["equipmentGroups"][number]): string {
  const pick = preset.equipment.find((entry) => String(entry.group) === group.group)!;
  const choice = group.choices.find((entry) => entry.option === pick.option)!;
  const weapons = pick.weapons.length ? ` [${pick.weapons.join(", ")}]` : "";
  return `Спорядження ${group.group}/${pick.option}: ${choice.label}${weapons}`;
}
