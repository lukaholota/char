import { SkillProficiencyType, SpellOrigin, type Ability, type Prisma, type Skills } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { abilityTranslations, skillTranslations } from "@/lib/refs/translation";
import { collectFeatGrants } from "@/rules/feat-grants";
import {
  findHitPointsAfterRemoval,
  readFeatGrantRecord,
  removeAbilityIncreases,
  removeTextLines,
  type FeatGrantRecord,
} from "@/rules/feat-removal";
import type { AbilityScores } from "@/rules/types";

export type FeatRemovalPreview = { isExact: boolean; changes: string[] };

type RemovingPers = NonNullable<Awaited<ReturnType<typeof loadRemovingPers>>>;
type RemovedPersFeat = RemovingPers["feats"][number];
type FeatRemovalPlan = NonNullable<ReturnType<typeof buildFeatRemovalPlan>>;

export async function loadFeatRemovalPreview(persId: number, featId: number): Promise<FeatRemovalPreview | null> {
  const pers = await loadRemovingPers(persId);
  const plan = pers ? buildFeatRemovalPlan(pers, featId) : null;
  if (!pers || !plan) return null;
  return { isExact: plan.isExact, changes: await describeFeatRemoval(pers, plan) };
}

export async function removePersFeatWithGrants(persId: number, featId: number): Promise<{ success: true } | { error: string }> {
  const pers = await loadRemovingPers(persId);
  const plan = pers ? buildFeatRemovalPlan(pers, featId) : null;
  if (!pers || !plan) return { error: "Рису не знайдено" };

  await prisma.$transaction((tx) => persistFeatRemoval(tx, pers, plan));
  return { success: true };
}

function loadRemovingPers(persId: number) {
  return prisma.pers.findUnique({
    where: { persId },
    select: {
      persId: true,
      level: true,
      str: true, dex: true, con: true, int: true, wis: true, cha: true,
      maxHp: true,
      currentHp: true,
      additionalSaveProficiencies: true,
      customLanguagesKnown: true,
      customProficiencies: true,
      class: { select: { savingThrows: true } },
      skills: { select: { name: true, proficiencyType: true } },
      features: { select: { featureId: true } },
      persSpells: { select: { spellId: true, origin: true, sourceName: true } },
      feats: {
        orderBy: { persFeatId: "asc" },
        select: {
          persFeatId: true,
          featId: true,
          grants: true,
          choices: { select: { choiceOptionId: true } },
          feat: {
            include: {
              grantsFeature: { select: { featureId: true } },
              featChoiceOptions: { include: { choiceOption: { include: { features: { select: { featureId: true } } } } } },
            },
          },
        },
      },
    },
  });
}

function buildFeatRemovalPlan(pers: RemovingPers, featId: number) {
  const copies = pers.feats.filter((entry) => entry.featId === featId);
  const persFeat = copies.at(-1);
  if (!persFeat) return null;

  const stored = readFeatGrantRecord(persFeat.grants);
  const record = stored ?? buildFallbackRecord(pers, persFeat, copies.length > 1);
  const scores = removeAbilityIncreases(toAbilityScores(pers), record.abilityIncreases);
  const hitPoints = findHitPointsAfterRemoval(
    { level: pers.level, scores: toAbilityScores(pers), maxHp: pers.maxHp, currentHp: pers.currentHp, isTough: persFeat.feat.name === "TOUGH" },
    scores,
  );

  return {
    persFeatId: persFeat.persFeatId,
    featId,
    isLastCopy: copies.length === 1,
    isExact: stored !== null,
    record,
    scores,
    hitPoints,
    additionalSaveProficiencies: pers.additionalSaveProficiencies.filter((ability) => !record.saveProficiencies.includes(ability)),
    customLanguagesKnown: removeTextLines(pers.customLanguagesKnown, record.languageLines),
    customProficiencies: removeTextLines(pers.customProficiencies, record.proficiencyLines),
  };
}

// Рядок без знімка — риса з конструктора, підвищення рівня чи давніша за знімки. Характеристики,
// ряткидок, фічі й заклинання риси відновлюються з її опцій; навички й текст мов не чіпаються,
// бо звідки вони взялися, уже не видно.
function buildFallbackRecord(pers: RemovingPers, persFeat: RemovedPersFeat, hasOtherCopies: boolean): FeatGrantRecord {
  const chosenOptionIds = persFeat.choices.map((choice) => choice.choiceOptionId);
  const grants = collectFeatGrants(persFeat.feat, chosenOptionIds);
  const classSaves = new Set<string>(pers.class.savingThrows);
  const expertise = new Set(pers.skills.filter((skill) => skill.proficiencyType === SkillProficiencyType.EXPERTISE).map((skill) => skill.name));

  return {
    abilityIncreases: grants.abilityIncreases,
    saveProficiencies: grants.saveProficiencies.filter((ability) => !classSaves.has(ability)),
    proficientSkills: [],
    expertiseSkills: [...new Set(grants.expertiseSkills)].filter((skill) => expertise.has(skill as Skills)).map((skill) => ({ skill, previous: "PROFICIENT" })),
    featureIds: hasOtherCopies ? [] : collectOwnedFeatFeatureIds(pers, persFeat, chosenOptionIds),
    spellIds: hasOtherCopies ? [] : pers.persSpells.filter((spell) => spell.origin === SpellOrigin.FEAT && spell.sourceName === persFeat.feat.name).map((spell) => spell.spellId),
    languageLines: [],
    proficiencyLines: [],
  };
}

