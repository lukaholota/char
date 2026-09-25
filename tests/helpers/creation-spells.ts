import { prisma } from "@/lib/prisma";
import type { PersFormData } from "@/lib/zod/schemas/persCreateSchema";
import type { SpellChoiceOption } from "@/rules/spell-choice-filter";
import { loadCreationSpellOffer } from "@/server/db/class-spell-choices";
import { loadCreationFeatSpellOffer, loadFeatSpellChoiceOffer, loadFeatSpellGrowthOffer } from "@/server/db/feat-spell-choices";
import { loadPersLevelUpSpellOffer } from "@/server/db/levelup-persistence";
import { findSubclassAtNextLevel, loadClassOptionSpellOffer, type SubclassAtLevel } from "@/server/db/class-option-spell-choices";
import type { FeatSpellChoiceOffer } from "@/rules/feat-spell-choices";
import type { RulesetId } from "@/rules/strategies/types";
import type { ClassSpellOffer, ClassSpellSelection } from "@/rules/class-spell-choices-2024";
import type { LevelUpFormData } from "./levelup-form";

export type CreationSpellPicks = { cantrips?: string[]; prepared?: string[]; spellbook?: string[] };

/**
 * KR31.5 — заклинач (2024, а з 2026-09-19 і 2014) без вибору заклинань не створюється, а тест, який міряє щось інше
 * (спорядження, риси, мультиклас), не має знати, які замовляння в клірика. Фікстура може назвати
 * свої; решту добирає перше за абеткою, чого не дає вид персонажа чи будь-який підклас його класу —
 * так обирав би гравець, і тести підкласових заклинань не втрачають рядка через Р38.
 */
export async function buildCreationSpells(
  form: Pick<PersFormData, "classId" | "raceId" | "classChoiceSelections"> & Partial<Pick<PersFormData, "subclassId" | "subclassChoiceSelections">>,
  picks: CreationSpellPicks = {},
): Promise<ClassSpellSelection | undefined> {
  const offer = await loadCreationSpellOffer(prisma, {
    classId: form.classId,
    subclassId: form.subclassId ?? null,
    classChoiceOptionIds: [...Object.values(form.classChoiceSelections ?? {}).flat(), ...Object.values(form.subclassChoiceSelections ?? {}).flat()],
  });
  if (!offer) return undefined;
  return pickFromOffer(offer, await findRuleGrantedSpellIds(form.raceId, form.classId), picks);
}

export async function withCreationSpells(form: PersFormData, picks?: CreationSpellPicks): Promise<PersFormData> {
  const classSpells = await buildCreationSpells(form, picks);
  const withClassSpells = classSpells ? { ...form, classSpells } : form;
  const featSpellSelections = await buildCreationFeatSpells(withClassSpells);
  const withFeatSpells = featSpellSelections ? { ...withClassSpells, featSpellSelections } : withClassSpells;
  const classOptionSpellIds = await buildClassOptionSpells(withFeatSpells.classOptionSpellIds, withFeatSpells.classChoiceSelections, [
    ...Object.values(withFeatSpells.classSpells ?? {}).flat(),
    ...Object.values(withFeatSpells.featSpellSelections ?? {}).flat(),
  ]);
  return classOptionSpellIds ? { ...withFeatSpells, classOptionSpellIds } : withFeatSpells;
}

/** Книга тіней і Магічні відкриття: чого фікстура не назвала, те добирає перше за абеткою серед ще не взятого. */
async function buildClassOptionSpells(
  named: number[] | undefined,
  classChoiceSelections: Record<string, number | number[]> | undefined,
  takenSpellIds: unknown[],
  subclassAtLevel: SubclassAtLevel | null = null,
): Promise<number[] | undefined> {
  if (named) return named;
  const offer = await loadClassOptionSpellOffer(prisma, {
    newlyChosenOptionIds: Object.values(classChoiceSelections ?? {}).flat(),
    subclassAtLevel,
    unavailableSpellIds: takenSpellIds.filter((id): id is number => typeof id === "number"),
  });
  return offer ? pickFeatSpells(offer.offer, new Set()) : undefined;
}

