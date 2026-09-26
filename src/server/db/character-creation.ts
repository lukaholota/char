"use server";

import { prisma } from "@/lib/prisma";
import { fullCharacterSchema, PersFormData } from "@/lib/zod/schemas/persCreateSchema";
import { auth } from "@/lib/auth";
import { Ability, ArmorCategory, ArmorType, Feats, Language, SkillProficiencyType, Skills, ToolCategory } from "@prisma/client";
import { revalidatePath } from "next/cache";
import {
  formatArmorProficiencies,
  formatToolProficiencies,
  formatWeaponProficiencies,
  translateValue,
} from "@/lib/components/characterCreator/infoUtils";
import { extractExpertisesFromChoiceOption, extractSkillsFromChoiceOption } from "@/lib/logic/characterUtils";
import { SPELL_SLOT_PROGRESSION } from "@/lib/refs/static";
import { isRecord } from "@/rules/abilities";
import { isRules2024Allowed } from "@/rules/access";
import { findBackgroundAsiProblem } from "@/rules/background-asi";
import { countFeatToolChoices } from "@/rules/feat-tool-choices";
import { findBackgroundStartingItems, type StartingItem } from "@/rules/background-equipment";
import { addToPurse, emptyPurse, splitStartingItems } from "@/rules/starting-money";
import { collectOriginLanguages, countOriginLanguageChoices } from "@/rules/languages";
import { buildInitialCharacterState } from "@/rules/character-creation";
import { findFeatsGrantedByChoiceOptions } from "@/rules/feat-sources";
import { collectChoiceOptionIds, findFeatPackageProblem, type FeatPick } from "@/server/db/feat-gates";
import type { FeatChoiceSource } from "@/rules/repeatable-feats";
import { findFirstUnmetInvocationPrerequisite, type InvocationPrerequisite } from "@/rules/warlock-invocations";
import { CHOICE_GROUPS } from "@/lib/logic/choicePoolRules";
import { findGrantedSpells } from "@/rules/spell-sources";
import { characterLevelOnly } from "@/rules/character-level";
import { buildSpeciesPersSpellRows } from "@/server/db/species-level-grants";
import { buildClassPersSpellRows, findMissingClassSpells, saveSubclassSpellGrants } from "@/server/db/always-prepared-spell-grants";
import { findClassSpellProblem, saveClassSpellSelection, type ClassSpellOffer } from "@/server/db/class-spell-choices";
import { buildClassOptionPersSpellRows, findClassOptionSpellProblem } from "@/server/db/class-option-spell-choices";
import type { ClassSpellSelection } from "@/rules/class-spell-choices-2024";
import { hasFeatSpellChoice } from "@/rules/feat-spell-choices";
import { buildChosenFeatSpells, findFeatSpellChoiceProblem } from "@/server/db/feat-spell-choices";
import { buildFeatPersSpellRows } from "@/server/db/feat-spell-grants";
import type { ChosenRaceChoiceOption, FeatureWithSpells, GrantedSpell } from "@/rules/spell-sources";
import { sumFeatureHitPointsPerLevel } from "@/rules/hit-points";
import { findSkillsGrantedByChosenOption } from "@/rules/proficiency";
import type { CreationFeatAbilityInput } from "@/rules/character-creation";
import type { AbilityKey, BackgroundASIChoice } from "@/rules/types";
import type { RulesetId } from "@/rules/strategies/types";
import type { Ruleset } from "@prisma/client";
import { loadCreationContent } from "@/server/db/creation-content";
import { findCreationWeaponMasteryOffer, replacePersWeaponMastery } from "@/server/db/weapon-mastery";
import { grantAlternativeArmorClassFormulas } from "@/server/db/armor-class-formulas";
import { grantStartingUnarmedStrike } from "@/server/db/unarmed-strike";
import { findUserByEmail } from "@/server/db/users";
import { parseEnumArray, parseJsonRecord, parseOptionalNumber, parseStringArray, parseWeaponProficiencies, parseWeaponProficienciesSpecial } from "@/server/db/json";
import { findCreationChoicePoolProblem } from "@/rules/creation-choice-pools";
import { findExpertiseSelectionProblem, readExpertiseGrant } from "@/rules/expertise-selections";

export type CreateCharacterResult =
  | { error: string; details?: unknown; success?: undefined; persId?: undefined }
  | { error?: undefined; details?: undefined; success: true; persId: number };
type RequiredUser = { value: { id: number; email: string | null } } | { error: string };
type ParsedCreateInput = { value: PersFormData } | { error: string; details: unknown };
type LoadedCreationContent = Awaited<ReturnType<typeof loadCreationContent>>;
type RequiredCreationContent = LoadedCreationContent & {
  race: NonNullable<LoadedCreationContent["race"]>;
  background: NonNullable<LoadedCreationContent["background"]>;
  characterClass: NonNullable<LoadedCreationContent["characterClass"]>;
};
type CharacterBuild = {
  validData: PersFormData;
  content: RequiredCreationContent;
  scores: ReturnType<typeof buildInitialCharacterState>["scores"];
  savingThrows: Ability[];
  currentSpellSlots: number[];
  currentPactSlots: number;
  maxHp: number;
  featIdsFromChoiceOptions: number[];
  featOptionFeatureIds: number[];
};
type CharacterBuildResult = CharacterBuild | { error: string };
type ChosenClassSpells = { offer: ClassSpellOffer; selection: ClassSpellSelection } | null;
type ChosenClassOptionSpells = { sourceName: string; spellIds: number[] } | null;

type ChosenCreationSpells = { classSpells: ChosenClassSpells; featSpells: GrantedSpell[]; classOptionSpells: ChosenClassOptionSpells };

export async function createCharacter(input: PersFormData): Promise<CreateCharacterResult> {
  const user = await requireUser();
  if ("error" in user) return { error: user.error };

  const data = parseCreateInput(input);
  if ("error" in data) return { error: data.error, details: data.details };

  if (data.value.ruleset === "RULES_2024" && !isRules2024Allowed()) {
    return { error: "Правила 2024 наразі доступні лише для адміністратора/власника." };
  }

  const content = await loadCreationContent(data.value);
  const character = buildCharacter(data.value, content);
  if ("error" in character) return character;

  const chosenSpells = await findChosenCreationSpells(data.value, content);
  if ("error" in chosenSpells) return chosenSpells;
  return persistCharacter(user.value, character, chosenSpells.value);
}

async function requireUser(): Promise<RequiredUser> {
  const session = await auth();

  if (!session || !session.user || !session.user.email) {
    return { error: "Unauthorized" };
  }

  const user = await findUserByEmail(session.user.email);

  if (!user) {
    return { error: "User not found" };
  }

  return { value: { id: user.id, email: user.email } };
}

function parseCreateInput(input: PersFormData): ParsedCreateInput {
  const validation = fullCharacterSchema.safeParse(input);

  if (!validation.success) {
    return { error: "Validation failed", details: validation.error.flatten() };
  }

  return { value: validation.data };
}

type LoadedCreationFeat = NonNullable<LoadedCreationContent["feat"]>;

