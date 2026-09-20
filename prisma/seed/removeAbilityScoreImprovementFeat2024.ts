/**
 * KR31.4 — риса «Ability Score Improvement» не має бути в переліку рис 2024.
 *
 * У PHB 2024 підвищення характеристик — це General-риса, але в цьому застосунку той самий вибір
 * уже є окремою гілкою кроку ASI. Тож рядок риси нічого не додає, а лише дає гравцеві витратити
 * підвищення 4-го рівня намарно: `grantedASI` порожній, виборів і фіч нуль. Рішення власника
 * 2026-09-06 — прибрати рядок.
 *
 * Р28: сід не видаляє контентних рядків, на які посилаються персонажі. Тому видалення тут
 * **умовне** — знайшовся хоч один носій, і сід відмовляється, назвавши його.
 *
 *   bun run seed:remove-asi-feat-2024:test          → показує, нічого не пише
 *   bun run seed:remove-asi-feat-2024:test --apply  → видаляє
 */

import { PrismaClient, Ruleset } from "@prisma/client";

const RULESET: Ruleset = "RULES_2024";
export const REMOVED_FEAT_NAME_2024 = "ABILITY_SCORE_IMPROVEMENT";

type FeatReferences = {
  characters: number;
  backgroundOrigins: number;
  backgroundLists: number;
};

export const removeAbilityScoreImprovementFeat2024 = async (prisma: PrismaClient, apply: boolean) => {
  console.log(`🧹 Риса «Ability Score Improvement» (2024)${apply ? "" : " — показ без запису"}…`);

  const feat = await prisma.feat.findFirst({
    where: { ruleset: RULESET, name: REMOVED_FEAT_NAME_2024 },
    select: { featId: true, engName: true },
  });
  if (!feat) return console.log("  • рядка вже немає — нічого робити");

  const references = await countReferences(prisma, feat.featId);
  const blocking = describeBlockingReferences(references);
  if (blocking) {
    console.warn(`  ⚠️ Рядок ${feat.featId} лишається: ${blocking}`);
    return;
  }

  if (!apply) {
    return console.log(`  • рядок ${feat.featId} ні на кого не посилається — з --apply буде видалений`);
  }

  await prisma.featChoiceOption.deleteMany({ where: { featId: feat.featId } });
  await prisma.feat.delete({ where: { featId: feat.featId } });
  console.log(`  • рядок ${feat.featId} видалено`);
};

async function countReferences(prisma: PrismaClient, featId: number): Promise<FeatReferences> {
  const [characters, backgroundOrigins, backgroundLists] = await Promise.all([
    prisma.persFeat.count({ where: { featId } }),
    prisma.background.count({ where: { originFeatId: featId } }),
    prisma.background.count({ where: { gainsFeats: { some: { featId } } } }),
  ]);

  return { characters, backgroundOrigins, backgroundLists };
}

function describeBlockingReferences({ characters, backgroundOrigins, backgroundLists }: FeatReferences): string | null {
  const blocking = [
    characters > 0 ? `${characters} персонажів` : null,
    backgroundOrigins > 0 ? `${backgroundOrigins} походжень як риса походження` : null,
    backgroundLists > 0 ? `${backgroundLists} походжень у списку рис` : null,
  ].filter((entry): entry is string => entry !== null);

  return blocking.length ? `на нього посилаються ${blocking.join(", ")}` : null;
}
