"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createCharacterSnapshot } from "@/lib/actions/snapshot-actions";
import { Ability, ArmorType, Feats, SkillProficiencyType, Skills, ToolCategory } from "@prisma/client";
import {
  formatArmorProficiencies,
  formatToolProficiencies,
  formatWeaponProficiencies,
  translateValue,
} from "@/lib/components/characterCreator/infoUtils";

import { toRulesSpellcastingCharacter } from "@/lib/logic/spell-logic";
import { SPELL_SLOT_PROGRESSION } from "@/lib/refs/static";
import { findFeatsGrantedByChoiceOptions } from "@/rules/feat-sources";
import { findFeatPackageProblem, toFeatInstance } from "@/server/db/feat-gates";
import { calculateAverageHitPointIncrease } from "@/rules/health";
import { sumLevelUpFeatureHitPoints, toHitPointGrantingFeature } from "@/rules/hit-points";
import { normalizeSkillProficiencies } from "@/rules/proficiency";
import { isAbilityScoreIncreaseLevel } from "@/rules/progression";
import {
  findAbilityScoreCeiling,
  findFeatAbilityScoreSource,
  raiseAbilityScore,
  type AbilityScoreIncreaseSource,
} from "@/rules/ability-score-ceiling";
import { buildCharacterLevels, findClassLevel } from "@/rules/character-level";
import { findFirstUnmetInvocationPrerequisite, type InvocationPrerequisite } from "@/rules/warlock-invocations";
import { findMulticlassProficiencies } from "@/rules/multiclass-proficiencies";
import { findInfusionPicksAtLevel } from "@/rules/artificer-infusions";
import { buildSpeciesPersSpellRows, findMissingSpeciesGrants } from "@/server/db/species-level-grants";
import {
  buildClassPersSpellRows,
  buildSubclassPersSpellRows,
  findMissingClassSpells,
  findMissingSubclassOptionSpells,
  findMissingSubclassSpells,
  type ClassAtLevel,
} from "@/server/db/always-prepared-spell-grants";
import { buildFeatPersSpellRows, findMissingFeatSpells } from "@/server/db/feat-spell-grants";
import {
  buildChosenFeatSpells,
  findFeatSpellChoiceProblem,
  findFeatSpellGrowthProblem,
  loadFeatSpellChoiceOffer,
  loadFeatSpellGrowthOffer,
} from "@/server/db/feat-spell-choices";
import { hasFeatSpellChoice, type FeatSpellChoiceOffer, type FeatSpellGrowthOffer } from "@/rules/feat-spell-choices";
import { findClassSpellProblem, loadClassSpellOffer, saveClassSpellSelection, type ClassSpellOffer } from "@/server/db/class-spell-choices";
import { applyLevelUp, mergeUniqueLines } from "@/rules/levelup";
import { growFeatureUsesToNewMaximums } from "@/server/db/levelup-resource-growth";
import { getRulesStrategy } from "@/rules/strategies";
import type { SpellcastingCharacter } from "@/rules/types";
import type { GrantedSpell } from "@/rules/spell-sources";
import type { RulesetId } from "@/rules/strategies/types";

import { baseChoiceGroupName, CHOICE_GROUPS, getChoicePoolRule } from "@/lib/logic/choicePoolRules";
import type { LevelUpInput } from "@/lib/zod/schemas/levelUpSchema";
import {
  loadLevelUpBaseContent,
  loadLevelUpChoiceContent,
  loadLevelUpFeatureEffects,
  loadLevelUpOptionalFeatures,
} from "@/server/db/levelup-content";
import { parseEnumArray, parseJsonRecord, parseWeaponProficiencies, parseWeaponProficienciesSpecial } from "@/server/db/json";
import { buildFeatLanguageLines, buildFeatProficiencyLines } from "@/server/db/feat-text-grants";
import { applyAbilityIncreases, collectFeatGrants } from "@/rules/feat-grants";
import type { AbilityScores } from "@/rules/types";
import { findPersWeaponMasteryOffer, findPersWeaponProficiency, replacePersWeaponMastery } from "@/server/db/weapon-mastery";
import { grantAlternativeArmorClassFormulas } from "@/server/db/armor-class-formulas";
import { findUserIdByEmail } from "@/server/db/users";
import { buildClassOptionPersSpellRows } from "@/server/db/class-option-spell-choices";
import { findLevelUpClassOptionSpellProblem } from "@/server/db/levelup-class-option-spells";
import { canEditPers } from "@/lib/actions/pers";
import { findCustomAsiPackageProblem } from "@/rules/abilities";
import { findExpertiseSelectionProblem, readExpertiseGrant } from "@/rules/expertise-selections";

const ALL_SKILLS = Object.values(Skills) as Skills[];

export async function getLevelUpInfo(persId: number) {
  const session = await auth();
  if (!session?.user?.email) return { error: "Unauthorized" };

  const userId = await findUserIdByEmail(session.user.email);
  if (userId === null) return { error: "Unauthorized" };

  const { pers, classes, feats, infusions, weapons } = await loadLevelUpBaseContent(persId);

  if (!pers) return { error: "Character not found" };

  // Той самий гейт, що на маршрутах /api/character* (character-access.ts): власник,
  // співвласник або редактор теки. Без нього будь-хто залогінений бачив чужі кроки підвищення.
  const canEdit = await canEditPers(persId, userId);
  if (!canEdit) return { error: "Character not found" };

  const nextLevel = pers.level + 1;
  if (nextLevel > 20) return { error: "Max level reached" };

  const currentClass = classes.find((c) => c.classId === pers.classId);
  const currentSubclass =
    currentClass?.subclasses?.find((s) => s.subclassId === pers.subclassId) ?? null;

  const rulesStrategy = getRulesStrategy((pers.ruleset as "RULES_2014" | "RULES_2024") ?? "RULES_2014");
  // Підклас і ASI відкриває рівень КЛАСУ: у Wizard 2 / Fighter 3 персонаж уже 5-го рівня, а
  // підкласу чарівника ще нема (§4). Для персонажа без мультикласу число те саме, що й було.
  const mainClassLevelAfter = findMainClassLevel(pers) + 1;
  const needsSubclass = rulesStrategy.needsSubclassSelection(currentClass ?? {}, Boolean(pers.subclassId), mainClassLevelAfter);
  const isASILevel = isAbilityScoreIncreaseLevel(currentClass ?? {}, mainClassLevelAfter);

  const newClassFeatures = (currentClass?.features ?? []).filter((f) => f.levelGranted === mainClassLevelAfter);
  const newSubclassFeatures = (currentSubclass?.features ?? []).filter((f) => f.levelGranted === mainClassLevelAfter);

  const classChoiceGroups: Record<string, NonNullable<typeof currentClass>["classChoiceOptions"][number][]> = {};
  const classChoiceOptions = (currentClass?.classChoiceOptions ?? []).filter((opt) =>
    (opt.levelsGranted ?? []).includes(nextLevel)
  );
  for (const opt of classChoiceOptions) {
    const key = opt.choiceOption?.groupName || "Опції";
    if (!classChoiceGroups[key]) classChoiceGroups[key] = [];
    classChoiceGroups[key].push(opt);
  }

  const subclassChoiceGroups: Record<string, NonNullable<typeof currentSubclass>["subclassChoiceOptions"][number][]> = {};
  const subclassChoiceOptions = (currentSubclass?.subclassChoiceOptions ?? []).filter((opt) =>
    (opt.levelsGranted ?? []).includes(nextLevel)
  );
  for (const opt of subclassChoiceOptions) {
    const key = opt.choiceOption?.groupName || "Опції";
    if (!subclassChoiceGroups[key]) subclassChoiceGroups[key] = [];
    subclassChoiceGroups[key].push(opt);
  }

  return {
    pers,
    nextLevel,
    needsSubclass,
    isASILevel,
    newClassFeatures,
    newSubclassFeatures,
    classChoiceGroups,
    subclassChoiceGroups,
    classes,
    feats,
    infusions,
    weapons,
    weaponProficiency: await findPersWeaponProficiency(prisma, persId),
  };
}

type LevelUpPers = NonNullable<Awaited<ReturnType<typeof loadLevelUpBaseContent>>["pers"]>;

/** Рівень основного класу ніде не збережений — це рівень персонажа мінус рівні мультикласів. */
function findMainClassLevel(pers: LevelUpPers): number {
  return findClassLevel(toCharacterLevels(pers, pers.level), pers.class.name);
}

function toCharacterLevels(pers: LevelUpPers, characterLevel: number) {
  return buildCharacterLevels({
    characterLevel,
    mainClassName: pers.class.name,
    multiclasses: (pers.multiclasses ?? []).map((entry) => ({
      className: entry.class.name,
      classLevel: entry.classLevel,
    })),
  });
}