function toCreationFeatInput(
  feat: LoadedCreationFeat | null,
  selections: Record<string, number | number[]>,
): CreationFeatAbilityInput[] {
  if (!feat) return [];
  return [{
    source: feat,
    chosenOptionIds: Object.values(selections).flatMap((value) => (Array.isArray(value) ? value : [value])).map(Number),
  }];
}

function readInvocationPrerequisite(raw: unknown): InvocationPrerequisite {
  const prereq = parseJsonRecord(raw);
  return {
    level: prereq?.level ? Number(prereq.level) : undefined,
    pact: prereq?.pact ? String(prereq.pact) : undefined,
  };
}

function findInvocationCreationProblem(
  selectedChoiceOptions: LoadedCreationContent["selectedChoiceOptions"],
): string | null {
  const invocations = selectedChoiceOptions.filter(
    (option) => option.groupName === CHOICE_GROUPS.WARLOCK_INVOCATIONS,
  );
  if (!invocations.length) return null;

  const unmet = findFirstUnmetInvocationPrerequisite({
    classLevel: 1,
    knownOptionNameEngs: new Set(),
    selectedInvocations: invocations.map((option) => ({
      optionNameEng: String(option.optionNameEng ?? ""),
      prerequisite: readInvocationPrerequisite(option.prerequisites),
    })),
  });

  if (!unmet) return null;
  return unmet.reason === "level"
    ? "Цей виклик недоступний на цьому рівні"
    : "Цей виклик вимагає іншого виклику, якого у вас ще немає";
}

function buildCharacter(
  validData: PersFormData,
  content: LoadedCreationContent,
): CharacterBuildResult {
  const { race, variant, subrace, background, characterClass, subclass, feat, backgroundFeat } = content;
  if (!race) return { error: "Race not found" };
  if (!background) return { error: "Background not found" };
  if (!characterClass) return { error: "Class not found" };
  if (subclass && subclass.classId !== validData.classId) return { error: "Підклас не належить обраному класу" };

  // 2024: Pact of the Blade/Chain/Tome — самі такі самі виклики в групі «Потойбічні виклики»,
  // а не окрема фіча (KR18.8). На 1-му рівні (створення) попередніх виборів ще нема, тож
  // передумова звіряється лише проти того, що обирається в цьому самому пакеті.
  if (characterClass.name === "WARLOCK_2024") {
    const invocationProblem = findInvocationCreationProblem(content.selectedChoiceOptions);
    if (invocationProblem) return { error: invocationProblem };
  }

  const ruleset = (validData.ruleset ?? characterClass.ruleset ?? "RULES_2014") as RulesetId;
  const classChoiceProblem = findCreationChoicePoolProblem({
    ruleset,
    className: characterClass.name,
    selections: validData.classChoiceSelections,
    available: characterClass.classChoiceOptions.map((entry) => ({
      choiceOptionId: entry.choiceOptionId,
      groupName: entry.choiceOption.groupName,
    })),
  });
  if (classChoiceProblem) return { error: classChoiceProblem };

  // Риса від вибору (бойовий стиль класу, друга риса Людини 2024) має рахуватися разом із
  // рештою — інакше персонаж отримає її запис, але не її хіти й характеристики.
  const grantedFeats = findFeatsGrantedByCreationChoices(content);

  const featPicks = collectCreationFeatPicks(validData, content, grantedFeats);
  const featProblem = findFeatPackageProblem(featPicks);
  if (featProblem) return { error: featProblem };

  const backgroundAsiChoice = validData.backgroundAsiChoice as BackgroundASIChoice | undefined;
  const backgroundAsiProblem = findBackgroundAsiProblem(
    ruleset,
    background.abilityOptions,
    backgroundAsiChoice,
  );
  if (backgroundAsiProblem) return { error: backgroundAsiProblem };

  const initialState = buildInitialCharacterState({
    ruleset,
    traitHitPointsPerLevel: sumFeatureHitPointsPerLevel(findStartingFeatures(content)),
    asiSystem: validData.asiSystem,
    pointBuy: validData.asi,
    simple: validData.simpleAsi,
    custom: validData.customAsi,
    isDefaultASI: validData.isDefaultASI,
    raceASI: race.ASI,
    variantASI: variant?.overridesRaceASI,
    subraceASI: subrace?.additionalASI,
    subraceReplacesASI: subrace?.replacesASI ?? false,
    racialChoices: validData.racialBonusChoiceSchema,
    raceChoiceAbilityBonuses: content.raceChoiceOptions.map((option) => ({ ASI: option.ASI })),
    backgroundAbilityOptions: background.abilityOptions as AbilityKey[] | undefined,
    backgroundAsiChoice,
    feats: [
      ...toCreationFeatInput(feat, validData.featChoiceSelections),
      ...toCreationFeatInput(backgroundFeat, validData.backgroundFeatChoiceSelections),
      ...grantedFeats.map((granted) => ({ source: { ...granted, ruleset, grantedSkills: null, featChoiceOptions: [] }, chosenOptionIds: [] })),
    ],
    className: characterClass.name,
    spellcastingType: characterClass.spellcastingType,
    savingThrows: characterClass.savingThrows ?? [],
    hitDie: characterClass.hitDie,
    hasTough:
      feat?.name === Feats.TOUGH ||
      backgroundFeat?.name === Feats.TOUGH ||
      grantedFeats.some((granted) => granted.name === Feats.TOUGH),
    standardProgression: SPELL_SLOT_PROGRESSION.FULL,
    pactProgression: SPELL_SLOT_PROGRESSION.PACT,
  });

  return {
    validData,
    content: { ...content, race, background, characterClass },
    scores: initialState.scores,
    savingThrows: initialState.savingThrows.filter(isAbility),
    currentSpellSlots: initialState.currentSpellSlots,
    currentPactSlots: initialState.currentPactSlots,
    maxHp: initialState.maxHp,
    featIdsFromChoiceOptions: grantedFeats.map((granted) => granted.featId),
    featOptionFeatureIds: collectFeatOptionFeatureIds(featPicks),
  };
}

// Фіча обраної опції риси (маневр Martial Adept, стиль Fighting Initiate, виклик Eldritch Adept,
// список «Посвяченого у магію» 2024 з його використанням на довгий відпочинок — Р38) лягає
// персонажу так само, як фіча опції класу. Підвищення рівня це робило завжди; створення — ні,
// і персонаж 1-го рівня лишався без них (рішення власника 2026-09-04: має отримувати).
function collectFeatOptionFeatureIds(picks: readonly FeatPick[]): number[] {
  return picks.flatMap((pick) => {
    const chosen = new Set(collectChoiceOptionIds(pick.selections));
    return pick.feat.featChoiceOptions
      .filter((option) => chosen.has(option.choiceOptionId))
      .flatMap((option) => option.choiceOption?.features?.map((feature) => feature.featureId) ?? []);
  });
}

/** «Опція, що дає фічу риси, дає й саму рису» — правило одне на створення й на підвищення рівня.
 *  Повтори тут не відсіюються: їх судить гейт `findFeatPackageProblem` — з причиною, а не мовчки. */
