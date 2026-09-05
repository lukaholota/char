/**
 * KR22.5 — що саме конструктор тягне з бази і скільки з цього вже лежить у каталогах.
 *
 *   bun tsx scripts/measure-creator-content-gap.ts --target test
 *   bun tsx scripts/measure-creator-content-gap.ts --target test --paths races
 *
 * Числа в журналі KR не переписуються з памʼяті — вони знімаються цим скриптом.
 */

import { PrismaClient, type Ruleset } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { readFileSync } from "fs";
import { join } from "path";
import { readSeedTargetName, resolveSeedConnectionString, readDatabaseName } from "./lib/seed-target";

const RULESETS: Ruleset[] = ["RULES_2014", "RULES_2024"];

type Slice = {
  key: string;
  title: string;
  catalogFile: string | null;
  load: (prisma: PrismaClient, ruleset: Ruleset) => Promise<unknown[]>;
};

/// Запити нижче — дослівна копія `loadCharacterCreatorOptions`. Розійдуться вони — вимір збреше.
const SLICES: Slice[] = [
  {
    key: "races",
    title: "раси",
    catalogFile: "races.json",
    load: (prisma, ruleset) =>
      prisma.race.findMany({ where: { ruleset }, include: { raceChoiceOptions: { include: { traits: { include: { feature: true } } } }, subraces: { include: { traits: { include: { feature: true } } } }, raceVariants: { include: { traits: { include: { feature: true } } } }, traits: { include: { feature: true } } }, orderBy: [{ sortOrder: "asc" }, { raceId: "asc" }] }),
  },
  {
    key: "classes",
    title: "класи",
    catalogFile: "classes.json",
    load: (prisma, ruleset) =>
      prisma.class.findMany({ where: { ruleset }, include: { subclasses: { include: { features: { include: { feature: true } }, subclassChoiceOptions: { include: { choiceOption: { include: { features: { include: { feature: true } } } } } }, expandedSpells: true } }, startingEquipmentOption: { include: { equipmentPack: true, weapon: true, armor: true } }, classChoiceOptions: { include: { choiceOption: { include: { features: { include: { feature: true } } } } } }, classOptionalFeatures: { include: { feature: true, replacesFeatures: { include: { replacedFeature: true } }, appearsOnlyIfChoicesTaken: true } }, features: { include: { feature: true } } }, orderBy: [{ sortOrder: "asc" }, { classId: "asc" }] }),
  },
  {
    key: "backgrounds",
    title: "походження",
    catalogFile: "backgrounds.json",
    load: (prisma, ruleset) => prisma.background.findMany({ where: { ruleset }, include: { gainsFeats: true } }),
  },
  {
    key: "weapons",
    title: "зброя",
    catalogFile: "weapons.json",
    load: (prisma, ruleset) => prisma.weapon.findMany({ where: { ruleset }, orderBy: [{ sortOrder: "asc" }, { weaponId: "asc" }] }),
  },
  {
    key: "feats",
    title: "риси",
    catalogFile: "feats.json",
    load: (prisma, ruleset) =>
      prisma.feat.findMany({ where: { ruleset }, include: { grantsFeature: true, featChoiceOptions: { include: { choiceOption: { include: { features: { include: { feature: true } } } } } } }, orderBy: [{ name: "asc" }] }),
  },
];

