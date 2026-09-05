/**
 * KR18.3 — «максимум хітів зростає на N за кожен рівень» як дані, а не як таблиця в коді.
 *
 * До появи `Feature.bonusHitPointsPerLevel` це число жило в `src/rules/hit-points.ts`, бо в
 * схемі не було куди його покласти. Тепер рушій читає стовпець, а знання «які саме фічі це
 * дають» лежить тут — поруч із рештою контенту.
 *
 * Ключ — `Feature.engName`: він унікальний на всю базу, тож редакції не перетинаються.
 */

import { PrismaClient } from "@prisma/client";

const HIT_POINTS_PER_LEVEL: Readonly<Record<string, number>> = {
  // PHB 2024, Dwarf: «Your Hit Point maximum increases by 1, and it increases by 1 again
  // whenever you gain a level.»
  "Dwarf: Dwarven Toughness (2024)": 1,
  // PHB 2014, Hill Dwarf — те саме формулювання.
  "Dwarven Toughness (Hill Dwarf Subrace)": 1,
};

export const seedHitPointsPerLevel = async (prisma: PrismaClient) => {
  console.log("❤️ Хіти за рівень від фіч…");

  for (const [engName, bonus] of Object.entries(HIT_POINTS_PER_LEVEL)) {
    const updated = await prisma.feature.updateMany({
      where: { engName },
      data: { bonusHitPointsPerLevel: bonus },
    });
    if (updated.count === 0) console.warn(`  ⚠️ Фічі "${engName}" немає в базі`);
    else console.log(`  • ${engName}: +${bonus} за рівень`);
  }

  // Жодна інша фіча хітів за рівень не дає — знімаємо значення, якщо воно колись зʼявилося.
  const cleared = await prisma.feature.updateMany({
    where: { engName: { notIn: Object.keys(HIT_POINTS_PER_LEVEL) }, bonusHitPointsPerLevel: { not: null } },
    data: { bonusHitPointsPerLevel: null },
  });
  if (cleared.count) console.log(`  • знято зайве значення з ${cleared.count} фіч`);

  console.log("✅ Хіти за рівень на місці");
};
