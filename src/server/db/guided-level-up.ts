import "server-only";
import { prisma } from "@/lib/prisma";
import { findCharacterCreatorOptions } from "@/lib/content/creator-content";
import { classTranslations } from "@/lib/refs/translation";
import type { LevelUpInput } from "@/lib/zod/schemas/levelUpSchema";
import { buildRecipeGuideHref } from "@/lib/optimization/article-view";
import { buildAssemblyCatalog } from "@/lib/optimization/assembly-catalog";
import { describeOpenSpellPick, fillOpenSpellPicks, listGuidedPicks, planGuidedLevelUp, type GuidedLevelUp, type GuidedPersState, type GuidedStepPlan } from "@/lib/optimization/guided-level-up";
import { buildSpellScoreFinder } from "@/lib/optimization/ready-preset-spell-scores";
import { translateValue } from "@/lib/components/characterCreator/infoUtils";
import { translateSubclassName } from "@/lib/refs/subclass-name";
import { findBuildNickname } from "@/lib/optimization/ready-preset-catalog";
import { readSliceRecipes } from "@/lib/optimization/slice-reader";
import type { BuildRecipe } from "@/lib/optimization/types";
import { keepOfferedSpells } from "@/rules/class-spell-offer-selection";
import { EMPTY_CLASS_SPELL_SELECTION } from "@/rules/class-spell-choices-2024";
import { loadPersLevelUpSpellOffer } from "@/server/db/levelup-persistence";

type GuidedPersRow = NonNullable<Awaited<ReturnType<typeof readGuidedPers>>>;

export async function loadGuidedLevelUp(persId: number): Promise<GuidedLevelUp | null> {
  const pers = await readGuidedPers(persId);
  if (!pers?.sourceBuildId || !pers.sourceBuildRevisionId || pers.isSnapshot || pers.ruleset !== "RULES_2014") return null;

  const recipe = (await readSliceRecipes("RULES_2014")).find((candidate) => candidate.buildId === pers.sourceBuildId);
  if (!recipe) return { status: "unavailable", build: null, reason: "Пресета, з якого створено персонажа, більше немає." };
  const build = { title: findBuildNickname(recipe.title), href: buildRecipeGuideHref(recipe) };
  if (recipe.revisionId !== pers.sourceBuildRevisionId) {
    return { status: "unavailable", build, reason: "Автор оновив пресет після створення персонажа. Продовження для вашої версії плану недоступне." };
  }

  const plan = planGuidedLevelUp(recipe, await loadAssemblyCatalog(recipe), toGuidedPersState(pers));
  if (plan.status === "unavailable") return { ...plan, build };

  const spells = await fitClassSpellsToOffer(persId, plan);
  const classLabel = classTranslations[plan.classKey] ?? plan.classKey;
  const fitted = { ...plan, input: { ...plan.input, classSpells: spells.classSpells } };
  return {
    status: "ready",
    build,
    nextLevel: plan.nextLevel,
    classLabel,
    classLevel: plan.classLevel,
    input: fitted.input,
    picks: listGuidedPicks(fitted, await loadPickNames(fitted.input, classLabel)),
    skipped: [...plan.skipped, ...spells.skipped],
    open: [...spells.open, ...plan.open],
  };
}

type ReadyPlan = Extract<GuidedStepPlan, { status: "ready" }>;

async function loadPickNames(input: LevelUpInput, className: string) {
  const optionIds = [...Object.values(input.classChoiceSelections), ...Object.values(input.subclassChoiceSelections)].flat();
  const spellIds = [...(input.classSpells?.cantripIds ?? []), ...(input.classSpells?.preparedIds ?? []), ...(input.classSpells?.spellbookIds ?? []),
    ...[input.classSpells?.preparedSwap, input.classSpells?.cantripSwap].flatMap((swap) => [swap?.dropId, swap?.addId].filter((id): id is number => typeof id === "number"))];
  const [subclass, feat, options, spells] = await Promise.all([
    input.subclassId === undefined ? null : prisma.subclass.findUnique({ where: { subclassId: input.subclassId }, select: { name: true } }),
    input.featId === undefined ? null : prisma.feat.findUnique({ where: { featId: input.featId }, select: { name: true } }),
    prisma.choiceOption.findMany({ where: { choiceOptionId: { in: optionIds } }, select: { optionName: true } }),
    prisma.spell.findMany({ where: { spellId: { in: spellIds } }, select: { spellId: true, name: true } }),
  ]);
  return {
    className,
    subclassName: subclass ? translateSubclassName(subclass.name) : null,
    featName: feat ? translateValue(feat.name) : null,
    optionNames: options.map((option) => option.optionName),
    spellNameById: new Map(spells.map((spell) => [spell.spellId, spell.name])),
  };
}

