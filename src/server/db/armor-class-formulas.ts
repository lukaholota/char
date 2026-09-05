/**
 * KR27.8 — матеріалізація альтернативних формул базового КЗ рядками `pers_armor`.
 *
 * Правило, яке каже, ЯКІ формули персонажу належать, лежить у
 * [`src/rules/armor-class-formulas.ts`](../../rules/armor-class-formulas.ts). Тут лише
 * завантаження, виклик і запис.
 */

import { ArmorCategory, type Prisma, type PrismaClient, type Ruleset } from "@prisma/client";
import { type AlternativeArmorClassFormula, findAlternativeArmorClassFormulas } from "@/rules/armor-class-formulas";

type DatabaseClient = PrismaClient | Prisma.TransactionClient;

/**
 * Викликається після того, як фічі рівня вже записані: перелік формул виводиться з виданих
 * рядків `pers_feature`, тобто з рівня КЛАСУ. Вдягненою лишається рівно одна — SRD 2024
 * дозволяє користуватися тільки однією формулою за раз, тому нова формула приходить
 * невдягненою, поки гравець не перемкне її сам у списку обладунку.
 */
export async function grantAlternativeArmorClassFormulas(
  client: DatabaseClient,
  persId: number,
  ruleset: Ruleset,
): Promise<void> {
  // 2014 видає ті самі рядки за назвою початкового класу під час створення персонажа —
  // другий видавач дав би дублікат формули.
  if (ruleset !== "RULES_2024") return;

  const formulas = findAlternativeArmorClassFormulas(await readGrantedFeatureNames(client, persId));
  if (formulas.length === 0) return;

  const owned = await client.persArmor.findMany({ where: { persId }, select: { armorId: true, equipped: true } });
  const missing = await findFormulaRowsNotOwned(client, formulas, new Set(owned.map((row) => row.armorId)));
  if (missing.length === 0) return;

  const alreadyWearsOne = owned.some((row) => row.equipped);
  await client.persArmor.createMany({
    data: missing.map((row, index) => ({
      persId,
      armorId: row.armorId,
      abilityBonuses: row.abilityBonuses,
      abilityBonusType: row.abilityBonusType,
      miscACBonus: 0,
      isProficient: true,
      equipped: !alreadyWearsOne && index === 0,
    })),
  });
}

async function findFormulaRowsNotOwned(
  client: DatabaseClient,
  formulas: readonly AlternativeArmorClassFormula[],
  ownedArmorIds: ReadonlySet<number>,
) {
  const catalog = await client.armor.findMany({
    where: { ruleset: "RULES_2024", name: { in: formulas.map((formula) => ArmorCategory[formula]) } },
    select: { armorId: true, abilityBonuses: true, abilityBonusType: true },
  });

  return catalog.filter((row) => !ownedArmorIds.has(row.armorId));
}

async function readGrantedFeatureNames(client: DatabaseClient, persId: number): Promise<string[]> {
  const granted = await client.persFeature.findMany({
    where: { persId },
    select: { feature: { select: { engName: true } } },
  });

  return granted.map((row) => row.feature.engName);
}