function findFeatsGrantedByCreationChoices(content: LoadedCreationContent) {
  const grantedIds = findFeatsGrantedByChoiceOptions({
    chosenFeatureIds: content.featGrantingFeatureIds,
    featsGrantingFeatures: content.featsGrantedByChoiceOptions.map((candidate) => ({
      featId: candidate.featId,
      featureIds: candidate.grantsFeature.map((feature) => feature.featureId),
    })),
  });

  return content.featsGrantedByChoiceOptions.filter((candidate) => grantedIds.includes(candidate.featId));
}

type GrantedCreationFeat = LoadedCreationContent["featsGrantedByChoiceOptions"][number];

/** Звідки прийшла риса від вибору: фіча з опції виду — Універсальність Людини, інакше — бойовий стиль класу. */
function findGrantedFeatSource(granted: GrantedCreationFeat, content: LoadedCreationContent): FeatChoiceSource {
  const fromSpecies = granted.grantsFeature.some((feature) => content.raceChoiceTraitFeatureIds.includes(feature.featureId));
  return fromSpecies ? "SPECIES_VERSATILITY" : "FIGHTING_STYLE";
}

function findSpeciesFeatSelections(validData: PersFormData, content: LoadedCreationContent, granted: GrantedCreationFeat) {
  return findGrantedFeatSource(granted, content) === "SPECIES_VERSATILITY" ? validData.speciesFeatChoiceSelections : {};
}

/** Форма несе вибори одним словником на крок; рисі лишаються тільки її власні опції. */
function pickOwnSelections(granted: GrantedCreationFeat, selections: Record<string, number | number[]> | undefined) {
  const own = new Set(granted.featChoiceOptions.map((fco) => fco.choiceOptionId));
  return Object.fromEntries(
    Object.entries(selections ?? {}).map(([group, value]) => [
      group,
      Array.isArray(value) ? value.filter((id) => own.has(id)) : own.has(value) ? value : [],
    ]),
  );
}

function collectCreationFeatPicks(
  validData: PersFormData,
  content: LoadedCreationContent,
  grantedFeats: GrantedCreationFeat[],
): FeatPick[] {
  return [
    ...(content.backgroundFeat ? [{ feat: content.backgroundFeat, source: "BACKGROUND_ORIGIN" as const, selections: validData.backgroundFeatChoiceSelections }] : []),
    ...(content.feat ? [{ feat: content.feat, source: "CLASS_ASI" as const, selections: validData.featChoiceSelections }] : []),
    ...grantedFeats.map((granted) => ({
      feat: granted,
      source: findGrantedFeatSource(granted, content),
      selections: findSpeciesFeatSelections(validData, content, granted),
    })),
  ];
}

function isAbility(value: string): value is Ability {
  return Object.values(Ability).includes(value as Ability);
}

type CreationTransaction = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/**
 * Вибір із кількох опцій (Skilled бере три навички) лежить у чернетці одним ключем зі списком
 * значень — `Number(список)` дав би NaN і мовчки згубив би вибір.
 */
async function saveFeatWithChoices(
  tx: CreationTransaction,
  persId: number,
  featId: number,
  selections: Record<string, number | number[]> | undefined,
): Promise<void> {
  // Повтор перевірено гейтом вище; повторювана риса лягає другим рядком зі своїми виборами (Р37).
  const persFeat = await tx.persFeat.create({
    data: { persId, featId },
    select: { persFeatId: true },
  });

  const choiceOptionIds = collectChoiceOptionIds(selections);
  if (!choiceOptionIds.length) return;

  await tx.persFeatChoice.createMany({
    data: choiceOptionIds.map((choiceOptionId) => ({ persFeatId: persFeat.persFeatId, choiceOptionId })),
    skipDuplicates: true,
  });
}

/**
 * Заклинання, які правило видає поіменно (родовід ельфа, скельний гном, спадщина тифлінга),
 * лягають окремими рядками зі своїм джерелом і не зʼїдають ліміт заклинань класу.
 */
async function saveGrantedSpells(
  tx: CreationTransaction,
  persId: number,
  content: LoadedCreationContent,
  ruleset: Ruleset,
): Promise<void> {
  const granted = findSpeciesSpellsAtCreation(content, ruleset);
  if (!granted.length) return;

  await tx.persSpell.createMany({
    data: buildSpeciesPersSpellRows(persId, granted, 1),
    skipDuplicates: true,
  });
}

function findSpeciesSpellsAtCreation(content: LoadedCreationContent, ruleset: Ruleset) {
  return findGrantedSpells({
    ruleset: ruleset as RulesetId,
    levels: characterLevelOnly(1),
    raceTraits: content.raceTraitFeatures.map((trait) => ({ ...toFeatureWithSpells(trait.feature), level: trait.level })),
    raceChoiceOptions: content.raceChoiceOptions.map(toChosenRaceChoiceOption),
  });
}

/** Заклинач приносить із конструктора заклинання класу, а в 2024 — ще й рис походження; без повного вибору він не створюється. */
async function findChosenCreationSpells(
  validData: PersFormData,
  content: LoadedCreationContent,
): Promise<{ value: ChosenCreationSpells } | { error: string }> {
  const ruleset = (validData.ruleset ?? content.characterClass?.ruleset ?? "RULES_2014") as Ruleset;
  const speciesSpellIds = findSpeciesSpellsAtCreation(content, ruleset).map((spell) => spell.spellId);
  const classSpells = await findChosenClassSpells(validData, content, speciesSpellIds);
  if ("error" in classSpells) return classSpells;
  if (ruleset !== "RULES_2024") return { value: { classSpells: classSpells.value, featSpells: [], classOptionSpells: null } };

  const featSpells = await findChosenFeatSpells(validData, content, [...speciesSpellIds, ...collectClassSpellsTakenFromFeats(classSpells.value)]);
  if ("error" in featSpells) return featSpells;

  const takenSpellIds = [...speciesSpellIds, ...collectClassSelectionIds(classSpells.value), ...featSpells.value.map((spell) => spell.spellId)];
  const classOptionSpells = await findChosenClassOptionSpells(validData, content, takenSpellIds);
  if ("error" in classOptionSpells) return classOptionSpells;
  return { value: { classSpells: classSpells.value, featSpells: featSpells.value, classOptionSpells: classOptionSpells.value } };
}

async function findChosenClassSpells(
  validData: PersFormData,
  content: LoadedCreationContent,
  speciesSpellIds: readonly number[],
): Promise<{ value: ChosenClassSpells } | { error: string }> {
  const { offer, problem } = await findClassSpellProblem(prisma, {
    classId: validData.classId,
    classLevel: 1,
    subclassId: validData.subclassId ?? null,
    chosenClassOptionIds: content.selectedChoiceOptionIds,
    persId: null,
    selection: validData.classSpells,
    unavailableSpellIds: speciesSpellIds,
  });
  if (problem) return { error: problem };
  return { value: offer && validData.classSpells ? { offer, selection: validData.classSpells } : null };
}

function collectClassSelectionIds(chosen: ChosenClassSpells): number[] {
  if (!chosen) return [];
  return [...chosen.selection.cantripIds, ...chosen.selection.spellbookIds, ...chosen.selection.preparedIds];
}