/** Те саме для підвищення рівня: заклинач 2024 без вибору рівня не отримує. */
export async function withLevelUpSpells(persId: number, form: LevelUpFormData, picks: CreationSpellPicks = {}): Promise<LevelUpFormData> {
  const withFeatSpells = await withLevelUpFeatGrowthSpells(persId, await withLevelUpFeatSpells(persId, form));
  const offer = await loadPersLevelUpSpellOffer(persId, {
    classId: form.classId,
    subclassId: form.subclassId ?? null,
    classChoiceOptionIds: Object.values(form.classChoiceSelections ?? {}).flat(),
    subclassChoiceOptionIds: Object.values(form.subclassChoiceSelections ?? {}).flat(),
  });
  const pers = await prisma.pers.findUniqueOrThrow({ where: { persId }, select: { raceId: true, persSpells: { select: { spellId: true } } } });
  const taken = await findRuleGrantedSpellIds(pers.raceId, form.classId);
  for (const spellId of [...(withFeatSpells.featSpellIds ?? []), ...(withFeatSpells.featGrowthSpellIds ?? [])]) taken.add(spellId);
  const withClassSpells = offer ? { ...withFeatSpells, classSpells: pickFromOffer(offer, taken, picks) } : withFeatSpells;

  const classOptionSpellIds = await buildClassOptionSpells(
    withClassSpells.classOptionSpellIds,
    withClassSpells.classChoiceSelections,
    [...pers.persSpells.map((spell) => spell.spellId), ...taken, ...Object.values(withClassSpells.classSpells ?? {}).flat()],
    await findSubclassAtNextLevel(prisma, { persId, classId: form.classId, subclassId: form.subclassId ?? null }),
  );
  return classOptionSpellIds ? { ...withClassSpells, classOptionSpellIds } : withClassSpells;
}

type CreationFeatSpellSlot = { source: "BACKGROUND_ORIGIN" | "SPECIES_VERSATILITY"; featId: number | null | undefined; selections: PersFormData["backgroundFeatChoiceSelections"] };

/** «Посвячений у магію» від передісторії чи Людини: два замовляння й заклинання 1-го рівня, яких ще не дає клас чи вид. */
async function buildCreationFeatSpells(form: PersFormData): Promise<PersFormData["featSpellSelections"]> {
  if (form.featSpellSelections) return form.featSpellSelections;

  const slots: CreationFeatSpellSlot[] = [
    { source: "BACKGROUND_ORIGIN", featId: form.backgroundFeatId ?? (await findOriginFeatId(form.backgroundId)), selections: form.backgroundFeatChoiceSelections },
    { source: "SPECIES_VERSATILITY", featId: await findSpeciesFeatId(form), selections: form.speciesFeatChoiceSelections },
  ];
  const taken = await findRuleGrantedSpellIds(form.raceId, form.classId);
  for (const spellId of Object.values(form.classSpells ?? {}).flat()) taken.add(spellId);

  const selections: NonNullable<PersFormData["featSpellSelections"]> = {};
  for (const slot of slots) {
    if (!slot.featId) continue;
    const offer = await loadCreationFeatSpellOffer(prisma, { featId: slot.featId, chosenOptionIds: Object.values(slot.selections ?? {}).flat() });
    if (!offer) continue;
    selections[slot.source] = pickFeatSpells(offer, taken);
  }
  return Object.keys(selections).length ? selections : undefined;
}

async function withLevelUpFeatSpells(persId: number, form: LevelUpFormData): Promise<LevelUpFormData> {
  if (!form.featId || form.featSpellIds) return form;

  const [pers, feat] = await Promise.all([
    prisma.pers.findUniqueOrThrow({ where: { persId }, select: { ruleset: true, level: true, raceId: true, persSpells: { select: { spellId: true } } } }),
    prisma.feat.findUniqueOrThrow({ where: { featId: form.featId }, select: { name: true } }),
  ]);
  const offer = await loadFeatSpellChoiceOffer(prisma, {
    ruleset: pers.ruleset as RulesetId,
    featName: feat.name,
    chosenOptionIds: Object.values(form.featChoiceSelections ?? {}).flat(),
    context: { characterLevel: pers.level + 1, ownedFeatSpellCount: 0 },
    unavailableSpellIds: pers.persSpells.map((spell) => spell.spellId),
  });
  if (!offer) return form;
  return { ...form, featSpellIds: pickFeatSpells(offer, await findRuleGrantedSpellIds(pers.raceId, form.classId)) };
}

