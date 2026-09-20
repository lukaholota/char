/**
 * KR37.4 — перевибір опції підкласу з листа (Коло землі 2024). Одна транзакція: рядки заклинань
 * старої опції за її `sourceName` зникають, її фічі — з `pers_feature`, опція відʼєднується;
 * нова приєднується, її фічі лягають рядками, а заклинання приходять тим самим третім
 * джерелом, що й на підвищенні (`findMissingSubclassOptionSpells`).
 */

import type { Prisma, PrismaClient } from "@prisma/client";

import { findMainClassLevel } from "@/rules/hit-dice";
import { findRechoosableSubclassOptionGroup, type RechoosableSubclassOptionGroup } from "@/rules/subclass-option-rechoice";
import type { AbilityKey } from "@/rules/types";
import { buildSubclassPersSpellRows, findMissingSubclassOptionSpells, type SubclassAtClassLevel } from "@/server/db/always-prepared-spell-grants";

type DatabaseClient = PrismaClient | Prisma.TransactionClient;

export type SubclassOptionRechoiceOffer = {
  group: RechoosableSubclassOptionGroup;
  currentOptionId: number;
  options: Array<{ choiceOptionId: number; optionName: string; description: string }>;
};

export type ReplaceSubclassOptionResult = { ok: true; changed: boolean } | { ok: false; error: string };

export async function loadSubclassOptionRechoiceOffers(client: DatabaseClient, persId: number): Promise<SubclassOptionRechoiceOffer[]> {
  const pers = await loadPersForRechoice(client, persId);
  if (!pers) return [];

  const offers: SubclassOptionRechoiceOffer[] = [];
  for (const option of pers.choiceOptions) {
    const group = findRechoosableSubclassOptionGroup(option.groupName, pers.ruleset);
    if (!group) continue;

    const links = await client.subclassChoiceOption.findMany({
      where: { ruleset: pers.ruleset, subclassId: { in: listSubclassIds(pers) }, choiceOption: { groupName: group.groupName } },
      select: { choiceOption: { select: { choiceOptionId: true, optionName: true, features: { select: { feature: { select: { description: true } } } } } } },
      orderBy: { choiceOption: { optionName: "asc" } },
    });
    if (!links.some((link) => link.choiceOption.choiceOptionId === option.choiceOptionId)) continue;

    offers.push({
      group,
      currentOptionId: option.choiceOptionId,
      options: links.map((link) => ({
        choiceOptionId: link.choiceOption.choiceOptionId,
        optionName: link.choiceOption.optionName,
        description: link.choiceOption.features[0]?.feature.description ?? "",
      })),
    });
  }
  return offers;
}

export async function replaceSubclassChoiceOption(
  client: PrismaClient,
  input: { persId: number; groupName: string; toOptionId: number },
): Promise<ReplaceSubclassOptionResult> {
  const pers = await loadPersForRechoice(client, input.persId);
  if (!pers) return { ok: false, error: "Персонажа не знайдено" };

  const group = findRechoosableSubclassOptionGroup(input.groupName, pers.ruleset);
  if (!group) return { ok: false, error: "Цей вибір не перевибирається" };

  const current = pers.choiceOptions.find((option) => option.groupName === group.groupName);
  if (!current) return { ok: false, error: "Персонаж ще не робив цього вибору" };
  if (current.choiceOptionId === input.toOptionId) return { ok: true, changed: false };

  const target = await client.subclassChoiceOption.findFirst({
    where: { ruleset: pers.ruleset, choiceOptionId: input.toOptionId, subclassId: { in: listSubclassIds(pers) }, choiceOption: { groupName: group.groupName } },
    select: { subclassId: true, choiceOption: { select: { optionNameEng: true, features: { select: { featureId: true } } } } },
  });
  if (!target) return { ok: false, error: "Такої опції в цій групі немає" };

  const subclassAtLevel = findSubclassAtLevel(pers, target.subclassId);
  if (!subclassAtLevel) return { ok: false, error: "Підклас цієї опції не належить персонажу" };

  await client.$transaction(async (tx) => {
    await tx.persSpell.deleteMany({ where: { persId: pers.persId, sourceName: current.optionNameEng } });
    await tx.persFeature.deleteMany({ where: { persId: pers.persId, featureId: { in: current.features.map((entry) => entry.featureId) } } });
    await tx.pers.update({
      where: { persId: pers.persId },
      data: { choiceOptions: { disconnect: [{ choiceOptionId: current.choiceOptionId }], connect: [{ choiceOptionId: input.toOptionId }] } },
    });
    await tx.persFeature.createMany({
      data: target.choiceOption.features.map((entry) => ({ persId: pers.persId, featureId: entry.featureId })),
      skipDuplicates: true,
    });

    const owned = await tx.persSpell.findMany({ where: { persId: pers.persId }, select: { spellId: true } });
    const granted = await findMissingSubclassOptionSpells(tx, {
      choiceOptionIds: [input.toOptionId],
      subclasses: [subclassAtLevel],
      ownedSpellIds: owned.map((row) => row.spellId),
    });
    if (granted.length) {
      await tx.persSpell.createMany({ data: buildSubclassPersSpellRows(pers.persId, granted, pers.level), skipDuplicates: true });
    }
  });

  return { ok: true, changed: true };
}

async function loadPersForRechoice(client: DatabaseClient, persId: number) {
  return client.pers.findUnique({
    where: { persId },
    select: {
      persId: true,
      ruleset: true,
      level: true,
      subclassId: true,
      class: { select: { primaryCastingStat: true } },
      multiclasses: { select: { classLevel: true, subclassId: true, class: { select: { primaryCastingStat: true } } } },
      choiceOptions: { select: { choiceOptionId: true, groupName: true, optionNameEng: true, features: { select: { featureId: true } } } },
    },
  });
}

type PersForRechoice = NonNullable<Awaited<ReturnType<typeof loadPersForRechoice>>>;

function listSubclassIds(pers: PersForRechoice): number[] {
  return [pers.subclassId, ...pers.multiclasses.map((row) => row.subclassId)].filter((id): id is number => typeof id === "number");
}

function findSubclassAtLevel(pers: PersForRechoice, subclassId: number): SubclassAtClassLevel | null {
  if (pers.subclassId === subclassId) {
    return { subclassId, classLevel: findMainClassLevel(pers.level, pers.multiclasses), ability: toAbility(pers.class.primaryCastingStat) };
  }
  const multiclass = pers.multiclasses.find((row) => row.subclassId === subclassId);
  return multiclass ? { subclassId, classLevel: multiclass.classLevel, ability: toAbility(multiclass.class.primaryCastingStat) } : null;
}

function toAbility(value: string | null | undefined): AbilityKey | null {
  return (value ?? null) as AbilityKey | null;
}