/**
 * Риси й заклинання виду, які персонаж заслужив рівнем персонажа, але ще не має. Ретроактивність
 * тут безкоштовна: персонаж, створений до KR18.5, добере пропущене на найближчому підвищенні.
 */
function readMissingSpeciesGrants(pers: LevelUpPers, characterLevel: number) {
  return findMissingSpeciesGrants({
    ruleset: pers.ruleset,
    characterLevel,
    raceTraits: pers.race.traits,
    raceChoiceOptions: pers.raceChoiceOptions,
    ownedFeatureIds: pers.features.map((feature) => feature.featureId),
    ownedSpellIds: pers.persSpells.map((spell) => spell.spellId),
  });
}

async function findFeatFeatureIds(featId: number): Promise<number[]> {
  const features = await prisma.feature.findMany({
    where: { grantsByFeat: { some: { featId } } },
    select: { featureId: true },
  });
  return features.map((feature) => feature.featureId);
}

/**
 * Класи персонажа після цього підвищення, кожен зі своїм рівнем і підкласом: книга відкриває
 * заклинання класу й підкласу рівнем ЦЬОГО класу, і мультиклас цього не пришвидшує. Класи, яких
 * підвищення не торкнулося, теж тут — так персонаж добере пропущене, як і з рисами виду.
 */
function collectClassesAtLevel(args: {
  pers: LevelUpPers;
  mainClassLevel: number;
  selectedClassId: number;
  selectedSubclassId: number | undefined;
  classLevelAfter: number;
}): Array<ClassAtLevel & { subclassId: number | null }> {
  const classRows = [
    {
      classId: args.pers.classId,
      subclassId: args.pers.subclassId ?? null,
      classLevel: args.mainClassLevel,
      ability: (args.pers.class?.primaryCastingStat ?? null) as ClassAtLevel["ability"],
    },
    ...(args.pers.multiclasses || []).map((multiclass) => ({
      classId: multiclass.classId,
      subclassId: multiclass.subclassId ?? null,
      classLevel: multiclass.classLevel || 0,
      ability: (multiclass.class?.primaryCastingStat ?? null) as ClassAtLevel["ability"],
    })),
  ];

  return classRows.map((row) => {
    if (row.classId !== args.selectedClassId) return row;

    return { ...row, classLevel: args.classLevelAfter, subclassId: args.selectedSubclassId ?? row.subclassId };
  });
}

/** Список кроку «Заклинання» майстра: той самий завантажувач, яким `executeLevelUp` перевіряє вибір. */
export async function loadLevelUpSpellOffer(persId: number, input: LevelUpSpellOfferInput): Promise<ClassSpellOffer | null> {
  const session = await auth();
  if (!session?.user?.email) return null;
  const userId = await findUserIdByEmail(session.user.email);
  if (userId === null || !(await canEditPers(persId, userId))) return null;

  return loadPersLevelUpSpellOffer(persId, input);
}

export async function loadLevelUpFeatSpellOffer(persId: number, input: { featId: number; featChoiceOptionIds: readonly number[] }): Promise<FeatSpellChoiceOffer | null> {
  return loadPersFeatSpellOffer(persId, input, 1);
}

// Риса з листа береться на поточному рівні персонажа, а не на наступному.
export async function loadSheetFeatSpellOffer(persId: number, input: { featId: number; featChoiceOptionIds: readonly number[] }): Promise<FeatSpellChoiceOffer | null> {
  return loadPersFeatSpellOffer(persId, input, 0);
}

async function loadPersFeatSpellOffer(
  persId: number,
  input: { featId: number; featChoiceOptionIds: readonly number[] },
  characterLevelOffset: number,
): Promise<FeatSpellChoiceOffer | null> {
  const session = await auth();
  if (!session?.user?.email) return null;
  const userId = await findUserIdByEmail(session.user.email);
  if (userId === null || !(await canEditPers(persId, userId))) return null;

  const [pers, feat] = await Promise.all([
    prisma.pers.findUnique({ where: { persId }, select: { ruleset: true, level: true, persSpells: { select: { spellId: true } } } }),
    prisma.feat.findUnique({ where: { featId: input.featId }, select: { name: true } }),
  ]);
  if (!pers || !feat) return null;

  return loadFeatSpellChoiceOffer(prisma, {
    ruleset: pers.ruleset as RulesetId,
    featName: feat.name,
    chosenOptionIds: input.featChoiceOptionIds,
    context: { characterLevel: pers.level + characterLevelOffset, ownedFeatSpellCount: 0 },
    unavailableSpellIds: pers.persSpells.map((spell) => spell.spellId),
  });
}

export async function loadLevelUpFeatSpellGrowthOffer(persId: number): Promise<FeatSpellGrowthOffer | null> {
  const session = await auth();
  if (!session?.user?.email) return null;
  const userId = await findUserIdByEmail(session.user.email);
  if (userId === null || !(await canEditPers(persId, userId))) return null;

  const pers = await prisma.pers.findUnique({ where: { persId }, select: { ruleset: true, level: true, persSpells: { select: { spellId: true } } } });
  if (!pers || pers.level >= 20) return null;

  return loadFeatSpellGrowthOffer(prisma, {
    persId,
    ruleset: pers.ruleset as RulesetId,
    characterLevel: pers.level + 1,
    unavailableSpellIds: pers.persSpells.map((spell) => spell.spellId),
  });
}

export type LevelUpSpellOfferInput = {
  classId: number;
  subclassId: number | null;
  classChoiceOptionIds: readonly number[];
  /** Рід джина обирається тим самим підвищенням, що й заклинання (O43), — фільтр роду мусить його бачити. */
  subclassChoiceOptionIds?: readonly number[];
};

export async function loadPersLevelUpSpellOffer(persId: number, input: LevelUpSpellOfferInput): Promise<ClassSpellOffer | null> {
  const pers = await prisma.pers.findUnique({
    where: { persId },
    select: {
      level: true,
      classId: true,
      subclassId: true,
      multiclasses: { select: { classId: true, classLevel: true, subclassId: true } },
      choiceOptions: { select: { choiceOptionId: true } },
    },
  });
  if (!pers) return null;

  const multiclass = pers.multiclasses.find((row) => row.classId === input.classId);
  const mainClassLevel = pers.level - pers.multiclasses.reduce((sum, row) => sum + row.classLevel, 0);
  const classLevelBefore = input.classId === pers.classId ? mainClassLevel : multiclass?.classLevel ?? 0;
  const existingSubclassId = input.classId === pers.classId ? pers.subclassId : multiclass?.subclassId ?? null;

  return loadClassSpellOffer(prisma, {
    classId: input.classId,
    classLevel: classLevelBefore + 1,
    subclassId: input.subclassId ?? existingSubclassId ?? null,
    chosenClassOptionIds: [
      ...pers.choiceOptions.map((option) => option.choiceOptionId),
      ...input.classChoiceOptionIds,
      ...(input.subclassChoiceOptionIds ?? []),
    ],
    persId,
  });
}

