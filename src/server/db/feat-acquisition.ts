import { Ability, SkillProficiencyType, Skills, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { findAbilityScoreCeiling, findFeatAbilityScoreSource } from "@/rules/ability-score-ceiling";
import { applyAbilityIncreases, collectFeatGrants, findFeatHitPointIncrease, type FeatGrants } from "@/rules/feat-grants";
import { findActualAbilityIncreases, type FeatGrantRecord } from "@/rules/feat-removal";
import { hasFeatSpellChoice } from "@/rules/feat-spell-choices";
import { mergeUniqueLines } from "@/rules/levelup";
import type { RulesetId } from "@/rules/strategies/types";
import type { AbilityScores } from "@/rules/types";
import { findFeatPackageProblem, toFeatInstance } from "@/server/db/feat-gates";
import { buildChosenFeatSpells, findFeatSpellChoiceProblem } from "@/server/db/feat-spell-choices";
import { buildFeatPersSpellRows, findMissingFeatSpells } from "@/server/db/feat-spell-grants";
import { buildFeatLanguageLines, buildFeatProficiencyLines } from "@/server/db/feat-text-grants";

export type FeatAcquisitionInput = {
  featId: number;
  choiceOptionIds: readonly number[];
  featSpellIds: readonly number[];
};

type AcquiringPers = NonNullable<Awaited<ReturnType<typeof loadAcquiringPers>>>;
type AcquiredFeat = NonNullable<Awaited<ReturnType<typeof loadAcquiredFeat>>>;
type FeatAcquisitionPlan = ReturnType<typeof buildFeatAcquisitionPlan>;

const ALL_SKILLS = Object.values(Skills);

// Рішення власника 2026-09-13: риса, додана з листа, набувається повністю — ті самі надання, що на
// підвищенні рівня, лише без нового рівня.
export async function acquirePersFeat(persId: number, input: FeatAcquisitionInput): Promise<{ success: true } | { error: string }> {
  const [pers, feat] = await Promise.all([loadAcquiringPers(persId), loadAcquiredFeat(input.featId)]);
  if (!pers) return { error: "Персонажа не знайдено" };
  if (!feat || feat.ruleset !== pers.ruleset) return { error: "Ця риса належить іншій редакції правил" };

  const featSpellIds = hasFeatSpellChoice(pers.ruleset as RulesetId, feat.name) ? input.featSpellIds : [];
  const problem = await findFeatAcquisitionProblem(pers, feat, { ...input, featSpellIds });
  if (problem) return { error: problem };

  const plan = buildFeatAcquisitionPlan(pers, feat, { ...input, featSpellIds });
  await prisma.$transaction((tx) => persistFeatAcquisition(tx, pers, plan));
  return { success: true };
}

// Каталог рис 2024 на листі будується з файлу й несе не id бази, а позиційні номери, тож рису шукаємо
// за англійською назвою в редакції персонажа, а далі працюємо з id бази.
export async function loadSheetFeatAcquisitionContent(persId: number, featEngName: string) {
  const pers = await prisma.pers.findUnique({ where: { persId }, select: { ruleset: true } });
  if (!pers) return null;

  const feat = await prisma.feat.findFirst({
    where: { engName: featEngName, ruleset: pers.ruleset },
    include: { grantsFeature: true, featChoiceOptions: { include: { choiceOption: { include: { features: { include: { feature: true } } } } } } },
  });
  return feat ? { ruleset: pers.ruleset, feat } : null;
}

function loadAcquiringPers(persId: number) {
  return prisma.pers.findUnique({
    where: { persId },
    select: {
      persId: true,
      level: true,
      ruleset: true,
      str: true, dex: true, con: true, int: true, wis: true, cha: true,
      maxHp: true,
      currentHp: true,
      additionalSaveProficiencies: true,
      customLanguagesKnown: true,
      customProficiencies: true,
      skills: { select: { name: true, proficiencyType: true } },
      features: { select: { featureId: true } },
      persSpells: { select: { spellId: true } },
      feats: { select: { feat: { select: { name: true } }, choices: { select: { choiceOption: { select: { groupName: true, optionNameEng: true } } } } } },
    },
  });
}

function loadAcquiredFeat(featId: number) {
  return prisma.feat.findUnique({
    where: { featId },
    include: {
      grantsFeature: { select: { featureId: true } },
      featChoiceOptions: { include: { choiceOption: { include: { features: { select: { featureId: true } } } } } },
    },
  });
}

async function findFeatAcquisitionProblem(pers: AcquiringPers, feat: AcquiredFeat, input: FeatAcquisitionInput): Promise<string | null> {
  const packageProblem = findFeatPackageProblem(
    [{ feat, source: "CLASS_ASI", choiceOptionIds: input.choiceOptionIds }],
    pers.feats.map(toFeatInstance),
  );
  if (packageProblem) return packageProblem;

  return findFeatSpellChoiceProblem(prisma, {
    ruleset: pers.ruleset as RulesetId,
    featName: feat.name,
    chosenOptionIds: input.choiceOptionIds,
    context: { characterLevel: pers.level, ownedFeatSpellCount: 0 },
    selectedSpellIds: input.featSpellIds,
    unavailableSpellIds: pers.persSpells.map((spell) => spell.spellId),
  });
}

function buildFeatAcquisitionPlan(pers: AcquiringPers, feat: AcquiredFeat, input: FeatAcquisitionInput) {
  const grants = collectFeatGrants(feat, input.choiceOptionIds);
  const ceiling = findAbilityScoreCeiling({ ruleset: pers.ruleset, source: findFeatAbilityScoreSource(feat.category) });
  const scores = applyAbilityIncreases(toAbilityScores(pers), grants.abilityIncreases, ceiling);
  const hitPointIncrease = findFeatHitPointIncrease({ level: pers.level, conBefore: pers.con, conAfter: scores.CON, takesTough: feat.name === "TOUGH" });

  const languageLines = buildFeatLanguageLines(feat);
  const proficiencyLines = buildFeatProficiencyLines(feat);
  const proficientSkills = findSkillsToCreate(pers, [...grants.proficientSkills, ...grants.expertiseSkills]);
  const featureIds = collectGrantedFeatureIds(pers, feat, input.choiceOptionIds);

  return {
    featId: feat.featId,
    choiceOptionIds: input.choiceOptionIds,
    record: buildGrantRecord(pers, { grants, scores, proficientSkills, featureIds, languageLines, proficiencyLines }),
    scores,
    maxHp: pers.maxHp + hitPointIncrease,
    currentHp: pers.currentHp + hitPointIncrease,
    additionalSaveProficiencies: [...new Set([...pers.additionalSaveProficiencies, ...grants.saveProficiencies])] as Ability[],
    customLanguagesKnown: mergeUniqueLines(pers.customLanguagesKnown, languageLines),
    customProficiencies: mergeUniqueLines(pers.customProficiencies, proficiencyLines),
    proficientSkills,
    expertiseSkills: grants.expertiseSkills.filter(isSkill),
    featureIds,
    chosenSpells: buildChosenFeatSpells(feat.name, input.featSpellIds),
  };
}

async function persistFeatAcquisition(tx: Prisma.TransactionClient, pers: AcquiringPers, plan: FeatAcquisitionPlan): Promise<void> {
  const { persId } = pers;
  const persFeat = await tx.persFeat.create({ data: { persId, featId: plan.featId }, select: { persFeatId: true } });
  if (plan.choiceOptionIds.length) {
    await tx.persFeatChoice.createMany({
      data: plan.choiceOptionIds.map((choiceOptionId) => ({ persFeatId: persFeat.persFeatId, choiceOptionId })),
      skipDuplicates: true,
    });
  }

  await tx.pers.update({ where: { persId }, data: buildPersUpdate(plan) });
  await persistSkills(tx, persId, plan);
  if (plan.featureIds.length) {
    await tx.persFeature.createMany({ data: plan.featureIds.map((featureId) => ({ persId, featureId })), skipDuplicates: true });
  }

  const spells = [...(await findMissingFeatSpells(tx, persId)), ...plan.chosenSpells];
  if (spells.length) {
    await tx.persSpell.createMany({ data: buildFeatPersSpellRows(persId, spells, pers.level), skipDuplicates: true });
  }

  const record: FeatGrantRecord = { ...plan.record, spellIds: [...new Set(spells.map((spell) => spell.spellId))] };
  await tx.persFeat.update({ where: { persFeatId: persFeat.persFeatId }, data: { grants: record } });
}

function buildGrantRecord(
  pers: AcquiringPers,
  granted: { grants: FeatGrants; scores: AbilityScores; proficientSkills: Skills[]; featureIds: number[]; languageLines: string[]; proficiencyLines: string[] },
): Omit<FeatGrantRecord, "spellIds"> {
  const ownedSkills = new Map(pers.skills.map((skill) => [skill.name, skill.proficiencyType]));
  const expertiseSkills = [...new Set(granted.grants.expertiseSkills)].filter(isSkill).filter((skill) => ownedSkills.get(skill) !== SkillProficiencyType.EXPERTISE);

  return {
    abilityIncreases: findActualAbilityIncreases(toAbilityScores(pers), granted.scores),
    saveProficiencies: granted.grants.saveProficiencies.filter((ability) => !pers.additionalSaveProficiencies.includes(ability as Ability)),
    proficientSkills: granted.proficientSkills.filter((skill) => !expertiseSkills.includes(skill)),
    expertiseSkills: expertiseSkills.map((skill) => ({ skill, previous: ownedSkills.has(skill) ? "PROFICIENT" : "NONE" })),
    featureIds: granted.featureIds,
    languageLines: findNewLines(pers.customLanguagesKnown, granted.languageLines),
    proficiencyLines: findNewLines(pers.customProficiencies, granted.proficiencyLines),
  };
}

function findNewLines(text: string, lines: readonly string[]): string[] {
  const existing = new Set(text.split("\n"));
  return [...new Set(lines)].filter((line) => !existing.has(line));
}

function buildPersUpdate(plan: FeatAcquisitionPlan): Prisma.PersUpdateInput {
  return {
    str: plan.scores.STR,
    dex: plan.scores.DEX,
    con: plan.scores.CON,
    int: plan.scores.INT,
    wis: plan.scores.WIS,
    cha: plan.scores.CHA,
    maxHp: plan.maxHp,
    currentHp: plan.currentHp,
    additionalSaveProficiencies: plan.additionalSaveProficiencies,
    customLanguagesKnown: plan.customLanguagesKnown,
    customProficiencies: plan.customProficiencies,
  };
}

async function persistSkills(tx: Prisma.TransactionClient, persId: number, plan: FeatAcquisitionPlan): Promise<void> {
  if (plan.proficientSkills.length) {
    await tx.persSkill.createMany({
      data: plan.proficientSkills.map((name) => ({ persId, name, skillId: ALL_SKILLS.indexOf(name) + 1, proficiencyType: SkillProficiencyType.PROFICIENT })),
      skipDuplicates: true,
    });
  }
  for (const name of plan.expertiseSkills) {
    await tx.persSkill.upsert({
      where: { persId_name: { persId, name } },
      update: { proficiencyType: SkillProficiencyType.EXPERTISE },
      create: { persId, name, skillId: ALL_SKILLS.indexOf(name) + 1, proficiencyType: SkillProficiencyType.EXPERTISE },
    });
  }
}

function findSkillsToCreate(pers: AcquiringPers, skills: readonly string[]): Skills[] {
  const owned = new Set(pers.skills.map((skill) => skill.name));
  return [...new Set(skills)].filter(isSkill).filter((skill) => !owned.has(skill));
}

function collectGrantedFeatureIds(pers: AcquiringPers, feat: AcquiredFeat, choiceOptionIds: readonly number[]): number[] {
  const chosen = new Set(choiceOptionIds);
  const owned = new Set(pers.features.map((feature) => feature.featureId));
  const fromOptions = feat.featChoiceOptions
    .filter((link) => chosen.has(link.choiceOptionId))
    .flatMap((link) => link.choiceOption.features.map((feature) => feature.featureId));

  return [...new Set([...feat.grantsFeature.map((feature) => feature.featureId), ...fromOptions])].filter((featureId) => !owned.has(featureId));
}

function toAbilityScores(pers: AcquiringPers): AbilityScores {
  return { STR: pers.str, DEX: pers.dex, CON: pers.con, INT: pers.int, WIS: pers.wis, CHA: pers.cha };
}

function isSkill(value: string): value is Skills {
  return (ALL_SKILLS as string[]).includes(value);
}