/** Книга тіней Pact of the Tome: «they must be spells you don't already have prepared». */
async function findChosenClassOptionSpells(
  validData: PersFormData,
  content: LoadedCreationContent,
  takenSpellIds: readonly number[],
): Promise<{ value: ChosenClassOptionSpells } | { error: string }> {
  const selectedSpellIds = validData.classOptionSpellIds ?? [];
  const { problem, sourceName } = await findClassOptionSpellProblem(prisma, {
    newlyChosenOptionIds: content.selectedChoiceOptionIds,
    unavailableSpellIds: takenSpellIds,
    selectedSpellIds,
  });
  if (problem) return { error: problem };
  return { value: sourceName ? { sourceName, spellIds: selectedSpellIds } : null };
}

/** Р38: заклинання лише в книзі чарівника риса взяти може — підготовленим його робить риса, а не клас. */
function collectClassSpellsTakenFromFeats(chosen: ChosenClassSpells): number[] {
  if (!chosen) return [];
  return [...chosen.selection.cantripIds, ...chosen.selection.preparedIds];
}

/** «Посвячений у магію» від передісторії чи Людини: два замовляння й заклинання 1-го рівня з обраного списку (KR31.5, Р42). */
async function findChosenFeatSpells(
  validData: PersFormData,
  content: LoadedCreationContent,
  unavailableSpellIds: readonly number[],
): Promise<{ value: GrantedSpell[] } | { error: string }> {
  const chosen: GrantedSpell[] = [];

  for (const pick of collectCreationFeatPicks(validData, content, findFeatsGrantedByCreationChoices(content))) {
    if (!hasFeatSpellChoice("RULES_2024", pick.feat.name)) continue;
    const selectedSpellIds = findFeatSpellSelection(validData, pick.source);
    const problem = await findFeatSpellChoiceProblem(prisma, {
      ruleset: "RULES_2024",
      featName: pick.feat.name,
      chosenOptionIds: collectChoiceOptionIds(pick.selections),
      selectedSpellIds,
      unavailableSpellIds: [...unavailableSpellIds, ...chosen.map((spell) => spell.spellId)],
    });
    if (problem) return { error: problem };
    chosen.push(...buildChosenFeatSpells(pick.feat.name, selectedSpellIds));
  }

  return { value: chosen };
}

function findFeatSpellSelection(validData: PersFormData, source: FeatChoiceSource): number[] {
  if (source !== "BACKGROUND_ORIGIN" && source !== "SPECIES_VERSATILITY") return [];
  return validData.featSpellSelections?.[source] ?? [];
}

/**
 * «Ви завжди маєте це заклинання підготовленим» на 1-му рівні: від самого класу (Улюблений ворог
 * слідопита дає Hunter's Mark, KR31.5) і від підкласу, який 2014 обирає одразу (Домен життя —
 * Bless і Cure Wounds, Абераційний розум — Mind Sliver і ще два, O48).
 */
async function saveRuleGrantedClassSpells(
  tx: CreationTransaction,
  input: { persId: number; classId: number; subclassId: number | null | undefined },
): Promise<void> {
  const characterClass = await tx.class.findUnique({ where: { classId: input.classId }, select: { primaryCastingStat: true } });
  const ability = characterClass?.primaryCastingStat ?? null;
  const owned = await tx.persSpell.findMany({ where: { persId: input.persId }, select: { spellId: true } });

  const granted = await findMissingClassSpells(tx, {
    classes: [{ classId: input.classId, classLevel: 1, ability }],
    ownedSpellIds: owned.map((row) => row.spellId),
  });
  if (granted.length) {
    await tx.persSpell.createMany({ data: buildClassPersSpellRows(input.persId, granted, 1), skipDuplicates: true });
  }

  if (input.subclassId) {
    await saveSubclassSpellGrants(tx, { persId: input.persId, subclasses: [{ subclassId: input.subclassId, classLevel: 1, ability }], learnedAtLevel: 1 });
  }
}

type LoadedRaceChoiceOption = LoadedCreationContent["raceChoiceOptions"][number];
type LoadedFeatureWithSpells = { engName: string; name: string; givesSpells: Array<{ spellId: number }> };

function toFeatureWithSpells(feature: LoadedFeatureWithSpells): FeatureWithSpells {
  return {
    engName: feature.engName,
    name: feature.name,
    spellIds: feature.givesSpells.map((spell) => spell.spellId),
  };
}

function toChosenRaceChoiceOption(option: LoadedRaceChoiceOption): ChosenRaceChoiceOption {
  return {
    optionName: option.optionName,
    spellcastingAbility: option.spellcastingAbility as AbilityKey | null,
    traitFeature: option.traitFeature,
    grantedFeatures: option.traits.map((trait) => toFeatureWithSpells(trait.feature)),
    leveledSpells: option.spells,
  };
}

/** Фічі, з якими персонаж виходить на 1-й рівень: замінені опційними — уже без заміненої. */
function findStartingFeatures(content: LoadedCreationContent) {
  return content.features.filter(
    (feature) => !content.optionalReplacedFeatureIds.includes(feature.featureId),
  );
}