export async function executeLevelUp(persId: number, data: LevelUpInput) {
    try {
    const info = await getLevelUpInfo(persId);
    if ("error" in info) return info;

    const { pers, classes, feats } = info;

    const nextLevel = pers.level + 1;
    if (nextLevel > 20) return { error: "Max level reached" };

    const levelUpPath = data?.levelUpPath === "MULTICLASS" ? "MULTICLASS" : "EXISTING";
    const selectedClassId = Number(data?.classId);
    if (!Number.isFinite(selectedClassId)) return { error: "Оберіть клас для підвищення" };

    const ownedClassIds = new Set<number>([pers.classId, ...(pers.multiclasses || []).map((m) => m.classId)]);
    const hasClassAlready = ownedClassIds.has(selectedClassId);
    if (levelUpPath === "EXISTING" && !hasClassAlready) {
      return { error: "Цей клас ще не взято. Оберіть мультиклас." };
    }
    if (levelUpPath === "MULTICLASS" && hasClassAlready) {
      return { error: "Цей клас уже взято. Оберіть існуючий клас." };
    }

    const selectedClass = classes.find((characterClass) => characterClass.classId === selectedClassId);
    if (!selectedClass) return { error: "Клас не знайдено" };

    const multiclassRow = (pers.multiclasses || []).find((m) => m.classId === selectedClassId) ?? null;
    const mainClassLevel = (() => {
      const extras = (pers.multiclasses || []).reduce((acc, m) => acc + (m.classLevel || 0), 0);
      const computed = pers.level - extras;
      return computed > 0 ? computed : 1;
    })();

    const classLevelBefore = levelUpPath === "MULTICLASS"
      ? 0
      : selectedClassId === pers.classId
        ? mainClassLevel
        : multiclassRow?.classLevel ?? 0;
    const classLevelAfter = classLevelBefore + 1;

    // ===== 1) Stats =====
    const newStats = {
      str: pers.str,
      dex: pers.dex,
      con: pers.con,
      int: pers.int,
      wis: pers.wis,
      cha: pers.cha,
    };

    const abilityToStatKey: Record<string, keyof typeof newStats> = {
      STR: "str",
      DEX: "dex",
      CON: "con",
      INT: "int",
      WIS: "wis",
      CHA: "cha",
    };

    // Стеля залежить від джерела підвищення, тому береться на кожне з них окремо: класовий ASI
    // стоїть на 20 навіть тоді, коли на цьому ж рівні епічний дар підіймає свою до 30.
    const standardCeiling = findAbilityScoreCeiling({ ruleset: pers.ruleset, source: "STANDARD" });
    let abilityScoreSource: AbilityScoreIncreaseSource = "STANDARD";

    if (Array.isArray(data?.customAsi) && data.customAsi.length) {
      const asiProblem = findCustomAsiPackageProblem(data.customAsi);
      if (asiProblem) return { error: asiProblem };
      // Рівень класу, що підвищується САМЕ ЗАРАЗ — не головного класу персонажа (L08-levelup-machine-13:
      // info.isASILevel рахує ASI за головним класом, а мультиклас підвищує будь-який з узятих).
      if (!isAbilityScoreIncreaseLevel(selectedClass, classLevelAfter)) {
        return { error: "На цьому рівні підвищення характеристик недоступне" };
      }
    }

    if (Array.isArray(data?.customAsi)) {
      for (const asi of data.customAsi as Array<{ ability?: string; value?: string }>) {
        const ability = String(asi?.ability || "");
        const key = abilityToStatKey[ability];
        const delta = Number(asi?.value);
        if (!key) continue;
        if (!Number.isFinite(delta) || (delta !== 1 && delta !== 2)) continue;
        newStats[key] = raiseAbilityScore(newStats[key], delta, standardCeiling);
      }
    }

    // ===== 2) Feat + feat choices =====
    const featId = data?.featId ? Number(data.featId) : undefined;
    const featChoiceSelections = (data?.featChoiceSelections || {}) as Record<string, number | number[]>;
    const featChoiceOptionIds = Object.values(featChoiceSelections)
      .flatMap((v) => (Array.isArray(v) ? v : [v]))
      .map((v) => Number(v))
      .filter((v) => Number.isFinite(v));

    let featFeatureIds: number[] = [];
    let chosenFeatSpells: GrantedSpell[] = [];
    let featLanguageLines: string[] = [];
    let featProficiencyLines: string[] = [];

    const skillsToAdd = new Set<Skills>();
    const skillsToExpertise = new Set<Skills>();
    const saveProficienciesToAdd = new Set<Ability>();
    let nextAdditionalSaveProficiencies: Ability[] | null = null;

    const expertiseSelections = (data?.expertiseSchema?.expertises || []) as Skills[];
    const levelUpSkillSelections = (data?.levelUpSkillSelections || {}) as Record<string, string[]>;

    if (featId) {
      const feat = feats.find((candidate) => candidate.featId === featId);

      if (!feat) return { error: "Рису не знайдено" };
      const featProblem = findFeatPackageProblem(
        [{ feat, source: "CLASS_ASI", choiceOptionIds: featChoiceOptionIds }],
        pers.feats.map(toFeatInstance),
      );
      if (featProblem) return { error: featProblem };
      const featSpellIds = hasFeatSpellChoice(pers.ruleset as RulesetId, feat.name) ? data.featSpellIds : [];
      const featSpellProblem = await findFeatSpellChoiceProblem(prisma, {
        ruleset: pers.ruleset as RulesetId,
        featName: feat.name,
        chosenOptionIds: featChoiceOptionIds,
        context: { characterLevel: nextLevel, ownedFeatSpellCount: 0 },
        selectedSpellIds: featSpellIds,
        unavailableSpellIds: pers.persSpells.map((spell) => spell.spellId),
      });
      if (featSpellProblem) return { error: featSpellProblem };
      chosenFeatSpells = buildChosenFeatSpells(feat.name, featSpellIds);
      abilityScoreSource = findFeatAbilityScoreSource(feat.category);
      const featCeiling = findAbilityScoreCeiling({ ruleset: pers.ruleset, source: abilityScoreSource });
      // Каталог — знімок робочої бази, і id фіч у ньому можуть не існувати в базі цього процесу.
      featFeatureIds = await findFeatFeatureIds(feat.featId);

      featLanguageLines = buildFeatLanguageLines(feat);
      featProficiencyLines = buildFeatProficiencyLines(feat);

      const featGrants = collectFeatGrants(feat, featChoiceOptionIds);
      const raisedScores = applyAbilityIncreases(toAbilityScores(newStats), featGrants.abilityIncreases, featCeiling);
      Object.assign(newStats, fromAbilityScores(raisedScores));
      featGrants.proficientSkills.forEach((skill) => skillsToAdd.add(skill as Skills));
      featGrants.expertiseSkills.forEach((skill) => skillsToExpertise.add(skill as Skills));
      featGrants.saveProficiencies.forEach((ability) => saveProficienciesToAdd.add(ability as Ability));
    }

    nextAdditionalSaveProficiencies = saveProficienciesToAdd.size
      ? Array.from(
        new Set([
          ...parseEnumArray(pers.additionalSaveProficiencies, Ability),
          ...Array.from(saveProficienciesToAdd),
        ])
      )
      : null;

    // ===== 3) HP increase (from wizard) =====
    const hpIncreaseFromWizard = data?.levelUpHpIncrease;
    // levelUpHpIncrease should contain ONLY the hit die portion (avg or roll)
    const classToLevelUp = selectedClass || pers.class;
    const hitDiePart = typeof hpIncreaseFromWizard === "number" && Number.isFinite(hpIncreaseFromWizard)
      ? Math.max(0, Math.trunc(hpIncreaseFromWizard))
      : calculateAverageHitPointIncrease(classToLevelUp.hitDie);

    // Tough logic
    const alreadyHasTough = pers.feats.some((persFeat) => persFeat.feat?.name === Feats.TOUGH);
    const takingTough = (featId && (feats.find(f => f.featId === featId)?.name === Feats.TOUGH));

    // ===== 4) Subclass selection for the selected class =====
    const chosenSubclassIdRaw = data?.subclassId ? Number(data.subclassId) : undefined;
    const existingSubclassIdForClass =
      selectedClassId === pers.classId ? pers.subclassId ?? undefined : multiclassRow?.subclassId ?? undefined;

    const subclassIdForSelectedClass = chosenSubclassIdRaw ?? existingSubclassIdForClass;
    if (subclassIdForSelectedClass) {
      const belongs = (selectedClass.subclasses || []).some((s: any) => s.subclassId === subclassIdForSelectedClass);
      if (!belongs) return { error: "Підклас не належить обраному класу" };
    }

    const selectedSubclass = subclassIdForSelectedClass
      ? (selectedClass.subclasses || []).find((s: any) => s.subclassId === subclassIdForSelectedClass) ?? null
      : null;

    type SelectionsRecord = Record<string, number | number[]> | undefined;

    const flattenSelections = (selections: SelectionsRecord): number[] => {
      if (!selections) return [];
      const out: number[] = [];
      for (const value of Object.values(selections)) {
        if (Array.isArray(value)) {
          for (const v of value) {
            const id = Number(v);
            if (Number.isFinite(id)) out.push(id);
          }
        } else {
          const id = Number(value);
          if (Number.isFinite(id)) out.push(id);
        }
      }
      return out;
    };

    const selectionIdsByBaseGroup = (selections: SelectionsRecord) => {
      const map = new Map<string, number[]>();
      if (!selections) return map;
      for (const [groupName, raw] of Object.entries(selections)) {
        const base = baseChoiceGroupName(groupName);
        const ids = Array.isArray(raw) ? raw : [raw];
        for (const v of ids) {
          const id = Number(v);
          if (!Number.isFinite(id)) continue;
          const arr = map.get(base) ?? [];
          arr.push(id);
          map.set(base, arr);
        }
      }
      return map;
    };

    const isKnowledgeGroup = (name: string) => {
      const lower = String(name || "").toLowerCase();
      return (
        lower.includes("blessing of knowledge") ||
        lower.startsWith("благословення знань")
      );
    };

    // BUG-009, рішення власника 2026-09-14: вибори першого рівня класу створення персонажа не
    // вимагає, тож і вхід у клас мультикласом їх не вимагає — інакше той самий рівень того самого
    // класу поводиться по-різному залежно від шляху.
    const isEnteringClass = classLevelAfter === 1;

    const validateChoiceSelections = async (args: {
      scope: "class" | "subclass";
      selections: SelectionsRecord;
      allowedOptionsAtLevel: any[];
      className?: string;
      subclassName?: string;
    }) => {
      const ids = flattenSelections(args.selections);
      if (!ids.length) {
        if (args.allowedOptionsAtLevel.length && !isEnteringClass) return { error: "Дооберіть опції" } as const;
        return null;
      }

      const ownedChoiceOptionIds = new Set<number>(
        (pers.choiceOptions || [])
          .map((co: any) => Number(co?.choiceOptionId))
          .filter((v: any) => Number.isFinite(v))
      );

      const allowedIds = new Set<number>();
      const allowedGroups = new Map<string, Set<number>>();
      for (const opt of args.allowedOptionsAtLevel) {
        const id = Number(opt.choiceOptionId);
        if (!Number.isFinite(id)) continue;
        allowedIds.add(id);
        const base = baseChoiceGroupName(opt.choiceOption?.groupName || "Опції");
        const set = allowedGroups.get(base) ?? new Set<number>();
        set.add(id);
        allowedGroups.set(base, set);
      }

      // Validate each selected id is allowed and not already owned.
      for (const id of ids) {
        if (!allowedIds.has(id)) {
          return { error: "Обрана опція недоступна на цьому рівні" } as const;
        }
        if (ownedChoiceOptionIds.has(id)) {
          return { error: "Ця опція вже обрана персонажем" } as const;
        }
      }

      // Enforce required pick-count per base group (pool rules; default 1 per group).
      const selectedByGroup = selectionIdsByBaseGroup(args.selections);
      for (const [baseGroup, allowedSet] of allowedGroups.entries()) {
        const rule = getChoicePoolRule({
          scope: args.scope,
          groupName: baseGroup,
          className: args.className,
          subclassName: args.subclassName,
        });

        const expected = rule
          ? Number(rule.picksAtLevel(classLevelAfter)) || 0
          : isKnowledgeGroup(baseGroup)
            ? 2
            : 1;
        const selected = selectedByGroup.get(baseGroup) ?? [];

        // If a rule exists but returns 0, treat as non-required (defensive), but still validate ids.
        if (expected > 0) {
          const isMissingPicks = selected.length < expected && !isEnteringClass;
          if (isMissingPicks || selected.length > expected) {
            return { error: `Оберіть ${expected} опц.` } as const;
          }
        }

        // Prevent duplicates inside a group.
        const unique = new Set(selected);
        if (unique.size !== selected.length) {
          return { error: "Опції в групі мають бути різними" } as const;
        }

        // Extra defense: ensure selected IDs belong to that group’s allowed set.
        for (const id of selected) {
          if (!allowedSet.has(id)) return { error: "Обрана опція не з тієї групи" } as const;
        }
      }

      // Warlock invocation prerequisites (server-side).
      const invocationGroup = CHOICE_GROUPS.WARLOCK_INVOCATIONS;
      const isWarlock2014 = args.scope === "class" && args.className === "WARLOCK_2014";
      const isWarlock2024 = args.scope === "class" && args.className === "WARLOCK_2024";

      const readPrerequisite = (raw: unknown): InvocationPrerequisite => {
        const prereq = parseJsonRecord(raw);
        return {
          level: prereq?.level ? Number(prereq.level) : undefined,
          pact: prereq?.pact ? String(prereq.pact) : undefined,
        };
      };

      if (isWarlock2014) {
        // 2014: Дар пакту — окрема одноразова група вибору; персонаж має щонайбільше один.
        const invSelected = selectedByGroup.get(invocationGroup) ?? [];
        if (invSelected.length) {
          const invOptions = selectedChoiceContent.choiceOptions.filter((option) =>
            invSelected.includes(option.choiceOptionId),
          );

          const unmet = findFirstUnmetInvocationPrerequisite({
            classLevel: classLevelAfter,
            knownOptionNameEngs: new Set(effectivePact ? [effectivePact] : []),
            selectedInvocations: invOptions.map((opt) => ({
              optionNameEng: String(opt.optionNameEng ?? ""),
              prerequisite: readPrerequisite(opt.prerequisites),
            })),
          });

          if (unmet?.reason === "level") return { error: "Цей виклик недоступний на цьому рівні" } as const;
          if (unmet?.reason === "pact") {
            return { error: effectivePact ? "Цей виклик вимагає іншого Пакту" : "Спершу оберіть Пакт" } as const;
          }
        }
      }

      if (isWarlock2024) {
        // 2024: Pact of the Blade/Chain/Tome — самі такі самі виклики з тієї ж групи, а не
        // окрема фіча; передумова звіряється проти вже відомих + обраних у цьому пакеті.
        const invSelected = selectedByGroup.get(invocationGroup) ?? [];
        if (invSelected.length) {
          const knownInvocationOptionNameEngs = new Set(
            (pers.choiceOptions || [])
              .filter((co: any) => co?.groupName === invocationGroup)
              .map((co: any) => String(co?.optionNameEng ?? ""))
              .filter(Boolean),
          );

          const invOptions = selectedChoiceContent.choiceOptions.filter((option) =>
            invSelected.includes(option.choiceOptionId),
          );

          const unmet = findFirstUnmetInvocationPrerequisite({
            classLevel: classLevelAfter,
            knownOptionNameEngs: knownInvocationOptionNameEngs,
            selectedInvocations: invOptions.map((opt) => ({
              optionNameEng: String(opt.optionNameEng ?? ""),
              prerequisite: readPrerequisite(opt.prerequisites),
            })),
          });

          if (unmet?.reason === "level") return { error: "Цей виклик недоступний на цьому рівні" } as const;
          if (unmet?.reason === "pact") {
            return { error: "Цей виклик вимагає іншого виклику, якого у вас ще немає" } as const;
          }
        }
      }

      return null;
    };

    const classChoiceSelections = data?.classChoiceSelections as SelectionsRecord;
    const subclassChoiceSelections = data?.subclassChoiceSelections as SelectionsRecord;
    const selectedChoiceContent = await loadLevelUpChoiceContent([
      ...featChoiceOptionIds,
      ...flattenSelections(classChoiceSelections),
      ...flattenSelections(subclassChoiceSelections),
    ]);
    const selectedClassOptionIds = new Set(flattenSelections(classChoiceSelections));
    const selectedPact = selectedChoiceContent.choiceOptions.find((option) =>
      selectedClassOptionIds.has(option.choiceOptionId) && option.optionNameEng?.startsWith("Pact of"),
    )?.optionNameEng;
    const persPact = (pers.choiceOptions || []).find(
      (option: { optionNameEng?: string }) => option.optionNameEng?.startsWith("Pact of"),
    )?.optionNameEng;
    const effectivePact = selectedPact ?? persPact;
    const languageSelections = (data?.languagesSchema?.languages || []) as string[];
    const languageSelectionExtras = languageSelections.map((l) => translateValue(String(l)));

    const allowedClassOptionsAtLevel = (selectedClass.classChoiceOptions || []).filter((opt: any) =>
      (opt.levelsGranted || []).includes(classLevelAfter)
    );

    const allowedSubclassOptionsAtLevel = selectedSubclass
      ? (selectedSubclass.subclassChoiceOptions || []).filter((opt: any) => (opt.levelsGranted || []).includes(classLevelAfter))
      : [];

    const classValidation = await validateChoiceSelections({
      scope: "class",
      selections: classChoiceSelections,
      allowedOptionsAtLevel: allowedClassOptionsAtLevel,
      className: selectedClass.name,
    });
    if (classValidation) return classValidation;

    const subclassValidation = await validateChoiceSelections({
      scope: "subclass",
      selections: subclassChoiceSelections,
      allowedOptionsAtLevel: allowedSubclassOptionsAtLevel,
      subclassName: selectedSubclass?.name,
    });
    if (subclassValidation) return subclassValidation;

    const classAndSubclassChoiceIds = Array.from(
      new Set([
        ...flattenSelections(classChoiceSelections),
        ...flattenSelections(subclassChoiceSelections),
      ])
    );
    if (classAndSubclassChoiceIds.length) {
      const selectedChoiceOptions = selectedChoiceContent.choiceOptions.filter((option) =>
        classAndSubclassChoiceIds.includes(option.choiceOptionId),
      );

      for (const opt of selectedChoiceOptions) {
        const effectKind = String(opt.effectKind ?? "").trim();
        const skillCode = String(opt.effectSkill ?? "").trim();
        if (!Object.values(Skills).includes(skillCode as Skills)) continue;
        const skill = skillCode as Skills;

        if (effectKind === "SKILL_PROFICIENCY") {
          skillsToAdd.add(skill);
        } else if (effectKind === "SKILL_EXPERTISE") {
          skillsToAdd.add(skill);
          skillsToExpertise.add(skill);
        }
      }
    }

    // ===== 5) Features + choices =====
    const featuresToAdd = new Set<number>();
    const choiceOptionIds: number[] = [];

    // Class features for THIS class level
    for (const cf of (selectedClass.features || [])) {
      if (cf.levelGranted === classLevelAfter) featuresToAdd.add(cf.featureId);
    }

    // Subclass features for THIS class level
    if (selectedSubclass) {
      for (const sf of (selectedSubclass.features || [])) {
        if (sf.levelGranted === classLevelAfter) featuresToAdd.add(sf.featureId);
      }
    }

    // Feat features
    for (const fid of featFeatureIds) featuresToAdd.add(fid);

    // Риси виду за рівнем ПЕРСОНАЖА — Драконячий політ на 5-му приходить незалежно від того,
    // який клас гравець щойно підняв (референс §4).
    const speciesGrants = readMissingSpeciesGrants(pers, nextLevel);
    for (const trait of speciesGrants.traits) featuresToAdd.add(trait.featureId);

    const featureIdsFromChoiceOptions = new Set<number>();

    const processChoiceSelections = async (selections: Record<string, number | number[]> | undefined) => {
      if (!selections) return;
      for (const optionIdRaw of Object.values(selections)) {
        const ids = Array.isArray(optionIdRaw) ? optionIdRaw : [optionIdRaw];
        for (const v of ids) {
          const optionId = Number(v);
          if (!Number.isFinite(optionId)) continue;
          choiceOptionIds.push(optionId);
          const choiceFeatures = selectedChoiceContent.choiceOptionFeatures.filter(
            (entry) => entry.choiceOptionId === optionId,
          );
          for (const f of choiceFeatures) {
            featuresToAdd.add(f.featureId);
            featureIdsFromChoiceOptions.add(f.featureId);
          }
        }
      }
    };

    await processChoiceSelections(classChoiceSelections);
    await processChoiceSelections(subclassChoiceSelections);
    await processChoiceSelections(featChoiceSelections);

    // Optional class features (replacements)
    const optionalSelections = (data?.classOptionalFeatureSelections || {}) as Record<string, boolean>;
    const acceptedOptionalIds = Object.entries(optionalSelections)
      .filter(([, accepted]) => accepted === true)
      .map(([id]) => Number(id))
      .filter((id) => Number.isFinite(id));

    // Auto-grant conditional optionals that depend on previously-taken choices
    // (e.g. Deft Explorer follow-ups at later levels).
    const choiceOptionIdsAfter = new Set<number>(
      (pers.choiceOptions || [])
        .map((co: any) => Number(co?.choiceOptionId))
        .filter((v: any) => Number.isFinite(v))
    );
    const addFromSelections = (sel: Record<string, number | number[]> | undefined) => {
      if (!sel) return;
      for (const raw of Object.values(sel)) {
        const arr = Array.isArray(raw) ? raw : [raw];
        for (const v of arr) {
          const n = Number(v);
          if (Number.isFinite(n)) choiceOptionIdsAfter.add(n);
        }
      }
    };
    addFromSelections(classChoiceSelections);
    addFromSelections(subclassChoiceSelections);
    addFromSelections(featChoiceSelections);

    const acceptedOptionalSet = new Set<number>(acceptedOptionalIds);
    for (const opt of selectedClass.classOptionalFeatures || []) {
      if (!(opt?.grantedOnLevels || []).includes(classLevelAfter)) continue;
      if (!opt?.optionalFeatureId) continue;

      const isReplacement = Boolean(
        opt?.replacesInvocation ||
          opt?.replacesFightingStyle ||
          opt?.replacesManeuver ||
          (Array.isArray(opt?.replacesFeatures) && opt.replacesFeatures.length > 0)
      );
      if (isReplacement) continue;

      const deps = opt?.appearsOnlyIfChoicesTaken || [];
      if (!Array.isArray(deps) || deps.length === 0) continue;

      // Only auto-grant entries that directly grant a feature.
      if (!opt?.featureId) continue;

      const eligible = deps.some((co: any) => choiceOptionIdsAfter.has(Number(co?.choiceOptionId)));
      if (!eligible) continue;

      acceptedOptionalSet.add(Number(opt.optionalFeatureId));
    }

    const acceptedOptionalIdsFinal = Array.from(acceptedOptionalSet);

    const optionalReplacementSelections =
      (data?.classOptionalFeatureReplacementSelections || {}) as Record<
        string,
        { removeChoiceOptionId?: number; addChoiceOptionId?: number }
      >;

    const optionalReplacedFeatureIds = new Set<number>();
    const optionalGrantedFeatureIds = new Set<number>();

    const replacementChoiceOptionDisconnectIds: number[] = [];
    const replacementChoiceOptionConnectIds: number[] = [];
    const replacementFeatureIdsToRemove = new Set<number>();
    const replacementFeatureIdsToAdd = new Set<number>();
    if (acceptedOptionalIdsFinal.length) {
      const optionalRecords = await loadLevelUpOptionalFeatures(acceptedOptionalIdsFinal);

      const isFightingStyleGroupName = (name: string) => {
        const normalized = String(name || "").trim().toLowerCase();
        return normalized === "бойовий стиль" || normalized.includes("бойовий стиль") || normalized.includes("fighting style");
      };

      for (const opt of optionalRecords) {
        if (opt.featureId) optionalGrantedFeatureIds.add(opt.featureId);
        for (const rep of opt.replacesFeatures) {
          optionalReplacedFeatureIds.add(rep.replacedFeatureId);
        }

        const needsSwap = Boolean(opt.replacesInvocation || opt.replacesFightingStyle || opt.replacesManeuver);
        if (!needsSwap) continue;

        const sel = optionalReplacementSelections[String(opt.optionalFeatureId)] || {};
        const removeChoiceOptionId = Number(sel.removeChoiceOptionId);
        const addChoiceOptionId = Number(sel.addChoiceOptionId);

        if (!Number.isFinite(removeChoiceOptionId) || !Number.isFinite(addChoiceOptionId) || removeChoiceOptionId === addChoiceOptionId) {
          return { error: "Оберіть що замінюєте і на що міняєте" };
        }

        // Validate remove is currently owned
        const ownedChoiceOptionIds = new Set<number>(
          (pers.choiceOptions || [])
            .map((co: any) => Number(co?.choiceOptionId))
            .filter((v: any) => Number.isFinite(v))
        );
        if (!ownedChoiceOptionIds.has(removeChoiceOptionId)) {
          return { error: "Обрана опція для заміни не належить персонажу" };
        }

        // Validate groups
        const groupName = opt.replacesInvocation
          ? "Потойбічні виклики"
          : opt.replacesFightingStyle
            ? "Бойовий стиль"
            : opt.replacesManeuver
              ? "Маневри майстра бою"
              : undefined;

        if (!groupName) {
          return { error: "Невідомий тип заміни" };
        }

        const ownedGroup = (pers.choiceOptions || []).find((co: any) => Number(co?.choiceOptionId) === removeChoiceOptionId)?.groupName;
        if (groupName === "Бойовий стиль") {
          if (!isFightingStyleGroupName(String(ownedGroup || ""))) {
            return { error: "Обрана опція для заміни не з тієї групи" };
          }
        } else if (String(ownedGroup || "") !== groupName) {
          return { error: "Обрана опція для заміни не з тієї групи" };
        }

        const replacementChoiceContent = await loadLevelUpChoiceContent([
          removeChoiceOptionId,
          addChoiceOptionId,
        ]);
        const addChoiceOption = replacementChoiceContent.choiceOptions.find(
          (option) => option.choiceOptionId === addChoiceOptionId,
        );
        if (!addChoiceOption) {
          return { error: "Нова опція не знайдена" };
        }
        if (groupName === "Бойовий стиль") {
          if (!isFightingStyleGroupName(String(addChoiceOption.groupName || ""))) {
            return { error: "Нова опція не з тієї групи" };
          }
        } else if (String(addChoiceOption.groupName || "") !== groupName) {
          return { error: "Нова опція не з тієї групи" };
        }

        // Prevent duplicates (except the one being replaced)
        const ownedWithoutRemoved = new Set(ownedChoiceOptionIds);
        ownedWithoutRemoved.delete(removeChoiceOptionId);
        if (ownedWithoutRemoved.has(addChoiceOptionId)) {
          return { error: "Ця опція вже обрана персонажем" };
        }

        // Invocation prerequisites: level and pact
        if (groupName === "Потойбічні виклики") {
          const prereq = parseJsonRecord(addChoiceOption.prerequisites);
          const minLevel = prereq?.level ? Number(prereq.level) : undefined;
          if (typeof minLevel === "number" && Number.isFinite(minLevel) && classLevelAfter < minLevel) {
            return { error: "Цей виклик недоступний на цьому рівні" };
          }
          const pact = prereq?.pact ? String(prereq.pact) : undefined;
          if (pact) {
            if (!effectivePact) return { error: "Спершу оберіть Пакт" };
            if (effectivePact !== pact) return { error: "Цей виклик вимагає іншого Пакту" };
          }
        }

        replacementChoiceOptionDisconnectIds.push(removeChoiceOptionId);
        replacementChoiceOptionConnectIds.push(addChoiceOptionId);

        const removeFeatures = replacementChoiceContent.choiceOptionFeatures.filter(
          (entry) => entry.choiceOptionId === removeChoiceOptionId,
        );
        const addFeatures = replacementChoiceContent.choiceOptionFeatures.filter(
          (entry) => entry.choiceOptionId === addChoiceOptionId,
        );

        for (const f of removeFeatures) replacementFeatureIdsToRemove.add(f.featureId);
        for (const f of addFeatures) replacementFeatureIdsToAdd.add(f.featureId);
      }
    }

    for (const fid of optionalGrantedFeatureIds) featuresToAdd.add(fid);

    for (const fid of replacementFeatureIdsToAdd) featuresToAdd.add(fid);

    const featureEffects = await loadLevelUpFeatureEffects([...featuresToAdd]);
    const traitHitPointsPerLevel = sumLevelUpFeatureHitPoints({
      ownedFeatures: pers.features.map((entry) => toHitPointGrantingFeature(entry.feature)),
      gainedFeatures: featureEffects.map(toHitPointGrantingFeature),
      leveledClassId: selectedClassId,
      classLevelAfter,
    });
    const featIdsFromChoiceOptions = findFeatsGrantedByChoiceOptions({
      chosenFeatureIds: [...featureIdsFromChoiceOptions],
      featsGrantingFeatures: feats.map((candidate) => ({
        featId: candidate.featId,
        featureIds: candidate.grantsFeature.map((feature) => feature.featureId),
        isRepeatable: candidate.isRepeatable,
      })),
      alreadyTakenFeatIds: [...pers.feats.map((persFeat) => persFeat.featId), ...(featId ? [featId] : [])],
    });
    const featureProficiencyExtras: string[] = [];
    if (featuresToAdd.size > 0) {
      for (const f of featureEffects) {
        const normalized = normalizeSkillProficiencies(f.skillProficiencies, ALL_SKILLS);
        if (normalized?.type === "fixed") {
          normalized.skills.forEach((s) => skillsToAdd.add(s));
        } else if (normalized?.type === "choice") {
          const rawSelections = levelUpSkillSelections[String(f.featureId)] ?? [];
          const unique = Array.from(new Set(rawSelections.map((s) => String(s))))
            .filter((s) => ALL_SKILLS.includes(s as Skills))
            .filter((s) => normalized.options.includes(s as Skills));

          if (unique.length !== normalized.choiceCount) {
            return { error: `Оберіть рівно ${normalized.choiceCount} навичок для ${f.name}` } as const;
          }

          unique.forEach((s) => skillsToAdd.add(s as Skills));
        }

        const armorText = formatArmorProficiencies((f.armorProficiencies ?? []) as ArmorType[]);
        if (armorText && armorText !== "—") featureProficiencyExtras.push(armorText);

        const toolText = formatToolProficiencies(parseEnumArray(f.toolProficiencies, ToolCategory), null);
        if (toolText && toolText !== "—") featureProficiencyExtras.push(toolText);

        const weaponText = formatWeaponProficiencies(
          parseWeaponProficiencies(f.weaponProficiencies),
          parseWeaponProficienciesSpecial(f.weaponProficienciesSpecial)
        );
        if (weaponText && weaponText !== "—") featureProficiencyExtras.push(weaponText);
      }
    }

    const featureLanguageExtras: string[] = [];
    if (featuresToAdd.size > 0) {
      for (const f of featureEffects) {
        (f.givesLanguages || []).forEach((l) => featureLanguageExtras.push(translateValue(String(l))));
      }
    }

    const combinedLanguageExtras = [
      ...featLanguageLines,
      ...languageSelectionExtras,
      ...featureLanguageExtras,
    ].filter((l) => String(l || "").trim());

    // Process skillExpertises from features being added
    for (const f of featureEffects) {
        const se = parseJsonRecord(f.skillExpertises);
        if (se?.getProficiencyAsWell && Array.isArray(se.options)) {
            for (const skill of expertiseSelections) {
                if (se.options.includes(skill)) {
                    skillsToAdd.add(skill as Skills);
                }
            }
        }
    }

    const expertiseProblem = pers.ruleset !== "RULES_2024" ? null : findExpertiseSelectionProblem({
      grants: featureEffects
        .map((feature) => readExpertiseGrant(feature.skillExpertises))
        .filter((grant) => grant !== null),
      selected: expertiseSelections,
      proficientSkills: [
        ...pers.skills
          .filter((skill) => skill.proficiencyType !== SkillProficiencyType.NONE)
          .map((skill) => skill.name),
        ...skillsToAdd,
      ],
      existingExpertises: [
        ...pers.skills
          .filter((skill) => skill.proficiencyType === SkillProficiencyType.EXPERTISE)
          .map((skill) => skill.name),
        ...skillsToExpertise,
      ],
    });
    if (expertiseProblem) return { error: expertiseProblem };
    expertiseSelections.forEach((skill) => skillsToExpertise.add(skill));

    const spellcastingAfter: SpellcastingCharacter = {
      level: nextLevel,
      characterClass: { name: pers.class.name, spellcastingType: pers.class.spellcastingType },
      subclass: selectedClassId === pers.classId
        ? { spellcastingType: selectedSubclass?.spellcastingType }
        : { spellcastingType: pers.subclass?.spellcastingType },
      multiclasses: levelUpPath === "MULTICLASS"
        ? [...pers.multiclasses.map((multiclass) => ({
            classLevel: multiclass.classLevel,
            characterClass: { name: multiclass.class.name, spellcastingType: multiclass.class.spellcastingType },
            subclass: { spellcastingType: multiclass.subclass?.spellcastingType },
          })), {
            classLevel: 1,
            characterClass: { name: selectedClass.name, spellcastingType: selectedClass.spellcastingType },
            subclass: { spellcastingType: selectedSubclass?.spellcastingType },
          }]
        : pers.multiclasses.map((multiclass) => ({
            classLevel: multiclass.classId === selectedClassId ? classLevelAfter : multiclass.classLevel,
            characterClass: { name: multiclass.class.name, spellcastingType: multiclass.class.spellcastingType },
            subclass: { spellcastingType: multiclass.classId === selectedClassId
              ? selectedSubclass?.spellcastingType
              : multiclass.subclass?.spellcastingType },
          })),
    };
    const transition = applyLevelUp({
      ruleset: pers.ruleset,
      level: pers.level,
      scores: { STR: pers.str, DEX: pers.dex, CON: pers.con, INT: pers.int, WIS: pers.wis, CHA: pers.cha },
      maxHp: pers.maxHp,
      currentHp: pers.currentHp,
      currentSpellSlots: pers.currentSpellSlots,
      currentPactSlots: pers.currentPactSlots,
      spellcasting: toRulesSpellcastingCharacter(pers),
      featureIds: pers.features.map((feature) => feature.featureId),
      proficientSkills: pers.skills.filter((skill) => skill.proficiencyType !== SkillProficiencyType.NONE).map((skill) => skill.name),
      expertiseSkills: pers.skills.filter((skill) => skill.proficiencyType === SkillProficiencyType.EXPERTISE).map((skill) => skill.name),
      additionalSaveProficiencies: pers.additionalSaveProficiencies,
    }, {
      scores: { STR: newStats.str, DEX: newStats.dex, CON: newStats.con, INT: newStats.int, WIS: newStats.wis, CHA: newStats.cha },
      abilityScoreSource,
      hitDieIncrease: hitDiePart,
      hasTough: alreadyHasTough,
      takesTough: Boolean(takingTough),
      traitHitPointsPerLevel,
      spellcastingAfter,
      featureIdsToAdd: [...featuresToAdd, ...replacementFeatureIdsToAdd],
      featureIdsToRemove: [...optionalReplacedFeatureIds, ...replacementFeatureIdsToRemove],
      proficientSkillsToAdd: [...skillsToAdd],
      expertiseSkillsToAdd: [...skillsToExpertise],
      saveProficienciesToAdd: [...saveProficienciesToAdd],
    }, {
      standardProgression: SPELL_SLOT_PROGRESSION.FULL,
      pactProgression: SPELL_SLOT_PROGRESSION.PACT,
    });
    const featureIdsToCreate = transition.featureIds.filter(
      (featureId) => !pers.features.some((feature) => feature.featureId === featureId),
    );
    const proficientSkillsToCreate = transition.proficientSkills.filter(
      (skill): skill is Skills => ALL_SKILLS.includes(skill as Skills) && !pers.skills.some((row) => row.name === skill),
    );
    const expertiseSkillsToUpsert = transition.expertiseSkills.filter(
      (skill): skill is Skills => ALL_SKILLS.includes(skill as Skills)
        && !pers.skills.some((row) => row.name === skill && row.proficiencyType === SkillProficiencyType.EXPERTISE),
    );

    const { problem: featGrowthProblem, spells: grownFeatSpells } = await findFeatSpellGrowthProblem(prisma, {
      persId,
      ruleset: pers.ruleset as RulesetId,
      characterLevel: nextLevel,
      selectedSpellIds: data.featGrowthSpellIds ?? [],
      unavailableSpellIds: [...pers.persSpells, ...chosenFeatSpells].map((spell) => spell.spellId),
    });
    if (featGrowthProblem) return { error: featGrowthProblem };

    // ===== 6) Persist =====
    // Заклинання, які клас дає обрати на новому рівні (KR31.5, Р43): нові замовляння, підготовлені,
    // книга чарівника. У 2014 обовʼязкова лише прибавка рівня, решта до таблиці — за бажанням (Р44).
    // Обране в Книгу тіней чи Магічні відкриття тим самим підвищенням класу вдруге не пропонується.
    const classOptionSpellIds = (data?.classOptionSpellIds ?? []) as number[];
    const { offer: classSpellOffer, problem: classSpellProblem } = await findClassSpellProblem(prisma, {
      classId: selectedClassId,
      classLevel: classLevelAfter,
      subclassId: subclassIdForSelectedClass ?? null,
      chosenClassOptionIds: [
        ...(pers.choiceOptions || []).map((option) => Number(option.choiceOptionId)),
        ...flattenSelections(classChoiceSelections),
        ...flattenSelections(subclassChoiceSelections),
      ],
      persId,
      selection: data.classSpells,
      unavailableSpellIds: [...[...speciesGrants.spells, ...chosenFeatSpells, ...grownFeatSpells].map((spell) => spell.spellId), ...classOptionSpellIds],
    });
    if (classSpellProblem) return { error: classSpellProblem };

    const ownedOptionIds = new Set((pers.choiceOptions || []).map((option) => Number(option.choiceOptionId)));
    const { problem: classOptionSpellProblem, sourceName: classOptionSpellSource } = await findLevelUpClassOptionSpellProblem({
      persId,
      newlyChosenOptionIds: flattenSelections(classChoiceSelections).filter((optionId) => !ownedOptionIds.has(optionId)),
      subclassAtLevel: subclassIdForSelectedClass ? { subclassId: subclassIdForSelectedClass, classLevel: classLevelAfter } : null,
      alsoChosenSpellIds: [
        ...[...speciesGrants.spells, ...chosenFeatSpells, ...grownFeatSpells].map((spell) => spell.spellId),
        ...Object.values(data.classSpells ?? {}).flat().filter((id): id is number => typeof id === "number"),
      ],
      selectedSpellIds: classOptionSpellIds,
    });
    if (classOptionSpellProblem) return { error: classOptionSpellProblem };

    await prisma.$transaction(async (tx) => {
      // Create snapshot before changes
      await createCharacterSnapshot(persId);

      // multiclass row update/create
      if (levelUpPath === "MULTICLASS") {
        await tx.persMulticlass.create({
          data: {
            persId,
            classId: selectedClassId,
            classLevel: 1,
            subclassId: subclassIdForSelectedClass ?? null,
          },
        });
      } else if (selectedClassId !== pers.classId) {
        // existing multiclass
        await tx.persMulticlass.update({
          where: { persId_classId: { persId, classId: selectedClassId } },
          data: {
            classLevel: classLevelAfter,
            ...(chosenSubclassIdRaw ? { subclassId: chosenSubclassIdRaw } : {}),
          },
        });
      }

      // Повтор уже перевірено гейтом; повторювана риса — другий рядок зі своїми виборами (Р37).
      let persFeatId: number | null = null;
      if (featId) {
        const created = await tx.persFeat.create({
          data: { featId, persId },
          select: { persFeatId: true },
        });
        persFeatId = created.persFeatId;
      }

      if (persFeatId && featChoiceOptionIds.length) {
        await tx.persFeatChoice.createMany({
          data: featChoiceOptionIds.map((choiceOptionId) => ({
            persFeatId: persFeatId as number,
            choiceOptionId,
          })),
          skipDuplicates: true,
        });
      }

      // Риса, яку дав вибір класу — так Паладин і Рейнджер 2024 беруть бойовий стиль на 2-му.
      if (featIdsFromChoiceOptions.length) {
        await tx.persFeat.createMany({
          data: featIdsFromChoiceOptions.map((grantedFeatId) => ({ persId, featId: grantedFeatId })),
          skipDuplicates: true,
        });
      }

      const customProficiencyExtras: string[] = [];

      // Клас, узятий не першим, дає скорочений набір книги, а не стартовий пакет: воїн тут без
      // важкого обладунку й без рятівних кидків (KR27.2).
      const multiclassProficiencies = levelUpPath === "MULTICLASS"
        ? findMulticlassProficiencies(selectedClass.name)
        : null;

      if (multiclassProficiencies) {
        const armorText = formatArmorProficiencies(multiclassProficiencies.armor);
        if (armorText && armorText !== "—") customProficiencyExtras.push(armorText);
        const weaponText = formatWeaponProficiencies(multiclassProficiencies.weapons);
        if (weaponText && weaponText !== "—") customProficiencyExtras.push(weaponText);
        const toolText = formatToolProficiencies(
          multiclassProficiencies.tools,
          multiclassProficiencies.toolChoiceCount,
        );
        if (toolText && toolText !== "—") customProficiencyExtras.push(toolText);
      }

      if (chosenSubclassIdRaw && selectedSubclass) {
        const armorText = formatArmorProficiencies(
          parseEnumArray(selectedSubclass.armorProficiencies, ArmorType)
        );
        if (armorText && armorText !== "—") customProficiencyExtras.push(armorText);
        const weaponText = formatWeaponProficiencies(
          parseWeaponProficiencies(selectedSubclass.weaponProficiencies)
        );
        if (weaponText && weaponText !== "—") customProficiencyExtras.push(weaponText);
      }

      customProficiencyExtras.push(...featProficiencyLines);

      if (featureProficiencyExtras.length) {
        customProficiencyExtras.push(...featureProficiencyExtras);
      }

      const customProficiencyUpdate = customProficiencyExtras.length
        ? { customProficiencies: mergeUniqueLines(pers.customProficiencies, customProficiencyExtras) }
        : {};

      // Update Pers core
      const disconnectIds = Array.from(new Set(replacementChoiceOptionDisconnectIds));
      const connectIds = Array.from(new Set([...choiceOptionIds, ...replacementChoiceOptionConnectIds]));

      await tx.pers.update({
        where: { persId },
        data: {
          level: transition.level,
          maxHp: transition.maxHp,
          currentHp: transition.currentHp,
          currentSpellSlots: transition.currentSpellSlots as number[],
          currentPactSlots: transition.currentPactSlots,
          ...(selectedClassId === pers.classId
            ? { subclassId: chosenSubclassIdRaw ?? pers.subclassId ?? null }
            : {}),
          str: transition.scores.STR,
          dex: transition.scores.DEX,
          con: transition.scores.CON,
          int: transition.scores.INT,
          wis: transition.scores.WIS,
          cha: transition.scores.CHA,
          ...(nextAdditionalSaveProficiencies ? { additionalSaveProficiencies: transition.additionalSaveProficiencies as Ability[] } : {}),
          ...customProficiencyUpdate,
          ...(combinedLanguageExtras.length > 0
            ? (() => {
              return {
                customLanguagesKnown: mergeUniqueLines(pers.customLanguagesKnown, combinedLanguageExtras),
              };
            })()
            : {}),
          choiceOptions:
            disconnectIds.length || connectIds.length
              ? {
                ...(disconnectIds.length
                  ? { disconnect: disconnectIds.map((choiceOptionId) => ({ choiceOptionId })) }
                  : {}),
                ...(connectIds.length
                  ? { connect: connectIds.map((choiceOptionId) => ({ choiceOptionId })) }
                  : {}),
              }
              : undefined,
          classOptionalFeatures: acceptedOptionalIdsFinal.length
            ? {
              connect: acceptedOptionalIdsFinal.map((optionalFeatureId) => ({ optionalFeatureId })),
            }
            : undefined,
        },
      });

      // Apply feat skill proficiencies/expertise
      if (proficientSkillsToCreate.length > 0) {
        const rows = proficientSkillsToCreate.map((skillEnum) => {
          const idx = Object.values(Skills).indexOf(skillEnum);
          return {
            persId,
            name: skillEnum,
            skillId: idx + 1,
            proficiencyType: SkillProficiencyType.PROFICIENT,
          };
        }).filter((r) => r.skillId > 0);

        if (rows.length) {
          await tx.persSkill.createMany({ data: rows, skipDuplicates: true });
        }
      }

      if (expertiseSkillsToUpsert.length > 0) {
        for (const skillEnum of expertiseSkillsToUpsert) {
          const idx = Object.values(Skills).indexOf(skillEnum);
          if (idx < 0) continue;
          await tx.persSkill.upsert({
            where: {
              persId_name: {
                persId,
                name: skillEnum,
              },
            },
            update: { proficiencyType: SkillProficiencyType.EXPERTISE },
            create: {
              persId,
              name: skillEnum,
              skillId: idx + 1,
              proficiencyType: SkillProficiencyType.EXPERTISE,
            },
          });
        }
      }

      // Вливання артифайсера ростуть за таблицею TCoE: 4 на 2 рівні й по 2 на 6 / 10 / 14 / 18.
      const infusionPicks = selectedClass?.name === "ARTIFICER_2014"
        ? findInfusionPicksAtLevel(classLevelAfter)
        : 0;

      if (infusionPicks > 0) {
        const rawSelections = Array.isArray(data?.infusionSelections) ? data.infusionSelections : [];
        const infusionIds = rawSelections
          .map((v: unknown) => Number(v))
          .filter((v: number) => Number.isFinite(v) && v > 0);

        if (infusionIds.length !== infusionPicks) {
          throw new Error(`Оберіть рівно ${infusionPicks} вливання`);
        }

        const eligible = await tx.infusion.findMany({
          where: {
            infusionId: { in: infusionIds },
            minArtificerLevel: { lte: classLevelAfter },
          },
          select: { infusionId: true },
        });

        if (eligible.length !== infusionIds.length) {
          throw new Error("Деякі вливання недоступні на цьому рівні");
        }

        const existing = await tx.persInfusion.findMany({
          where: {
            persId,
            infusionId: { in: infusionIds },
          },
          select: { infusionId: true },
        });

        const existingSet = new Set(existing.map((e) => e.infusionId));
        const toCreate = infusionIds.filter((id) => !existingSet.has(id));

        if (toCreate.length) {
          await tx.persInfusion.createMany({
            data: toCreate.map((infusionId) => ({
              persId,
              infusionId,
            })),
          });
        }
      }

      // Remove replaced features
      if (optionalReplacedFeatureIds.size > 0) {
        await tx.persFeature.deleteMany({
          where: {
            persId,
            featureId: { in: Array.from(optionalReplacedFeatureIds) },
          },
        });
      }

      // Remove features from swapped choice options (invocations/styles/maneuvers)
      if (replacementFeatureIdsToRemove.size > 0) {
        await tx.persFeature.deleteMany({
          where: {
            persId,
            featureId: { in: Array.from(replacementFeatureIdsToRemove) },
          },
        });
      }

      // Add features
      if (featureIdsToCreate.length > 0) {
        await tx.persFeature.createMany({
          data: featureIdsToCreate.map((featureId) => ({ persId, featureId })),
          skipDuplicates: true,
        });
      }

      // Нова фіча могла відкрити ще один спосіб рахувати базовий КЗ — Захист без обладунків
      // побічного класу або Драконячу живучість підкласу. Складати їх не можна: рядок
      // приходить невдягненим, вибір лишається за гравцем. KR27.8.
      await grantAlternativeArmorClassFormulas(tx, persId, pers.ruleset);

      // Новий рівень міг підняти максимум використань — залишок доростає на ту саму дельту, що й
      // слоти заклинань. Після запису рівня й після створення нових рядків фіч. KR31.3.
      await growFeatureUsesToNewMaximums(tx, persId, pers.level);

      // Майстерність зброї 2024. Ємність береться вже з нових рівнів — саме тому пул рахується
      // всередині транзакції, після запису рівня. Вибір змінний будь-коли, тож приходить повний
      // набір і повністю заміщає попередній (рішення власника 2026-08-30).
      if (Array.isArray(data?.weaponMasteryWeaponIds)) {
        const offer = await findPersWeaponMasteryOffer(tx, persId);
        if (offer.capacity > 0) {
          await replacePersWeaponMastery(tx, persId, data.weaponMasteryWeaponIds.map(Number), offer);
        }
      }

      // Заклинання родоводу 3-го і 5-го рівня — тими самими рядками, що й на 1-му (KR18.4).
      if (speciesGrants.spells.length > 0) {
        await tx.persSpell.createMany({
          data: buildSpeciesPersSpellRows(persId, speciesGrants.spells, nextLevel),
          skipDuplicates: true,
        });
      }

      // «Ви завжди маєте ці заклинання підготовленими» — те, що клас і підклас дають рівнем свого
      // класу. Понад ліміт підготовки, тому окремими рядками з власним джерелом (KR31.5).
      const classesAtLevel = collectClassesAtLevel({
        pers,
        mainClassLevel,
        selectedClassId,
        selectedSubclassId: subclassIdForSelectedClass,
        classLevelAfter,
      });
      const ownedSpellIds = pers.persSpells.map((spell) => spell.spellId);

      const classSpells = await findMissingClassSpells(tx, { classes: classesAtLevel, ownedSpellIds });
      if (classSpells.length > 0) {
        await tx.persSpell.createMany({
          data: buildClassPersSpellRows(persId, classSpells, nextLevel),
          skipDuplicates: true,
        });
      }

      const subclassSpells = await findMissingSubclassSpells(tx, {
        subclasses: classesAtLevel.flatMap((row) =>
          row.subclassId ? [{ subclassId: row.subclassId, classLevel: row.classLevel, ability: row.ability }] : [],
        ),
        ownedSpellIds: [...ownedSpellIds, ...classSpells.map((spell) => spell.spellId)],
      });
      if (subclassSpells.length > 0) {
        await tx.persSpell.createMany({
          data: buildSubclassPersSpellRows(persId, subclassSpells, nextLevel),
          skipDuplicates: true,
        });
      }

      // Опція підкласу, що сама несе заклинання (Коло землі 2024): усі обрані опції, не лише
      // цього рівня — Завірюха Полярної землі приходить на 5-му, а землю обрали на 3-му (KR37.3).
      const subclassOptionSpells = await findMissingSubclassOptionSpells(tx, {
        choiceOptionIds: [...choiceOptionIdsAfter],
        subclasses: classesAtLevel.flatMap((row) =>
          row.subclassId ? [{ subclassId: row.subclassId, classLevel: row.classLevel, ability: row.ability }] : [],
        ),
        ownedSpellIds: [...ownedSpellIds, ...classSpells.map((spell) => spell.spellId), ...subclassSpells.map((spell) => spell.spellId)],
      });
      if (subclassOptionSpells.length > 0) {
        await tx.persSpell.createMany({
          data: buildSubclassPersSpellRows(persId, subclassOptionSpells, nextLevel),
          skipDuplicates: true,
        });
      }

      if (classSpellOffer && data.classSpells) {
        await saveClassSpellSelection(tx, { persId, offer: classSpellOffer, selection: data.classSpells, learnedAtLevel: nextLevel });
      }
      if (classOptionSpellSource) {
        await tx.persSpell.createMany({
          data: buildClassOptionPersSpellRows({ persId, sourceName: classOptionSpellSource, spellIds: classOptionSpellIds, learnedAtLevel: nextLevel }),
          skipDuplicates: true,
        });
      }

      // Риса, що називає заклинання поіменно (Доторк феї → Туманний крок), — після класу й
      // підкласу, щоб за Р38 уже наявне заклинання другим рядком не лягало.
      // Обране гравцем у тій самій рисі (Доторк феї → заклинання Ворожіння) — тим самим рядком.
      const featSpells = [...(await findMissingFeatSpells(tx, persId)), ...chosenFeatSpells, ...grownFeatSpells];
      if (featSpells.length > 0) {
        await tx.persSpell.createMany({
          data: buildFeatPersSpellRows(persId, featSpells, nextLevel),
          skipDuplicates: true,
        });
      }
    });

    return { success: true };
    } catch (e) {
        console.error(e);
        return { error: "Failed to level up" };
    }
}

type StatColumns = { str: number; dex: number; con: number; int: number; wis: number; cha: number };

function toAbilityScores(stats: StatColumns): AbilityScores {
  return { STR: stats.str, DEX: stats.dex, CON: stats.con, INT: stats.int, WIS: stats.wis, CHA: stats.cha };
}

function fromAbilityScores(scores: AbilityScores): StatColumns {
  return { str: scores.STR, dex: scores.DEX, con: scores.CON, int: scores.INT, wis: scores.WIS, cha: scores.CHA };
}