function readGuidedPers(persId: number) {
  return prisma.pers.findUnique({
    where: { persId },
    select: {
      level: true, ruleset: true, isSnapshot: true, sourceBuildId: true, sourceBuildRevisionId: true,
      str: true, dex: true, con: true, int: true, wis: true, cha: true,
      class: { select: { name: true } },
      subclass: { select: { name: true } },
      multiclasses: { select: { classLevel: true, class: { select: { name: true } }, subclass: { select: { name: true } } } },
      feats: { select: { featId: true, feat: { select: { isRepeatable: true } } } },
      choiceOptions: { select: { choiceOptionId: true } },
    },
  });
}

function toGuidedPersState(pers: GuidedPersRow): GuidedPersState {
  const multiclassLevels = pers.multiclasses.reduce((sum, row) => sum + row.classLevel, 0);
  return {
    level: pers.level,
    classes: [
      { classKey: pers.class.name, classLevel: pers.level - multiclassLevels, subclassKey: pers.subclass?.name ?? null },
      ...pers.multiclasses.map((row) => ({ classKey: row.class.name, classLevel: row.classLevel, subclassKey: row.subclass?.name ?? null })),
    ],
    abilityScores: { STR: pers.str, DEX: pers.dex, CON: pers.con, INT: pers.int, WIS: pers.wis, CHA: pers.cha },
    nonRepeatableFeatIds: pers.feats.filter((row) => !row.feat.isRepeatable).map((row) => row.featId),
    choiceOptionIds: pers.choiceOptions.map((row) => row.choiceOptionId),
  };
}

async function loadAssemblyCatalog(recipe: BuildRecipe) {
  const spells = await prisma.spell.findMany({ where: { ruleset: recipe.ruleset }, select: { spellId: true, engName: true } });
  return buildAssemblyCatalog(findCharacterCreatorOptions(recipe.ruleset), spells);
}

type FittedSpells = { classSpells: LevelUpInput["classSpells"]; skipped: string[]; open: string[] };

async function fitClassSpellsToOffer(persId: number, plan: ReadyPlan): Promise<FittedSpells> {
  const { input } = plan;
  const planned = input.classSpells;
  const openSpellNotes = plan.openSpellPicks.map(describeOpenSpellPick);
  if (!planned || input.classId === undefined) return { classSpells: planned, skipped: [], open: openSpellNotes };
  const offer = await loadPersLevelUpSpellOffer(persId, {
    classId: input.classId,
    subclassId: input.subclassId ?? null,
    classChoiceOptionIds: Object.values(input.classChoiceSelections).flat(),
    subclassChoiceOptionIds: Object.values(input.subclassChoiceSelections).flat(),
  });
  if (!offer) return { classSpells: undefined, skipped: ["Заклинання з плану не вдалося звірити — оберіть їх самі."], open: openSpellNotes };

  const kept = keepOfferedSpells({ ...EMPTY_CLASS_SPELL_SELECTION, ...planned }, offer);
  const droppedIds = [...planned.cantripIds, ...planned.preparedIds, ...planned.spellbookIds]
    .filter((id) => ![...kept.cantripIds, ...kept.preparedIds, ...kept.spellbookIds].includes(id));
  const lostSwap = Boolean(planned.preparedSwap && !kept.preparedSwap) || Boolean(planned.cantripSwap && !kept.cantripSwap);
  const filled = fillOpenSpellPicks(kept, offer, plan.openSpellPicks, buildSpellScoreFinder(plan.classKey, plan.subclassKey));
  return {
    classSpells: filled.selection,
    skipped: [...await describeDroppedSpells(droppedIds), ...(lostSwap ? ["Заміну заклинання з плану пропущено: того, що треба прибрати, у персонажа вже немає."] : [])],
    open: [...describePlatformSpells(filled.filledIds), ...filled.unfilled.map(describeOpenSpellPick)],
  };
}

function describePlatformSpells(spellIds: readonly number[]): string[] {
  if (!spellIds.length) return [];
  return ["Заклинання, яких автор не називає, гайд обрав за найвищою оцінкою RPGbot — їх можна змінити на кроці заклинань."];
}

async function describeDroppedSpells(spellIds: readonly number[]): Promise<string[]> {
  if (!spellIds.length) return [];
  const spells = await prisma.spell.findMany({ where: { spellId: { in: [...spellIds] } }, select: { name: true } });
  return [`Уже відомі або недоступні зараз заклинання з плану пропущено: ${spells.map((spell) => spell.name).join(", ")}. Оберіть замість них доступні.`];
}
