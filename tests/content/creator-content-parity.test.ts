import { readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  findCreatorClasses,
  findCreatorFeats,
  findCreatorRaces,
  findCreatorWeapons,
} from "@/server/db/creator-content-query";
import { reviveCreatorContent } from "@/lib/content/creator-content-file";

/// KR22.5. Конструктор має читати граф із файлу, а не з бази, і єдиний спосіб довести, що файл
/// нічого не загубив, — прогнати той самий граф через JSON і звірити з тим, що віддала база.
/// Небезпечні тут не звʼязки, а типи: `DateTime` стає рядком ISO, а колонки Json (ASI, ac,
/// multiclassReqs, prerequisites) — довільним деревом.
///
/// Походження сюди не входять свідомо: клієнт Prisma зібрано зі схеми робочої бази, а клон уже
/// має значення енама `ToolCategory.CALLIGRAPHERS_SUPPLIES` з незастосованого DDL KR18.7, тож
/// `background.findMany` на клоні падає на декоді. Форма походжень (`gainsFeats`) простіша за
/// решту чотирьох зрізів, і та сама властивість покривається ними.
const SLICES = {
  раси: () => findCreatorRaces(prisma, "RULES_2014"),
  класи: () => findCreatorClasses(prisma, "RULES_2014"),
  зброя: () => findCreatorWeapons(prisma, "RULES_2014"),
  риси: () => findCreatorFeats(prisma, "RULES_2014"),
} as const;

describe("KR22.5 — граф конструктора переживає дорогу через JSON", () => {
  for (const [title, load] of Object.entries(SLICES)) {
    it(`${title}: файл віддає рівно те, що віддавала база`, async () => {
      const fromDatabase = await load();
      expect(fromDatabase.length).toBeGreaterThan(0);

      const throughFile = reviveCreatorContent(JSON.parse(JSON.stringify(fromDatabase)));

      expect(throughFile).toEqual(fromDatabase);
    });
  }

  it("дати повертаються обʼєктами Date, а не рядками", async () => {
    const [firstClass] = await findCreatorClasses(prisma, "RULES_2014");
    const throughFile = reviveCreatorContent(JSON.parse(JSON.stringify([firstClass]))) as unknown as typeof firstClass[];

    expect(throughFile[0].createdAt).toBeInstanceOf(Date);
    expect(throughFile[0].features[0].feature.updatedAt).toBeInstanceOf(Date);
  });
});

/// Головна обіцянка KR22.5: конструктор більше не потребує бази, щоб показати кроки. Довести її
/// можна тільки графом імпортів — модуль, з якого і майстер, і левелап беруть контент, не сміє
/// мати жодного шляху до `@/lib/prisma`.
describe("KR22.5 — контент конструктора не має дороги до бази", () => {
  it("з @/lib/content/creator-content не видно @/lib/prisma", () => {
    const entry = resolve(__dirname, "../../src/lib/content/creator-content.ts");
    const reached = collectReachableModules(entry);
    const database = reached.find((file) => file.endsWith("src/lib/prisma.ts"));

    expect(database, `граф дотягнувся до бази через ${reached.length} модулів`).toBeUndefined();
  });
});

const SRC = resolve(__dirname, "../../src");

/// Типові імпорти збірка стирає, тож `import type { CreatorContent } from "@/server/db/..."`
/// ребром графа не є — рівно та сама межа, що в tests/content/client-bundle-boundary.test.ts.
function findValueImports(source: string): string[] {
  const specifiers: string[] = [];
  const clause = /(?:^|\n)\s*(?:import|export)\s+(?!type\s)([^;]*?)from\s*["']([^"']+)["']/g;
  let match: RegExpExecArray | null;
  while ((match = clause.exec(source))) {
    if (!isTypeOnly(match[1])) specifiers.push(match[2]);
  }
  const bare = /(?:^|\n)\s*import\s*["']([^"']+)["']/g;
  while ((match = bare.exec(source))) specifiers.push(match[1]);
  return specifiers;
}

function isTypeOnly(clause: string): boolean {
  const named = clause.match(/\{([\s\S]*)\}/);
  if (!named) return false;
  if (/^\s*[\w$]+\s*,/.test(clause)) return false;
  return named[1].split(",").every((one) => !one.trim() || /^type\s/.test(one.trim()));
}

function resolveInsideSrc(specifier: string, fromFile: string): string | null {
  const base = specifier.startsWith("@/")
    ? join(SRC, specifier.slice(2))
    : specifier.startsWith(".")
      ? resolve(dirname(fromFile), specifier)
      : null;
  if (!base) return null;

  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, join(base, "index.ts")]) {
    try {
      if (statSync(candidate).isFile()) return candidate;
    } catch {
      // наступний кандидат
    }
  }
  return null;
}

function collectReachableModules(entry: string): string[] {
  const seen = new Set([entry]);
  const queue = [entry];

  while (queue.length) {
    const file = queue.shift()!;
    if (file.endsWith(".json")) continue;

    for (const specifier of findValueImports(readFileSync(file, "utf8"))) {
      const resolved = resolveInsideSrc(specifier, file);
      if (!resolved || seen.has(resolved)) continue;
      seen.add(resolved);
      queue.push(resolved);
    }
  }

  return Array.from(seen).map((file) => relative(SRC, file));
}
