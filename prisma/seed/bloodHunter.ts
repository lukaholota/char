/**
 * O45 — Мисливець за кровʼю в обох редакціях. Один англійський носій (`data/blood-hunter/blood-hunter.json`)
 * і два українські (`uk-2014.json`, `uk-2024.json`, різняться лише посиланнями). `buildBloodHunterPlan`
 * лише збирає рядки; `seedBloodHunter` їх пише. Сідер тільки створює й оновлює — персонажів не чіпає.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Prisma, PrismaClient } from "@prisma/client";

export type BloodHunterRuleset = "RULES_2014" | "RULES_2024";

export const BLOOD_HUNTER_RULESETS: readonly BloodHunterRuleset[] = ["RULES_2014", "RULES_2024"];

/// Класи й ордени з власного носія O45. Гейти «база дорівнює нормалізованому файлу» їх не рахують:
/// звірку з носієм тримає tests/content/blood-hunter-carrier.test.ts, а механіку — приймання BH-001…005.
export const BLOOD_HUNTER_CLASS_NAMES = ["BLOOD_HUNTER_2014", "BLOOD_HUNTER_2024"] as const;
export const BLOOD_HUNTER_SUBCLASS_NAMES = ["ORDER_OF_THE_GHOSTSLAYER", "ORDER_OF_THE_LYCAN", "ORDER_OF_THE_MUTANT", "ORDER_OF_THE_PROFANE_SOUL"] as const;

const CARRIER_DIRECTORY = "data/blood-hunter";

const UK_FILE_BY_RULESET: Record<BloodHunterRuleset, string> = {
  RULES_2014: "uk-2014.json",
  RULES_2024: "uk-2024.json",
};

const CLASS_ENG_NAME = "Blood Hunter";

const FIGHTING_STYLE_GROUP = "Бойовий стиль";

type UsesSpecial = Array<{ lvl: number; uses: number | "UNLIMITED" }> | { stat: string; type: string };

type SourceFeature = {
  key: string;
  level: number;
  rulesets?: BloodHunterRuleset[];
  sharedFeature?: Partial<Record<BloodHunterRuleset, string>>;
  engName: string;
  displayType: string[];
  limitedUsesPer?: "SHORT_REST" | "LONG_REST";
  usesCount?: number;
  usesCountSpecial?: UsesSpecial;
  speedBonus?: number;
  grantsSpellSlots?: boolean;
  usesPoolKey?: string;
};

type SourceOption = { key: string; engName: string; prerequisites?: { level: number }; effectAbility?: "INT" | "WIS"; spellsEng?: string[]; spellsEngByRuleset?: Partial<Record<BloodHunterRuleset, string[]>> };

type SourceChoiceGroup = {
  key: string;
  groupNameEng: string;
  picksAtLevel: Record<string, number>;
  options: SourceOption[];
};

type SourceSubclass = {
  enum: string;
  engName: string;
  spellcastingType?: "PACT";
  primaryCastingStat?: string;
  features: SourceFeature[];
  choiceGroups?: SourceChoiceGroup[];
};

export type BloodHunterSource = {
  class: {
    enumByRuleset: Record<BloodHunterRuleset, string>;
    hitDie: number;
    primaryCastingStat: string;
    subclassLevel: number;
    sortOrder: number;
    savingThrows: string[];
    armorProficiencies: string[];
    weaponProficiencies: string[];
    toolProficiencies: string[];
    skillProficiencies: { options: string[]; choiceCount: number };
    multiclassReqs: { score: number; allOf: string[][] };
    byRuleset: Record<BloodHunterRuleset, { abilityScoreUpLevels: number[]; epicBoonLevel?: number; weaponMasteryProgression?: number[] }>;
  };
  features: SourceFeature[];
  choiceGroups: SourceChoiceGroup[];
  fightingStyleOptions: { RULES_2014: string[]; RULES_2024: string };
  choiceReplacements: SourceChoiceReplacement[];
  startingEquipment: SourceStartingEquipment;
  subclasses: SourceSubclass[];
};

export type StartingEquipmentRow = {
  group: number;
  option: string;
  weapon?: string;
  armor?: string;
  pack?: string;
  item?: string;
  anyWeaponType?: "MARTIAL_WEAPON" | "SIMPLE_WEAPON";
  weaponCount?: number;
  quantity?: number;
  description?: string;
};

type SourceStartingEquipment = Record<BloodHunterRuleset, StartingEquipmentRow[]> & {
  firstSeedIndexByRuleset: Record<BloodHunterRuleset, number>;
};

type SourceChoiceReplacement = { key: string; groupKey: string; levels: number[]; seedIndex: number };

type UkText = { name: string; shortDescription?: string; description?: string; descriptionByRuleset?: Partial<Record<BloodHunterRuleset, string>> };

type UkChoiceGroup = { groupName: string; options: Record<string, UkText> };

export type BloodHunterTranslation = {
  class: { name: string; description: string; adaptationNote?: string };
  features: Record<string, UkText>;
  choiceGroups: Record<string, UkChoiceGroup>;
  choiceReplacements: Record<string, string>;
  subclasses: Record<string, { name: string; description: string; features: Record<string, UkText>; choiceGroups?: Record<string, UkChoiceGroup> }>;
};

export type FeatureRow = {
  engName: string;
  level: number;
  displayOrder: number;
  grantsSpellSlots: boolean;
  data: {
    name: string;
    description: string;
    shortDescription: string;
    displayType: string[];
    limitedUsesPer: string | null;
    usesCount: number | null;
    usesCountSpecial: UsesSpecial | null;
    speedBonus: number | null;
    usesPoolKey: string | null;
    ruleset: BloodHunterRuleset;
  };
};

export type ChoiceOptionRow = {
  optionNameEng: string;
  optionName: string;
  groupName: string;
  prerequisites: { level: number } | null;
  effectAbility: "INT" | "WIS" | null;
  spellsEng: string[];
  feature: FeatureRow;
};

export type ChoiceGroupRow = { groupName: string; levelsGranted: number[]; options: ChoiceOptionRow[] };

export type SubclassRow = {
  name: string;
  description: string;
  spellcastingType: "NONE" | "PACT";
  primaryCastingStat: string | null;
  grantsSpells: boolean;
  features: FeatureRow[];
  choiceGroups: ChoiceGroupRow[];
};

export type BloodHunterPlan = {
  ruleset: BloodHunterRuleset;
  classRow: Record<string, unknown> & { name: string };
  features: FeatureRow[];
  sharedFeatureLinks: Array<{ engName: string; level: number }>;
  choiceGroups: ChoiceGroupRow[];
  fightingStyles: { optionNamesEng: string[] } | { allGeneric2024: true };
  subclasses: SubclassRow[];
  choiceReplacements: ChoiceReplacementRow[];
  startingEquipment: Array<StartingEquipmentRow & { seedIndex: number }>;
};

export type ChoiceReplacementRow = {
  seedIndex: number;
  title: string;
  grantedOnLevels: number[];
  replacesChoiceGroup: string;
  appearsOnlyIfOptionNamesEng: string[];
};

const SEED_INDEX_OFFSET_2024 = 100;

export function readBloodHunterSource(root = process.cwd()): BloodHunterSource {
  return JSON.parse(readFileSync(join(root, CARRIER_DIRECTORY, "blood-hunter.json"), "utf-8"));
}

export function readBloodHunterTranslation(ruleset: BloodHunterRuleset, root = process.cwd()): BloodHunterTranslation {
  return JSON.parse(readFileSync(join(root, CARRIER_DIRECTORY, UK_FILE_BY_RULESET[ruleset]), "utf-8"));
}

export function buildBloodHunterPlan(source: BloodHunterSource, uk: BloodHunterTranslation, ruleset: BloodHunterRuleset): BloodHunterPlan {
  const ownFeatures = source.features.filter((feature) => isInRuleset(feature, ruleset) && !feature.sharedFeature?.[ruleset]);

  return {
    ruleset,
    classRow: buildClassRow(source, uk, ruleset),
    features: ownFeatures.map((feature, index) => buildFeatureRow(feature, uk.features[feature.key], ruleset, index, buildClassFeatureEngName)),
    sharedFeatureLinks: collectSharedFeatureLinks(source.features, ruleset),
    choiceGroups: source.choiceGroups.map((group) => buildChoiceGroupRow(group, uk.choiceGroups[group.key], ruleset)),
    fightingStyles: ruleset === "RULES_2014" ? { optionNamesEng: source.fightingStyleOptions.RULES_2014 } : { allGeneric2024: true },
    subclasses: source.subclasses.map((subclass) => buildSubclassRow(subclass, uk.subclasses[subclass.enum], ruleset)),
    choiceReplacements: source.choiceReplacements.map((replacement) => buildChoiceReplacementRow(source, uk, replacement, ruleset)),
    startingEquipment: source.startingEquipment[ruleset].map((row, index) => ({
      ...row,
      seedIndex: source.startingEquipment.firstSeedIndexByRuleset[ruleset] + index,
    })),
  };
}

/// Заміна показується лише тому, хто вже знає варіант групи: формулу мутагену міняє тільки мутант.
function buildChoiceReplacementRow(
  source: BloodHunterSource,
  uk: BloodHunterTranslation,
  replacement: SourceChoiceReplacement,
  ruleset: BloodHunterRuleset,
): ChoiceReplacementRow {
  const group = findChoiceGroupRow(source, uk, replacement.groupKey, ruleset);
  const title = uk.choiceReplacements[replacement.key];
  if (!title) throw new Error(`Немає перекладу заміни ${replacement.key}`);

  return {
    seedIndex: replacement.seedIndex + (ruleset === "RULES_2024" ? SEED_INDEX_OFFSET_2024 : 0),
    title,
    grantedOnLevels: replacement.levels,
    replacesChoiceGroup: group.groupName,
    appearsOnlyIfOptionNamesEng: group.options.map((option) => option.optionNameEng),
  };
}

function findChoiceGroupRow(source: BloodHunterSource, uk: BloodHunterTranslation, groupKey: string, ruleset: BloodHunterRuleset): ChoiceGroupRow {
  const classGroup = source.choiceGroups.find((group) => group.key === groupKey);
  if (classGroup) return buildChoiceGroupRow(classGroup, uk.choiceGroups[groupKey], ruleset);

  for (const subclass of source.subclasses) {
    const subclassGroup = subclass.choiceGroups?.find((group) => group.key === groupKey);
    if (subclassGroup) return buildChoiceGroupRow(subclassGroup, uk.subclasses[subclass.enum]?.choiceGroups?.[groupKey], ruleset);
  }
  throw new Error(`Немає групи виборів ${groupKey}`);
}

function isInRuleset(feature: SourceFeature, ruleset: BloodHunterRuleset): boolean {
  return !feature.rulesets || feature.rulesets.includes(ruleset);
}

function buildClassRow(source: BloodHunterSource, uk: BloodHunterTranslation, ruleset: BloodHunterRuleset) {
  const shape = source.class;
  const edition = shape.byRuleset[ruleset];
  const description = [uk.class.description, ruleset === "RULES_2024" ? uk.class.adaptationNote : null].filter(Boolean).join("\n\n");

  return {
    name: shape.enumByRuleset[ruleset],
    ruleset,
    hitDie: shape.hitDie,
    primaryCastingStat: shape.primaryCastingStat,
    spellcastingType: "NONE",
    subclassLevel: shape.subclassLevel,
    abilityScoreUpLevels: edition.abilityScoreUpLevels,
    epicBoonLevel: edition.epicBoonLevel ?? null,
    weapon_mastery_progression: edition.weaponMasteryProgression ?? [],
    multiclassReqs: shape.multiclassReqs,
    savingThrows: shape.savingThrows,
    skillProficiencies: shape.skillProficiencies,
    toolProficiencies: shape.toolProficiencies,
    toolToChooseCount: null,
    armorProficiencies: shape.armorProficiencies,
    weaponProficiencies: ruleset === "RULES_2024" ? { type: shape.weaponProficiencies } : shape.weaponProficiencies,
    sortOrder: shape.sortOrder,
    description,
  };
}

function buildClassFeatureEngName(engName: string, ruleset: BloodHunterRuleset): string {
  return ruleset === "RULES_2024" ? `${CLASS_ENG_NAME}: ${engName} (2024)` : `${engName} (${CLASS_ENG_NAME})`;
}

function buildFeatureRow(
  feature: SourceFeature,
  text: UkText | undefined,
  ruleset: BloodHunterRuleset,
  displayOrder: number,
  toEngName: (engName: string, ruleset: BloodHunterRuleset) => string,
): FeatureRow {
  if (!text) throw new Error(`Немає перекладу риси ${feature.key} (${ruleset})`);
  const description = text.descriptionByRuleset?.[ruleset] ?? text.description;
  if (!description) throw new Error(`Немає опису риси ${feature.key} (${ruleset})`);

  return {
    engName: toEngName(feature.engName, ruleset),
    level: feature.level,
    displayOrder,
    grantsSpellSlots: feature.grantsSpellSlots ?? false,
    data: {
      name: text.name,
      description,
      shortDescription: text.shortDescription ?? text.name,
      displayType: feature.displayType,
      limitedUsesPer: feature.limitedUsesPer ?? null,
      usesCount: feature.usesCount ?? null,
      usesCountSpecial: feature.usesCountSpecial ?? null,
      speedBonus: feature.speedBonus ?? null,
      usesPoolKey: feature.usesPoolKey ?? null,
      ruleset,
    },
  };
}

function collectSharedFeatureLinks(features: SourceFeature[], ruleset: BloodHunterRuleset) {
  return features.flatMap((feature) => {
    const engName = feature.sharedFeature?.[ruleset];
    return engName && isInRuleset(feature, ruleset) ? [{ engName, level: feature.level }] : [];
  });
}

function buildChoiceGroupRow(group: SourceChoiceGroup, uk: UkChoiceGroup | undefined, ruleset: BloodHunterRuleset): ChoiceGroupRow {
  if (!uk) throw new Error(`Немає перекладу групи виборів ${group.key}`);

  return {
    groupName: uk.groupName,
    levelsGranted: Object.keys(group.picksAtLevel).map(Number).sort((a, b) => a - b),
    options: group.options.map((option, index) => buildChoiceOptionRow(group, option, uk, ruleset, index)),
  };
}

function buildChoiceOptionRow(group: SourceChoiceGroup, option: SourceOption, uk: UkChoiceGroup, ruleset: BloodHunterRuleset, index: number): ChoiceOptionRow {
  const text = uk.options[option.key];
  const optionNameEng = buildOptionEngName(group, option, ruleset);
  const feature = buildFeatureRow(
    { key: option.key, level: 0, engName: optionNameEng, displayType: ["PASSIVE"] },
    text,
    ruleset,
    index,
    (engName) => (ruleset === "RULES_2024" ? `${CLASS_ENG_NAME} Choice: ${engName}` : engName),
  );

  return {
    optionNameEng,
    optionName: text.name,
    groupName: uk.groupName,
    prerequisites: option.prerequisites ?? null,
    effectAbility: option.effectAbility ?? null,
    spellsEng: option.spellsEngByRuleset?.[ruleset] ?? option.spellsEng ?? [],
    feature,
  };
}

const PREFIXED_OPTION_GROUPS = new Set(["mutagens", "patrons", "hemocraft-ability"]);

function buildOptionEngName(group: SourceChoiceGroup, option: SourceOption, ruleset: BloodHunterRuleset): string {
  const prefixed = PREFIXED_OPTION_GROUPS.has(group.key) ? `${group.groupNameEng}: ${option.engName}` : option.engName;
  return ruleset === "RULES_2024" ? `${prefixed} (2024)` : prefixed;
}

function buildSubclassRow(subclass: SourceSubclass, uk: BloodHunterTranslation["subclasses"][string] | undefined, ruleset: BloodHunterRuleset): SubclassRow {
  if (!uk) throw new Error(`Немає перекладу ордену ${subclass.enum}`);
  const toEngName = (engName: string, edition: BloodHunterRuleset) =>
    edition === "RULES_2024" ? `${subclass.engName}: ${engName} (2024)` : `${engName} (${subclass.engName})`;

  return {
    name: subclass.enum,
    description: uk.description,
    spellcastingType: subclass.spellcastingType ?? "NONE",
    primaryCastingStat: subclass.primaryCastingStat ?? null,
    grantsSpells: Boolean(subclass.spellcastingType),
    features: subclass.features.map((feature, index) => buildFeatureRow(feature, uk.features[feature.key], ruleset, index, toEngName)),
    choiceGroups: (subclass.choiceGroups ?? []).map((group) => buildChoiceGroupRow(group, uk.choiceGroups?.[group.key], ruleset)),
  };
}

type Client = PrismaClient | Prisma.TransactionClient;

export type BloodHunterSeedReport = { ruleset: BloodHunterRuleset; created: string[]; updated: string[] };

export async function seedBloodHunter(prisma: PrismaClient, apply: boolean): Promise<BloodHunterSeedReport[]> {
  const source = readBloodHunterSource();
  const reports: BloodHunterSeedReport[] = [];

  for (const ruleset of BLOOD_HUNTER_RULESETS) {
    const plan = buildBloodHunterPlan(source, readBloodHunterTranslation(ruleset), ruleset);
    reports.push(apply ? await prisma.$transaction((tx) => writePlan(tx, plan), { timeout: 120_000 }) : await describePlan(prisma, plan));
  }

  return reports;
}

async function describePlan(prisma: Client, plan: BloodHunterPlan): Promise<BloodHunterSeedReport> {
  const report: BloodHunterSeedReport = { ruleset: plan.ruleset, created: [], updated: [] };
  const classExists = await prisma.class.findFirst({ where: { name: plan.classRow.name as never, ruleset: plan.ruleset } });
  (classExists ? report.updated : report.created).push(`клас ${plan.classRow.name}`);

  const featureNames = collectPlanFeatures(plan).map((feature) => feature.engName);
  const existing = new Set((await prisma.feature.findMany({ where: { engName: { in: featureNames } }, select: { engName: true } })).map((row) => row.engName));
  for (const engName of featureNames) (existing.has(engName) ? report.updated : report.created).push(`риса ${engName}`);

  return report;
}

function collectPlanFeatures(plan: BloodHunterPlan): FeatureRow[] {
  const optionFeatures = (groups: ChoiceGroupRow[]) => groups.flatMap((group) => group.options.map((option) => option.feature));
  return [
    ...plan.features,
    ...optionFeatures(plan.choiceGroups),
    ...plan.subclasses.flatMap((subclass) => [...subclass.features, ...optionFeatures(subclass.choiceGroups)]),
  ];
}

async function writePlan(tx: Client, plan: BloodHunterPlan): Promise<BloodHunterSeedReport> {
  const report: BloodHunterSeedReport = { ruleset: plan.ruleset, created: [], updated: [] };
  const classId = await upsertClass(tx, plan, report);

  await linkClassFeatures(tx, classId, plan, report);
  await linkSharedFeatures(tx, classId, plan);
  for (const group of plan.choiceGroups) await linkChoiceGroup(tx, { classId }, group, plan.ruleset, report);
  await linkFightingStyles(tx, classId, plan);

  for (const subclass of plan.subclasses) await writeSubclass(tx, classId, subclass, plan.ruleset, report);
  for (const replacement of plan.choiceReplacements) await upsertChoiceReplacement(tx, classId, replacement, plan.ruleset, report);
  for (const row of plan.startingEquipment) await upsertStartingEquipment(tx, classId, row, plan.ruleset);
  return report;
}

async function upsertStartingEquipment(tx: Client, classId: number, row: StartingEquipmentRow & { seedIndex: number }, ruleset: BloodHunterRuleset) {
  const byName = { ruleset } as const;
  const [weapon, armor, pack] = await Promise.all([
    row.weapon ? tx.weapon.findUnique({ where: { name_ruleset: { name: row.weapon as never, ...byName } }, select: { weaponId: true } }) : null,
    row.armor ? tx.armor.findUnique({ where: { name_ruleset: { name: row.armor as never, ...byName } }, select: { armorId: true } }) : null,
    row.pack ? tx.equipmentPack.findUnique({ where: { name_ruleset: { name: row.pack as never, ...byName } }, select: { equipmentPackId: true } }) : null,
  ]);
  if ((row.weapon && !weapon) || (row.armor && !armor) || (row.pack && !pack)) {
    throw new Error(`Спорядження ${row.weapon ?? row.armor ?? row.pack} (${ruleset}) немає в базі`);
  }

  const data = {
    classId,
    choiceGroup: row.group,
    option: row.option,
    weaponId: weapon?.weaponId ?? null,
    armorId: armor?.armorId ?? null,
    equipmentPackId: pack?.equipmentPackId ?? null,
    chooseAnyWeapon: Boolean(row.anyWeaponType),
    weaponType: (row.anyWeaponType ?? null) as never,
    weaponCount: row.weaponCount ?? 1,
    quantity: row.quantity ?? 1,
    item: row.item ?? null,
    description: row.description ?? null,
    ruleset,
  };
  await tx.classStartingEquipmentOption.upsert({ where: { seedIndex: row.seedIndex }, update: data, create: { ...data, seedIndex: row.seedIndex } });
}

async function upsertChoiceReplacement(tx: Client, classId: number, replacement: ChoiceReplacementRow, ruleset: BloodHunterRuleset, report: BloodHunterSeedReport) {
  const existing = await tx.classOptionalFeature.findUnique({ where: { seedIndex: replacement.seedIndex }, select: { optionalFeatureId: true } });
  const options = await tx.choiceOption.findMany({
    where: { optionNameEng: { in: replacement.appearsOnlyIfOptionNamesEng } },
    select: { choiceOptionId: true },
  });
  const data = {
    classId,
    title: replacement.title,
    grantedOnLevels: replacement.grantedOnLevels,
    replacesChoiceGroup: replacement.replacesChoiceGroup,
    ruleset,
    appearsOnlyIfChoicesTaken: { set: options.map((option) => ({ choiceOptionId: option.choiceOptionId })) },
  };
  await tx.classOptionalFeature.upsert({
    where: { seedIndex: replacement.seedIndex },
    update: data,
    create: { ...data, seedIndex: replacement.seedIndex, appearsOnlyIfChoicesTaken: { connect: data.appearsOnlyIfChoicesTaken.set } },
  });
  (existing ? report.updated : report.created).push(`заміна ${replacement.title}`);
}

async function upsertClass(tx: Client, plan: BloodHunterPlan, report: BloodHunterSeedReport): Promise<number> {
  const where = { name_ruleset: { name: plan.classRow.name as never, ruleset: plan.ruleset } };
  const existing = await tx.class.findUnique({ where, select: { classId: true } });
  const data = plan.classRow as unknown as Prisma.ClassUncheckedCreateInput;
  const row = await tx.class.upsert({ where, update: data, create: data });
  (existing ? report.updated : report.created).push(`клас ${plan.classRow.name}`);
  return row.classId;
}

async function upsertFeature(tx: Client, feature: FeatureRow, report: BloodHunterSeedReport): Promise<number> {
  const existing = await tx.feature.findUnique({ where: { engName: feature.engName }, select: { featureId: true } });
  const data = {
    ...feature.data,
    usesCountSpecial: (feature.data.usesCountSpecial as Prisma.InputJsonValue | null) ?? Prisma.DbNull,
  } as unknown as Prisma.FeatureUncheckedCreateInput;
  const row = await tx.feature.upsert({ where: { engName: feature.engName }, update: data, create: { ...data, engName: feature.engName } });
  (existing ? report.updated : report.created).push(`риса ${feature.engName}`);
  return row.featureId;
}

async function linkClassFeatures(tx: Client, classId: number, plan: BloodHunterPlan, report: BloodHunterSeedReport) {
  for (const feature of plan.features) {
    const featureId = await upsertFeature(tx, feature, report);
    const link = { levelGranted: feature.level, displayOrder: feature.displayOrder, grantsSpellSlots: feature.grantsSpellSlots, ruleset: plan.ruleset };
    await tx.classFeature.upsert({
      where: { classId_featureId: { classId, featureId } },
      update: link,
      create: { ...link, classId, featureId },
    });
  }
}

async function linkSharedFeatures(tx: Client, classId: number, plan: BloodHunterPlan) {
  for (const shared of plan.sharedFeatureLinks) {
    const feature = await tx.feature.findUnique({ where: { engName: shared.engName }, select: { featureId: true } });
    if (!feature) throw new Error(`Спільної риси «${shared.engName}» немає в базі`);
    const link = { levelGranted: shared.level, ruleset: plan.ruleset };
    await tx.classFeature.upsert({
      where: { classId_featureId: { classId, featureId: feature.featureId } },
      update: link,
      create: { ...link, classId, featureId: feature.featureId },
    });
  }
}

type ChoiceOwner = { classId: number } | { subclassId: number };

async function linkChoiceGroup(tx: Client, owner: ChoiceOwner, group: ChoiceGroupRow, ruleset: BloodHunterRuleset, report: BloodHunterSeedReport) {
  for (const option of group.options) {
    const featureId = await upsertFeature(tx, option.feature, report);
    const data = {
      groupName: option.groupName,
      optionName: option.optionName,
      prerequisites: option.prerequisites ?? Prisma.DbNull,
      effectAbility: option.effectAbility,
      ruleset,
    };
    const choiceOption = await tx.choiceOption.upsert({
      where: { optionNameEng: option.optionNameEng },
      update: data,
      create: { ...data, optionNameEng: option.optionNameEng },
    });
    await linkOptionFeature(tx, choiceOption.choiceOptionId, featureId, ruleset);
    if (option.spellsEng.length) await linkFeatureSpells(tx, featureId, option.spellsEng, ruleset);
    await linkOptionToOwner(tx, owner, choiceOption.choiceOptionId, group.levelsGranted, ruleset);
  }
}

/// Покровитель Ордену нечестивої душі дає Явлену й Незапечатану таємницю — рівень кожної рахує правило ордену.
async function linkFeatureSpells(tx: Client, featureId: number, spellsEng: string[], ruleset: BloodHunterRuleset) {
  const spells = await tx.spell.findMany({
    where: { ruleset, OR: spellsEng.map((engName) => ({ engName: { equals: engName, mode: "insensitive" as const } })) },
    select: { spellId: true, engName: true },
  });
  const missing = spellsEng.filter((engName) => !spells.some((spell) => spell.engName.toLowerCase() === engName.toLowerCase()));
  if (missing.length) throw new Error(`Заклинань ${missing.join(", ")} (${ruleset}) немає в базі`);
  await tx.feature.update({ where: { featureId }, data: { givesSpells: { set: spells.map((spell) => ({ spellId: spell.spellId })) } } });
}

async function linkOptionFeature(tx: Client, choiceOptionId: number, featureId: number, ruleset: BloodHunterRuleset) {
  const existing = await tx.choiceOptionFeature.findFirst({ where: { choiceOptionId, featureId } });
  if (!existing) await tx.choiceOptionFeature.create({ data: { choiceOptionId, featureId, ruleset } });
}

async function linkOptionToOwner(tx: Client, owner: ChoiceOwner, choiceOptionId: number, levelsGranted: number[], ruleset: BloodHunterRuleset) {
  if ("classId" in owner) {
    await tx.classChoiceOption.upsert({
      where: { unique_class_choice: { classId: owner.classId, choiceOptionId } },
      update: { levelsGranted, ruleset },
      create: { classId: owner.classId, choiceOptionId, levelsGranted, ruleset },
    });
    return;
  }

  await tx.subclassChoiceOption.upsert({
    where: { unique_subclass_choice: { subclassId: owner.subclassId, choiceOptionId } },
    update: { levelsGranted, ruleset },
    create: { subclassId: owner.subclassId, choiceOptionId, levelsGranted, ruleset },
  });
}

async function linkFightingStyles(tx: Client, classId: number, plan: BloodHunterPlan) {
  const options = await tx.choiceOption.findMany({
    where: "optionNamesEng" in plan.fightingStyles
      ? { optionNameEng: { in: plan.fightingStyles.optionNamesEng }, groupName: FIGHTING_STYLE_GROUP, ruleset: "RULES_2014" }
      : { optionNameEng: { startsWith: "Fighting Style 2024 (", not: { endsWith: "(2024)" } }, groupName: FIGHTING_STYLE_GROUP, ruleset: "RULES_2024" },
    select: { choiceOptionId: true },
  });
  const expected = "optionNamesEng" in plan.fightingStyles ? plan.fightingStyles.optionNamesEng.length : 1;
  if (options.length < expected) throw new Error(`Бойових стилів ${plan.ruleset} у базі ${options.length}, очікувалося щонайменше ${expected}`);

  for (const option of options) await linkOptionToOwner(tx, { classId }, option.choiceOptionId, [2], plan.ruleset);
}

async function writeSubclass(tx: Client, classId: number, subclass: SubclassRow, ruleset: BloodHunterRuleset, report: BloodHunterSeedReport) {
  const where = { classId_name: { classId, name: subclass.name as never } };
  const existing = await tx.subclass.findUnique({ where, select: { subclassId: true } });
  const data = {
    description: subclass.description,
    spellcastingType: subclass.spellcastingType,
    primaryCastingStat: subclass.primaryCastingStat,
    grantsSpells: subclass.grantsSpells,
    ruleset,
  } as Prisma.SubclassUncheckedUpdateInput;
  const row = await tx.subclass.upsert({
    where,
    update: data,
    create: { ...(data as Prisma.SubclassUncheckedCreateInput), classId, name: subclass.name as never },
  });
  (existing ? report.updated : report.created).push(`орден ${subclass.name}`);

  for (const feature of subclass.features) {
    const featureId = await upsertFeature(tx, feature, report);
    const link = { levelGranted: feature.level, grantsSpellSlots: feature.grantsSpellSlots, ruleset };
    await tx.subclassFeature.upsert({
      where: { subclassId_featureId: { subclassId: row.subclassId, featureId } },
      update: link,
      create: { ...link, subclassId: row.subclassId, featureId },
    });
  }

  for (const group of subclass.choiceGroups) await linkChoiceGroup(tx, { subclassId: row.subclassId }, group, ruleset, report);
}
