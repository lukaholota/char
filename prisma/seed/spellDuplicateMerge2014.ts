/**
 * KR16.2 — злиття двох дублікатів у каталозі 2014.
 *
 * `Arcane Hand` і `Arcane Sword` — назви з SRD 5.1; у PHB 2014 і в XPHB 2024 ці заклинання
 * звуться `Bigby's Hand` і `Mordenkainen's Sword`. Обидві пари лежать у каталозі одночасно:
 * пізніший імпорт не-SRD матеріалу не впізнав, що запис уже є. Виживає книжкова назва.
 *
 * Перед злиттям треба завести пошукові аліаси на назви, що зникають — інакше персонаж, який
 * шукає «арканна рука», перестане її знаходити.
 */

import { PrismaClient } from "@prisma/client";

const RULESET = "RULES_2014" as const;

export type DuplicatePair = { keep: string; drop: string };

/// Єдині дві пари в каталозі: перевірено всі 17 заклинань, яким SRD 5.1 дав іншу назву.
export const SRD_DUPLICATE_PAIRS: DuplicatePair[] = [
  { keep: "Bigby's Hand", drop: "Arcane Hand" },
  { keep: "Mordenkainen's Sword", drop: "Arcane Sword" },
];

export type MergeOutcome = {
  merged: { keep: string; drop: string; persSpellsMoved: number; persSpellsDropped: number }[];
  skipped: string[];
};

export async function mergeDuplicateSpells2014(
  prisma: PrismaClient,
  pairs: DuplicatePair[] = SRD_DUPLICATE_PAIRS
): Promise<MergeOutcome> {
  const outcome: MergeOutcome = { merged: [], skipped: [] };

  for (const pair of pairs) {
    const keeper = await findSpellId(prisma, pair.keep);
    const doomed = await findSpellId(prisma, pair.drop);

    if (doomed === null) {
      outcome.skipped.push(pair.drop);
      continue;
    }
    if (keeper === null) {
      throw new Error(`Немає запису «${pair.keep}», у який зливати «${pair.drop}»`);
    }

    const moved = await movePersSpells(prisma, doomed, keeper);
    await moveJoinRows(prisma, doomed, keeper);
    await prisma.spellClasses.deleteMany({ where: { spellId: doomed } });
    await prisma.spellRaces.deleteMany({ where: { spellId: doomed } });
    await prisma.spell.delete({ where: { spellId: doomed } });

    outcome.merged.push({ keep: pair.keep, drop: pair.drop, ...moved });
  }

  return outcome;
}

async function findSpellId(prisma: PrismaClient, engName: string): Promise<number | null> {
  const spell = await prisma.spell.findUnique({
    where: { engName_ruleset: { engName, ruleset: RULESET } },
    select: { spellId: true },
  });

  return spell?.spellId ?? null;
}

/// `pers_spell` унікальний за парою (персонаж, заклинання). Персонаж, який має обидва записи,
/// не може дістати другий рядок на той самий id — його зайвий рядок видаляється, а не
/// переноситься, інакше вставка впаде на унікальному індексі.
async function movePersSpells(
  prisma: PrismaClient,
  doomed: number,
  keeper: number
): Promise<{ persSpellsMoved: number; persSpellsDropped: number }> {
  const alreadyHaveKeeper = await prisma.persSpell.findMany({
    where: { spellId: keeper },
    select: { persId: true },
  });
  const owners = alreadyHaveKeeper.map((row) => row.persId);

  const { count: persSpellsDropped } = await prisma.persSpell.deleteMany({
    where: { spellId: doomed, persId: { in: owners } },
  });

  const { count: persSpellsMoved } = await prisma.persSpell.updateMany({
    where: { spellId: doomed },
    data: { spellId: keeper },
  });

  return { persSpellsMoved, persSpellsDropped };
}

/// Неявні m2m-таблиці Prisma не адресує через клієнт, тому лише тут — сирий SQL.
/// `ON CONFLICT DO NOTHING` не годиться: у `_PersToSpell` немає унікального індексу, тому
/// колізії відсіюються умовою `NOT EXISTS`, а решта рядків просто видаляється.
async function moveJoinRows(prisma: PrismaClient, doomed: number, keeper: number): Promise<void> {
  const spellIsB = ["_PersToSpell", "_FeatureToSpell", "_MagicItemToSpell"];

  for (const table of spellIsB) {
    await prisma.$executeRawUnsafe(
      `UPDATE "${table}" AS target SET "B" = $1
         WHERE target."B" = $2
           AND NOT EXISTS (
             SELECT 1 FROM "${table}" AS other WHERE other."A" = target."A" AND other."B" = $1
           )`,
      keeper,
      doomed
    );
    await prisma.$executeRawUnsafe(`DELETE FROM "${table}" WHERE "B" = $1`, doomed);
  }

  await prisma.$executeRawUnsafe(
    `UPDATE "_SubclassExpandedSpells" AS target SET "A" = $1
       WHERE target."A" = $2
         AND NOT EXISTS (
           SELECT 1 FROM "_SubclassExpandedSpells" AS other
            WHERE other."B" = target."B" AND other."A" = $1
         )`,
    keeper,
    doomed
  );
  await prisma.$executeRawUnsafe(`DELETE FROM "_SubclassExpandedSpells" WHERE "A" = $1`, doomed);
}