/// Дослівна копія трьох кешованих запитів `loadLevelUpBaseContent`. Персонаж сюди не входить —
/// він і є ті живі дані, заради яких база лишається.
const LEVELUP_SLICES: Slice[] = [
  {
    key: "levelup-classes",
    title: "класи (левелап)",
    catalogFile: "classes.json",
    load: (prisma, ruleset) =>
      prisma.class.findMany({ where: { ruleset }, include: { subclasses: { include: { features: { include: { feature: true } }, subclassChoiceOptions: { include: { choiceOption: { include: { features: { include: { feature: true } } } } } } } }, classChoiceOptions: { include: { choiceOption: { include: { features: { include: { feature: true } } } } } }, classOptionalFeatures: { include: { feature: true, replacesFeatures: { include: { replacedFeature: true } }, appearsOnlyIfChoicesTaken: true } }, features: { include: { feature: true } } }, orderBy: [{ sortOrder: "asc" }, { classId: "asc" }] }),
  },
  {
    key: "levelup-feats",
    title: "риси (левелап)",
    catalogFile: "feats.json",
    load: (prisma, ruleset) =>
      prisma.feat.findMany({ where: { ruleset }, include: { grantsFeature: true, featChoiceOptions: { include: { choiceOption: { include: { features: { include: { feature: true } } } } } } }, orderBy: [{ name: "asc" }] }),
  },
  {
    key: "levelup-infusions",
    title: "інфузії (левелап)",
    catalogFile: "infusions.json",
    load: (prisma, ruleset) =>
      prisma.infusion.findMany({ where: { ruleset }, include: { feature: { select: { name: true, description: true, shortDescription: true } }, replicatedMagicItem: { select: { magicItemId: true, name: true, engName: true, itemType: true, rarity: true, requiresAttunement: true, description: true, shortDescription: true, bonusToAC: true, bonusToRangedDamage: true, bonusToSavingThrows: true, noArmorOrShieldForACBonus: true, givesSpells: { select: { spellId: true, name: true, engName: true, level: true } } } } }, orderBy: [{ minArtificerLevel: "asc" }, { name: "asc" }] }),
  },
];

function collectKeyPaths(value: unknown, prefix = "", into = new Set<string>()): Set<string> {
  if (Array.isArray(value)) {
    for (const item of value) collectKeyPaths(item, prefix ? `${prefix}[]` : "[]", into);
    return into;
  }
  if (value && typeof value === "object" && !(value instanceof Date)) {
    for (const [key, nested] of Object.entries(value)) {
      const path = prefix ? `${prefix}.${key}` : key;
      into.add(path);
      collectKeyPaths(nested, path, into);
    }
  }
  return into;
}

/// Каталог — це масив, граф із бази теж; порівнюємо шляхи всередині елемента.
function normalizeRootPath(path: string): string {
  return path.replace(/^\[\]\./, "");
}

function readCatalog(file: string): unknown[] | null {
  try {
    return JSON.parse(readFileSync(join(process.cwd(), "src/lib/generated", file), "utf-8"));
  } catch {
    return null;
  }
}

/// Проза — головний пасажир графа: конструктор показує опис риси, і той самий опис уже лежить
/// у каталозі показу.
function measureProse(value: unknown): number {
  if (Array.isArray(value)) return value.reduce<number>((sum, item) => sum + measureProse(item), 0);
  if (!value || typeof value !== "object") return 0;
  let total = 0;
  for (const [key, nested] of Object.entries(value)) {
    if ((key === "description" || key === "shortDescription") && typeof nested === "string") {
      total += Buffer.byteLength(nested, "utf-8");
      continue;
    }
    total += measureProse(nested);
  }
  return total;
}

function formatKiB(bytes: number): string {
  return `${(bytes / 1024).toFixed(1)} КіБ`;
}