async function withLevelUpFeatGrowthSpells(persId: number, form: LevelUpFormData): Promise<LevelUpFormData> {
  if (form.featGrowthSpellIds) return form;

  const pers = await prisma.pers.findUniqueOrThrow({ where: { persId }, select: { ruleset: true, level: true, raceId: true, persSpells: { select: { spellId: true } } } });
  const growth = await loadFeatSpellGrowthOffer(prisma, {
    persId,
    ruleset: pers.ruleset as RulesetId,
    characterLevel: pers.level + 1,
    unavailableSpellIds: [...pers.persSpells.map((spell) => spell.spellId), ...(form.featSpellIds ?? [])],
  });
  if (!growth) return form;
  return { ...form, featGrowthSpellIds: pickFeatSpells(growth.offer, await findRuleGrantedSpellIds(pers.raceId, form.classId)) };
}

function pickFeatSpells(offer: FeatSpellChoiceOffer, taken: Set<number>): number[] {
  const chosen = offer.picks.flatMap((pick) => pickSpells(pick.spells.filter((spell) => !taken.has(spell.spellId)), [], pick.count));
  for (const spellId of chosen) taken.add(spellId);
  return chosen;
}

async function findOriginFeatId(backgroundId: number): Promise<number | null> {
  const background = await prisma.background.findUnique({ where: { backgroundId }, select: { originFeatId: true } });
  return background?.originFeatId ?? null;
}

async function findSpeciesFeatId(form: PersFormData): Promise<number | null> {
  const optionIds = Object.values(form.raceChoiceSelections ?? {}).flat().map(Number);
  if (!optionIds.length) return null;

  const traits = await prisma.raceChoiceOptionTrait.findMany({ where: { optionId: { in: optionIds } }, select: { featureId: true } });
  if (!traits.length) return null;

  const feat = await prisma.feat.findFirst({
    where: { grantsFeature: { some: { featureId: { in: traits.map((trait) => trait.featureId) } } } },
    select: { featId: true },
  });
  return feat?.featId ?? null;
}

function pickFromOffer(offer: ClassSpellOffer, ruleGrantedSpellIds: Set<number>, picks: CreationSpellPicks): ClassSpellSelection {
  const isFree = (spell: SpellChoiceOption) => !ruleGrantedSpellIds.has(spell.spellId);
  const spellbookIds = pickSpells(offer.spells.filter(isFree), picks.spellbook ?? [], offer.quota.spellbook);
  const usesBook = offer.quota.spellbook > 0 || offer.bookSpells.length > 0;
  const preparable = usesBook
    ? [...offer.bookSpells, ...offer.spells.filter((spell) => spellbookIds.includes(spell.spellId))]
    : offer.spells.filter(isFree);

  return {
    cantripIds: pickSpells(offer.cantrips.filter(isFree), picks.cantrips ?? [], offer.quota.cantrips),
    spellbookIds,
    preparedIds: pickSpells(preparable, picks.prepared ?? [], offer.quota.prepared),
  };
}

function pickSpells(candidates: readonly SpellChoiceOption[], named: readonly string[], count: number): number[] {
  const namedIds = named.map((engName) => {
    const spell = candidates.find((candidate) => candidate.engName === engName);
    if (!spell) throw new Error(`«${engName}» немає серед кандидатів кроку заклинань`);
    return spell.spellId;
  });
  const rest = [...candidates]
    .sort((a, b) => a.engName.localeCompare(b.engName))
    .map((spell) => spell.spellId)
    .filter((spellId) => !namedIds.includes(spellId));
  return [...namedIds, ...rest].slice(0, count);
}

async function findRuleGrantedSpellIds(raceId: number, classId: number): Promise<Set<number>> {
  const [traits, options, subclassSpells] = await Promise.all([
    prisma.raceTrait.findMany({ where: { raceId }, select: { feature: { select: { givesSpells: { select: { spellId: true } } } } } }),
    prisma.raceChoiceOption.findMany({
      where: { raceId },
      select: {
        spells: { select: { spellId: true } },
        traits: { select: { feature: { select: { givesSpells: { select: { spellId: true } } } } } },
      },
    }),
    prisma.subclassSpell.findMany({ where: { subclass: { classId } }, select: { spellId: true } }),
  ]);

  return new Set([
    ...subclassSpells.map((row) => row.spellId),
    ...traits.flatMap((trait) => trait.feature.givesSpells.map((spell) => spell.spellId)),
    ...options.flatMap((option) => [
      ...option.spells.map((spell) => spell.spellId),
      ...option.traits.flatMap((trait) => trait.feature.givesSpells.map((spell) => spell.spellId)),
    ]),
  ]);
}
