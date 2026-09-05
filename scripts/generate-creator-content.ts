/**
 * KR22.5 — граф, який конструктор і левелап читали з бази, стає файлом.
 *
 *   bun tsx scripts/generate-creator-content.ts --target prod
 *
 * Каталоги `races.json` і `classes.json` тут не годяться: вони несуть **показ** — перекладені
 * назви, `asiSummary` рядком, — і з 333 шляхів графа рас мають 11, з 450 шляхів класів — 15
 * (виміряно `scripts/measure-creator-content-gap.ts`). Конструктору потрібні сирі механіки й
 * усі гілки звʼязків, тому це окремий артефакт, а не ще одна колонка в каталозі показу.
 *
 * Запити не дублюються: вони лежать у `src/server/db/creator-content-query.ts`, звідки їх бере
 * і звірка `tests/content/creator-content-parity.test.ts`.
 */

import { PrismaClient, type Ruleset } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";

import { findCreatorContent } from "../src/server/db/creator-content-query";
import { failOnShrunkCatalog } from "./lib/fail-on-shrunk-catalog";
import { readSeedTargetName, resolveSeedConnectionString, readDatabaseName } from "./lib/seed-target";

const RULESETS: Ruleset[] = ["RULES_2014", "RULES_2024"];

const OUTPUT_PATH: Record<Ruleset, string> = {
  RULES_2014: join(process.cwd(), "src/lib/generated/creator-content-2014.json"),
  RULES_2024: join(process.cwd(), "src/lib/generated/creator-content-2024.json"),
};

/// Пороги беруться з **закомічених** каталогів, тобто з того, що вже доведено робочою базою:
/// races.json 66 рядків 2014, classes.json 13, backgrounds.json 75, weapons.json 48,
/// feats.json 92, infusions.json 66. Вони навмисно нижчі за те, що зараз віддає клон (у нього є ще й рядки 2024),
/// бо поріг, вищий за робочу базу, зламав би регенерацію власнику. Рухати тільки вгору — і
/// тільки після виміру по робочій базі.
export const MINIMUM_EXPECTED = {
  races: 66,
  classes: 13,
  backgrounds: 75,
  weapons: 48,
  feats: 92,
  infusions: 66,
} as const;

const SLICE_TITLE: Record<keyof typeof MINIMUM_EXPECTED, string> = {
  races: "раси конструктора",
  classes: "класи конструктора",
  backgrounds: "походження конструктора",
  weapons: "зброя конструктора",
  feats: "риси конструктора",
  infusions: "інфузії левелапу",
};

async function main() {
  const target = readSeedTargetName(process.argv, "generate-creator-content.ts");
  const connectionString = resolveSeedConnectionString(target);

  const pool = new Pool({ connectionString });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  const collected = new Map<Ruleset, Awaited<ReturnType<typeof findCreatorContent>>>();
  for (const ruleset of RULESETS) {
    collected.set(ruleset, await readCreatorContentOrExplain(prisma, ruleset));
  }

  for (const slice of Object.keys(MINIMUM_EXPECTED) as (keyof typeof MINIMUM_EXPECTED)[]) {
    const total = RULESETS.reduce((sum, ruleset) => sum + collected.get(ruleset)![slice].length, 0);
    failOnShrunkCatalog(
      SLICE_TITLE[slice],
      total,
      MINIMUM_EXPECTED[slice],
      "Спершу прожени відповідний сід у цільову базу — недобір лагодять сідом, не порогом.",
    );
  }

  for (const ruleset of RULESETS) {
    const content = collected.get(ruleset)!;
    const path = OUTPUT_PATH[ruleset];
    mkdirSync(dirname(path), { recursive: true });
    // Без відступів: файл читає лише машина, а відступи на такому обсязі подвоюють і репозиторій,
    // і його churn на кожній регенерації.
    writeFileSync(path, JSON.stringify(content) + "\n", "utf-8");
    const counts = Object.entries(content)
      .map(([slice, rows]) => `${slice} ${rows.length}`)
      .join(", ");
    console.log(`${path.split("/").pop()}: ${counts}`);
  }

  console.log(`\nДжерело: ${readDatabaseName(connectionString)}`);

  await prisma.$disconnect();
  await pool.end();
}

/// Клієнт Prisma генерується зі схеми **робочої** бази. Якщо цільова база пішла вперед — має
/// значення енама, якого клієнт не знає, або стовпець, якого немає, — Prisma падає на декоді, і
/// мовчазна половина каталогу була б гіршою за зупинку.
async function readCreatorContentOrExplain(prisma: PrismaClient, ruleset: Ruleset) {
  try {
    return await findCreatorContent(prisma, ruleset);
  } catch (error) {
    const reason = error instanceof Error ? error.message.split("\n").filter(Boolean).pop() : String(error);
    throw new Error(
      `Не вдалося прочитати граф конструктора для ${ruleset}: ${reason}\n` +
        "Схема, з якої зібрано клієнт Prisma, розійшлася з цільовою базою. " +
        "Застосуй незастосований DDL з db/changes/ до робочої бази, зроби `bun run db:pull` і повтори.",
    );
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