async function persistCharacter(
  user: { id: number },
  character: CharacterBuild,
  chosenSpells: ChosenCreationSpells,
): Promise<CreateCharacterResult> {
  const { validData, content, scores, savingThrows, currentSpellSlots, currentPactSlots, maxHp, featOptionFeatureIds } = character;

  const {
    race,
    subrace,
    background,
    characterClass: cls,
    subclass,
    feat,
    backgroundFeat,
    acceptedOptionalFeatureIds,
    selectedChoiceOptionIds,
    raceChoiceOptionIds,
    initialFeatureIds,
    optionalGrantedFeatureIds,
    optionalReplacedFeatureIds,
    choiceOptionFeatureIds,
    raceChoiceTraitFeatureIds,
    equipmentOptions,
    selectedChoiceOptions,
    raceChoiceOptions,
    features,
  } = content;

  const ruleset = (validData.ruleset ?? cls.ruleset ?? "RULES_2014") as Ruleset;

  // If race defines a Warforged-style static AC bonus (consistent bonus), initialize toggleable pers field.
    // Race static AC bonuses (e.g. Warforged +1) must be explicitly enabled via the UI toggle.
    // So we initialize it to 0 even if the race defines a consistentBonus.
    const initialRaceStaticAcBonus = 0;

  // Prepare Skills
  const allSkills = new Set<string>(validData.skills);

  // From Schema
  if (validData.skillsSchema) {
      if (validData.skillsSchema.isTasha && ruleset !== "RULES_2024") {
          validData.skillsSchema.tashaChoices.forEach(s => allSkills.add(s));
      } else {
          validData.skillsSchema.basicChoices.race.forEach(s => allSkills.add(s));
          validData.skillsSchema.basicChoices.selectedClass.forEach(s => allSkills.add(s));
      }
  }

  // From Race (Fixed)
  if (race && race.skillProficiencies && Array.isArray(race.skillProficiencies)) {
      (race.skillProficiencies as string[]).forEach(s => allSkills.add(s));
  }

  // From Subrace (Fixed)
  if (subrace) {
    parseStringArray(subrace.skillProficiencies).forEach((skill) => allSkills.add(skill));
  }
  
  // From Background (Fixed)
  if (background.skillProficiencies && Array.isArray(background.skillProficiencies)) {
    (background.skillProficiencies as string[]).forEach((s) => allSkills.add(s));
  }

  // From Feat (if selected) - now processed AFTER base skills
  const expertiseFromFeat = new Set<string>();
  if (feat) {
    if (feat.grantedSkills && Array.isArray(feat.grantedSkills)) {
      (feat.grantedSkills as string[]).forEach((s) => allSkills.add(s));
    }

    if (validData.featChoiceSelections) {
      for (const rawId of Object.values(validData.featChoiceSelections)) {
        const ids = Array.isArray(rawId) ? rawId : [rawId];
        for (const choiceOptionId of ids) {
          const featChoice = feat.featChoiceOptions?.find((fco) => fco.choiceOptionId === Number(choiceOptionId));
          const option = featChoice?.choiceOption;
          if (!option) continue;

          extractSkillsFromChoiceOption(option).forEach((skillCode) => {
            if (Object.values(Skills).includes(skillCode as Skills)) {
              allSkills.add(skillCode);
            }
          });
          extractExpertisesFromChoiceOption(option).forEach((skillCode) => {
            if (Object.values(Skills).includes(skillCode as Skills)) {
              expertiseFromFeat.add(skillCode);
            }
          });
        }
      }
    }
  }

  if (backgroundFeat) {
    if (backgroundFeat.grantedSkills && Array.isArray(backgroundFeat.grantedSkills)) {
      (backgroundFeat.grantedSkills as string[]).forEach((s) => allSkills.add(s));
    }

    if (validData.backgroundFeatChoiceSelections) {
      for (const rawId of Object.values(validData.backgroundFeatChoiceSelections)) {
        const ids = Array.isArray(rawId) ? rawId : [rawId];
        for (const choiceOptionId of ids) {
          const featChoice = backgroundFeat.featChoiceOptions?.find((fco) => fco.choiceOptionId === Number(choiceOptionId));
          const option = featChoice?.choiceOption;
          if (!option) continue;

          extractSkillsFromChoiceOption(option).forEach((skillCode) => {
            if (Object.values(Skills).includes(skillCode as Skills)) {
              allSkills.add(skillCode);
            }
          });
          extractExpertisesFromChoiceOption(option).forEach((skillCode) => {
            if (Object.values(Skills).includes(skillCode as Skills)) {
              expertiseFromFeat.add(skillCode);
            }
          });
        }
      }
    }
  }

  for (const granted of content.featsGrantedByChoiceOptions) {
    const selections = findSpeciesFeatSelections(validData, content, granted);
    for (const choiceOptionId of collectChoiceOptionIds(selections)) {
      const option = granted.featChoiceOptions.find((fco) => fco.choiceOptionId === choiceOptionId)?.choiceOption;
      if (!option) continue;
      extractSkillsFromChoiceOption(option).forEach((skillCode) => {
        if (Object.values(Skills).includes(skillCode as Skills)) allSkills.add(skillCode);
      });
      extractExpertisesFromChoiceOption(option).forEach((skillCode) => {
        if (Object.values(Skills).includes(skillCode as Skills)) expertiseFromFeat.add(skillCode);
      });
    }
  }

  const uniqueFeatureIds = Array.from(new Set(initialFeatureIds));

  // 2. Prepare Equipment
  const weaponsToCreate: { weaponId: number }[] = [];
  const armorsToCreate: { armorId: number }[] = [];
  const customEquipmentLines: string[] = [];

  let startingMoney = emptyPurse();
  // Coins live inside the item lists themselves ("зм" x75). Both sources — origin belongings and
  // class starting equipment — are split the same way: purse to Pers.gp/sp/…, the rest to the bag.
  const takeStartingItems = (items: StartingItem[]) => {
    const { purse, belongings } = splitStartingItems(items);
    startingMoney = addToPurse(startingMoney, purse);
    for (const { name, quantity } of belongings) customEquipmentLines.push(`${name} x${quantity}`);
  };

  takeStartingItems(
    findBackgroundStartingItems(background, validData.equipmentSchema?.backgroundEquipmentChoice),
  );

  if (validData.equipmentSchema) {
      const { choiceGroupToId, anyWeaponSelection } = validData.equipmentSchema;
      const equipmentOptionById = new Map(equipmentOptions.map((option) => [option.optionId, option]));

      // Choice Groups
      for (const ids of Object.values(choiceGroupToId)) {
          for (const id of ids) {
              const opt = equipmentOptionById.get(id);
              if (opt) {
                  if (opt.weaponId) {
                    const qty = Number.isFinite(opt.quantity) ? Math.max(1, Math.trunc(opt.quantity)) : 1;
                    for (let i = 0; i < qty; i++) weaponsToCreate.push({ weaponId: opt.weaponId });
                  }
                  if (opt.armorId) armorsToCreate.push({ armorId: opt.armorId });
                  if (typeof opt.item === "string" && opt.item.trim()) {
                    const qty = Number.isFinite(opt.quantity) ? opt.quantity : 1;
                    takeStartingItems([{ name: opt.item, quantity: qty }]);
                  }
                  if (opt.equipmentPack && Array.isArray(opt.equipmentPack.items)) {
                      for (const item of opt.equipmentPack.items as unknown[]) {
                        if (!isRecord(item)) continue;
                        const name = typeof item.name === "string" ? item.name : null;
                        const quantity =
                          typeof item.quantity === "number"
                            ? item.quantity
                            : typeof item.quantity === "string"
                              ? Number(item.quantity)
                              : NaN;

                        if (name && Number.isFinite(quantity)) {
                          customEquipmentLines.push(`${name} x${quantity}`);
                        }
                      }
                  }
              }
          }
      }

      // Any Weapon
      for (const ids of Object.values(anyWeaponSelection)) {
          ids.forEach(id => weaponsToCreate.push({ weaponId: id }));
      }
  }

  // 3. Prepare Choices
  const uniqueChoiceOptionsToConnect = selectedChoiceOptionIds.map((choiceOptionId) => ({ choiceOptionId }));

  const expertiseFromClassSubclassChoices = new Set<string>();
  for (const opt of selectedChoiceOptions) {
    const effectKind = String(opt.effectKind ?? "").trim();
    const skillCode = String(opt.effectSkill ?? "").trim();
    if (!Object.values(Skills).includes(skillCode as Skills)) continue;
    const skill = skillCode as Skills;

    if (effectKind === "SKILL_PROFICIENCY") {
      allSkills.add(skill);
    } else if (effectKind === "SKILL_EXPERTISE") {
      allSkills.add(skill);
      expertiseFromClassSubclassChoices.add(skill);
    }
  }

  for (const opt of raceChoiceOptions) {
    findSkillsGrantedByChosenOption(opt.skillProficiencies, Object.values(Skills)).forEach((skill) => allSkills.add(skill));
  }

  const languagesKnown = new Set<string>(
    collectOriginLanguages(ruleset, []).map((language) => translateValue(language)),
  );
  (race.languages ?? []).forEach((l) => languagesKnown.add(translateValue(String(l))));
  (cls.languages ?? []).forEach((l) => languagesKnown.add(translateValue(String(l))));
  (subrace?.additionalLanguages ?? []).forEach((l: Language) => languagesKnown.add(translateValue(String(l))));
  (feat?.grantedLanguages ?? []).forEach((l: Language) => languagesKnown.add(translateValue(String(l))));
  (backgroundFeat?.grantedLanguages ?? []).forEach((l: Language) => languagesKnown.add(translateValue(String(l))));

  for (const opt of raceChoiceOptions) {
    parseStringArray(opt.languages).forEach((language) => languagesKnown.add(translateValue(language)));
  }

  if (validData.languagesSchema?.languages) {
    validData.languagesSchema.languages.forEach((l) => languagesKnown.add(translateValue(String(l))));
  }

  const profLines: string[] = [];
  const armorAll = [
    ...(race.armorProficiencies ?? []),
    ...((cls.armorProficiencies ?? []) as ArmorType[]),
    ...(subclass ? parseEnumArray(subclass.armorProficiencies, ArmorType) : []),
    ...(subrace ? parseEnumArray(subrace.armorProficiencies, ArmorType) : []),
    ...(feat ? parseEnumArray(feat.grantedArmorProficiencies, ArmorType) : []),
    ...(backgroundFeat ? parseEnumArray(backgroundFeat.grantedArmorProficiencies, ArmorType) : []),
  ];
  const armorText = formatArmorProficiencies(Array.from(new Set(armorAll)));
  if (armorText && armorText !== "—") profLines.push(armorText);

  const toolTextParts = [
    formatToolProficiencies(parseStringArray(race.toolProficiencies), parseOptionalNumber(race.toolToChooseCount)),
    formatToolProficiencies(parseEnumArray(cls.toolProficiencies, ToolCategory), parseOptionalNumber(cls.toolToChooseCount)),
    formatToolProficiencies(subrace ? parseEnumArray(subrace.toolProficiencies, ToolCategory) : [], subrace ? parseOptionalNumber(subrace.toolToChooseCount) : undefined),
    parseStringArray(background.toolProficiencies).length
      ? parseStringArray(background.toolProficiencies)
          .map((t) => translateValue(t))
          .filter(Boolean)
          .join(", ")
      : "—",
    formatToolProficiencies(feat ? parseEnumArray(feat.grantedToolProficiencies, ToolCategory) : [], countFeatToolChoices(feat?.name)),
    formatToolProficiencies(backgroundFeat ? parseEnumArray(backgroundFeat.grantedToolProficiencies, ToolCategory) : [], countFeatToolChoices(backgroundFeat?.name)),
  ].filter((x) => x && x !== "—");
  if (toolTextParts.length) profLines.push(toolTextParts.join("\n"));

  const weaponTextParts = [
    formatWeaponProficiencies(parseWeaponProficiencies(race.weaponProficiencies)),
    formatWeaponProficiencies(
      parseWeaponProficiencies(cls.weaponProficiencies),
      parseWeaponProficienciesSpecial(cls.weaponProficienciesSpecial)
    ),
    formatWeaponProficiencies(subclass ? parseWeaponProficiencies(subclass.weaponProficiencies) : null),
    formatWeaponProficiencies(subrace ? parseWeaponProficiencies(subrace.weaponProficiencies) : null),
    formatWeaponProficiencies(feat ? parseWeaponProficiencies(feat.grantedWeaponProficiencies) : null),
    formatWeaponProficiencies(backgroundFeat ? parseWeaponProficiencies(backgroundFeat.grantedWeaponProficiencies) : null),
  ].filter((x) => x && x !== "—");
  if (weaponTextParts.length) profLines.push(weaponTextParts.join("\n"));

  const allFeatureIdsToCreate = Array.from(new Set([
    ...uniqueFeatureIds,
    ...optionalGrantedFeatureIds,
    ...choiceOptionFeatureIds,
    ...raceChoiceTraitFeatureIds,
    ...featOptionFeatureIds,
  ])).filter((id) => Number.isFinite(id) && id > 0);

  const featureProficiencyLines: string[] = [];
  if (allFeatureIdsToCreate.length > 0) {
    for (const f of features) {
      parseStringArray(f.skillProficiencies).forEach((skill) => allSkills.add(skill));

      const armorText = formatArmorProficiencies((f.armorProficiencies ?? []) as ArmorType[]);
      if (armorText && armorText !== "—") featureProficiencyLines.push(armorText);

      const toolText = formatToolProficiencies(parseEnumArray(f.toolProficiencies, ToolCategory), null);
      if (toolText && toolText !== "—") featureProficiencyLines.push(toolText);

      const weaponText = formatWeaponProficiencies(
        parseWeaponProficiencies(f.weaponProficiencies),
        parseWeaponProficienciesSpecial(f.weaponProficienciesSpecial)
      );
      if (weaponText && weaponText !== "—") featureProficiencyLines.push(weaponText);
    }
  }

  if (featureProficiencyLines.length) {
    const existing = new Set(profLines);
    for (const line of featureProficiencyLines) {
      if (!line || line === "—" || existing.has(line)) continue;
      existing.add(line);
      profLines.push(line);
    }
  }

  const customProficiencies = profLines.join("\n");

  // Check if any feature grants proficiency via skillExpertises.getProficiencyAsWell
  const selectedExpertisesForProficiencyCheck = validData.expertiseSchema?.expertises || [];
  for (const f of features) {
    const se = parseJsonRecord(f.skillExpertises);
    if (se?.getProficiencyAsWell && Array.isArray(se.options)) {
      for (const skill of selectedExpertisesForProficiencyCheck) {
        if (se.options.includes(skill)) {
           allSkills.add(skill);
        }
      }
    }
  }

  if (ruleset === "RULES_2024") {
    const expertiseProblem = findExpertiseSelectionProblem({
      grants: features
        .map((feature) => readExpertiseGrant(feature.skillExpertises))
        .filter((grant) => grant !== null),
      selected: selectedExpertisesForProficiencyCheck,
      proficientSkills: Array.from(allSkills),
      existingExpertises: [
        ...expertiseFromFeat,
        ...expertiseFromClassSubclassChoices,
      ],
    });
    if (expertiseProblem) return { error: expertiseProblem };
  }

  if (allFeatureIdsToCreate.length > 0) {
    for (const f of features) {
      (f.givesLanguages || []).forEach((l) => languagesKnown.add(translateValue(String(l))));
    }
  }

  const languageSourceCounts = [
    parseOptionalNumber(race.languagesToChooseCount),
    subrace ? parseOptionalNumber(subrace.languagesToChooseCount) : undefined,
    parseOptionalNumber(background.languagesToChooseCount),
    feat ? parseOptionalNumber(feat.grantedLanguageCount) : undefined,
    backgroundFeat ? parseOptionalNumber(backgroundFeat.grantedLanguageCount) : undefined,
    parseOptionalNumber(cls.languagesToChooseCount),
    ...raceChoiceOptions.map((opt) => parseOptionalNumber(opt.languagesToChooseCount)),
  ];

  // If the user picked languages in the form, don't keep "choose more" prompts.
  const hasLanguageSelections = Boolean(validData.languagesSchema?.languages?.length);
  const languageChoiceLines = hasLanguageSelections
    ? []
    : buildLanguageChoiceLines(ruleset, languageSourceCounts);

  const customLanguagesKnown = [
    Array.from(languagesKnown).filter(Boolean).join("\n"),
    languageChoiceLines.join("\n"),
  ]
    .filter((x) => x && x.trim())
    .join("\n");


  try {
    const newPers = await prisma.$transaction(async (tx) => {
      const createdPers = await tx.pers.create({
        data: {
          userId: user.id,
          name: validData.name,
          ruleset,
          raceId: validData.raceId,
          subraceId: validData.subraceId,
          classId: validData.classId,
          subclassId: validData.subclassId,
          backgroundId: validData.backgroundId,

          currentSpellSlots,
          currentPactSlots,

          raceStaticAcBonus: initialRaceStaticAcBonus,

          customLanguagesKnown,
          customProficiencies,

          // Starting money from background and class starting equipment
          cp: String(startingMoney.cp),
          sp: String(startingMoney.sp),
          ep: String(startingMoney.ep),
          gp: String(startingMoney.gp),
          pp: String(startingMoney.pp),

          // Save proficiency source-of-truth (prefill from class at creation)
          additionalSaveProficiencies: savingThrows,

          str: scores.STR,
          dex: scores.DEX,
          con: scores.CON,
          int: scores.INT,
          wis: scores.WIS,
          cha: scores.CHA,

          // Placeholder, updated below once we know class hit die
          currentHp: 10,
          maxHp: 10,

          customEquipment: customEquipmentLines.join("\n"),

          raceVariants: validData.raceVariantId
            ? {
                connect: { raceVariantId: validData.raceVariantId },
              }
            : undefined,

          raceChoiceOptions:
            raceChoiceOptionIds.length > 0
              ? {
                  connect: raceChoiceOptionIds.map((optionId) => ({ optionId })),
                }
              : undefined,

          features:
            allFeatureIdsToCreate.length > 0
              ? {
                  createMany: {
                    data: allFeatureIdsToCreate.map((featureId) => ({ featureId })),
                    skipDuplicates: true,
                  },
                }
              : undefined,
          choiceOptions:
            uniqueChoiceOptionsToConnect.length > 0
              ? {
                  connect: uniqueChoiceOptionsToConnect,
                }
              : undefined,
          classOptionalFeatures:
            acceptedOptionalFeatureIds.length > 0
              ? {
                  connect: acceptedOptionalFeatureIds.map((optionalFeatureId) => ({ optionalFeatureId })),
                }
              : undefined,
        },
      });

      if (optionalReplacedFeatureIds.length > 0) {
        await tx.persFeature.deleteMany({
          where: {
            persId: createdPers.persId,
            featureId: { in: optionalReplacedFeatureIds },
          },
        });
      }

      // Save Feat + Feat choices AFTER Pers exists
      if (validData.featId) {
        await saveFeatWithChoices(tx, createdPers.persId, validData.featId, validData.featChoiceSelections);
      }

      // Save Background Feat + choices
      const effectiveBgFeatId = validData.backgroundFeatId ?? background.originFeatId;
      if (effectiveBgFeatId) {
        await saveFeatWithChoices(
          tx,
          createdPers.persId,
          effectiveBgFeatId,
          validData.backgroundFeatChoiceSelections,
        );
      }

      // Риса, яку дав вибір: бойовий стиль приходить від класу, друга риса Людини 2024 — від виду,
      // і лише друга несе власні вибори (три навички Skilled, список Magic Initiate).
      for (const granted of content.featsGrantedByChoiceOptions) {
        if (!character.featIdsFromChoiceOptions.includes(granted.featId)) continue;
        await saveFeatWithChoices(tx, createdPers.persId, granted.featId, pickOwnSelections(granted, findSpeciesFeatSelections(validData, content, granted)));
      }

      await saveGrantedSpells(tx, createdPers.persId, content, ruleset);
      await saveRuleGrantedClassSpells(tx, { persId: createdPers.persId, classId: validData.classId, subclassId: validData.subclassId });
      if (chosenSpells.featSpells.length > 0) {
        await tx.persSpell.createMany({ data: buildFeatPersSpellRows(createdPers.persId, chosenSpells.featSpells, 1), skipDuplicates: true });
      }
      if (chosenSpells.classSpells) {
        await saveClassSpellSelection(tx, { persId: createdPers.persId, ...chosenSpells.classSpells, learnedAtLevel: 1 });
      }
      if (chosenSpells.classOptionSpells) {
        await tx.persSpell.createMany({
          data: buildClassOptionPersSpellRows({ persId: createdPers.persId, ...chosenSpells.classOptionSpells, learnedAtLevel: 1 }),
          skipDuplicates: true,
        });
      }

      // Save skills AFTER Pers exists (createMany + skipDuplicates)
      const skillRows = Array.from(allSkills)
        .filter((skillName) => Object.values(Skills).includes(skillName as Skills))
        .map((skillName) => {
          const skillEnum = skillName as Skills;
          const skillIndex = Object.values(Skills).indexOf(skillEnum);
          return {
            persId: createdPers.persId,
            name: skillEnum,
            skillId: skillIndex + 1,
            proficiencyType: SkillProficiencyType.PROFICIENT,
          };
        })
        .filter((row) => row.skillId > 0);

      if (skillRows.length > 0) {
        await tx.persSkill.createMany({
          data: skillRows,
          skipDuplicates: true,
        });
      }

      // Update expertise skills (upsert so it's safe even if missing)
      const expertiseSkills = new Set<string>([
        ...(validData.expertiseSchema?.expertises ?? []),
        ...expertiseFromFeat,
        ...expertiseFromClassSubclassChoices,
      ]);

      for (const skillName of expertiseSkills) {
        if (!Object.values(Skills).includes(skillName as Skills)) continue;
        const skillEnum = skillName as Skills;
        const skillIndex = Object.values(Skills).indexOf(skillEnum);
        await tx.persSkill.upsert({
          where: {
            persId_name: {
              persId: createdPers.persId,
              name: skillEnum,
            },
          },
          update: {
            proficiencyType: SkillProficiencyType.EXPERTISE,
          },
          create: {
            persId: createdPers.persId,
            name: skillEnum,
            skillId: skillIndex + 1,
            proficiencyType: SkillProficiencyType.EXPERTISE,
          },
        });
      }

      // Save weapons AFTER Pers exists
      if (weaponsToCreate.length > 0) {
        await tx.persWeapon.createMany({
          data: weaponsToCreate.map((w) => ({
            persId: createdPers.persId,
            weaponId: w.weaponId,
          })),
          skipDuplicates: true,
        });
      }
      await grantStartingUnarmedStrike(tx, createdPers.persId, { className: cls.name, ruleset });

      // Майстерність зброї 2024 — вибір гравця перевіряється проти класу, а не приймається на віру.
      const masteryOffer = await findCreationWeaponMasteryOffer(tx, { classId: validData.classId, ruleset });
      await replacePersWeaponMastery(tx, createdPers.persId, validData.weaponMasteryWeaponIds ?? [], masteryOffer);

      // Save armors AFTER Pers exists
      if (armorsToCreate.length > 0) {
        const armorMetas = await tx.armor.findMany({
          where: { armorId: { in: armorsToCreate.map((a) => a.armorId) } },
          select: { armorId: true, abilityBonuses: true, abilityBonusType: true },
        });
        const metaById = new Map<number, { abilityBonuses: any; abilityBonusType: any }>(
          armorMetas.map((m) => [m.armorId, { abilityBonuses: m.abilityBonuses ?? [], abilityBonusType: m.abilityBonusType }])
        );

        await tx.persArmor.createMany({
          data: armorsToCreate.map((a, index) => ({
            persId: createdPers.persId,
            armorId: a.armorId,
            abilityBonuses: metaById.get(a.armorId)?.abilityBonuses ?? [],
            abilityBonusType: metaById.get(a.armorId)?.abilityBonusType,
            equipped: race.name === "TORTLE_MPMM" ? false : index === 0,
          })),
          skipDuplicates: true,
        });
      }

      // Explicit AC sources as equipable armor entries (seeded, translated)
      // Tortle: 17.
      // Monk UD: 10 + DEX + WIS.
      // Barbarian UD: 10 + DEX + CON.
      // Some races: natural armor base formula (e.g., 13+DEX, 12+DEX, 12+CON).
      try {
        const isTortle = race.name === "TORTLE_MPMM";

        const raceAc = parseJsonRecord(race.ac);
        const getSeededNaturalArmorName = (): string | null => {
          if (!raceAc || typeof raceAc !== "object") return null;
          if (typeof raceAc.base === "number") {
            const base = Math.trunc(raceAc.base);
            const bonus = raceAc.bonus;
            if (base === 17 && (bonus === null || bonus === undefined)) return "NATURAL_ARMOR_TORTLE";
            if (base === 13 && bonus === "DEX") return "NATURAL_ARMOR_13_DEX";
            if (base === 12 && bonus === "DEX") return "NATURAL_ARMOR_12_DEX";
            if (base === 12 && bonus === "CON") return "NATURAL_ARMOR_12_CON";
          }
          return null;
        };

        const seededArmorNames = new Set<string>();

        const naturalArmorName = getSeededNaturalArmorName();
        if (naturalArmorName) seededArmorNames.add(naturalArmorName);
        if (cls.name === "MONK_2014") seededArmorNames.add("UNARMORED_DEFENSE_MONK");
        if (cls.name === "BARBARIAN_2014") seededArmorNames.add("UNARMORED_DEFENSE_BARBARIAN");

        if (seededArmorNames.size > 0) {
          const rows = await tx.armor.findMany({
            where: {
              ruleset,
              name: { in: Array.from(seededArmorNames).filter((name): name is ArmorCategory => Object.values(ArmorCategory).includes(name as ArmorCategory)) },
            },
            select: { armorId: true, name: true, abilityBonuses: true, abilityBonusType: true },
          });

          const byName = new Map<string, { armorId: number; abilityBonuses: any; abilityBonusType: any }>(
            rows.map((r) => [String(r.name), { armorId: r.armorId, abilityBonuses: r.abilityBonuses ?? [], abilityBonusType: r.abilityBonusType }])
          );

          const specialArmorsToCreate: Array<{
            persId: number;
            armorId: number;
            abilityBonuses: any;
            abilityBonusType: any;
            miscACBonus: number;
            isProficient: boolean;
            equipped: boolean;
          }> = [];

          // Race natural armor
          if (naturalArmorName && byName.has(naturalArmorName)) {
            const meta = byName.get(naturalArmorName)!;
            specialArmorsToCreate.push({
              persId: createdPers.persId,
              armorId: meta.armorId,
              abilityBonuses: meta.abilityBonuses,
              abilityBonusType: meta.abilityBonusType,
              miscACBonus: 0,
              isProficient: true,
              equipped: isTortle,
            });
          }

          // Class unarmored defenses
          if (cls.name === "MONK_2014" && byName.has("UNARMORED_DEFENSE_MONK")) {
            const meta = byName.get("UNARMORED_DEFENSE_MONK")!;
            specialArmorsToCreate.push({
              persId: createdPers.persId,
              armorId: meta.armorId,
              abilityBonuses: meta.abilityBonuses,
              abilityBonusType: meta.abilityBonusType,
              miscACBonus: 0,
              isProficient: true,
              equipped: !isTortle && armorsToCreate.length === 0,
            });
          }
          if (cls.name === "BARBARIAN_2014" && byName.has("UNARMORED_DEFENSE_BARBARIAN")) {
            const meta = byName.get("UNARMORED_DEFENSE_BARBARIAN")!;
            specialArmorsToCreate.push({
              persId: createdPers.persId,
              armorId: meta.armorId,
              abilityBonuses: meta.abilityBonuses,
              abilityBonusType: meta.abilityBonusType,
              miscACBonus: 0,
              isProficient: true,
              equipped: !isTortle && armorsToCreate.length === 0,
            });
          }

          // If we have a non-tortle natural armor and the character otherwise has no armor,
          // equip the natural armor by default.
          if (!isTortle && armorsToCreate.length === 0 && naturalArmorName && naturalArmorName !== "NATURAL_ARMOR_TORTLE") {
            const idx = specialArmorsToCreate.findIndex((a) => {
              const name = Array.from(byName.entries()).find(([, meta]) => meta.armorId === a.armorId)?.[0];
              return name === naturalArmorName;
            });
            if (idx >= 0) {
              specialArmorsToCreate[idx] = { ...specialArmorsToCreate[idx], equipped: true };
            }
          }

          if (specialArmorsToCreate.length > 0) {
            await tx.persArmor.createMany({
              data: specialArmorsToCreate,
            });
          }
        }
      } catch {
        // Best-effort; character creation should not fail if we can't create special AC sources.
      }

      // Формули базового КЗ 2024 — окремим правилом за виданими фічами, а не за назвою класу:
      // у 2024 їх відкриває ще й підклас (Драконяча живучість чародія). KR27.8.
      await grantAlternativeArmorClassFormulas(tx, createdPers.persId, ruleset);

      await tx.pers.update({
        where: { persId: createdPers.persId },
        data: {
          maxHp,
          currentHp: maxHp,
        },
      });

      return createdPers;
    });

    revalidatePath("/char/create");
    return { success: true, persId: newPers.persId };
  } catch (error) {
    console.error("Error creating character:", error);
    return { error: "Database error" };
  }
}

/**
 * 2014 лишає окремий рядок на кожне джерело — так підказка показує, звідки взявся кожен вибір.
 * 2024 має рівно два вибори на весь Origin, тому й рядок один.
 */
function buildLanguageChoiceLines(
  ruleset: Ruleset,
  sourceCounts: ReadonlyArray<number | null | undefined>,
): string[] {
  if (ruleset === "RULES_2024") {
    const count = countOriginLanguageChoices(ruleset, sourceCounts);
    return count > 0 ? [`Обери ще ${count}`] : [];
  }

  return sourceCounts
    .filter((count): count is number => typeof count === "number" && count > 0)
    .map((count) => `Обери ще ${count}`);
}