async function main() {
  const target = readSeedTargetName(process.argv, "measure-creator-content-gap.ts");
  const connectionString = resolveSeedConnectionString(target);
  const wantedPaths = readWantedPaths(process.argv);

  const pool = new Pool({ connectionString });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  const allSlices = [...SLICES, ...LEVELUP_SLICES];

  console.log(`База: ${readDatabaseName(connectionString)}\n`);
  console.log("## Що конструктор тягне з бази\n");
  console.log("| зріз | 2014 рядків | 2014 байтів | 2024 рядків | 2024 байтів |");
  console.log("|---|---:|---:|---:|---:|");

  const dbPathsBySlice = new Map<string, Set<string>>();
  let totalBytes = 0;

  const unreadable: string[] = [];
  for (const slice of allSlices) {
    const cells: string[] = [];
    const paths = new Set<string>();
    let failure = "";
    for (const ruleset of RULESETS) {
      let rows: unknown[];
      try {
        rows = await slice.load(prisma, ruleset);
      } catch (error) {
        failure = error instanceof Error ? error.message.split("\n").filter(Boolean).pop() ?? "" : String(error);
        cells.push("—", "—");
        continue;
      }
      const bytes = Buffer.byteLength(JSON.stringify(rows), "utf-8");
      if (ruleset === "RULES_2014" && SLICES.includes(slice)) totalBytes += bytes;
      collectKeyPaths(rows, "", paths);
      cells.push(String(rows.length), formatKiB(bytes));
    }
    if (failure) unreadable.push(`${slice.title}: ${failure}`);
    dbPathsBySlice.set(slice.key, paths);
    console.log(`| ${slice.title} | ${cells.join(" | ")} |`);
  }
  console.log(`\nРазом на одне відкриття конструктора (2014): **${formatKiB(totalBytes)}**\n`);
  if (unreadable.length) {
    console.log("Зрізи, які клієнт Prisma не зміг прочитати з цієї бази:");
    for (const line of unreadable) console.log(`- ${line}`);
    console.log("");
  }

  console.log("## Скільки з цього вже є в каталозі\n");
  console.log("| зріз | шляхів у графі БД | шляхів у каталозі | спільних | бракує каталогу |");
  console.log("|---|---:|---:|---:|---:|");

  const gaps = new Map<string, string[]>();
  for (const slice of allSlices) {
    const dbPaths = new Set(Array.from(dbPathsBySlice.get(slice.key)!).map(normalizeRootPath));
    const catalog = slice.catalogFile ? readCatalog(slice.catalogFile) : null;
    if (!catalog) {
      console.log(`| ${slice.title} | ${dbPaths.size} | каталогу немає | 0 | ${dbPaths.size} |`);
      gaps.set(slice.key, Array.from(dbPaths).sort());
      continue;
    }
    const catalogPaths = new Set(Array.from(collectKeyPaths(catalog, "", new Set())).map(normalizeRootPath));
    const shared = Array.from(dbPaths).filter((path) => catalogPaths.has(path));
    const missing = Array.from(dbPaths).filter((path) => !catalogPaths.has(path)).sort();
    gaps.set(slice.key, missing);
    console.log(
      `| ${slice.title} | ${dbPaths.size} | ${catalogPaths.size} | ${shared.length} | **${missing.length}** |`,
    );
  }

  console.log("\n## З чого складається найважчий зріз\n");
  for (const slice of SLICES.filter((entry) => entry.key === "races" || entry.key === "classes")) {
    const rows = (await slice.load(prisma, "RULES_2014")) as Record<string, unknown>[];
    const total = Buffer.byteLength(JSON.stringify(rows), "utf-8");
    const branches = new Map<string, number>();
    for (const row of rows) {
      for (const [key, value] of Object.entries(row)) {
        if (!Array.isArray(value) && !(value && typeof value === "object")) continue;
        branches.set(key, (branches.get(key) ?? 0) + Buffer.byteLength(JSON.stringify(value), "utf-8"));
      }
    }
    console.log(`\n**${slice.title} 2014 — ${formatKiB(total)}**\n`);
    console.log("| гілка | байтів | частка |");
    console.log("|---|---:|---:|");
    for (const [branch, size] of Array.from(branches).sort((left, right) => right[1] - left[1])) {
      console.log(`| \`${branch}\` | ${formatKiB(size)} | ${((size / total) * 100).toFixed(1)}% |`);
    }
    const prose = measureProse(rows);
    console.log(`| _з них проза (description + shortDescription)_ | ${formatKiB(prose)} | ${((prose / total) * 100).toFixed(1)}% |`);
  }

  for (const key of wantedPaths) {
    const missing = gaps.get(key);
    if (!missing) continue;
    console.log(`\n### Чого каталогу «${key}» бракує проти графа конструктора (${missing.length})\n`);
    for (const path of missing) console.log(`- \`${path}\``);
  }

  await prisma.$disconnect();
  await pool.end();
}

function readWantedPaths(argv: string[]): string[] {
  const flagIndex = argv.indexOf("--paths");
  if (flagIndex === -1) return [];
  const value = argv[flagIndex + 1];
  if (!value || value.startsWith("--")) return [...SLICES, ...LEVELUP_SLICES].map((slice) => slice.key);
  return value.split(",");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
