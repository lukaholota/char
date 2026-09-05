import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

/// Дефект №6 зі STATE.md: у таблиці `creature` 7 рядків, у каталозі 1 489. Це не баг для
/// користувача — істот туди свідомо не переливають ([Р15](../../docs/DECISIONS.md#р15)),
/// джерело істини лишається згенерованим JSON. Небезпечна тут не сама розбіжність, а те, що
/// вона мовчазна: перший, хто напише `prisma.creature.findMany()`, отримає сім істот і зелену
/// збірку. Цей тест тримає розбіжність нешкідливою й ловить момент, коли критерій переходу з
/// Р15 спрацює — тобто коли зʼявиться сутність із зовнішнім ключем на істоту.

const ROOT = process.cwd();
const SEARCHED_DIRS = ["src", "scripts", "prisma/seed"];
const PRISMA_CREATURE_ACCESS = /\b\w+\.creature\.(findMany|findFirst|findUnique|create|createMany|update|updateMany|upsert|delete|deleteMany|count)\b/;

function collectSourceFiles(dir: string): string[] {
  return readdirSync(join(ROOT, dir)).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(join(ROOT, path)).isDirectory()) return collectSourceFiles(path);
    return path.endsWith(".ts") || path.endsWith(".tsx") ? [path] : [];
  });
}

function readSource(path: string): string {
  return readFileSync(join(ROOT, path), "utf-8");
}

function findRelationFieldsToCreature(schema: string): string[] {
  return schema
    .split("\n")
    .filter((line) => /^\s+\w+\s+Creature(\[\])?[\s?]/.test(line))
    .map((line) => line.trim());
}

describe("істоти лишаються в JSON (Р15)", () => {
  const sources = SEARCHED_DIRS.flatMap(collectSourceFiles);

  it("файли для пошуку взагалі знайдені", () => {
    expect(sources.length).toBeGreaterThan(100);
  });

  it("жоден файл не читає бестіарій із таблиці `creature`", () => {
    const readers = sources.filter((path) => PRISMA_CREATURE_ACCESS.test(readSource(path)));

    expect(readers).toEqual([]);
  });

  it("`bestiaryData.ts` бере обидві редакції з генерованого JSON і не тримає Prisma-клієнта", () => {
    const source = readSource("src/lib/bestiaryData.ts");

    expect(source).toContain("@/lib/generated/creatures.json");
    expect(source).toContain("@/lib/generated/creatures2024.json");
    expect(source).not.toContain("PrismaClient");
  });

  it("каталог більший за таблицю на порядки — сім рядків у базі не сплутати з джерелом", () => {
    const catalog2014 = JSON.parse(readSource("src/lib/generated/creatures.json")) as unknown[];
    const catalog2024 = JSON.parse(readSource("src/lib/generated/creatures2024.json")) as unknown[];

    expect(catalog2014.length).toBeGreaterThan(900);
    expect(catalog2024.length).toBeGreaterThan(500);
  });

  /// Критерій переходу з Р15, уточнений у Р25: питання не «чи посилаємось на істоту», а «чи
  /// потрібна референційна цілісність із каскадом». Посилання стабільним ключем (як прикріплені
  /// форми друїда) поля типу `Creature` не додає й це правило не порушує. Червоний тут означає,
  /// що хтось завів справжній FK — тобто або істоти їдуть у базу цілком, або ключа вистачало.
  it("на `Creature` немає зовнішніх ключів — посилаються ключем, не FK", () => {
    const relations = findRelationFieldsToCreature(readSource("prisma/schema.prisma"));

    expect(relations).toEqual([]);
  });
});