function collectOwnedFeatFeatureIds(pers: RemovingPers, persFeat: RemovedPersFeat, chosenOptionIds: readonly number[]): number[] {
  const chosen = new Set(chosenOptionIds);
  const owned = new Set(pers.features.map((feature) => feature.featureId));
  const fromOptions = persFeat.feat.featChoiceOptions
    .filter((link) => chosen.has(link.choiceOptionId))
    .flatMap((link) => link.choiceOption.features.map((feature) => feature.featureId));
  return [...new Set([...persFeat.feat.grantsFeature.map((feature) => feature.featureId), ...fromOptions])].filter((featureId) => owned.has(featureId));
}

async function persistFeatRemoval(tx: Prisma.TransactionClient, pers: RemovingPers, plan: FeatRemovalPlan): Promise<void> {
  const { persId } = pers;
  const { record } = plan;

  await tx.persFeat.delete({ where: { persFeatId: plan.persFeatId } });
  await tx.pers.update({ where: { persId }, data: buildPersUpdate(plan) });
  await removeGrantedSkills(tx, persId, record);
  if (record.featureIds.length) await tx.persFeature.deleteMany({ where: { persId, featureId: { in: record.featureIds } } });
  if (record.spellIds.length) await tx.persSpell.deleteMany({ where: { persId, origin: SpellOrigin.FEAT, spellId: { in: record.spellIds } } });
  if (plan.isLastCopy) await tx.persFeatureDescription.deleteMany({ where: { persId, kind: "FEAT", refId: plan.featId } });
}

function buildPersUpdate(plan: FeatRemovalPlan): Prisma.PersUpdateInput {
  return {
    str: plan.scores.STR,
    dex: plan.scores.DEX,
    con: plan.scores.CON,
    int: plan.scores.INT,
    wis: plan.scores.WIS,
    cha: plan.scores.CHA,
    maxHp: plan.hitPoints.maxHp,
    currentHp: plan.hitPoints.currentHp,
    additionalSaveProficiencies: plan.additionalSaveProficiencies as Ability[],
    customLanguagesKnown: plan.customLanguagesKnown,
    customProficiencies: plan.customProficiencies,
  };
}

async function removeGrantedSkills(tx: Prisma.TransactionClient, persId: number, record: FeatGrantRecord): Promise<void> {
  const deleted = [...record.proficientSkills, ...record.expertiseSkills.filter((upgrade) => upgrade.previous === "NONE").map((upgrade) => upgrade.skill)];
  const downgraded = record.expertiseSkills.filter((upgrade) => upgrade.previous === "PROFICIENT").map((upgrade) => upgrade.skill);

  if (deleted.length) await tx.persSkill.deleteMany({ where: { persId, name: { in: deleted as Skills[] } } });
  if (downgraded.length) {
    await tx.persSkill.updateMany({
      where: { persId, name: { in: downgraded as Skills[] }, proficiencyType: SkillProficiencyType.EXPERTISE },
      data: { proficiencyType: SkillProficiencyType.PROFICIENT },
    });
  }
}

async function describeFeatRemoval(pers: RemovingPers, plan: FeatRemovalPlan): Promise<string[]> {
  const { record } = plan;
  const [features, spells] = await Promise.all([
    record.featureIds.length ? prisma.feature.findMany({ where: { featureId: { in: record.featureIds } }, select: { name: true } }) : [],
    record.spellIds.length ? prisma.spell.findMany({ where: { spellId: { in: record.spellIds } }, select: { name: true } }) : [],
  ]);

  return [
    ...record.abilityIncreases.map(({ ability, amount }) => `${abilityTranslations[ability]} −${amount}`),
    ...(plan.hitPoints.maxHp !== pers.maxHp ? [`Максимум хітів: ${pers.maxHp} → ${plan.hitPoints.maxHp}`] : []),
    ...record.saveProficiencies.map((ability) => `Володіння ряткидком: ${abilityTranslations[ability]}`),
    ...record.proficientSkills.map((skill) => `Володіння навичкою: ${skillTranslations[skill] ?? skill}`),
    ...record.expertiseSkills.map(({ skill, previous }) => `Експертиза: ${skillTranslations[skill] ?? skill}${previous === "PROFICIENT" ? " (володіння лишається)" : ""}`),
    ...features.map((feature) => `Фіча: ${feature.name}`),
    ...spells.map((spell) => `Заклинання: ${spell.name}`),
    ...[...record.languageLines, ...record.proficiencyLines].map((line) => `Рядок у тексті: ${line}`),
  ];
}

function toAbilityScores(pers: RemovingPers): AbilityScores {
  return { STR: pers.str, DEX: pers.dex, CON: pers.con, INT: pers.int, WIS: pers.wis, CHA: pers.cha };
}
